// node tools/selfcheck/capture-quality.mjs — capture and encode fidelity, end to end on a 320x180 flat film (offline, seconds):
//   frames     pvk writes PNG frames (no JPEG q94 intermediate before x264), and stills stay jpeg
//   encode     ffprobe: BT.709 / tv tags on the render mp4, -keyint_min gone (scene cuts keep their keyframes), -tune animation
//              and aq-mode=3 in the film encode only (transcode keeps the plain x264 args); a pure-red frame comes out as
//              BT.709 limited-range YUV 63/102/240 (the explicit scale=out_color_matrix, not ffmpeg 7.1+ negotiation)
//   manifest   a pvk render's <out>.manifest.json records its PNG frames, verify compares them, and a 0-frame manifest FAILs
//   capture    the two Chrome flags that make a normal frame and a shader-transition frame identical (font hinting, srgb)
//   dither     the kit tile is on in an mp4 film (±1-2 LSB over a flat colour) and off for an alpha capture (alpha 0) and
//              with output.dither:false; kit.css sets -webkit-font-smoothing: antialiased
//   supersample  --supersample 2 captures 640x360 from a 320x180 layout and encodes 320x180 (lanczos)
//   master     output.master "prores" → a ProRes 4444 10-bit master beside the mp4; 10-bit H.264 only on output.bitDepth 10
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";
import { kitFiles } from "../kit_files.mjs";
import pvk, { launchArgs, encode } from "../renderers/pvk.mjs";
import { GL_ARGS } from "../renderers/shader_pass.mjs";
import { x264Args, FILM_X264 } from "../render_opts.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const W = 320, H = 180, FPS = 10;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "capture-quality-"));
const T = (f) => path.join(tmp, f);
const url = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const probe = (f, entries) => Object.fromEntries(spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", entries, "-of", "default=nw=1", f], { encoding: "utf8" })
  .stdout.replace(/\r/g, "").trim().split("\n").filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2)));
