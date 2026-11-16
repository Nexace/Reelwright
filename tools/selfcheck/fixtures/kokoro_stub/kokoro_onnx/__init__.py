# A stand-in for the kokoro-onnx package, for tools/selfcheck/kokoro.mjs only: no model, just a tone whose length follows the
# text (0.06 s per character / speed) between 0.3 s of silence at each end. Logs every call to $KOKORO_STUB_LOG.
import json, os
import numpy as np


class Kokoro:
    def __init__(self, model_path, voices_path):
        self.model_path, self.voices_path = model_path, voices_path

    def create(self, text, voice, speed=1.0, lang="en-us"):
        with open(os.environ["KOKORO_STUB_LOG"], "a") as f:
            f.write(json.dumps({"text": text, "voice": voice, "speed": speed, "lang": lang, "model": os.path.basename(self.model_path)}) + "\n")
        sr, n = 24000, int(len(text) * 0.06 / speed * 24000)
        tone = 0.5 * np.sin(2 * np.pi * 220 * np.arange(n) / sr).astype("float32")
        gap = np.zeros(int(0.3 * sr), dtype="float32")
        return np.concatenate([gap, tone, gap]), sr
