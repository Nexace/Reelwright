// hw_encode.mjs: hardware-accelerated H.264 / H.265 encode (Remotion row 2.7.3, written from scratch). Opt-in: nothing here runs unless the mode is `auto` or
// `on`, so a film built without it is encoded by the same software arguments as before. Offline (ffmpeg).
//   modes (--hardware-acceleration, REELWRIGHT_HARDWARE, project.json output.hardware)
//        off   (default) software x264 / x265, byte-identical to a build that never heard of this file
//        auto  the first hardware encoder that really encodes a frame; none → software, no message
//        on    the same, and none → an Error that says why each candidate was rejected
//   families, tried in this order per platform:  darwin videotoolbox | win32 nvenc, qsv | linux nvenc, qsv, vaapi
//        videotoolbox h264_videotoolbox hevc_videotoolbox | nvenc h264_nvenc hevc_nvenc | qsv h264_qsv hevc_qsv | vaapi h264_vaapi hevc_vaapi (device /dev/dri/renderD128,
//        or REELWRIGHT_VAAPI_DEVICE)
//   resolveHardware(codec, mode, opts?)  → null (off, or auto with no hardware) or { family, encoder, tried: [{ family, encoder, ok, reason }] }
//        a candidate counts only if `ffmpeg -encoders` lists it AND a 1-frame test encode succeeds. opts: platform, encoders (the `-encoders` text), test(family, encoder)
//        → { ok, reason } to replace the real 1-frame encode (self-checks). Results are cached per process.
//   hardwareEncode(codec, o)  → null, or { family, encoder, pre: [args before the inputs], video: [codec args], vf: filter to append or null } for output o
//        (o.hardware, quality / crf, videoBitrate, maxBitrate, bufferSize, keyframeInterval). Quality maps from the software crf: videotoolbox -q:v = 100 - 2 crf,
//        nvenc -cq crf, qsv -global_quality crf, vaapi -qp crf; a video bitrate replaces them. Approximate: hardware encoders are not x264 and not bit-exact.
//        Only 8-bit yuv420p: another o.pixFmt is refused (auto → software, on → Error).
// shortcut: NVENC / QSV / VAAPI are built from their documented ffmpeg options and probed with the same 1-frame test, but only VideoToolbox is proven on real
// hardware here (tools/selfcheck/hw-encode.mjs); AMD AMF is not tried. Upgrade when a film needs it.
import { spawnSync } from "node:child_process";
import { PRESETS } from "./render_opts.mjs";

export const HW_MODES = ["auto", "on", "off"];
const ENC = { videotoolbox: ["h264_videotoolbox", "hevc_videotoolbox"], nvenc: ["h264_nvenc", "hevc_nvenc"], qsv: ["h264_qsv", "hevc_qsv"], vaapi: ["h264_vaapi", "hevc_vaapi"] };
const ORDER = { darwin: ["videotoolbox"], win32: ["nvenc", "qsv"], linux: ["nvenc", "qsv", "vaapi"] };
const vaapiDevice = () => process.env.REELWRIGHT_VAAPI_DEVICE || "/dev/dri/renderD128";
const pre = (family) => (family === "vaapi" ? ["-vaapi_device", vaapiDevice()] : []);
const vf = (family) => (family === "vaapi" ? "format=nv12,hwupload" : null);

let encoderText;
const listEncoders = () => (encoderText ??= spawnSync("ffmpeg", ["-hide_banner", "-encoders"], { encoding: "utf8" }).stdout || "");
const cache = new Map();

// the real test: one 640x360 frame through the encoder (the same pre / filter / codec the build would use), discarded
function testEncode(family, encoder) {
  const f = vf(family);
  const r = spawnSync("ffmpeg", ["-v", "error", ...pre(family), "-f", "lavfi", "-i", "color=c=black:s=640x360:r=1", "-frames:v", "1", ...(f ? ["-vf", f] : []), "-c:v", encoder, "-f", "null", "-"], { encoding: "utf8" });
  if (r.status === 0) return { ok: true };
  return { ok: false, reason: "test encode failed: " + ((r.stderr || r.error?.message || "").split(/\r?\n/).filter(Boolean).slice(-1)[0] || `exit ${r.status}`) };
}

export function resolveHardware(codec, mode = "off", opts = {}) {
  if (!HW_MODES.includes(mode)) throw new Error(`hardware acceleration "${mode}" is not one of ${HW_MODES.join(", ")}`);
  if (mode === "off") return null;
  const k = ["h264", "h265"].indexOf(codec);
  if (k < 0) { if (mode === "on") throw new Error(`hardware acceleration: ${codec} has no hardware encoder here (h264 and h265 only)`); return null; }
  const platform = opts.platform ?? process.platform, text = opts.encoders ?? listEncoders(), key = opts.test ? null : `${platform}|${codec}`;
  let found = key && cache.get(key);
  if (!found) {
    const tried = [];
    for (const family of ORDER[platform] ?? Object.keys(ENC)) {
      const encoder = ENC[family][k];
      if (!text.includes(" " + encoder + " ")) { tried.push({ family, encoder, ok: false, reason: "this ffmpeg was built without " + encoder }); continue; }
      const t = (opts.test ?? testEncode)(family, encoder);
      tried.push({ family, encoder, ok: !!t.ok, reason: t.ok ? "works" : t.reason });
      if (t.ok) break;
    }
    const hit = tried.find((t) => t.ok);
    found = { family: hit?.family, encoder: hit?.encoder, tried };
    if (key) cache.set(key, found);
  }
  if (found.encoder) return found;
  if (mode === "on") throw new Error(`hardware acceleration is on but no hardware ${codec} encoder works here: ` + found.tried.map((t) => `${t.family} (${t.encoder}): ${t.reason}`).join("; "));
  return null;
}

// ffmpeg arguments for one resolved encoder
export function hwArgs({ family, encoder }, codec, o = {}) {
  const crf = o.crf ?? (PRESETS[o.quality ?? "looks"] ?? PRESETS.looks).crf + (codec === "h265" ? 4 : 0);
  const rate = o.videoBitrate ? ["-b:v", String(o.videoBitrate)] : null;
  const q = { videotoolbox: ["-q:v", String(Math.max(1, Math.min(100, Math.round(100 - 2 * crf))))], nvenc: ["-rc", "vbr", "-cq", String(crf), "-b:v", "0"], qsv: ["-global_quality", String(crf)], vaapi: ["-qp", String(crf)] }[family];
  return { family, encoder, pre: pre(family), vf: vf(family), video: ["-c:v", encoder, ...(rate ?? q),
    ...(o.maxBitrate ? ["-maxrate", String(o.maxBitrate), "-bufsize", String(o.bufferSize ?? o.maxBitrate)] : []), ...(o.keyframeInterval ? ["-g", String(o.keyframeInterval)] : []),
    ...(family === "vaapi" ? [] : ["-pix_fmt", "yuv420p"]), ...(codec === "h265" ? ["-tag:v", "hvc1"] : ["-profile:v", "high"])] };
}

export function hardwareEncode(codec, o = {}, opts = {}) {
  const mode = o.hardware ?? "off";
  if (mode === "off") return null;
  if (o.pixFmt && o.pixFmt !== "yuv420p") { if (mode === "on") throw new Error(`hardware acceleration is on but ${o.pixFmt} needs the software encoder (hardware encodes 8-bit yuv420p)`); return null; }
  const hit = resolveHardware(codec, mode, opts);
  return hit && hwArgs(hit, codec, o);
}
