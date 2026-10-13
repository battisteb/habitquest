"""Voice-over lines for edit-reel.js with Chatterbox (Resemble AI, local, more expressive than Kokoro).

    pip install chatterbox-tts "setuptools<81"   (in its own venv: it pins torch)
    ~25 s of computing per second of speech on a CPU.

stdin: {"exaggeration": 0.6, "cfg": 0.4, "items": [{"text": "...", "out": "x.wav"}]}
stdout: the duration in seconds of each item, as a JSON list. Existing files are reused.
"""
import json
import os
import sys

import soundfile as sf

req = json.load(sys.stdin)
todo = [it for it in req["items"] if not os.path.exists(it["out"])]
if todo:
    import numpy as np
    from chatterbox.tts import ChatterboxTTS

    model = ChatterboxTTS.from_pretrained(device="cpu")
    for it in todo:
        wav = model.generate(it["text"], exaggeration=req["exaggeration"], cfg_weight=req["cfg"])
        samples = wav.squeeze(0).numpy()
        # Trim the silence around the line (keeps 30 ms) so it starts with its caption.
        voiced = np.where(np.abs(samples) > 0.01)[0]
        pad = int(0.03 * model.sr)
        sf.write(it["out"], samples[max(0, voiced[0] - pad):voiced[-1] + pad], model.sr)
        print(f"voice-over: {it['text']}", file=sys.stderr, flush=True)
print(json.dumps([sf.info(it["out"]).duration for it in req["items"]]))
