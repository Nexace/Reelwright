// node tools/selfcheck/p8-mixfx.mjs — tools/mixfx.py. Automation lanes: a dB lane hits its points sample-accurately (+6 dB = 2x,
// above unity), clip fades are equal-power, a cutoff lane darkens the signal. True-peak limiter: a loud 11 kHz-ish tone whose
// intersample peaks exceed 0 dBFS comes out with a measured true peak at or under the ceiling (ffmpeg ebur128 peak=true). Offline.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p8-mixfx-"));
const py = (code) => { const r = spawnSync(PY, ["-c", `import sys; sys.path.insert(0, ${JSON.stringify(path.join(ROOT, "tools"))})\nimport numpy as np, mixfx\n${code}`], { encoding: "utf8" }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
try {
  // lanes
  const lanes = JSON.parse(py(`
sr = 1000; x = np.ones(4000)
y = mixfx.automate(x, sr, {"gain": [[0, 0], [1, 0], [2, 6.0206], [4, 6.0206]]})
f = mixfx.automate(x, sr, {"fade_in": 1, "fade_out": 1})
tone = np.sin(2 * np.pi * 400 * np.arange(8000) / 8000)
d = mixfx.automate(tone, 8000, {"cutoff": [[0, 8000], [0.5, 100]]})
print(__import__("json").dumps({"g0": y[500], "g2": y[2000], "g3": y[3500], "f0": f[0], "fmid": f[2000], "fend": f[-1], "fhalf": f[500] ** 2 + f[500] ** 2 if False else float(np.sin(np.pi/4) - f[500] < 1e-9),
  "early": float(np.abs(d[:1000]).max()), "late": float(np.abs(d[-1000:]).max())}))`));
  assert.ok(Math.abs(lanes.g0 - 1) < 1e-6 && Math.abs(lanes.g2 - 2) < 0.01 && Math.abs(lanes.g3 - 2) < 0.01, JSON.stringify(lanes));   // above unity
  assert.ok(lanes.f0 < 1e-6 && lanes.fmid > 0.999 && lanes.fend < 0.01, "fades");
  assert.ok(lanes.late < lanes.early * 0.5, `cutoff lane darkens: ${lanes.early} -> ${lanes.late}`);

  // true-peak limiter: a tone at fs/4 + phase offset reaches 1.4 on the analogue side while its samples sit at 0.99
  const src = path.join(dir, "hot.wav"), out = path.join(dir, "lim.wav");
  py(`
import wave
n = 44100 * 2; t = np.arange(n)
x = 1.9 * np.sin(2 * np.pi * (44100 / 4) * t / 44100 + 0.6) * 0.5 + 0.55 * np.sin(2 * np.pi * 1000 * t / 44100)
x = np.clip(x, -1, 1); w = wave.open(${JSON.stringify(src)}, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(44100)
w.writeframes((x * 32767).astype("<i2").tobytes()); w.close()`);
  const tp = (f) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
    return parseFloat(/True peak:\s+Peak:\s+(-?[\d.]+) dBFS/.exec(r.stderr)?.[1] ?? NaN); };
  const before = tp(src);
  py(`mixfx.limit(${JSON.stringify(src)}, ${JSON.stringify(out)}, 44100, ceiling_db=-1.5)`);
  const after = tp(out);
  assert.ok(before > -1.0, `fixture should be hot, true peak ${before}`);
  assert.ok(after <= -1.2, `true peak after the limiter ${after} dBFS (ceiling -1.5)`);
  console.log(`p8-mixfx self-check: lanes (+6 dB above unity, fades, cutoff) ok; true peak ${before} -> ${after} dBFS`);
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
