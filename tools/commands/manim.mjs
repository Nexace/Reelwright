// manim [project] install [ce|gl] [--yes] | doctor [ce|gl] | render [--force] | verify   optional Manim scenes
//                  (project.json "manim" block, KIT.manim in film.js; tools/manim.mjs). install prints what it downloads
//                  into <repo>/.venv-manim (shared by every project) and does it only with --yes; render runs after sched (and
//                  after any VO change) — `all` does not run Manim. Exit 1 on any problem.
import path from "node:path";
import * as M from "../manim.mjs";

export default async ({ proj, args, project }) => {
  const DIR = path.resolve(proj), P = project(), [sub, ...rest] = args, name = path.basename(proj);
  const engine = rest.find((a) => a === "ce" || a === "gl") || P.manim?.engine || "ce";
  const fail = (msgs) => { for (const m of [].concat(msgs)) console.log("  FAIL  " + m); process.exit(1); };
  try {
    if (sub === "install") { if (!M.install(DIR, engine, { yes: rest.includes("--yes") }).ok) process.exit(1); return; }
    if (sub === "doctor") {
      const d = M.doctor(DIR, engine);
      console.log(JSON.stringify(d));
      if (!d.ok) fail((d.problems || []).map((p) => p.replace("<project>", name)));
      return;
    }
    if (sub === "render") {
      if (!P.manim?.scenes?.length) return console.log(`${proj}/project.json has no "manim": { "scenes": [...] } block`);
      const r = M.render(DIR, P, { force: rest.includes("--force") });
      console.log(`manim: ${r.length} scene(s), ${r.filter((x) => !x.cached).length} rendered. Note: \`all\` does not run Manim — ` +
        `re-run \`reelwright manim ${name} render\` after sched and after any VO change.`);
      const p = M.verify(DIR, P);
      if (p.length) fail(p);
      return;
    }
    if (sub === "verify") {
      const p = M.verify(DIR, P);
      if (p.length) fail(p.map((x) => x.replace("<project>", name)));
      return console.log(`manim: ${(P.manim?.scenes || []).length} scene(s) fresh`);
    }
    console.log("usage: reelwright manim <project> install [ce|gl] [--yes] | doctor [ce|gl] | render [--force] | verify");
    process.exit(1);
  } catch (e) { fail(e.message.replaceAll("<project>", name)); }
};
