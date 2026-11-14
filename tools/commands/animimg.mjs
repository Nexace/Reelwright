// animimg <file.gif|apng|webp|avif> [dir] [--width N] [--fps N]   split an animated image into PNG frames + <name>.frames.json (real frame
//                  times, ffmpeg at build) for KIT.animatedImage (tools/p5-media.js; docs/playbook/p5-media.md). dir defaults to
//                  <project>/assets/<name>/. Offline; the film shows frame i from render(t), so it seeks in any order.
import path from "node:path";
import { extractAnimation } from "../p5-animimg.mjs";

export default async ({ proj, args }) => {
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? Number(args.splice(i, 2)[1]) : undefined; };
  const width = opt("--width"), fps = opt("--fps");
  const [file, dir] = args;
  if (!file) { console.log("usage: reelwright animimg <file> [dir] [--width N] [--fps N]"); process.exit(1); }
  try {
    const out = path.resolve(dir || path.join(proj, "assets", path.basename(file).replace(/\.[^.]+$/, "")));
    const m = extractAnimation(path.resolve(file), out, { width, fps });
    console.log(`${m.frames.length} frames, ${m.total}s, ${m.w}x${m.h} → ${out}  (KIT.animatedImage(meta, { base: 'assets/…/' }))`);
  } catch (e) { console.error(e.message); process.exit(1); }
};
