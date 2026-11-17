# python3 tools/beatsync.py <project | file.mp4> [--grid t0,beat] [--json] [--write]
# Beat-synced cutting, measured on the RENDERED mp4 (row 2b.18). beatgrid.py fits the grid of the source track; this checks what
# reached the screen and the speakers:
#   onset classes   kick (30-150 Hz), snare (150-2500 Hz body + crack), hat (6-14 kHz), each a list of hit times, from the mp4's own
#                   audio (5 ms envelope of each band, peaks over a share of the band's own loudness, 40 ms apart, placed where the hit starts)
#   grid coverage   the share of grid beats that carry a hit within 40 ms, and the median hit-minus-grid offset in ms (the "source
#                   music offset": a wrong music.start or a late-starting track shows as a steady offset); a grid with low coverage
#                   is the wrong grid, whatever the BPM says
#   cut error       hard cuts found in the picture (frame difference, 64x36 grey) against the nearest grid beat or half beat, in frames
#                   (the rule of thumb is <= 3 f), and against the nearest audible hit (hit_frames)
# The grid is project music/grid.json (beatgrid.py) or the synth bed's bpm, placed like tools/sched.py does; --grid t0,beat overrides.
# --write saves the detected onsets to <project>/music/onsets.json (film time, the audio the film actually has); sched.py bakes
# them into window.MUSIC.onsets, which KIT.hit (tools/hit-sync.js) snaps to. Run it once after a render; the audio does not
# change between renders, so the next one can land on those hits. A bare mp4 has nowhere to write.
# As a plug-in: tools/checks/cut-on-beat.py (opt-in: project.json "qa": {"cut-on-beat": true}).
import json, os, subprocess, sys
import numpy as np

SR = 32000
BANDS = {"kick": (30, 150), "snare": (150, 2500), "hat": (6000, 14000)}


def decode(path, sr=SR):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", path, "-vn", "-f", "f32le", "-ac", "1", "-ar", str(sr), "-"])
    return np.frombuffer(raw, np.float32).astype(np.float64)


def onset_classes(x, sr=SR, rel=0.3, refractory=0.04):
    """{class: [seconds]}: per band, the 5 ms envelope of the band-passed signal; its peaks above rel x the band's 99.5th percentile
    (and above a floor of the whole signal's peak, so a band with no hits stays empty), 40 ms apart, each placed where the envelope
    left 20% of its peak, i.e. where the hit starts. A kick leaks into the snare band and a snare into the kick band: where both
    fire together, the band in which the hit is the louder share of that band's own level wins (a real kick + snare layered
    on one beat counts as the louder of the two)."""
    if len(x) < sr // 2: return {c: [] for c in BANDS}
    X, F, gmax = np.fft.rfft(x), np.fft.rfftfreq(len(x), 1 / sr), np.abs(x).max()
    w, step = max(1, int(0.005 * sr)), sr // 1000          # 5 ms smoothing, then the envelope at 1 ms
    E, ref = {}, {}
    for name, (lo, hi) in BANDS.items():
        y = np.abs(np.fft.irfft(np.where((F >= lo) & (F < hi), X, 0), len(x)))
        c = np.concatenate([[0.0], np.cumsum(y)]); E[name] = ((c[w:] - c[:-w]) / w)[::step]
        ref[name] = np.percentile(E[name], 99.5) + 1e-12
    out = {}
    for name in BANDS:
        e = E[name]
        thr = max(rel * ref[name], 0.024 * gmax)
        pad = np.pad(e, 20, constant_values=0)
        peaks = np.flatnonzero((e >= np.lib.stride_tricks.sliding_window_view(pad, 41).max(1)) & (e > thr))
        hits = []
        for i in peaks[np.argsort(-e[peaks])]:
            if all(abs(i - j) > refractory * 1000 for j in hits): hits.append(int(i))
        rival = {"kick": "snare", "snare": "kick"}.get(name)
        res = []
        for i in sorted(hits):
            if rival and e[i] / ref[name] < E[rival][max(0, i - 10):i + 11].max() / ref[rival]: continue
            j = i
            while j > max(0, i - 80) and e[j] > 0.2 * e[i]: j -= 1
            res.append(round((j * step + 0.8 * w) / sr, 4))   # the 5 ms window starts at j: it first sees the hit ~0.8 windows later
        out[name] = res
    return out


def grid_report(onsets, t0, beat, dur, tol=0.04):
    """Transient coverage of a grid: share of beats with any hit within tol s, and the median signed offset (hit - beat) in ms."""
    allh = np.sort(np.concatenate([np.asarray(v, float) for v in onsets.values()])) if any(len(v) for v in onsets.values()) else np.array([])
    beats = t0 + beat * np.arange(int((dur - t0) / beat))
    if not len(allh) or not len(beats): return {"beats": int(len(beats)), "coverage": 0.0, "offset_ms": None}
    d = allh[np.abs(allh[None, :] - beats[:, None]).argmin(1)] - beats       # nearest hit to each beat
    near = np.abs(d) < max(tol, 0.0)
    wide = np.abs(d) < beat / 4                                              # for the offset: hits that plausibly belong to the beat
    return {"beats": int(len(beats)), "coverage": float(near.mean()),
            "offset_ms": round(float(np.median(d[wide])) * 1000, 1) if wide.any() else None}


