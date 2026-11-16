// tools/videotools.mjs — ffmpeg/ffprobe helpers shared by the measure, diff and reverse commands (HyperFrames G9).
// Offline, no model: probe (ffprobe), cut detection (ffmpeg scene score), frame extraction, per-frame SSIM, audio offset.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const run = (bin, a, opts = {}) => {
  const r = spawnSync(bin, a, { encoding: "buffer", maxBuffer: 1 << 29, ...opts });
  if (r.error) throw new Error(`${bin}: ${r.error.message} (is ffmpeg installed?)`);
  return r;
};
const must = (bin, a, opts) => { const r = run(bin, a, opts); if (r.status !== 0) throw new Error(`${bin} failed: ${String(r.stderr).split("\n").filter(Boolean).slice(-3).join(" | ")}`); return r; };
const ff = (...a) => must("ffmpeg", ["-hide_banner", "-nostdin", ...a]);
const rat = (s) => { const [n, d] = String(s || "0/1").split("/").map(Number); return d ? n / d : n; };
const exists = (f) => { if (!fs.existsSync(f)) throw new Error(`no such file: ${f}`); return f; };

export function probe(file) {
  exists(file);
  const j = JSON.parse(must("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", file]).stdout.toString());
  const v = j.streams.find((s) => s.codec_type === "video"), a = j.streams.find((s) => s.codec_type === "audio");
  return {
    file, container: j.format.format_name, duration: +j.format.duration, bitrate: +j.format.bit_rate || 0, size: +j.format.size || 0,
    video: v && { codec: v.codec_name, width: v.width, height: v.height, fps: +rat(v.avg_frame_rate || v.r_frame_rate).toFixed(3), pixFmt: v.pix_fmt, frames: +v.nb_frames || null },
    audio: a && { codec: a.codec_name, sampleRate: +a.sample_rate, channels: a.channels },
  };
}

// Cut times (s) where the scene-change score (0..1) is above `threshold`; the first frame is never a cut.
export function cuts(file, threshold = 0.3) {
  exists(file);
  const r = ff("-i", file, "-an", "-vf", `select='gt(scene,${threshold})',metadata=print:file=-`, "-f", "null", "-");
  const t = [...r.stdout.toString().matchAll(/pts_time:([\d.]+)/g)].map((m) => +m[1]);
  return t.length ? t : [...r.stderr.toString().matchAll(/pts_time:([\d.]+)/g)].map((m) => +m[1]);
}

// One jpg per time (clamped into the clip) → [{ t, file }]
export function frames(file, times, outDir, scale = 0) {
  exists(file); fs.mkdirSync(outDir, { recursive: true });
  const d = probe(file).duration;
  return times.map((t0) => {
    const t = Math.max(0, Math.min(t0, d - 0.04)), f = path.join(outDir, `t${t.toFixed(2).padStart(6, "0")}.jpg`);
    ff("-y", "-ss", String(t), "-i", file, "-frames:v", "1", ...(scale ? ["-vf", `scale=${scale}:-2`] : []), "-q:v", "3", f);
    return { t: +t.toFixed(3), file: f };
  });
}

// SSIM per frame of `test` against `ref`, both resampled to `fps` and `test` scaled to the ref's size.
// → { fps, frames: [{ t, ssim }], mean, min }
export function ssim(ref, test, fps = 10) {
  exists(ref); exists(test);
  const pr = probe(ref), tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rw-ssim-")), stats = path.join(tmp, "s.txt");
  // stats_file is a bare name run in tmp: an absolute Windows path would need filtergraph escaping
  try {
    must("ffmpeg", ["-hide_banner", "-nostdin", "-i", path.resolve(test), "-i", path.resolve(ref), "-filter_complex",
      `[0:v]fps=${fps},scale=${pr.video.width}:${pr.video.height}:flags=bicubic,setsar=1[t];[1:v]fps=${fps},setsar=1[r];[t][r]ssim=stats_file=s.txt`,
      "-f", "null", "-"], { cwd: tmp });
    const rows = fs.readFileSync(stats, "utf8").split("\n").map((l) => /n:(\d+).*All:([\d.]+)/.exec(l)).filter(Boolean)
      .map((m) => ({ t: +((+m[1] - 1) / fps).toFixed(3), ssim: +m[2] }));
    const mean = rows.reduce((a, r) => a + r.ssim, 0) / Math.max(1, rows.length);
    return { fps, frames: rows, mean: +mean.toFixed(5), min: rows.length ? Math.min(...rows.map((r) => r.ssim)) : 0 };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// Pair the cut lists: a ref cut with no test cut within `tol` s is missed, a test cut with no ref cut is extra.
export function matchCuts(ref, test, tol = 0.15) {
  const near = (t, list) => list.some((u) => Math.abs(u - t) <= tol);
  return { missed: ref.filter((t) => !near(t, test)), extra: test.filter((t) => !near(t, ref)) };
}

// Audio offset in seconds (positive: test's sound comes later than ref's), from the cross-correlation of the loudness envelopes
// of the first `span` seconds, searched within ±`max` s. null when either file has no audio or the envelopes are flat.
export function audioOffset(ref, test, { max = 2, span = 30, rate = 200 } = {}) {
  const env = (f) => {
    const r = run("ffmpeg", ["-hide_banner", "-nostdin", "-v", "error", "-i", f, "-t", String(span), "-vn", "-ac", "1", "-ar", "8000", "-f", "f32le", "-"]);
    if (r.status !== 0) return null;
    const x = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length)), w = 8000 / rate;
    const e = new Float64Array(Math.floor(x.length / w));
    for (let i = 0; i < e.length; i++) { let s = 0; for (let k = 0; k < w; k++) s += Math.abs(x[i * w + k]); e[i] = s / w; }
    const m = e.reduce((a, b) => a + b, 0) / (e.length || 1);
    return e.map((v) => v - m);
  };
  const a = env(ref), b = env(test);
  if (!a || !b || a.length < 10 || b.length < 10) return null;
  let best = -Infinity, lag = 0, energy = 0;
  for (const v of a) energy += v * v;
  if (energy < 1e-9) return null;
  for (let L = -max * rate; L <= max * rate; L++) {   // b[i + L] against a[i]
    let s = 0;
    for (let i = Math.max(0, -L); i < a.length && i + L < b.length; i++) s += a[i] * b[i + L];
    if (s > best) { best = s; lag = L; }
  }
  return +(lag / rate).toFixed(3);
}
