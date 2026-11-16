// node tools/selfcheck/p7-video.mjs — HyperFrames G9: `measure` (probe, cuts, frames), `diff` (SSIM per frame, missed/extra
// cuts, audio offset, exit 1 under the bar) and `reverse` (shot list + stills) on videos synthesized with ffmpeg. Offline.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { probe, cuts, frames, ssim, matchCuts, audioOffset } from "../videotools.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p7-video-"));
const ffm = (a) => { const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...a], { encoding: "utf8" }); assert.equal(r.status, 0, r.stderr); };
const cli = (...a) => spawnSync(process.execPath, [path.join(ROOT, "bin/reelwright.mjs"), ...a], { encoding: "utf8", cwd: ROOT });
const COLORS = { red: "0xff0000", green: "0x00ff00", blue: "0x0000ff", white: "0xffffff", yellow: "0xffff00" };
const PULSES = (shift = 0) => `aevalsrc='sin(2*PI*440*t)*(between(t,${0.3 + shift},${0.5 + shift})+between(t,${1.1 + shift},${1.5 + shift})+between(t,${2.2 + shift},${2.3 + shift}))':s=8000:d=3`;
// video of colour segments [[name, seconds], …] at 10 fps 160×90, plus the pulse audio (shifted `shift` s)
const mk = (name, segs, shift = 0) => {
  const f = path.join(tmp, name + ".mp4"), inputs = segs.flatMap(([c, d]) => ["-f", "lavfi", "-i", `color=c=${COLORS[c]}:s=160x90:r=10:d=${d}`]);
  const cat = segs.map((_, i) => `[${i}:v]`).join("") + `concat=n=${segs.length}:v=1:a=0[v]`;
  ffm([...inputs, "-f", "lavfi", "-i", PULSES(shift), "-filter_complex", cat, "-map", "[v]", "-map", `${segs.length}:a`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "10", "-g", "5", "-c:a", "aac", "-shortest", f]);
  return f;
};
const REF = [["red", 1], ["green", 1], ["blue", 1]];
const ref = mk("ref", REF), same = mk("same", REF);

// probe
const p = probe(ref);
assert.deepEqual([p.video.width, p.video.height, p.video.fps, p.video.codec, p.audio.codec], [160, 90, 10, "h264", "aac"]);
assert.ok(Math.abs(p.duration - 3) < 0.15, `duration ${p.duration}`);
// cuts: at 1 s and 2 s, none in a single-colour video
const c = cuts(ref);
assert.equal(c.length, 2, `cuts ${c}`); assert.ok(Math.abs(c[0] - 1) < 0.15 && Math.abs(c[1] - 2) < 0.15, `cut times ${c}`);
assert.equal(cuts(mk("flat", [["red", 3]])).length, 0);
// frames: the picture at 0.5 s is red, at 1.5 s green, at 2.5 s blue
const fr = frames(ref, [0.5, 1.5, 2.5], path.join(tmp, "fr"));
const px = (f) => { const r = spawnSync("ffmpeg", ["-v", "error", "-i", f, "-vf", "scale=1:1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { encoding: "buffer" }); return [...r.stdout]; };
const dom = (rgb) => ["red", "green", "blue"][rgb.indexOf(Math.max(...rgb))];
assert.deepEqual(fr.map((f) => dom(px(f.file))), ["red", "green", "blue"]);

// diff: an identical render, a different one, a shifted soundtrack, an extra cut
const s0 = ssim(ref, same);
assert.ok(s0.mean > 0.99 && s0.frames.length >= 28, `same video: SSIM ${s0.mean} over ${s0.frames.length} frames`);
const wrong = mk("wrong", [["green", 3]]), s1 = ssim(ref, wrong);
assert.ok(s1.mean < 0.85 && s1.min < 0.6, `different video: SSIM ${s1.mean} (min ${s1.min})`);
assert.ok(s1.frames.find((x) => x.t >= 1.2 && x.t < 1.8).ssim > 0.99, "the green second matches");
const m = matchCuts(cuts(ref), cuts(wrong)); assert.equal(m.missed.length, 2); assert.equal(m.extra.length, 0);
const extra = mk("extra", [["red", 1], ["green", 0.5], ["white", 0.5], ["blue", 1]]), m2 = matchCuts(cuts(ref), cuts(extra));
assert.deepEqual([m2.missed.length, m2.extra.length], [0, 1], `extra cut: ${JSON.stringify(m2)}`); assert.ok(Math.abs(m2.extra[0] - 1.5) < 0.15);
assert.ok(Math.abs(audioOffset(ref, same)) < 0.02, "same soundtrack: offset 0");
const late = mk("late", REF, 0.5), off = audioOffset(ref, late);
assert.ok(Math.abs(off - 0.5) < 0.03, `soundtrack 0.5 s late: offset ${off}`);
assert.ok(Math.abs(audioOffset(ref, mk("early", REF, -0.25)) + 0.25) < 0.03, "soundtrack 0.25 s early: negative offset");

// the commands through bin/reelwright.mjs (they are auto-registered): output and the exit status under the bar
let r = cli("measure", ref, "probe"); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /160x90 @ 10 fps/);
r = cli("measure", ref, "cuts", "--json"); assert.equal(JSON.parse(r.stdout).cuts.length, 2);
r = cli("measure", ref, "frames", "--count", "3", "--out", path.join(tmp, "mf")); assert.equal(fs.readdirSync(path.join(tmp, "mf")).length, 3);
r = cli("measure", path.join(tmp, "nope.mp4"), "probe"); assert.equal(r.status, 1); assert.match(r.stdout, /no such file/);
r = cli("diff", ref, same, "--bar", "0.95"); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /PASS/);
r = cli("diff", ref, wrong, "--bar", "0.9"); assert.equal(r.status, 1, "diff exits 1 under the bar"); assert.match(r.stdout, /FAIL[\s\S]*missed 1\.\d+, 2\.\d+/);
r = cli("diff", ref, late, "--json"); assert.ok(Math.abs(JSON.parse(r.stdout).audioOffset - 0.5) < 0.03);
// reverse: three shots, a still each, shots.json
const rv = path.join(tmp, "rev"); r = cli("reverse", ref, "--out", rv); assert.equal(r.status, 0, r.stdout + r.stderr);
const sj = JSON.parse(fs.readFileSync(path.join(rv, "shots.json"), "utf8"));
assert.equal(sj.shots.length, 3); assert.ok(sj.shots.every((s) => fs.existsSync(path.join(rv, s.frame))) && Math.abs(sj.shots[1].start - 1) < 0.15);
assert.deepEqual(sj.shots.map((s) => dom(px(path.join(rv, s.frame)))), ["red", "green", "blue"]);

fs.rmSync(tmp, { recursive: true, force: true });
console.log("p7-video self-check: probe, cuts, frames, SSIM diff (+ missed/extra cuts, audio offset, exit 1 under the bar) and reverse shot list pass");
