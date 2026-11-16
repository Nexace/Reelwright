// node tools/selfcheck/media-wiring.mjs: docs/plans/p9-patches/media-wiring.patch (tools/media.js, tools/renderers/media.mjs) applied to a COPY of tools/
// in a temp root. KIT.audio / KIT.video carry the new options through the REAL renderer path: mediaMix() mixes a clip with a volume curve, a pitch shift
// (tone), a loop and a second audio stream and the result is measured; a KIT.video with `transparent` and `loop` is extracted by pagesMedia() and the page
// shows looped, alpha png frames. Offline (ffmpeg, local Chromium). Once the patch is applied to the real files, the copy already has it and this keeps passing.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { applyPatch } from "../patch_util.mjs";
import { launch } from "../browser.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "media-wiring-"));
const ff = (...a) => { const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...a], { encoding: "utf8" }); assert.equal(r.status, 0, r.stderr); };
try {
  for (const d of ["vendor", "node_modules", "fonts", "themes"]) if (fs.existsSync(path.join(ROOT, d))) fs.symlinkSync(path.join(ROOT, d), path.join(tmp, d), "junction");   // junction: Windows needs no symlink privilege for a directory
  fs.cpSync(path.join(ROOT, "tools"), path.join(tmp, "tools"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "package.json"), path.join(tmp, "package.json"));
  const how = applyPatch(tmp, path.join(ROOT, "docs", "plans", "p9-patches", "media-wiring.patch"));
  const { mediaMix, pagesMedia } = await import(pathToFileURL(path.join(tmp, "tools", "renderers", "media.mjs")).href);
  const proj = path.join(tmp, "proj"); fs.mkdirSync(path.join(proj, ".cache"), { recursive: true });

  // ── audio ──
  const sine = path.join(proj, "s.wav"); ff("-f", "lavfi", "-i", "sine=f=440:d=2:r=48000", "-af", "volume=4", sine);
  const two = path.join(proj, "two.mka"); ff("-f", "lavfi", "-i", "sine=f=440:d=2:r=48000", "-f", "lavfi", "-i", "sine=f=1000:d=2:r=48000", "-map", "0:a", "-map", "1:a", two);
  const pcm = (f, a, b) => { const r = spawnSync("ffmpeg", ["-v", "error", "-ss", String(a), "-t", String(b - a), "-i", f, "-ac", "1", "-ar", "48000", "-f", "s16le", "-"], { maxBuffer: 1 << 26 }); assert.equal(r.status, 0); return new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1); };
  const rms = (f, a, b) => { const p = pcm(f, a, b); let s = 0; for (const v of p) s += v * v; return Math.sqrt(s / p.length) / 32768; };
  const hz = (f, a, b) => { const p = pcm(f, a, b); let z = 0; for (let i = 1; i < p.length; i++) if ((p[i - 1] < 0) !== (p[i] < 0)) z++; return z / 2 / (b - a); };
  const mix = (clip) => { fs.writeFileSync(path.join(proj, ".cache", "media-audio.json"), JSON.stringify({ dur: 3, clips: [{ start: 0, in: 0, gain: 1, fadeIn: 0, fadeOut: 0, ...clip }] })); const o = mediaMix(proj); assert.ok(o, "mediaMix returned nothing"); return o; };

  let o = mix({ file: sine, vol: [[0, 0], [1, 1]], len: 2 });
  const rv = [rms(o, 0.1, 0.3), rms(o, 0.8, 1), rms(o, 1.2, 1.6)]; assert.ok(rv[1] > 3 * rv[0] && rv[2] > 0.2, "volume curve: silent at the start, full at 1 s " + rv);
  o = mix({ file: sine, tone: 2, len: 2 }); assert.ok(Math.abs(hz(o, 0.2, 1) - 880) < 25, `tone 2 doubles the pitch (${hz(o, 0.2, 1)} Hz)`);
  assert.ok(Math.abs(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", o], { encoding: "utf8" }).stdout - 3) < 0.1, "the mix is the film's length");
  o = mix({ file: sine, out: 0.5, loop: 3, len: 1.5 }); assert.ok(rms(o, 1.0, 1.4) > 0.2 && rms(o, 1.7, 2.5) < 0.01, "loop 3 of a 0.5 s slice: sound until 1.5 s, silence after");
  o = mix({ file: two, stream: 1, len: 2 }); assert.ok(Math.abs(hz(o, 0.2, 1) - 1000) < 30, `stream 1 is the 1 kHz track (${hz(o, 0.2, 1)} Hz)`);
  o = mix({ file: two, len: 2 }); assert.ok(Math.abs(hz(o, 0.2, 1) - 440) < 15, "no stream option: the first track, as before");
  console.log(`PASS  audio (patch ${how}): vol curve, tone, loop and stream index reach the mix through mediaMix()`);

  // ── video: transparent + loop through KIT.video and pagesMedia ──
  const pageDir = path.join(tmp, "page"); fs.mkdirSync(pageDir);
  ff("-f", "lavfi", "-i", "color=c=red@0.5:s=64x64:r=10:d=1,format=yuva420p", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", path.join(pageDir, "clip.webm"));
  const k = (f) => pathToFileURL(path.join(tmp, "tools", f)).href;
  fs.writeFileSync(path.join(pageDir, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${k("kit.css")}"></head><body><div id="stage"></div>
<script>window.PROJECT={fps:10,width:320,height:180,speechEnd:3,tail:0};window.VO={};window.MUSIC={};</script><script src="${k("engine.js")}"></script><script src="${k("media.js")}"></script>
<script>KIT.video('clip.webm',{id:'v',start:0,dur:2.5,loop:true,transparent:true});KIT.start({dur:3,render:()=>{}});</script></body></html>`);
  const browser = await launch(["--allow-file-access-from-files"]);
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
    await page.goto(pathToFileURL(path.join(pageDir, "index.html")).href); assert.ok(await page.evaluate(() => window.READY));
    await pagesMedia(proj, page, 10, pageDir);
    const src = async (t) => { await page.evaluate((t) => window.render(t), t); await page.waitForTimeout(50); return page.evaluate(() => document.getElementById("v").src); };
    assert.match(await src(0.3), /000004\.png$/, "frame 3 at 0.3 s is a png");
    assert.match(await src(1.2), /000003\.png$/, "loop: t = 1.2 s of a 1 s clip is frame 2 again (not the held last frame 000010)");
    assert.match(await src(2.4), /000005\.png$/, "loop keeps wrapping");
    const f = fileURLToPath(await src(0.3)), r = spawnSync("ffmpeg", ["-v", "error", "-i", f, "-vf", "crop=1:1:30:30,format=rgba", "-frames:v", "1", "-f", "rawvideo", "-"], { encoding: "buffer" });
    assert.ok(r.stdout[3] > 100 && r.stdout[3] < 160, `the frame keeps its alpha (${r.stdout[3]} of 255)`);
  } finally { await browser.close(); }
  console.log("PASS  video: KIT.video { transparent, loop } extracts RGBA png frames, and the page wraps the frame index");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log("media-wiring self-check: media.js + renderers/media.mjs patch");
