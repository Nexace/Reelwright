// node tools/render.mjs <project> <mode>
//   info                 → <project>/timeline.json (duration, VO, SFX cues) — mix.py reads it
//   stills 1.2,8.5,...     → <project>/stills/t<time>.jpg   (check moments before a full render)
//   frames [from] [to]   → <project>/frames/f%05d.jpg      (PAGES browser pages in parallel, default 4)
//   encode               → <project>/<project.json "out">  (frames + mix.wav, H.264 + AAC)
// Frame size: project.json width/height (default 1920×1080; 1080×1920 for vertical).
//
// Renderer contract: project.json "renderer" (default "pvk") picks tools/renderers/<name>.mjs, whose default
// export is `async (projectDir, projectJson, mode, extraArgs)` and implements the four modes above with the
// same outputs: info → timeline.json {DUR, cues, VO}, stills → stills/*.jpg, frames → frames/f%05d.jpg from 0,
// encode → the mp4 at "out" (frames + mix.wav). Everything else in the pipeline only reads those files.
import fs from "node:fs";
import path from "node:path";

const [proj, mode, ...rest] = process.argv.slice(2);
if (!proj || !mode) { console.log("usage: node tools/render.mjs <project> info|stills|frames|encode"); process.exit(1); }
const DIR = path.resolve(proj);
const P = JSON.parse(fs.readFileSync(path.join(DIR, "project.json"), "utf8"));
const name = P.renderer || "pvk";
const file = new URL(`./renderers/${name}.mjs`, import.meta.url);
if (!/^[\w-]+$/.test(name) || !fs.existsSync(file)) { console.error(`unknown renderer "${name}" in project.json (no tools/renderers/${name}.mjs)`); process.exit(1); }
await (await import(file)).default(DIR, P, mode, rest);
