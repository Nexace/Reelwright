// Manim scene lints (Phase 11 P4, rows manim:m11.2 and m11.3). Pure functions, no browser, no Manim; run by
// `reelwright manim-lint <project>` (tools/commands/manim-lint.mjs) and proved by tools/selfcheck/p4-lint.mjs.
// Own code (the Manim Craft scripts these rules come from carry no licence, so nothing is copied).
//   lintTexts(doc, opts) -> findings    doc = the texts.json a scene writes with reelwright_manim.texts (px boxes per snapshot)
//        OFF-FRAME     a text box leaves the frame by more than 1 px                                         (FAIL)
//        TEXT-OVERLAP  two texts of one snapshot overlap by more than 15 % of the smaller box               (FAIL)
//        TINY-TEXT     estimated font size under 28 px at 1080 lines (scaled with the frame height)         (FAIL)
//   lintPace(vo, { dur }, opts) -> { findings, unnarrated }   vo = { id: { start, end, words: [...] } } (kit.json / data.js)
//        RUSHED        a line over 2.5 words/s (a Manim explainer is paced slower than speech)               (WARN)
//        GAP           more than 4 s of silence between two lines                                            (WARN)
//        UNNARRATED    under 15 % of the film without voice-over (the picture needs room to breathe)         (WARN)
//        plus the info line `unnarrated 23 %` (always)                                                       (INFO)
//   darkStretches(luma, fps, opts) -> [{ from, to }]   runs of frames with mean luma under 0.04 (0..1) for 1.5 s or more
//   lumaOfVideo(file) -> { fps, luma: [0..1 per frame] }   via ffmpeg signalstats (YAVG), for the dark-stretch lint
//   findings are { rule, severity: 'FAIL' | 'WARN' | 'INFO', t, text, msg }; formatFindings() prints them.
//   sceneTexts(DIR, P) -> [{ id, file, doc }]   the newest texts.json of each Manim scene of a project (none exported = not listed)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const DEFAULTS = { overlap: 0.15, offFrame: 1, minPx1080: 28, maxWps: 2.5, gap: 4, unnarrated: 0.15, dark: 0.04, darkSec: 1.5 };
const area = (b) => Math.max(0, b.w) * Math.max(0, b.h);
const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const q = (s) => JSON.stringify(String(s).length > 28 ? String(s).slice(0, 27) + "…" : String(s));

export function lintTexts(doc, o = {}) {
  const c = { ...DEFAULTS, ...o };
  if (!doc || !Array.isArray(doc.snapshots) || !(doc.width > 0) || !(doc.height > 0)) throw new Error("texts.json: expected { width, height, snapshots: [{ t, texts }] }");
  const out = [], minPx = (c.minPx1080 * doc.height) / 1080, seenTiny = new Set();
  for (const snap of doc.snapshots) {
    const at = `${(+snap.t).toFixed(2)}s${snap.label ? " " + snap.label : ""}`, T = snap.texts || [];
    T.forEach((x, i) => {
      const over = [Math.max(0, -x.x), Math.max(0, x.x + x.w - doc.width), Math.max(0, -x.y), Math.max(0, x.y + x.h - doc.height)];
      if (Math.max(...over) > c.offFrame) out.push({ rule: "OFF-FRAME", severity: "FAIL", t: snap.t, text: x.text, msg: `${at}: ${q(x.text)} leaves the frame by ${Math.round(Math.max(...over))} px (${["left", "right", "top", "bottom"][over.indexOf(Math.max(...over))]})` });
      if (x.size_px < minPx && !seenTiny.has(x.text)) { seenTiny.add(x.text); out.push({ rule: "TINY-TEXT", severity: "FAIL", t: snap.t, text: x.text, msg: `${at}: ${q(x.text)} is about ${x.size_px.toFixed(0)} px, under ${minPx.toFixed(0)} px for a ${doc.height} px frame` }); }
      for (let j = i + 1; j < T.length; j++) {
        const y = T[j], share = inter(x, y) / Math.max(1e-9, Math.min(area(x), area(y)));
        if (share > c.overlap) out.push({ rule: "TEXT-OVERLAP", severity: "FAIL", t: snap.t, text: x.text, msg: `${at}: ${q(x.text)} and ${q(y.text)} overlap by ${(share * 100).toFixed(0)} % of the smaller` });
      }
    });
  }
  return out;
}

