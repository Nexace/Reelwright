// node tools/selfcheck/p8-render-opts.mjs — tools/render_opts.mjs: no options give exactly today's encode (slow, crf 16, high profile); the
// quality presets order by size (draft < standard < looks < high < delivery) on a real ffmpeg encode; bitrate / maxrate / keyframe interval
// are honoured (ffprobe); the 4K presets keep the layout size and reject a wrong aspect, and a page at that scale gives a 2x frame in
// Chromium; worker count follows cores and RAM and is clamped. Offline.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { launch } from "../browser.mjs";
import { PRESETS, x264Args, vp9Args, resolution, autoWorkers } from "../render_opts.mjs";

assert.deepEqual(x264Args(), ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-profile:v", "high"], "default = the encode today");
assert.deepEqual(x264Args({ crf: 10 }).slice(4, 6), ["-crf", "10"]);
assert.throws(() => x264Args({ quality: "ultra" }), /not one of draft/);
assert.throws(() => x264Args({ maxBitrate: "fast" }), /8M or 2500k/);
assert.ok(vp9Args({ vp9CpuUsed: 4 }).join(" ").includes("-cpu-used 4") && !vp9Args().includes("-cpu-used"));
assert.throws(() => vp9Args({ vp9CpuUsed: 12 }));

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
console.log("p8-render-opts self-check: default encode unchanged, 5 quality presets order by size, bitrate/maxrate/keyint honoured, 4K scale 2 gives 3840x2160, workers by cores/RAM");
