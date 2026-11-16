// node tools/selfcheck/beat-sync.mjs — rows 2b.18 (tools/beatsync.py, tools/checks/cut-on-beat.py) and 2b.19 (tools/verify_av.py,
// tools/checks/verify-av.py). Offline: synthesises a 8 s drum loop (kick, snare, hat at known times, 120 BPM, first beat 0.5 s) with
// numpy, muxes it with a 30 fps picture whose hard cuts are at known frames (ffmpeg lavfi, H.264 + AAC), then checks:
//   beatsync   every class finds its hits (within 20 ms, >= 90% recall, <= 15% strays), the grid covers the audio, a shifted
//              grid is reported with its offset, cuts come back at the planned frames with the planned errors (0, +2, -3.5, 0 f)
//   verify-av  the AAC priming is measured (about 1024 samples with the edit list ignored, none with it honoured), a delayed
//              mux is reported with its delay, and a cue that lands late in an otherwise exact mix is found at that cue
//   plug-ins   both are silent unless project.json says "qa": {"<name>": true}
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const run = (cmd, args, opt = {}) => { const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, PYTHONUTF8: "1" }, ...opt }); assert.equal(r.status, 0, `${cmd} ${args.slice(0, 3).join(" ")} exited ${r.status}\n${r.stdout}\n${r.stderr}`); return r.stdout; };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reelwright-p10-audio-"));
const D = (f) => path.join(dir, f);

