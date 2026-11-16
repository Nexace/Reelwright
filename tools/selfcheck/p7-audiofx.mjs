// node tools/selfcheck/p7-audiofx.mjs — HyperFrames D1 + D2: each of the 16 audio effects of tools/audio_fx.py changes
// synthesized audio the way its name says (measured: level, band energy, distinct values, echo/tail energy, pitch), the 22
// presets / 5 jobs / 5 profiles all run, and process_f32 (the hook mix.py uses) keeps length and shape. Offline: ffmpeg + python3.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const SR = 48000, tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p7-fx-"));
const sh = (bin, a, o = {}) => { const r = spawnSync(bin, a, { encoding: "buffer", maxBuffer: 1 << 28, ...o });
  if (r.status !== 0) throw new Error(`${bin} ${a.join(" ").slice(0, 160)}\n${r.stderr}${r.stdout}`); return r.stdout; };
let n = 0;
const synth = (src, ch = 1) => { const f = path.join(tmp, `in${n++}.wav`); sh("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", src, "-ac", String(ch), "-ar", String(SR), f]); return f; };
const decode = (f, ch = 1) => { const b = sh("ffmpeg", ["-v", "error", "-f", "wav", "-i", f, "-f", "f32le", "-ac", String(ch), "-ar", String(SR), "-"]);
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); };
const fx = (src, ...a) => { const o = path.join(tmp, `out${n++}.wav`); sh(PY, [path.join(ROOT, "tools/audio_fx.py"), src, o, ...a]); return o; };
const cut = (x, a, b) => x.subarray(Math.round(a * SR), Math.min(x.length, Math.round(b * SR)));
const rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / Math.max(1, x.length));
const db = (v) => 20 * Math.log10(Math.max(v, 1e-9));
const peak = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const gz = (x, f) => { const w = 2 * Math.PI * f / SR, c = 2 * Math.cos(w); let a = 0, b = 0;   // Goertzel magnitude (amplitude of a sine at f)
  for (let i = 0; i < x.length; i++) { const t = x[i] + c * a - b; b = a; a = t; }
  return Math.sqrt(a * a + b * b - c * a * b) * 2 / x.length; };
const bandDb = (x, f) => db(gz(x, f));
const sine = (f, a = 0.1, d = 1) => synth(`sine=f=${f}:d=${d}:r=${SR},volume=${a * 8}`)   // lavfi sine peaks at 1/8;
// level change in dB of a sine at f through `args`
const change = (f, ...args) => { const i = sine(f); return db(rms(cut(decode(fx(i, ...args)), 0.2, 0.9))) - db(rms(cut(decode(i), 0.2, 0.9))); };
const near = (v, want, tol, what) => assert.ok(Math.abs(v - want) <= tol, `${what}: ${v.toFixed(2)} dB, wanted ${want} ±${tol}`);

// 1 highpass / 2 lowpass
assert.ok(change(100, "--fx", "highpass:freq=1000") < -20, "highpass cuts 100 Hz");
near(change(4000, "--fx", "highpass:freq=1000"), 0, 1, "highpass passes 4 kHz");
assert.ok(change(8000, "--fx", "lowpass:freq=1000") < -20, "lowpass cuts 8 kHz");
near(change(200, "--fx", "lowpass:freq=1000"), 0, 1, "lowpass passes 200 Hz");
// 3 peaking / 4 lowshelf / 5 highshelf
near(change(1000, "--fx", "peaking:freq=1000:gain=12:q=1"), 12, 1.5, "peaking +12 at its centre");
near(change(100, "--fx", "peaking:freq=1000:gain=12:q=4"), 0, 1, "peaking leaves 100 Hz");
near(change(50, "--fx", "lowshelf:freq=200:gain=10"), 10, 1.5, "lowshelf +10 on 50 Hz");
near(change(4000, "--fx", "lowshelf:freq=200:gain=10"), 0, 1, "lowshelf leaves 4 kHz");
near(change(10000, "--fx", "highshelf:freq=4000:gain=10"), 10, 1.5, "highshelf +10 on 10 kHz");
near(change(100, "--fx", "highshelf:freq=4000:gain=10"), 0, 1, "highshelf leaves 100 Hz");
// 6 gain
near(change(1000, "--fx", "gain:db=6"), 6, 0.3, "gain +6");
near(change(1000, "--fx", "gain:db=-12"), -12, 0.3, "gain -12");
// 7 compressor: a 0.5 then 0.05 sine (20 dB apart) end up closer together
{ const i = synth(`sine=f=500:d=2:r=${SR},volume='if(lt(t,1),4,0.4)':eval=frame`);
  const gap = (f) => { const x = decode(f); return db(rms(cut(x, 0.3, 0.9))) - db(rms(cut(x, 1.3, 1.9))); };
  const g0 = gap(i), g1 = gap(fx(i, "--fx", "compressor:threshold=-30:ratio=8:attack=5:release=50"));
  near(g0, 20, 0.5, "compressor test input gap"); assert.ok(g1 < g0 - 8, `compressor squeezes the level gap: ${g0.toFixed(1)} → ${g1.toFixed(1)} dB`); }
