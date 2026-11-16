# Audio FX rack (HyperFrames D1 + D2): 17 effects mapped to ffmpeg filters, 22 presets, 5 jobs, 5 one-knob profiles.
#   python3 tools/audio_fx.py --list
#   python3 tools/audio_fx.py in.wav out.wav --preset voice-clean | --job narration | --profile warmth=0.6
#                             | --chain '[{"fx":"highpass","freq":120}]' | --fx "highpass:freq=120,reverb:decay=1.5:mix=0.3"
#   python3 tools/audio_fx.py --print --preset hall        (show the ffmpeg filter graph, run nothing)
# From mix.py: `import audio_fx; y = audio_fx.process_f32(x, SR, spec)`; spec is a preset/job name, a chain list or a dict.
# Offline: ffmpeg only. A chain item is {"fx": name, ...params}; "type" is accepted for "fx", "bypass": true skips it.
# The output is `sr` Hz (48000) and, for reverb/delay, longer than the input by the effect's tail (trim it if not wanted).
import json, math, os, subprocess, sys

SR = 48000
lin = lambda db: 10 ** (db / 20)
# name → {param: default}. Units: freq Hz, gain/threshold/drive/ceiling dB, attack/release/time ms, decay s, mix 0..1.
EFFECTS = {
    "highpass": {"freq": 80, "q": 0.707}, "lowpass": {"freq": 12000, "q": 0.707},
    "peaking": {"freq": 1000, "gain": 0, "q": 1.0}, "lowshelf": {"freq": 200, "gain": 0}, "highshelf": {"freq": 6000, "gain": 0},
    "gain": {"db": 0},
    "compressor": {"threshold": -18, "ratio": 3, "attack": 10, "release": 120, "makeup": 0},
    "limiter": {"ceiling": -1, "release": 60}, "truepeak": {"ceiling": -1, "release": 60},
    "gate": {"threshold": -45, "ratio": 4, "attack": 5, "release": 120, "range": -60},
    "saturate": {"drive": 9, "trim": None},                      # trim: output gain dB (default -drive/2)
    "bitcrush": {"bits": 8, "samples": 1},                       # samples: hold each value N samples (sample-rate reduction)
    "delay": {"time": 300, "feedback": 0.4, "mix": 0.4, "taps": 4},
    "reverb": {"decay": 1.2, "mix": 0.3, "damping": 6000, "predelay": 0},
    "chorus": {"rate": 0.9, "depth": 0.4, "delay": 40, "mix": 0.5},
    "phaser": {"rate": 0.5, "depth": 1.0, "mix": 0.6},
    "pitchshift": {"semitones": 0},
}


def _p(item):
    name = item.get("fx") or item.get("type")
    if name not in EFFECTS: raise ValueError(f"unknown effect {name!r} - known: {', '.join(EFFECTS)}")
    bad = [k for k in item if k not in EFFECTS[name] and k not in ("fx", "type", "bypass")]
    if bad: raise ValueError(f"{name}: unknown parameter {', '.join(bad)} - known: {', '.join(EFFECTS[name])}")
    return name, {**EFFECTS[name], **{k: v for k, v in item.items() if k in EFFECTS[name]}}


def _q(f, w): return f"f={f}:width_type=q:w={w}"


