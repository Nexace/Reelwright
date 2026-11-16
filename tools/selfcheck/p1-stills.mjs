// node tools/selfcheck/p1-stills.mjs — row hyperframes:G5, the full `stills` (command stills2, tools/commands/stills2.mjs).
// 1. pickTimes: a list, --at, --frames N, --range a-b:step, --range a-b with --frames, clamping to the film, bad input.
// 2. on an offline fixture project (tools/selfcheck/p1-fixture.mjs), through bin/reelwright.mjs: --frames and --range write the
//    right stills; --zoom <selector> crops to that element's box (checked on pixels, and a missing selector fails);
//    --variables changes what is shown; --against ref.mp4 scores each moment (SSIM ≈ 1 for the film itself, lower for a film with
//    other variables, a difference image, a sheet), holds the reference's last frame past its end, and --min-ssim sets the exit code.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pickTimes } from "../commands/stills2.mjs";
import { tmpdir, makeProject, rw, pixel } from "./p1-fixture.mjs";

// ── 1. times ────────────────────────────────────────────────────────────────
{
  assert.deepEqual(pickTimes({ list: "1,2.5" }, 4), [1, 2.5]);
  assert.deepEqual(pickTimes({ at: "3,1,3,9" }, 4), [1, 3, 4], "sorted, unique, clamped to the film");
  assert.deepEqual(pickTimes({ frames: 4 }, 8), [1, 3, 5, 7], "--frames N: centred in N equal slices");
  assert.equal(pickTimes({}, 12).length, 12, "default: 12 frames");
  assert.deepEqual(pickTimes({ range: "2-3:0.25" }, 10), [2, 2.25, 2.5, 2.75, 3]);
  assert.deepEqual(pickTimes({ range: "2-6", frames: 5 }, 10), [2, 3, 4, 5, 6], "--range with --frames: both ends included");
  assert.deepEqual(pickTimes({ range: "2-6", frames: 1 }, 10), [4]);
  assert.deepEqual(pickTimes({ range: "4-9:2" }, 6), [4, 6], "range ends at the film's end");
  for (const bad of [{ range: "5-2" }, { range: "x" }, { range: "1-2:0" }]) assert.throws(() => pickTimes(bad, 9), /--range/);
  console.log("PASS  times: list, --at, --frames, --range (step, frames), clamp, errors");
}

// ── 2. the command ──────────────────────────────────────────────────────────
const tmp = tmpdir("stills"), proj = makeProject(path.join(tmp, "proj")), D = path.join(proj, "stills");
const film = rw("film", proj);
assert.equal(film.status, 0, film.out);
const DUR = JSON.parse(fs.readFileSync(path.join(proj, "timeline.json"), "utf8")).DUR;
const jpgs = () => fs.readdirSync(D).filter((f) => /^t[\d.]+\.jpg$/.test(f)).sort();
const size = (f) => spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout.trim().split(",").map(Number);
const run = (...a) => { const r = rw("stills2", proj, ...a); assert.equal(r.status, 0, r.out); return r.out; };

// --frames N and --range
run("--frames", "4");
assert.deepEqual(jpgs(), [0.5, 1.5, 2.5, 3.5].map((x) => +(x * DUR / 4).toFixed(2)).map((t) => "t" + t.toFixed(2).padStart(6, "0") + ".jpg").sort(), "4 stills, centred in 4 slices of the film");
assert.ok(fs.existsSync(path.join(D, "sheet.jpg")), "contact sheet");
run("--range", "0.2-1.0:0.4");
assert.deepEqual(jpgs(), ["t000.20.jpg", "t000.60.jpg", "t001.00.jpg"]);
run("0.3,0.9");
assert.deepEqual(jpgs(), ["t000.30.jpg", "t000.90.jpg"], "positional times still work");
{ // `stills --frames 2` itself reaches stills2 (the bin alias); `stills t,t` still takes the old path
  const viaStills = rw("stills", proj, "--frames", "2");
  assert.equal(viaStills.status, 0, viaStills.out);
  assert.equal(jpgs().length, 2, "`stills --frames 2` wrote 2 stills");
  const classic = rw("stills", proj, "0.4");
  assert.equal(classic.status, 0, classic.out); assert.deepEqual(jpgs(), ["t000.40.jpg"]);
}
console.log("PASS  stills2: --frames, --range a-b:step, positional list, `stills --frames` routes here");

