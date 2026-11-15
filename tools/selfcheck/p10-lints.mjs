// node tools/selfcheck/p10-lints.mjs — rows 2b.9 (tools/arc.mjs, `arc`), 2b.10 (tools/checks/aesthetic-rules.page.mjs, sfx-repeat.py) and
// 2b.11 (docs/playbook/final-review.md, `review`). Offline.
//   aesthetic-rules  a bad film (5 shakes, wordmark 0.6 s, 30 px caption, 18 px label, hand-held over a product) gets R1 R4 Q11 Q3 lines;
//                    a good one gets none; the check is silent without the opt-in and leaves KIT.shake / handheld / shoot as it found them
//   sfx-repeat       3 clicks in 0.8 s warn, 3 ticks do not (mix.py alternates and steps those down), an alternating pair does not
//   arc              the example arcs: a good promo has no warnings; a loud open, a missing hero, no breaths, and a close that is not the loudest each warn
//   review           the brief lists every checklist id of the doc once, and the doc has the P/F/V/A/D sections
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";
import { validateArc } from "../arc.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const url = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p10-lints-"));
const check = (await import(url("tools/checks/aesthetic-rules.page.mjs"))).default;
const W = 640, H = 360;

const film = (body) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${url("tools/kit.css")}"><style>body{margin:0}#stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;background:#fff;color:#111;font:600 40px Arial}#stage div{position:absolute}</style></head>
<body><div id="stage"></div><script>window.PROJECT={fps:30,width:${W},height:${H},speechEnd:6,tail:0};window.VO={};window.MUSIC={};</script>
<script src="${url("tools/engine.js")}"></script><script src="${url("tools/shots.js")}"></script><script>'use strict';const S=KIT.stage,el=(c,css,h='')=>{const e=KIT.el('div',c,S,h);KIT.css(e,css);return e};\n${body}</script></body></html>`;
const BAD = film(`
const wm = el('wordmark', { left: '40px', top: '20px' }, 'Tidy'), cap = el('kit-subs', { left: '20px', top: '300px' });
cap.innerHTML = '<div class="kit-subrow" style="position:static;visibility:visible;font-size:12px"><span>a small caption</span></div>';
el('', { left: '300px', top: '120px', fontSize: "8px" }, 'tiny label');
const prod = el('product', { left: '200px', top: '150px', width: '200px', height: '120px', background: '#36c' });
const cam = el('', { left: '0', top: '0', width: '100%', height: '100%' });
KIT.start({ dur: 6, render: (t) => {
  wm.style.opacity = (t > 1 && t < 1.6) ? 1 : 0;                      // R1: 0.6 s only
  [0.5, 1.2, 2, 2.8, 3.6].forEach((t0) => KIT.shake(t, t0, 10));        // R4: five shakes
  const h = KIT.handheld(t, 4); prod.style.opacity = 1; KIT.shoot(cam, KIT.cam3({ x: 320 + h.x, y: 180 + h.y }));   // Q3
} });`);
const GOOD = film(`
const wm = el('wordmark', { left: '40px', top: '20px' }, 'Tidy'), cap = el('kit-subs', { left: '20px', top: '300px' });
cap.innerHTML = '<div class="kit-subrow" style="position:static;visibility:visible;font-size:24px"><span>a caption</span></div>';
el('', { left: '300px', top: '120px', fontSize: '14px' }, 'label');
KIT.start({ dur: 6, render: (t) => { wm.style.opacity = t > 3 ? 1 : 0; KIT.shake(t, 1, 10); KIT.shake(t, 2, 10); } });`);

async function run(html, P) {
  const f = path.join(tmp, "f" + Math.random().toString(36).slice(2) + ".html"); fs.writeFileSync(f, html);
  const b = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  try {
    const p = await b.newPage({ viewport: { width: W, height: H } });
    const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(pathToFileURL(f).href);
    assert.ok(await p.evaluate(() => window.READY), "READY false: " + errs.join("; "));
    const lines = await check(p, { P, W, H });
    const same = await p.evaluate(() => typeof KIT.shake === "function" && KIT.shake.length === 2 && KIT.shake.toString().includes("Math.exp"));
    assert.ok(same, "the check must put KIT.shake back");
    assert.deepEqual(errs, []);
    return lines;
  } finally { await b.close(); }
}
try {
  const ON = { qa: { "aesthetic-rules": true } };
  assert.deepEqual(await run(BAD, {}), [], "off without the opt-in");
  const bad = await run(BAD, ON), has = (re) => assert.ok(bad.some((l) => re.test(l)), `want ${re} in\n${bad.join("\n")}`);
  has(/^R1 .*0\.\d+ s/); has(/^R4 5 whole-frame/); has(/^Q11 caption "a small caption" is 12 px/); has(/^Q11 text "tiny label" is 8 px/); has(/^Q3 /);
  const good = await run(GOOD, ON);
  assert.deepEqual(good, [], "a clean film has no findings: " + good.join("; "));
  console.log(`  aesthetic-rules: ${bad.length} findings on the bad film, 0 on the good one`);

  // ── sfx-repeat ──
  const proj = path.join(tmp, "sfx"); fs.mkdirSync(proj);
  const sfx = (cues, qa = true) => JSON.parse(spawnSync(process.platform === "win32" ? "python" : "python3", ["-c", `import sys, json, importlib.util
