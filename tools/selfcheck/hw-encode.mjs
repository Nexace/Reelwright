// node tools/selfcheck/hw-encode.mjs — Remotion row 2.7.3: `--hardware-acceleration auto|on|off` (tools/hw_encode.mjs) on transcode and on the renderers' encode.
//   pure: the argument shapes of every family (videotoolbox, nvenc, qsv, vaapi), mode and codec errors
//   fallback (simulated, so it runs the same on every host): no encoder in ffmpeg, a listed encoder whose 1-frame test fails, the order per platform;
//     auto → null without a word, on → an Error that names each candidate and why it was rejected
//   real: on a host where a hardware encoder works (this Mac: VideoToolbox) a file really is encoded by it (ffprobe codec; software x264 leaves its "x264" settings
//     SEI in the stream and a hardware encoder does not); where none works (CI runners) auto takes the software path and on fails with the reason
//   default: output.hardware absent / off is the software encode, byte for byte (two runs, and the renderers' encode() against its own off mode)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { HW_MODES, resolveHardware, hwArgs, hardwareEncode } from "../hw_encode.mjs";
import { transcode } from "../encode.mjs";
import { outputFromEnv } from "../render_opts.mjs";
import { encode } from "../renderers/pvk.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rw-hw-"));
const T = (f) => path.join(tmp, f);
const sh = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: "utf8" }); assert.equal(r.status, 0, `${cmd} ${args.join(" ")}\n${r.stderr}`); return r; };
const cli = (...a) => spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), ...a], { encoding: "utf8", cwd: ROOT });
const probe = (f, entries) => Object.fromEntries(sh("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", entries, "-of", "default=nw=1", f]).stdout.replace(/\r/g, "").trim().split("\n").map((l) => l.split("=")));
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const software = (f) => fs.readFileSync(f).includes("x264 - core");   // libx264 writes its settings into the stream
const list = (...names) => names.map((n) => ` V....D ${n} test\n`).join("");

