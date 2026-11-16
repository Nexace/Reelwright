// grade-compare <image|video> [--at t] [--presets a,b,c | grade | effect | all] [--intensity 0..1] [--cols n] [--out file.png]
//                    one picture (or one frame of a video) through HyperFrames colour-grading presets (the ones KIT.grade takes), side by
//                    side with the original, one labelled PNG. Drawn by the HyperFrames runtime itself, so each tile is the real grade.
//                    Default presets: the grade presets (neutral is the original); `effect` the effect presets (vhs, halftone, ...). Default output: grade-compare.png.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { HF_COLOR_GRADING_GRADE_PRESETS, HF_COLOR_GRADING_EFFECT_PRESETS, HF_COLOR_GRADING_PRESETS } from "@hyperframes/core";
import { sheet } from "./stills2.mjs";

const fail = (m) => { console.error(m); process.exit(1); };

export const presetIds = (which = "grade") => {
  const ids = (xs) => xs.map((p) => p.id).filter((id) => id !== "neutral");
  if (which === "all") return ids(HF_COLOR_GRADING_PRESETS);
  if (which === "effect") return ids(HF_COLOR_GRADING_EFFECT_PRESETS);
  if (which === "grade") return ids(HF_COLOR_GRADING_GRADE_PRESETS);
  const known = new Set(HF_COLOR_GRADING_PRESETS.map((p) => p.id)), want = which.split(",").map((s) => s.trim()).filter(Boolean);
  const bad = want.filter((p) => !known.has(p));
  if (bad.length) throw new Error(`unknown preset ${bad.join(", ")}; have: ${[...known].join(", ")}`);
  return want;
};

export default async function gradeCompare({ args }) {
  const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const [at, presets, intensity, cols, outArg] = ["--at", "--presets", "--intensity", "--cols", "--out"].map(flag);
  const src = args.find((a) => !a.startsWith("--"));
  if (!src || !fs.existsSync(src)) fail("usage: reelwright grade-compare <image|video> [--at t] [--presets a,b|grade|effect|all] [--intensity 0..1] [--out file.png]");
  let ids;
  try { ids = presetIds(presets); } catch (e) { fail(e.message); }
  const k = intensity === undefined ? 1 : Number(intensity);
  if (!(k >= 0 && k <= 1)) fail("--intensity takes 0 to 1");
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "reelwright-grade-"));
  try {
    // one frame, no wider than 960 px, so a tile is the same picture for every preset
    const pic = path.join(work, "source.png");
    const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...(at ? ["-ss", String(at)] : []), "-i", src, "-vf", "scale='min(960,iw)':-2", "-frames:v", "1", "-update", "1", pic], { encoding: "utf8" });
    if (r.status !== 0 || !fs.existsSync(pic)) fail(`ffmpeg could not read ${src}: ${r.stderr}`);
    const cells = [{ label: "original", file: pic }, ...ids.map((id) => ({ label: id, sub: k < 1 ? `intensity ${k}` : "", file: pic, grading: { preset: id, intensity: k } }))];
    const out = path.resolve(outArg || "grade-compare.png");
    await sheet(cells, { out, cols: Math.min(Number(cols || 4), cells.length), cellW: 400, layout: true });
    console.log(`grade-compare → ${out}  (original + ${ids.length} presets)`);
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
}
