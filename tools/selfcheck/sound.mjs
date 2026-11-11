// node tools/selfcheck/sound.mjs — builds a throwaway project (12 s, no VO, a cue of every SFX kind plus a same-kind burst)
// and checks: music.py builds chill/drive/house/hiphop beds of the film's length, deterministically; mix.py knows every kind;
// each new kind's loudest sample sits on its PEAK table entry (±10 ms) and no kind is silent or clips.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const run = (args, env = {}) => spawnSync(PY, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, PYTHONUTF8: "1", ...env } });
const ok = (r, what) => { assert.equal(r.status, 0, `${what} exited ${r.status}\n${r.stdout}\n${r.stderr}`); return r.stdout; };

const OLD = ["click", "glitch", "whoosh", "whooshdown", "pop", "tap", "impact", "chime", "riser"];
const NEW = ["tick", "typing", "paper", "scratch", "swish", "shutter", "sparkle", "whooshsoft", "whooshfast", "whooshdeep", "subdrop", "toggle", "notification", "bubble", "thud"];
const DUR = 13, SR = 48000;
const cues = [...OLD, ...NEW].map((kind, i) => ({ t: 1.6 + i * 0.42, kind, gain: 1 }));
cues.push(...[0, 1, 2, 3].map(i => ({ t: 11.4 + i * 0.12, kind: "tick", gain: 1 })), { t: 11.9, kind: "subdrop", gain: 1 });

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reelwright-sound-"));
try {
  fs.writeFileSync(path.join(dir, "timeline.json"), JSON.stringify({ DUR, FPS: 30, cues, VO: {} }));
  const bed = path.join(dir, "music", "bed.wav");
  const frames = f => { // data-chunk bytes / block align, straight from the RIFF header
    const b = fs.readFileSync(f); let p = 12, align = 0;
    while (p + 8 <= b.length) {
      const id = b.toString("ascii", p, p + 4), n = b.readUInt32LE(p + 4);
      if (id === "fmt ") align = b.readUInt16LE(p + 20);
      if (id === "data") return Math.min(n, b.length - p - 8) / align;
      p += 8 + n + (n & 1);
    }
    throw new Error("no data chunk in " + f);
  };
  for (const style of ["chill", "drive", "house", "hiphop"]) {
    fs.writeFileSync(path.join(dir, "project.json"), JSON.stringify({ music: { style, drop_bar: 1 } }));
    ok(run(["tools/music.py", dir]), `music.py ${style}`);
    assert.ok(Math.abs(frames(bed) - DUR * SR) <= 1, `${style}: bed is ${frames(bed)} frames, want ${DUR * SR}`);
    const first = fs.readFileSync(bed);
    ok(run(["tools/music.py", dir]), `music.py ${style} (again)`);
    assert.ok(first.equals(fs.readFileSync(bed)), `${style}: music.py is not deterministic`);
  }
  const out = ok(run(["tools/mix.py", dir]), "mix.py");
  assert.ok(!/unknown SFX kind/.test(out), out);
  assert.ok(frames(path.join(dir, "mix.wav")) > 0);

  const dump = path.join(dir, "dump"); fs.mkdirSync(dump);
  ok(run(["tools/mix.py", dir], { REELWRIGHT_SFX_DUMP: dump }), "mix.py (dump)");
  const py = `
import json, sys, numpy as np
d, new = sys.argv[1], sys.argv[2].split(",")
pk = json.load(open(d + "/peak.json"))
for k in pk:
    x = np.abs(np.load(f"{d}/{k}.npy")); m = x.max()
    assert m > 0.05, f"{k} is silent"
    if k in new:
        assert m <= 1, f"{k} clips ({m:.2f})"
        assert abs(x.argmax() / 48000 - pk[k]) <= 0.01, f"{k}: loudest sample at {x.argmax() / 48000:.3f}s, PEAK says {pk[k]}"
print(len(pk), "kinds ok")`;
  console.log(ok(run(["-c", py, dump, NEW.join(",")]), "peak check").trim());

  // two risers/subdrops warn but do not fail
  const tl = JSON.parse(fs.readFileSync(path.join(dir, "timeline.json"), "utf8"));
  tl.cues = [{ t: 3, kind: "subdrop" }, { t: 6, kind: "subdrop" }, { t: 4, kind: "riser" }, { t: 8, kind: "riser" }];
  fs.writeFileSync(path.join(dir, "timeline.json"), JSON.stringify(tl));
  const w = ok(run(["tools/mix.py", dir]), "mix.py (warn)");
  assert.ok(/WARN: 2 riser/.test(w) && /WARN: 2 subdrop/.test(w), w);
  console.log("sound selfcheck OK: 4 beds deterministic, " + (OLD.length + NEW.length) + " SFX kinds known, " + NEW.length + " new peaks within 10 ms");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
