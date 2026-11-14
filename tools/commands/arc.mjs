// arc [project] [--mix]   validate the film's energy arc (project.json "arc": shots with role, bars, energy, hold): a low open, one hero, a
//                  climb of features with breath cards, a peak close that is the loudest shot, holds budgeted first. WARN lines only.
//                  --mix also measures mix.wav per shot and warns when the peak is not the loudest mixed. Offline. (tools/arc.mjs)
import fs from "node:fs";
import path from "node:path";
import { validateArc, barSeconds, measureMix, mixLines } from "../arc.mjs";

export default function ({ proj, args, project }) {
  const P = project();
  const dur = (P.lines || []).length ? undefined : (P.lead || 0) + (P.tail || 0) || undefined;   // a music-only film is exactly lead + tail long
  const { lines, shots } = validateArc(P.arc, { bar: barSeconds(P), dur });
  if (shots.length) for (const s of shots) console.log(`  ${String(s.start.toFixed(1)).padStart(5)} s  ${s.role.padEnd(8)} ${"#".repeat(s.energy).padEnd(9)} ${s.shot}`);
  const all = [...lines, ...(args.includes("--mix") ? mixLines(shots, measureMix(path.resolve(proj), shots)) : [])];
  for (const l of all) console.log("WARN " + l);
  console.log(all.length ? `${all.length} arc warning(s)` : "arc ok");
  if (!fs.existsSync(path.join(proj, "project.json"))) process.exit(1);
}
