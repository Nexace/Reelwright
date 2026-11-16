// node tools/selfcheck/p6-dotlottie.mjs — row doodle-shots-motion:5.8: dotLottie (.lottie): `reelwright add-lottie` and KIT.dotLottie
// (tools/dotlottie.js over vendor/dotlottie/). Offline: a .lottie archive is built here (tools/selfcheck/p6/zip.mjs).
//  1. add-lottie unpacks it (animations, themes, state machines, index.json); the zip reader rejects a path that leaves the folder;
//     an unpacked animation plays in KIT.lottie.
//  2. KIT.dotLottie in both renderers: two players (one switching animation on a schedule, one switching theme), 12 seeks forward
//     vs shuffled: identical frames; the theme changes the canvas colour; the page asks for nothing outside the project (no CDN).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { runFixtures, baseStyle, ROOT } from "./p6-harness.mjs";
import { samples } from "./p6/lottie-samples.mjs";
import { zip, dotLottie } from "./p6/zip.mjs";
import { readZip } from "../commands/add-lottie.mjs";

const THEME = { rules: [{ id: "box_color", type: "Color", value: [1, 0, 0, 1] }] };
const archive = dotLottie({ shapes: samples.shapes, features: samples.features, themed: samples.themed },
  { themes: { red: THEME }, states: { click: { initial: "a", states: [{ name: "a", type: "PlaybackState", animation: "shapes" }] } } });

// 1. reader + command
assert.deepEqual(Object.keys(readZip(archive)).sort(), ["a/features.json", "a/shapes.json", "a/themed.json", "manifest.json", "s/click.json", "t/red.json"]);
assert.equal(JSON.parse(readZip(archive)["manifest.json"]).version, "2");
assert.throws(() => readZip(zip({ "../evil.json": "{}" })), /unsafe path/);
assert.throws(() => readZip(Buffer.from("not a zip")), /not a zip/);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p6dl-"));
try {
  const proj = path.join(tmp, "proj"); fs.mkdirSync(proj);
  const src = path.join(tmp, "demo.lottie"); fs.writeFileSync(src, archive);
  const r = spawnSync(process.execPath, ["bin/reelwright.mjs", "add-lottie", proj, src], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const dir = path.join(proj, "assets", "lottie", "demo"), idx = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf8"));
  assert.deepEqual(idx.animations.map((a) => a.id), ["shapes", "features", "themed"]);
  assert.deepEqual(idx.themes.map((t) => t.id), ["red"]); assert.equal(idx.stateMachines.length, 1);
  assert.equal(idx.animations[0].fps, 30); assert.equal(idx.animations[0].duration, 2);
  assert.ok(idx.warnings.some((w) => /state machines/.test(w)));
  assert.ok(fs.existsSync(path.join(proj, "assets", "lottie", "demo.lottie")));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "a", "shapes.json"), "utf8")), JSON.parse(JSON.stringify(samples.shapes)));
  assert.match(r.stdout, /KIT\.dotLottie\(.*\.\.\/assets\/lottie\/demo\.lottie/);
  const bad = spawnSync(process.execPath, ["bin/reelwright.mjs", "add-lottie", proj, path.join(tmp, "nope.lottie")], { cwd: ROOT, encoding: "utf8" });
  assert.notEqual(bad.status, 0);
  console.log("PASS  add-lottie unpacks animations, themes, state machines; zip reader rejects unsafe paths");
  const unpacked = JSON.stringify(JSON.parse(fs.readFileSync(path.join(dir, "a", "features.json"), "utf8")));

  // 2. KIT.dotLottie in both renderers
  const style = baseStyle("#stage > .full{left:0;top:0;width:640px;height:360px}#stage > .half{width:320px;height:360px;top:0}#stage > .l{left:0}#stage > .r{left:320px}");
  const fx = {
    name: "dotlottie", dur: 2, style, files: { "x.lottie": archive }, scripts: ["vendor/lottie/lottie.min.js", "tools/runtimes.js", "tools/dotlottie.js"],
    film: `
const a = KIT.dotLottie(KIT.el('div', 'half l', S), 'x.lottie', { schedule: [{ at: 1, animation: 'features' }] });
const b = KIT.dotLottie(KIT.el('div', 'half r', S), 'x.lottie', { animation: 'themed', schedule: [{ at: 1, theme: 'red' }] });
window.DL = { a, b };
KIT.start({ dur: 2, render: (t) => { a.set(t); b.set(t); } });`,
    check: async (page) => {
      const bad = await page.evaluate(async () => {
        const out = [], as = (c, m) => { if (!c) out.push(m); }, { a, b } = window.DL;
        const px = (h) => { const c = h.player.canvas, g = c.getContext('2d', { willReadFrequently: true }); return Array.from(g.getImageData(c.width / 2, c.height / 2, 1, 1).data).join(); };
        as(a.player.manifest.animations.length === 3 && a.player.manifest.themes.length === 1, 'manifest animations/themes');
        as(a.dur === 2 && Math.round(a.fps) === 30, 'duration / fps ' + a.dur + ' ' + a.fps);
        a.set(0.5); as(a.player.activeAnimationId === 'shapes', 'starts on the first animation');
        a.set(1.5); as(a.player.activeAnimationId === 'features' && Math.round(a.player.currentFrame) === 15, 'schedule switches animation: ' + a.player.activeAnimationId + ' ' + a.player.currentFrame);
        a.set(0.2); as(a.player.activeAnimationId === 'shapes', 'switching back (seek order does not matter)');
        b.set(1.99); const red = px(b); b.set(0.5); const green = px(b); b.set(1.99);
        as(green !== red && red.split(',')[0] === '255' && red.split(',')[1] === '0', 'theme should turn the box red: ' + green + ' -> ' + red);
        as(px(b) === red, 'same time, same pixel');
        const ext = performance.getEntriesByType('resource').filter((e) => /^https?:/.test(e.name) && !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(e.name));
        as(!ext.length, 'the page asked the network for ' + ext.map((e) => e.name).join());
        return out;
      });
      if (bad.length) throw new Error("dotlottie check: " + bad.join("; "));
    },
  };
  // the unpacked JSON plays in lottie-web too (what add-lottie is for when no WASM is wanted)
  const fy = { name: "unpacked-json", dur: 2, style, scripts: ["vendor/lottie/lottie.min.js", "tools/runtimes.js"], files: { "f.json": unpacked },
    film: `const l = KIT.lottie(KIT.el('div', 'full', S), 'f.json'); KIT.start({ dur: 2, render: (t) => l.set(t) });` };
  await runFixtures([fx, fy], "p6-dotlottie");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
