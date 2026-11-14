# python3 tools/mix.py <project>
# Final soundtrack → <project>/mix.wav: voiceover placed per timeline.json, music bed ducked under the voice,
# synth UI sounds at the film's SFX cues (KIT.cue in film.js), loudness-normalised (project.json loudness, default −14 LUFS).
import json, os, subprocess, sys
import numpy as np

proj = sys.argv[1]
P = json.load(open(os.path.join(proj, "project.json")))
TL = json.load(open(os.path.join(proj, "timeline.json")))
SR = 48000
DUR = TL["DUR"]; N = int(DUR * SR)
rng = np.random.default_rng(7)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import audio_fx   # project.json "fx": {"vo", "music", "sfx", "lines": {id}}
FX = P.get("fx", {})


def load(path, ch):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", str(ch), "-ar", str(SR), "-"])
    return np.frombuffer(raw, np.float32).reshape(-1, ch).astype(np.float64)


def mavg(x, w):  # fast moving average (np.convolve with a huge window hangs on long films)
    c = np.cumsum(np.concatenate([[0.0], x])); y = (c[w:] - c[:-w]) / w
    pad = len(x) - len(y); return np.concatenate([np.full(pad // 2, y[0]), y, np.full(pad - pad // 2, y[-1])])


# ── voice ──
vo = np.zeros(N)
for lid, v in (TL.get("VO") or {}).items():
    x = load(os.path.join(proj, "vo", os.environ.get("REELWRIGHT_LANG", ""), f"{lid}.mp3"), 1)[:, 0]
    if lid in FX.get("lines", {}): x = audio_fx.process_f32(x[:, None], SR, FX["lines"][lid], keep_length=False)[:, 0]   # keeps the reverb/echo tail
    i = int(round(v["at"] * SR)); j = min(N, i + len(x))
    if i < 0: x = x[-i:]; i = 0
    vo[i:j] += x[: j - i]

# ── music, ducked while the voice speaks (attack 0.15 s, release 0.5 s, holds through short pauses) ──
bed_path = os.path.join(proj, "music/bed.wav")
music = load(bed_path, 2)[:N] if os.path.exists(bed_path) else np.zeros((N, 2))
music = np.pad(music, ((0, N - len(music)), (0, 0)))
if FX.get("music"): music = audio_fx.process_f32(music, SR, FX["music"])
speaking = (mavg(np.abs(vo), int(0.05 * SR)) > 0.004).astype(float)
speaking = (mavg(speaking, int(0.6 * SR)) > 0.01).astype(float)       # bridge gaps < 0.6 s
env = mavg(speaking, int(0.3 * SR))
duck = 10 ** (P.get("music", {}).get("duck_db", -10) / 20)
music *= (1 - env * (1 - duck))[:, None]
if FX.get("vo"): vo = audio_fx.process_f32(vo[:, None], SR, FX["vo"])[:, 0]   # after the ducking envelope, which listens to the dry voice

# ── SFX library (all synthesised, no samples) ──
def lp(x, fc):  # one-pole low-pass with a moving cutoff
    a = np.exp(-2 * np.pi * np.asarray(fc) / SR) * np.ones(len(x)); y = np.zeros_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a[i]) * x[i] + a[i] * s; y[i] = s
    return y
def whoosh(d=0.45, up=True):
    n = int(d * SR); u = np.linspace(0, 1, n)
    fc = 300 + 5000 * (u if up else 1 - u) ** 2
    return lp(rng.standard_normal(n), fc) * (np.sin(np.pi * u) ** 1.5 if up else (1 - u) ** 2) * 0.9
def pop(f=880):
    tt = np.arange(int(0.12 * SR)) / SR
    return np.sin(2 * np.pi * (f + 500 * np.exp(-tt * 60)) * tt) * np.exp(-tt * 38) * 0.5
def tap():
    tt = np.arange(int(0.05 * SR)) / SR
    return (np.sin(2 * np.pi * 2200 * tt) * 0.25 + lp(rng.standard_normal(len(tt)), 4000) * 0.6) * np.exp(-tt * 140) * 0.6
def impact():
    tt = np.arange(int(0.9 * SR)) / SR
    return np.sin(2 * np.pi * np.cumsum(48 + 90 * np.exp(-tt * 18)) / SR) * np.exp(-tt * 5) * 0.9 + lp(rng.standard_normal(len(tt)), 2500) * np.exp(-tt * 30) * 0.6
def chime():
    tt = np.arange(int(1.4 * SR)) / SR
    return sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 3.2) for f in (1046.5, 1318.5, 1568.0)) * 0.16
def riser(d=1.5):
    n = int(d * SR); u = np.linspace(0, 1, n)
    return lp(rng.standard_normal(n), 200 + 7000 * u ** 2) * u ** 2 * 0.7
def click():
    tt = np.arange(int(0.03 * SR)) / SR
    return (lp(rng.standard_normal(len(tt)), 6000) * np.exp(-tt * 300) + np.sin(2 * np.pi * 1500 * tt) * np.exp(-tt * 200) * 0.3) * 0.7
