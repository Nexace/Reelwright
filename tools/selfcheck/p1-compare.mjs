// node tools/selfcheck/p1-compare.mjs — row hyperframes:G7, `compare` and `grade-compare` (tools/commands/compare.mjs, grade-compare.mjs).
// 1. grade-compare: a generated test picture goes through real HyperFrames grading presets (drawn by the HyperFrames runtime):
//    one labelled PNG, the mono preset's tile is grey where the original's is red, intensity 0 leaves the picture alone, a video
//    frame works, a wrong preset name fails with the list.
// 2. compare: three variants of a fixture film (a project, a video made with other variables, a folder of stills) at two moments in
//    one PNG: 3 rows × 2 columns, each cell has its variant's own pixels (checked at cell positions from compare.json).
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { presetIds } from "../commands/grade-compare.mjs";
import { tmpdir, makeProject, rw, pixel } from "./p1-fixture.mjs";

const tmp = tmpdir("compare");
const size = (f) => spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout.trim().split(",").map(Number);
const layout = (png) => JSON.parse(fs.readFileSync(png.replace(/\.png$/, "") + ".json", "utf8"));

// ── 1. grade-compare ────────────────────────────────────────────────────────
{
  assert.equal(presetIds("grade").length, 12); assert.ok(presetIds("effect").includes("vhs-playback")); assert.ok(presetIds("all").length > 12);
  assert.deepEqual(presetIds("mono-clean, warm-daylight"), ["mono-clean", "warm-daylight"]);
  assert.throws(() => presetIds("nope"), /unknown preset nope; have: neutral/);
  const src = path.join(tmp, "src.png");   // red / green / grey bars
  assert.equal(spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=100x180,format=rgb24", "-f", "lavfi", "-i", "color=c=0x00ff00:s=100x180,format=rgb24",
    "-f", "lavfi", "-i", "color=c=0x808080:s=100x180,format=rgb24", "-filter_complex", "[0][1][2]hstack=inputs=3", "-frames:v", "1", src]).status, 0);
  const at = (png, cell, fx, fy) => { const c = layout(png).cells[cell]; return pixel(png, c.x + Math.round(c.w * fx), c.y + Math.round(c.h * fy)); };

  const out = path.join(tmp, "gc.png"), r = rw("grade-compare", src, "--presets", "mono-clean,warm-daylight", "--out", out, "--cols", "3");
  assert.equal(r.status, 0, r.out);
  const L = layout(out);
  assert.deepEqual(L.cells.map((c) => c.label), ["original", "mono-clean", "warm-daylight"], "labelled: original first, then each preset");
  assert.equal(size(out)[0], 3 * 414 + 14, "one row of three 400 px tiles");
  const [r0, g0, b0] = at(out, 0, 1 / 6, 0.5), [r1, g1, b1] = at(out, 1, 1 / 6, 0.5);
  assert.ok(r0 > 240 && g0 < 15 && b0 < 15, `original tile is red: ${r0},${g0},${b0}`);
  assert.ok(Math.abs(r1 - g1) < 12 && Math.abs(g1 - b1) < 12 && r1 < 200, `mono-clean tile is grey where the original is red: ${r1},${g1},${b1}`);
  const [r2, g2, b2] = at(out, 2, 5 / 6, 0.5), [r3, g3, b3] = at(out, 0, 5 / 6, 0.5);
  assert.ok((r2 - b2) > (r3 - b3) + 8, `warm-daylight warms the grey bar (red up, blue down): ${r3},${g3},${b3} → ${r2},${g2},${b2}`);

  const zero = path.join(tmp, "gc0.png");
  assert.equal(rw("grade-compare", src, "--presets", "mono-clean", "--intensity", "0", "--out", zero).status, 0);
  const [rz, gz, bz] = at(zero, 1, 1 / 6, 0.5);
  assert.ok(rz > 235 && gz < 20 && bz < 20, `intensity 0 leaves the picture alone: ${rz},${gz},${bz}`);

  const vid = path.join(tmp, "v.mp4");   // a video: the frame at --at
  assert.equal(spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=160x90:d=1,format=yuv420p", "-f", "lavfi", "-i", "color=c=0x00ff00:s=160x90:d=1,format=yuv420p", "-filter_complex", "[0][1]concat=n=2:v=1:a=0", vid]).status, 0);
  const vo = path.join(tmp, "gv.png");
  assert.equal(rw("grade-compare", vid, "--at", "1.5", "--presets", "mono-fade", "--out", vo).status, 0);
  const [rv, gv] = at(vo, 0, 0.5, 0.5);
  assert.ok(gv > 200 && rv < 60, `--at 1.5 takes the second half of the video (green): ${rv},${gv}`);
  const bad = rw("grade-compare", src, "--presets", "sepia9000");
  assert.equal(bad.status, 1); assert.match(bad.out, /unknown preset sepia9000/);
  console.log("PASS  grade-compare: labelled PNG of real HyperFrames presets (mono grey, warm shift, intensity 0 unchanged, video frame, bad preset)");
}

