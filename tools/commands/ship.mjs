// ship [project] [--sign "name"]   ship checks on the delivered file and a review ledger. Runs on the built film page and the mp4 at project.json
//                  "out": readtime + caption-tight, safe-zone (9:16), facts, motionscan, dead-air (tools/checks/p5-*.page.mjs) and A/V sync
//                  (p5-av-sync.py), prints every finding, and writes <project>/ship.json: the mp4's sha256 and size, each check's lines, and the
//                  review entries. --sign "name" adds a sign-off for THIS mp4; it counts only while the sha still matches, so a re-render
//                  voids it. Exit 1 when the mp4 is missing; findings are WARNs (they never fail the exit code), unsigned review is listed.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const CHECKS = ["p5-readtime", "p5-safe-zone", "p5-facts", "p5-motionscan", "p5-dead-air"];

export default async ({ proj, args }) => {
  const si = args.indexOf("--sign"), signer = si >= 0 ? args.splice(si, 2)[1] : null;
  const DIR = path.resolve(proj), P = JSON.parse(fs.readFileSync(path.join(DIR, "project.json"), "utf8"));
  const mp4 = path.join(DIR, P.out || "out/film.mp4"), file = path.join(DIR, P.renderer === "hyperframes" ? "hf/index.html" : "film/index.html");
  if (!fs.existsSync(mp4)) { console.log(`ship: no delivered file at ${mp4} (run \`reelwright film\` first)`); process.exit(1); }
  const sha = crypto.createHash("sha256").update(fs.readFileSync(mp4)).digest("hex"), W = P.width || 1920, H = P.height || 1080;
  const ledgerFile = path.join(DIR, "ship.json");
  let old = {}; try { old = JSON.parse(fs.readFileSync(ledgerFile, "utf8")); } catch {}
  const checks = {};
  const b = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  try {
    const p = await b.newPage({ viewport: { width: W, height: H } });
    await p.goto(pathToFileURL(file).href);
    if (!(await p.evaluate(() => window.READY).catch(() => false))) { console.log(`ship: ${file} failed to load`); process.exit(1); }
    for (const n of CHECKS) if (P.qa?.[n] !== false) checks[n] = (await (await import(`../checks/${n}.page.mjs`)).default(p, { DIR, P, W, H })).slice();
  } finally { await b.close(); }
  const py = spawnSync("python3", ["-c", "import importlib.util,sys,json\ns=importlib.util.spec_from_file_location('c',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nprint(json.dumps(m.check({'mp4':sys.argv[2],'proj':sys.argv[3]})))",
    path.join(ROOT, "tools", "checks", "p5-av-sync.py"), mp4, DIR], { encoding: "utf8" });
  checks["p5-av-sync"] = py.status === 0 ? JSON.parse(py.stdout) : [`av-sync skipped: ${py.stderr.trim().split("\n").pop()}`];
  // sign-offs stay valid only for the same bytes
  const review = (old.review || []).filter((r) => r.sha256 === sha);
  if (signer) review.push({ by: signer, sha256: sha });
  const ledger = { mp4: path.relative(DIR, mp4), sha256: sha, bytes: fs.statSync(mp4).size, checks, review };
  fs.writeFileSync(ledgerFile, JSON.stringify(ledger, null, 1));
  let n = 0;
  for (const [name, lines] of Object.entries(checks)) for (const l of lines) { n++; console.log(`  WARN  ${name}: ${l}`); }
  console.log(`ship: ${n} finding(s), ${review.length} sign-off(s) for this mp4 (sha256 ${sha.slice(0, 12)}) → ${path.relative(process.cwd(), ledgerFile)}` + (review.length ? "" : "; unsigned: reelwright ship --sign \"name\" once reviewed"));
};
