# python3 tools/audio_report.py <audio|video file> [--at T] [--range A B] [--place-at T] [--json]
# Onset, section and rhythm report for any audio file (the same numpy approach as tools/beatgrid.py, but for any file, no project).
#   onsets    spectral-flux peaks, in seconds (sample-hop accurate to ~12 ms)
#   sections  where the loudness steps (>= 3 dB between the 2 s before and the 2 s after), with each section's RMS in dB
#   rhythm    tempo from autocorrelation of the flux (60-190 BPM), its beat period, and how steady the onsets are on that grid
# --at T          the onset and beat nearest T, and the section T falls in
# --range A B     only onsets / sections inside [A, B]
# --place-at T    the onset time nearest T: use it as the time a cut or a sound cue should land on
import json, subprocess, sys
import numpy as np

SR, HOP, NF = 22050, 256, 2048


def load(path):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", path, "-vn", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"])
    return np.frombuffer(raw, np.float32).astype(np.float64)


def analyse(x):
    n = 1 + (len(x) - NF) // HOP
    if n < 8: return {"duration": len(x) / SR, "onsets": [], "sections": [], "rhythm": None}
    fr = np.lib.stride_tricks.as_strided(x, (n, NF), (x.strides[0] * HOP, x.strides[0]))
    S = np.log1p(100 * np.abs(np.fft.rfft(fr * np.hanning(NF), axis=1)))
    flux = np.concatenate([[0], np.maximum(0, np.diff(S, axis=0)).sum(1)])
    base = np.convolve(flux, np.ones(43) / 43, "same")
    env = np.maximum(flux - base, 0)
    th = max(env.mean() + 1.5 * env.std(), 1e-9)
    idx = [i for i in range(1, n - 1) if env[i] > th and env[i] >= env[i - 1] and env[i] > env[i + 1]]
    on, last = [], -1
    for i in idx:   # 80 ms refractory
        s0 = i * HOP; seg = np.abs(x[s0:s0 + NF])   # the flux frame starts before the hit: take the first sample above 30% of its peak
        t = (s0 + int(np.argmax(seg > 0.3 * seg.max()))) / SR if len(seg) and seg.max() > 0 else s0 / SR
        if t - last > 0.08: on.append(t); last = t
    # sections: RMS per 0.25 s, compare 2 s before and after each point
    blk = int(0.25 * SR); m = len(x) // blk
    rms = 20 * np.log10(np.sqrt((x[:m * blk].reshape(m, -1) ** 2).mean(1)) + 1e-9)
    w = 8; cuts = []
    for i in range(w, m - w + 1):
        d = rms[i:i + w].mean() - rms[i - w:i].mean()
        if abs(d) >= 3 and (not cuts or (i - cuts[-1]) * 0.25 >= 2): cuts.append(i)
        elif abs(d) >= 3 and abs(d) > abs(rms[cuts[-1]:cuts[-1] + w].mean() - rms[max(0, cuts[-1] - w):cuts[-1]].mean()) and (i - cuts[-1]) * 0.25 < 2: cuts[-1] = i
    edges = [0] + [c for c in cuts] + [m]
    secs = [{"start": round(a * 0.25, 2), "end": round(b * 0.25, 2), "rms_db": round(float(rms[a:b].mean()), 1)} for a, b in zip(edges[:-1], edges[1:]) if b > a]
    # rhythm
    rhythm = None
    lags = np.arange(int(60 / 190 * SR / HOP), int(SR / HOP) + 1)
    if len(env) > lags[-1] * 2:
        ac = np.array([np.dot(env[:-l], env[l:]) for l in lags])
        bpm_l = 60 * SR / HOP / lags
        l0 = lags[int(np.argmax(ac * np.exp(-0.5 * ((bpm_l - 120) / 45) ** 2)))]
        beat = l0 * HOP / SR
        o = np.array(on)
        if len(o) > 3:
            cands = beat * np.linspace(0.96, 1.04, 2001)
            z = np.exp(2j * np.pi * o[None, :] / cands[:, None]).mean(1)
            j = int(np.argmax(np.abs(z))); beat = float(cands[j]); t0 = float((np.angle(z[j]) / (2 * np.pi)) % 1 * beat)
            ph = ((o - t0) / beat + 0.5) % 1 - 0.5
            rhythm = {"bpm": round(60 / beat, 2), "beat": round(beat, 4), "t0": round(t0, 3), "steadiness": round(float(np.abs(z[j])), 3),
                      "residual_ms": round(float(np.sqrt((ph ** 2).mean()) * beat * 1000), 1)}
    return {"duration": round(len(x) / SR, 3), "onsets": [round(t, 3) for t in on], "sections": secs, "rhythm": rhythm}


def main(argv):
    if not argv or argv[0].startswith("-"): sys.exit(__doc__ or "usage: audio_report.py <file>")
    a = argv[:]; f = a.pop(0)
    def opt(name, k):
        if name not in a: return None
        i = a.index(name); v = [float(q) for q in a[i + 1:i + 1 + k]]; del a[i:i + 1 + k]; return v
    at, rng, place = opt("--at", 1), opt("--range", 2), opt("--place-at", 1)
    r = analyse(load(f))
    if rng: r["onsets"] = [t for t in r["onsets"] if rng[0] <= t <= rng[1]]; r["sections"] = [s for s in r["sections"] if s["end"] >= rng[0] and s["start"] <= rng[1]]
    near = lambda t: min(r["onsets"], key=lambda o: abs(o - t)) if r["onsets"] else None
    if at:
        t = at[0]; rh = r["rhythm"]
        r["at"] = {"t": t, "onset": near(t), "beat": (round(rh["t0"] + round((t - rh["t0"]) / rh["beat"]) * rh["beat"], 3) if rh else None),
                   "section": next((s for s in r["sections"] if s["start"] <= t <= s["end"]), None)}
    if place: r["place_at"] = {"t": place[0], "onset": near(place[0])}
    if "--json" in a: print(json.dumps(r))
    else:
        rh = r["rhythm"]
        print(f"{f}: {r['duration']} s, {len(r['onsets'])} onsets" + (f", {rh['bpm']} BPM (beat {rh['beat']} s, steadiness {rh['steadiness']}, residual {rh['residual_ms']} ms)" if rh else ", no steady tempo"))
        for s in r["sections"]: print(f"  section {s['start']:7.2f}-{s['end']:7.2f} s  {s['rms_db']:6.1f} dB")
        print("  onsets: " + " ".join(f"{t:.2f}" for t in r["onsets"][:40]) + (" ..." if len(r["onsets"]) > 40 else ""))
        for k in ("at", "place_at"):
            if k in r: print(f"  {k}: {r[k]}")


if __name__ == "__main__": main(sys.argv[1:])
