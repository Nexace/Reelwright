// node tools/selfcheck/p12b-audit.mjs — G4: the contrast audit (tools/checks/contrast.mjs) and the *.motion.json assertions
// (tools/checks/motion.mjs) on a fixture page (tools/selfcheck/p12b/audit/). Contrast: the three bad texts are reported
// with a suggested colour that itself passes, the good one and an invisible one are not, --range and --at-transitions
// narrow the times. Motion: a passing set stays quiet, a failing set trips each assertion kind. The two opt-in plug-ins
// stay silent unless switched on. No network.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launch } from "../browser.mjs";
import { contrastAudit, ratio, suggestColour } from "../checks/contrast.mjs";
import { auditTimes } from "../checks/audit-times.mjs";
import { loadAssertions, motionAudit, findMotionFiles } from "../checks/motion.mjs";
import contrastPlugin from "../checks/contrast-audit.page.mjs";
import motionPlugin from "../checks/motion-assert.page.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// pure colour maths: the suggestion reaches the bar, keeps the hue, and stays put when already fine
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
for (const [fg, bg, need] of [[[119, 119, 119], [102, 102, 102], 3], [[136, 136, 136], [255, 255, 255], 4.5], [[200, 60, 60], [20, 20, 20], 4.5], [[60, 60, 200], [30, 30, 60], 4.5]]) {
  const s = suggestColour(fg, bg, need);
  assert.ok(ratio(hexRgb(s), bg) >= need - 0.05, `suggestion ${s} for ${fg} on ${bg} must reach ${need}`);
}
assert.equal(suggestColour([255, 255, 255], [0, 0, 0], 4.5), "#ffffff");
assert.ok(ratio([0, 0, 0], [255, 255, 255]) > 20.9);
const red = hexRgb(suggestColour([200, 60, 60], [20, 20, 20], 4.5));
assert.ok(red[0] > red[1] && red[0] > red[2], "the suggestion keeps the red hue");

