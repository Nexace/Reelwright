// silence.mjs: silence and speech segments of an audio or video file (Remotion row 2.4.9, written from scratch). Offline, ffmpeg + ffprobe.
//   detectSilence(file, { noise = "-40dB", min = 0.5, merge = 0.3 })
//        → { file, duration, noise, silences: [{ start, end, duration }], speech: [{ start, end, duration }] }
//        noise  the level at or below which sound counts as silence: "-40dB", a bare number of dB, or "auto" = the gate threshold loudnorm
//               measures on this file (`input_thresh`, clamped to -60..-25 dB), so a quiet recording is judged against its own level
//        min    a quiet stretch must last at least this many seconds to be a silence (ffmpeg silencedetect d=)
//        merge  a sound shorter than this many seconds between two silences (a click, a breath) is absorbed into the silence; 0 keeps them
//   trimSilence(src, out, { pad = 0.05, ...detect }) → { out, start, end, removedStart, removedEnd }   cuts the leading and trailing silence off
//        one file (a voice line), keeping `pad` seconds of room on each side; the format follows the extension of `out`
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const run = (cmd, args) => spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 26 });
const lines = (s) => (s || "").split(/\r?\n/);
const r3 = (n) => Math.round(n * 1000) / 1000;
const seg = (start, end) => ({ start: r3(start), end: r3(end), duration: r3(end - start) });

export function probeDuration(file) {
  const r = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]);
  const d = parseFloat(lines(r.stdout)[0]);
  if (r.status !== 0 || !Number.isFinite(d)) throw new Error(`silence: cannot read the duration of ${file} (${lines(r.stderr).filter(Boolean).pop() || "ffprobe failed"})`);
  return d;
}

// loudnorm pass 1 prints a JSON block on stderr; input_thresh is the level its gate ignores everything below
export function loudnormThreshold(file) {
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", "loudnorm=print_format=json", "-f", "null", "-"]);
  const m = /"input_thresh"\s*:\s*"(-?[\d.]+|-?inf)"/.exec(r.stderr || "");
  const v = m ? parseFloat(m[1]) : NaN;
  if (!Number.isFinite(v)) throw new Error("silence: loudnorm gave no input_thresh (is there an audio stream?)");
  return Math.min(-25, Math.max(-60, v));
}

export function noiseDb(noise, file) {
  if (noise === "auto") return loudnormThreshold(file);
  const m = /^(-?\d+(?:\.\d+)?)(?:dB)?$/i.exec(String(noise));
  if (!m) throw new Error(`silence: --noise "${noise}" should look like -40dB (or auto)`);
  return parseFloat(m[1]);
}

export function detectSilence(file, { noise = "-40dB", min = 0.5, merge = 0.3 } = {}) {
  if (!fs.existsSync(file)) throw new Error(`silence: no such file ${file}`);
  if (!(min > 0)) throw new Error("silence: --min is a number of seconds above 0");
  if (!(merge >= 0)) throw new Error("silence: --merge is a number of seconds, 0 or more");
  const dB = noiseDb(noise, file), duration = probeDuration(file);
  const r = run("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", `silencedetect=noise=${dB}dB:d=${min}`, "-f", "null", "-"]);
  if (r.status !== 0) throw new Error(`silence: ffmpeg failed: ${lines(r.stderr).filter(Boolean).slice(-2).join(" ")}`);
  const raw = [];
  for (const l of lines(r.stderr)) {
    let m;
    if ((m = /silence_start: (-?[\d.]+)/.exec(l))) raw.push({ start: Math.max(0, parseFloat(m[1])), end: duration });   // no silence_end: it runs to the end of the file
    else if ((m = /silence_end: (-?[\d.]+)/.exec(l)) && raw.length) raw[raw.length - 1].end = Math.min(duration, parseFloat(m[1]));
  }
  // absorb the short sounds between two silences
  const silences = [];
  for (const s of raw) {
    const last = silences[silences.length - 1];
    if (last && s.start - last.end < merge) last.end = s.end; else silences.push({ ...s });
  }
  const speech = []; let at = 0;
  for (const s of silences) { if (s.start - at > 1e-3) speech.push(seg(at, s.start)); at = s.end; }
  if (duration - at > 1e-3) speech.push(seg(at, duration));
  return { file, duration: r3(duration), noise: `${dB}dB`, min, merge, silences: silences.map((s) => seg(s.start, s.end)), speech };
}

export function trimSilence(src, out, { pad = 0.05, ...o } = {}) {
  if (path.resolve(src) === path.resolve(out)) throw new Error("silence: the trimmed file would overwrite the source");
  const d = detectSilence(src, o);
  if (!d.speech.length) throw new Error(`silence: no sound above ${d.noise} in ${src}, nothing to keep`);
  const start = Math.max(0, d.speech[0].start - pad), end = Math.min(d.duration, d.speech[d.speech.length - 1].end + pad);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const r = run("ffmpeg", ["-y", "-v", "error", "-i", src, "-ss", String(r3(start)), "-t", String(r3(end - start)), ...(/\.(wav|mp3|m4a|aac|flac|ogg|opus)$/i.test(out) ? ["-vn"] : []), out]);
  if (r.status !== 0) throw new Error(`silence: ffmpeg failed: ${lines(r.stderr).filter(Boolean).slice(-2).join(" ")}`);
  return { out, start: r3(start), end: r3(end), removedStart: r3(start), removedEnd: r3(d.duration - end) };
}
