// node tools/selfcheck/render-opts.mjs — tools/render_opts.mjs: no options give the default encode (slow, crf 16, high profile, yuv420p,
// -tune animation + aq-mode=3, BT.709 tags); the quality presets order by size (draft < standard < looks < high < delivery) on a real ffmpeg
// encode; bitrate / maxrate / keyframe interval are honoured (ffprobe) and -keyint_min never suppresses scene cuts; the 4K presets keep the
// layout size and reject a wrong aspect, and a page at that scale gives a 2x frame in Chromium; supersample and bitDepth; workers by cores/RAM.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { launch } from "../browser.mjs";
import { PRESETS, x264Args, vp9Args, resolution, autoWorkers, outputSize, supersample } from "../render_opts.mjs";

assert.deepEqual(x264Args(), ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-tune", "animation", "-x264-params", "aq-mode=3:aq-strength=1.0",
  "-pix_fmt", "yuv420p", "-profile:v", "high", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"], "default = the film encode");
assert.deepEqual(x264Args({ crf: 10 }).slice(4, 6), ["-crf", "10"]);
assert.ok(!x264Args({ keyframeInterval: 12 }).includes("-keyint_min"), "-keyint_min is gone: equal to -g it suppresses scene-cut keyframes");
const ten = x264Args({ bitDepth: 10 });
assert.deepEqual([ten[ten.indexOf("-pix_fmt") + 1], ten[ten.indexOf("-profile:v") + 1]], ["yuv420p10le", "high10"], "output.bitDepth 10 is opt-in High10");
assert.ok(!x264Args().includes("yuv420p10le"), "10-bit is never the default (High10 does not play in Safari)");
assert.throws(() => x264Args({ bitDepth: 12 }), /8 or 10/);
assert.throws(() => x264Args({ quality: "ultra" }), /not one of draft/);
assert.throws(() => x264Args({ maxBitrate: "fast" }), /8M or 2500k/);
assert.ok(vp9Args({ vp9CpuUsed: 4 }).join(" ").includes("-cpu-used 4") && !vp9Args().includes("-cpu-used"));
assert.throws(() => vp9Args({ vp9CpuUsed: 12 }));
assert.equal(supersample({}, {}), 1, "supersample off by default");
assert.equal(supersample({ supersample: 2 }, {}), 2); assert.equal(supersample({}, { REELWRIGHT_SUPERSAMPLE: "3" }), 3, "--supersample wins");
assert.throws(() => supersample({ supersample: 5 }, {}), /1 to 4/); assert.throws(() => supersample({ supersample: 1.5 }, {}), /whole number/);
assert.deepEqual(outputSize({ width: 1920, height: 1080 }, ""), { width: 1920, height: 1080 }, "no --resolution: the layout size");
assert.deepEqual(outputSize({ width: 1920, height: 1080 }, "4k"), { width: 3840, height: 2160 }, "--resolution 4k: the output pixels");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p8-render-"));
const enc = (name, o) => {
  const f = path.join(tmp, name + ".mp4");
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=640x360:rate=30:duration=3", ...x264Args(o), "-movflags", "+faststart", f], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return f;
};
const probe = (f, entries, extra = []) => spawnSync("ffprobe", ["-v", "error", ...extra, "-show_entries", entries, "-of", "csv=p=0", f], { encoding: "utf8" }).stdout.trim();
try {
  const size = Object.fromEntries(Object.keys(PRESETS).map((q) => [q, fs.statSync(enc(q, { quality: q })).size]));
  assert.ok(size.draft < size.standard && size.standard < size.looks && size.looks < size.high && size.high < size.delivery, "presets order by quality: " + JSON.stringify(size));
  const kf = enc("kf", { keyframeInterval: 10 });
  const types = probe(kf, "frame=pict_type", ["-select_streams", "v"]).split("\n");
  const iAt = types.map((t, i) => (t.startsWith("I") ? i : -1)).filter((i) => i >= 0);
  const gap = Math.max(...iAt.slice(1).map((v, i) => v - iAt[i])), n0 = probe(enc("kf0", {}), "frame=pict_type", ["-select_streams", "v"]).split("\n").filter((t) => t.startsWith("I")).length;
  assert.ok(iAt[0] === 0 && gap <= 10 && iAt.length > n0, `keyframe at least every 10 frames (max gap ${gap}; ${iAt.length} keyframes vs ${n0} by default): ${iAt}`);
  const br = +probe(enc("br", { videoBitrate: "400k", maxBitrate: "500k", bufferSize: "1M" }), "format=bit_rate");
  assert.ok(br > 150e3 && br < 600e3, `bitrate target 400k, got ${br}`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

const P = { width: 1920, height: 1080 };
const r4 = resolution(P, "4k");
assert.deepEqual([r4.width, r4.height, r4.scale], [3840, 2160, 2]);
assert.deepEqual(r4.viewport, { width: 1920, height: 1080 }, "layout size unchanged");
assert.throws(() => resolution(P, "portrait-4k"), /aspect must match/);
assert.equal(resolution({ width: 1080, height: 1920 }, "portrait-4k").width, 2160);
assert.equal(resolution({ width: 1080, height: 1080 }, "square-4k").scale, 2);
assert.throws(() => resolution(P, "8k"), /not one of/);

const b = await launch(["--allow-file-access-from-files"]);
try {
  const p = await b.newPage({ viewport: r4.viewport, deviceScaleFactor: r4.scale });
  await p.setContent("<body style='margin:0'><div id=a style='width:1920px;height:1080px;background:#123'></div></body>");
  const png = await p.screenshot({ type: "png" });
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [3840, 2160], "screenshot is 3840x2160 from a 1920x1080 layout");
  assert.equal(await p.evaluate(() => document.getElementById("a").getBoundingClientRect().width), 1920, "layout px unchanged");
} finally { await b.close(); }

assert.equal(autoWorkers({ cores: 16, freeMem: 32 * 2 ** 30, frames: 1000 }), 8);
assert.equal(autoWorkers({ cores: 16, freeMem: 2 * 2 ** 30, frames: 1000 }), 4, "RAM bound: 2 GB / 512 MB");
assert.equal(autoWorkers({ cores: 64, freeMem: 2 ** 40, frames: 1000 }), 24, "clamped to 24");
assert.equal(autoWorkers({ cores: 2, freeMem: 2 ** 30, frames: 1000 }), 1);
assert.equal(autoWorkers({ cores: 16, freeMem: 32 * 2 ** 30, frames: 3 }), 3, "never more workers than frames");
assert.equal(autoWorkers({ cores: 16, freeMem: 32 * 2 ** 30, frames: 1000, lowMemory: true }), 2, "low-memory mode");
console.log("render-opts self-check: default encode (tune animation, aq-mode=3, BT.709, no keyint_min), 5 quality presets order by size, bitrate/maxrate/keyint honoured, bitDepth 10 opt-in, supersample + output size, 4K scale 2 gives 3840x2160, workers by cores/RAM");