try {
  // ── pure ──
  assert.deepEqual(HW_MODES, ["auto", "on", "off"]);
  const vt = hwArgs({ family: "videotoolbox", encoder: "h264_videotoolbox" }, "h264", {});
  assert.deepEqual(vt.video, ["-c:v", "h264_videotoolbox", "-q:v", "68", "-pix_fmt", "yuv420p", "-profile:v", "high"], "default quality (crf 16) → -q:v 68");
  assert.deepEqual([vt.pre, vt.vf], [[], null]);
  assert.deepEqual(hwArgs({ family: "videotoolbox", encoder: "hevc_videotoolbox" }, "h265", { crf: 20 }).video, ["-c:v", "hevc_videotoolbox", "-q:v", "60", "-pix_fmt", "yuv420p", "-tag:v", "hvc1"]);
  assert.deepEqual(hwArgs({ family: "nvenc", encoder: "h264_nvenc" }, "h264", { quality: "draft" }).video.slice(0, 7), ["-c:v", "h264_nvenc", "-rc", "vbr", "-cq", "28", "-b:v"]);
  assert.deepEqual(hwArgs({ family: "qsv", encoder: "h264_qsv" }, "h264", { crf: 22 }).video.slice(0, 4), ["-c:v", "h264_qsv", "-global_quality", "22"]);
  const va = hwArgs({ family: "vaapi", encoder: "hevc_vaapi" }, "h265", { crf: 20, keyframeInterval: 48 });
  assert.deepEqual(va.pre, ["-vaapi_device", "/dev/dri/renderD128"]); assert.equal(va.vf, "format=nv12,hwupload");
  assert.deepEqual(va.video, ["-c:v", "hevc_vaapi", "-qp", "20", "-g", "48", "-tag:v", "hvc1"], "vaapi: no -pix_fmt (the filter makes the format), a keyframe interval is -g");
  const br = hwArgs({ family: "nvenc", encoder: "h264_nvenc" }, "h264", { videoBitrate: "8M", maxBitrate: "10M" }).video;
  assert.ok(br.includes("-b:v") && br[br.indexOf("-b:v") + 1] === "8M" && !br.includes("-cq") && br.includes("-maxrate") && br.includes("-bufsize"), "a bitrate replaces the quality target: " + br);
  assert.equal(hardwareEncode("h264", {}), null); assert.equal(hardwareEncode("h264", { hardware: "off" }), null);
  assert.equal(outputFromEnv({ REELWRIGHT_HARDWARE: "auto" }).hardware, "auto"); assert.equal(outputFromEnv({}).hardware, undefined);
  assert.throws(() => resolveHardware("h264", "yes"), /not one of auto, on, off/);
  assert.throws(() => hardwareEncode("h264", { hardware: "on", pixFmt: "yuv444p" }), /needs the software encoder/);
  assert.equal(hardwareEncode("h264", { hardware: "auto", pixFmt: "yuv444p" }), null, "auto + a pixel format hardware cannot do → software");
  assert.equal(resolveHardware("vp9", "auto"), null); assert.throws(() => resolveHardware("vp9", "on"), /h264 and h265 only/);

  // ── fallback, simulated ──
  assert.equal(resolveHardware("h264", "auto", { platform: "linux", encoders: list("libx264") }), null, "no hardware encoder in ffmpeg: auto → null");
  assert.equal(resolveHardware("h264", "off", { platform: "darwin", encoders: list("h264_videotoolbox"), test: () => ({ ok: true }) }), null, "off never probes");
  assert.throws(() => resolveHardware("h264", "on", { platform: "linux", encoders: list("libx264") }), (e) => /nvenc \(h264_nvenc\): this ffmpeg was built without h264_nvenc/.test(e.message) && /qsv/.test(e.message) && /vaapi/.test(e.message), "on lists every candidate");
  const bad = { platform: "linux", encoders: list("h264_nvenc", "h264_vaapi"), test: (f) => ({ ok: false, reason: `test encode failed: no ${f} device` }) };
  assert.equal(resolveHardware("h264", "auto", bad), null, "listed but the 1-frame test fails: auto → null");
  assert.throws(() => resolveHardware("h264", "on", bad), /nvenc \(h264_nvenc\): test encode failed: no nvenc device.*vaapi \(h264_vaapi\): test encode failed: no vaapi device/);
  const seen = [], order = (platform, ok) => resolveHardware("h265", "auto", { platform, encoders: list("hevc_nvenc", "hevc_qsv", "hevc_vaapi", "hevc_videotoolbox"), test: (f) => { seen.push(f); return { ok: f === ok }; } });
  assert.equal(order("linux", "vaapi").encoder, "hevc_vaapi"); assert.deepEqual(seen, ["nvenc", "qsv", "vaapi"], "linux tries nvenc, qsv, vaapi in order and stops at the first that works");
  seen.length = 0; assert.equal(order("win32", "qsv").family, "qsv"); assert.deepEqual(seen, ["nvenc", "qsv"]);
  seen.length = 0; assert.equal(order("darwin", "videotoolbox").encoder, "hevc_videotoolbox"); assert.deepEqual(seen, ["videotoolbox"]);

  // ── a small source ──
  const SRC = T("src.mp4");
  sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=s=320x180:r=15:d=2", "-f", "lavfi", "-i", "sine=f=440:d=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", SRC]);

  // ── default: software, byte for byte ──
  const off1 = transcode(SRC, T("off1.mp4"), { codec: "h264" }), off2 = transcode(SRC, T("off2.mp4"), { codec: "h264", hardware: "off" });
  assert.equal(sha(off1), sha(off2), "hardware: off is the same bytes as no hardware option"); assert.ok(software(off1), "default = libx264");
  const mkFilm = (name, output) => {   // frames + timeline.json, the layout encode() reads
    const d = T(name); fs.mkdirSync(path.join(d, "frames"), { recursive: true });
    sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=s=320x180:r=15:d=1", "-start_number", "0", path.join(d, "frames", "f%05d.png")]);
    fs.writeFileSync(path.join(d, "timeline.json"), "{}");
    encode(d, { out: "out/film.mp4", output }, 15, "frames/f%05d.png", 0);
    return path.join(d, "out", "film.mp4");
  };
  const quiet = (fn) => { const log = console.log; console.log = () => {}; try { return fn(); } finally { console.log = log; } };
  const e1 = quiet(() => mkFilm("film1", undefined)), e2 = quiet(() => mkFilm("film2", { hardware: "off" }));
  assert.equal(sha(e1), sha(e2), "renderers' encode(): output.hardware off is byte-identical to the default"); assert.ok(software(e1));

  // ── real hardware, or the real fallback ──
  const hit = resolveHardware("h264", "auto");
  if (hit) {
    console.log(`hardware found: ${hit.encoder} (${hit.family})`);
    for (const [codec, name] of [["h264", "h264"], ["h265", "hevc"]]) {
      const out = transcode(SRC, T(`hw-${codec}.mp4`), { codec, hardware: "on" });
      const p = probe(out, "stream=codec_name,pix_fmt,width,height,nb_frames");
      assert.equal(p.codec_name, name); assert.equal(p.pix_fmt, "yuv420p"); assert.equal(p.width, "320");
      assert.ok(!software(out), `${codec}: the stream carries no x264 settings, a hardware encoder wrote it`);
      assert.ok(Number(sh("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).stdout) > 1.5, "duration kept");
      if (codec === "h265") assert.equal(probe(out, "stream=codec_tag_string").codec_tag_string, "hvc1");
    }
    const a = transcode(SRC, T("hw-auto.mp4"), { codec: "h264", hardware: "auto" }); assert.ok(!software(a), "auto picks the hardware encoder");
    const f3 = quiet(() => mkFilm("film3", { hardware: "on" }));   // the renderers' encode() through output.hardware
    assert.equal(probe(f3, "stream=codec_name").codec_name, "h264"); assert.ok(!software(f3), "encode(): output.hardware on used the hardware encoder");
  } else {
    console.log("no hardware encoder works on this host: checking the fallback path");
    const a = transcode(SRC, T("fb-auto.mp4"), { codec: "h264", hardware: "auto" });
    assert.ok(software(a), "auto falls back to libx264"); assert.equal(probe(a, "stream=codec_name").codec_name, "h264");
    assert.throws(() => transcode(SRC, T("fb-on.mp4"), { codec: "h264", hardware: "on" }), /no hardware h264 encoder works here/);
  }

  // ── the CLI ──
  let r = cli("transcode", SRC, "--out", T("cli-off.mp4"), "--hardware-acceleration", "off"); assert.equal(r.status, 0, r.stderr); assert.ok(software(T("cli-off.mp4")));
  r = cli("transcode", SRC, "--out", T("cli-auto.mp4"), "--hardware-acceleration", "auto"); assert.equal(r.status, 0, r.stderr);
  assert.equal(software(T("cli-auto.mp4")), !hit, "the CLI flag reaches the encoder (auto = hardware where it works)");
  r = cli("transcode", SRC, "--out", T("cli-444.mp4"), "--hardware-acceleration", "auto", "--pix-fmt", "yuv444p"); assert.equal(r.status, 0, r.stderr);
  assert.equal(probe(T("cli-444.mp4"), "stream=pix_fmt").pix_fmt, "yuv444p"); assert.ok(software(T("cli-444.mp4")), "auto silently takes software for a format hardware cannot do");
  r = cli("transcode", SRC, "--out", T("cli-on.mp4"), "--hardware-acceleration", "on", "--pix-fmt", "yuv444p"); assert.equal(r.status, 1); assert.match(r.stderr, /needs the software encoder/);
  r = cli("transcode", SRC, "--out", T("cli-bad.mp4"), "--hardware-acceleration", "maybe"); assert.equal(r.status, 1); assert.match(r.stderr, /not one of auto, on, off/);
  console.log("hw-encode self-check passed: " + (hit ? `real ${hit.encoder} encode` : "software fallback") + ", simulated fallback, byte-identical default, CLI");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
