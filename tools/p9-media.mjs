// p9-media.mjs: the media half of Remotion's <Video> / <OffthreadVideo> / <Audio> / audio-visualisation rows, as pure Node helpers (ffmpeg + ffprobe, offline).
//   audioChain(c, { end })      ffmpeg filter chain (no input or output labels) for one audio clip, the superset of tools/renderers/media.mjs's:
//                               c = { in, out?, len?, start, gain, fadeIn, fadeOut, tempo (speed, pitch kept), preservePitch (false: speed AND pitch),
//                                     tone (pitch multiplier 0.01-2, duration kept: Remotion toneFrequency), vol [[t, v], …] (volume curve, seconds
//                                     from the clip start, linear between points), loop (n times | true = endless), loopVolume 'repeat' | 'extend'
//                                     (Remotion loopVolumeCurveBehavior: the curve restarts every loop, or runs once over the whole looped clip) }
//   renderAudioClip(src, out, c)  one clip → wav (the `audio-clip` command): `stream` picks the audio stream (Remotion audioStreamIndex); a local .m3u8 is a src
//   extractVideoFrames(src, dir, { fps, transparent })   numbered frames for KIT.video: jpg, or RGBA png when `transparent` (alpha webm needs the
//                               libvpx decoder, which this does; prores 4444, apng and png sources carry alpha natively) → { count, ext }
//   audioBands(file, { fps, bins, wave })  build-time FFT: per-frame spectrum, level and waveform for tools/p9-audio.js → data object
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SR = 48000;
export const run = (cmd, args, o = {}) => {
  const r = spawnSync(cmd, args, { encoding: o.buffer ? "buffer" : "utf8", maxBuffer: 1 << 30 });
  if (r.error || r.status !== 0) throw new Error(`${cmd} failed: ${(r.error && r.error.message) || String(r.stderr).split("\n").slice(-4).join(" ")}`);
  return r.stdout;
};
const n6 = (x) => Number(x.toFixed(6));
export const duration = (f) => Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).trim());

// atempo takes 0.5..2 per stage: chain stages for anything else (ported from tools/renderers/media.mjs)
export const atempo = (r) => {
  const st = [];
  while (r < 0.5 - 1e-9) { st.push(0.5); r /= 0.5; }
  while (r > 2 + 1e-9) { st.push(2); r /= 2; }
  if (Math.abs(r - 1) >= 1e-9) st.push(r);
  return st.map((s) => `atempo=${n6(s)}`);
};

// [[t, v], …] → an ffmpeg expression in the clip's own time `t`: linear between points, held before the first and after the last
export function volumeExpr(pts) {
  if (!Array.isArray(pts) || !pts.length || pts.some((p, i) => !Array.isArray(p) || !Number.isFinite(p[0]) || !(p[1] >= 0) || (i && p[0] <= pts[i - 1][0])))
    throw new Error("vol: [[t, v], …] with t ascending seconds and v >= 0");
  let e = String(n6(pts[pts.length - 1][1]));
  for (let i = pts.length - 1; i >= 1; i--) {
    const [t0, v0] = pts[i - 1], [t1, v1] = pts[i];
    e = `if(lt(t,${n6(t1)}),${n6(v0)}+(${n6(v1 - v0)})*(t-${n6(t0)})/${n6(t1 - t0)},${e})`;
  }
  return `if(lt(t,${n6(pts[0][0])}),${n6(pts[0][1])},${e})`;
}

export function audioChain(c, { end } = {}) {
  const inn = c.in ?? 0, out = c.out ?? end;
  if (!(out > inn)) throw new Error("audioChain: out (or the file's end) must be after in");
  const rate = c.tempo ?? 1;
  if (!(rate >= 0.1 && rate <= 10)) throw new Error("audioChain: tempo is 0.1 to 10");
  if (c.tone != null && !(c.tone >= 0.01 && c.tone <= 2)) throw new Error("audioChain: tone (toneFrequency) is 0.01 to 2");
  const keepPitch = c.preservePitch !== false;
  const seg = (out - inn) / rate;   // one pass of the clip, after the speed change
  const times = c.loop === true ? Infinity : c.loop > 1 ? Math.floor(c.loop) : 1;
  const len = c.len ?? (Number.isFinite(times) ? seg * times : undefined);
  if (len === undefined) throw new Error("audioChain: an endless loop needs len (seconds)");
  const vol = c.vol ? `volume='${volumeExpr(c.vol)}':eval=frame` : null, extend = c.loopVolume === "extend";
  const loop = times > 1 ? `aloop=loop=${Number.isFinite(times) ? times - 1 : -1}:size=${Math.min(2e9, Math.ceil(seg * SR) + 2000)},asetpts=N/SR/TB` : null;
  return [`aresample=${SR},aformat=sample_fmts=fltp:channel_layouts=stereo`, `atrim=start=${n6(inn)}:end=${n6(out)}`, "asetpts=PTS-STARTPTS",
    ...(rate === 1 ? [] : keepPitch ? atempo(rate) : [`asetrate=${n6(SR * rate)}`, `aresample=${SR}`]),
    ...(c.tone && c.tone !== 1 ? [`asetrate=${n6(SR * c.tone)}`, `aresample=${SR}`, ...atempo(1 / c.tone)] : []),
    ...(vol && !extend ? [vol] : []), ...(loop ? [loop] : []), ...(vol && extend ? [vol] : []),
    "apad", `atrim=duration=${n6(len)}`,
    ...(c.fadeIn > 0 ? [`afade=t=in:st=0:d=${n6(c.fadeIn)}`] : []),
    ...(c.fadeOut > 0 ? [`afade=t=out:st=${n6(Math.max(0, len - c.fadeOut))}:d=${n6(c.fadeOut)}`] : []),
    `volume=${c.gain ?? 1}`, `adelay=${Math.round((c.start ?? 0) * 1000)}:all=1`, "asetpts=N/SR/TB"].join(",");
}