def _simple(name, a, sr):
    """The ffmpeg filter(s) of every effect but reverb (which needs a second input, see _reverb)."""
    if name == "highpass": return [f"highpass={_q(a['freq'], a['q'])}"]
    if name == "lowpass": return [f"lowpass={_q(a['freq'], a['q'])}"]
    if name == "peaking": return [f"equalizer={_q(a['freq'], a['q'])}:g={a['gain']}"]
    if name == "lowshelf": return [f"bass=g={a['gain']}:f={a['freq']}:width_type=q:w=0.707"]
    if name == "highshelf": return [f"treble=g={a['gain']}:f={a['freq']}:width_type=q:w=0.707"]
    if name == "gain": return [f"volume={a['db']}dB"]
    if name == "compressor":
        return [f"acompressor=threshold={min(1, lin(a['threshold'])):.6f}:ratio={a['ratio']}:attack={a['attack']}:release={a['release']}"
                f":makeup={min(64, max(1, lin(a['makeup']))):.4f}"]
    if name in ("limiter", "truepeak"):
        f = f"alimiter=limit={min(1, max(0.0625, lin(a['ceiling']))):.5f}:attack=5:release={a['release']}:level=disabled"
        # true peak: limit the 4x oversampled signal, so inter-sample peaks stay under the ceiling too
        return [f"aresample={sr * 4}", f, f"aresample={sr}"] if name == "truepeak" else [f]
    if name == "gate":
        return [f"agate=threshold={lin(a['threshold']):.6f}:ratio={a['ratio']}:attack={a['attack']}:release={a['release']}"
                f":range={min(1, lin(a['range'])):.6f}"]
    if name == "saturate":
        trim = -a["drive"] / 2 if a["trim"] is None else a["trim"]
        return [f"volume={a['drive']}dB", "asoftclip=type=tanh", f"volume={trim}dB"]
    if name == "bitcrush":   # acrusher's own bit reduction does nothing in ffmpeg 9, so quantise with aeval; acrusher holds samples
        q = 2 ** (max(1, min(24, a["bits"])) - 1)
        return [f"aeval=exprs=floor(val(ch)*{q}+0.5)/{q}:c=same"] + ([f"acrusher=bits=64:samples={a['samples']}:aa=0:mix=1"] if a["samples"] > 1 else [])
    if name == "delay":
        n, t, fb, mix = int(a["taps"]), a["time"], a["feedback"], a["mix"]
        return ["aecho=in_gain=1:out_gain=1:delays=" + "|".join(str(round(t * (i + 1))) for i in range(n)) +
                ":decays=" + "|".join(f"{mix * fb ** i:.4f}" for i in range(n))]
    if name == "chorus":
        d = a["depth"]
        return [f"chorus=in_gain=0.7:out_gain={0.4 + 0.5 * a['mix']:.2f}:delays={a['delay']}:decays={0.3 + 0.5 * a['mix']:.2f}"
                f":speeds={a['rate']}:depths={2 + 3 * d:.2f}"]
    if name == "phaser": return [f"aphaser=in_gain=0.6:out_gain=0.8:delay=3:decay={0.2 + 0.6 * a['mix']:.2f}:speed={a['rate']}"]
    if name == "pitchshift":
        s = a["semitones"]
        if not -12 <= s <= 12: raise ValueError("pitchshift: semitones must be within +-12")
        r = 2 ** (s / 12)   # resample (pitch and speed change), then atempo restores the speed
        return [f"asetrate={sr * r:.3f}", f"aresample={sr}", f"atempo={1 / r:.6f}"] if s else []
    raise AssertionError(name)


def _reverb(a, sr, ch, i):
    """Convolution reverb: a synthetic impulse response (exponentially decaying noise, -60 dB at `decay`, low-passed by
    `damping`), a different noise per channel. Returns the filtergraph piece taking [n{i}] and giving [n{i+1}]."""
    rt = max(0.05, float(a["decay"]))
    g = math.sqrt(41.4 / (sr * rt))                # unit-energy IR, so `mix` is the wet level relative to the dry
    pd = a["predelay"] / 1000                     # pre-delay: the IR starts silent
    ex = "|".join(f"{g:.6f}*gte(t,{pd})*(random({c})*2-1)*exp(-6.9078*(t-{pd})/{rt})" for c in range(ch))
    lay = {1: "mono", 2: "stereo"}.get(ch, f"{ch}c")
    # afir returns only the convolved signal (dry=1 is the gain going IN; dry=0 silences it), so the dry path is added back
    # with amix. irnorm=-1 and gtype=-1 switch off afir's own IR normalising and auto gain (they add about +30 dB here).
    return (f"[n{i}]asplit[d{i}][w{i}];aevalsrc='{ex}':d={rt + pd:.3f}:s={sr}:c={lay},lowpass=f={a['damping']}[ir{i}];"
            f"[w{i}][ir{i}]afir=dry=1:wet={a['mix']}:irnorm=-1:gtype=-1[r{i}];"
            f"[d{i}][r{i}]amix=inputs=2:normalize=0[n{i + 1}]")


