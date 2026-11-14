// audit [project] [--contrast] [--motion] [--range a-b] [--at-transitions]   the browser audits of HyperFrames `check`, on
//                  the built film page (run `film`/`stills` first so film/ or hf/ has its data): --contrast = WCAG AA contrast of
//                  every visible text against the pixels behind it, with a suggested colour; --motion = the project's
//                  *.motion.json assertions (schema in tools/checks/motion.mjs). No flag runs both. --range 2-6 limits the
//                  seconds looked at, --at-transitions looks only around cuts (window.FILM.cuts, else VO line boundaries).
//                  Exits 1 when a motion assertion fails or no film page can be opened; contrast lines are warnings.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "../browser.mjs";
import { contrastAudit } from "../checks/contrast.mjs";
import { auditTimes } from "../checks/audit-times.mjs";
import { findMotionFiles, loadAssertions, motionAudit } from "../checks/motion.mjs";

export default async function audit({ proj, args }) {
  const has = (f) => args.includes(f);
  const r = args.indexOf("--range");
  const range = r >= 0 ? String(args[r + 1]).split("-").map(Number) : undefined;
  if (range && (range.length !== 2 || range.some(Number.isNaN) || range[1] <= range[0])) { console.log("--range takes a-b seconds, e.g. --range 2-6"); process.exit(1); }
  const both = !has("--contrast") && !has("--motion");
  const P = JSON.parse(fs.readFileSync(path.join(proj, "project.json"), "utf8"));
  const page = path.join(proj, P.renderer === "hyperframes" ? "hf/index.html" : "film/index.html");
  const [W, H] = (process.env.REELWRIGHT_SIZE || `${P.width || 1920}x${P.height || 1080}`).split("x").map(Number);
  const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  let bad = false;
  try {
    const p = await browser.newPage({ viewport: { width: W, height: H } });
    const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(pathToFileURL(path.resolve(page)).href);
    if (!(await p.evaluate(() => window.READY).catch(() => false))) { console.log(`${page} failed to load: ${errs.join("; ") || "READY never resolved"} (build the film first)`); process.exit(1); }
    if (both || has("--motion")) {
      const files = findMotionFiles(proj), { list, errors } = loadAssertions(files);
      const lines = [...errors.map((e) => `motion file: ${e}`), ...(files.length ? await motionAudit(p, list, { vo: await p.evaluate(() => window.VO || {}) }) : [])];
      console.log(files.length ? `motion: ${list.length} assertions from ${files.length} file(s), ${lines.length} problem(s)` : "motion: no *.motion.json in the project");
      for (const l of lines) console.log("  FAIL " + l);
      bad ||= lines.length > 0;
    }
    if (both || has("--contrast")) {
      const lines = await contrastAudit(p, { times: await auditTimes(p, { range, atTransitions: has("--at-transitions") }) });
      console.log(`contrast: ${lines.length} element(s) under WCAG AA`);
      for (const l of lines) console.log("  WARN " + l);
    }
  } finally { await browser.close(); }
  if (bad) process.exit(1);
}
