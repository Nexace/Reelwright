// Shared fixture for the p1-* self-checks: a tiny HyperFrames project (320×180, 10 fps, about 1.5 s) driven by composition
// variables, with a hand-made voiceover (silent mp3 + word times), so a real `film` runs offline in seconds. Run directly it
// checks only that the fixture builds and its page loads. Used by p1-variables, p1-batch, p1-stills, p1-compare.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

export const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
export const W = 320, H = 180;
export const DECLS = [
  { id: "title", type: "string", label: "Title", default: "Default title" },
  { id: "accent", type: "color", label: "Accent", default: "#2f9e6b" },
  { id: "bars", type: "number", label: "Bars", default: 3 },
  { id: "tone", type: "enum", label: "Tone", default: "calm", options: ["calm", "loud"] },
  { id: "dark", type: "boolean", label: "Dark", default: false },
  { id: "face", type: "font", label: "Face", default: "Arial" },
  { id: "logo", type: "image", label: "Logo", default: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='%23e33'/></svg>" },
];
export const tmpdir = (tag) => fs.mkdtempSync(path.join(os.tmpdir(), `p1-${tag}-`));

const INDEX = `<!doctype html>
<html><head><meta charset="utf-8"><link rel="stylesheet" href="kit/kit.css"><link rel="stylesheet" href="theme.css">
<style>
 #stage { background: #f6f4ef; font: 600 24px Arial, sans-serif; overflow: hidden; }
 #stage div, #stage h1, #stage img { position: absolute; margin: 0; }
 h1 { left: 12px; top: 10px; font-size: 26px; }
 img { left: 12px; top: 60px; width: 40px; height: 40px; }
 .bar { background: var(--accent); height: 24px; top: 120px; }
 .panel { left: 150px; top: 20px; width: 150px; height: 70px; }
</style></head>
<body>
<div id="root" data-composition-id="main" data-width="${W}" data-height="${H}"><div id="stage">
  <h1 data-var-text="title">Default title</h1><img data-var-src="logo" alt="">
</div></div>
<script src="kit-data.js"></script>
<script src="kit/engine.js"></script>
<script src="kit/variables.js"></script>
<script src="kit-vars.js"></script>
<script src="film.js"></script>
</body></html>
`;
// the bars grow with t; panel colour follows "tone" and "dark"; every value comes from KIT.vars()
const FILM = `'use strict';
const v = KIT.vars(), S = KIT.stage;
if (v.tone === 'loud' && v.dark) throw new Error('loud + dark is not allowed');   // lets a check make one row fail at load
const bars = Array.from({ length: Math.round(v.bars) }, (_, i) => { const b = KIT.el('div', 'bar', S); b.style.left = 12 + i * 34 + 'px'; return b; });
const panel = KIT.el('div', 'panel', S);
panel.style.background = v.dark ? '#111' : v.tone === 'loud' ? '#e33' : '#9bc';
panel.style.fontFamily = typeof v.face === 'string' ? v.face : v.face.name;
KIT.start({ dur: KIT.V('a').end + 0.4, render: (t) => bars.forEach((b, i) => { b.style.width = 28 * KIT.seg(t, 0.1 + i * 0.1, 0.7 + i * 0.1) + 'px'; }) });
`;

// → project dir; extra project.json keys via `p`; the page is hf/index.html
export function makeProject(dir, p = {}) {
  // renderer "pvk": the page is film/index.html and loads the kit from ../../../tools, so the project must sit two levels under the repo
  const pvk = p.renderer === "pvk", page = path.join(dir, pvk ? "film" : "hf");
  fs.mkdirSync(page, { recursive: true });
  fs.mkdirSync(path.join(dir, "vo"), { recursive: true });
  fs.writeFileSync(path.join(dir, "project.json"), JSON.stringify({ title: "p1 fixture", renderer: "hyperframes", out: "out/fx.mp4", fps: 10, width: W, height: H,
    lead: 0.1, tail: 0.2, loudness: -14, music: { bpm: 120 }, lines: [{ id: "a", gap: 0, text: "hello there" }], variables: DECLS, ...p }, null, 2));
  fs.writeFileSync(path.join(dir, "vo", "lines.json"), JSON.stringify({ a: { text: "hello there", words: [{ w: "hello", t: 0, d: 0.35 }, { w: "there", t: 0.4, d: 0.35 }] } }));
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "0.8", path.join(dir, "vo", "a.mp3")]);
  assert.equal(r.status, 0, "ffmpeg: " + r.stderr);
  fs.writeFileSync(path.join(page, "index.html"), pvk ? INDEX.replace(/kit\/(kit\.css|engine\.js|variables\.js)/g, "../../../tools/$1").replace("kit-data.js", "data.js") : INDEX);
  fs.writeFileSync(path.join(page, "film.js"), FILM);
  fs.writeFileSync(path.join(page, "theme.css"), "/* none */\n");
  fs.writeFileSync(path.join(page, "kit-vars.js"), "window.__hfDeclared=" + JSON.stringify(p.variables || DECLS) + ";window.__hfVariables={};\n");
  return dir;
}

