// node tools/selfcheck/embed.mjs — `reelwright embed` on a copy of projects/example-hf (with a fixed kit-data.js, a
// silent mix.wav and an extra image the film sets at runtime) in a temp folder: the page must become ready in the
// vendored player, seek and play, inline the two catalog blocks (sync XHR) and the image, and ask the network for nothing
// under its own no-network CSP. Needs no VO, render or internet.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { embed } from "../commands/embed.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "embed-")));
const dir = path.join(tmp, "film");
try {
  const src = path.join(ROOT, "projects", "example-hf");
  fs.mkdirSync(path.join(dir, "hf"), { recursive: true });
  fs.copyFileSync(path.join(src, "project.json"), path.join(dir, "project.json"));
  for (const f of ["index.html", "film.js", "blocks"]) fs.cpSync(path.join(src, "hf", f), path.join(dir, "hf", f), { recursive: true });
  // what tools/sched.py would write (a run of example-hf, fixed so the check needs no VO)
  const words = (s, t) => s.split(" ").map((w, i) => ({ w: w.replace(/\W/g, ""), t: t + i * 0.3, d: 0.25 }));
  const line = (text, at) => ({ at: at - 0.1, start: at, end: at + text.split(" ").length * 0.3, text, words: words(text, at) });
  fs.writeFileSync(path.join(dir, "hf", "kit-data.js"),
    `window.PROJECT=${JSON.stringify({ title: "embed check", fps: 30, lead: 0.8, tail: 2.4, speechEnd: 8.8 })};\n` +
    `window.VO=${JSON.stringify({ hook: line("Product films, written as code.", 1.2), hf: line("Now rendered by HyperFrames.", 3.6),
      chart: line("Every chart grows on the beat.", 6), end: line("Reelwright.", 8.4) })};\n` +
    `window.MUSIC=${JSON.stringify({ source: "synth", bpm: 100, beat: 0.6, bar: 2.4, t0: 0, drop_bar: 2, style: "drive", drop: 4.8 })};\n`);
  // an image the film swaps in from render(t), the way K.img does for clip frames
  fs.writeFileSync(path.join(dir, "hf", "dot.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><circle cx="4" cy="4" r="4" fill="red"/></svg>`);
  fs.appendFileSync(path.join(dir, "hf", "film.js"), `\n{ const im = KIT.el('img', 'embed-check'); const r = window.render;
  window.render = async (t) => { KIT.img(im, 'dot.svg'); return r(t); }; }\n`);
  // 1 s of silence as mix.wav (16-bit mono 8 kHz)
  const n = 8000, wav = Buffer.alloc(44 + n * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(n * 2, 40);
  fs.writeFileSync(path.join(dir, "mix.wav"), wav);

  const r = await embed(dir);
  console.log(`embed: ${(r.size / 1048576).toFixed(2)} MB, ${r.assets} files, duration ${r.duration}`);
  assert.deepEqual(r.errors, [], "player errors");
  assert.deepEqual(r.misses, [], "network requests");
  assert.ok(r.duration > 9 && r.duration < 14, `duration ${r.duration}`);
  assert.ok(r.audio, "audio");
  const page = fs.readFileSync(r.out, "utf8");   // the asset map's keys (only it names these paths)
  for (const k of ["film/hf/blocks/directional-wipe.html", "film/hf/blocks/animated-bar-chart.html", "film/hf/dot.svg"])
    assert.ok(page.includes(k + '\\":\\"data:'), `${k} not inlined`);
  console.log("embed self-check: ok");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
