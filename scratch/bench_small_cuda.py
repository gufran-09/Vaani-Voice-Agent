import os
import sys
import time
import functools
import av

cublas_bin = r'C:\Users\owais\AppData\Local\Programs\Python\Python313\Lib\site-packages\nvidia\cublas\bin'
cudnn_bin = r'C:\Users\owais\AppData\Local\Programs\Python\Python313\Lib\site-packages\nvidia\cudnn\bin'
if os.path.exists(cublas_bin):
    os.add_dll_directory(cublas_bin)
    os.environ['PATH'] = cublas_bin + ';' + os.environ['PATH']
if os.path.exists(cudnn_bin):
    os.add_dll_directory(cudnn_bin)
    os.environ['PATH'] = cudnn_bin + ';' + os.environ['PATH']

_original_av_open = av.open
@functools.wraps(_original_av_open)
def _patched_av_open(*args, **kwargs):
    kwargs.pop('metadata_errors', None)
    return _original_av_open(*args, **kwargs)
av.open = _patched_av_open
import faster_whisper.audio
faster_whisper.audio.av.open = _patched_av_open

from faster_whisper import WhisperModel
model = WhisperModel('small', device='cuda', compute_type='float16')
segs, _ = model.transcribe('scratch/test_audio_coffee.wav', beam_size=1)
list(segs)

t0 = time.time()
segs, info = model.transcribe('scratch/test_audio_coffee.wav', beam_size=1)
text = ' '.join(s.text.strip() for s in segs)
print(f'Small CUDA warm: {(time.time() - t0)*1000:.1f}ms | "{text}"', flush=True)
