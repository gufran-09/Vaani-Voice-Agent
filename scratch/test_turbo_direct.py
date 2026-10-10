import sys
import time
import functools
import av

sys.stdout.reconfigure(line_buffering=True)

_original_av_open = av.open
@functools.wraps(_original_av_open)
def _patched_av_open(*args, **kwargs):
    kwargs.pop('metadata_errors', None)
    return _original_av_open(*args, **kwargs)
av.open = _patched_av_open

import faster_whisper.audio
faster_whisper.audio.av.open = _patched_av_open

from faster_whisper import WhisperModel

print("Loading large-v3-turbo from local cache on CUDA (float16)...", flush=True)
t0 = time.time()
try:
    model = WhisperModel('large-v3-turbo', device='cuda', compute_type='float16')
    print(f"CUDA float16 loaded in {time.time() - t0:.2f}s!", flush=True)
    device = 'cuda'
    compute_type = 'float16'
except Exception as e:
    print(f"CUDA float16 failed: {e}. Trying CUDA int8_float16...", flush=True)
    try:
        t0 = time.time()
        model = WhisperModel('large-v3-turbo', device='cuda', compute_type='int8_float16')
        print(f"CUDA int8_float16 loaded in {time.time() - t0:.2f}s!", flush=True)
        device = 'cuda'
        compute_type = 'int8_float16'
    except Exception as e2:
        print(f"CUDA int8_float16 failed: {e2}. Falling back to CPU int8...", flush=True)
        t0 = time.time()
        model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
        print(f"CPU int8 loaded in {time.time() - t0:.2f}s!", flush=True)
        device = 'cpu'
        compute_type = 'int8'

# Test transcription on test_audio_coffee.wav
print(f"Running inference on {device} ({compute_type})...", flush=True)
t1 = time.time()
segments, info = model.transcribe('scratch/test_audio_coffee.wav', beam_size=1)
text = " ".join(s.text.strip() for s in segments)
latency_ms = (time.time() - t1) * 1000
print(f"DONE in {latency_ms:.1f}ms | Lang: {info.language} | Confidence: {info.language_probability:.2f}", flush=True)
print(f"Transcript: \"{text}\"", flush=True)
