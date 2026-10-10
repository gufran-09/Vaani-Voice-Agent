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

print("Testing WhisperModel('large-v3-turbo', device='cuda', compute_type='float16')...")
t0 = time.time()
try:
    model = WhisperModel('large-v3-turbo', device='cuda', compute_type='float16')
    load_time = time.time() - t0
    print(f"Successfully loaded large-v3-turbo on CUDA float16 in {load_time:.2f}s!")
    
    # Warmup / Test transcription
    t1 = time.time()
    segments, info = model.transcribe('scratch/test_audio_coffee.wav', beam_size=1)
    transcript = " ".join(s.text.strip() for s in segments)
    infer_time = time.time() - t1
    print(f"Inference latency: {infer_time*1000:.1f}ms | Language: {info.language}")
    print(f"Transcript: \"{transcript}\"")
    
except Exception as e:
    print(f"CUDA float16 failed: {e}")
    print("Testing CUDA int8_float16...")
    try:
        model = WhisperModel('large-v3-turbo', device='cuda', compute_type='int8_float16')
        load_time = time.time() - t0
        print(f"Successfully loaded large-v3-turbo on CUDA int8_float16 in {load_time:.2f}s!")
        t1 = time.time()
        segments, info = model.transcribe('scratch/test_audio_coffee.wav', beam_size=1)
        transcript = " ".join(s.text.strip() for s in segments)
        infer_time = time.time() - t1
        print(f"Inference latency: {infer_time*1000:.1f}ms | Language: {info.language}")
        print(f"Transcript: \"{transcript}\"")
    except Exception as e2:
        print(f"CUDA int8_float16 failed: {e2}")
        print("Testing CPU int8...")
        model = WhisperModel('large-v3-turbo', device='cpu', compute_type='int8')
        t1 = time.time()
        segments, info = model.transcribe('scratch/test_audio_coffee.wav', beam_size=1)
        transcript = " ".join(s.text.strip() for s in segments)
        infer_time = time.time() - t1
        print(f"CPU int8 Inference latency: {infer_time*1000:.1f}ms | Language: {info.language}")
        print(f"Transcript: \"{transcript}\"")
