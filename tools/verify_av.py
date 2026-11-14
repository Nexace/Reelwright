# python3 tools/verify_av.py <project | file.mp4> [--ref mix.wav] [--cues timeline.json] [--json]
# Does the sound in the rendered mp4 land where the mix put it? (row 2b.19)
#   container   the mp4 audio stream's start_time and the AAC encoder delay it carries as an edit list: AAC drops 1024 samples of
#               priming at the start, which is 21.3 ms = 1.28 frames at 60 fps (0.64 at 30). Players that honour the edit list
#               (ffmpeg, browsers, QuickTime) hide it; those that do not play everything that late.
#   offset      cross-correlation of the decoded mp4 audio against mix.wav (the file that was muxed): the global lag in ms and frames
#               (positive = the mp4's sound is late), once as a player sees it and once with the edit list ignored (the raw priming)
#   per cue     the same lag measured in a 1 s window around each SFX cue of timeline.json, so one effect that lands 2 frames late
#               while the rest is on time shows up; a per-kind PEAK table in tools/mix.py already places synthesised SFX by construction
# WARN lines when the global offset or any cue lag exceeds 1 frame. As a plug-in: tools/checks/verify-av.py (opt-in:
# project.json "qa": {"verify-av": true}); as a command: `reelwright verify-av <project>`.
import json, os, subprocess, sys
import numpy as np

SR = 48000


def decode(path, ignore_editlist=False):
    cmd = ["ffmpeg", "-v", "error"] + (["-ignore_editlist", "1"] if ignore_editlist else []) + ["-i", path, "-vn", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"]
    return np.frombuffer(subprocess.check_output(cmd), np.float32).astype(np.float64)


def lag_samples(ref, got, max_lag):
    """Samples by which `got` is late against `ref` (cross-correlation by FFT, parabolic peak); None when either is silent."""
    n = min(len(ref), len(got))
    if n < 2 * max_lag or ref[:n].std() < 1e-6 or got[:n].std() < 1e-6: return None
    a, b = ref[:n] - ref[:n].mean(), got[:n] - got[:n].mean()
    m = 1 << (2 * n - 1).bit_length()
    c = np.fft.irfft(np.fft.rfft(b, m) * np.conj(np.fft.rfft(a, m)), m)
    c = np.concatenate([c[-max_lag:], c[:max_lag + 1]])          # lags -max_lag .. +max_lag
    i = int(np.argmax(c))
    if 0 < i < len(c) - 1:
        d = c[i - 1] - 2 * c[i] + c[i + 1]
        if d: return i - max_lag + 0.5 * (c[i - 1] - c[i + 1]) / d
    return float(i - max_lag)


def container(mp4):
    j = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_name,start_time,sample_rate,initial_padding", "-of", "json", mp4]))
    s = (j.get("streams") or [{}])[0]
    return {"codec": s.get("codec_name"), "start_time": float(s.get("start_time") or 0), "initial_padding": int(s.get("initial_padding") or 0)}


def verify(mp4, ref_wav, cues=(), fps=60, tol_frames=1.0):
    ref = decode(ref_wav); got = decode(mp4); raw = decode(mp4, True)
    ms = lambda s: None if s is None else round(1000 * s / SR, 2)
    fr = lambda s: None if s is None else round(s / SR * fps, 2)
    g, r = lag_samples(ref, got, SR // 4), lag_samples(ref, raw, SR // 4)
    cont = container(mp4)
    if g is not None: g += cont["start_time"] * SR       # a decoder starts at sample 0; the stream's start_time says when that plays
    rep = {"fps": fps, "container": cont, "offset_ms": ms(g), "offset_frames": fr(g), "raw_offset_ms": ms(r), "raw_offset_frames": fr(r), "cues": []}
    for c in cues:
        a = int((c["t"] - 0.5) * SR); b = a + SR
        if a < 0 or b > min(len(ref), len(got)): continue
        s = lag_samples(ref[a:b], got[a:b], int(0.1 * SR))
        if s is not None: rep["cues"].append({"t": c["t"], "kind": c["kind"], "lag_ms": ms(s), "lag_frames": fr(s)})
    rep["late"] = [c for c in rep["cues"] if abs(c["lag_frames"] - (rep["offset_frames"] or 0)) > tol_frames]
    return rep


def lines(rep, tol_frames=1.0):
    out = []
    if rep["offset_frames"] is not None and abs(rep["offset_frames"]) > tol_frames:
        out.append(f"the mp4's audio is {rep['offset_ms']:+.1f} ms ({rep['offset_frames']:+.2f} f at {rep['fps']:g} fps) from mix.wav: re-encode, or shift the audio by that much")
    if rep["raw_offset_frames"] is not None and abs(rep["raw_offset_frames"]) > tol_frames:
        out.append(f"without its edit list the audio is {rep['raw_offset_ms']:+.1f} ms ({rep['raw_offset_frames']:+.2f} f) late (AAC priming): fine in browsers and ffmpeg, late in a player that ignores the edit list")
    for c in rep["late"]:
        out.append(f"{c['kind']} cue at {c['t']:.2f}s lands {c['lag_ms']:+.1f} ms ({c['lag_frames']:+.2f} f) off, the rest of the mix is {rep['offset_frames']:+.2f} f")
    return out


if __name__ == "__main__":
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    if not a: sys.exit(__doc__.split("\n")[0])
    flag = lambda k: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else None
    if a[0].endswith(".mp4"):
        mp4, ref, tl, fps = a[0], flag("--ref"), flag("--cues"), 60
        if not ref: sys.exit("a bare mp4 needs --ref mix.wav")
    else:
        proj = a[0]; P = json.load(open(os.path.join(proj, "project.json")))
        mp4 = os.path.join(proj, P.get("out", "out/film.mp4")); ref = flag("--ref") or os.path.join(proj, "mix.wav"); tl = flag("--cues") or os.path.join(proj, "timeline.json"); fps = int(P.get("fps", 60))
    cues = json.load(open(tl)).get("cues", []) if tl and os.path.exists(tl) else []
    rep = verify(mp4, ref, cues, fps)
    if "--json" in sys.argv: print(json.dumps(rep, indent=1)); sys.exit()
    c = rep["container"]
    print(f"{c['codec']} audio, start_time {c['start_time']}s, encoder delay {c['initial_padding']} samples ({1000 * c['initial_padding'] / SR:.1f} ms = {c['initial_padding'] / SR * fps:.2f} f at {fps} fps)")
    print(f"offset vs mix.wav: {rep['offset_ms']} ms ({rep['offset_frames']} f); edit list ignored: {rep['raw_offset_ms']} ms ({rep['raw_offset_frames']} f)")
    for x in rep["cues"]: print(f"  {x['kind']:12} {x['t']:7.2f}s  {x['lag_ms']:+7.2f} ms  {x['lag_frames']:+.2f} f")
    for l in lines(rep): print("WARN", l)
