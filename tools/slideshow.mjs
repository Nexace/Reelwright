// tools/slideshow.mjs — a folder of images and clips → a HyperFrames film with transitions (hyperframes:H5 Slideshow, native).
// buildSlideshow(src, dest, opts) copies the media into <dest>/hf/slides/, writes project.json, hf/index.html, hf/slides.js (the slide
// list: order, hold per slide, kind) and hf/film.js (one full-stage layer per slide, KIT.transition between neighbours). Nothing is
// downloaded or installed. The CLI is tools/commands/slideshow.mjs; the studio's Slideshow tab calls the same command.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// KIT.transition.names (tools/transitions.js); tools/selfcheck/slideshow.mjs compares the two in a browser
export const TRANSITIONS = ["cut", "fade", "fadeThrough", "slide", "push", "wipe", "barnDoor", "blinds", "clockWipe", "iris", "flip", "cube",
  "zoom", "pushCut", "flash", "lightLeak", "brush", "glitch", "none"];
export const IMAGE = /\.(jpe?g|png|webp|gif|avif|svg)$/i, CLIP = /\.(mp4|mov|webm|m4v)$/i;
const SIZES = /^(\d{3,5})x(\d{3,5})$/;

const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
const clipSeconds = (f) => {   // ffprobe duration, or 0 when it cannot be read
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" });
  const d = parseFloat(r.stdout); return Number.isFinite(d) ? d : 0;
};

export function buildSlideshow(src, dest, o = {}) {
  const { seconds = 3, tdur = 0.6, zoom = 0.05, clipMax = 8, size = "1920x1080", fit = "cover", style = "dark-tech", title } = o;
  const types = (o.transition || "fade").split(",").map((s) => s.trim()).filter(Boolean);
  const bad = types.find((t) => !TRANSITIONS.includes(t));
  if (bad) throw new Error(`unknown transition "${bad}" (one of ${TRANSITIONS.join(", ")}; a comma list cycles through them)`);
  if (!(seconds >= 0.5 && seconds <= 60)) throw new Error("--seconds is 0.5 to 60");
  if (!(tdur >= 0 && tdur < seconds)) throw new Error("--tdur is 0 up to (but not including) --seconds");
  if (!(zoom >= 0 && zoom <= 0.5)) throw new Error("--zoom is 0 to 0.5");
  if (!SIZES.test(size)) throw new Error("--size is WIDTHxHEIGHT, e.g. 1920x1080");
  if (!["cover", "contain"].includes(fit)) throw new Error("--fit is cover or contain");
  if (!fs.statSync(src, { throwIfNoEntry: false })?.isDirectory()) throw new Error(`${src} is not a folder`);
  if (fs.existsSync(dest)) throw new Error(`${dest} already exists`);
  const files = fs.readdirSync(src, { withFileTypes: true }).filter((e) => e.isFile() && !e.name.startsWith(".") && (IMAGE.test(e.name) || CLIP.test(e.name)))
    .map((e) => e.name).sort(natural);
  if (!files.length) throw new Error(`${src} has no images (${IMAGE}) or clips (${CLIP})`);
  if (files.length > 300) throw new Error(`${files.length} files: a slideshow takes up to 300`);
  const [width, height] = size.split("x").map(Number), media = path.join(dest, "hf", "slides");
  fs.mkdirSync(media, { recursive: true });
  const items = files.map((name, i) => {
    const to = `${String(i + 1).padStart(3, "0")}-${name.replace(/[^\w.-]+/g, "_")}`;
    fs.copyFileSync(path.join(src, name), path.join(media, to));
    if (IMAGE.test(name)) return { src: `slides/${to}`, type: "image", hold: seconds };
    const d = clipSeconds(path.join(media, to));
    if (!(d > 0)) throw new Error(`${name}: ffprobe cannot read it`);
    return { src: `slides/${to}`, type: "video", hold: +Math.min(Math.max(d, 0.5), clipMax).toFixed(2), clip: +d.toFixed(2) };
  });
  const hasClip = items.some((x) => x.type === "video");
  const data = { tdur, zoom, fit, transitions: types, items };
  const dur = +items.reduce((a, x) => a + x.hold, 0).toFixed(2);
  fs.writeFileSync(path.join(dest, "project.json"), JSON.stringify({
    title: title || path.basename(dest), renderer: "hyperframes", style, out: `out/${path.basename(dest)}.mp4`, width, height, fps: 30,
    lead: 0, tail: 0, music: { bpm: 100, duck_db: -10, style: "chill" }, lines: [], loudness: -14 }, null, 2) + "\n");
  fs.writeFileSync(path.join(dest, "hf", "slides.js"), `// The slide list of this slideshow (reelwright slideshow). Edit hold (seconds on screen), order or transitions, then \`film\`.\n` +
    `window.SLIDES = ${JSON.stringify(data, null, 2)};\n`);
  fs.writeFileSync(path.join(dest, "hf", "index.html"), `<!doctype html>
<!-- A slideshow: tools/slideshow.mjs. Layers are built by film.js from slides.js; every transition is KIT.transition (a pure function of t). -->
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="kit/kit.css">
<link rel="stylesheet" href="theme.css">
<style>
  body { background: var(--kit-bg); }
  .slide { left: 0; top: 0; width: 100%; height: 100%; overflow: hidden; background: var(--kit-bg); }
  .slide > img, .slide > video { position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: ${fit}; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-width="${width}" data-height="${height}"><div id="stage"></div></div>
<script src="kit-data.js"></script>
<script src="kit/engine.js"></script>
<script src="kit/transitions.js"></script>${hasClip ? '\n<script src="kit/media.js"></script>' : ""}
<script src="slides.js"></script>
<script src="film.js"></script>
</body>
</html>
`);
  fs.writeFileSync(path.join(dest, "hf", "film.js"), `// Slideshow film, generated by \`reelwright slideshow\` from hf/slides.js. Slide i is on screen from the moment its transition starts
// until the next one ends; the film is as long as the holds added up. Pure function of t: edit slides.js or this file, then \`film\`.
'use strict';
const { el, seg } = KIT, S = window.SLIDES;
let at = 0;
const slides = S.items.map((it, i) => {
  const start = at; at += it.hold;
  const layer = el('div', 'slide'), end = start + it.hold + (i < S.items.length - 1 ? S.tdur : 0);
  let m;
  if (it.type === 'video') m = KIT.video(it.src, { id: 'slide' + i, start, dur: Math.min(it.clip, end - start), parent: layer });
  else { m = el('img', '', layer); KIT.img(m, it.src); }
  return { layer, m, start, end, image: it.type === 'image' };
});
const DUR = at;
const trans = slides.slice(1).map((s, i) => KIT.transition(S.transitions[i % S.transitions.length], {
  from: slides[i].layer, to: s.layer, at: s.start, dur: Math.max(S.tdur, 0.01) }));

function render(t) {
  for (const x of trans) x.set(t);
  if (S.zoom) for (const s of slides) if (s.image) s.m.style.transform = 'scale(' + (1 + S.zoom * seg(t, s.start, s.end)).toFixed(4) + ')';
}
KIT.start({ dur: DUR, render });
`);
  return { dest, count: items.length, clips: items.filter((x) => x.type === "video").length, dur, width, height };
}
