// `reelwright new <name> --video <file> [--audio <file>]` (G1): a HyperFrames project that plays your media.
//   scaffold({ ROOT, name, video, audio }) → { dest, converted, transcript }
//   - the video is probed (ffprobe); anything that is not H.264 in yuv420p (a .mov, VP9, HEVC, ProRes, a 10-bit file) is converted to H.264 + AAC mp4, because the
//     producer and browsers decode that reliably; an H.264 mp4 is copied untouched. The project takes its width, height and fps from the file.
//   - an --audio file is copied beside it and mixed over the film (KIT.audio); with --audio only, the film is a title card for that sound.
//   - transcript: the media's own speech, written to transcript.json ([{text,start,end}], what `captions` writes for the caption-* components) ONLY through a speech
//     path that is already installed: faster-whisper (`reelwright transcribe install`, tools/local_speech.mjs) or whisper.cpp's `whisper-cli` and the model in
//     $WHISPER_MODEL (tools/narrate.mjs). Nothing is downloaded or installed here: without either, the transcript is skipped and the result says so.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { asrAvailable } from "./narrate.mjs";
import { transcribeReady, transcribeMedia } from "./local_speech.mjs";

const probe = (f) => {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,duration:format=duration", "-of", "json", f], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffprobe could not read ${f}: ${(r.stderr || r.error?.message || "").trim()}`);
  const j = JSON.parse(r.stdout), v = j.streams.find((s) => s.codec_type === "video"), a = j.streams.find((s) => s.codec_type === "audio");
  const [n, d] = (v?.r_frame_rate || "30/1").split("/").map(Number);
  return { v, a, dur: +(Number(j.format.duration) || Number(v?.duration) || Number(a?.duration) || 0).toFixed(3), fps: d ? n / d : 30 };
};
const ff = (args) => { const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...args], { encoding: "utf8" }); if (r.status !== 0) throw new Error("ffmpeg failed: " + (r.stderr || "").trim().split("\n").pop()); };
const even = (n) => Math.max(2, Math.round(n / 2) * 2);

