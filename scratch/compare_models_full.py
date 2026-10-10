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

test_files = [
    ("scratch/phrase1_coffee_samosa.wav", "One filter coffee and two samosas, parcel please."),
    ("scratch/phrase2_chai_samosa.wav", "One masala chai and two samosas, please."),
    ("scratch/phrase3_correction.wav", "Actually, make that three samosas."),
    ("scratch/phrase4_hindi.wav", "Ek masala dosa aur do chai."),
    ("scratch/phrase5_telugu.wav", "Rendu filter coffee, okati sugar lekunda."),
]

initial_prompt = "Cafe Vaani takeaway order: filter coffee, samosa, masala dosa, chai, bun maska, parcel."

print("================================================================")
print("1. BENCHMARKING WHISPER SMALL (CPU int8)")
print("================================================================")
t0 = time.time()
model_small = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=8)
print(f"Loaded model_small in {time.time() - t0:.2f}s\n")

for wav, expected in test_files:
    t_start = time.time()
    segs, info = model_small.transcribe(wav, beam_size=1, initial_prompt=initial_prompt)
    txt = " ".join(s.text.strip() for s in segs)
    lat = (time.time() - t_start) * 1000
    print(f"File: {os.path.basename(wav)}")
    print(f"  Expected:   \"{expected}\"")
    print(f"  Transcript: \"{txt}\"")
    print(f"  Lang: {info.language} | Latency: {lat:.1f}ms\n")

del model_small

print("================================================================")
print("2. BENCHMARKING WHISPER LARGE-V3-TURBO (CUDA float16)")
print("================================================================")
t0 = time.time()
model_turbo = WhisperModel('large-v3-turbo', device='cuda', compute_type='float16')
print(f"Loaded model_turbo in {time.time() - t0:.2f}s\n")

for wav, expected in test_files:
    t_start = time.time()
    segs, info = model_turbo.transcribe(wav, beam_size=1, initial_prompt=initial_prompt)
    txt = " ".join(s.text.strip() for s in segs)
    lat = (time.time() - t_start) * 1000
    print(f"File: {os.path.basename(wav)}")
    print(f"  Expected:   \"{expected}\"")
    print(f"  Transcript: \"{txt}\"")
    print(f"  Lang: {info.language} | Latency: {lat:.1f}ms\n")