open(${JSON.stringify(path.join(proj, "timeline.json"))}, "w").write(json.dumps({"cues": json.loads(${JSON.stringify(JSON.stringify(cues))})}))
s = importlib.util.spec_from_file_location("sfx", "tools/checks/sfx-repeat.py"); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)
print(json.dumps(m.check(dict(proj=${JSON.stringify(proj)}, P=json.loads(${JSON.stringify(JSON.stringify(qa ? { qa: { "sfx-repeat": true } } : {}))})))))`], { cwd: ROOT, encoding: "utf8" }).stdout);
  const c = (kind, ...ts) => ts.map((t) => ({ t, kind, gain: 1 }));
  assert.equal(sfx(c("click", 1, 1.3, 1.6)).length, 1, "three clicks in 0.6 s");
  assert.equal(sfx(c("tick", 1, 1.3, 1.6)).length, 0, "ticks alternate in mix.py");
  assert.equal(sfx([...c("click", 1, 1.4), ...c("tap", 1.2, 1.6)]).length, 0, "an alternating pair of kinds is fine");
  assert.equal(sfx(c("click", 1, 5)).length, 0, "far apart is not a repeat");
  assert.equal(sfx(c("click", 1, 1.3), false).length, 0, "off without the opt-in");
  console.log("  sfx-repeat: ok");

  // ── arc ──
  const A = (shot, role, bars, energy, hold = 0) => ({ shot, role, bars, energy, hold });
  const good2 = [A("open", "open", 2, 1, 1), A("hero", "hero", 2, 3, 1), A("f1", "feature", 2, 3), A("b1", "breath", 1, 1, 0.5), A("f2", "feature", 2, 4),
    A("b2", "breath", 1, 1, 0.5), A("f3", "feature", 2, 5), A("peak", "peak", 3, 8, 0.5), A("end", "end", 1, 3, 1.2)];
  const ok = validateArc(good2, { bar: 2 });
  assert.deepEqual(ok.lines, [], "the good arc: " + ok.lines.join("; "));
  const w = (arc, re, msg) => { const r = validateArc(arc, { bar: 2 }); assert.ok(r.lines.some((l) => re.test(l)), `${msg}: ${r.lines.join(" | ")}`); };
  w(good2.map((s) => (s.shot === "open" ? { ...s, energy: 6 } : s)), /^open: .*above the median/, "loud open");
  w(good2.filter((s) => s.role !== "hero"), /^hero: 0 hero/, "no hero");
  w(good2.map((s) => (s.shot === "f2" ? { ...s, energy: 2 } : s)), /^climb: feature "f2"/, "a feature falls back");
  w(good2.filter((s) => s.role !== "breath"), /^breath: three strong shots/, "no breath cards");
  w(good2.map((s) => (s.shot === "f3" ? { ...s, energy: 9 } : s)), /^close: "peak" .* is not the loudest/, "the close is not the loudest");
  w(good2.map((s) => (s.role === "end" ? { ...s, hold: 0.4 } : s)), /^holds: end card/, "short wordmark hold");
  w(good2.map((s) => ({ ...s, hold: 0 })), /^holds: .* of hold/, "no hold budget");
  console.log("  arc: the good promo passes, 7 broken variants each warn");

  // ── review ──
  const md = fs.readFileSync(path.join(ROOT, "docs/playbook/final-review.md"), "utf8");
  const ids = [...md.matchAll(/^\| ([PFVAD]\d) /gm)].map((m) => m[1]);
  assert.ok(new Set(ids).size === ids.length && ids.length >= 20, "unique checklist ids: " + ids);
  for (const s of "PFVAD") assert.ok(ids.some((i) => i[0] === s), "section " + s);
  const r = spawnSync(process.execPath, ["bin/reelwright.mjs", "review", "projects/example-hf"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  for (const id of ids) assert.ok(new RegExp(`^${id}  [FW]  `, "m").test(r.stdout), "brief lacks " + id);
  assert.match(r.stdout, /clean|have not seen it made/i);
  console.log(`  review: brief lists ${ids.length} items`);
  console.log("p10-lints self-check: arc validator, aesthetic rules, sfx-repeat and the final-review checklist pass");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
