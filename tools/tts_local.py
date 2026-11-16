# python3 tools/tts_local.py <project> [line_id ...]        (normally reached through tools/vo.py)
# Offline voiceover fallback with the speech engine the OS already has: macOS `say`, Linux `espeak-ng` / `espeak`, Windows SAPI (PowerShell
# System.Speech). Same outputs as tools/vo.py: one mp3 per line + <project>/vo/lines.json (vo/<lang>/ with --lang), so sched / mix / captions work.
# Used when project.json "tts": "local", env REELWRIGHT_TTS=local, edge-tts is not installed, or edge-tts keeps failing (tools/vo.py switches over).
# REELWRIGHT_TTS_ENGINE=say|espeak-ng|espeak|sapi picks one engine (default: the first found); =synth is a deterministic stand-in voice (a
# buzz per word, no speech) that is used only when asked for by name (tools/ci_film.mjs, on a machine whose OS voice writes no speech). The voice
# is the engine's default: project.json "voice" is an Edge voice name and is ignored here. Each line is high-passed at 80 Hz and peak-normalised
# to -3 dBFS; an engine that writes no speech (silence, or a near-empty file) is an error, not a silent line. Word times are ESTIMATED from the
# speech span and letter counts (tools/tts_kokoro.py), and each line is marked "timing": "estimated".
# `python3 tools/tts_local.py --engine` prints the engine found, exit 1 when there is none; `--probe` also speaks a test line, exit 1 with the reason.
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
    if want == "synth":
        return ["synth"]
    return [e for e in found if e == want] if want else found


def engine():
    return (engines() or [None])[0]


def synth(text, out, sr=24000):
    """The stand-in voice: per word a voiced burst as long as its letters (falling pitch over the line), pauses after , and . — same text, same wav."""
    import numpy as np
    words, parts = text.split(), [np.zeros(int(0.1 * sr))]
    for i, w in enumerate(words):
        t = np.arange(int(sr * (0.06 * len(w) + 0.08))) / sr
        f0 = 150 - 40 * i / max(1, len(words) - 1)
        x = sum(np.sin(2 * np.pi * k * f0 * t + k * k) / k for k in range(1, 12)) * np.sin(np.pi * t / t[-1]).clip(0) ** 0.7   # fixed phases: no RNG
        parts += [x, np.zeros(int(sr * (0.35 if w[-1] in ".!?" else 0.2 if w[-1] in ",;:" else 0.05)))]
    y = np.concatenate(parts)
    with wave.open(out, "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr); f.writeframes((0.5 * y / np.abs(y).max() * 32767).astype("<i2").tobytes())


def speak(eng, text, out):
    """Speak `text` with `eng` into the audio file `out` (aiff / wav, whatever the engine writes)."""
    if eng == "synth":
        synth(text, out)
    elif eng == "sapi":
        subprocess.run([_ps(), "-NoProfile", "-NonInteractive", "-Command", SAPI], check=True, env={**os.environ, "RW_OUT": out, "RW_TEXT": text})
    else:   # the text goes in on stdin: no quoting, and a line starting with "-" is not read as an option
        cmd = ["say", "-o", out, "-f", "-"] if eng == "say" else [eng, "-w", out, "--stdin"]
        subprocess.run(cmd, input=text.encode("utf-8"), check=True)


def key(eng, text):
    return hashlib.sha1(f"local|hp80|{eng}|{text}".encode()).hexdigest()[:12]   # hp80: lines made before the high-pass are made again


def render(eng, text, mp3):
    """Speak, then → mp3. Returns (duration, speech start, speech end). RuntimeError when the engine wrote no speech."""
    import numpy as np
    tmp, sr = tempfile.mkdtemp(prefix="rw-tts-"), 24000
    try:
        raw, wav = os.path.join(tmp, "raw.audio"), os.path.join(tmp, "line.wav")
        speak(eng, text, raw)
        # the 80 Hz high-pass takes out what is not voice: SAPI writes a DC offset and rumble (6% of its energy below 60 Hz) that the
        # mp4's AAC encoder codes badly at a loud onset (the film's true peak went from -1.5 to -0.3 dBTP there). Float, so nothing clips yet.
        x = np.frombuffer(subprocess.check_output(["ffmpeg", "-v", "error", "-i", raw, "-af", "highpass=f=80", "-ar", str(sr), "-ac", "1", "-f", "f32le", "-"]), "<f4")
        pk = float(np.abs(x).max()) if x.size else 0.0
        if x.size < 0.15 * sr or not pk > 10 ** (-50 / 20):   # macOS `say` on a CI runner exited 0 with 0.01 s of audio for every line
            raise RuntimeError(f"{eng} wrote no speech for {text!r} ({x.size / sr:.2f} s, peak {20 * np.log10(max(pk, 1e-9)):.0f} dBFS): this machine's voice is not usable")
        x = x * (10 ** (-3 / 20) / pk)   # peak at -3 dBFS, as neural TTS lines come (SAPI writes -0.3 dBFS, and the high-pass can push that over 0)
        with wave.open(wav, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x * 32767).astype("<i2").tobytes())
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", wav, "-codec:a", "libmp3lame", "-q:a", "2", mp3], check=True)
        s, e = speech_span(x, sr)
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
        try:
            dur, s, e = render(eng, text, mp3)
        except RuntimeError as err:
            sys.exit(str(err))
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
    if sys.argv[1] == "--probe":   # the engine, and proof that it speaks: one test line rendered and checked like a film line
        eng, d = engine(), tempfile.mkdtemp(prefix="rw-tts-probe-")
        try:
            if not eng:
                sys.exit("no local speech engine (macOS say, Linux espeak-ng, Windows PowerShell SAPI)")
            render(eng, "Testing the offline voice, one two three.", os.path.join(d, "probe.mp3"))
            print(eng)
        except (RuntimeError, subprocess.CalledProcessError, OSError) as err:
            sys.exit(str(err) if isinstance(err, RuntimeError) else f"{eng}: {err}")
        finally:
            shutil.rmtree(d, ignore_errors=True)
        sys.exit(0)
    main(sys.argv[1:])