// 8 limiter / 9 truepeak: a full-scale-ish 0.95 sine held under the ceiling (−6 dB = 0.501)
for (const e of ["limiter", "truepeak"]) {
  const i = sine(1000, 0.95), x = decode(fx(i, "--fx", `${e}:ceiling=-6`));
  assert.ok(peak(cut(x, 0.3, 0.95)) < 0.53, `${e}: peak ${peak(cut(x, 0.3, 0.95)).toFixed(3)} stays near the −6 dB ceiling (0.501)`);
  assert.ok(peak(decode(i)) > 0.9, `${e} test input is loud`); }
assert.match(spawnSync(PY, [path.join(ROOT, "tools/audio_fx.py"), "--print", "--fx", "truepeak"], { encoding: "utf8" }).stdout, /aresample=192000/, "truepeak oversamples 4×");
// 10 gate: quiet noise (−50 dB) between loud tone bursts is cut, the tone passes
{ const i = synth(`sine=f=800:d=2:r=${SR},volume='if(lt(t,1),0.024,4)':eval=frame`);   // noise-like hiss stand-in at −50 dB, then −6 dB
  const x = decode(fx(i, "--fx", "gate:threshold=-35:ratio=10:attack=2:release=50:range=-60"));
  assert.ok(db(rms(cut(x, 0.3, 0.9))) < db(rms(cut(decode(i), 0.3, 0.9))) - 15, "gate closes on the quiet part");
  near(db(rms(cut(x, 1.3, 1.9))) - db(rms(cut(decode(i), 1.3, 1.9))), 0, 1.5, "gate passes the loud part"); }
// 11 saturate: a pure 1 kHz sine gains a 3 kHz harmonic
{ const i = sine(1000, 0.5), x0 = cut(decode(i), 0.2, 0.9), x = cut(decode(fx(i, "--fx", "saturate:drive=12")), 0.2, 0.9);
  assert.ok(bandDb(x0, 3000) < -80, "clean sine has no 3rd harmonic");
  assert.ok(bandDb(x, 3000) - bandDb(x, 1000) > -25, `saturate adds a 3rd harmonic: ${(bandDb(x, 3000) - bandDb(x, 1000)).toFixed(1)} dB under the fundamental`); }
// 12 bitcrush: the sample values snap to a grid of step 2^-(bits-1) (a clean sine has thousands of values; bits=4 → ≤ 17, bits=3 fewer)
{ const i = sine(997.3, 0.5), vals = (x) => new Set(Array.from(cut(x, 0.2, 0.9), (v) => v.toFixed(3))).size;
  const v4 = vals(decode(fx(i, "--fx", "bitcrush:bits=4"))), v3 = vals(decode(fx(i, "--fx", "bitcrush:bits=3")));
  assert.ok(vals(decode(i)) > 500 && v4 <= 17 && v3 < v4 && v3 > 3, `bitcrush: ${vals(decode(i))} values → bits=4 (≤ 17): ${v4}, bits=3: ${v3}`); }
