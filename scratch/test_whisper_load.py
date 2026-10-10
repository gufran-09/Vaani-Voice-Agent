import sys
import time
from faster_whisper import WhisperModel
import ctranslate2

model_size = "small"
device = "cuda" if ctranslate2.get_cuda_device_count() > 0 else "cpu"
compute_type = "float16" if device == "cuda" else "int8"

print(f"Testing Whisper '{model_size}' on {device} ({compute_type})...")
start = time.time()
try:
    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    load_time = time.time() - start
    print(f"SUCCESS: Loaded on {device} in {load_time:.2f}s")
except Exception as e:
    print(f"Warning: {device} failed ({e}), falling back to CPU (int8)...")
    start = time.time()
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    load_time = time.time() - start
    print(f"SUCCESS: Loaded on CPU in {load_time:.2f}s")
