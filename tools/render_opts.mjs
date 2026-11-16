// Render options as pure functions (no side effects), for tools/renderers/pvk.mjs, hyperframes.mjs and bin/reelwright.mjs
// (wiring: docs/plans/p8-patches.md). Everything here is testable offline: tools/selfcheck/render-opts.mjs.
//   x264Args(output)        ffmpeg video args for the mp4. output = project.json "output": { quality: draft|looks|standard|high|delivery,
//                           crf, videoBitrate "8M", maxBitrate "10M", bufferSize "20M", keyframeInterval frames, preset, bitDepth 8|10 }.
//                           No options = slow, crf 16, high profile, yuv420p, BT.709 tags (the sRGB frames' real colour space).
//   vp9Args(output)         webm args: crf (default 24), cpuUsed (--vp9-cpu-used), row-mt
//   resolution(P, spec)     "4k" | "portrait-4k" | "square-4k" | "2x" | a number → { width, height, viewport, scale }: the page keeps the
//                           film's own layout size (viewport) and renders at deviceScaleFactor `scale`, so layout is identical and the frame
//                           is `scale` times sharper; the aspect of the preset must match the film (else a clear error)
//   outputSize(P)           the film's output pixels: P.width × P.height at the --resolution scale (the supersampled capture is
//                           downscaled to this at encode)
//   supersample(output)     --supersample / output.supersample: capture at N × the output pixels and downscale at encode (1 = off)
//   autoWorkers({...})      render pages / producer workers when PAGES is not set: min(cores / 2, free RAM / 512 MB (256 MB low-memory)), 1..24
import os from "node:os";
import { colorArgs } from "./encode.mjs";   // one colour-tag helper for every encode (a cycle, but functions only: resolved when called)

// the frames are sRGB, x264 writes limited-range BT.709: tag it, or players guess (and some guess wrong)
export const BT709 = { colorSpace: "bt709", colorPrimaries: "bt709", colorTrc: "bt709", colorRange: "tv" };

export const PRESETS = {
  draft: { crf: 28, preset: "veryfast" },
  looks: { crf: 16, preset: "slow" },      // the default
  standard: { crf: 20, preset: "medium" },
  high: { crf: 14, preset: "slow" },
  delivery: { crf: 12, preset: "slower" },
};

const SIZE = /^\d+(\.\d+)?[kKmM]?$/;
export function x264Args(o = {}) {
  const base = PRESETS[o.quality ?? "looks"];
  if (!base) throw new Error(`output.quality "${o.quality}" is not one of ${Object.keys(PRESETS).join(", ")}`);
  for (const k of ["videoBitrate", "maxBitrate", "bufferSize"]) if (o[k] != null && !SIZE.test(String(o[k]))) throw new Error(`output.${k} "${o[k]}" should look like 8M or 2500k`);
  if (o.keyframeInterval != null && !(Number.isInteger(o.keyframeInterval) && o.keyframeInterval > 0)) throw new Error("output.keyframeInterval is a whole number of frames");
  const a = ["-c:v", "libx264", "-preset", o.preset ?? base.preset];
  if (o.videoBitrate) a.push("-b:v", String(o.videoBitrate));   // a bitrate target replaces the constant-quality crf
  else a.push("-crf", String(o.crf ?? base.crf));
  if (o.maxBitrate) a.push("-maxrate", String(o.maxBitrate), "-bufsize", String(o.bufferSize ?? o.maxBitrate));
  else if (o.bufferSize) a.push("-bufsize", String(o.bufferSize));
  if (o.keyframeInterval) a.push("-g", String(o.keyframeInterval));   // no -keyint_min: equal to -g it would suppress scene-cut keyframes
  if (o.bitDepth != null && o.bitDepth !== 8 && o.bitDepth !== 10) throw new Error("output.bitDepth is 8 or 10");
  const d10 = o.bitDepth === 10;   // opt-in only: High10 does not play in Safari
  return [...a, "-tune", "animation", "-x264-params", "aq-mode=3:aq-strength=1.0",
    "-pix_fmt", d10 ? "yuv420p10le" : "yuv420p", "-profile:v", d10 ? "high10" : "high", ...colorArgs(BT709)];
}

