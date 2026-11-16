// node tools/selfcheck/media-ffmpeg.mjs — Remotion rows 2.4.1 / 2.4.2 / 2.4.4 / 2.4.7 (the node half): every option is measured on the ffmpeg output.
//   audio: volume curve (RMS per window), loop length, loopVolume repeat vs extend, delay, trim, rate (length, pitch kept), tone (pitch measured as a
//   zero-crossing frequency, length kept), varispeed (both move), audio stream index (second stream's frequency), HLS input (local .m3u8);
//   video: loop is the page's job (patch, media-wiring), here: transparent frames from a vp9 alpha webm, prores 4444 and apng are RGBA pngs with
//   alpha < 255, a plain mp4 gives jpg; audioBands: a 200 Hz (full scale) then 2 kHz (half scale) tone lands in the right bins, level follows loudness.
// Offline: sources come from ffmpeg lavfi.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { run, duration, renderAudioClip, extractVideoFrames, audioBands, volumeExpr, atempo } from "../media-ffmpeg.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "media-ffmpeg-"));
const T = (f) => path.join(tmp, f);
const ff = (...a) => run("ffmpeg", ["-y", "-v", "error", ...a]);
const pcm = (f, ss = 0, t = 99) => { const b = run("ffmpeg", ["-v", "error", "-ss", String(ss), "-t", String(t), "-i", f, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], { buffer: true }); return new Float32Array(b.buffer, b.byteOffset, b.length >> 2); };
const rms = (f, ss, t) => { const x = pcm(f, ss, t); return Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length); };
const hz = (f, ss, t) => { const x = pcm(f, ss, t); let z = 0; for (let i = 1; i < x.length; i++) if (x[i - 1] <= 0 && x[i] > 0) z++; return z / (x.length / 48000); };
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b} (±${tol})`);
try {
  ff("-f", "lavfi", "-i", "sine=f=440:d=4:sample_rate=48000", T("a440.wav"));
  const A = T("a440.wav");

  // volume curve: 0 → 1 over the first second, held, then down to 0.25 at 3 s
  const vol = [[0, 0], [1, 1], [2, 1], [3, 0.25]];
  assert.equal(volumeExpr([[0, 1]]).includes("lt(t,0)"), true);
  renderAudioClip(A, T("vol.wav"), { vol });
  const base = rms(A, 1.2, 0.5), r = (s) => rms(T("vol.wav"), s, 0.2) / base;
  near(r(0.0), 0.05, 0.08, "curve start (~0)"); near(r(0.5), 0.5, 0.1, "curve halfway up"); near(r(1.5), 1, 0.06, "curve held at 1");
  near(r(2.9), 0.28, 0.08, "curve at 3 s (0.25)"); near(r(3.5), 0.25, 0.06, "held after the last point");
  assert.throws(() => volumeExpr([[1, 1], [0, 1]]), /ascending/);

  // loop: 2 s trimmed piece looped 3 times = 6 s, endless needs len; repeat restarts the curve, extend runs it once
  near(renderAudioClip(A, T("loop.wav"), { in: 0, out: 2, loop: 3 }).seconds, 6, 0.05, "loop 3 times of 2 s");
  near(renderAudioClip(A, T("inf.wav"), { in: 0, out: 2, loop: true, len: 7 }).seconds, 7, 0.05, "endless loop cut at len");
  assert.throws(() => renderAudioClip(A, T("x.wav"), { in: 0, out: 2, loop: true }), /endless loop needs len/);
  const fade = [[0, 0], [2, 1]];   // per 2 s pass: silent → full
  renderAudioClip(A, T("rep.wav"), { in: 0, out: 2, loop: 2, vol: fade, loopVolume: "repeat" });
  renderAudioClip(A, T("ext.wav"), { in: 0, out: 2, loop: 2, vol: fade, loopVolume: "extend" });
  const rb = rms(A, 0.5, 0.3);
  assert.ok(rms(T("rep.wav"), 2.05, 0.2) / rb < 0.15 && rms(T("rep.wav"), 3.8, 0.2) / rb > 0.8, "repeat: the curve starts over at the second pass (quiet at 2 s, loud at 3.9 s)");
  assert.ok(rms(T("ext.wav"), 2.05, 0.2) / rb > 0.95, "extend: after the curve ended it holds (full at 2 s)");

  // delay + trim: silence for 1 s, then the clip; fades
  renderAudioClip(A, T("delay.wav"), { in: 1, out: 2, start: 1 });
  near(duration(T("delay.wav")), 2, 0.05, "delay 1 s + 1 s clip"); assert.ok(rms(T("delay.wav"), 0.1, 0.5) < 1e-4 && rms(T("delay.wav"), 1.3, 0.3) > 0.05, "silent before the delay, sound after");

  // rate (pitch kept), varispeed (pitch moves), tone (pitch moves, length kept)
  const sp = renderAudioClip(A, T("rate.wav"), { in: 0, out: 4, tempo: 2 });
  near(sp.seconds, 2, 0.1, "rate 2 halves the length"); near(hz(T("rate.wav"), 0.2, 1.5), 440, 12, "rate 2 keeps the pitch (atempo)");
  renderAudioClip(A, T("vari.wav"), { in: 0, out: 4, tempo: 2, preservePitch: false });
  near(hz(T("vari.wav"), 0.2, 1.5), 880, 20, "varispeed 2 doubles the pitch");
  const tn = renderAudioClip(A, T("tone.wav"), { in: 0, out: 4, tone: 1.5 });
  near(tn.seconds, 4, 0.1, "tone keeps the length"); near(hz(T("tone.wav"), 0.5, 3), 660, 15, "tone 1.5 = 660 Hz");
  renderAudioClip(A, T("tone2.wav"), { in: 0, out: 4, tone: 0.5 }); near(hz(T("tone2.wav"), 0.5, 3), 220, 8, "tone 0.5 = 220 Hz");
  assert.throws(() => renderAudioClip(A, T("x.wav"), { tone: 3 }), /0.01 to 2/);
  assert.deepEqual(atempo(0.25), ["atempo=0.5", "atempo=0.5"]);

  // audio stream index: a file with two audio streams (440 Hz, 880 Hz)
  ff("-f", "lavfi", "-i", "sine=f=440:d=2:sample_rate=48000", "-f", "lavfi", "-i", "sine=f=880:d=2:sample_rate=48000", "-map", "0:a", "-map", "1:a", T("two.mka"));
  renderAudioClip(T("two.mka"), T("s0.wav"), { stream: 0 }); renderAudioClip(T("two.mka"), T("s1.wav"), { stream: 1 });
  near(hz(T("s0.wav"), 0.2, 1.5), 440, 12, "stream 0"); near(hz(T("s1.wav"), 0.2, 1.5), 880, 20, "stream 1 (audioStreamIndex)");

  // HLS input: a local playlist is a source like any file (video + audio), for audio and for frames
  ff("-f", "lavfi", "-i", "testsrc=s=64x64:r=10:d=3", "-f", "lavfi", "-i", "sine=f=440:d=3:sample_rate=48000", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-g", "10",
    "-f", "hls", "-hls_time", "1", "-hls_playlist_type", "vod", "-hls_segment_filename", T("seg%d.ts"), T("index.m3u8"));
  renderAudioClip(T("index.m3u8"), T("hls.wav"), { in: 0, out: 2 }); near(hz(T("hls.wav"), 0.3, 1.2), 440, 15, "HLS audio");
  const hf = extractVideoFrames(T("index.m3u8"), T("hlsf"), { fps: 10 }); assert.equal(hf.ext, "jpg"); near(hf.count, 30, 2, "HLS frames at 10 fps");

  // transparent: RGBA png frames with real alpha from every alpha-capable source; an opaque mp4 refuses
  const alphaSrc = "color=c=red@0.5:s=64x64:r=10:d=1,format=yuva420p";
  ff("-f", "lavfi", "-i", alphaSrc, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", T("alpha.webm"));
  ff("-f", "lavfi", "-i", "color=c=red@0.5:s=64x64:r=10:d=1,format=yuva444p10le", "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", T("alpha.mov"));
  ff("-f", "lavfi", "-i", "color=c=red@0.5:s=64x64:r=10:d=1,format=rgba", "-f", "apng", T("alpha.apng"));
  const alphaOf = (png) => { const b = run("ffmpeg", ["-v", "error", "-i", png, "-pix_fmt", "rgba", "-f", "rawvideo", "-"], { buffer: true }); return b[3]; };
  for (const f of ["alpha.webm", "alpha.mov", "alpha.apng"]) {
    const o = extractVideoFrames(T(f), T("fr-" + f), { fps: 10, transparent: true });
    assert.equal(o.ext, "png"); near(o.count, 10, 1, f + " frame count");
    const png = path.join(T("fr-" + f), "000001.png"), head = fs.readFileSync(png);
    assert.equal(head[25], 6, f + ": PNG colour type 6 (RGBA)");
    const a = alphaOf(png); assert.ok(a > 100 && a < 160, `${f}: alpha ${a} is the 50 % the source had`);
  }
  const plain = extractVideoFrames(T("index.m3u8"), T("plain"), { fps: 10 }); assert.ok(fs.existsSync(path.join(T("plain"), "000001.jpg")) && plain.ext === "jpg");
  assert.throws(() => extractVideoFrames(T("index.m3u8"), T("nope"), { fps: 10, transparent: true }), /no alpha channel/);
  // without the libvpx decoder the alpha webm would come out opaque: that is why the decoder is forced (proves the option matters)
  const naive = T("naive.png"); ff("-i", T("alpha.webm"), "-frames:v", "1", "-pix_fmt", "rgba", naive);
  assert.equal(alphaOf(naive), 255, "ffmpeg's native vp9 decoder drops the alpha: extractVideoFrames must force libvpx");

  // audioBands: 0-1 s 200 Hz, 1-2 s 2 kHz at half amplitude
  ff("-f", "lavfi", "-i", "sine=f=200:d=1:sample_rate=16000,volume=8", "-f", "lavfi", "-i", "sine=f=2000:d=1:sample_rate=16000,volume=4", "-filter_complex", "[0][1]concat=n=2:v=0:a=1", T("sweep.wav"));
  const B = audioBands(T("sweep.wav"), { fps: 30, bins: 128 });
  const top = (row) => row.indexOf(Math.max(...row)), binHz = 8000 / 128;
  near(top(B.frames[15]) * binHz, 200, binHz * 1.5, "200 Hz peak bin"); near(top(B.frames[45]) * binHz, 2000, binHz * 1.5, "2 kHz peak bin");
  near(Math.max(...B.frames[15]), 1, 0.25, "full-scale sine reads ~1"); near(Math.max(...B.frames[45]), 0.5, 0.15, "half-scale sine reads ~0.5");
  near(B.level[15], 1, 0.15, "level of a full-scale sine"); near(B.level[45], 0.5, 0.12, "level of a half-scale sine");
  assert.equal(B.frames.length, B.level.length); assert.ok(B.wave.data.length > 30 * 2 * 30);
  console.log("media-ffmpeg self-check: volume curve, loop (repeat/extend), delay, trim, rate, tone, varispeed, stream index, HLS, alpha frames (webm/prores/apng) and audio bands all measured on ffmpeg output");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