export function lintPace(vo, { dur }, o = {}) {
  const c = { ...DEFAULTS, ...o }, out = [], lines = Object.entries(vo || {}).map(([id, v]) => ({ id, start: v.start, end: v.end, words: (v.words || []).length || String(v.text || "").split(/\s+/).filter(Boolean).length })).sort((a, b) => a.start - b.start);
  for (const l of lines) {
    const wps = l.words / Math.max(1e-6, l.end - l.start);
    if (l.words >= 3 && wps > c.maxWps) out.push({ rule: "RUSHED", severity: "WARN", t: l.start, text: l.id, msg: `${l.start.toFixed(2)}s "${l.id}": ${wps.toFixed(1)} words/s over ${c.maxWps} (${l.words} words in ${(l.end - l.start).toFixed(1)} s)` });
  }
  for (let i = 1; i < lines.length; i++) {
    const g = lines[i].start - lines[i - 1].end;
    if (g > c.gap) out.push({ rule: "GAP", severity: "WARN", t: lines[i - 1].end, text: lines[i].id, msg: `${lines[i - 1].end.toFixed(2)}s: ${g.toFixed(1)} s without voice-over before "${lines[i].id}" (over ${c.gap} s)` });
  }
  let covered = 0, edge = 0;
  for (const l of lines) { const a = Math.max(l.start, edge, 0), b = Math.min(l.end, dur); if (b > a) covered += b - a; edge = Math.max(edge, l.end); }
  const unnarrated = dur > 0 ? Math.max(0, 1 - covered / dur) : 0;
  out.push({ rule: "UNNARRATED", severity: "INFO", t: 0, text: "", msg: `unnarrated ${Math.round(unnarrated * 100)} % of ${dur.toFixed(1)} s` });
  if (unnarrated < c.unnarrated - 1e-9) out.push({ rule: "UNNARRATED", severity: "WARN", t: 0, text: "", msg: `only ${(unnarrated * 100).toFixed(0)} % of the film is unnarrated, under ${c.unnarrated * 100} %: leave the picture room to breathe` });
  return { findings: out, unnarrated };
}

export function darkStretches(luma, fps, o = {}) {
  const c = { ...DEFAULTS, ...o }, need = Math.ceil(c.darkSec * fps - 1e-9), out = [];
  let from = -1;
  for (let i = 0; i <= luma.length; i++) {
    const dark = i < luma.length && luma[i] < c.dark;
    if (dark && from < 0) from = i;
    if (!dark && from >= 0) { if (i - from >= need) out.push({ from: +(from / fps).toFixed(3), to: +(i / fps).toFixed(3) }); from = -1; }
  }
  return out;
}

// per-frame mean luma of a video (0 = black, 1 = white, limited range 16..235 normalised): ffmpeg signalstats prints YAVG for each frame
export function lumaOfVideo(file) {
  const r = spawnSync("ffmpeg", ["-v", "info", "-i", file, "-vf", "signalstats,metadata=mode=print", "-an", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 256 << 20 });
  if (r.error || r.status !== 0) throw new Error(`ffmpeg could not read ${file}: ${(r.stderr || r.error || "").toString().trim().slice(-300)}`);
  const luma = [...(r.stderr + r.stdout).matchAll(/lavfi\.signalstats\.YAVG=([\d.]+)/g)].map((m) => Math.min(1, Math.max(0, (+m[1] - 16) / 219)));
  const p = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=avg_frame_rate", "-of", "csv=p=0", file], { encoding: "utf8" });
  const [a, b] = (p.stdout || "").trim().split("/").map(Number), fps = a && b ? a / b : 30;
  return { fps, luma };
}

export function darkFindings(luma, fps, o = {}) {
  return darkStretches(luma, fps, o).map((d) => ({ rule: "DARK-STRETCH", severity: "WARN", t: d.from, text: "", msg: `${d.from.toFixed(2)}s to ${d.to.toFixed(2)}s (${(d.to - d.from).toFixed(1)} s) is nearly black` }));
}

export const formatFindings = (f) => f.map((x) => `  ${x.severity.padEnd(4)}  ${x.rule.padEnd(12)} ${x.msg}`);

export function sceneTexts(DIR, P) {
  const root = path.join(DIR, ...(P.renderer === "hyperframes" ? ["hf", "kit", "manim"] : [".cache", "manim"])), out = [];
  for (const s of P.manim?.scenes || []) {
    const dirs = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => d.startsWith(s.id + "-") && /^[0-9a-f]{12}$/.test(d.slice(s.id.length + 1))) : [];
    const files = dirs.map((d) => path.join(root, d, "texts.json")).filter((f) => fs.existsSync(f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (files.length) out.push({ id: s.id, file: files[0], doc: JSON.parse(fs.readFileSync(files[0], "utf8")) });
  }
  return out;
}