// 13 delay: a 20 ms burst at 0.1 s echoes at 0.4 s (300 ms), not at 0.25 s
{ const i = synth(`anoisesrc=d=1:c=white:r=${SR}:a=0.5,volume='if(between(t,0.1,0.12),1,0)':eval=frame`);
  const x = decode(fx(i, "--fx", "delay:time=300:feedback=0.5:mix=0.6:taps=3"));
  const e = (a) => db(rms(cut(x, a, a + 0.02)));
  assert.ok(e(0.4) > e(0.25) + 25, `delay: echo at +300 ms (${e(0.4).toFixed(0)} dB) over the gap (${e(0.25).toFixed(0)} dB)`);
  assert.ok(e(0.7) > e(0.55) + 20 && e(0.7) < e(0.4), "second echo is lower than the first, still there"); }
// 14 reverb: a burst gets a tail that decays; `decay` sets its length; the output is longer than the input (tail kept)
{ const burst = synth(`anoisesrc=d=1:c=white:r=${SR}:a=0.5,volume='if(between(t,0.1,0.12),1,0)':eval=frame`);
  const dry = decode(burst), wet = decode(fx(burst, "--fx", "reverb:decay=1.0:mix=0.5"));
  assert.ok(db(rms(cut(dry, 0.3, 0.5))) < -80 && db(rms(cut(wet, 0.3, 0.5))) > -45, "reverb: tail where the dry signal is silent");
  assert.ok(db(rms(cut(wet, 0.2, 0.3))) > db(rms(cut(wet, 0.9, 1.0))) + 15, "reverb: the tail decays");
  assert.ok(wet.length > dry.length + 0.9 * SR, "reverb: the tail is kept past the input's end");
  const short = decode(fx(burst, "--fx", "reverb:decay=0.25:mix=0.5"));
  assert.ok(db(rms(cut(short, 0.6, 0.8))) < db(rms(cut(wet, 0.6, 0.8))) - 20, "shorter decay → quieter late tail");
  const st = synth(`sine=f=300:d=0.5:r=${SR}`, 2), o = fx(st, "--fx", "reverb:decay=0.5:mix=0.3");   // stereo in → stereo out
  assert.equal(sh("ffprobe", ["-v", "error", "-show_entries", "stream=channels", "-of", "csv=p=0", o]).toString().trim(), "2"); }
// 15 chorus: a pure sine's level starts to wobble (modulated delay beats against the dry signal)
{ const i = sine(1000, 0.5, 2), env = (x) => { const v = []; for (let a = 0.5; a < 1.9; a += 0.01) v.push(rms(cut(x, a, a + 0.01))); return v; };
  const sd = (v) => { const m = v.reduce((a, b) => a + b) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) / m; };
  const s0 = sd(env(decode(i))), s1 = sd(env(decode(fx(i, "--fx", "chorus:rate=1.5:depth=1:mix=1"))));
  assert.ok(s0 < 0.01 && s1 > 0.05, `chorus modulates the level: ${s0.toFixed(3)} → ${s1.toFixed(3)}`); }
// 16 phaser: a sine's level wobbles as the swept all-pass phase beats against the dry signal (a flat filter would not)
{ const i = sine(1000, 0.1, 4), env = (x) => { const v = []; for (let a = 0.3; a < 3.8; a += 0.05) v.push(rms(cut(x, a, a + 0.05))); return v; };
  const sd = (v) => { const m = v.reduce((a, b) => a + b) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) / m; };
  const s0 = sd(env(decode(i))), s1 = sd(env(decode(fx(i, "--fx", "phaser:rate=0.7:mix=1"))));
  assert.ok(s0 < 0.01 && s1 > 0.05, `phaser modulates the level: ${s0.toFixed(3)} → ${s1.toFixed(3)}`); }
