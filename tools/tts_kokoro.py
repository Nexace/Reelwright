# python3 tools/tts_kokoro.py <project> [line_id ...]
# Local voiceover with Kokoro-82M (ONNX, offline): the same outputs as tools/vo.py (one mp3 per line + <project>/vo/lines.json,
# vo/<lang>/ with --lang), so sched / mix / captions work unchanged. Opt in with project.json "tts": "kokoro".
#   project.json: "voice": "af_heart" (any Kokoro voice id), "speed": 1.0 (0.5 to 2), "kokoro": {"dir": "<folder>"} (optional)
#   model files (you download them once, see docs below): kokoro-v1.0.onnx and voices-v1.0.bin in the first of
#   project.json kokoro.dir, $KOKORO_DIR, ~/.cache/reelwright/kokoro. Needs the `kokoro-onnx` python package (pip install kokoro-onnx).
# Nothing is downloaded or installed by this script. Without the model or the package it exits with what to do.
# Languages by voice prefix: af/am en-us, bf/bm en-gb, ef/em es, ff fr, hf/hm hi, if/im it, jf/jm ja, pf/pm pt-br, zf/zm cmn.
# Word times: Kokoro gives audio only, so words are placed by an ESTIMATE (the line's speech span, found from the audio energy, split by
# letters per word with pauses after punctuation) and each line is marked "timing": "estimated". Edge-tts word boundaries (tools/vo.py)
# are exact; a forced aligner (HyperFrames D10) would make these exact too, and is not part of this adapter.
import hashlib, json, os, re, subprocess, sys, wave

LANGS = {"a": "en-us", "b": "en-gb", "e": "es", "f": "fr", "h": "hi", "i": "it", "j": "ja", "p": "pt-br", "z": "cmn"}
MODEL, VOICES = "kokoro-v1.0.onnx", "voices-v1.0.bin"


def lang_of(voice):
    m = re.match(r"^([a-z])[fm]_", voice or "")
    if not m or m.group(1) not in LANGS:
        raise ValueError(f'unknown Kokoro voice "{voice}" (ids look like af_heart, bm_george, ef_dora, jf_alpha)')
    return LANGS[m.group(1)]


def speech_span(samples, sr, thresh=0.02, pad=0.03):
    """(start, end) in seconds of the audio above `thresh` of its peak (the speech, without the silent head and tail)."""
    import numpy as np
    a = np.abs(np.asarray(samples, dtype="float32"))
    loud = np.nonzero(a > thresh * float(a.max()))[0] if a.size and a.max() > 0 else []
    if not len(loud):
        return 0.0, len(a) / sr
    return max(0.0, loud[0] / sr - pad), min(len(a) / sr, loud[-1] / sr + pad)


def estimate_words(text, start, end):
    """Place the words of `text` inside [start, end] seconds: weight = letters + 1, plus a pause after , ; : (2) and . ! ? (4) in letter units."""
    toks = text.split()
    if not toks:
        return []
    wt = [len(re.sub(r"\W", "", t)) + 1 + (4 if re.search(r"[.!?…]$", t) else 2 if re.search(r"[,;:]$", t) else 0) for t in toks]
    own = [len(re.sub(r"\W", "", t)) + 1 for t in toks]
    tot, t0, out = float(sum(wt)), start, []
    for tok, w, o in zip(toks, wt, own):
        span = (end - start) * w / tot
        out.append({"w": tok, "t": round(t0, 3), "d": round(span * o / w, 3)})
        t0 += span
    return out


def key(voice, speed, text):
    return hashlib.sha1(f"kokoro|{voice}|{speed}|{text}".encode()).hexdigest()[:12]


def find_model(P):
    dirs = [(P.get("kokoro") or {}).get("dir"), os.environ.get("KOKORO_DIR"), os.environ.get("KOKORO_CACHE") or os.path.expanduser("~/.cache/reelwright/kokoro")]
    for d in filter(None, dirs):
        if os.path.exists(os.path.join(d, MODEL)) and os.path.exists(os.path.join(d, VOICES)):
            return os.path.join(d, MODEL), os.path.join(d, VOICES)
    sys.exit("Kokoro model not found. Put kokoro-v1.0.onnx and voices-v1.0.bin (from the kokoro-onnx releases, Apache-2.0) in "
             "~/.cache/reelwright/kokoro, or set KOKORO_DIR / project.json kokoro.dir. Nothing is downloaded automatically.")


def write_wav(path, samples, sr):
    import numpy as np
    pcm = (np.clip(np.asarray(samples, dtype="float32"), -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())


def main(argv):
    proj, force = argv[0], set(argv[1:])
    P = json.load(open(os.path.join(proj, "project.json")))
    LANG, VD = os.environ.get("REELWRIGHT_LANG"), "vo"
    if LANG:
        Lg = (P.get("langs") or {}).get(LANG) or sys.exit(f'no "langs": {{"{LANG}": ...}} in project.json')
        miss = [ln["id"] for ln in P["lines"] if ln["id"] not in Lg.get("lines", {})]
        if miss:
            sys.exit(f"langs.{LANG}.lines is missing: {', '.join(miss)}")
        P = {**P, **{k: Lg[k] for k in ("voice", "speed") if k in Lg}, "lines": [{**ln, "text": Lg["lines"][ln["id"]]} for ln in P["lines"]]}
        VD = f"vo/{LANG}"
    voice, speed = P.get("voice", "af_heart"), float(P.get("speed", 1.0))
    if not 0.5 <= speed <= 2:
        sys.exit("speed is 0.5 to 2")
    lang = lang_of(voice)
    os.makedirs(os.path.join(proj, VD), exist_ok=True)
    out = os.path.join(proj, VD, "lines.json")
    old = json.load(open(out)) if os.path.exists(out) else {}
    if not P.get("lines"):
        json.dump({}, open(out, "w")); print("no VO lines (music-only film)"); return
    todo = [ln for ln in P["lines"] if not (old.get(ln["id"], {}).get("key") == key(voice, speed, ln["text"]) and ln["id"] not in force
                                            and os.path.exists(os.path.join(proj, VD, ln["id"] + ".mp3")))]
    res = {ln["id"]: old[ln["id"]] for ln in P["lines"] if ln not in todo}
    if todo:
        model, voices = find_model(P)
        try:
            from kokoro_onnx import Kokoro
        except ImportError:
            sys.exit("the kokoro-onnx package is not installed: pip install kokoro-onnx (it needs onnxruntime). Nothing was installed for you.")
        k = Kokoro(model, voices)
        for ln in todo:
            lid, text = ln["id"], ln["text"]
            samples, sr = k.create(text, voice=voice, speed=speed, lang=lang)
            wav, mp3 = os.path.join(proj, VD, lid + ".wav"), os.path.join(proj, VD, lid + ".mp3")
            write_wav(wav, samples, sr)
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", wav, "-codec:a", "libmp3lame", "-q:a", "2", mp3], check=True)
            os.remove(wav)
            dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3]))
            s, e = speech_span(samples, sr)
            res[lid] = {"text": text, "key": key(voice, speed, text), "dur": round(dur, 3), "words": estimate_words(text, s, min(e, dur)), "timing": "estimated"}
            print(f"{lid:10} {dur:5.2f}s  {text}", flush=True)
            json.dump({**old, **res}, open(out, "w"), indent=1)
    res = {ln["id"]: res[ln["id"]] for ln in P["lines"]}
    json.dump(res, open(out, "w"), indent=1)
    print("vo ok (kokoro):", len(res), "lines,", round(sum(v["dur"] for v in res.values()), 1), "s of audio")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__.split("\n")[0])
    main(sys.argv[1:])
