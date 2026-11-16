// encode.mjs: codecs, pixel format, colour tags and metadata for Remotion rows 2.7.1 / 2.7.2 / 2.7.14, on top of tools/render_opts.mjs (crf, bitrates, preset,
// keyframe interval, quality presets, resolution already live there). Pure argument builders plus one `transcode`; offline (ffmpeg).
//   CODECS               h264 h265 vp8 vp9 av1 prores gif mp3 aac wav (ext: the container each goes in)
//   codecArgs(codec, o)  → { ext, video: [ffmpeg args], audio: [ffmpeg args], audioOnly } for one output o =
//                        { crf, preset (x264 / x265 names, or an SVT-AV1 number), videoBitrate, maxBitrate, bufferSize, keyframeInterval, quality,
//                          pixFmt, prores (proxy|lt|422|hq|4444|4444xq), gifFps, scale }
//   colorArgs(o)         -colorspace / -color_primaries / -color_trc / -color_range tags from o.colorSpace (bt709|bt2020nc|smpte170m…), o.colorPrimaries,
//                        o.colorTrc, o.colorRange (tv|pc). Tags only: no pixel conversion.
//   colorFilter(o)       the same tags as a setparams filter (what makes primaries / trc stick)
//   metadataArgs(m)      { title, comment, key: value } or ["k=v", …] → -metadata pairs
//   transcode(src, out, o)  src (a video or a finished film's mp4) → out in the codec's container, audio kept; returns the path
//   stillArgs(o)         jpeg-quality 1 (best) to 100 → ffmpeg -q:v 2..31 for the jpg stills `range` and the renderers write
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { x264Args, vp9Args, PRESETS } from "./render_opts.mjs";

export const CODECS = ["h264", "h265", "vp8", "vp9", "av1", "prores", "gif", "mp3", "aac", "wav"];
const PRORES = { proxy: 0, lt: 1, "422": 2, hq: 3, "4444": 4, "4444xq": 5 };
const SVT = { veryslow: 2, slower: 3, slow: 4, medium: 6, fast: 8, faster: 9, veryfast: 10, superfast: 11, ultrafast: 12 };
const dropOpt = (a, k) => { const i = a.indexOf(k); if (i >= 0) a.splice(i, 2); return a; };
let encoders;
const has = (name) => (encoders ??= spawnSync("ffmpeg", ["-hide_banner", "-encoders"], { encoding: "utf8" }).stdout || "").includes(" " + name + " ");

export function colorArgs(o = {}) {
  if (o.colorRange && !["tv", "pc"].includes(o.colorRange)) throw new Error("color range is tv or pc");
  return [...(o.colorSpace ? ["-colorspace", o.colorSpace] : []), ...(o.colorPrimaries ? ["-color_primaries", o.colorPrimaries] : []),
    ...(o.colorTrc ? ["-color_trc", o.colorTrc] : []), ...(o.colorRange ? ["-color_range", o.colorRange] : [])];
}
// ffmpeg 7+ lets frame properties override the codec flags for primaries / trc, so the tags also go in as a `setparams` filter (put it in -vf)
export const colorFilter = (o = {}) => {
  const p = [o.colorSpace && `colorspace=${o.colorSpace}`, o.colorPrimaries && `color_primaries=${o.colorPrimaries}`, o.colorTrc && `color_trc=${o.colorTrc}`, o.colorRange && `range=${o.colorRange}`].filter(Boolean);
  return p.length ? "setparams=" + p.join(":") : null;
};
export function metadataArgs(m) {
  const pairs = Array.isArray(m) ? m : Object.entries(m || {}).map(([k, v]) => `${k}=${v}`);
  return pairs.flatMap((p) => { if (!/^[\w.-]+=/.test(p)) throw new Error(`metadata "${p}": use key=value`); return ["-metadata", p]; });
}
export const stillArgs = ({ jpegQuality } = {}) => {
  if (jpegQuality == null) return ["-q:v", "2"];
  if (!(jpegQuality >= 1 && jpegQuality <= 100)) throw new Error("jpeg quality is 1 to 100");
  return ["-q:v", String(Math.round(31 - (jpegQuality / 100) * 29))];   // 100 → 2 (ffmpeg's best useful), 1 → 31
};

