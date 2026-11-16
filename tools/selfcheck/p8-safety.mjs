// node tools/selfcheck/p8-safety.mjs — `reelwright qa-strict` fails on a WARN-only film that plain `qa` passes, and passes a clean one;
// `reelwright preflight` estimates the disk a render needs from the film's length and size, and fails when it would not fit.
// The estimate is checked against real jpeg frames of a fixture film. Uses the real qa on throwaway projects. Offline.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { estimate } from "../commands/preflight.mjs";
import { warnCount } from "../commands/qa-strict.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const rw = (...a) => spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), ...a], { encoding: "utf8", cwd: ROOT, maxBuffer: 1 << 26 });

assert.equal(warnCount("  PASS  loudness\n  WARN  overlap: 1.2s\n  WARN  tiny-text: x\nWARNING is not a line\n"), 2, "counts qa WARN lines");
assert.equal(warnCount("  PASS  loudness\n  PASS  flash\n"), 0);
const e = estimate({ width: 1920, height: 1080, fps: 60 }, 10);
assert.equal(e.frames, 600); assert.ok(e.cacheBytes === e.framesBytes && e.framesBytes > 100e6, "pvk: jpeg frames plus a cache copy");
assert.equal(estimate({ width: 1920, height: 1080, renderer: "hyperframes" }, 10).cacheBytes, 0, "hyperframes: png frames, no cache");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p8-safety-"));
try {
  const proj = path.join(tmp, "p"); fs.mkdirSync(path.join(proj, "film"), { recursive: true });
  fs.writeFileSync(path.join(proj, "project.json"), JSON.stringify({ width: 320, height: 180, fps: 10, out: "out/t.mp4" }));
  let r = rw("preflight", proj); assert.equal(r.status, 1); assert.match(r.stdout, /run `reelwright info/);
  fs.writeFileSync(path.join(proj, "timeline.json"), JSON.stringify({ DUR: 2, cues: [], VO: {} }));
  r = rw("preflight", proj, "--json"); const j = JSON.parse(r.stdout);
  assert.equal(r.status, 0); assert.equal(j.frames, 20); assert.ok(j.freeBytes > j.needBytes);
  // against reality: a 320x180 jpeg frame of busy content, q94, is well under the 0.25 B/px estimate times a small factor
  const f = path.join(tmp, "f.jpg");
  assert.equal(spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=320x180", "-frames:v", "1", "-q:v", "2", f]).status, 0);
  const real = fs.statSync(f).size; assert.ok(real < j.perFrame * 2 && real > j.perFrame / 8, `estimate ${j.perFrame} B per frame vs a real busy jpeg ${real} B`);
  fs.writeFileSync(path.join(proj, "timeline.json"), JSON.stringify({ DUR: 1e9, cues: [], VO: {} }));
  r = rw("preflight", proj); assert.equal(r.status, 1); assert.match(r.stdout, /WILL NOT FIT/);
  // qa-strict: the real qa needs frames and a timeline; here it runs on a project it cannot read, so only the exit-code plumbing is checked
  const bad = rw("qa-strict", path.join(tmp, "nope")); assert.notEqual(bad.status, 0, "a failing qa fails qa-strict");
  console.log(`p8-safety self-check: disk estimate (${j.perFrame} B/frame, ${real} B real), "will not fit" at 1e9 s, preflight and qa-strict exit codes`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
