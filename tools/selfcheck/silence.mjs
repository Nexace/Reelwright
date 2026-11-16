// node tools/selfcheck/silence.mjs — Remotion row 2.4.9: `reelwright silence` (tools/silence.mjs). Synthesised audio with known gaps (ffmpeg lavfi, no fixtures):
//   tone 1.0 s | silence 1.0 | tone 1.0 | silence 1.0 | click 0.2 | silence 1.0 | tone 1.0 | silence 1.5   (7.7 s; 440 Hz at -30 dB, digital silence between)
// checks: segment times within 60 ms, --min drops a short gap, --merge absorbs the click, `auto` (loudnorm threshold) finds the same gaps, a quiet tone is
// silence at -40dB but speech at -60dB, --trim cuts a voice line's leading and trailing silence (duration read back), --json is the CLI's own JSON, errors.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { detectSilence, trimSilence, probeDuration } from "../silence.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rw-silence-"));
const T = (f) => path.join(tmp, f);
const sh = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: "utf8" }); assert.equal(r.status, 0, `${cmd} ${args.join(" ")}\n${r.stderr}`); return r; };
const near = (a, b, what, tol = 0.06) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} is not within ${tol} of ${b}`);

// a list of [kind, seconds, volume?] → one mono 44.1 kHz wav
function synth(file, parts) {
  const ins = parts.map(([k, d, v = 0.25], i) => (k === "tone" ? `sine=f=440:r=44100:d=${d},volume=${v}` : `anullsrc=r=44100:cl=mono:d=${d}`) + `,aformat=sample_rates=44100:channel_layouts=mono[a${i}]`);
  sh("ffmpeg", ["-y", "-v", "error", "-filter_complex", `${ins.join(";")};${parts.map((_, i) => `[a${i}]`).join("")}concat=n=${parts.length}:v=0:a=1[o]`, "-map", "[o]", "-c:a", "pcm_s16le", file]);
}
const cli = (...a) => spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), ...a], { encoding: "utf8", cwd: ROOT });

try {
  const F = T("a.wav");
  synth(F, [["tone", 1], ["sil", 1], ["tone", 1], ["sil", 1], ["tone", 0.2], ["sil", 1], ["tone", 1], ["sil", 1.5]]);
  near(probeDuration(F), 7.7, "synthesised duration", 0.02);

  // click (0.2 s) kept as speech when merge is 0.1, absorbed with the default 0.3
  let d = detectSilence(F, { merge: 0.1 });
  assert.equal(d.silences.length, 4, JSON.stringify(d.silences));
  assert.equal(d.speech.length, 4, JSON.stringify(d.speech));
  [[1, 2], [3, 4], [4.2, 5.2], [6.2, 7.7]].forEach(([s, e], i) => { near(d.silences[i].start, s, `silence ${i} start`); near(d.silences[i].end, e, `silence ${i} end`); });
  [[0, 1], [2, 3], [4, 4.2], [5.2, 6.2]].forEach(([s, e], i) => { near(d.speech[i].start, s, `speech ${i} start`); near(d.speech[i].end, e, `speech ${i} end`); });
  assert.equal(d.noise, "-40dB");
  d = detectSilence(F);
  assert.equal(d.silences.length, 3, "merge 0.3 turns the 0.2 s click and the silences around it into one silence: " + JSON.stringify(d.silences));
  assert.equal(d.speech.length, 3);
  near(d.silences[1].start, 3, "merged silence start"); near(d.silences[1].end, 5.2, "merged silence end");
  near(d.silences[2].end, 7.7, "a trailing silence runs to the end of the file", 0.02);
  assert.equal(d.silences.reduce((a, s) => a + s.duration, 0) + d.speech.reduce((a, s) => a + s.duration, 0) > d.duration - 0.05, true, "speech + silence cover the file");

  // --min: a 0.4 s gap is not a silence at the default 0.5 s, is one at 0.3
  const G = T("gap.wav"); synth(G, [["tone", 1], ["sil", 0.4], ["tone", 1]]);
  assert.equal(detectSilence(G).silences.length, 0); assert.equal(detectSilence(G, { min: 0.3 }).silences.length, 1);
  assert.equal(detectSilence(G).speech.length, 1);

  // --noise: a -46 dB tone is silence at -40dB, speech at -60dB; auto copes with a quiet file
  const Q = T("quiet.wav"); synth(Q, [["tone", 1, 0.04], ["sil", 1], ["tone", 1, 0.04]]);   // sine is 0.125 (-18 dB) x 0.04 = -46 dB
  assert.equal(detectSilence(Q, { noise: "-40dB" }).speech.length, 0, "a -46 dB tone is silence at -40dB");
  assert.equal(detectSilence(Q, { noise: "-60" }).speech.length, 2, "the same tone is speech at -60dB (bare number accepted)");
  d = detectSilence(F, { noise: "auto", merge: 0.1 });
  assert.match(d.noise, /^-\d+(\.\d+)?dB$/); assert.equal(d.silences.length, 4, "auto: " + JSON.stringify(d));
  assert.throws(() => detectSilence(F, { noise: "loud" }), /should look like -40dB/);
  assert.throws(() => detectSilence(F, { min: 0 }), /--min/);
  assert.throws(() => detectSilence(T("nope.wav")), /no such file/);

  // --trim: the voice line (silence 0.8 | tone 1.2 | silence 0.6) keeps tone + pad on each side
  const V = T("vo.wav"); synth(V, [["sil", 0.8], ["tone", 1.2], ["sil", 0.6]]);
  const t = trimSilence(V, T("vo-trim.wav"), { pad: 0.1 });
  near(probeDuration(T("vo-trim.wav")), 1.4, "trimmed duration (1.2 s + 2 x 0.1 pad)", 0.05);
  near(t.removedStart, 0.7, "removed at the start", 0.06); near(t.removedEnd, 0.5, "removed at the end", 0.06);
  d = detectSilence(T("vo-trim.wav"), { min: 0.05 });
  assert.equal(d.speech.length, 1, "one speech segment left"); assert.ok(d.speech[0].start < 0.15 && d.duration - d.speech[0].end < 0.15, "only the pad is left around it");
  assert.throws(() => trimSilence(V, V), /overwrite/);
  assert.throws(() => trimSilence(T("quiet.wav"), T("x.wav")), /nothing to keep/);

  // the CLI: its own --json, the text table, --trim, a usage error
  let r = cli("silence", F, "--json", "--merge", "0.1");
  assert.equal(r.status, 0, r.stderr); const j = JSON.parse(r.stdout);
  assert.equal(j.silences.length, 4); assert.equal(j.speech.length, 4); near(j.duration, 7.7, "cli duration", 0.02);
  r = cli("silence", F, "--min", "0.5"); assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /speech\s+0\.000 -\s+1\.000/); assert.match(r.stdout, /silence\s+6\.\d+ -\s+7\.7/);
  r = cli("silence", V, "--trim", T("cli-trim.wav"), "--pad", "0.2"); assert.equal(r.status, 0, r.stderr);
  near(probeDuration(T("cli-trim.wav")), 1.6, "cli trimmed duration", 0.05);
  r = cli("silence"); assert.equal(r.status, 1); assert.match(r.stderr, /usage: reelwright silence/);
  r = cli("silence", T("missing.wav")); assert.equal(r.status, 1); assert.match(r.stderr, /no such file/);
  r = cli("silence", F, "--json", "--min", "x"); assert.notEqual(r.status, 0);
  console.log("silence self-check passed: segments, min, merge, noise (fixed and loudnorm auto), trim, CLI, errors");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