def glitch():
    n = int(0.25 * SR); y = np.zeros(n)
    for k in range(6):
        a = int(rng.uniform(0, 0.2) * SR); L = int(rng.uniform(0.01, 0.04) * SR); tt = np.arange(L) / SR
        y[a:a + L] += np.sign(np.sin(2 * np.pi * rng.uniform(200, 2000) * tt)) * 0.25
    return y
# New kinds (replacements for recorded sample kits): each draws only from its own seeded stream (R), never the shared `rng`,
# so adding them cannot change any older kind's sound. Every one takes k = pitch ratio (used for burst variants).
def R(seed, n): return np.random.default_rng(seed).standard_normal(n)
def T(d): return np.arange(int(d * SR)) / SR
def ping(f, d, dec): tt = T(d); return np.sin(2 * np.pi * f * tt) * np.exp(-tt * dec)
def at(parts, d):  # sum (offset_s, signal) parts into one d-second buffer
    y = np.zeros(int(d * SR))
    for o, s in parts: i = int(o * SR); j = min(len(y), i + len(s)); y[i:j] += s[: j - i]
    return y
def swell(d, p, f0, f1, nz, seed, k):  # swept tone + low-passed noise; envelope (t/p)² up to its apex at p, then decays
    tt = T(d); f = (f0 + (f1 - f0) * tt / d) * k
    y = np.where(tt < p, (tt / p) ** 2, np.exp(-(tt - p) * 6 / (d - p))) * ((1 - nz) * np.sin(2 * np.pi * np.cumsum(f) / SR) + nz * lp(R(seed, len(tt)), 2 * f))
    return y / np.abs(y).max() * 0.9
def tick(k=1): tt = T(0.03); return (np.sin(2 * np.pi * 3200 * k * tt) * 0.6 + lp(R(21, len(tt)), 6000 * k) * 0.4) * np.exp(-tt * 250)
def typing(k=1): return at([(o, tick(k * r) * g) for o, r, g in ((0, 1, 1), (.07, .93, .7), (.15, 1.07, .75), (.2, .97, .65), (.29, 1.04, .7))], 0.35)
def paper(k=1): tt = T(0.45); n = R(22, len(tt)); return at([(0, (n - lp(n, 1500 * k)) * np.where(tt < .07, tt / .07, np.exp(-(tt - .07) * 7)) * 0.2), (.07, tick(.6 * k))], 0.45)
def scratch(k=1): tt = T(0.3); n = R(23, len(tt)); return at([(0, (n - lp(n, 2500 * k)) * np.exp(-tt * 6) * (0.5 + 0.5 * np.sin(2 * np.pi * 35 * tt)) * 0.25), (0, tick(.8 * k))], 0.3)
def shutter(k=1): return at([(0, tick(.5 * k)), (.05, tick(.4 * k) * 0.7)], 0.12)
def sparkle(k=1): return at([(o, ping(f * k, 0.6, 14) * g) for o, f, g in ((0, 2637, .3), (.06, 3136, .45), (.12, 3951, .7), (.18, 5274, .3))], 0.8)
def subdrop(k=1): tt = T(1.4); return np.sin(2 * np.pi * np.cumsum((36 + 40 * np.exp(-tt * 2.5)) * k) / SR) * np.minimum(1, tt / 0.03) * np.exp(-tt * 2.2) * 0.9
def toggle(k=1): return at([(0, ping(700 * k, .08, 90) * .6), (.06, ping(1100 * k, .1, 70))], 0.2)
def notification(k=1): return at([(0, ping(1318.5 * k, .6, 7) * .45), (.12, ping(1760 * k, 1.0, 6) * .7)], 1.1)
def bubble(k=1): tt = T(0.12); return np.sin(2 * np.pi * np.cumsum((350 + 1100 * np.minimum(1, tt / .06)) * k) / SR) * np.minimum(1, tt / .01) * np.exp(-tt * 30) * 0.7
def thud(k=1): tt = T(0.35); return (np.sin(2 * np.pi * np.cumsum(95 * k * (0.55 + 0.45 * np.exp(-tt * 25))) / SR) * 0.8 + lp(R(24, len(tt)), 400 * k) * 0.5) * np.exp(-tt * 16)
NEW = {"tick": tick, "typing": typing, "paper": paper, "scratch": scratch, "swish": lambda k=1: swell(.2, .08, 1500, 5000, .5, 34, k),
       "shutter": shutter, "sparkle": sparkle, "whooshsoft": lambda k=1: swell(.6, .25, 250, 900, .5, 31, k),
       "whooshfast": lambda k=1: swell(.3, .12, 400, 3500, .4, 32, k), "whooshdeep": lambda k=1: swell(.9, .4, 70, 320, .4, 33, k),
       "subdrop": subdrop, "toggle": toggle, "notification": notification, "bubble": bubble, "thud": thud}
