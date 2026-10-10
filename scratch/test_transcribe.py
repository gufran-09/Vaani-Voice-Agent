import av
_original_av_open = av.open
def _patched_av_open(*args, **kwargs):
    kwargs.pop("metadata_errors", None)
    return _original_av_open(*args, **kwargs)
av.open = _patched_av_open
import faster_whisper.audio
faster_whisper.audio.av.open = _patched_av_open

from faster_whisper import WhisperModel
import time

m = WhisperModel('small', device='cpu', compute_type='int8')
t0 = time.time()
segs, info = m.transcribe('scratch/test_audio_coffee.wav', vad_filter=True)
text = ' '.join(s.text for s in segs)
print(f"SUCCESS: ({time.time()-t0:.2f}s, lang={info.language}): '{text}'")
