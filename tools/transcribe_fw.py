# python tools/transcribe_fw.py <audio|video> [--model base] [--lang en] [--models-dir <dir>]
# Word-level transcript with faster-whisper (CTranslate2), run by the venv python that `reelwright transcribe install` makes. Prints
# [{"text","start","end"}] (seconds) on stdout: the shape `captions` / tools/captions.mjs use. The model is read from
# <models-dir>/whisper/<model> (default <repo>/.models); nothing is downloaded here. faster-whisper decodes the file itself (PyAV), video included.
import argparse, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ORDER = ("base", "small", "tiny")


def models_dir():
    return os.environ.get("REELWRIGHT_MODELS_DIR") or os.path.join(os.path.dirname(HERE), ".models")


def installed_models(mdir=None):
    return [m for m in ORDER if os.path.exists(os.path.join(mdir or models_dir(), "whisper", m, "model.bin"))]


def transcribe(path, model="base", lang=None, mdir=None):
    d = os.path.join(mdir or models_dir(), "whisper", model)
    if not os.path.exists(os.path.join(d, "model.bin")):
        sys.exit(f'whisper model "{model}" not found in {d} (reelwright transcribe install --model {model} --yes)')
    from faster_whisper import WhisperModel
    segs, _ = WhisperModel(d, device="cpu", compute_type="int8", local_files_only=True).transcribe(path, language=lang, word_timestamps=True)
    return [{"text": w.word.strip(), "start": round(float(w.start), 3), "end": round(float(w.end), 3)}
            for s in segs for w in (s.words or []) if w.word.strip()]


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("media")
    ap.add_argument("--model", default="base")
    ap.add_argument("--lang")
    ap.add_argument("--models-dir")
    a = ap.parse_args()
    json.dump(transcribe(a.media, a.model, a.lang, a.models_dir), sys.stdout)
