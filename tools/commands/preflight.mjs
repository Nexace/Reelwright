// preflight [project] [--json]   before a render: the disk the frames will need (frames/ plus the frame cache), the disk that is free, and whether
//                        the render fits with 10% to spare. Exit 1 if it would not fit. An estimate: a jpeg frame at quality 94 is about 0.25 byte
//                        per pixel (pvk, and the cache holds a second copy), a png frame about 1.4 bytes per pixel (alpha, hyperframes).
import fs from "node:fs";
import path from "node:path";

export const estimate = (P, dur) => {
  const w = P.width || 1920, h = P.height || 1080, fps = P.fps || (P.renderer === "hyperframes" ? 30 : 60), frames = Math.ceil(dur * fps);
  const png = P.renderer === "hyperframes" || !!P.output?.alpha, per = w * h * (png ? 1.4 : 0.25);
  return { frames, perFrame: Math.round(per), framesBytes: Math.round(frames * per), cacheBytes: png ? 0 : Math.round(frames * per), width: w, height: h, fps };
};

export default async function preflight({ proj, args }) {
  const P = JSON.parse(fs.readFileSync(path.join(proj, "project.json"), "utf8"));
  const tl = path.join(proj, "timeline.json");
  const dur = fs.existsSync(tl) ? JSON.parse(fs.readFileSync(tl, "utf8")).DUR : null;
  if (!dur) { console.log(`no ${tl}: run \`reelwright info ${path.basename(proj)}\` (or sched) first, so the film's length is known`); process.exit(1); }
  const e = estimate(P, dur), need = e.framesBytes + e.cacheBytes, st = fs.statfsSync(proj), free = st.bavail * st.bsize;
  const out = { duration: dur, ...e, needBytes: need, freeBytes: free, ok: need * 1.1 < free };
  const gb = (b) => (b / 1e9).toFixed(2) + " GB";
  if (args.includes("--json")) console.log(JSON.stringify(out));
  else console.log(`${e.frames} frames of ${e.width}x${e.height} (${dur.toFixed(1)} s at ${e.fps} fps): about ${gb(need)} on disk (${gb(e.framesBytes)} frames` +
    `${e.cacheBytes ? ` + ${gb(e.cacheBytes)} frame cache` : ""}); ${gb(free)} free: ${out.ok ? "fits" : "WILL NOT FIT — free space or run `clean` on old projects"}`);
  process.exit(out.ok ? 0 : 1);
}
