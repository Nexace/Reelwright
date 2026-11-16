// transcode [video] [--codec h264|h265|vp8|vp9|av1|prores|gif|mp3|aac|wav] [--out file] [--crf N] [--quality draft|looks|standard|high|delivery]
//                  [--preset name] [--video-bitrate 8M] [--max-bitrate 10M] [--buffer-size 20M] [--keyframe-interval N] [--pix-fmt yuv420p10le]
//                  [--color-space bt709] [--color-primaries bt709] [--color-trc bt709] [--color-range tv|pc] [--prores-profile hq] [--gif-fps 15]
//                  [--scale 0.5] [--hardware-acceleration auto|on|off] [--metadata key=value]…   a finished film (video defaults to the project's "out" mp4) into another codec, with the
//                  quality, pixel-format, colour-tag and metadata knobs of Remotion's `render` (Remotion 2.7.1 / 2.7.2 / 2.7.14); `--hardware-acceleration auto` uses
//                  VideoToolbox / NVENC / QSV / VAAPI for h264 and h265 when one works, `on` fails if none does (2.7.3). Audio-only codecs
//                  (mp3 aac wav) keep just the sound. Offline (ffmpeg). docs/playbook/codecs.md
import fs from "node:fs";
import path from "node:path";
import { transcode } from "../encode.mjs";

export default async ({ proj, args }) => {
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const num = (v) => (v === undefined ? undefined : Number(v)), meta = [];
  for (let i; (i = args.indexOf("--metadata")) >= 0; ) meta.push(args.splice(i, 2)[1]);
  const o = { codec: opt("--codec") ?? "h264", crf: num(opt("--crf")), quality: opt("--quality"), preset: opt("--preset"), videoBitrate: opt("--video-bitrate"), maxBitrate: opt("--max-bitrate"),
    bufferSize: opt("--buffer-size"), keyframeInterval: num(opt("--keyframe-interval")), pixFmt: opt("--pix-fmt"), colorSpace: opt("--color-space"), colorPrimaries: opt("--color-primaries"),
    colorTrc: opt("--color-trc"), colorRange: opt("--color-range"), prores: opt("--prores-profile"), gifFps: num(opt("--gif-fps")), scale: num(opt("--scale")), hardware: opt("--hardware-acceleration") ?? process.env.REELWRIGHT_HARDWARE, metadata: meta };
  const out = opt("--out");
  let src = args[0];
  if (!src) { const pj = path.join(proj, "project.json"); src = fs.existsSync(pj) ? path.join(proj, JSON.parse(fs.readFileSync(pj, "utf8")).out || "out/film.mp4") : undefined; }
  if (!src || !fs.existsSync(src)) { console.error(`transcode: no video ${src ?? ""} (build the film first, or pass a file)`); process.exit(1); }
  try { console.log("→", transcode(path.resolve(src), out && path.resolve(out), o)); }
  catch (e) { console.error(e.message); process.exit(1); }
};
