// node tools/selfcheck/p8-audio-report.mjs — `reelwright audio-report` (tools/audio_report.py) on a synthetic 8 s track: clicks every 0.5 s
// (120 BPM), 6 dB louder from 4 s. It must find about 120 BPM, onsets within 30 ms of the clicks, a loudness step near 4 s,
// and answer --at / --place-at / --range. Offline; writes one wav to the OS temp folder.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const SR = 22050, N = 8 * SR, pcm = Buffer.alloc(N * 2);
for (let k = 0; k < 16; k++) {
  const amp = k < 8 ? 0.35 : 0.7;
  for (let i = 0; i < 2000; i++) {   // 90 ms decaying 900 Hz click
    const s = Math.round(32767 * amp * Math.sin(2 * Math.PI * 900 * i / SR) * Math.exp(-i / 500)), j = k * SR / 2 + i;
    if (j < N) pcm.writeInt16LE(s, j * 2);
  }
}
const h = Buffer.alloc(44);
h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p8-audio-")), wav = path.join(dir, "clicks.wav");
fs.writeFileSync(wav, Buffer.concat([h, pcm]));
try {
  const run = (...a) => { const r = spawnSync(PY, [path.join(ROOT, "tools", "audio_report.py"), wav, ...a, "--json"], { encoding: "utf8" }); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
  const r = run("--at", "2.1", "--place-at", "3.4");
  assert.ok(Math.abs(r.rhythm.bpm - 120) < 3, `bpm ${r.rhythm.bpm}`);
  const hit = r.onsets.filter((t) => [...Array(16).keys()].some((k) => Math.abs(t - k * 0.5) < 0.03));
  assert.ok(hit.length >= 14, `${hit.length} of 16 clicks found: ${r.onsets}`);
  assert.ok(r.sections.length >= 2 && Math.abs(r.sections[0].end - 4) < 0.6, JSON.stringify(r.sections));
  assert.ok(Math.abs(r.at.onset - 2) < 0.05 && Math.abs(r.at.beat - 2) < 0.06, JSON.stringify(r.at));
  assert.ok(Math.abs(r.place_at.onset - 3.5) < 0.05, JSON.stringify(r.place_at));
  const g = run("--range", "4", "6");
  assert.ok(g.onsets.every((t) => t >= 4 && t <= 6) && g.onsets.length >= 3);
  console.log(`p8-audio-report self-check: ${r.rhythm.bpm} BPM, ${hit.length}/16 onsets, ${r.sections.length} sections, --at/--place-at/--range answer`);
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