def tail_of(chain):
    t = 0.0
    for it in chain:
        if it.get("bypass"): continue
        n, a = _p(it)
        if n == "reverb": t += a["decay"] + a["predelay"] / 1000
        elif n == "delay": t += a["time"] * (a["taps"] + 0.5) / 1000
    return t


def graph(chain, sr=SR, ch=2):
    """-> (filter_complex string taking input 0, output label [out], tail seconds)"""
    chain = [it for it in resolve(chain) if not it.get("bypass")]
    tail = tail_of(chain)
    parts = [f"[0:a]aresample={sr}" + (f",apad=pad_dur={tail:.3f}" if tail else "") + "[n0]"]
    for i, it in enumerate(chain):
        n, a = _p(it)
        parts.append(_reverb(a, sr, ch, i) if n == "reverb" else f"[n{i}]{','.join(_simple(n, a, sr)) or 'anull'}[n{i + 1}]")
    parts.append(f"[n{len(chain)}]alimiter=limit=1:level=disabled[out]" if chain else "[n0]anull[out]")  # never past full scale
    return ";".join(parts), tail


# -- presets (D2): the chain of each, named by what it does to a voice or a mix --
def fx(name, **k): return {"fx": name, **k}
PRESETS = {
    "voice-clean": [fx("highpass", freq=80), fx("peaking", freq=250, gain=-2, q=1), fx("peaking", freq=3000, gain=2, q=1),
                    fx("compressor", threshold=-20, ratio=3, makeup=3), fx("limiter", ceiling=-1)],
    "voice-broadcast": [fx("highpass", freq=70), fx("lowshelf", freq=120, gain=3), fx("peaking", freq=3500, gain=3, q=1),
                        fx("highshelf", freq=10000, gain=2), fx("compressor", threshold=-22, ratio=4, makeup=5), fx("limiter", ceiling=-1)],
    "voice-warm": [fx("highpass", freq=60), fx("lowshelf", freq=200, gain=3), fx("peaking", freq=3200, gain=-1.5, q=1),
                   fx("lowpass", freq=11000), fx("compressor", threshold=-20, ratio=2.5, makeup=2)],
    "rumble-cut": [fx("highpass", freq=120, q=0.9)],
    "room-gate": [fx("gate", threshold=-40, ratio=6, release=200, range=-45)],
    "boom-tame": [fx("highpass", freq=70), fx("peaking", freq=200, gain=-5, q=1.2)],
    "harsh-tame": [fx("peaking", freq=3500, gain=-4, q=2), fx("peaking", freq=7000, gain=-3, q=2), fx("highshelf", freq=9000, gain=-2)],
    "telephone": [fx("highpass", freq=400), fx("lowpass", freq=3400), fx("peaking", freq=1500, gain=4, q=1), fx("saturate", drive=6)],
    "radio-am": [fx("highpass", freq=300), fx("lowpass", freq=5000), fx("compressor", threshold=-24, ratio=8, makeup=6), fx("saturate", drive=8)],
    "megaphone": [fx("highpass", freq=500), fx("lowpass", freq=4000), fx("peaking", freq=1500, gain=5, q=1), fx("saturate", drive=12)],
    "lofi-tape": [fx("highpass", freq=60), fx("lowpass", freq=9000), fx("saturate", drive=5), fx("chorus", rate=0.4, depth=0.3, mix=0.4)],
    "pa-system": [fx("highpass", freq=250), fx("lowpass", freq=5000), fx("delay", time=120, feedback=0.3, mix=0.35, taps=3),
                  fx("reverb", decay=1.4, mix=0.3, predelay=20)],
    "intercom": [fx("highpass", freq=600), fx("lowpass", freq=3000), fx("bitcrush", bits=8, samples=2), fx("saturate", drive=6)],
    "doofus-worble": [fx("chorus", rate=2.5, depth=0.9, mix=0.8), fx("pitchshift", semitones=-1.5), fx("phaser", rate=0.8, mix=0.7)],
    "chipmunk": [fx("pitchshift", semitones=7)],
    "giant": [fx("pitchshift", semitones=-5), fx("lowshelf", freq=150, gain=4), fx("reverb", decay=0.8, mix=0.2)],
    "monster": [fx("pitchshift", semitones=-8), fx("lowshelf", freq=140, gain=4), fx("bitcrush", bits=10), fx("saturate", drive=8)],
    "room-tight": [fx("reverb", decay=0.25, mix=0.12, damping=5000)],
    "room-natural": [fx("reverb", decay=0.6, mix=0.2)],
    "hall": [fx("reverb", decay=2.2, mix=0.3, predelay=25, damping=5000)],
    "slap-echo": [fx("delay", time=110, feedback=0.2, mix=0.5, taps=2)],
    "dub-throw": [fx("highpass", freq=200), fx("lowpass", freq=4000), fx("delay", time=375, feedback=0.55, mix=0.55, taps=5)],
}
# jobs: what a track is for -> the preset chain that does it (a job may stack presets)
JOBS = {
    "dialogue-cleanup": ["rumble-cut", "room-gate", "voice-clean"], "narration": ["voice-broadcast"],
    "music-bed": [[fx("highpass", freq=40), fx("peaking", freq=300, gain=-2, q=0.8), fx("peaking", freq=2500, gain=-3, q=0.8),
                   fx("compressor", threshold=-20, ratio=2, makeup=2)]],
    "sfx-punch": [[fx("highpass", freq=50), fx("peaking", freq=120, gain=3, q=1), fx("compressor", threshold=-16, ratio=4, attack=3, makeup=3),
                   fx("limiter", ceiling=-1)]],
    "master-safe": [[fx("truepeak", ceiling=-1.5)]],
}


