// measure <video> probe|cuts|frames [--json] [--threshold 0.3] [--at 1.5,4,9 | --count 8] [--out <dir>]
//                  numbers about any mp4/mov/webm (ffprobe + ffmpeg, offline, no model): `probe` = size, fps, codecs, duration,
//                  audio; `cuts` = scene-change times (threshold 0..1, lower finds more); `frames` = jpgs at --at times or
//                  --count evenly spaced ones into --out (default <video>-frames/). Face detection is not included.
import path from "node:path";
import { probe, cuts, frames } from "../videotools.mjs";

export default async ({ args }) => {
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
  const json = args.includes("--json") && !!args.splice(args.indexOf("--json"), 1);
  const thr = +opt("--threshold", 0.3), at = opt("--at"), count = +opt("--count", 8), out = opt("--out");
  const [file, what = "probe"] = args;
  const usage = () => { console.log("usage: reelwright measure <video> probe|cuts|frames [--json] [--threshold 0.3] [--at t,t | --count N] [--out dir]"); process.exit(1); };
  if (!file) usage();
  try {
    if (what === "probe") {
      const p = probe(file);
      if (json) return console.log(JSON.stringify(p, null, 2));
      const v = p.video, a = p.audio;
      console.log(`${path.basename(file)}: ${p.duration.toFixed(2)} s, ${(p.size / 1e6).toFixed(2)} MB, ${Math.round(p.bitrate / 1000)} kb/s, ${p.container}`);
      console.log(v ? `  video  ${v.codec} ${v.width}x${v.height} @ ${v.fps} fps ${v.pixFmt}${v.frames ? `, ${v.frames} frames` : ""}` : "  no video");
      console.log(a ? `  audio  ${a.codec} ${a.sampleRate} Hz, ${a.channels} ch` : "  no audio");
    } else if (what === "cuts") {
      const c = cuts(file, thr);
      if (json) return console.log(JSON.stringify({ threshold: thr, cuts: c }, null, 2));
      console.log(`${c.length} cuts at threshold ${thr}: ${c.map((t) => t.toFixed(2)).join(", ") || "none"}`);
    } else if (what === "frames") {
      const d = probe(file).duration;
      const times = at ? at.split(",").map(Number) : Array.from({ length: count }, (_, i) => +((i + 0.5) * d / count).toFixed(3));
      if (times.some((t) => !Number.isFinite(t))) usage();
      const r = frames(file, times, path.resolve(out || file.replace(/\.[^./\\]+$/, "") + "-frames"));
      if (json) return console.log(JSON.stringify(r, null, 2));
      for (const f of r) console.log(`${f.t.toFixed(2)} s  ${f.file}`);
    } else usage();
  } catch (e) { console.log(`measure: ${e.message}`); process.exit(1); }
};
