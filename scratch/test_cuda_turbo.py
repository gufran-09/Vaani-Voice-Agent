import os
import sys
import time

cublas_bin = r'C:\Users\owais\AppData\Local\Programs\Python\Python313\Lib\site-packages\nvidia\cublas\bin'
cudnn_bin = r'C:\Users\owais\AppData\Local\Programs\Python\Python313\Lib\site-packages\nvidia\cudnn\bin'

if os.path.exists(cublas_bin):
    os.add_dll_directory(cublas_bin)
    os.environ['PATH'] = cublas_bin + ';' + os.environ['PATH']
if os.path.exists(cudnn_bin):
    os.add_dll_directory(cudnn_bin)
    os.environ['PATH'] = cudnn_bin + ';' + os.environ['PATH']

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

print('Testing WhisperModel large-v3-turbo on CUDA (float16)...', flush=True)
t0 = time.time()
model = WhisperModel('large-v3-turbo', device='cuda', compute_type='float16')
print(f'Model loaded in {time.time() - t0:.2f}s!', flush=True)

print('Running inference on CUDA...', flush=True)
t1 = time.time()
segs, info = model.transcribe('scratch/test_audio_coffee.wav', beam_size=1)
text = ' '.join(s.text.strip() for s in segs)
infer_time = (time.time() - t1) * 1000
print(f'CUDA inference latency: {infer_time:.1f}ms!', flush=True)
print(f'Language: {info.language} ({info.language_probability:.2f})', flush=True)
print(f'Transcript: "{text}"', flush=True)
