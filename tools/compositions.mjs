// tools/compositions.mjs: several compositions (films or stills) in one project, Remotion's <Composition id> without touching the engine.
// project.json "compositions": [{ "id": "square", "width": 1080, "height": 1080, "out": "out/square.mp4", "lines": [...], … }, …]
//   `reelwright film|stills|all|… <project> --composition <id>` runs the project with that entry's keys laid over project.json (a shallow merge: width, height,
//   fps, style, lines, out, music, …; `lines` replaces the whole script). `out` defaults to `<out>-<id>.mp4`. The merged `composition` id reaches the film as
//   PROJECT.composition (film/data.js, hf/kit-data.js), so film.js can branch: `if (PROJECT.composition === 'square') …`.
//   project.json is rewritten for the run and put back when the process exits (a copy sits in project.json.composition-bak meanwhile; a run that was killed
//   is repaired by the next --composition run). Do not run two compositions of one project at the same time.
//   listCompositions(P) → [{ id, … }]    resolveComposition(P, id) → the merged project (pure)    applyComposition(proj, id) → writes it, restores on exit
import fs from "node:fs";
import path from "node:path";

export const listCompositions = (P) => (Array.isArray(P.compositions) ? P.compositions : []);

export function resolveComposition(P, id) {
  const list = listCompositions(P);
  if (!list.length) throw new Error(`project.json has no "compositions" (an array of { id, ...overrides })`);
  const bad = list.find((c) => !/^[\w-]+$/.test(c?.id ?? ""));
  if (bad) throw new Error(`every composition needs an id of letters, digits, _ and - (got ${JSON.stringify(bad.id)})`);
  const c = list.find((x) => x.id === id);
  if (!c) throw new Error(`no composition "${id}" in project.json (it has: ${list.map((x) => x.id).join(", ")})`);
  const { id: _id, ...over } = c, { compositions: _all, ...base } = P;
  const merged = { ...base, ...over, composition: id };
  if (!("out" in over)) merged.out = (P.out || "out/film.mp4").replace(/(\.mp4)?$/, `-${id}.mp4`);
  return merged;
}

export function applyComposition(proj, id) {
  const f = path.join(proj, "project.json"), bak = f + ".composition-bak";
  if (fs.existsSync(bak)) fs.copyFileSync(bak, f);   // an earlier run was killed with the merged file in place: start from the original
  else fs.copyFileSync(f, bak);
  let merged;
  try { merged = resolveComposition(JSON.parse(fs.readFileSync(f, "utf8")), id); }
  catch (e) { fs.rmSync(bak, { force: true }); console.error(`--composition: ${e.message}`); process.exit(1); }
  fs.writeFileSync(f, JSON.stringify(merged, null, 2) + "\n");
  process.once("exit", () => { fs.copyFileSync(bak, f); fs.rmSync(bak, { force: true }); });
}