export function codecArgs(codec, o = {}) {
  if (!CODECS.includes(codec)) throw new Error(`codec "${codec}" is not one of ${CODECS.join(", ")}`);
  const crf = o.crf != null ? ["-crf", String(o.crf)] : [], rate = () => [...(o.videoBitrate ? ["-b:v", o.videoBitrate] : []),
    ...(o.maxBitrate ? ["-maxrate", o.maxBitrate, "-bufsize", o.bufferSize ?? o.maxBitrate] : [])];
  const gop = o.keyframeInterval ? ["-g", String(o.keyframeInterval)] : [];
  const pix = (d) => ["-pix_fmt", o.pixFmt ?? d];
  switch (codec) {
    case "h264": {   // render_opts' x264Args, with its fixed pixel format / profile swapped for o.pixFmt when asked
      const a = x264Args(o);
      if (o.pixFmt) dropOpt(dropOpt(a, "-pix_fmt"), "-profile:v").push("-pix_fmt", o.pixFmt);
      return { ext: "mp4", video: [...a, ...colorArgs(o)], audio: ["-c:a", "aac", "-b:a", "256k"] };
    }
    case "h265": {   // hvc1 so QuickTime / Safari play it; the quality presets' crf + 4 (x265's scale runs about 4 above x264's)
      const q = PRESETS[o.quality ?? "looks"];
      if (!q) throw new Error(`output.quality "${o.quality}" is not one of ${Object.keys(PRESETS).join(", ")}`);
      return { ext: "mp4", video: ["-c:v", "libx265", "-preset", o.preset ?? q.preset, ...(o.videoBitrate ? ["-b:v", o.videoBitrate] : ["-crf", String(o.crf ?? q.crf + 4)]),
        ...(o.maxBitrate ? ["-x265-params", `vbv-maxrate=${kbps(o.maxBitrate)}:vbv-bufsize=${kbps(o.bufferSize ?? o.maxBitrate)}`] : []), ...gop, "-tag:v", "hvc1", ...pix("yuv420p"), ...colorArgs(o)],
        audio: ["-c:a", "aac", "-b:a", "256k"] };
    }
    case "vp8": return { ext: "webm", video: ["-c:v", "libvpx", "-crf", String(o.crf ?? 10), ...(o.videoBitrate ? [] : ["-b:v", "2M"]), ...rate(), ...gop, ...pix("yuv420p"), ...colorArgs(o)], audio: ["-c:a", "libopus", "-b:a", "160k"] };
    case "vp9": return { ext: "webm", video: [...vp9Args(o), ...rate(), ...gop, ...pix("yuv420p"), ...colorArgs(o)], audio: ["-c:a", "libopus", "-b:a", "160k"] };
    case "av1": {
      const svt = has("libsvtav1");
      if (!svt && !has("libaom-av1")) throw new Error("av1: this ffmpeg has neither libsvtav1 nor libaom-av1 (install an ffmpeg build with one of them)");
      const p = o.preset ?? "medium";
      return { ext: "webm", video: svt
        ? ["-c:v", "libsvtav1", "-preset", String(/^\d+$/.test(p) ? p : SVT[p] ?? 6), "-crf", String(o.crf ?? 30), ...rate(), ...(o.keyframeInterval ? ["-g", String(o.keyframeInterval)] : []), ...pix("yuv420p"), ...colorArgs(o)]
        : ["-c:v", "libaom-av1", "-cpu-used", String(/^\d+$/.test(p) ? p : 6), "-crf", String(o.crf ?? 30), "-b:v", o.videoBitrate ?? "0", ...gop, ...pix("yuv420p"), ...colorArgs(o)],
        audio: ["-c:a", "libopus", "-b:a", "160k"] };
    }
    case "prores": {
      const prof = String(o.prores ?? "hq");
      if (!(prof in PRORES)) throw new Error(`prores profile "${prof}" is not one of ${Object.keys(PRORES).join(", ")}`);
      return { ext: "mov", video: ["-c:v", "prores_ks", "-profile:v", String(PRORES[prof]), ...pix(PRORES[prof] >= 4 ? "yuv444p10le" : "yuv422p10le"), "-vendor", "apl0", ...colorArgs(o)], audio: ["-c:a", "pcm_s16le"] };
    }
    case "gif": return { ext: "gif", gif: true, video: [], audio: [], fps: o.gifFps ?? 15 };
    default: return { ext: { mp3: "mp3", aac: "m4a", wav: "wav" }[codec], audioOnly: true, video: ["-vn"], audio: { mp3: ["-c:a", "libmp3lame", "-b:a", "192k"], aac: ["-c:a", "aac", "-b:a", "256k"], wav: ["-c:a", "pcm_s16le"] }[codec] };
  }
}
const kbps = (s) => { const m = /^(\d+(?:\.\d+)?)([kKmM]?)$/.exec(String(s)); return Math.round(m[1] * ({ "": 0.001, k: 1, m: 1000 }[m[2].toLowerCase()])); };

export function transcode(src, out, o = {}) {
  const c = codecArgs(o.codec ?? "h264", o), file = out || src.replace(/\.[^.]+$/, "") + "." + c.ext;
  if (path.resolve(file) === path.resolve(src)) throw new Error("transcode: the output would overwrite the source");
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const scale = o.scale && o.scale !== 1 ? `scale=trunc(iw*${o.scale}/2)*2:-2` : null;
  const vf = [scale, colorFilter(o)].filter(Boolean), args = ["-y", "-v", "error", "-i", src];
  if (c.audioOnly) args.push(...c.video, ...c.audio);
  else if (c.gif) args.push("-an", "-filter_complex", `[0:v]fps=${c.fps}${scale ? "," + scale : ""},split[a][b];[a]palettegen[p];[b][p]paletteuse`, "-loop", "0");
  else args.push(...(vf.length ? ["-vf", vf.join(",")] : []), ...c.video, ...c.audio, ...(c.ext === "mp4" ? ["-movflags", "+faststart"] : []));
  args.push(...metadataArgs(o.metadata), file);
  const r = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr.split("\n").filter(Boolean).slice(-3).join(" ")}`);
  return file;
}