// --zoom: the crop is the .panel box (x 150..300, y 20..90) plus 24 px, enlarged ×3, and shows the panel colour
{
  run("--at", "0.9", "--zoom", ".panel");
  const z = path.join(D, "zoom-t000.90.jpg");
  assert.ok(fs.existsSync(z) && fs.existsSync(path.join(D, "zoom-sheet.png")));
  const [zw, zh] = size(z);
  assert.ok(zw < 320 * 3 && zh < 180 * 3 && zw >= 400, `zoom is a crop, not the frame: ${zw}×${zh}`);
  // crop x0 = 126, y0 = 0: the panel's top-left is (24, 20) in the crop → ×3 → centre of the panel at ((24 + 75) × 3, (20 + 35) × 3)
  const [r, g, b] = pixel(z, Math.round((24 + 75) * zw / 194), Math.round((20 + 35) * zw / 194));
  assert.ok(Math.abs(r - 0x99) < 24 && Math.abs(g - 0xbb) < 24 && Math.abs(b - 0xcc) < 24, `panel colour #9bc at the crop's centre, got ${r},${g},${b}`);
  const bad = rw("stills2", proj, "--at", "0.9", "--zoom", ".no-such-thing");
  assert.equal(bad.status, 1); assert.match(bad.out, /nothing visible matches/);
  // --variables on stills2: tone loud → the panel is red in the same crop
  run("--at", "0.9", "--zoom", ".panel", "--variables", '{"tone":"loud"}');
  const [r2, g2] = pixel(z, Math.round((24 + 75) * zw / 194), Math.round((20 + 35) * zw / 194));
  assert.ok(r2 > 200 && g2 < 90, `--variables tone=loud makes the panel red, got ${r2},${g2}`);
  assert.equal(fs.readFileSync(path.join(proj, "hf", "kit-vars.js"), "utf8").includes('"tone":"loud"'), false, "kit-vars.js restored");
  console.log("PASS  stills2: --zoom crops to the selector's box (pixels), missing selector fails, --variables applies");
}

// --against: the film's own mp4 scores ~1; a film built with other variables scores lower; held frame past the reference's end
{
  const green = path.join(proj, "out", "fx.mp4"), other = path.join(proj, "out", "batch", "red.mp4");   // the film, and a batch row with other variables
  fs.writeFileSync(path.join(tmp, "rows.json"), JSON.stringify([{ _name: "red", accent: "#ff0000", tone: "loud", bars: 5 }]));
  const r = rw("batch", proj, path.join(tmp, "rows.json"));
  assert.equal(r.status, 0, r.out);
  run("--at", "0.6,1.0", "--against", green);
  const a = JSON.parse(fs.readFileSync(path.join(D, "against.json"), "utf8")).moments;
  assert.equal(a.length, 2);
  for (const m of a) assert.ok(m.ssim > 0.93, `own film vs its mp4 at ${m.t}s: ssim ${m.ssim}`);
  assert.ok(fs.existsSync(path.join(D, "against-sheet.png")) && fs.existsSync(path.join(D, "diff-t001.00.png")));
  run("--at", "0.6,1.0", "--against", other);
  const b = JSON.parse(fs.readFileSync(path.join(D, "against.json"), "utf8")).moments;
  assert.ok(b[1].ssim < a[1].ssim - 0.03, `a film with other variables scores lower: ${b[1].ssim} vs ${a[1].ssim}`);
  // --min-ssim: exit code
  const lo = rw("stills2", proj, "--at", "1.0", "--against", other, "--min-ssim", "0.9999");
  assert.equal(lo.status, 1); assert.match(lo.out, /below --min-ssim/);
  assert.equal(rw("stills2", proj, "--at", "1.0", "--against", green, "--min-ssim", "0.5").status, 0);
  // a reference shorter than the film: its last frame is held, and the file says so
  const short = path.join(tmp, "short.mp4");
  assert.equal(spawnSync("ffmpeg", ["-y", "-v", "error", "-i", green, "-t", "0.5", "-an", short]).status, 0);
  run("--at", "0.3,1.0", "--against", short);
  const h = JSON.parse(fs.readFileSync(path.join(D, "against.json"), "utf8")).moments;
  assert.deepEqual(h.map((m) => m.held), [false, true], "t=1.0 is past the 0.5 s reference: its last frame is held");
  // zoom + against compare the same crop
  run("--at", "1.0", "--zoom", ".panel", "--against", green);
  const zc = JSON.parse(fs.readFileSync(path.join(D, "against.json"), "utf8"));
  assert.equal(zc.zoom, ".panel"); assert.ok(zc.moments[0].ssim > 0.9);
  assert.equal(rw("stills2", proj, "--against", "/no/such.mp4").status, 1);
  console.log("PASS  stills2: --against scores (own film ≈ 1, other variables lower), diff + sheet, held frame, --min-ssim exit code, zoom + against");
}
fs.rmSync(tmp, { recursive: true, force: true });
