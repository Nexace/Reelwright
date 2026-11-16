// Motion blur averaged in LINEAR light. The pvk renderer (tools/renderers/pvk.mjs) renders `samples` sub-frames across the shutter and
// averages them with ffmpeg tmix on the screenshots' encoded (gamma) values; averaging gamma values darkens every edge and highlight
// (a white box sweeping over black comes out mid-grey 128 instead of the 188 the eye expects). linearBlurFilter decodes sRGB to linear
// at 16 bit, averages there, and encodes back, so a streak is the energy it would be on a camera sensor.
//   linearBlurFilter(samples, { alpha }) → the ffmpeg -vf chain (ends with select of the last frame, as pvk's tmix chain does)
//   averageFrames(pattern, samples, out, { alpha, linear = true })    sample images (printf pattern, 0-based or 1-based, `samples` of them) → one image
//   blurSpec(P, flag)   project.json "motionBlur" or the --blur flag → { shutter, samples, linear } | null
//     --blur auto → { shutter: 180, samples: 8, linear: true }; --blur N → N samples, shutter 180, linear; "gamma" in motionBlur
//     ({ linear: false }) keeps the 0.3 behaviour. Chrome's compositor is not involved: the sub-frames are ordinary render(t) shots.
import { spawnSync } from "node:child_process";

const DEC = "if(lt(val/maxval,0.04045),val/maxval/12.92,pow((val/maxval+0.055)/1.055,2.4))*maxval";
const ENC = "if(lt(val/maxval,0.0031308),val/maxval*12.92,1.055*pow(val/maxval,1/2.4)-0.055)*maxval";

export function linearBlurFilter(samples, { alpha = false } = {}) {
  const lut = (e) => `lutrgb=r='${e}':g='${e}':b='${e}'`, fmt = alpha ? "gbrap16le" : "gbrp16le";
  // alpha: linearise the colour, premultiply, average, unpremultiply, encode (colour and alpha averaged the way light adds)
  return [`format=${fmt}`, lut(DEC), alpha ? "premultiply=inplace=1" : null, `tmix=frames=${samples}`, alpha ? "unpremultiply=inplace=1" : null, lut(ENC),
    `select=eq(n\\,${samples - 1})`, alpha ? "format=rgba" : "format=rgb24"].filter(Boolean).join(",");
}

export function averageFrames(pattern, samples, out, { alpha = false, linear = true, start = 1 } = {}) {
  const vf = linear ? linearBlurFilter(samples, { alpha }) : `${alpha ? "premultiply=inplace=1," : ""}tmix=frames=${samples}${alpha ? ",unpremultiply=inplace=1" : ""},select=eq(n\\,${samples - 1})`;
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-framerate", "1", "-start_number", String(start), "-i", pattern, "-vf", vf, "-frames:v", "1", "-update", "1", out], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("motion blur: ffmpeg failed: " + r.stderr.trim().split("\n").pop());
}

export function blurSpec(P = {}, flag) {
  const f = flag ?? process.env.REELWRIGHT_BLUR;
  if (f) {
    if (f === "auto") return { shutter: 180, samples: 8, linear: true };
    const n = Math.round(Number(f));
    if (!(n >= 2 && n <= 64)) throw new Error(`--blur takes auto or a sample count from 2 to 64 (got ${f})`);
    return { shutter: 180, samples: n, linear: true };
  }
  const m = P.motionBlur;
  if (!m) return null;
  return { shutter: Number(m.shutter ?? 180), samples: Math.max(2, Math.round(Number(m.samples ?? 8))), linear: m.linear !== false };
}
