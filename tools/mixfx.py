# Audio automation lanes and a true-peak limiter for tools/mix.py (import it: `import mixfx`; it adds nothing to the mix until used).
#   lane(points, n, sr, kind="db")    → per-sample curve from [[t, value], ...] (linear between points, held outside; "db" → gain, "lin", "hz")
#   fade(n, sr, t_in, t_out, d_in, d_out) → per-sample fade envelope (equal-power: sine in, cosine out)
#   automate(x, sr, spec, t0=0)        x: (n,) or (n, ch) float array. spec keys (all optional):
#         gain:   [[t, dB], ...]       volume lane, seconds from the start of x + t0; any dB, so above unity is allowed (+6 = 2x)
#         cutoff: [[t, Hz], ...]       low-pass cutoff lane (one-pole, per-sample cutoff: sample-accurate FX parameter)
#         fade_in, fade_out: seconds   clip fades
#   limiter_filter(sr, ceiling_db=-1.5, lookahead_ms=5, release_ms=50) → ffmpeg -af chain: 4x oversample → lookahead limiter → back
#   limit(path_in, path_out, ...)      runs that chain (true-peak safe: the oversampled signal never exceeds the ceiling)
# project.json shape it reads in mix.py (patch in docs/plans/p8-patches.md): music.automation / voice.automation = the spec above.
import subprocess
import numpy as np


def lane(points, n, sr, kind="db"):
    pts = sorted((float(t), float(v)) for t, v in points)
    t = np.arange(n) / sr
    v = np.interp(t, [p[0] for p in pts], [p[1] for p in pts])   # held at both ends
    return 10 ** (v / 20) if kind == "db" else v


def fade(n, sr, t_in=0.0, t_out=None, d_in=0.0, d_out=0.0):
    t = np.arange(n) / sr
    e = np.ones(n)
    if d_in > 0: e *= np.sin(0.5 * np.pi * np.clip((t - t_in) / d_in, 0, 1))
    if d_out > 0:
        end = (n / sr) if t_out is None else t_out
        e *= np.cos(0.5 * np.pi * np.clip((t - (end - d_out)) / d_out, 0, 1))
    return e


def _lowpass(x, fc, sr):   # one-pole low-pass, cutoff per sample
    a = 1 - np.exp(-2 * np.pi * np.clip(fc, 20, sr / 2 - 1) / sr)
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s += a[i] * (x[i] - s); y[i] = s
    return y


def automate(x, sr, spec, t0=0.0):
    n = x.shape[0]; out = x.astype(np.float64).copy()
    shape = (n, 1) if out.ndim == 2 else (n,)
    if spec.get("cutoff"):
        fc = lane([[t - t0, v] for t, v in spec["cutoff"]], n, sr, "hz")
        out = np.stack([_lowpass(out[:, c], fc, sr) for c in range(out.shape[1])], 1) if out.ndim == 2 else _lowpass(out, fc, sr)
    g = np.ones(n)
    if spec.get("gain"): g = g * lane([[t - t0, v] for t, v in spec["gain"]], n, sr, "db")
    if spec.get("fade_in") or spec.get("fade_out"): g = g * fade(n, sr, 0.0, None, spec.get("fade_in", 0), spec.get("fade_out", 0))
    return out * g.reshape(shape)


def limiter_filter(sr, ceiling_db=-1.5, lookahead_ms=5, release_ms=50):
    lim = 10 ** (ceiling_db / 20)
    return (f"aresample={sr * 4},alimiter=limit={lim:.5f}:attack={lookahead_ms}:release={release_ms}:level=disabled:asc=0,"
            f"aresample={sr}")


def limit(path_in, path_out, sr=44100, **kw):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path_in, "-af", limiter_filter(sr, **kw), "-ar", str(sr), path_out], check=True)


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3: sys.exit("usage: mixfx.py in.wav out.wav [ceiling_db]   true-peak limit a file")
    limit(sys.argv[1], sys.argv[2], 44100, **({"ceiling_db": float(sys.argv[3])} if len(sys.argv) > 3 else {}))
