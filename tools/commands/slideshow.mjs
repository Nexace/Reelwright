// slideshow <folder> [name] [--seconds 3] [--transition fade|a,b,c] [--tdur 0.6] [--zoom 0.05] [--clip-max 8] [--size 1920x1080] [--fit cover|contain] [--out <dir>]
//                  a folder of images and clips → a HyperFrames film at projects/<name> (default <folder>-slideshow): one layer per slide
//                  (natural file order), KIT.transition between neighbours (a comma list cycles; none = cuts), a slow zoom on stills, music bed.
//                  Clips play from their start for their own length, up to --clip-max seconds. Edit hf/slides.js (hold per slide, order), then
//                  `all <name>`. Offline; nothing is installed. Also the studio's Slideshow tab (its project's own slideshows/<name>/).
import path from "node:path";
import { buildSlideshow, TRANSITIONS } from "../slideshow.mjs";

export default async function slideshow({ args }) {
  const take = (f) => { const i = args.indexOf(f); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const num = (f) => { const v = take(f); if (v === undefined) return undefined; if (!/^\d+(\.\d+)?$/.test(v)) { console.error(`${f} takes a number, not "${v}"`); process.exit(1); } return Number(v); };
  const opts = { seconds: num("--seconds"), tdur: num("--tdur"), zoom: num("--zoom"), clipMax: num("--clip-max"),
    transition: take("--transition"), size: take("--size"), fit: take("--fit"), style: process.env.REELWRIGHT_STYLE };
  for (const k of Object.keys(opts)) if (opts[k] === undefined) delete opts[k];
  const out = take("--out"), [folder, name] = args;
  if (!folder) { console.log(`usage: reelwright slideshow <folder> [name] [--seconds N] [--transition ${TRANSITIONS.slice(0, 4).join("|")}|…] [--tdur N] [--zoom N] [--clip-max N] [--size WxH] [--fit cover|contain] [--out <dir>]`); process.exit(1); }
  const dest = out ? path.resolve(out) : path.join("projects", name || path.basename(path.resolve(folder)).replace(/[^\w-]+/g, "-").toLowerCase() + "-slideshow");
  try {
    const r = buildSlideshow(folder, dest, opts);
    const rel = path.relative(process.cwd(), r.dest) || r.dest;
    console.log(`created ${rel}: ${r.count} slide(s) (${r.clips} clip(s)), ${r.dur} s, ${r.width}x${r.height}`);
    console.log(`then: reelwright all ${rel.startsWith("projects") ? path.basename(rel) : rel}   (hf/slides.js holds the order and the seconds per slide)`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
