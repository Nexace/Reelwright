// node tools/selfcheck/remotion.mjs — the optional Remotion renderer (tools/renderers/remotion.mjs, templates/remotion).
// Always, with no Remotion anywhere: the template is complete, pins exact versions, names no UNLICENSED/Remotion-licensed
// extras, carries the licence line; rm/src/film.mjs + kit.js import in Node and give DUR and cues for a fake kit; and
// the renderer copies the template but refuses to install without a TTY (licence notice printed, exit 1).
// With REMOTION_NODE_MODULES=<a node_modules that has remotion> (symlinked into a temp fixture's rm/): 6 frames rendered
// forward in one tab and the same 6 one at a time in shuffled order must have identical PNG hashes and actually move,
// and frames/ + stills/ file names follow the renderer contract. Without it: SKIP (Remotion is opt-in, never in CI).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const T = path.join(ROOT, "templates", "remotion");
const R = await import(pathToFileURL(path.join(ROOT, "tools", "renderers", "remotion.mjs")).href);

// ── pure parts ──
for (const f of ["package.json", "README.md", "src/index.js", "src/Root.jsx", "src/Film.jsx", "src/film.mjs", "src/kit.js"])
  assert.ok(fs.existsSync(path.join(T, f)), `templates/remotion/${f} missing`);
const pkg = JSON.parse(fs.readFileSync(path.join(T, "package.json"), "utf8"));
assert.equal(pkg.private, true, "template package.json must be private");
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
for (const [n, v] of Object.entries(deps)) assert.match(v, /^\d+\.\d+\.\d+$/, `${n}@${v} is not an exact pin`);
for (const n of ["remotion", "@remotion/cli", "react", "react-dom"]) assert.ok(deps[n], `template must pin ${n}`);
assert.equal(new Set(Object.keys(deps).filter((n) => n.startsWith("@remotion/") || n === "remotion").map((n) => deps[n])).size, 1, "every Remotion package must be the same version");
// UNLICENSED in npm (transitions, effects) or Remotion-licensed extras: never in the scaffold
for (const n of ["@remotion/transitions", "@remotion/effects", "@remotion/light-leaks", "@remotion/starburst", "@remotion/mac-cursors"])
  assert.ok(!deps[n], `${n} must not be in the template`);
const src = fs.readdirSync(path.join(T, "src")).map((f) => fs.readFileSync(path.join(T, "src", f), "utf8")).join("\n");
assert.ok(!/@remotion\/(transitions|effects)|licen[cs]e-?key|licenseKey/i.test(src), "template code uses an UNLICENSED package or a licence key");
const readme = fs.readFileSync(path.join(T, "README.md"), "utf8");
assert.match(readme, /Built with Remotion, see remotion\.pro\/license/, "README needs the 'Built with Remotion' line");
assert.match(readme, /not open source/i, "README needs the licence notice");
assert.match(R.NOTICE, /not open source/i); assert.match(R.NOTICE, /remotion\.pro\/license/); assert.match(R.NOTICE, /250 MB/);

const vo = (start, text) => { const ws = text.split(" ").map((w, i) => ({ w: w.replace(/\W/g, ""), t: +(start + i * 0.3).toFixed(3), d: 0.25 }));
  return { start, end: ws.at(-1).t + 0.25, text, words: ws }; };
const VO = { hook: vo(0.8, "Product films, written as code."), hf: vo(3, "Now rendered by Remotion."), chart: vo(5, "Every chart grows on the beat."), end: vo(7.5, "Reelwright.") };
const MUSIC = { source: "synth", bpm: 100, beat: 0.6, bar: 2.4, t0: 0 };
const PROJECT = { fps: 30, tail: 1.2, speechEnd: 7.75, width: 640, height: 360 };
const props = { project: PROJECT, vo: VO, music: MUSIC, width: 640, height: 360, fps: 30 };
const info = await R.filmInfo(T, props);
assert.equal(info.DUR, 8.95, "DUR = speechEnd + tail");
assert.ok(info.cues.length >= 1 && info.cues.every((c) => c.t >= 0 && c.t <= info.DUR && typeof c.kind === "string"), "cues in the film");
const { makeKit } = await import(pathToFileURL(path.join(T, "src", "kit.js")).href);
const k = makeKit(props);
assert.equal(k.W("chart", "grows"), 5.6); assert.ok(Math.abs(k.snap(5.6) - 5.4) < 1e-9); assert.equal(k.u, 1 / 3);
assert.deepEqual(k.words("hook").map((w) => w.t), VO.hook.words.map((w) => w.t), "display words align to spoken words");
assert.ok(Math.abs(k.easing("cubic-bezier(0.4, 0, 0.2, 1)")(0.5) - 0.7) < 0.15 && k.easing("quad.inOut")(0.5) === 0.5, "easing");
assert.throws(() => k.W("chart", "nope"), /not in VO line/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelwright-rm-"));
const fixture = (name) => {
  const D = path.join(tmp, name);
  fs.mkdirSync(path.join(D, "film"), { recursive: true });
  fs.writeFileSync(path.join(D, "project.json"), JSON.stringify({ renderer: "remotion", fps: 30, width: 640, height: 360 }));
  fs.writeFileSync(path.join(D, "film", "data.js"), `window.PROJECT=${JSON.stringify(PROJECT)};\nwindow.VO=${JSON.stringify(VO)};\nwindow.MUSIC=${JSON.stringify(MUSIC)};\n`);
  return D;
};
const run = (D, mode, a = [], env = {}) => spawnSync(process.execPath, ["-e", `const P = JSON.parse(require("fs").readFileSync(${JSON.stringify(path.join(D, "project.json"))}, "utf8"));
import(${JSON.stringify(pathToFileURL(path.join(ROOT, "tools", "renderers", "remotion.mjs")).href)}).then((m) => m.default(${JSON.stringify(D)}, P, ${JSON.stringify(mode)}, ${JSON.stringify(a)}))`],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PAGES: "1", ...env } });

