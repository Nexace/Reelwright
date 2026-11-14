// gate [project] [--n 16]   the two delivery gates on the built film page, no render needed: (1) determinism: 16 frames hashed forward,
//                  reverse, cached (revisited) and cold (one page load each) must agree; (2) dead air: no whole second in which nothing
//                  changes (holds of 2 s or more; project.json "qa": {"p5-dead-air": {"maxHold": N}}). Exit 1 on either. Pvk films
//                  (film/index.html). tools/p5-gate.mjs, tools/checks/p5-dead-air.page.mjs.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { determinismGate } from "../p5-gate.mjs";
import { launch } from "../browser.mjs";
import deadAir from "../checks/p5-dead-air.page.mjs";

export default async ({ proj, args }) => {
  const i = args.indexOf("--n"), n = i >= 0 ? Number(args.splice(i, 2)[1]) : 16;
  const DIR = path.resolve(proj), P = JSON.parse(fs.readFileSync(path.join(DIR, "project.json"), "utf8")), W = P.width || 1920, H = P.height || 1080;
  const file = path.join(DIR, "film", "index.html");
  if (P.renderer === "hyperframes" || !fs.existsSync(file)) { console.log(`gate: needs a pvk film page (${file}); hyperframes films are gated by hf-lint and the seek self-check`); process.exit(1); }
  const g = await determinismGate(file, { W, H, n });
  console.log(`${g.ok ? "PASS" : "FAIL"}  determinism  ${g.times.length} times, ${g.distinct} distinct frames` + (g.bad.length ? `; DIFFER ${g.bad.map((b) => `${b.t}s (${b.pair})`).join(", ")}` : ""));
  const b = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  let lines;
  try {
    const p = await b.newPage({ viewport: { width: W, height: H } });
    await p.goto(pathToFileURL(file).href); await p.evaluate(() => window.READY);
    lines = await deadAir(p, { P, W, H });
  } finally { await b.close(); }
  console.log(`${lines.length ? "FAIL" : "PASS"}  dead air` + (lines.length ? "\n  " + lines.join("\n  ") : ""));
  if (!g.ok || lines.length) process.exit(1);
};
