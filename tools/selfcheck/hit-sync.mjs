// node tools/selfcheck/hit-sync.mjs — tools/hit-sync.js (KIT.hit / mark / until / dur) and KIT.shot.focus (tools/camera.js).
//   1. KIT.hit snaps to a synthetic onset list within tol (and only then), is a no-op without onsets or for a band with none;
//   2. marks round-trip through the CLI: a temp project's film/data.js VO → `reelwright marks` → marks.json, whose times
//      KIT.until counts down from and KIT.dur returns, with a missing name throwing a clear error;
//   3. the browser fixture tools/selfcheck/camera-time/hitsync.mjs through camera-time.mjs: focus is 0 at the focus plane and
//      maxblur away from it, the blur rides dollyZoomReal's camera state, and shuffled seeks are identical in pvk and HyperFrames.
// Offline. ffmpeg is not needed (no onsets are detected here: the list is synthetic).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const HIT = path.join(ROOT, "tools", "hit-sync.js");
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
// the module only reads window.KIT.MUSIC, so a bare KIT is enough to exercise it without a browser
const load = (music) => {
  const KIT = { MUSIC: music };
  vm.runInNewContext(fs.readFileSync(HIT, "utf8"), { window: { KIT } });
  return KIT;
};

// ── 1. onsets ──
{
  const on = { kick: [0.5, 1.0, 1.5, 2.0], snare: [] };
  const K = load({ onsets: on });
  assert.equal(K.hit(0.505), 0.5, "0.505 s is within 1/60 s of the 0.5 onset");
  assert.equal(K.hit(0.0), 0.0, "an onset 0.5 s away is not a snap");
  assert.equal(K.hit(0.53), 0.53, "0.53 s is outside the default 1/60 s tolerance");
  assert.equal(K.hit(0.53, { tol: 0.05 }), 0.5, "tol widens the window");
  assert.equal(K.hit(1.99, { band: "kick" }), 2.0, "the nearer of two onsets wins");
  assert.equal(K.hit(1.2, { band: "snare" }), 1.2, "a band with no onsets leaves t alone");
  assert.equal(K.hit(1.2, { band: "nope" }), 1.2, "an unknown band leaves t alone");
  assert.equal(K.hit(1.2), 1.2, "a film with no onsets (music-less) must not break");
  const none = load({});
  assert.equal(none.hit(1.234), 1.234, "no MUSIC.onsets at all: a no-op");
  assert.equal(K.hit(0.505), K.hit(0.505), "repeatable");
  console.log("  hit: snaps within tol, no-op outside it and without onsets");
}

// ── 2. marks: CLI round trip from a temp project's VO ──
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hit-sync-"));
try {
  const VO = { cta: { at: 0, start: 3, end: 6, text: "Try it free today", words: [
    { w: "Try", t: 3, d: 0.3 }, { w: "it", t: 3.4, d: 0.2 }, { w: "free", t: 3.7, d: 0.3 }, { w: "today", t: 4.2, d: 0.4 }] } };
  fs.mkdirSync(path.join(tmp, "film"));
  fs.writeFileSync(path.join(tmp, "project.json"), JSON.stringify({ title: "t", marks: { cta: "cta", free: { line: "cta", word: "free" } } }));
  fs.writeFileSync(path.join(tmp, "film", "data.js"), `window.PROJECT={"fps":30};\nwindow.VO=${JSON.stringify(VO)};\nwindow.MUSIC={};\n`);
  const r = spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "marks", tmp], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0, `reelwright marks exited ${r.status}\n${r.stdout}\n${r.stderr}`);
  const mk = JSON.parse(fs.readFileSync(path.join(tmp, "marks.json"), "utf8"));
  assert.deepEqual(mk.cta, { line: "cta", t: 3, dur: 3 }, "a line mark: the line's start, its length");
  assert.deepEqual(mk.free, { line: "cta", word: "free", nth: 1, t: 3.7, dur: 2.3 }, "a word mark: the word's start, to the line's end");
  const K = load({ marks: mk });
  assert.equal(K.mark("cta"), 3);
  assert.ok(near(K.until("cta", 1.5), 1.5), "until counts down: marks[name].t - t");
  assert.ok(near(K.until("free", 4), -0.3), "until goes negative once the mark has passed");
  assert.equal(K.dur("free"), 2.3, "dur is the marker's length");
  assert.throws(() => K.until("nope", 1), /no mark "nope".*reelwright marks/, "a missing name must throw a clear error");
  assert.throws(() => K.mark("nope"), /no mark "nope"/);
  console.log("  marks: CLI round trip, until counts down, a missing name throws");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

// ── 3. focus + shuffled-seek purity in both renderers (the camera-time harness runs the fixture) ──
const b = spawnSync(process.execPath, ["tools/selfcheck/camera-time.mjs", "hitsync"], { cwd: ROOT, encoding: "utf8" });
process.stdout.write(b.stdout); process.stderr.write(b.stderr);
assert.equal(b.status, 0, "the hitsync browser fixture failed");
assert.equal((b.stdout.match(/^PASS /gm) || []).length, 2, "want 2 PASS lines (pvk and hyperframes)");
console.log("hit-sync self-check: onsets, marks and focus pass");