try {
  // no TTY, no Remotion: template copied, notice shown, nothing installed, exit 1
  const D0 = fixture("refuse"), r0 = run(D0, "info");
  assert.equal(r0.status, 1, "must exit 1 without a TTY");
  assert.match(r0.stdout + r0.stderr, /not open source/i, "licence notice printed");
  assert.match(r0.stdout + r0.stderr, /npm install/, "says how to install");
  assert.ok(fs.existsSync(path.join(D0, "rm", "src", "Film.jsx")) && !fs.existsSync(path.join(D0, "rm", "node_modules")), "template copied, nothing installed");
  console.log("remotion selfcheck: template, pins, licence notice, film.mjs/kit.js in Node, no-TTY refusal OK");

  const NM = process.env.REMOTION_NODE_MODULES;
  if (!NM || !fs.existsSync(path.join(NM, "remotion", "package.json"))) {
    console.log("remotion selfcheck SKIP: Remotion not installed (opt-in)");
    process.exit(0);
  }

  // ── with Remotion ──
  const D = fixture("film");
  fs.cpSync(T, path.join(D, "rm"), { recursive: true });
  fs.symlinkSync(path.resolve(NM), path.join(D, "rm", "node_modules"), "junction");
  const ok = (r) => { assert.equal(r.status, 0, r.stdout + r.stderr); return r; };
  ok(run(D, "info"));
  const tl = JSON.parse(fs.readFileSync(path.join(D, "timeline.json"), "utf8"));
  assert.equal(tl.DUR, 8.95); assert.ok(tl.cues.length && tl.VO.hook);
  const F0 = Math.round(k.snap(k.W("chart", "grows")) * 30) - 1, FR = [0, 1, 2, 3, 4, 5].map((i) => F0 + i * 2);   // bars growing
  const hashes = (d) => Object.fromEntries(fs.readdirSync(d).filter((f) => /^frame_\d{6}\.png$/.test(f))
    .map((f) => [Number(f.slice(6, 12)), crypto.createHash("sha256").update(fs.readFileSync(path.join(d, f))).digest("hex")]));
  ok(run(D, "frames", [String(F0), String(F0 + 11)]));   // forward, one tab
  const fwd = hashes(path.join(D, "frames"));
  assert.deepEqual(Object.keys(fwd).map(Number), Array.from({ length: 11 }, (_, i) => F0 + i), "frames/frame_%06d.png, numbered by frame");
  const shuf = path.join(tmp, "shuffled");
  for (const f of [FR[3], FR[0], FR[5], FR[1], FR[4], FR[2]]) ok(run(D, "frames", [String(f), String(f + 1)], { REELWRIGHT_FRAMES_DIR: shuf }));
  const back = hashes(shuf);
  for (const f of FR) assert.equal(back[f], fwd[f], `frame ${f}: shuffled single render differs from the forward one`);
  assert.equal(new Set(FR.map((f) => fwd[f])).size, FR.length, "frames must actually move");
  ok(run(D, "stills", ["0.5,6.2"]));
  assert.deepEqual(fs.readdirSync(path.join(D, "stills")).sort(), ["t000.50.jpg", "t006.20.jpg"], "stills/t<time>.jpg");
  assert.ok(fs.existsSync(path.join(D, "film", "index.html")), "film/index.html (QA page host) written");
  console.log(`remotion selfcheck: ${FR.length} frames forward vs shuffled identical, frames/stills names OK`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