// 17 pitchshift: 440 Hz +12 → 880 Hz, −12 → 220 Hz, same duration
{ const i = sine(440, 0.5, 1);
  for (const [s, f] of [[12, 880], [-12, 220], [7, 440 * 2 ** (7 / 12)]]) {
    const x = cut(decode(fx(i, "--fx", `pitchshift:semitones=${s}`)), 0.2, 0.8);
    const best = [220, 330, 440, 659.26, 880].map((c) => [bandDb(x, c), c]).sort((a, b) => b[0] - a[0])[0][1];
    assert.ok(Math.abs(best - f) < 1, `pitchshift ${s}: strongest of the candidates is ${best}, wanted ${f.toFixed(0)}`); }
  const len = decode(fx(i, "--fx", "pitchshift:semitones=5")).length;
  assert.ok(Math.abs(len - SR) < 0.03 * SR, `pitchshift keeps the duration (${len} samples)`); }

// presets (D2): 22 of them, every one runs on pink noise and gives finite, audible, non-clipping output; a few are measured
const lst = spawnSync(PY, ["-c", `import sys,json;sys.path.insert(0,${JSON.stringify(path.join(ROOT, "tools"))});import audio_fx as a;print(json.dumps({"p":list(a.PRESETS),"j":list(a.JOBS),"f":list(a.PROFILES),"e":list(a.EFFECTS)}))`], { encoding: "utf8" });
const L = JSON.parse(lst.stdout);
assert.equal(L.e.length, 17, "every effect the row names (it says 16 but lists 17)"); assert.equal(L.p.length, 22, "22 presets"); assert.equal(L.j.length, 5, "5 jobs"); assert.equal(L.f.length, 5, "5 profiles");
for (const w of ("voice-clean voice-broadcast voice-warm rumble-cut room-gate boom-tame harsh-tame telephone radio-am megaphone lofi-tape pa-system intercom doofus-worble chipmunk giant monster room-tight room-natural hall slap-echo dub-throw").split(" "))
  assert.ok(L.p.includes(w), `preset ${w}`);
const pink = synth(`anoisesrc=d=1.5:c=pink:r=${SR}:a=0.3`, 2);
const runs = [...L.p.map((p) => ["--preset", p]), ...L.j.map((j) => ["--job", j]), ...L.f.map((f) => ["--profile", `${f}=0.7`])];
const out = {};
for (const a of runs) { const x = decode(fx(pink, ...a)); out[a[1]] = x;
  assert.ok(x.every(Number.isFinite) && rms(x) > 0.005 && peak(x) <= 1.0001, `${a.join(" ")} audible and under full scale`); }
const tone = (f) => synth(`sine=f=${f}:d=1:r=${SR},volume=2`);
const lvl = (f, preset) => db(rms(cut(decode(fx(tone(f), "--preset", preset)), 0.2, 0.9)));
assert.ok(lvl(1000, "telephone") - lvl(100, "telephone") > 15 && lvl(1000, "telephone") - lvl(8000, "telephone") > 15, "telephone is band-limited");
assert.ok(lvl(1000, "rumble-cut") - lvl(40, "rumble-cut") > 15, "rumble-cut removes 40 Hz");
{ const i = tone(200), a = db(rms(cut(decode(i), 0.2, 0.9))); assert.ok(lvl(200, "boom-tame") < a - 3, "boom-tame lowers 200 Hz"); }
{ const x = cut(decode(fx(tone(440), "--preset", "chipmunk")), 0.2, 0.8); assert.ok(bandDb(x, 659.26) > bandDb(x, 440) + 20, "chipmunk is +7 semitones"); }
{ const burst = synth(`anoisesrc=d=0.5:c=white:r=${SR}:a=0.5,volume='if(between(t,0.1,0.12),1,0)':eval=frame`);
  const tail = (p) => db(rms(cut(decode(fx(burst, "--preset", p)), 0.7, 1.2)));
  assert.ok(tail("hall") > tail("room-tight") + 20, "hall rings longer than room-tight"); }
