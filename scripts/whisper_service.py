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

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ─── Model Loading ──────────────────────────────────────────────────────────────
# Lazy-load so the server starts fast and we can serve /health immediately.
_model = None
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "small")


def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        print(f"[whisper] Loading model '{MODEL_SIZE}' on CPU (int8)...")
        _model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
        print(f"[whisper] Model '{MODEL_SIZE}' loaded and ready.")
    return _model


# ─── Routes ──────────────────────────────────────────────────────────────────────


@app.route("/health", methods=["GET"])
def health():
    """Health check — does not load the model."""
    return jsonify({"status": "ok", "model": f"whisper-{MODEL_SIZE}"})


@app.route("/transcribe", methods=["POST"])
def transcribe():
    """
    Accept an audio file (WAV, WebM, MP3, OGG) and return a JSON transcript.

    Request:  multipart/form-data with field 'file'
    Response: { "transcript": "...", "language": "en", "durationMs": 1234 }
    """
    if "file" not in request.files:
        return jsonify({"error": "No audio file provided. Send as 'file' field."}), 400

    audio_file = request.files["file"]

    # Save to a temp file (faster-whisper needs a file path)
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

        print(f"[whisper] Transcribing {file_size} bytes ({suffix})...")
        start = time.time()

        model = get_model()
        segments, info = model.transcribe(
            tmp_path,
            beam_size=5,
            language=None,  # auto-detect
            vad_filter=True,  # skip silence
        )

        # Collect all segment texts
        texts = []
        for segment in segments:
            texts.append(segment.text.strip())

        transcript = " ".join(texts).strip()
        elapsed_ms = int((time.time() - start) * 1000)

        print(
            f"[whisper] Done in {elapsed_ms}ms — lang={info.language} — "
            f'"{transcript[:80]}{"..." if len(transcript) > 80 else ""}"'
        )

        return jsonify(
            {
                "transcript": transcript,
                "language": info.language,
                "durationMs": int(info.duration * 1000) if info.duration else 0,
                "processingMs": elapsed_ms,
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
    print(f"[whisper] Starting Whisper STT service on http://localhost:{port}")
    print(f"[whisper] Model: {MODEL_SIZE} | Device: CPU | Compute: int8")
    print(f"[whisper] Endpoints: POST /transcribe, GET /health")

    # Pre-load model on startup so first request is fast
    get_model()

    app.run(host="0.0.0.0", port=port, debug=False)
