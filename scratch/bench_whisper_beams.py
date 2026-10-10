import time
import functools
import av

_original_av_open = av.open
@functools.wraps(_original_av_open)
def _patched_av_open(*args, **kwargs):
    kwargs.pop('metadata_errors', None)
    return _original_av_open(*args, **kwargs)
av.open = _patched_av_open

import faster_whisper.audio
faster_whisper.audio.av.open = _patched_av_open

from faster_whisper import WhisperModel

model = WhisperModel('small', device='cpu', compute_type='int8')

# Warmup
segs, _ = model.transcribe('scratch/test_audio_coffee.wav', beam_size=1)
list(segs)

# Test beam_size=5
t0 = time.time()
segs5, _ = model.transcribe('scratch/test_audio_coffee.wav', beam_size=5, initial_prompt='Cafe Vaani order')
text5 = ' '.join(s.text for s in segs5)
t_beam5 = time.time() - t0

# Test beam_size=1 (greedy)
t0 = time.time()
segs1, _ = model.transcribe('scratch/test_audio_coffee.wav', beam_size=1, initial_prompt='Cafe Vaani order')
text1 = ' '.join(s.text for s in segs1)
t_beam1 = time.time() - t0

print(f'beam_size=5 latency: {t_beam5*1000:.1f}ms | Text: "{text5.strip()}"')
print(f'beam_size=1 latency: {t_beam1*1000:.1f}ms | Text: "{text1.strip()}"')
print(f'Speedup factor: {t_beam5 / t_beam1:.2f}x')
