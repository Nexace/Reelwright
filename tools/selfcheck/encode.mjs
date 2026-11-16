// node tools/selfcheck/encode.mjs — Remotion rows 2.7.1 (codecs), 2.7.2 (quality, pixel format, colour tags, jpeg quality), 2.7.5 (frame ranges),
// 2.7.14 (metadata): `transcode` and `range` run for real on a 30-frame film made with ffmpeg lavfi, every flag read back with ffprobe.
// Frame-range correctness uses a source whose luma is 8 × the frame number, so a still names the frame it shows.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { codecArgs, transcode, colorArgs, metadataArgs, stillArgs, CODECS } from "../encode.mjs";
import { parseFrames, frameList, selectExpr } from "../frames.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p9-enc-"));
const T = (f) => path.join(tmp, f);
const sh = (cmd, args, o = {}) => { const r = spawnSync(cmd, args, { encoding: "utf8", ...o }); assert.equal(r.status, 0, `${cmd} ${args.join(" ")}\n${r.stdout}\n${r.stderr}`); return r; };
const cli = (...a) => sh(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), ...a], { cwd: ROOT });
const probe = (f, entries, sel = "v:0") => Object.fromEntries(sh("ffprobe", ["-v", "error", "-select_streams", sel, "-show_entries", entries, "-of", "default=nw=1", f]).stdout.replace(/\r/g, "").trim().split("\n").filter(Boolean).map((l) => l.split(/=(.*)/s).slice(0, 2)));
const fmtTags = (f) => Object.fromEntries(sh("ffprobe", ["-v", "error", "-show_entries", "format_tags", "-of", "default=nw=1", f]).stdout.replace(/\r/g, "").trim().split("\n").filter(Boolean).map((l) => l.replace(/^TAG:/, "").split(/=(.*)/s).slice(0, 2)));   // ffprobe ends lines with \r\n on Windows
const frames = (f) => Number(sh("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", f]).stdout);
const luma = (f) => { const r = spawnSync("ffmpeg", ["-v", "error", "-i", f, "-frames:v", "1", "-vf", "scale=8:8,format=gray", "-f", "rawvideo", "-"], { encoding: "buffer" }); return r.stdout.reduce((a, b) => a + b, 0) / r.stdout.length; };
try {
  // a 30-frame film at 10 fps with sound; frame n has luma 8n (full range, lossless so it can be read back)
  sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=gray:s=160x90:r=10:d=3,format=yuv420p,geq=lum='8*N':cb=128:cr=128", "-f", "lavfi", "-i", "sine=f=440:d=3:sample_rate=48000",
    "-c:v", "libx264", "-qp", "0", "-pix_fmt", "yuv420p", "-color_range", "pc", "-c:a", "aac", "-shortest", T("film.mp4")]);
  const F = T("film.mp4");

  // ── pure: argument builders and errors ──
  assert.deepEqual(CODECS, ["h264", "h265", "vp8", "vp9", "av1", "prores", "gif", "mp3", "aac", "wav"]);
  assert.throws(() => codecArgs("divx"), /not one of/); assert.throws(() => codecArgs("prores", { prores: "9" }), /profile/);
  assert.throws(() => metadataArgs(["notapair"]), /key=value/); assert.throws(() => colorArgs({ colorRange: "x" }), /tv or pc/); assert.throws(() => stillArgs({ jpegQuality: 0 }), /1 to 100/);
  assert.deepEqual(metadataArgs({ title: "A b", comment: "c" }), ["-metadata", "title=A b", "-metadata", "comment=c"]);
  assert.deepEqual(codecArgs("h264", { pixFmt: "yuv444p" }).video.filter((x) => x === "-profile:v"), [], "a custom pixel format drops the fixed high profile");
  assert.ok(Number(stillArgs({ jpegQuality: 100 })[1]) < Number(stillArgs({ jpegQuality: 1 })[1]), "jpeg quality 100 is the lower (better) -q:v");

  // ── 2.7.1: every codec, read back ──
  const want = { h264: ["h264", "mp4"], h265: ["hevc", "mp4"], vp8: ["vp8", "webm"], vp9: ["vp9", "webm"], av1: ["av1", "webm"], prores: ["prores", "mov"], gif: ["gif", "gif"] };
  for (const [codec, [name, ext]] of Object.entries(want)) {
    const out = transcode(F, T(`c-${codec}.${ext}`), { codec });
    const p = probe(out, "stream=codec_name,pix_fmt,width,height");
    assert.equal(p.codec_name, name, `${codec} → ${name}`); assert.equal(p.width, "160");
    if (codec !== "gif") assert.equal(probe(out, "stream=codec_name", "a:0").codec_name, { h264: "aac", h265: "aac", vp8: "opus", vp9: "opus", av1: "opus", prores: "pcm_s16le" }[codec], codec + " audio kept");
    assert.ok(frames(out) >= 29, `${codec} keeps the 30 frames (${frames(out)})`);
  }
  assert.equal(probe(T("c-h265.mp4"), "stream=codec_tag_string").codec_tag_string, "hvc1", "h265 is tagged hvc1 for QuickTime");
  assert.equal(probe(T("c-prores.mov"), "stream=profile").profile, "HQ", "prores default profile hq");
  for (const [prof, name] of [["proxy", "Proxy"], ["lt", "LT"], ["422", "Standard"], ["4444", "4444"]]) {
    const p = probe(transcode(F, T(`pr-${prof}.mov`), { codec: "prores", prores: prof }), "stream=profile,pix_fmt");
    assert.equal(p.profile, name, "prores " + prof); if (prof === "4444") assert.match(p.pix_fmt, /^yuv444p1[02]le$/, "4444 is 4:4:4");
  }
  for (const [codec, an] of [["mp3", "mp3"], ["aac", "aac"], ["wav", "pcm_s16le"]]) {
    const out = transcode(F, T(`a.${codecArgs(codec).ext}`), { codec });
    assert.equal(sh("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries", "stream=index", "-of", "csv=p=0", out]).stdout.trim(), "", codec + ": no video stream");
    assert.equal(probe(out, "stream=codec_name", "a:0").codec_name, an);
  }

  // ── 2.7.2: the knobs, each visible in ffprobe ──
  const size = (o) => fs.statSync(transcode(F, T(`k-${Math.random()}.mp4`), o)).size;
  assert.ok(size({ codec: "h265", crf: 40 }) < size({ codec: "h265", crf: 18 }), "h265 --crf moves the size");
  transcode(F, T("br.mp4"), { codec: "h264", videoBitrate: "40k", maxBitrate: "60k", bufferSize: "120k" });
  const fmtBr = (f) => Number(sh("ffprobe", ["-v", "error", "-show_entries", "format=bit_rate", "-of", "csv=p=0", f]).stdout);
  assert.ok(fmtBr(T("br.mp4")) < 150e3, `--video-bitrate 40k reaches x264 (${fmtBr(T("br.mp4"))} bit/s; the lossless source is far higher)`);
  const kf = (f) => sh("ffprobe", ["-v", "error", "-select_streams", "v", "-show_entries", "frame=pict_type", "-of", "csv=p=0", f]).stdout.split("\n").filter((l) => l.startsWith("I")).length;
  assert.ok(kf(transcode(F, T("g5.mp4"), { codec: "h264", keyframeInterval: 5 })) >= 5, "--keyframe-interval 5 over 30 frames");
  assert.ok(kf(transcode(F, T("g5h.mp4"), { codec: "h265", keyframeInterval: 5 })) >= 5, "h265 keyframe interval");
  assert.ok(kf(transcode(F, T("g5a.webm"), { codec: "av1", keyframeInterval: 5 })) >= 5, "av1 keyframe interval");
  assert.match(probe(transcode(F, T("pf1.mp4"), { codec: "h264", pixFmt: "yuv444p" }), "stream=pix_fmt").pix_fmt, /^yuvj?444p$/, "--pix-fmt on h264 (yuvj = the full-range source)");
  assert.equal(probe(transcode(F, T("pf2.mp4"), { codec: "h265", pixFmt: "yuv420p10le" }), "stream=pix_fmt").pix_fmt, "yuv420p10le", "--pix-fmt on h265");
  assert.match(probe(transcode(F, T("pf3.webm"), { codec: "vp9", pixFmt: "yuv444p" }), "stream=pix_fmt").pix_fmt, /^yuvj?444p$/, "--pix-fmt on vp9");
  transcode(F, T("pre.mp4"), { codec: "h264", preset: "ultrafast" }); transcode(F, T("pre2.webm"), { codec: "av1", preset: "veryfast" });
  assert.ok(fs.statSync(T("pre.mp4")).size > 0 && fs.statSync(T("pre2.webm")).size > 0, "x264 preset names and SVT-AV1 presets accepted");
  for (const codec of ["h264", "h265"]) {
    const p = probe(transcode(F, T(`col-${codec}.mp4`), { codec, colorSpace: "bt709", colorPrimaries: "bt709", colorTrc: "bt709", colorRange: "tv" }), "stream=color_space,color_primaries,color_transfer,color_range");
    assert.deepEqual(p, { color_space: "bt709", color_primaries: "bt709", color_transfer: "bt709", color_range: "tv" }, codec + " colour tags");
  }
  assert.equal(probe(transcode(F, T("col2.mp4"), { codec: "h264", colorSpace: "bt2020nc", colorPrimaries: "bt2020", colorTrc: "smpte2084", colorRange: "pc", pixFmt: "yuv420p10le" }), "stream=color_space,color_transfer,pix_fmt").color_transfer, "smpte2084", "PQ tag");
  assert.equal(probe(transcode(F, T("sc.mp4"), { codec: "h264", scale: 0.5 }), "stream=width,height").width, "80", "--scale 0.5");
  sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=s=320x180:r=10:d=1", "-c:v", "libx264", "-qp", "0", T("detail.mp4")]);   // a flat gray frame would not show the quality
  const jq = (q) => { const d = T("jq" + q); cli("range", T("detail.mp4"),"--frames", "5", "--stills", d, "--jpeg-quality", String(q)); return fs.statSync(path.join(d, "f00005.jpg")).size; };
  assert.ok(jq(5) < jq(95), "--jpeg-quality 5 gives a smaller (worse) still than 95");

  // ── 2.7.14: metadata into the mp4 ──
  const tags = fmtTags(transcode(F, T("meta.mp4"), { codec: "h264", metadata: ["title=My film", "comment=built with reelwright", "artist=Ann"] }));
  assert.equal(tags.title, "My film"); assert.equal(tags.comment, "built with reelwright"); assert.equal(tags.artist, "Ann");
  assert.equal(fmtTags(transcode(F, T("meta2.webm"), { codec: "vp9", metadata: { title: "web" } })).title, "web");
  const cmdOut = T("cli.mp4"); cli("transcode", F, "--codec", "h265", "--crf", "30", "--color-space", "bt709", "--metadata", "title=From CLI", "--metadata", "comment=two", "--out", cmdOut);
  assert.equal(probe(cmdOut, "stream=codec_name").codec_name, "hevc"); assert.deepEqual([fmtTags(cmdOut).title, fmtTags(cmdOut).comment], ["From CLI", "two"], "the CLI passes --metadata through (repeatable)");
  assert.equal(probe(cmdOut, "stream=color_space").color_space, "bt709");
  assert.notEqual(spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "transcode", F, "--codec", "nope"], { cwd: ROOT }).status, 0, "an unknown codec exits 1");

  // ── 2.7.5: frame ranges ──
  assert.deepEqual(parseFrames("0-9,30,100-"), [{ from: 0, to: 9 }, { from: 30, to: 30 }, { from: 100, to: null }]); assert.deepEqual(parseFrames(undefined), [{ from: 0, to: null }]);
  for (const bad of ["a", "5-2", "1--3", "-4"]) assert.throws(() => parseFrames(bad), /frames/, bad);
  assert.deepEqual(frameList("0-9", { total: 30 }), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]); assert.equal(frameList("25-", { total: 30 }).join(), "25,26,27,28,29"); assert.equal(frameList("28-99,2", { total: 30 }).join(), "2,28,29");
  assert.equal(frameList("0-9", { total: 30, every: 3 }).join(), "0,3,6,9"); assert.equal(frameList("4-20", { total: 30, every: 4 }).join(), "4,8,12,16,20", "every-nth counts from the first selected frame");
  assert.equal(frameList("0-", { total: 30, duration: 0.5, fps: 10 }).join(), "0,1,2,3,4", "duration 0.5 s at 10 fps = 5 frames");
  assert.equal(frameList("10-", { total: 30, duration: 0.5, fps: 10 }).join(), "10,11,12,13,14", "duration counts from the first selected frame");
  assert.throws(() => frameList("90-", { total: 30 }), /select nothing/); assert.throws(() => frameList("0", { total: 30, every: 0 }), /whole number/);
  assert.equal(selectExpr([0, 1, 2, 3]), "between(n,0,3)"); assert.equal(selectExpr([0, 4, 8, 20]), "between(n,0,8)*not(mod(n-0,4))+eq(n,20)"); assert.equal(selectExpr([5]), "eq(n,5)");
  for (const list of [[0, 2, 4, 5], [0, 2], [0, 1, 3, 4, 7, 10, 13, 29]]) {   // the expression picks exactly the list, whatever the run shape
    const e = selectExpr(list), got = [];
    for (let n = 0; n < 30; n++) if (new Function("n", `const between=(x,a,b)=>x>=a&&x<=b?1:0,eq=(a,b)=>a===b?1:0,not=(x)=>x?0:1,mod=(a,b)=>a%b;return ${e}`)(n)) got.push(n);
    assert.deepEqual(got, list, e);
  }
  const clip = (...a) => { const o = T(`r${Math.random()}.mp4`); cli("range", F, ...a, "--out", o); return o; };
  assert.equal(frames(clip("--frames", "0-9")), 10, "0-9 is 10 frames"); assert.equal(frames(clip("--frames", "25-")), 5, "25- runs to the end");
  assert.equal(frames(clip("--frames", "0,30,2")), 2, "a list; frame 30 does not exist in a 30-frame film (0-29) and is dropped"); assert.equal(frames(clip("--frames", "0-", "--every-nth-frame", "5")), 6);
  assert.equal(frames(clip("--frames", "0-", "--duration", "1.5")), 15, "--duration 1.5 s at 10 fps"); assert.equal(frames(clip("--frames", "3-4,10")), 3);
  const st = T("stills"); cli("range", F, "--frames", "0,12,25", "--stills", st, "--format", "png");
  assert.deepEqual(fs.readdirSync(st).sort(), ["f00000.png", "f00012.png", "f00025.png"], "stills are named by the film's own frame numbers (Remotion: element-00/30/60)");
  for (const n of [0, 12, 25]) {   // the png conversion reads the stored luma 8n as limited range: (8n - 16) * 255 / 219; neighbouring frames are 9 levels apart
    const got = luma(path.join(st, `f${String(n).padStart(5, "0")}.png`)), exp = Math.max(0, (8 * n - 16) * 255 / 219);
    assert.ok(Math.abs(got - exp) < 4, `still f${n} shows frame ${n} (luma ${got} vs ${exp})`);
  }
  const bad = spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "range", F, "--frames", "99-"], { cwd: ROOT, encoding: "utf8" });
  assert.notEqual(bad.status, 0); assert.match(bad.stderr, /select nothing/);
  console.log("encode self-check: 10 codecs, prores profiles, crf / bitrate / keyframe / preset / pixel format / colour tags / scale / metadata / jpeg quality, frame ranges (open-ended, lists, every-nth, duration, stills named by frame) all read back with ffprobe");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
