// range [video] --frames 0-9,30,100- [--every-nth-frame N] [--duration S] [--stills dir [--format jpg|png] [--jpeg-quality 1-100]] [--out clip.mp4] [--dry-run]
//                  cut a frame selection out of a finished film (Remotion --frames / --every-nth-frame / --duration). Frames are numbered from 0; A-B is
//                  inclusive, A- runs to the last frame, N,N,… lists. every-nth keeps every Nth frame of the selection (counted from its first),
//                  duration S keeps the first S seconds of it. Output: a clip at the film's frame rate, or with --stills one image per frame named
//                  f<frame, 5 digits>.<ext> (the numbers are the film's, so `--frames 0,30,60` gives f00000, f00030, f00060). It works on the
//                  video (a silent clip: sparse frames have no matching sound), so it serves both renderers (the hyperframes renderer renders the whole film). video defaults to the project's "out" mp4.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { frameList, selectExpr } from "../p9-frames.mjs";
import { stillArgs } from "../p9-encode.mjs";

const probe = (f) => {
  const r = spawnSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames,r_frame_rate", "-of", "csv=p=0", f], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("ffprobe: " + r.stderr);
  const [rate, n] = r.stdout.trim().split(",");
  const [a, b] = rate.split("/").map(Number);
  return { total: Number(n), fps: a / (b || 1) };   // "30/1" → 30
};

export default async ({ proj, args }) => {
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const dry = args.includes("--dry-run"); if (dry) args.splice(args.indexOf("--dry-run"), 1);
  const spec = opt("--frames"), every = Number(opt("--every-nth-frame") || 1), dur = opt("--duration"), stills = opt("--stills"), out = opt("--out");
  const fmt = opt("--format") || "jpg", q = opt("--jpeg-quality");
  let src = args[0];
  if (!src) { const pj = path.join(proj, "project.json"); src = fs.existsSync(pj) ? path.join(proj, JSON.parse(fs.readFileSync(pj, "utf8")).out || "out/film.mp4") : undefined; }
  if (!src || !fs.existsSync(src)) { console.error(`range: no video ${src ?? ""} (build the film first, or pass a file)`); process.exit(1); }
  try {
    const { total, fps } = probe(src), list = frameList(spec, { total, every, duration: dur === undefined ? undefined : Number(dur), fps });
    console.log(`${list.length} of ${total} frames (${list.length > 8 ? list.slice(0, 6).join(",") + ",…," + list[list.length - 1] : list.join(",")})`);
    if (dry) return;
    const sel = `select='${selectExpr(list)}'`, ff = (...a) => { const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", path.resolve(src), ...a], { encoding: "utf8" }); if (r.status !== 0) throw new Error("ffmpeg: " + r.stderr); };
    if (stills) {
      if (!["jpg", "png"].includes(fmt)) throw new Error("--format is jpg or png");
      const dir = path.resolve(stills); fs.mkdirSync(dir, { recursive: true });
      const tmp = path.join(dir, ".range-%06d." + fmt);
      ff("-vf", sel, "-fps_mode", "passthrough", ...(fmt === "jpg" ? stillArgs({ jpegQuality: q === undefined ? undefined : Number(q) }) : []), tmp);
      list.forEach((f, i) => fs.renameSync(tmp.replace("%06d", String(i + 1).padStart(6, "0")), path.join(dir, `f${String(f).padStart(5, "0")}.${fmt}`)));
      console.log("→", dir);
    } else {
      const file = path.resolve(out || src.replace(/\.[^.]+$/, "") + "-range.mp4");
      ff("-vf", `${sel},setpts=N/FRAME_RATE/TB`, "-an", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(fps), file);
      console.log("→", file);
    }
  } catch (e) { console.error(e.message); process.exit(1); }
};
