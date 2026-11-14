// check [project] [--at 1.5,4] [--range 2 6] [--at-transitions] [--caption-zone] [--frame-check] [--json]   the layout and occlusion audit of the film
//                        page without rendering (tools/checks/layout.audit.mjs): text outside the frame, cut by an overflow clip, covered by
//                        another element, or colliding with the caption row. Needs a built project (hf/ or film/). Exit 1 if it finds any.
//                        --caption-zone / --frame-check keep only that family; plain `check` reports all four. To run it inside `qa` too, rename
//                        tools/checks/layout.audit.mjs to layout.page.mjs (qa loads every *.page.mjs as a WARN).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export default async function check({ proj, args, ROOT }) {
  const a = args.slice(), flag = (n) => { const i = a.indexOf(n); if (i < 0) return false; a.splice(i, 1); return true; };
  const val = (n, k = 1) => { const i = a.indexOf(n); if (i < 0) return null; return a.splice(i, 1 + k).slice(1); };
  const json = flag("--json"), zone = flag("--caption-zone"), frame = flag("--frame-check"), trans = flag("--at-transitions");
  const at = val("--at"), range = val("--range", 2);
  if (at) process.env.REELWRIGHT_CHECK_AT = at[0];
  if (range) process.env.REELWRIGHT_CHECK_RANGE = range.join(",");
  if (trans) process.env.REELWRIGHT_CHECK_TRANSITIONS = "1";
  const P = JSON.parse(fs.readFileSync(path.join(proj, "project.json"), "utf8"));
  const file = path.join(proj, P.renderer === "hyperframes" ? "hf/index.html" : "film/index.html");
  if (!fs.existsSync(file)) { console.log(`no film page ${file}`); process.exit(1); }
  const { launch } = await import("../browser.mjs"), { audit } = await import(pathToFileURL(path.join(ROOT, "tools", "checks", "layout.audit.mjs")).href);
  const b = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  let lines;
  try {
    const p = await b.newPage({ viewport: { width: P.width || 1920, height: P.height || 1080 } });
    const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(pathToFileURL(file).href);
    if (!(await p.evaluate(() => window.READY).catch(() => false))) { console.log(`${file} failed to load: ${errs.join("; ") || "READY never resolved"}`); process.exit(1); }
    lines = await audit(p, { at: (at?.[0] || "").split(",").map(Number).filter(Number.isFinite), range: range ? range.map(Number) : null, transitions: trans });
  } finally { await b.close(); }
  if (zone || frame) lines = lines.filter((l) => (zone && /caption zone/.test(l)) || (frame && / runs outside the frame/.test(l)));
  console.log(json ? JSON.stringify({ ok: !lines.length, problems: lines }) : lines.length ? lines.map((l) => "  WARN  layout: " + l).join("\n") : "layout: no problems");
  process.exit(lines.length ? 1 : 0);
}