# one-knob profiles: amount 0..1 -> a chain
def _warmth(x): return [fx("lowshelf", freq=200, gain=5 * x), fx("peaking", freq=3200, gain=-2 * x, q=1), fx("lowpass", freq=16000 - 8000 * x)]
def _clarity(x): return [fx("highpass", freq=60 + 40 * x), fx("peaking", freq=300, gain=-3 * x, q=1), fx("peaking", freq=3500, gain=4 * x, q=1)]
def _tighten(x): return [fx("compressor", threshold=-14 - 12 * x, ratio=1.5 + 4 * x, makeup=1 + 4 * x), fx("gate", threshold=-60 + 20 * x, range=-30 * x - 6)]
def _space(x): return [fx("reverb", decay=0.4 + 1.6 * x, mix=0.45 * x)]
def _grit(x): return [fx("saturate", drive=2 + 12 * x), fx("bitcrush", bits=16 - 8 * x)]
PROFILES = {"warmth": _warmth, "clarity": _clarity, "tighten": _tighten, "space": _space, "grit": _grit}


def _is_item(x): return isinstance(x, dict) and ("fx" in x or "type" in x)


def resolve(spec):
    """preset/job/profile name ('hall', 'narration', 'warmth=0.6'), a chain list, or {"chain":..}/{"preset":..} -> chain list"""
    if spec is None: return []
    if _is_item(spec): return [spec]
    if isinstance(spec, dict): return resolve(spec.get("preset") or spec.get("job")) + resolve(spec.get("chain"))
    if isinstance(spec, str):
        s = spec.strip()
        if s.startswith("["): return resolve(json.loads(s))
        if "=" in s and s.split("=")[0] in PROFILES:
            n, v = s.split("="); return PROFILES[n](min(1, max(0, float(v))))
        if s in PRESETS: return PRESETS[s]
        if s in JOBS: return [it for p in JOBS[s] for it in (PRESETS[p] if isinstance(p, str) else p)]
        raise ValueError(f"unknown preset/job {s!r} - see --list")
    return [it for x in spec for it in resolve(x)]


