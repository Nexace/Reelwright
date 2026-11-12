// node tools/shotcards/envelope.mjs <audio file> [--fps 30] [--var ENV] > film/env.js
// A loudness envelope for KIT.shotcards.voiceWaveform: ffmpeg decodes the file to mono 16 kHz PCM, this script takes the RMS of every
// 1/fps window and scales it so the 99th percentile is 1. Prints JSON { fps, dur, rms: [0..1, …] }; with --var NAME it prints
// `window.NAME = { … };` instead, a file a film can load with <script src="env.js"> (a film cannot fetch() from file://).
// Needs ffmpeg on PATH (the repo already requires it for audio). Deterministic: same file, same numbers.
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args.splice(i, 2)[1]; };
const fps = Number(opt("--fps", 30)), varName = opt("--var", null), file = args[0];
if (!file || !(fps > 0)) { console.error("usage: node tools/shotcards/envelope.mjs <audio file> [--fps 30] [--var NAME]"); process.exit(2); }
const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], { maxBuffer: 1 << 30 });
if (r.error || r.status !== 0) { console.error("ffmpeg failed: " + (r.error?.message || String(r.stderr))); process.exit(1); }
const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 2)), win = Math.round(16000 / fps), n = Math.ceil(pcm.length / win), raw = [];
for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = i * win; k < Math.min(pcm.length, (i + 1) * win); k++, c++) s += pcm[k] * pcm[k]; raw.push(Math.sqrt(s / Math.max(1, c)) / 32768); }
const top = raw.slice().sort((a, b) => a - b)[Math.floor(raw.length * 0.99)] || 1e-9;
const out = { fps, dur: +(pcm.length / 16000).toFixed(3), rms: raw.map((v) => +Math.min(1, v / top).toFixed(3)) };
console.log(varName ? `window.${varName} = ${JSON.stringify(out)};` : JSON.stringify(out));