const rgba = (f) => spawnSync("ffmpeg", ["-v", "error", "-i", f, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgba", "-"], { encoding: "buffer" }).stdout;
const quiet = async (fn) => { const log = console.log; console.log = () => {}; try { return await fn(); } finally { console.log = log; } };
const P = (extra = {}) => ({ fps: FPS, width: W, height: H, out: "out/film.mp4", ...extra });

// a flat #101010 film: any pixel that is not #101010 in the capture is the dither tile (or a broken page)
function film(name) {
  const d = T(name);
  fs.mkdirSync(path.join(d, "film"), { recursive: true });
  fs.writeFileSync(path.join(d, "timeline.json"), JSON.stringify({ captions: [] }));
  fs.writeFileSync(path.join(d, "film/index.html"), `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${url("tools/kit.css")}">
<style>html, body { margin: 0; background: #101010; } #stage { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; background: #101010; }</style>
</head><body><div id="stage"></div>
<script>window.PROJECT = { fps: ${FPS}, width: ${W}, height: ${H} };</script>
<script src="${url("tools/engine.js")}"></script>
<script>KIT.start({ dur: 1, render() {} });</script>
</body></html>`);
  return d;
}
const frames = (d) => fs.readdirSync(path.join(d, "frames")).sort();

const oldPages = process.env.PAGES;
process.env.PAGES = "1";   // one page: the check is a few frames, not a film
try {
  // ── 1. pvk frames are PNG ──
  const A = film("opaque");
  await quiet(() => pvk(A, P(), "frames", ["0", "2"]));
  assert.deepEqual(frames(A), ["f00000.png", "f00001.png"], "pvk writes PNG frames, not f%05d.jpg");
  assert.deepEqual([...fs.readFileSync(path.join(A, "frames/f00000.png")).subarray(0, 8)], [...PNG], "the frame really is a PNG");
  await quiet(() => pvk(A, P(), "stills", ["0.5"]));
  const still = fs.readFileSync(path.join(A, "stills", "t000.50.jpg"));
  assert.deepEqual([...still.subarray(0, 3)], [0xff, 0xd8, 0xff], "stills/ stay jpeg (the contact sheet and stills2 --against read them)");

  // ── 2. the dither tile: on by default, ±1-2 LSB over a flat colour ──
  const px = rgba(path.join(A, "frames/f00000.png")), lum = [];
  for (let i = 0; i < px.length; i += 4) lum.push(px[i]);
  const lo = Math.min(...lum), hi = Math.max(...lum);
  assert.ok(hi > lo, `the dither tile is in the mp4 film's frame (flat #101010 came out ${lo}..${hi})`);
  assert.ok(hi - lo <= 4, `the dither stays within ±1-2 LSB, not visible noise (${lo}..${hi})`);

  const B = film("nodither");
  await quiet(() => pvk(B, P({ output: { dither: false } }), "frames", ["0", "1"]));
  const flat = rgba(path.join(B, "frames/f00000.png")), vals = new Set();
  for (let i = 0; i < flat.length; i += 4) vals.add(flat[i]);
  assert.deepEqual([...vals], [16], `output.dither:false leaves the flat colour flat (got ${[...vals]})`);

  const C = film("alpha");
  await quiet(() => pvk(C, P({ output: { alpha: true } }), "frames", ["0", "1"]));
  const ap = rgba(path.join(C, "frames/f00000.png"));
  let maxA = 0;
  for (let i = 3; i < ap.length; i += 4) maxA = Math.max(maxA, ap[i]);
  assert.equal(maxA, 0, "an alpha capture has no dither layer: every pixel stays transparent");

  // ── 3. the encode: BT.709 tags, a keyframe interval without -keyint_min, tune animation / aq-mode=3 ──
  await quiet(async () => encode(A, P(), FPS, "frames/f%05d.png", 0));
  const tags = probe(T("opaque/out/film.mp4"), "stream=color_space,color_primaries,color_transfer,color_range");
  assert.deepEqual(tags, { color_space: "bt709", color_primaries: "bt709", color_transfer: "bt709", color_range: "tv" }, "the render mp4 is tagged BT.709, tv range");
  const kf = x264Args({ keyframeInterval: 12 });
  assert.ok(!kf.includes("-keyint_min"), "-keyint_min is not set (equal to -g it suppressed scene-cut keyframes)");
  assert.equal(kf[kf.indexOf("-g") + 1], "12", "-g still is");
  assert.ok(FILM_X264.join(" ").includes("-tune animation") && FILM_X264.join(" ").includes("aq-mode=3:aq-strength=1.0"), "tune animation + aq-mode=3");
  assert.match(fs.readFileSync(T("opaque/out/film.mp4"), "latin1"), /x264 - core[^\0]*\baq=3:1\.00\b/, "the film encode used aq-mode=3 (x264's own settings SEI)");
  assert.ok(!x264Args().includes("-tune") && !x264Args().includes("-colorspace"), "x264Args (transcode's) has no film tune or BT.709 tags");

  // a pure-red frame: BT.709 limited range is Y 63, Cb 102, Cr 240 (BT.601 would be 81/90/240)
  const R = film("red");
  fs.mkdirSync(path.join(R, "frames"));
  spawnSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", `color=c=red:s=${W}x${H}:r=${FPS}:d=0.2,format=rgb24`, "-start_number", "0", path.join(R, "frames/f%05d.png")]);
  await quiet(async () => encode(R, P(), FPS, "frames/f%05d.png", 0));
  const yuv = spawnSync("ffmpeg", ["-v", "error", "-i", T("red/out/film.mp4"), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "yuv420p", "-"], { encoding: "buffer" }).stdout;
  const red = [yuv[0], yuv[W * H], yuv[W * H + (W / 2) * (H / 2)]];
  assert.ok(red.every((v, i) => Math.abs(v - [63, 102, 240][i]) <= 1), `pure red encodes as BT.709 tv-range YUV ~63/102/240 (got ${red})`);

  // ── 4. the capture flags (pvk and the shader pass set the same font/colour ones) ──
  for (const f of ["--font-render-hinting=none", "--force-color-profile=srgb"]) {
    assert.ok(launchArgs(1).includes(f), `pvk launches Chrome with ${f}`);
    assert.ok(GL_ARGS.includes(f), `the shader pass launches Chrome with ${f}`);
  }
  assert.ok(launchArgs(2).includes("--force-device-scale-factor=2"), "the launch scale follows the capture scale");
  assert.ok(launchArgs(1).includes("--enable-unsafe-swiftshader"), "pvk lets WebGL2 (fx-gl) fall back to SwiftShader on a GPU-less box");

  // ── 5. supersample: 2x capture, output size at encode ──
  process.env.REELWRIGHT_SUPERSAMPLE = "2";
  try {
    const D = film("supersampled");
    await quiet(() => pvk(D, P(), "frames", ["0", "1"]));
    assert.deepEqual(probe(path.join(D, "frames/f00000.png"), "stream=width,height"), { width: String(2 * W), height: String(2 * H) }, "--supersample 2 captures at 2x");
    await quiet(async () => encode(D, P(), FPS, "frames/f%05d.png", 0));
    assert.deepEqual(probe(T("supersampled/out/film.mp4"), "stream=width,height"), { width: String(W), height: String(H) }, "and the mp4 is the output size");
  } finally { delete process.env.REELWRIGHT_SUPERSAMPLE; }

  // ── 6. master profile + 10-bit opt-in ──
  await quiet(async () => encode(A, P({ output: { master: "prores" } }), FPS, "frames/f%05d.png", 0));
  const m = probe(T("opaque/out/film-master.mov"), "stream=codec_name,profile,pix_fmt");
  assert.deepEqual([m.codec_name, m.profile], ["prores", "4444"], 'output.master "prores" is a ProRes 4444 master');
  assert.match(m.pix_fmt, /^yuv(a)?444p1[02]le$/, "4444 is 4:4:4, 10-bit (a newer ffmpeg writes the same profile at 12-bit: " + m.pix_fmt + ")");
  const ten = x264Args({ bitDepth: 10 });
  assert.deepEqual([ten[ten.indexOf("-pix_fmt") + 1], ten[ten.indexOf("-profile:v") + 1]], ["yuv420p10le", "high10"], "10-bit H.264 only on output.bitDepth 10");
  assert.equal(x264Args()[x264Args().indexOf("-pix_fmt") + 1], "yuv420p", "never the default: High10 does not play in Safari");

  // ── 7. kit.css: the tile ships with the kit, and the CSS the page really gets ──
  assert.ok(kitFiles().includes("kit-dither.png"), "copyKit carries the dither tile to a hyperframes composition");
  assert.deepEqual(probe(path.join(ROOT, "tools/kit-dither.png"), "stream=width,height"), { width: "128", height: "128" }, "a 128x128 tile");
  const b = await launch();
  try {
    const p = await b.newPage({ viewport: { width: W, height: H } });
    await p.goto(pathToFileURL(path.join(A, "film/index.html")).href);
    await p.evaluate(() => window.READY);
    const after = () => p.evaluate(() => getComputedStyle(document.body, "::after").backgroundImage);
    assert.equal(await p.evaluate(() => getComputedStyle(document.documentElement).webkitFontSmoothing), "antialiased", "-webkit-font-smoothing: antialiased on html");
    assert.equal(await after(), "none", "the tile is off until the renderer adds html.kit-dither (element cutouts stay clean)");
    await p.evaluate((c) => document.documentElement.classList.add(c), "kit-dither");
    assert.match(await after(), /kit-dither\.png/, "html.kit-dither paints the tile: what pvk and the producer add for a film capture");
  } finally { await b.close(); }
  // ── 8. the manifest: a pvk render records its PNG frames and verify compares every one; 0 frames is a FAIL ──
  const V = film("verify"), node = (...a) => spawnSync(process.execPath, [path.join(ROOT, "tools/render.mjs"), V, ...a], { cwd: ROOT, encoding: "utf8" });
  fs.writeFileSync(path.join(V, "project.json"), JSON.stringify(P()));
  for (const m of ["frames", "encode"]) assert.equal(node(m).status, 0, `render.mjs ${m}`);
  const mf = path.join(V, "out/film.manifest.json"), man = JSON.parse(fs.readFileSync(mf, "utf8"));
  assert.equal(man.output.frames, FPS, `the manifest records the ${FPS} PNG frames (got ${man.output.frames})`);
  let v = node("verify");
  assert.equal(v.status, 0, v.stdout + v.stderr);
  assert.match(v.stdout, new RegExp(`PASS  frames  all ${FPS} identical`), "verify re-renders and compares every frame");
  fs.writeFileSync(mf, JSON.stringify({ ...man, output: { ...man.output, frames: 0, frame_sha256: [] } }));
  v = node("verify");
  assert.equal(v.status, 1, "a manifest with 0 frames fails verify instead of passing vacuously");
  assert.match(v.stdout, /FAIL  frames  .* records 0 frames/);
  console.log(`capture-quality self-check: PNG frames, BT.709 tags, red → 63/102/240, manifest + verify on ${FPS} frames, no keyint_min, tune animation + aq-mode=3, capture flags, dither on/off (${lo}..${hi} LSB), supersample 2x→${W}x${H}, ProRes 4444 10-bit master`);
} finally {
  if (oldPages === undefined) delete process.env.PAGES; else process.env.PAGES = oldPages;
  fs.rmSync(tmp, { recursive: true, force: true });
}
