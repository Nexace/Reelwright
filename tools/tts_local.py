# python3 tools/tts_local.py <project> [line_id ...]        (normally reached through tools/vo.py)
# Offline voiceover fallback with the speech engine the OS already has: macOS `say`, Linux `espeak-ng` / `espeak`, Windows SAPI (PowerShell
# System.Speech). Same outputs as tools/vo.py: one mp3 per line + <project>/vo/lines.json (vo/<lang>/ with --lang), so sched / mix / captions work.
# Used when project.json "tts": "local", env REELWRIGHT_TTS=local, edge-tts is not installed, or edge-tts keeps failing (tools/vo.py switches over).
# REELWRIGHT_TTS_ENGINE=say|espeak-ng|espeak|sapi picks one engine (default: the first found). The voice is the engine's default: project.json
# "voice" is an Edge voice name and is ignored here. Word times are ESTIMATED from the speech span and letter counts (tools/tts_kokoro.py),
# and each line is marked "timing": "estimated". `python3 tools/tts_local.py --engine` prints the engine found, exit 1 when there is none.
import hashlib, json, os, shutil, subprocess, sys, tempfile, wave

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tts_kokoro import estimate_words, speech_span

SAPI = ("Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$s.SetOutputToWaveFile($env:RW_OUT); $s.Speak($env:RW_TEXT); $s.Dispose()")


def _ps():
    return shutil.which("powershell") or shutil.which("pwsh")


def engines():
    """Engines usable on this machine, in preference order."""
    found = []
    if sys.platform == "darwin" and shutil.which("say"):
        found.append("say")
    for e in ("espeak-ng", "espeak"):
        if shutil.which(e):
            found.append(e)
    if sys.platform == "win32" and _ps():
        found.append("sapi")
    want = os.environ.get("REELWRIGHT_TTS_ENGINE")
    return [e for e in found if e == want] if want else found


def engine():
    return (engines() or [None])[0]


def speak(eng, text, out):
    """Speak `text` with `eng` into the audio file `out` (aiff / wav, whatever the engine writes)."""
    if eng == "sapi":
        subprocess.run([_ps(), "-NoProfile", "-NonInteractive", "-Command", SAPI], check=True, env={**os.environ, "RW_OUT": out, "RW_TEXT": text})
    else:   # the text goes in on stdin: no quoting, and a line starting with "-" is not read as an option
        cmd = ["say", "-o", out, "-f", "-"] if eng == "say" else [eng, "-w", out, "--stdin"]
        subprocess.run(cmd, input=text.encode("utf-8"), check=True)


def key(eng, text):
    return hashlib.sha1(f"local|{eng}|{text}".encode()).hexdigest()[:12]


def render(eng, text, mp3):
    """Speak, then → mp3. Returns (duration, speech start, speech end)."""
    import numpy as np
    tmp = tempfile.mkdtemp(prefix="rw-tts-")
    try:
        raw, wav = os.path.join(tmp, "raw.audio"), os.path.join(tmp, "line.wav")
        speak(eng, text, raw)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", raw, "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", wav], check=True)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", wav, "-codec:a", "libmp3lame", "-q:a", "2", mp3], check=True)
        with wave.open(wav) as w:
            sr, pcm = w.getframerate(), np.frombuffer(w.readframes(w.getnframes()), dtype="<i2")
        s, e = speech_span(pcm.astype("float32") / 32768, sr)
        dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3]).decode().strip())
        return dur, s, min(e, dur)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main(argv):
    proj, force = argv[0], set(argv[1:])
    P = json.load(open(os.path.join(proj, "project.json")))
    LANG, VD = os.environ.get("REELWRIGHT_LANG"), "vo"
    if LANG:
        Lg = (P.get("langs") or {}).get(LANG) or sys.exit(f'no "langs": {{"{LANG}": ...}} in project.json')
        miss = [ln["id"] for ln in P["lines"] if ln["id"] not in Lg.get("lines", {})]
        if miss:
            sys.exit(f"langs.{LANG}.lines is missing: {', '.join(miss)}")
        P = {**P, "lines": [{**ln, "text": Lg["lines"][ln["id"]]} for ln in P["lines"]]}
        VD = f"vo/{LANG}"
    os.makedirs(os.path.join(proj, VD), exist_ok=True)
    out = os.path.join(proj, VD, "lines.json")
    if not P.get("lines"):
        json.dump({}, open(out, "w")); print("no VO lines (music-only film)"); return
    eng = engine()
    if not eng:
        sys.exit("no local speech engine: macOS needs `say`, Linux `espeak-ng` (apt install espeak-ng), Windows needs PowerShell with System.Speech"
                 + (f" (REELWRIGHT_TTS_ENGINE={os.environ['REELWRIGHT_TTS_ENGINE']} is not available)" if os.environ.get("REELWRIGHT_TTS_ENGINE") else ""))
    old = json.load(open(out)) if os.path.exists(out) else {}
    res = {}
    for ln in P["lines"]:
        lid, text = ln["id"], ln["text"]
        mp3 = os.path.join(proj, VD, lid + ".mp3")
        if old.get(lid, {}).get("key") == key(eng, text) and lid not in force and os.path.exists(mp3):
            res[lid] = old[lid]
            continue
        dur, s, e = render(eng, text, mp3)
        res[lid] = {"text": text, "key": key(eng, text), "dur": round(dur, 3), "words": estimate_words(text, s, e), "timing": "estimated"}
        print(f"{lid:10} {dur:5.2f}s  {text}", flush=True)
        json.dump({**old, **res}, open(out, "w"), indent=1)
    json.dump(res, open(out, "w"), indent=1)
    print(f"vo ok (local, {eng}):", len(res), "lines,", round(sum(v["dur"] for v in res.values()), 1), "s of audio")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__.split("\n")[0])
    if sys.argv[1] == "--engine":
        print(engine() or ""); sys.exit(0 if engine() else 1)
    main(sys.argv[1:])
