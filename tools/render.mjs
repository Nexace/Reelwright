// node tools/render.mjs <project> <mode>
//   info                 → <project>/timeline.json (duration, VO, SFX cues) — mix.py reads it
//   stills 1.2,8.5,...     → <project>/stills/t<time>.jpg   (check moments before a full render)
//   frames [from] [to]   → <project>/frames/f%05d.jpg      (PAGES browser pages in parallel, default 4)
//   encode               → <project>/<project.json "out">  (frames + mix.wav, H.264 + AAC)
// Look: project.json "style" and brand.json → <page dir>/theme.css (tools/theme.mjs).
// Frame size: project.json width/height (default 1920×1080; 1080×1920 for vertical), or REELWRIGHT_SIZE (--formats).
//
// Renderer contract: project.json "renderer" (default "pvk") picks tools/renderers/<name>.mjs, whose default
// export is `async (projectDir, projectJson, mode, extraArgs)` and implements the four modes above with the
// same outputs: info → timeline.json {DUR, cues, VO}, stills → stills/*.jpg, frames → frames/ as .jpg or .png in
// time order (pvk f%05d.jpg, hyperframes frame_%06d.png), encode → the mp4 at "out" (frames + mix.wav). Everything else in the pipeline only reads those files.
import fs from "node:fs";
import path from "node:path";
import { writeTheme } from "./theme.mjs";

const [proj, mode, ...rest] = process.argv.slice(2);
if (!proj || !mode) { console.log("usage: node tools/render.mjs <project> info|stills|frames|encode"); process.exit(1); }
const DIR = path.resolve(proj);
const P = JSON.parse(fs.readFileSync(path.join(DIR, "project.json"), "utf8"));
const style = process.env.REELWRIGHT_STYLE;   // `--style <name>` builds another look without editing project.json
const fmt = process.env.REELWRIGHT_FORMAT;    // `--formats` (bin/reelwright.mjs): this format's size in REELWRIGHT_SIZE
if (fmt) [P.width, P.height] = process.env.REELWRIGHT_SIZE.split("x").map(Number);
const suffix = [style, fmt].filter(Boolean).map((s) => "-" + s).join("");
if (suffix) P.out = (P.out || "out/film.mp4").replace(/(\.mp4)?$/, `${suffix}.mp4`);
writeTheme(DIR, P);
const name = P.renderer || "pvk";
const file = new URL(`./renderers/${name}.mjs`, import.meta.url);
if (!/^[\w-]+$/.test(name) || !fs.existsSync(file)) { console.error(`unknown renderer "${name}" in project.json (no tools/renderers/${name}.mjs)`); process.exit(1); }
await (await import(file)).default(DIR, P, mode, rest);
