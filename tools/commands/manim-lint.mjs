// manim-lint [project] [texts | pace | dark | all] [--video file.mp4] [--strict]
//                  Manim scene lints (tools/checks/manim-lint.mjs). texts: OFF-FRAME / TEXT-OVERLAP / TINY-TEXT over each scene's texts.json
//                  (reelwright_manim.texts); pace: RUSHED (> 2.5 words/s), GAP (> 4 s), UNNARRATED (< 15 %) and the unnarrated info line from
//                  the film's VO (needs `sched`); dark: runs of near-black frames >= 1.5 s in --video (default out/<name>.mp4). Exit 1 on any
//                  FAIL (texts), or on any WARN with --strict. `qa` runs the same texts and pace rules as plug-ins for films with a manim block.
import fs from "node:fs";
import path from "node:path";
import { lintTexts, lintPace, darkFindings, lumaOfVideo, sceneTexts, formatFindings } from "../checks/manim-lint.mjs";
import { kit } from "../manim.mjs";

export default async ({ proj, args, project }) => {
  const DIR = path.resolve(proj), P = project(), name = path.basename(DIR), what = args.find((a) => /^(texts|pace|dark|all)$/.test(a)) || "all";
  const vi = args.indexOf("--video"), strict = args.includes("--strict"), out = [];
  if (what === "texts" || what === "all") {
    const L = sceneTexts(DIR, P);
    if (!L.length) console.log("  (no texts.json: a scene opts in with `texts.snapshot(self, self.rw)` and `texts.write(self.rw)`; see python/reelwright_manim/texts.py)");
    for (const s of L) out.push(...lintTexts(s.doc).map((f) => ({ ...f, msg: `${s.id}: ${f.msg}` })));
  }
  if (what === "pace" || what === "all") {
    const K = kit(DIR, P, { write: false });
    out.push(...lintPace(K.VO, { dur: K.dur }).findings);
  }
  if (what === "dark" || what === "all") {
    const f = vi >= 0 ? args[vi + 1] : path.join(DIR, "out", name + ".mp4");
    if (fs.existsSync(f)) { const v = lumaOfVideo(f); out.push(...darkFindings(v.luma, v.fps)); }
    else if (what === "dark") { console.log(`  FAIL  no video at ${path.relative(process.cwd(), f)}: build the film or pass --video`); process.exit(1); }
  }
  for (const l of formatFindings(out)) console.log(l);
  const bad = out.filter((f) => f.severity === "FAIL" || (strict && f.severity === "WARN"));
  console.log(bad.length ? `manim-lint: ${bad.length} problem(s)` : `manim-lint: ${out.filter((f) => f.severity === "WARN").length} warning(s), no failures`);
  if (bad.length) process.exit(1);
};
