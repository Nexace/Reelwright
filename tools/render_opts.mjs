// Render options as pure functions (no side effects), for tools/renderers/pvk.mjs, hyperframes.mjs and bin/reelwright.mjs
// (wiring: docs/plans/p8-patches.md). Everything here is testable offline: tools/selfcheck/p8-render-opts.mjs.
//   x264Args(output)        ffmpeg video args for the mp4. output = project.json "output": { quality: draft|looks|standard|high|delivery,
//                           crf, videoBitrate "8M", maxBitrate "10M", bufferSize "20M", keyframeInterval frames, preset }. No options = today's
//                           encode exactly (slow, crf 16, high profile, yuv420p).
//   vp9Args(output)         webm args: crf (default 24), cpuUsed (--vp9-cpu-used), row-mt
//   resolution(P, spec)     "4k" | "portrait-4k" | "square-4k" | "2x" | a number → { width, height, viewport, scale }: the page keeps the
//                           film's own layout size (viewport) and renders at deviceScaleFactor `scale`, so layout is identical and the frame
//                           is `scale` times sharper; the aspect of the preset must match the film (else a clear error)
//   autoWorkers({...})      render pages / producer workers when PAGES is not set: min(cores / 2, free RAM / 512 MB (256 MB low-memory)), 1..24
import os from "node:os";

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
  if (o.keyframeInterval) a.push("-g", String(o.keyframeInterval), "-keyint_min", String(o.keyframeInterval));
  return [...a, "-pix_fmt", "yuv420p", "-profile:v", "high"];
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

export function autoWorkers({ cores = os.cpus().length, freeMem = os.freemem(), frames = Infinity, lowMemory = false } = {}) {
  const per = (lowMemory ? 256 : 512) * 2 ** 20;
  const n = Math.min(Math.floor(cores / 2), Math.floor(freeMem / per), frames, lowMemory ? 2 : 24);
  return Math.max(1, Math.min(24, n));
}
