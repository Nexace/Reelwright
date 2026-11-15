// Energy-arc validator (row 2b.9): a promo is low open -> one hero -> a climb of features with breath cards between -> a peak close
// (the group-photo outro), with the hold frames budgeted before any motion. The arc is project.json "arc": a list of shots,
//   { "shot": "open", "role": "open|hero|feature|breath|peak|end", "bars": 2, "energy": 1..9, "hold": 1.2 }
// (energy: how loud the shot is meant to feel, 1 whisper to 9 peak; hold: seconds of stillness inside the shot). validateArc returns
// WARN lines, never failures. measureMix(dir, arc) reads mix.wav per shot (ffmpeg volumedetect) so the plan can be checked against
// the sound that was actually mixed. Used by `reelwright arc <project>` (tools/commands/arc.mjs).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const ROLES = ["open", "hero", "feature", "breath", "peak", "end"];

export function barSeconds(P) { return 240 / ((P.music && P.music.bpm) || 100); }

// → { lines: [WARN text], shots: [{ shot, role, energy, start, end, hold }] }
export function validateArc(arc, { bar = 2.4, dur } = {}) {
  const lines = [], shots = [];
  if (!Array.isArray(arc) || arc.length < 3) return { lines: ["arc: needs a list of at least 3 shots (open, a climb, a close)"], shots };
  let t = 0;
  for (const [i, s] of arc.entries()) {
    const bad = !s.shot || !ROLES.includes(s.role) || !(s.bars > 0) || !Number.isFinite(s.energy);
    if (bad) { lines.push(`arc[${i}]: needs shot, role (${ROLES.join("|")}), bars > 0 and a numeric energy`); continue; }
    shots.push({ shot: s.shot, role: s.role, energy: s.energy, start: +t.toFixed(3), end: +(t + s.bars * bar).toFixed(3), hold: s.hold || 0 });
    t += s.bars * bar;
  }
  if (lines.length) return { lines, shots };
  if (dur && Math.abs(t - dur) > bar / 2) lines.push(`arc: the shots add up to ${t.toFixed(1)} s, the film is ${dur.toFixed(1)} s`);
  const E = shots.map((s) => s.energy), med = [...E].sort((a, b) => a - b)[Math.floor(E.length / 2)];
  // open: low
  if (shots[0].role !== "open") lines.push(`open: the film starts on a ${shots[0].role} shot; start low with an "open" shot`);
  else if (shots[0].energy > med) lines.push(`open: "${shots[0].shot}" energy ${shots[0].energy} is above the median ${med}: a loud open leaves nowhere to climb`);
  // one hero, early, above the open
  const heroes = shots.filter((s) => s.role === "hero");
  if (heroes.length !== 1) lines.push(`hero: ${heroes.length} hero shots; the arc has exactly one single hero before the features`);
  else {
    const h = heroes[0], firstFeature = shots.findIndex((s) => s.role === "feature");
    if (firstFeature >= 0 && shots.indexOf(h) > firstFeature) lines.push(`hero: "${h.shot}" comes after the first feature; the hero lands first`);
    if (h.energy <= shots[0].energy) lines.push(`hero: "${h.shot}" (${h.energy}) is not louder than the open (${shots[0].energy})`);
  }
  // the feature climb never falls back (breaths excepted), and a breath card follows every two strong shots
  const feats = shots.filter((s) => s.role === "feature");
  feats.forEach((s, i) => { if (i && s.energy < feats[i - 1].energy) lines.push(`climb: feature "${s.shot}" (${s.energy}) is quieter than the one before it "${feats[i - 1].shot}" (${feats[i - 1].energy})`); });
  let strong = 0;
  for (const s of shots) {
    if (s.role === "breath") { strong = 0; continue; }
    strong = s.energy >= 3 && (s.role === "hero" || s.role === "feature") ? strong + 1 : 0;   // the peak and the end card close the climb, they need no breath
    if (strong === 3) lines.push(`breath: three strong shots in a row ending at "${s.shot}" (${s.start.toFixed(1)} s); put a breath card before the next one`);
  }
  for (const [i, s] of shots.entries()) if (s.role === "breath" && ((i > 0 && s.energy >= shots[i - 1].energy) || (i < shots.length - 1 && s.energy >= shots[i + 1].energy)))
    lines.push(`breath: "${s.shot}" (${s.energy}) is not quieter than its neighbours: a breath card has to drop the energy`);
  // the close is the loudest
  const closeIdx = (() => { const p = shots.findIndex((s) => s.role === "peak"); return p >= 0 ? p : shots.length - 1 - (shots[shots.length - 1].role === "end" ? 1 : 0); })();
  const close = shots[closeIdx], others = shots.filter((_, i) => i !== closeIdx);
  if (close.role !== "peak") lines.push(`close: "${close.shot}" is not marked role "peak"`);
  const louder = others.filter((s) => s.energy >= close.energy);
  if (louder.length) lines.push(`close: "${close.shot}" (${close.energy}) is not the loudest shot: ${louder.map((s) => `"${s.shot}" ${s.energy}`).join(", ")}`);
  if (closeIdx < shots.length - 2) lines.push(`close: more than one shot after the peak "${close.shot}"; the film should end on it or on one end card`);
  // hold frames are budgeted first: the end card holds the wordmark >= 1 s (R1) and holds are >= 10% of the film
  const end = shots.find((s) => s.role === "end");
  if (end && end.hold < 1) lines.push(`holds: end card "${end.shot}" holds ${end.hold} s; the wordmark needs at least 1 s still (R1)`);
  const held = shots.reduce((a, s) => a + s.hold, 0);
  if (held < 0.1 * t) lines.push(`holds: ${held.toFixed(1)} s of hold in ${t.toFixed(1)} s; budget at least 10% of the film for stillness first`);
  return { lines, shots };
}

// mean volume (dB) of mix.wav inside each shot, null where mix.wav or ffmpeg is missing
export function measureMix(dir, shots) {
  const wav = path.join(dir, "mix.wav");
  if (!fs.existsSync(wav)) return null;
  return shots.map((s) => {
    const r = spawnSync("ffmpeg", ["-v", "info", "-ss", String(s.start), "-t", String(s.end - s.start), "-i", wav, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
    const m = /mean_volume:\s*(-?[\d.]+) dB/.exec(r.stderr || "");
    return m ? +m[1] : null;
  });
}

export function mixLines(shots, vols) {
  if (!vols || vols.some((v) => v == null)) return [];
  const ci = shots.findIndex((s) => s.role === "peak");
  if (ci < 0) return [];
  const louder = shots.filter((s, i) => i !== ci && vols[i] > vols[ci] + 0.5);
  return louder.length ? [`mix: the peak "${shots[ci].shot}" mixes at ${vols[ci]} dB, quieter than ${louder.map((s) => `"${s.shot}" ${vols[shots.indexOf(s)]} dB`).join(", ")}`] : [];
}
