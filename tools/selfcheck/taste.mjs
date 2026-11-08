// node tools/selfcheck/taste.mjs — tools/checks/taste.page.mjs on two fixture films (tools/selfcheck/taste/): the bad
// one (every problem on purpose) must get a line in each of the 5 categories, the good one none. Then, when
// projects/example-hf is built locally (hf/kit-data.js), prints what the standalone check says about it (no assert).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launch } from "../browser.mjs";
import taste from "../checks/taste.page.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const CATS = ["motion", "balance", "empty", "contrast", "pacing"];
const fail = [];
const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
try {
  for (const name of ["bad", "good"]) {
    const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(pathToFileURL(path.join(ROOT, "tools/selfcheck/taste", name, "index.html")).href);
    if (!(await p.evaluate(() => window.READY).catch(() => false))) { fail.push(`${name} fixture failed to load: ${errs.join("; ")}`); continue; }
    const lines = await taste(p, { W: 1920, H: 1080 });
    console.log(`${name}:\n${lines.map((l) => "  " + l).join("\n") || "  (no lines)"}`);
    const got = new Set(lines.map((l) => l.split(" ")[0]));
    if (name === "bad") { for (const c of CATS) if (!got.has(c)) fail.push(`bad fixture: no "${c}" line`); }
    else if (lines.length) fail.push(`good fixture: expected no lines, got ${lines.length}`);
    await p.close();
  }
} finally { await browser.close(); }

if (fs.existsSync(path.join(ROOT, "projects/example-hf/hf/kit-data.js"))) {
  const r = spawnSync(process.execPath, ["tools/checks/taste.page.mjs", "projects/example-hf"], { cwd: ROOT, encoding: "utf8" });
  console.log(`example-hf (standalone, not asserted):\n${(r.stdout + r.stderr).trim()}`);
} else console.log("example-hf not built locally (no hf/kit-data.js): standalone run skipped");

if (fail.length) { console.error("taste selfcheck FAILED:\n  " + fail.join("\n  ")); process.exit(1); }
console.log("taste selfcheck ok");
