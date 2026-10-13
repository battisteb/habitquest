"""Voice-over lines for edit-reel.js with Kokoro (local TTS, no account, no quota).

    pip install kokoro-onnx soundfile
    KOKORO_DIR=<folder with kokoro-v1.0.onnx and voices-v1.0.bin>

stdin: {"voice": "am_michael", "speed": 1.0, "items": [{"text": "...", "out": "x.wav"}]}
stdout: the duration in seconds of each item, as a JSON list. Existing files are reused.
"""
import json
import os
import sys

import soundfile as sf

req = json.load(sys.stdin)
todo = [it for it in req["items"] if not os.path.exists(it["out"])]
if todo:
    from kokoro_onnx import Kokoro

    model = os.environ["KOKORO_DIR"]
    kokoro = Kokoro(os.path.join(model, "kokoro-v1.0.onnx"), os.path.join(model, "voices-v1.0.bin"))
    import numpy as np

    for it in todo:
        samples, rate = kokoro.create(it["text"], voice=req["voice"], speed=req["speed"], lang="en-us")
        # Trim the silence around the line (keeps 30 ms) so it starts with its caption.
        voiced = np.where(np.abs(samples) > 0.01)[0]
        pad = int(0.03 * rate)
        samples = samples[max(0, voiced[0] - pad):voiced[-1] + pad]
        sf.write(it["out"], samples, rate)
print(json.dumps([sf.info(it["out"]).duration for it in req["items"]]))