export function vp9Args(o = {}) {
  const cpu = o.vp9CpuUsed ?? o.cpuUsed;
  if (cpu != null && !(Number.isInteger(cpu) && cpu >= 0 && cpu <= 8)) throw new Error("vp9 cpu-used is 0 to 8");
  return ["-c:v", "libvpx-vp9", "-crf", String(o.crf ?? 24), "-b:v", "0", "-row-mt", "1", ...(cpu != null ? ["-cpu-used", String(cpu)] : [])];
}

const PRESET_SIZE = { "4k": [3840, 2160], "portrait-4k": [2160, 3840], "square-4k": [2160, 2160] };
export function resolution(P, spec) {
  const w = P.width || 1920, h = P.height || 1080;
  let scale;
  if (typeof spec === "number" || /^\d+(\.\d+)?x?$/.test(String(spec))) scale = parseFloat(spec);
  else if (PRESET_SIZE[spec]) {
    const [W, H] = PRESET_SIZE[spec];
    if (Math.abs(W / H - w / h) > 0.005) throw new Error(`--resolution ${spec} is ${W}x${H} but this film is ${w}x${h}: the aspect must match (${spec === "4k" ? "use portrait-4k or square-4k" : "pick the preset with the film's aspect"})`);
    scale = W / w;
  } else throw new Error(`resolution "${spec}" is not one of ${Object.keys(PRESET_SIZE).join(", ")}, 2x or a number`);
  if (!(scale >= 1 && scale <= 4)) throw new Error("render scale is 1 to 4");
  return { width: Math.round(w * scale), height: Math.round(h * scale), viewport: { width: w, height: h }, scale };
}

// the film's output pixels: layout size × the --resolution scale. What encode() downscales a supersampled capture to.
export function outputSize(P, spec = process.env.REELWRIGHT_RESOLUTION) {
  if (spec) { const r = resolution(P, spec); return { width: r.width, height: r.height }; }
  return { width: P.width || 1920, height: P.height || 1080 };
}

// --supersample N / project.json "output".supersample: capture at N × the output pixels, downscale with lanczos at encode.
// Real SSAA (text and shader edges); off by default, pvk only. 1 = off.
export function supersample(o = {}, env = process.env) {
  const raw = env.REELWRIGHT_SUPERSAMPLE || o.supersample || 1, n = Number(raw);
  if (!(Number.isInteger(n) && n >= 1 && n <= 4)) throw new Error(`supersample "${raw}" is a whole number from 1 to 4`);
  return n;
}

export function autoWorkers({ cores = os.cpus().length, freeMem = os.freemem(), frames = Infinity, lowMemory = false } = {}) {
  const per = (lowMemory ? 256 : 512) * 2 ** 20;
  const n = Math.min(Math.floor(cores / 2), Math.floor(freeMem / per), frames, lowMemory ? 2 : 24);
  return Math.max(1, Math.min(24, n));
}

// REELWRIGHT_QUALITY / _CRF / _VIDEO_BITRATE / _MAX_BITRATE / _BUFFER_SIZE / _KEYFRAME_INTERVAL / _VP9_CPU_USED (set by bin/reelwright.mjs from
// --quality, --crf, --video-bitrate, --max-bitrate, --buffer-size, --keyframe-interval, --vp9-cpu-used) → output option overrides
export function outputFromEnv(env = process.env) {
  const o = {}, n = (k) => (env[k] != null && env[k] !== "" ? Number(env[k]) : undefined);
  if (env.REELWRIGHT_QUALITY) o.quality = env.REELWRIGHT_QUALITY;
  if (env.REELWRIGHT_HARDWARE) o.hardware = env.REELWRIGHT_HARDWARE;   // auto | on | off (tools/hw_encode.mjs)
  for (const [k, e] of [["crf", "CRF"], ["keyframeInterval", "KEYFRAME_INTERVAL"], ["vp9CpuUsed", "VP9_CPU_USED"]]) if (n("REELWRIGHT_" + e) !== undefined) o[k] = n("REELWRIGHT_" + e);
  for (const [k, e] of [["videoBitrate", "VIDEO_BITRATE"], ["maxBitrate", "MAX_BITRATE"], ["bufferSize", "BUFFER_SIZE"]]) if (env["REELWRIGHT_" + e]) o[k] = env["REELWRIGHT_" + e];
  return o;
}