// ── 2. compare ──────────────────────────────────────────────────────────────
{
  const proj = makeProject(path.join(tmp, "proj"));
  assert.equal(rw("film", proj).status, 0);
  fs.writeFileSync(path.join(tmp, "rows.json"), JSON.stringify([{ _name: "red", accent: "#ff0000", tone: "loud" }]));
  assert.equal(rw("batch", proj, path.join(tmp, "rows.json")).status, 0);
  const red = path.join(proj, "out", "batch", "red.mp4");
  // a folder of stills named t<time>.jpg (made from the film's own mp4 with other variables: blue)
  fs.writeFileSync(path.join(tmp, "rows.json"), JSON.stringify([{ _name: "blue", accent: "#0000ff" }]));
  assert.equal(rw("batch", proj, path.join(tmp, "rows.json")).status, 0);
  const folder = path.join(tmp, "blue-stills"); fs.mkdirSync(folder);
  for (const t of [0.5, 1.0]) assert.equal(spawnSync("ffmpeg", ["-y", "-v", "error", "-ss", String(t), "-i", path.join(proj, "out", "batch", "blue.mp4"), "-frames:v", "1", "-update", "1", path.join(folder, `t${t.toFixed(2).padStart(6, "0")}.jpg`)]).status, 0);

  const before = fs.existsSync(path.join(proj, "stills"));
  const out = path.join(tmp, "cmp.png");
  const r = rw("compare", proj, red, folder, "--at", "0.6,1.0", "--labels", "default,red,blue", "--out", out);
  assert.equal(r.status, 0, r.out);
  assert.equal(fs.existsSync(path.join(proj, "stills")), before, "the project's own stills/ is left as it was");
  const L = layout(out);
  assert.deepEqual(L.cells.map((c) => c.label + " " + c.sub), ["default t=0.60s", "default t=1.00s", "red t=0.60s", "red t=1.00s", "blue t=0.60s", "blue t=1.00s"], "a row per variant, a column per time, each labelled");
  assert.equal(new Set(L.cells.map((c) => c.y)).size, 3); assert.equal(new Set(L.cells.map((c) => c.x)).size, 2);
  // the first bar: x 12..40, y 120..144 in the 320×180 frame; the cell is scaled to 520 px wide
  const bar = (i) => { const c = L.cells[i], s = c.w / 320; return pixel(out, c.x + Math.round(26 * s), c.y + Math.round(132 * s)); };
  const [g, rd, bl] = [bar(1), bar(3), bar(5)];
  assert.ok(g[1] > 120 && g[0] < 90 && g[2] < 140, `project variant (default accent): green bar, got ${g}`);
  assert.ok(rd[0] > 200 && rd[1] < 70, `video variant (accent red): red bar, got ${rd}`);
  assert.ok(bl[2] > 200 && bl[0] < 70, `folder variant (accent blue): blue bar, got ${bl}`);
  const one = rw("compare", proj, "--at", "1");
  assert.equal(one.status, 1); assert.match(one.out, /usage: reelwright compare/);
  const bad = rw("compare", proj, red, "--at", "1", "--labels", "only-one", "--out", path.join(tmp, "x.png"));
  assert.equal(bad.status, 1); assert.match(bad.out, /--labels: 1 labels for 2 variants/);
  console.log("PASS  compare: project + video + folder of stills × 2 moments → one labelled PNG, each cell shows its own variant");
}
fs.rmSync(tmp, { recursive: true, force: true });