// The two shared-file edits package P1 needs in bin/reelwright.mjs (the patch, tools/selfcheck/p1-bin.patch.txt and the alias below).
// Until they are applied, the checks run a patched COPY (bin/.p1-bin.mjs, deleted on exit); once applied they run bin/reelwright.mjs itself.
const BIN = path.join(ROOT, "bin", "reelwright.mjs"), COPY = path.join(ROOT, "bin", ".p1-bin.mjs");
const CMD_OLD = 'const [cmd = "help", ...args] = process.argv.slice(2);';
const CMD_NEW = `const [cmd0 = "help", ...args] = process.argv.slice(2);
// \`stills\` with --at, --frames, --range, --zoom or --against is tools/commands/stills2.mjs (not together with --formats)
const cmd = cmd0 === "stills" && !args.includes("--formats") && args.some((a) => /^--(at|frames|range|zoom|against|pad|min-ssim)$/.test(a)) ? "stills2" : cmd0;`;
let bin;
export function binPath() {
  return (bin ||= makeBin());
}
function makeBin() {
  let s = fs.readFileSync(BIN, "utf8");
  const needVars = !s.includes("--variables-file"), needAlias = !s.includes('"stills2"');
  if (!needVars && !needAlias) return BIN;
  if (needVars) { assert.ok(s.includes("function isDir(p)")); s = s.replace("function isDir(p)", fs.readFileSync(path.join(ROOT, "tools", "selfcheck", "p1-bin.patch.txt"), "utf8") + "\nfunction isDir(p)"); }
  if (needAlias) { assert.ok(s.includes(CMD_OLD)); s = s.replace(CMD_OLD, CMD_NEW); }
  fs.writeFileSync(COPY, s);
  process.once("exit", () => fs.rmSync(COPY, { force: true }));
  return COPY;
}

// run reelwright <cmd> … ; returns { status, out }
export function rw(...a) {
  const env = { ...process.env, PAGES: "2" };
  const r = spawnSync(process.execPath, [binPath(), ...a], { encoding: "utf8", cwd: ROOT, env });
  return { status: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

// ffmpeg → the RGB of the pixel (x, y) in frame at time t of a video/image
export function pixel(file, x, y, t = 0) {
  const r = spawnSync("ffmpeg", ["-v", "error", ...(t ? ["-ss", String(t)] : []), "-i", file, "-vf", `format=rgb24,crop=1:1:${x}:${y}`, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
  assert.equal(r.status, 0, "ffmpeg pixel: " + r.stderr);
  return [...r.stdout];
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = makeProject(tmpdir("fixture"));
  assert.ok(fs.existsSync(path.join(dir, "hf", "film.js")));
  const sched = spawnSync(process.env.PYTHON || "python3", [path.join(ROOT, "tools", "sched.py"), dir], { encoding: "utf8" });
  assert.equal(sched.status, 0, sched.stderr);
  console.log("p1 fixture: builds, sched places its voiceover line");
  fs.rmSync(dir, { recursive: true, force: true });
}
