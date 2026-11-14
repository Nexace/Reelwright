// HyperFrames renderer helpers for I5 (4K) and I10 (frame range, content-hash frame cache, resumable segments). Opt-in: tools/renderers/hyperframes.mjs
// only calls these when `--resolution`, `frames <from> <to>`, `--cache` or `--resume` is given, so a plain render is the producer's own, as before.
//   producerResolution(P, spec)   "4k" | "portrait-4k" | "square-4k" (| "2x" | a number when the result is a canvas preset) → { preset, width, height, scale }:
//                                 the @hyperframes/parsers canvas preset the producer takes as outputResolution; the aspect must match the film
//   rangeShim(from, n, fps)       a <script> for <head>: window.__timelines.main (set by KIT.start) is wrapped so the page shows film time
//                                 from/fps + t for a composition n frames long. The film is a pure function of t, so a range of frames is the
//                                 same pixels the whole render would give; the producer renders only these n frames.
//   runsOf(frames, { gap, seg })  sorted frame numbers → [[a, b)) ...]: runs, bridged over gaps up to `gap` frames, cut at `seg` frames
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CANVAS_DIMENSIONS } from "@hyperframes/parsers";
import { resolution } from "../render_opts.mjs";
import { fingerprint } from "./pvk.mjs";

export function producerResolution(P, spec) {
  const r = resolution(P, spec);   // scale limits and the aspect check, with the same messages as the pvk path
  const hit = Object.entries(CANVAS_DIMENSIONS).find(([, d]) => d.width === r.width && d.height === r.height);
  if (!hit) throw new Error(`--resolution ${spec}: hyperframes renders to its canvas presets (${Object.keys(CANVAS_DIMENSIONS).join(", ")}); ${r.width}x${r.height} is none of them`);
  return { preset: hit[0], width: r.width, height: r.height, scale: r.scale };
}

export const rangeShim = (from, n, fps) => `<script>/* reelwright frame range */(()=>{const o=${from}/${fps},d=(${n}-0.5)/${fps};let m;window.__timelines=window.__timelines||{};
Object.defineProperty(window.__timelines,"main",{configurable:true,enumerable:true,get:()=>m,set:(v)=>{m=v&&{...v,duration:()=>d,time:()=>v.time()-o,seek:(t)=>v.seek(t+o)};}});})();</script>`;

export function runsOf(frames, { gap = 0, seg = Number.MAX_SAFE_INTEGER } = {}) {
  const runs = [];
  for (const f of [...frames].sort((a, b) => a - b)) {
    const last = runs[runs.length - 1];
    if (last && f - last[1] <= gap && f - last[0] < seg) last[1] = f + 1;   // bridged frames are rendered too, they cost less than a new producer start
    else runs.push([f, f + 1]);
  }
  return runs.flatMap(([a, b]) => Array.from({ length: Math.ceil((b - a) / seg) }, (_, i) => [a + i * seg, Math.min(b, a + (i + 1) * seg)]));
}

const sha = (b) => createHash("sha256").update(b).digest("hex");
const HERE = fileURLToPath(import.meta.url);

// What every frame shows → { keys: Map(frame → cache file | null), media: number of KIT.video clips }. Loads the film page in plain Chromium, as `info` does,
// seeks every frame and fingerprints the DOM (pvk's fingerprint); the key also holds everything else a frame depends on (files the page loaded, the
// stylesheets, the frame size and scale, producer + browser + this code). null key = never cached (a canvas that can't be read).
export async function frameKeys({ launch, DIR, HF, P, FPS, from, to, scale, fingerprints = true, extra = {} }) {
  const browser = await launch(["--allow-file-access-from-files"]);
  const loaded = new Set(), errors = [];
  try {
    const p = await browser.newPage({ viewport: { width: P.width || 1920, height: P.height || 1080 } });
    p.on("request", (r) => loaded.add(r.url()));
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(pathToFileURL(path.join(HF, "index.html")).href);
    if (!(await p.evaluate(() => window.READY).catch(() => false)) || errors.length) throw new Error("hf/index.html failed to load: " + (errors[0] || "READY never resolved"));
    const media = await p.evaluate(() => (window.KIT_MEDIA && window.KIT_MEDIA.videos || []).length);
    const files = [...loaded, pathToFileURL(HERE).href, pathToFileURL(path.join(path.dirname(HERE), "hyperframes.mjs")).href].sort().flatMap((u) => {
      if (!u.startsWith("file:")) return [u];
      const f = fileURLToPath(u);
      if (/\.m?js$/.test(f) && f.startsWith(HF + path.sep) && !f.startsWith(path.join(HF, "kit") + path.sep)) return [];   // the film's own scripts show in the DOM; the kit does not
      return [path.relative(DIR, f).split(path.sep).join("/") + " " + (fs.existsSync(f) ? sha(fs.readFileSync(f)) : "missing")];
    });
    const css = await p.evaluate(() => [...document.styleSheets].map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join("\n"); } catch { return s.href; } }).join("\n"));
    const global = sha(JSON.stringify({ files, css: sha(css), size: [P.width || 1920, P.height || 1080, scale], platform: `${process.platform}-${process.arch}`, ...extra }));
    const keys = new Map();
    for (let f = from; fingerprints && f < to; f++) {
      await p.evaluate((t) => window.render(t), f / FPS);
      const fp = await p.evaluate(fingerprint);
      keys.set(f, fp == null ? null : sha(global + sha(fp)).slice(0, 40));
    }
    return { keys, media };
  } finally { await browser.close(); }
}