def parse_fx(s):
    """"highpass:freq=120,reverb:decay=1.5:mix=0.3" -> chain"""
    def num(v):
        try: return float(v)
        except ValueError: return v
    out = []
    for part in filter(None, s.split(",")):
        name, *kv = part.split(":")
        out.append({"fx": name, **{k: num(v) for k, v in (x.split("=") for x in kv)}})
    return out


def _channels(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    return int(r.stdout.strip() or 2)


def apply_file(src, dst, spec, sr=SR):
    g, tail = graph(spec, sr, _channels(src))
    # a .wav is forced as wav: ffmpeg's probe can take a pure-tone wav for mpegts
    subprocess.run(["ffmpeg", "-v", "error", "-y", *(["-f", "wav"] if src.lower().endswith(".wav") else []), "-i", src, "-filter_complex", g, "-map", "[out]", "-ar", str(sr), dst], check=True)
    return tail


def process_f32(x, sr, spec, keep_length=True):
    """x: float array (samples, channels) -> the same shape (keep_length) or with the effect tail appended"""
    import numpy as np
    chain = resolve(spec)
    if not chain: return x
    x = np.asarray(x, np.float32).reshape(len(x), -1); n, ch = x.shape
    g, tail = graph(chain, sr, ch)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(sr), "-ac", str(ch), "-i", "-", "-filter_complex", g,
                          "-map", "[out]", "-f", "f32le", "-ar", str(sr), "-ac", str(ch), "-"], input=x.tobytes(), capture_output=True, check=True).stdout
    y = np.frombuffer(raw, np.float32).reshape(-1, ch).astype(np.float64)
    m = n if keep_length else n + int(tail * sr)
    return np.pad(y, ((0, max(0, m - len(y))), (0, 0)))[:m]


def main(argv):
    import argparse
    ap = argparse.ArgumentParser(description="Audio FX rack: 17 effects, 22 presets (ffmpeg)")
    ap.add_argument("files", nargs="*"); ap.add_argument("--preset"); ap.add_argument("--job"); ap.add_argument("--profile")
    ap.add_argument("--chain"); ap.add_argument("--fx"); ap.add_argument("--list", action="store_true"); ap.add_argument("--print", action="store_true")
    ap.add_argument("--sr", type=int, default=SR)
    a = ap.parse_args(argv)
    if a.list:
        print("effects:"); [print(f"  {n}: " + ", ".join(f"{k}={v}" for k, v in d.items())) for n, d in EFFECTS.items()]
        print("presets:", ", ".join(PRESETS)); print("jobs:", ", ".join(JOBS)); print("profiles (name=0..1):", ", ".join(PROFILES)); return 0
    chain = []
    for spec in (a.preset, a.job, a.profile): chain += resolve(spec)
    if a.chain: chain += resolve(json.loads(a.chain))
    if a.fx: chain += parse_fx(a.fx)
    if not chain: print("give --preset, --job, --profile, --chain or --fx (--list shows them)"); return 1
    if a.print: print(graph(chain, a.sr)[0]); return 0
    if len(a.files) != 2: print("usage: audio_fx.py <in> <out> [--preset ...]"); return 1
    tail = apply_file(a.files[0], a.files[1], chain, a.sr)
    print(f"{a.files[1]}: {len(chain)} effects, tail {tail:.2f}s"); return 0


if __name__ == "__main__":
    try: sys.exit(main(sys.argv[1:]))
    except (ValueError, subprocess.CalledProcessError) as e: print(f"audio_fx: {e}"); sys.exit(1)
