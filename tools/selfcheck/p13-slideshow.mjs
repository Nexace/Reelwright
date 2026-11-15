// node tools/selfcheck/p13-slideshow.mjs — hyperframes:H5 (Slideshow), the command half: `reelwright slideshow <folder>` turns three stills and a clip into a
// hyperframes film that really renders offline (frames + mp4): the right slide at the right time, a crossfade between neighbours, the clip
// playing, an mp4 of the right length; render(t) is a pure function of t (shuffled seeks give the same layer styles); bad options are refused;
// TRANSITIONS is exactly KIT.transition.names. The studio tab is tools/selfcheck/p13-slideshow-panel.mjs.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { ROOT } from "../p13_fixture.mjs";
import { TRANSITIONS } from "../slideshow.mjs";
import { launch } from "../browser.mjs";

const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "p13-ss-"))), src = path.join(tmp, "photos"), dest = path.join(tmp, "film");
const rw = (...a) => spawnSync(process.execPath, [path.join(ROOT, "bin/reelwright.mjs"), ...a], { cwd: ROOT, encoding: "utf8", env: { ...process.env, PAGES: "2" } });
const ff = (...a) => assert.equal(spawnSync("ffmpeg", ["-y", "-v", "error", ...a], { encoding: "utf8" }).status, 0);
const rgb = (png) => { const r = spawnSync("ffmpeg", ["-v", "error", "-i", png, "-vf", "scale=1:1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]); return [...r.stdout.subarray(0, 3)]; };
let browser;
try {
  fs.mkdirSync(src);
  for (const [n, c] of [["a-red", "red"], ["b-green", "green"], ["c-blue", "blue"]]) ff("-f", "lavfi", "-i", `color=c=${c}:s=320x180:d=1`, "-frames:v", "1", path.join(src, `${n}.png`));
  ff("-f", "lavfi", "-i", "testsrc=s=320x180:d=1.5:r=10", "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(src, "d-clip.mp4"));
  fs.writeFileSync(path.join(src, "notes.txt"), "not media"); fs.writeFileSync(path.join(src, ".hidden.png"), "");

  // refusals first: nothing is created
  for (const bad of [["--transition", "spin"], ["--seconds", "0.1"], ["--tdur", "5"], ["--size", "big"], ["--fit", "stretch"]]) {
    const r = rw("slideshow", src, "--out", path.join(tmp, "nope"), ...bad);
    assert.equal(r.status, 1, bad.join(" ")); assert.ok(!fs.existsSync(path.join(tmp, "nope")), "nothing written for " + bad.join(" "));
  }
  assert.equal(rw("slideshow", tmp + "/missing", "--out", path.join(tmp, "nope")).status, 1, "a folder that is not there");

  // build: 3 stills at 1 s + the 1.5 s clip, 0.4 s crossfades → 4.5 s
  let r = rw("slideshow", src, "--out", dest, "--seconds", "1", "--tdur", "0.4", "--transition", "fade", "--size", "480x270", "--zoom", "0");
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /4 slide\(s\) \(1 clip\(s\)\), 4\.5 s, 480x270/);
  assert.deepEqual(fs.readdirSync(path.join(dest, "hf/slides")), ["001-a-red.png", "002-b-green.png", "003-c-blue.png", "004-d-clip.mp4"], "natural order, media only, hidden files skipped");
  assert.equal(rw("slideshow", src, "--out", dest).status, 1, "never overwrites a folder");
  const slides = JSON.parse(fs.readFileSync(path.join(dest, "hf/slides.js"), "utf8").replace(/^[\s\S]*window\.SLIDES = /, "").replace(/;\s*$/, ""));
  assert.deepEqual(slides.items.map((x) => [x.type, x.hold]), [["image", 1], ["image", 1], ["image", 1], ["video", 1.5]]);

  for (const c of ["sched", "info", "frames", "encode"]) { r = rw(c, dest); assert.equal(r.status, 0, `${c}: ${(r.stdout + r.stderr).slice(-600)}`); }
  const frames = fs.readdirSync(path.join(dest, "frames")).filter((f) => f.endsWith(".png")).sort();
  assert.equal(frames.length, 135, "4.5 s at 30 fps");
  const px = (t) => rgb(path.join(dest, "frames", frames[Math.round(t * 30)]));
  const [r0, g1, b2] = [px(0.5), px(1.6), px(2.7)];
  assert.ok(r0[0] > 200 && r0[1] < 60 && r0[2] < 60, `t 0.5 is the red slide: ${r0}`);
  assert.ok(g1[1] > 90 && g1[0] < 40 && g1[2] < 40, `t 1.6 is the green slide: ${g1}`);
  assert.ok(b2[2] > 200 && b2[0] < 40 && b2[1] < 60, `t 2.7 is the blue slide: ${b2}`);
  // the red → green crossfade is 1.0 to 1.4 s (the theme's ease makes it quick): some frame in it holds both colours, and it ends on green
  const mixed = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40].map((n) => rgb(path.join(dest, "frames", frames[n]))).find((c) => c[0] > 25 && c[1] > 25 && c[0] < 230);
  assert.ok(mixed, "a frame of the crossfade mixes red and green");
  const bytes = (t) => fs.readFileSync(path.join(dest, "frames", frames[Math.round(t * 30)]));
  assert.ok(!bytes(3.3).equals(bytes(4.4)) && !bytes(3.6).equals(bytes(4.0)), "the clip is playing (testsrc counts up)");
  const mp4 = path.join(dest, "out", "film.mp4");
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4], { encoding: "utf8" });
  assert.ok(Math.abs(parseFloat(probe.stdout) - 4.5) < 0.1, `mp4 length ${probe.stdout}`);

  // a pure function of t, and the transition list is the kit's own
  browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  const p = await browser.newPage({ viewport: { width: 480, height: 270 } });
  await p.goto(pathToFileURL(path.join(dest, "hf/index.html")).href);
  assert.ok(await p.evaluate(() => window.READY), "the slideshow page loads");
  const names = await p.evaluate(() => window.KIT.transition.names);
  assert.deepEqual([...TRANSITIONS].sort(), [...names].sort(), "TRANSITIONS in tools/slideshow.mjs is KIT.transition.names");
  const sig = (t) => p.evaluate(async (t) => { await window.render(t); return [...document.querySelectorAll(".slide")].map((e) => e.style.cssText + "|" + (e.querySelector("img,video")?.style.transform || "")).join("#"); }, t);
  const ts = [0.2, 0.5, 1.2, 1.9, 2.2, 3.1, 4.4], fwd = [];
  for (const t of ts) fwd.push(await sig(t));
  for (const i of [4, 0, 6, 2, 5, 1, 3, 6, 0]) assert.equal(await sig(ts[i]), fwd[i], `t=${ts[i]} gives the same layers after other seeks`);

  // cycling transitions and a single still
  const one = path.join(tmp, "one"); fs.mkdirSync(one); fs.copyFileSync(path.join(src, "a-red.png"), path.join(one, "x.png"));
  r = rw("slideshow", one, "--out", path.join(tmp, "film1"), "--transition", "slide,iris,zoom");
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /1 slide\(s\) \(0 clip\(s\)\), 3 s/);
  console.log("p13-slideshow: ok (4 slides rendered, crossfade and clip checked)");
} finally { await browser?.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