// whisper.cpp `-oj -ml 1` JSON → [{ text, start, end }] in seconds (one word per entry)
export function parseWhisperJson(j) {
  return (j.transcription || []).map((x) => ({ text: String(x.text).trim(), start: +(x.offsets.from / 1000).toFixed(3), end: +(x.offsets.to / 1000).toFixed(3) }))
    .filter((w) => w.text && !/^\[.*\]$/.test(w.text));
}
export function transcribe(media) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelwright-asr-"));
  try {
    const wav = path.join(tmp, "a.wav"), base = path.join(tmp, "out");
    ff(["-i", media, "-vn", "-ac", "1", "-ar", "16000", wav]);
    const r = spawnSync("whisper-cli", ["-m", process.env.WHISPER_MODEL, "-f", wav, "-oj", "-ml", "1", "-of", base, "-np"], { encoding: "utf8" });
    if (r.status !== 0 || !fs.existsSync(base + ".json")) throw new Error("whisper-cli failed: " + (r.stderr || "").trim().split("\n").pop());
    return parseWhisperJson(JSON.parse(fs.readFileSync(base + ".json", "utf8")));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

export function scaffold({ ROOT, name, video, audio, log = console.log }) {
  if (!/^[\w-]+$/.test(name || "")) throw new Error("new: the project name is letters, digits, _ and - only");
  for (const f of [video, audio].filter(Boolean)) if (!fs.existsSync(f)) throw new Error(`new: no such file ${f}`);
  const dest = path.join(ROOT, "projects", name);
  if (fs.existsSync(dest)) throw new Error(`projects/${name} already exists`);
  const pv = video && probe(video), pa = audio && probe(audio);
  if (video && !pv.v) throw new Error(`${video} has no video stream`);
  if (audio && !pa.a) throw new Error(`${audio} has no audio stream`);
  const media = path.join(dest, "hf", "media"); fs.mkdirSync(media, { recursive: true });
  let converted = false, vfile = null, afile = null;
  if (video) {
    vfile = "media/" + name + ".mp4";
    const h264 = pv.v.codec_name === "h264" && pv.v.pix_fmt === "yuv420p" && /\.mp4$/i.test(video);
    if (h264) fs.copyFileSync(video, path.join(dest, "hf", vfile));
    else { converted = true; ff(["-i", video, "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", ...(pv.a ? ["-c:a", "aac", "-b:a", "192k"] : ["-an"]), "-movflags", "+faststart", path.join(dest, "hf", vfile)]); }
    log(h264 ? `video: ${path.basename(video)} is H.264 mp4, copied as it is` : `video: ${path.basename(video)} (${pv.v.codec_name}, ${pv.v.pix_fmt}) converted to H.264 mp4`);
  }
  if (audio) { afile = "media/" + path.basename(audio).replace(/[^\w.-]/g, "_"); fs.copyFileSync(audio, path.join(dest, "hf", afile)); }
  const dur = Math.max(pv?.dur || 0, pa?.dur || 0), W = video ? even(pv.v.width) : 1920, H = video ? even(pv.v.height) : 1080, fps = video ? Math.min(60, Math.max(24, Math.round(pv.fps))) : 30;
  if (!(dur > 0)) throw new Error("new: could not read a duration from the media");
  fs.writeFileSync(path.join(dest, "project.json"), JSON.stringify({ title: name, renderer: "hyperframes", style: "dark-tech", out: `out/${name}.mp4`, fps, width: W, height: H,
    lead: 0, tail: 0, loudness: -14, music: { bpm: 100 }, lines: [] }, null, 2) + "\n");
  fs.writeFileSync(path.join(dest, "hf", "index.html"), `<!doctype html>
<!-- A HyperFrames composition for ${name}: plays ${video ? path.basename(video) : path.basename(audio)} (reelwright new --video/--audio). Preview: open hf/index.html#2.5 -->
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="kit/kit.css"><link rel="stylesheet" href="theme.css">
<style>body { background: var(--kit-bg); } .title { left: var(--kit-safe-x); right: var(--kit-safe-x); top: 50%; transform: translateY(-50%); text-align: center; font-family: var(--kit-font-display); font-size: calc(96 * var(--kit-u)); }</style></head>
<body>
<div id="root" data-composition-id="main" data-width="${W}" data-height="${H}"><div id="stage"></div></div>
<script src="kit-data.js"></script>
<script src="kit/engine.js"></script>
<script src="kit/media.js"></script>
<script src="film.js"></script>
</body></html>
`);
  fs.writeFileSync(path.join(dest, "hf", "film.js"), `// ${name}: plays your media. DUR is the file's own length (${dur} s, measured when the project was made); add titles, captions and cuts around it.
'use strict';
const { css, el } = KIT, DUR = ${dur};
${video ? `const clip = KIT.video('${vfile}', { id: 'main', start: 0, dur: DUR, audio: ${pv.a ? "true" : "false"} });
css(clip, { left: '0px', top: '0px', width: ${W} + 'px', height: ${H} + 'px' });` : `el('div', 'title', KIT.stage, ${JSON.stringify(name)});`}
${audio ? `KIT.audio('${afile}', { start: 0, gain: 1 });` : ""}
KIT.start({ dur: DUR, render: () => {} });
`);
  let transcript = null, note;
  const src = (video && pv.a) ? video : audio || null;
  if (!src) note = "no transcript: the video has no audio";
  else if (!transcribeReady() && !asrAvailable()) note = "no transcript: whisper-cli and $WHISPER_MODEL are not set up (nothing is downloaded for you); with them, or after `reelwright transcribe install --yes`, `new` writes transcript.json from the audio";
  else { const words = transcribeReady() ? transcribeMedia(src) : transcribe(src); fs.writeFileSync(path.join(dest, "transcript.json"), JSON.stringify(words, null, 1)); transcript = words.length; note = `transcript.json: ${words.length} words from the audio`; }
  log(note);
  return { dest, converted, transcript, note, dur, width: W, height: H, fps };
}
