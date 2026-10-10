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

print("Loading large-v3-turbo on CPU int8 (cpu_threads=8)...", flush=True)
t0 = time.time()
model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8', cpu_threads=8)
print(f"Loaded in {time.time() - t0:.2f}s!", flush=True)

# Test 1: Coffee wav (English)
t1 = time.time()
segs, info = model.transcribe('scratch/test_audio_coffee.wav', beam_size=1)
text = " ".join(s.text.strip() for s in segs)
print(f"Test 1 (Coffee wav): {(time.time() - t1)*1000:.1f}ms | Lang: {info.language} | Text: \"{text}\"", flush=True)

# Test 2: Webm
t2 = time.time()
segs, info = model.transcribe('scratch/test_audio_coffee.webm', beam_size=1)
text = " ".join(s.text.strip() for s in segs)
print(f"Test 2 (Webm opus): {(time.time() - t2)*1000:.1f}ms | Lang: {info.language} | Text: \"{text}\"", flush=True)