export function renderAudioClip(src, out, c = {}) {
  const end = c.out ?? duration(src), g = `[0:a:${c.stream ?? 0}]${audioChain(c, { end })}[o]`;
  run("ffmpeg", ["-y", "-v", "error", "-i", src, "-filter_complex", g, "-map", "[o]", "-ac", "1", "-c:a", "pcm_f32le", out]);
  return { out, seconds: duration(out) };
}

export function extractVideoFrames(src, dir, { fps, transparent = false } = {}) {
  if (!(fps > 0)) throw new Error("extractVideoFrames: fps is required");
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (/^\d{6}\.(jpg|png)$/.test(f)) fs.rmSync(path.join(dir, f));
  const ext = transparent ? "png" : "jpg";
  const st = JSON.parse(run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,pix_fmt:stream_tags=alpha_mode", "-of", "json", src])).streams?.[0] || {};
  // ffmpeg's own vp8/vp9 decoder drops the alpha plane of a webm; libvpx keeps it
  const dec = transparent && /^vp[89]$/.test(st.codec_name) && st.tags?.alpha_mode === "1" ? ["-c:v", st.codec_name === "vp9" ? "libvpx-vp9" : "libvpx"] : [];
  if (transparent && !dec.length && !/yuva|rgba|bgra|argb|abgr|gbrap|^ya/.test(String(st.pix_fmt)))
    throw new Error(`transparent: ${src} (${st.codec_name}, ${st.pix_fmt}) has no alpha channel; use an alpha webm, prores 4444, apng or png sequence`);
  run("ffmpeg", ["-y", "-v", "error", ...dec, "-i", src, "-an", "-vf", `settb=intb/2,setpts=PTS-lte(TB\\,0.001),fps=${fps}:start_time=0:round=up`,
    ...(transparent ? ["-pix_fmt", "rgba"] : ["-q:v", "2"]), path.join(dir, `%06d.${ext}`)]);
  return { count: fs.readdirSync(dir).filter((f) => f.endsWith("." + ext)).length, ext };
}

// ── audio visualisation: FFT at build time (no numpy), read back by tools/p9-audio.js ────────────────────────────────────────────
function fft(re, im) {   // in place radix-2
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) for (let k = 0, cr = 1, ci = 0; k < len / 2; k++) {
      const u = i + k, v = u + len / 2, xr = re[v] * cr - im[v] * ci, xi = re[v] * ci + im[v] * cr;
      re[v] = re[u] - xr; im[v] = im[u] - xi; re[u] += xr; im[u] += xi;
      [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
    }
  }
}
// → { fps, bins, sampleRate, nyquist, frames: [[amplitude 0..1 × bins]], level: [rms 0..1 per frame], wave: { rate, data } }
//   bins (power of 2, default 128) cover 0..sampleRate/2 (default 8 kHz) low to high; a full-scale sine reads ~1 in its bin. wave = one signed
//   peak per 1/(fps * wave) s.
export function audioBands(file, { fps = 30, bins = 128, sampleRate = 16000, wave = 32 } = {}) {
  if (bins & (bins - 1) || bins < 4 || bins > 1024) throw new Error("bins is a power of 2, 4 to 1024");
  const buf = run("ffmpeg", ["-v", "error", "-i", file, "-vn", "-ac", "1", "-ar", String(sampleRate), "-f", "f32le", "-"], { buffer: true });
  const x = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
  const N = 2048, hann = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
  const nFrames = Math.ceil(x.length / sampleRate * fps), group = N / 2 / bins, r3 = (v) => Math.round(v * 1000) / 1000;
  const frames = [], level = [];
  for (let f = 0; f < nFrames; f++) {
    const c = Math.round(f / fps * sampleRate), re = new Float64Array(N), im = new Float64Array(N);
    let ss = 0;
    for (let i = 0; i < N; i++) { const s = x[c - N / 2 + i] || 0; re[i] = s * hann[i]; }
    for (let i = 0, w = Math.round(sampleRate / fps); i < w; i++) { const s = x[c - (w >> 1) + i] || 0; ss += s * s; }
    fft(re, im);
    const row = [];
    for (let b = 0; b < bins; b++) {   // peak of the group's bins; /(N/4) makes a full-scale sine ~1 (Hann coherent gain 0.5, two-sided)
      let m = 0; for (let k = b * group; k < (b + 1) * group; k++) m = Math.max(m, Math.hypot(re[k], im[k]));
      row.push(r3(Math.min(1, m / (N / 4))));
    }
    frames.push(row); level.push(r3(Math.min(1, Math.sqrt(ss / Math.max(1, Math.round(sampleRate / fps))) * Math.SQRT2)));
  }
  const step = Math.max(1, Math.round(sampleRate / (fps * wave))), data = [];
  for (let i = 0; i < x.length; i += step) { let p = 0; for (let k = i; k < Math.min(x.length, i + step); k++) if (Math.abs(x[k]) > Math.abs(p)) p = x[k]; data.push(r3(p)); }
  return { fps, bins, sampleRate, nyquist: sampleRate / 2, frames, level, wave: { rate: fps * wave, data } };
}
