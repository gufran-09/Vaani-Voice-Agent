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

print('Loading large-v3-turbo on CUDA float16...', flush=True)
model = WhisperModel('large-v3-turbo', device='cuda', compute_type='float16')

# Cold run (already warm after loading)
t0 = time.time()
segs, info = model.transcribe('scratch/test_audio_coffee.wav', beam_size=1)
text = ' '.join(s.text.strip() for s in segs)
print(f'Run 1 (Cold): {(time.time() - t0)*1000:.1f}ms | \"{text}\"', flush=True)

# Warm run 2
t1 = time.time()
segs, info = model.transcribe('scratch/test_audio_coffee.wav', beam_size=1)
text = ' '.join(s.text.strip() for s in segs)
print(f'Run 2 (Warm): {(time.time() - t1)*1000:.1f}ms | \"{text}\"', flush=True)

# Warm run 3
t2 = time.time()
segs, info = model.transcribe('scratch/test_audio_coffee.wav', beam_size=1)
text = ' '.join(s.text.strip() for s in segs)
print(f'Run 3 (Warm): {(time.time() - t2)*1000:.1f}ms | \"{text}\"', flush=True)