// one-knob profile: more amount → more effect (space = more reverb tail)
{ const burst = synth(`anoisesrc=d=0.5:c=white:r=${SR}:a=0.5,volume='if(between(t,0.1,0.12),1,0)':eval=frame`);
  const t = (v) => db(rms(cut(decode(fx(burst, "--profile", `space=${v}`)), 0.3, 0.6)));
  assert.ok(t(0.9) > t(0.3) + 6, "profile space=0.9 has a bigger tail than 0.3"); }
// errors are clear
assert.match(spawnSync(PY, [path.join(ROOT, "tools/audio_fx.py"), "--print", "--fx", "flange"], { encoding: "utf8" }).stdout, /unknown effect/);
assert.match(spawnSync(PY, [path.join(ROOT, "tools/audio_fx.py"), "--print", "--fx", "gain:dbb=3"], { encoding: "utf8" }).stdout, /unknown parameter/);

// the hook mix.py uses: process_f32 keeps shape and length, applies the chain
{ const r = spawnSync(PY, ["-c", `import sys;sys.path.insert(0,${JSON.stringify(path.join(ROOT, "tools"))});import numpy as np, audio_fx
t=np.arange(48000)/48000; x=np.stack([np.sin(2*np.pi*40*t)*.5]*2,1)
y=audio_fx.process_f32(x,48000,"rumble-cut"); z=audio_fx.process_f32(x,48000,"hall"); w=audio_fx.process_f32(x,48000,"hall",keep_length=False)
assert y.shape==x.shape and z.shape==x.shape and w.shape[0]>x.shape[0]+90000, (y.shape,z.shape,w.shape)
assert np.sqrt((y[8000:]**2).mean()) < 0.25*np.sqrt((x[8000:]**2).mean()), 'rumble-cut should remove 40 Hz'
print('ok')`], { encoding: "utf8" });
  assert.equal(r.stdout.trim(), "ok", r.stdout + r.stderr); }

// project.json "fx" through tools/mix.py: the real file once it has the hook, else a temp copy with p7-mix-fx.patch applied.
// A voice line with fx.lines.a = "hall" rings on after the line ends; without fx the mix is silent there.
{ const td = path.join(tmp, "mix"); fs.mkdirSync(path.join(td, "tools"), { recursive: true });
  for (const f of ["mix.py", "audio_fx.py"]) fs.copyFileSync(path.join(ROOT, "tools", f), path.join(td, "tools", f));
  const mixPy = path.join(td, "tools", "mix.py");
  if (!fs.readFileSync(mixPy, "utf8").includes("audio_fx")) {
    sh("git", ["apply", "-p1", path.join(ROOT, "tools/selfcheck/p7-mix-fx.patch")], { cwd: td });   // no repo needed
  }
  const proj = (name, P) => { const d = path.join(td, name); fs.mkdirSync(path.join(d, "vo"), { recursive: true });
    sh("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `anoisesrc=d=1:c=pink:r=${SR}:a=0.3`, path.join(d, "vo/a.mp3")]);
    fs.writeFileSync(path.join(d, "timeline.json"), JSON.stringify({ DUR: 4, VO: { a: { at: 0.5 } }, cues: [] }));
    fs.writeFileSync(path.join(d, "project.json"), JSON.stringify({ loudness: -14, ...P }));
    sh(PY, [mixPy, d]); return decode(path.join(d, "mix.wav")); };
  const plain = proj("plain", {}), hall = proj("hall", { fx: { lines: { a: "hall" }, vo: "voice-clean" } });
  assert.ok(db(rms(cut(plain, 1.7, 2.1))) < -80, "no fx: silence after the line");
  assert.ok(db(rms(cut(hall, 1.7, 2.1))) > -50 && db(rms(cut(hall, 1.7, 2.1))) > db(rms(cut(hall, 2.5, 2.9))) + 6, "fx.lines hall: a tail that decays"); }

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`p7-audiofx self-check: 17 effects measured (all those D1 names), ${L.p.length} presets + ${L.j.length} jobs + ${L.f.length} profiles run, process_f32 keeps shape`);