try {
  // ── media: ref.wav (the mix), late.wav (the same with everything after 6 s two frames late), the picture ──
  const gen = `
import json, sys, numpy as np, wave
SR, DUR, d = 48000, 8, sys.argv[1]
rng = np.random.default_rng(3); n = DUR * SR; t = np.arange(n) / SR
def put(y, at, s):
    i = int(round(at * SR)); s = s[:max(0, n - i)]; y[i:i + len(s)] += s
def band(x, lo, hi):
    f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(np.fft.rfft(x) * ((f >= lo) & (f < hi)), len(x))
def kick():
    u = np.arange(int(0.2 * SR)) / SR; return np.sin(2 * np.pi * np.cumsum(50 + 100 * np.exp(-u * 30)) / SR) * np.exp(-u * 18) * 0.9
def snare():
    u = np.arange(int(0.18 * SR)) / SR; x = rng.standard_normal(len(u))
    x = band(x, 300, 3000)                                                            # a snare: body tone + 0.3-3 kHz crack
    return (np.sin(2 * np.pi * 200 * u) * 0.6 + x * 3) * np.exp(-u * 30) * 0.8
def hat():
    u = np.arange(int(0.05 * SR)) / SR; x = band(rng.standard_normal(len(u)), 8000, 20000)
    return x * 2.5 * np.exp(-u * 90) * 0.5
y = np.zeros(n); truth = {"kick": [], "snare": [], "hat": []}
for k in range(7):
    b = 0.5 + k * 1.0
    put(y, b, kick()); truth["kick"].append(b)
    put(y, b + 0.5, snare()); truth["snare"].append(b + 0.5)
for j in range(15):
    put(y, 0.75 + 0.5 * j, hat()); truth["hat"].append(0.75 + 0.5 * j)
y = y / np.abs(y).max() * 0.8
def save(name, v):
    w = wave.open(d + "/" + name, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((v * 32767).astype("<i2").tobytes()); w.close()
save("ref.wav", y)
late = y.copy(); s = int(6 * SR); late[s + 2 * SR // 30:] = y[s:n - 2 * SR // 30]; late[s:s + 2 * SR // 30] = 0; save("late.wav", late)
json.dump(truth, open(d + "/truth.json", "w"))`;
  run(PY, ["-c", gen, dir]);
  const truth = JSON.parse(fs.readFileSync(D("truth.json"), "utf8"));
  // picture: grey levels change at frames 30, 62, 109, 150 of 240 (30 fps)
  const cuts = [30, 62, 109, 150], lens = [30, 32, 47, 41, 90], lv = [30, 220, 90, 200, 20];
  const filt = lens.map((n, i) => `color=c=0x${lv[i].toString(16).padStart(2, "0").repeat(3)}:s=160x90:r=30:d=${n / 30}[v${i}]`).join(";") + ";" + lens.map((_, i) => `[v${i}]`).join("") + `concat=n=${lens.length}:v=1[out]`;
  const mux = (audio, out, extra = []) => run("ffmpeg", ["-v", "error", "-y", "-filter_complex", filt, "-i", audio, "-map", "[out]", "-map", "0:a", ...extra, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", out]);
  mux(D("ref.wav"), D("ref.mp4")); mux(D("late.wav"), D("late.mp4"));
  run("ffmpeg", ["-v", "error", "-y", "-filter_complex", filt, "-itsoffset", "0.1", "-i", D("ref.wav"), "-map", "[out]", "-map", "0:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", D("delayed.mp4")]);

  // ── beatsync ──
  const bs = JSON.parse(run(PY, ["tools/beatsync.py", D("ref.mp4"), "--grid", "0.5,0.5", "--json"]));
  const py = (code) => JSON.parse(run(PY, ["-c", `import sys, json; sys.path.insert(0, "tools"); import beatsync\n${code}`]));
  const on = py(`print(json.dumps(beatsync.onset_classes(beatsync.decode(${JSON.stringify(D("ref.mp4"))}))))`);
  for (const cls of ["kick", "snare", "hat"]) {
    const t = truth[cls], d = on[cls];
    const hit = t.filter((x) => d.some((y) => Math.abs(y - x) < 0.02)).length, stray = d.filter((y) => !t.some((x) => Math.abs(y - x) < 0.02)).length;
    console.log(`  ${cls.padEnd(5)} ${hit}/${t.length} found, ${stray} stray of ${d.length}`);
    assert.ok(hit >= 0.9 * t.length, `${cls}: found ${hit}/${t.length}; truth ${t.slice(0, 4)} detected ${d.slice(0, 8)}`);
    assert.ok(stray <= 0.15 * d.length + 1, `${cls}: ${stray} strays of ${d.length}: ${d.filter((y) => !t.some((x) => Math.abs(y - x) < 0.02))}`);
  }
  assert.ok(bs.coverage.coverage > 0.9, "grid coverage " + bs.coverage.coverage);
  assert.ok(Math.abs(bs.coverage.offset_ms) < 15, "grid offset " + bs.coverage.offset_ms);
  const shifted = JSON.parse(run(PY, ["tools/beatsync.py", D("ref.mp4"), "--grid", "0.56,0.5", "--json"]));
  assert.ok(Math.abs(shifted.coverage.offset_ms + 60) < 15, "a grid 60 ms late: hits should sit about -60 ms from it, got " + shifted.coverage.offset_ms);
  const wrong = JSON.parse(run(PY, ["tools/beatsync.py", D("ref.mp4"), "--grid", "0.5,0.43", "--json"]));
  assert.ok(wrong.coverage.coverage < 0.4, "a wrong BPM must have low coverage, got " + wrong.coverage.coverage);
  const got = bs.cuts.map((c) => c.frames);
  console.log("  cut errors (f):", got.join(", "));
  assert.equal(got.length, 4, "want 4 cuts, found " + got.length);
  [0, 2, -3.5, 0].forEach((w, i) => assert.ok(Math.abs(got[i] - w) < 0.6, `cut ${i}: ${got[i]} f, planned ${w}`));
  assert.deepEqual(bs.late.map((c) => c.cut), [+(109 / 30).toFixed(3)], "only the cut 3.5 f off the grid is late");
  assert.ok(bs.cuts.every((c) => c.hit_frames !== null && Math.abs(c.hit_frames) < 8), "each cut sits near an audible hit");

  // ── verify-av ──
  const v = JSON.parse(run(PY, ["tools/verify_av.py", D("ref.mp4"), "--ref", D("ref.wav"), "--json"]));
  console.log(`  AAC: offset ${v.offset_ms} ms as played, ${v.raw_offset_ms} ms (${v.raw_offset_frames} f at 60 fps) with the edit list ignored; encoder delay ${v.container.initial_padding}`);
  assert.ok(Math.abs(v.offset_ms) < 3, "a muxed mp4 played with its edit list is on time, got " + v.offset_ms);
  assert.ok(v.raw_offset_ms > 15 && v.raw_offset_ms < 40, "AAC priming should read ~21 ms, got " + v.raw_offset_ms);
  assert.ok(Math.abs(v.raw_offset_frames - 1.28) < 0.4, "priming is about 1.28 f at 60 fps, got " + v.raw_offset_frames);
  const dl = JSON.parse(run(PY, ["tools/verify_av.py", D("delayed.mp4"), "--ref", D("ref.wav"), "--json"]));
  assert.ok(Math.abs(dl.offset_ms - 100) < 4, "a 100 ms delayed mux, measured " + dl.offset_ms);
  const lateRep = JSON.parse(run(PY, ["-c", `import sys, json; sys.path.insert(0, "tools"); import verify_av
cues = [{"t": t, "kind": "snare"} for t in ${JSON.stringify(truth.snare)}]
r = verify_av.verify(${JSON.stringify(D("late.mp4"))}, ${JSON.stringify(D("ref.wav"))}, cues, 60); r["lines"] = verify_av.lines(r); print(json.dumps(r))`]));
  assert.ok(Math.abs(lateRep.offset_frames) < 1, "the global offset of a mostly-exact mix is ~0, got " + lateRep.offset_frames);
  const flagged = lateRep.late.map((c) => c.t);
  assert.ok(flagged.length >= 1 && flagged.every((t) => t >= 6), "only cues from 6 s are late, got " + flagged);
  assert.ok(lateRep.late.every((c) => Math.abs(c.lag_frames - 4) < 1), "2 frames at 30 fps = 4 f at 60: " + JSON.stringify(lateRep.late));
  assert.ok(lateRep.lines.some((l) => /snare cue/.test(l)));

  // ── plug-ins are opt-in ──
  const proj = D("proj"); fs.mkdirSync(path.join(proj, "out"), { recursive: true });
  fs.copyFileSync(D("ref.mp4"), path.join(proj, "out", "film.mp4")); fs.copyFileSync(D("ref.wav"), path.join(proj, "mix.wav"));
  fs.writeFileSync(path.join(proj, "timeline.json"), JSON.stringify({ DUR: 8, cues: [] }));
  const plug = (P) => JSON.parse(run(PY, ["-c", `import sys, json, importlib.util
ctx = dict(proj=${JSON.stringify(proj)}, P=json.loads(${JSON.stringify(JSON.stringify(P))}), fps=30, mp4=${JSON.stringify(path.join(proj, "out", "film.mp4"))})
out = {}
for n in ("cut-on-beat", "verify-av"):
    s = importlib.util.spec_from_file_location("c_" + n.replace("-", "_"), "tools/checks/" + n + ".py"); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
    out[n] = [m.KIND, len(m.check(ctx))]
print(json.dumps(out))`]));
  const base = { out: "out/film.mp4", music: { bpm: 100 } };
  const off = plug(base); assert.deepEqual(off, { "cut-on-beat": ["warn", 0], "verify-av": ["warn", 0] }, "off by default");
  const on2 = plug({ ...base, qa: { "cut-on-beat": true, "verify-av": true } });
  assert.ok(on2["cut-on-beat"][1] > 0, "100 BPM grid on a 120 BPM loop must warn when opted in: " + JSON.stringify(on2));
  console.log("beat-sync self-check: beatsync (onset classes, grid coverage, cut error) and verify-av (priming, offset, per-cue lag) pass");
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