def cut_times(mp4, fps=None):
    """Seconds of each hard cut in the picture: the first frame whose difference to the last is far above its neighbours'."""
    pr = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate",
                                              "-of", "json", mp4]))["streams"][0]["r_frame_rate"]
    a, b = pr.split("/"); fps = fps or float(a) / float(b)
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", mp4, "-an", "-vf", "scale=64:36,format=gray", "-f", "rawvideo", "-"])
    f = np.frombuffer(raw, np.uint8).reshape(-1, 36 * 64).astype(np.float64)
    d = np.abs(np.diff(f, axis=0)).mean(1)                                   # d[i]: frame i -> i + 1
    cuts = []
    for i, v in enumerate(d):
        nb = np.concatenate([d[max(0, i - 4):i], d[i + 1:i + 5]])
        if v > 10 and v > 4 * (np.median(nb) if len(nb) else 0) + 2: cuts.append((i + 1) / fps)
    return cuts, fps


def cut_errors(cuts, grid_t0, beat, fps):
    """Per cut: signed frames from the nearest beat/half beat (positive = the cut is late) and that grid time."""
    out = []
    for c in cuts:
        k = round((c - grid_t0) / (beat / 2)); g = grid_t0 + k * beat / 2
        out.append({"cut": round(c, 3), "grid": round(g, 3), "frames": round((c - g) * fps, 2)})
    return out


def project_grid(proj, P=None):
    """(t0, beat) in film time, as tools/sched.py places it."""
    P = P or json.load(open(os.path.join(proj, "project.json"))); M = P.get("music", {})
    gp = os.path.join(proj, "music/grid.json")
    if M.get("file") and os.path.exists(os.path.join(proj, M["file"])) and os.path.exists(gp):
        g = json.load(open(gp)); beat = g["beat"]
        return (g["t0"] - M.get("start", 0) + beat / 2) % beat - beat / 2, beat
    return 0.0, 60 / M.get("bpm", 100)


def analyse(mp4, t0, beat, fps=None, tol_frames=3):
    x = decode(mp4); dur = len(x) / SR
    on = onset_classes(x)
    cuts, fps = cut_times(mp4, fps)
    errs = cut_errors(cuts, t0, beat, fps)
    hits = np.sort(np.concatenate([np.asarray(v, float) for v in on.values()])) if any(len(v) for v in on.values()) else np.array([])
    for e in errs:   # the cut against the nearest actual hit too: the grid may be right and the track still late
        e["hit_frames"] = round(float((hits[np.abs(hits - e["cut"]).argmin()] - e["cut"]) * fps), 2) if len(hits) else None
    rep = {"fps": fps, "duration": round(dur, 2), "onsets": {k: len(v) for k, v in on.items()}, "grid": {"t0": round(t0, 4), "beat": round(beat, 4)},
           "coverage": grid_report(on, t0, beat, dur), "cuts": errs,
           "late": [e for e in errs if abs(e["frames"]) > tol_frames]}
    return rep, on


def lines(rep, tol_frames=3):
    out, c = [], rep["coverage"]
    if c["beats"] and c["coverage"] < 0.4:
        out.append(f"the grid (t0 {rep['grid']['t0']}s, beat {rep['grid']['beat']}s) matches the rendered audio on only {c['coverage']:.0%} of beats: wrong BPM, music.start, or a beatless bed")
    elif c["offset_ms"] is not None and abs(c["offset_ms"]) > 1000 * 1.5 / rep["fps"]:
        out.append(f"the audio's hits sit {c['offset_ms']:+.0f} ms from the grid (> 1.5 frames): the track starts {'late' if c['offset_ms'] > 0 else 'early'}, check music.start / the source offset")
    for e in rep["late"]:
        out.append(f"cut at {e['cut']:.2f}s is {e['frames']:+.1f} f from the beat grid ({e['grid']:.2f}s), over {tol_frames} f" +
                   (f"; nearest hit {e['hit_frames']:+.1f} f" if e.get("hit_frames") is not None else ""))
    return out


if __name__ == "__main__":
    a = [x for x in sys.argv[1:] if not x.startswith("--")]
    if not a: sys.exit(__doc__.split("\n")[0])
    arg = a[0]
    if arg.endswith(".mp4"):
        mp4, proj = arg, None
    else:
        P = json.load(open(os.path.join(arg, "project.json"))); mp4, proj = os.path.join(arg, P.get("out", "out/film.mp4")), arg
    if "--grid" in sys.argv: t0, beat = map(float, sys.argv[sys.argv.index("--grid") + 1].split(","))
    elif proj: t0, beat = project_grid(proj)
    else: sys.exit("give --grid t0,beat for a bare mp4")
    rep, on = analyse(mp4, t0, beat)
    if "--write" in sys.argv:
        if not proj: sys.exit("--write needs a project folder (a bare mp4 has nowhere to write music/onsets.json)")
        op = os.path.join(proj, "music/onsets.json")
        os.makedirs(os.path.dirname(op), exist_ok=True)
        json.dump({"source": os.path.relpath(mp4, proj), "fps": round(rep["fps"], 4), "duration": rep["duration"],
                   "bands": {k: [round(float(v), 4) for v in vals] for k, vals in on.items()}}, open(op, "w"), indent=1)
        print(f"onsets → {op} (run sched to bake them into the film; KIT.hit reads them)")
    if "--json" in sys.argv: print(json.dumps(rep, indent=1)); sys.exit()
    print(f"{rep['duration']}s at {rep['fps']:g} fps; hits kick {rep['onsets']['kick']}, snare {rep['onsets']['snare']}, hat {rep['onsets']['hat']}")
    c = rep["coverage"]
    print(f"grid t0 {t0:.3f}s beat {beat:.4f}s: {c['coverage']:.0%} of {c['beats']} beats carry a hit, median offset {c['offset_ms']} ms")
    for e in rep["cuts"]: print(f"  cut {e['cut']:7.3f}s  {e['frames']:+5.1f} f from grid {e['grid']:.3f}s" + (f", {e['hit_frames']:+.1f} f from the nearest hit" if e.get('hit_frames') is not None else ""))
    for l in lines(rep): print("WARN", l)
