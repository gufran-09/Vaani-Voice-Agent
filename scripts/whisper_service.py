"""
scripts/whisper_service.py
Lightweight local Whisper Small STT service for VAANI.
Runs on http://localhost:5001 — called by the Next.js /api/agent/transcribe proxy.

Usage:
  pip install faster-whisper flask flask-cors
  python scripts/whisper_service.py
"""

import os
import sys
import tempfile
import time
import functools

# ─── Monkey-patch av.open for av>=19 compatibility ─────────────────────────────
# faster-whisper 1.2.1 passes metadata_errors='ignore' to av.open(), but
# av>=19.0.0 removed that parameter. Strip it so both versions work.
import av
_original_av_open = av.open
@functools.wraps(_original_av_open)
def _patched_av_open(*args, **kwargs):
    kwargs.pop('metadata_errors', None)
    return _original_av_open(*args, **kwargs)
av.open = _patched_av_open

import faster_whisper.audio
faster_whisper.audio.av.open = _patched_av_open

# ─── cuBLAS and cuDNN DLL Resolution on Windows ────────────────────────────────
cublas_bin = r'C:\Users\owais\AppData\Local\Programs\Python\Python313\Lib\site-packages\nvidia\cublas\bin'
cudnn_bin = r'C:\Users\owais\AppData\Local\Programs\Python\Python313\Lib\site-packages\nvidia\cudnn\bin'
if os.path.exists(cublas_bin):
    try:
        os.add_dll_directory(cublas_bin)
        os.environ['PATH'] = cublas_bin + ';' + os.environ.get('PATH', '')
    except Exception as dll_e:
        print(f"[whisper] Note: cuBLAS dll directory: {dll_e}")
if os.path.exists(cudnn_bin):
    try:
        os.add_dll_directory(cudnn_bin)
        os.environ['PATH'] = cudnn_bin + ';' + os.environ.get('PATH', '')
    except Exception as dll_e:
        print(f"[whisper] Note: cuDNN dll directory: {dll_e}")

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ─── Model Loading ──────────────────────────────────────────────────────────────
_model = None
_active_device = "cpu"
_active_compute_type = "int8"
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "large-v3-turbo")


def get_model(force_cpu=False):
    global _model, _active_device, _active_compute_type
    from faster_whisper import WhisperModel

    if _model is not None and not force_cpu:
        return _model

    # Prefer CUDA float16 on RTX 4060 GPU unless force_cpu is True
    requested_device = "cpu" if force_cpu else os.environ.get("WHISPER_DEVICE", "cuda")
    compute_type = "int8" if requested_device == "cpu" else os.environ.get("WHISPER_COMPUTE_TYPE", "float16")

    print(f"[whisper] Initializing model '{MODEL_SIZE}' on {requested_device} ({compute_type})...")
    try:
        _model = WhisperModel(MODEL_SIZE, device=requested_device, compute_type=compute_type)
        _active_device = requested_device
        _active_compute_type = compute_type
        print(f"[whisper] Model '{MODEL_SIZE}' ready on {requested_device} ({compute_type}).")
    except Exception as e:
        print(f"[whisper] Warning: {requested_device} failed ({e}). Falling back to CPU (int8)...")
        _model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8", cpu_threads=8)
        _active_device = "cpu"
        _active_compute_type = "int8"
        print(f"[whisper] Model '{MODEL_SIZE}' ready on CPU (int8).")
    return _model


# ─── Routes ──────────────────────────────────────────────────────────────────────


@app.route("/health", methods=["GET"])
def health():
    """Health check — returns readiness and active device."""
    return jsonify({
        "status": "ok",
        "model": f"whisper-{MODEL_SIZE}",
        "device": _active_device,
        "compute_type": _active_compute_type,
    })


@app.route("/transcribe", methods=["POST"])
def transcribe():
    """
    Accept an audio file (WAV, WebM, MP3, OGG) and return a JSON transcript.

    Request:  multipart/form-data with field 'file'
    Optional: field 'language' (e.g. 'en', 'hi', 'te')
              field 'prompt' (vocabulary hints)
    Response: { "transcript": "...", "language": "en", "durationMs": 1234, "device": "cpu" }
    """
    global _model, _active_device

    if "file" not in request.files:
        return jsonify({"error": "No audio file provided. Send as 'file' field."}), 400

    audio_file = request.files["file"]
    lang_hint = request.form.get("language") or None
    user_prompt = request.form.get("prompt") or request.form.get("initial_prompt")
    initial_prompt = user_prompt or "Cafe Vaani takeaway order: filter coffee, samosa, masala dosa, chai, bun maska, parcel."

    # Save to a temp file
    suffix = ".webm"
    if audio_file.filename:
        _, ext = os.path.splitext(audio_file.filename)
        if ext:
            suffix = ext

    tmp_fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    try:
        audio_file.save(tmp_path)
        file_size = os.path.getsize(tmp_path)

        if file_size == 0:
            return jsonify({"error": "Empty audio file."}), 400

        if file_size > 10 * 1024 * 1024:  # 10 MB limit
            return jsonify({"error": "File too large (max 10MB)."}), 400

        print(f"[whisper] Transcribing {file_size} bytes ({suffix}) on {_active_device}...")
        start = time.time()

        model = get_model()

        try:
            segments, info = model.transcribe(
                tmp_path,
                beam_size=1,
                language=lang_hint,
                initial_prompt=initial_prompt,
                vad_filter=True,
            )
            texts = [segment.text.strip() for segment in segments]
        except Exception as infer_err:
            if "cublas" in str(infer_err).lower() or "cuda" in str(infer_err).lower():
                print(f"[whisper] CUDA error during inference: {infer_err}. Switching to CPU...")
                model = get_model(force_cpu=True)
                segments, info = model.transcribe(
                    tmp_path,
                    beam_size=1,
                    language=lang_hint,
                    initial_prompt=initial_prompt,
                    vad_filter=True,
                )
                texts = [segment.text.strip() for segment in segments]
            else:
                raise infer_err

        transcript = " ".join(texts).strip()
        elapsed_ms = int((time.time() - start) * 1000)

        print(
            f"[whisper] Done in {elapsed_ms}ms ({_active_device}) — lang={info.language} — "
            f'"{transcript[:80]}{"..." if len(transcript) > 80 else ""}"'
        )

        return jsonify(
            {
                "transcript": transcript,
                "language": info.language,
                "durationMs": int(info.duration * 1000) if info.duration else 0,
                "processingMs": elapsed_ms,
                "device": _active_device,
            }
        )

    except Exception as e:
        print(f"[whisper] Error: {e}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500

    finally:
        os.close(tmp_fd)
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


# ─── Main ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("WHISPER_PORT", 5001))
    print(f"[whisper] Initializing Whisper STT service on http://localhost:{port}")
    get_model()
    print(f"[whisper] Endpoints: POST /transcribe, GET /health")

    app.run(host="0.0.0.0", port=port, debug=False)
