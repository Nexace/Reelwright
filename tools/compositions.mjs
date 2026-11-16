// tools/compositions.mjs: several compositions (films or stills) in one project, Remotion's <Composition id> without touching the engine.
// project.json "compositions": [{ "id": "square", "width": 1080, "height": 1080, "out": "out/square.mp4", "lines": [...], … }, …]
//   `reelwright film|stills|all|… <project> --composition <id>` runs the project with that entry's keys laid over project.json (a shallow merge: width, height,
//   fps, style, lines, out, music, …; `lines` replaces the whole script). `out` defaults to `<out>-<id>.mp4`. The merged `composition` id reaches the film as
//   PROJECT.composition (film/data.js, hf/kit-data.js), so film.js can branch: `if (PROJECT.composition === 'square') …`.
//   project.json is rewritten for the run (every build step reads it from disk, so it cannot be passed another way) and put back on exit, on SIGINT / SIGTERM / SIGHUP and on an
//   uncaught exception; a copy sits in project.json.composition-bak meanwhile. A command that rewrites project.json itself, like `beats import`, keeps its write and the
//   backup stays (never deleted over a changed file). SIGKILL cannot be caught: the next --composition run restores the backup (a displaced file goes to
//   project.json.composition-prev). Do not run two compositions of one project at the same time.
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
  if (!fs.existsSync(f)) { console.error(`--composition: ${f} does not exist`); process.exit(1); }
  if (fs.existsSync(bak)) {   // an earlier run was killed (or kept its backup): start from the original, and keep whatever file it displaces
    if (fs.readFileSync(f, "utf8") !== fs.readFileSync(bak, "utf8")) { fs.copyFileSync(f, f + ".composition-prev"); console.error(`--composition: restored ${bak} over a leftover project.json (that file is kept as project.json.composition-prev)`); }
    fs.copyFileSync(bak, f);
  } else fs.copyFileSync(f, bak);
  let merged;
  try { merged = resolveComposition(JSON.parse(fs.readFileSync(f, "utf8")), id); }
  catch (e) { fs.copyFileSync(bak, f); fs.rmSync(bak, { force: true }); console.error(`--composition: ${e.message}`); process.exit(1); }
  const text = JSON.stringify(merged, null, 2) + "\n";
  fs.writeFileSync(f, text);
  let done = false;
  const restore = () => {   // runs once, on exit, a signal or an uncaught exception (every one of them ends in process.exit → "exit")
    if (done) return; done = true;
    if (fs.existsSync(f) && fs.readFileSync(f, "utf8") !== text) { console.error(`--composition: project.json was rewritten during the run, keeping it; the original (with "compositions") is in ${bak}, merge by hand`); return; }   // the backup is never deleted over a changed file
    fs.copyFileSync(bak, f); fs.rmSync(bak, { force: true });
  };
  process.once("exit", restore);
  for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143], ["SIGHUP", 129]]) process.once(sig, () => { restore(); process.exit(code); });
  // shortcut: SIGKILL and a power cut cannot be caught; the backup stays and the next --composition run restores it
}
