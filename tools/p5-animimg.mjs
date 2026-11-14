// extractAnimation(file, outDir, { width, fps, maxFrames }) → meta: an animated image (GIF, APNG, WebP, AVIF; anything ffmpeg decodes) split
// into numbered PNG frames with their real display times, written as <outDir>/<name>.frames.json for KIT.animatedImage (tools/p5-media.js).
// Build time only (ffmpeg + ffprobe); the film's render(t) just shows frame i. fps thins a long animation (frames are resampled at that rate).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.error || r.status !== 0) throw new Error(`${cmd} failed: ${(r.error && r.error.message) || r.stderr.split("\n").slice(-4).join(" ")}`);
  return r.stdout;
};

export function extractAnimation(file, outDir, { width, fps, maxFrames = 400 } = {}) {
  if (!fs.existsSync(file)) throw new Error(`animimg: no file ${file}`);
  fs.mkdirSync(outDir, { recursive: true });
  const name = path.basename(file).replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_");
  const probe = JSON.parse(run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "frame=pts_time,pkt_duration_time,duration_time:stream=width,height:format=duration", "-of", "json", file]));
  const fr = probe.frames || [];
  if (!fr.length) throw new Error(`animimg: ffmpeg found no frames in ${file}`);
  const pts = fr.map((f) => Number(f.pts_time ?? 0)), total = Number(probe.format?.duration) || 0;
  let durations = fr.map((f, i) => {
    const d = Number(f.duration_time ?? f.pkt_duration_time);
    return Number.isFinite(d) && d > 0 ? d : i + 1 < pts.length ? pts[i + 1] - pts[i] : Math.max(0.04, total - pts[i]);
  });
  const vf = [fps ? `fps=${fps}` : null, width ? `scale=${width}:-2:flags=lanczos` : null].filter(Boolean).join(",");
  const pat = path.join(outDir, `${name}_%04d.png`);
  for (const f of fs.readdirSync(outDir)) if (f.startsWith(name + "_") && f.endsWith(".png")) fs.rmSync(path.join(outDir, f));
  run("ffmpeg", ["-v", "error", "-y", "-i", file, "-fps_mode", fps ? "cfr" : "passthrough", ...(vf ? ["-vf", vf] : []), pat]);
  const frames = fs.readdirSync(outDir).filter((f) => f.startsWith(name + "_") && f.endsWith(".png")).sort();
  if (fps) durations = frames.map(() => 1 / fps);
  if (frames.length !== durations.length) durations = frames.map((_, i) => durations[Math.min(i, durations.length - 1)]);
  if (frames.length > maxFrames) throw new Error(`animimg: ${frames.length} frames (max ${maxFrames}); pass --fps or --width to thin it`);
  const st = probe.streams?.[0] || {};
  const meta = { src: path.basename(file), frames, durations: durations.map((d) => +d.toFixed(5)), w: st.width, h: st.height, total: +durations.reduce((a, b) => a + b, 0).toFixed(4) };
  fs.writeFileSync(path.join(outDir, `${name}.frames.json`), JSON.stringify(meta));
  return meta;
}