const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p12b-audit-"));
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(pathToFileURL(path.join(HERE, "p12b/audit/index.html")).href);
  assert.ok(await page.evaluate(() => window.READY));

  // ── times ──
  const all = await auditTimes(page, {});
  assert.deepEqual([all[0], all.at(-1), all.length], [0, 3.5, 8]);
  assert.deepEqual(await auditTimes(page, { range: [1, 2] }), [1, 1.5]);
  const tr = await auditTimes(page, { atTransitions: true });
  assert.ok(tr.includes(1) && tr.includes(0.88) && tr.includes(3.62) && tr.length < all.length * 2 && !tr.includes(0.5), `transition times: ${tr}`);

  // ── contrast ──
  const lines = await contrastAudit(page, { times: [0, 1, 2.5] });
  console.log(lines.join("\n"));
  const want = (sel) => lines.find((l) => l.includes(` ${sel} `));
  for (const sel of ["#grey", "#small", "#gradt"]) {
    const l = want(sel); assert.ok(l, `${sel} should be reported:\n${lines.join("\n")}`);
    const sug = l.match(/→ try (#[0-9a-f]{6})$/)?.[1]; assert.ok(sug, `${sel}: a suggested colour`);
  }
  assert.ok(!want("#good"), "white on near-black passes");
  // the suggestion for #small really passes on its own background (white)
  assert.ok(ratio(hexRgb(want("#small").match(/→ try (#[0-9a-f]{6})$/)[1]), [255, 255, 255]) >= 4.5);
  // before 2 s the invisible text is not judged; from 2.5 s it is (#eee on white is 1.2:1)
  assert.ok(!(await contrastAudit(page, { times: [0, 1] })).some((l) => l.includes("#late")));
  assert.ok((await contrastAudit(page, { times: [2.5] })).some((l) => l.includes("#late")), "#late judged once visible");
  assert.equal((await contrastAudit(page, { times: [1], minNormal: 1.01, minLarge: 1.01 })).length, 0, "bars are options");

  // ── motion ──
  const wr = (name, o) => { const f = path.join(tmp, name); fs.writeFileSync(f, JSON.stringify(o)); return f; };
  const vo = await page.evaluate(() => window.VO);
  const goodFile = wr("good.motion.json", { assertions: [
    { id: "box-moves", selector: "#box", range: [0, 2], monotonic: { prop: "x", dir: "up" } },
    { id: "box-ends", selector: "#box", range: [0, 3], reaches: { prop: "x", value: 300, tol: 1 } },
    { id: "box-parks", selector: "#box", range: [2, 3.5], still: ["x", "y"] },
    { id: "fade", selector: "#fadein", range: [0, 1], monotonic: { prop: "opacity", dir: "up" }, maxStep: { prop: "opacity", max: 0.1 } },
    { id: "state", selector: "#box", at: [0, 2], expect: { visible: true, x: { min: 99 }, y: { approx: 500, tol: 1 } } },
    { id: "vo-time", selector: "#late", at: { vo: "l2", edge: "start" }, expect: { visible: true, text: { contains: "Late" } } },
    { id: "gone", selector: "#nothing", at: 1, expect: { exists: false } },
  ] });
  const good = loadAssertions([goodFile]);
  assert.deepEqual(good.errors, []);
  assert.deepEqual(await motionAudit(page, good.list, { vo }), []);

  const badFile = wr("bad.motion.json", { assertions: [
    { id: "wrong-way", selector: "#box", range: [0, 2], monotonic: { prop: "x", dir: "down" } },
    { id: "teleport", selector: "#jump", range: [1, 2], maxStep: { prop: "x", max: 50 } },
    { id: "not-still", selector: "#box", range: [0, 1], still: "x" },
    { id: "short", selector: "#box", range: [0, 1], reaches: { prop: "x", value: 300 } },
    { id: "hidden", selector: "#late", at: 1, expect: { visible: true } },
    { id: "pos", selector: "#box", at: 0, expect: { x: { approx: 500, tol: 5 } } },
    { id: "text", selector: "#late", at: 3, expect: { text: "Other" } },
    { id: "missing", selector: "#nothing", at: 1, expect: { x: { min: 0 } } },
  ] });
  const bad = loadAssertions([badFile]);
  assert.deepEqual(bad.errors, []);
  const out = await motionAudit(page, bad.list, { vo });
  console.log(out.join("\n"));
  for (const id of ["wrong-way", "teleport", "not-still", "short", "hidden", "pos", "text", "missing"])
    assert.ok(out.some((l) => l.includes(id)), `${id} should fail:\n${out.join("\n")}`);
  assert.equal(out.length, 8, "one line per failing assertion");

  // malformed files are reported, not thrown
  const err = loadAssertions([wr("e.motion.json", { assertions: [{ selector: "#a" }, { selector: "#a", at: 1, expect: { nope: 1 } }, { selector: "#a", range: [2, 1], monotonic: {} }] })]);
  assert.equal(err.errors.length, 3);
  fs.writeFileSync(path.join(tmp, "broken.motion.json"), "{");
  assert.equal(loadAssertions([path.join(tmp, "broken.motion.json")]).errors.length, 1);

  // ── plug-ins: opt-in ──
  assert.deepEqual(await contrastPlugin(page, { DIR: tmp, P: {} }), [], "contrast plug-in is off by default");
  assert.ok((await contrastPlugin(page, { DIR: tmp, P: { qa: { "contrast-audit": true } } })).length >= 3, "…and on with qa.contrast-audit");
  assert.deepEqual(await motionPlugin(page, { DIR: path.join(tmp, "empty-none") }), [], "no *.motion.json, no lines");
  fs.rmSync(path.join(tmp, "broken.motion.json")); fs.rmSync(path.join(tmp, "e.motion.json")); fs.rmSync(goodFile);
  assert.ok((await motionPlugin(page, { DIR: tmp })).some((l) => l.includes("wrong-way")), "a *.motion.json in the project is enforced");
  assert.deepEqual(findMotionFiles(tmp).map((f) => path.basename(f)), ["bad.motion.json"]);
} finally { await browser.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
console.log("p12b-audit ok: contrast audit with suggestions, motion assertions, range/at-transitions, opt-in plug-ins");
