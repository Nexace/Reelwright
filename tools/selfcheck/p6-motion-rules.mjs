// node tools/selfcheck/p6-motion-rules.mjs — rows doodle-shots-motion:3.8 (choreography lints) and 3.14 (quality tiers): the
// tools/checks/motion-rules.page.mjs WARN plug-in on two fixture films (tools/selfcheck/p6/rules-{bad,good}): the bad one must get
// a `linear`, a `stagger` and a `together` line, the good one nothing. Also: every `enforced` name in
// KIT.motionRules.quality is a real qa gate / WARN / plug-in check.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { launch } from "../browser.mjs";
import { ROOT } from "./p6-harness.mjs";
import rules from "../checks/motion-rules.page.mjs";

const fail = [];
const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
try {
  for (const name of ["bad", "good"]) {
    const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(pathToFileURL(path.join(ROOT, "tools/selfcheck/p6", "rules-" + name, "index.html")).href);
    if (!(await p.evaluate(() => window.READY).catch(() => false))) { fail.push(`${name} fixture failed to load: ${errs.join("; ")}`); continue; }
    const lines = await rules(p, { W: 1920, H: 1080 });
    console.log(`${name}:\n${lines.map((l) => "  " + l).join("\n") || "  (no lines)"}`);
    const kinds = lines.map((l) => l.split(" ")[0]);
    if (name === "bad") for (const c of ["linear", "stagger", "together"]) { if (!kinds.includes(c)) fail.push(`bad fixture: no "${c}" line`); }
    else if (lines.length) fail.push(`good fixture: expected no lines, got ${lines.length}`);
    await p.close();
  }
} finally { await browser.close(); }

// 3.14: the quality table points at checks that exist
const m = { exports: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "tools/motion-rules.js"), "utf8"), { module: m });
const names = new Set([...fs.readFileSync(path.join(ROOT, "tools/qa.py"), "utf8").matchAll(/\b(?:gate|warn)\("([a-z-]+)"/g)].map((x) => x[1]));
for (const f of fs.readdirSync(path.join(ROOT, "tools/checks"))) if (/\.(py|page\.mjs)$/.test(f)) names.add(f.replace(/\.(py|page\.mjs)$/, ""));
for (const q of m.exports.quality) if (!names.has(q.enforced)) fail.push(`quality "${q.check}": enforced by "${q.enforced}", which is not a qa check`);
assert.ok(["blocker", "major", "minor"].every((t) => m.exports.quality.some((q) => q.tier === t)), "all three severity tiers used");

if (fail.length) { console.error("p6-motion-rules FAILED:\n  " + fail.join("\n  ")); process.exit(1); }
console.log("p6-motion-rules ok");