LIB = {"click": click, "glitch": glitch, "whoosh": lambda: whoosh(), "whooshdown": lambda: whoosh(0.4, False), "pop": pop, "tap": tap,
       "impact": impact, "chime": chime, "riser": riser, **NEW}
# seconds from a sample's start to its peak (known by construction): the sample starts this early so the peak lands on the cue
PEAK = {k: 0 for k in LIB}
PEAK.update(whoosh=0.3, riser=1.45, paper=.07, sparkle=.12, subdrop=.03, toggle=.06, notification=.12, bubble=.01,
            swish=.08, whooshsoft=.25, whooshfast=.12, whooshdeep=.4)
if os.environ.get("REELWRIGHT_SFX_DUMP"):  # tools/selfcheck/sound.mjs: write every kind's raw samples + PEAK, then stop
    d = os.environ["REELWRIGHT_SFX_DUMP"]; json.dump(PEAK, open(os.path.join(d, "peak.json"), "w"))
    for k, fn in LIB.items(): np.save(os.path.join(d, k + ".npy"), fn())
    sys.exit()

# Placement: same-kind new cues within 0.5 s alternate pitch (0, +1, -1 semitone) and step down ×0.8 each; the music ducks −6 dB
# (30 ms down, 300 ms up) under each subdrop, and under impact/riser too when project.json music.duck_sfx is true (off by default
# so existing films keep their mix).
def duck_around(duck, a, b):
    r, u = int(.03 * SR), int(.3 * SR); w = np.concatenate([np.linspace(0, 1, r), np.ones(max(0, b - a)), np.linspace(1, 0, u)])
    s = a - r; lo = max(0, s); hi = min(N, s + len(w))
    if hi > lo: duck[lo:hi] = np.minimum(duck[lo:hi], 1 - w[lo - s:hi - s] * (1 - 10 ** (-6 / 20)))
kinds = [c["kind"] for c in TL.get("cues", [])]
for k in ("riser", "subdrop"):
    if kinds.count(k) > 1: print(f"WARN: {kinds.count(k)} {k} cues — one per film lands harder")
fx = np.zeros(N); duck = np.ones(N); last = {}
for c in TL.get("cues", []):
    kd = c["kind"]
    if kd not in LIB:
        print("unknown SFX kind", kd, "— known:", ", ".join(LIB)); continue
    g = c.get("gain", 1)
    if kd in NEW:
        t0, n = last.get(kd, (-9, 0)); n = n + 1 if abs(c["t"] - t0) < 0.5 else 0; last[kd] = (c["t"], n)
        s = LIB[kd](2 ** ([0, 1, -1][n % 3] / 12)); g *= 0.8 ** n
    else: s = LIB[kd]()
    a = int((c["t"] - PEAK[kd]) * SR)
    if kd == "subdrop" or (kd in ("impact", "riser") and P.get("music", {}).get("duck_sfx")): duck_around(duck, max(0, a), int((c["t"] + .2) * SR))
    if a < 0: s = s[-a:]; a = 0
    if c.get("fadeIn") or c.get("fadeOut"):   # per-cue fades, seconds (tools/mixfx.py)
        import mixfx; s = s * mixfx.fade(len(s), SR, 0.0, None, c.get("fadeIn", 0), c.get("fadeOut", 0))
    b = min(N, a + len(s)); fx[a:b] += s[: b - a] * g

music *= duck[:, None]
if FX.get("sfx"): fx = audio_fx.process_f32(fx[:, None], SR, FX["sfx"])[:, 0]
# project.json "automation": { "music" | "voice" | "sfx": { gain: [[t, dB], ...], cutoff: [[t, Hz], ...], fade_in, fade_out } }  (tools/mixfx.py; off by default)
A = P.get("automation") or {}
if A:
    import mixfx
    if A.get("music"): music = mixfx.automate(music, SR, A["music"])
    if A.get("voice"): vo = mixfx.automate(vo, SR, A["voice"])
    if A.get("sfx"): fx = mixfx.automate(fx, SR, A["sfx"])
out = music * 0.85 + ((vo * 1.3) + fx * 0.45)[:, None]
f = int(0.3 * SR); out[-f:] *= np.linspace(1, 0, f)[:, None]
out = np.tanh(out * 1.05) / np.tanh(1.05)               # soft-clip guard
tmp = os.path.join(proj, "mix.f32"); out.astype(np.float32).tofile(tmp)
lufs = P.get("loudness", -14)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", tmp,
                "-af", f"loudnorm=I={lufs}:TP=-1.5:LRA=11" + (("," + __import__("mixfx").limiter_filter(SR, **(P["limiter"] if isinstance(P["limiter"], dict) else {}))) if P.get("limiter") else ""), "-ar", str(SR), os.path.join(proj, "mix.wav")], check=True)
os.remove(tmp)
print(f"mix.wav: {DUR:.2f}s, {len(TL.get('VO') or {})} VO lines, {len(TL.get('cues', []))} SFX cues, {lufs} LUFS")
