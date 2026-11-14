// node tools/selfcheck/p6-rules.mjs — rows doodle-shots-motion:3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9, 3.10, 3.11, 3.12, 3.14:
// KIT.motionRules (tools/motion-rules.js) and its prose (docs/playbook/motion-rules.md).
//  1. node: the tables and helpers meet the numbers the rows give (material overshoot, spring palette, distance anchors, exit
//     65-75 %, stagger total < 0.5 s for every class and n, loop periodic and seeded).
//  2. docs: every key of every table is named in the playbook page (the data and the prose cannot drift apart).
//  3. browser: in both renderers a film using the ambient loops, material and spring eases and stagger offsets is a pure
//     function of t under shuffled seeks; KIT.motionRules agrees with KIT.bezier / KIT.spring; every KIT call the strategy and
//     feedback tables name exists.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { runFixtures, ROOT } from "./p6-harness.mjs";

const m = { exports: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "tools/motion-rules.js"), "utf8"), { module: m });
const R = m.exports, doc = fs.readFileSync(path.join(ROOT, "docs/playbook/motion-rules.md"), "utf8");
const near = (a, b, e, msg) => assert.ok(Math.abs(a - b) <= e, `${msg}: ${a} vs ${b}`);
const peak = (f) => { let x = 1; for (let i = 0; i <= 1000; i++) x = Math.max(x, f(i / 1000)); return x - 1; };

// 3.3 easing
for (const n of Object.keys(R.easings)) { const e = R.easing(n); assert.equal(e(0), 0); assert.equal(e(1), 1); }
assert.throws(() => R.easing("nope"));
near(R.easing("standard")(0.5), 0.8, 0.1, "standard is front-loaded");
assert.ok(peak(R.easing("elasticSnap")) > 0.05 && Math.min(...Array.from({ length: 100 }, (_, i) => R.easing("elasticSnap")(i / 100))) < 0, "elasticSnap winds up and overshoots");

// 3.4 material
const MAT = { rigid: [1.2, 0, 0], elastic: [0.8, 0.15, 0.25], fluid: [1.5, 0.04, 0.06], paper: [1.0, 0.03, 0.05], gas: [2.0, 0, 0], glass: [0.9, 0, 0] };
for (const [k, [d, lo, hi]] of Object.entries(MAT)) {
  const x = R.material(k), o = peak(x.ease);
  assert.equal(x.durScale, d, k + " durScale"); assert.ok(o >= lo - 1e-3 && o <= hi + 1e-3, `${k} overshoot ${o} not in ${lo}-${hi}`);
  assert.equal(x.ease(0), 0); assert.equal(x.ease(1), 1);
}
assert.throws(() => R.material("wood"));

// 3.5 springs: stiffness and damping ranges from the row, overshoot falls as damping rises
const S = R.springs;
assert.ok(S.veryStiff.stiffness >= 400 && S.veryStiff.damping >= 25 && S.veryStiff.damping <= 30);
assert.ok(S.veryBouncy.stiffness >= 100 && S.veryBouncy.stiffness <= 200 && S.veryBouncy.damping >= 5 && S.veryBouncy.damping <= 10);
const order = ["veryStiff", "stiff", "standard", "bouncy", "veryBouncy"].map((k) => R.spring(k));
for (let i = 1; i < order.length; i++) assert.ok(order[i].overshoot > order[i - 1].overshoot * 0.999 && order[i].settle > order[i - 1].settle * 0.999, "palette ordered stiff to bouncy");

// 3.6 duration
near(R.distScale(50), 0.8, 1e-9, "50 px"); near(R.distScale(100), 1, 1e-9, "100 px");
assert.ok(R.distScale(1080) >= 1.8 && R.distScale(1920) <= 2, "full screen 1.8-2x");
for (let p = 0; p < 2000; p += 37) assert.ok(R.distScale(p + 37) >= R.distScale(p), "distScale is monotonic");
assert.equal(R.exitDur(1, 0.2), 0.65); assert.equal(R.exitDur(1, 0.9), 0.75); near(R.exitDur(0.4), 0.28, 1e-9, "exit");
near(R.distDur(100, 0.5), 0.5, 1e-9, "distDur");

// 3.7 stagger
for (const cls of Object.keys(R.staggers)) for (const from of ["start", "center", "edges", "end", 2]) for (const n of [1, 2, 5, 12, 60]) {
  const o = R.stagger(cls, n, { from, grid: cls === "grid" ? [4] : undefined });
  assert.equal(o.length, n);
  if (n > 1) { assert.ok(Math.max(...o) < 0.5, `${cls}/${from}/${n}: total ${Math.max(...o)} not under 0.5 s`); assert.ok(Math.min(...o) >= 0); }
}
assert.equal(R.stagger("list", 5).join(), [0, 0.05, 0.1, 0.15, 0.2].join());
near(R.stagger("dashboard", 5)[2], 0, 1e-9, "dashboard starts at the centre");
assert.ok(R.stagger("list", 5, { from: "edges" })[0] === 0 && R.stagger("list", 5, { from: "edges" })[2] > 0, "edges first");
assert.ok(R.overlap("list", 0.4) > 0.85 && R.overlap("list", 0.4) < 0.9);

// 3.11 loops
for (const shape of ["sine", "saw", "tri", "breathe"]) {
  for (let t = 0; t < 9; t += 0.7) { const v = R.loop(t, 3, shape, "a"); assert.ok(v >= 0 && v <= 1); near(v, R.loop(t + 3, 3, shape, "a"), 1e-9, shape + " periodic"); }
}
assert.notEqual(R.loop(1, 4, "sine", "a"), R.loop(1, 4, "sine", "b"), "id seeds the phase");
assert.equal(R.loop(1, 4, "sine", "a"), R.loop(1, 4, "sine", "a"));
near(R.ambient.breathe(0, "", { period: 4 }), 1, 1e-9, "breathe starts at 1");
assert.throws(() => R.loop(0, 1, "zig"));
// 3.12
assert.equal(R.shake(0, 1), 0); near(R.shake(1.4, 1), 0, 1e-9, "shake ends"); assert.equal(R.shake(0.9, 1), 0); assert.equal(R.shake(1.5, 1), 0); assert.ok(Math.abs(R.shake(1.05, 1)) > 0);
// 3.8
near(R.counterMotion(100), -25, 1e-9, "counter-motion"); near(R.counterMotion(100, 0.9), -30, 1e-9, "counter-motion clamp");
// 3.1 / 3.9
assert.equal(R.checklist.length, 8); assert.equal(R.pillars.length, 3); assert.deepEqual(Object.keys(R.layers), ["primary", "secondary", "ambient"]);
near(R.acts.reduce((s, a) => s + a.share, 0), 1, 1e-9, "acts share"); assert.equal(R.acts.length, 4);

// docs name every key of every table
const named = (label, keys) => { for (const k of keys) assert.ok(doc.includes("`" + k + "`") || doc.includes(k), `docs/playbook/motion-rules.md does not mention ${label} "${k}"`); };
named("easing", Object.keys(R.easings)); named("material", Object.keys(R.materials)); named("spring", Object.keys(R.springs));
named("duration", Object.keys(R.durations)); named("stagger class", Object.keys(R.staggers)); named("emotion", Object.keys(R.emotion));
named("act", R.acts.map((a) => a.act)); named("strategy", R.strategies.map((s) => s.family)); named("feedback", Object.keys(R.feedback));
named("ambient", Object.keys(R.ambient)); named("pillar", R.pillars); named("layer", Object.keys(R.layers));
named("step", R.checklist.map((c) => c.split(":")[0])); named("troubleshooting symptom", R.troubleshooting.map((r) => r[0]));
named("quality check", R.quality.map((q) => q.enforced));
for (const n of ["Squash and stretch", "Anticipation", "Staging", "Follow-through", "Slow in and slow out", "Arcs", "Secondary action", "Timing", "Exaggeration", "Solid drawing", "Appeal"])
  assert.ok(doc.includes(n), "Disney principle missing: " + n);
console.log("PASS  tables, helpers and docs agree");

// browser: shuffled seeks in both renderers + agreement with the engine
const calls = [...new Set([...R.strategies.flatMap((s) => [...s.calls, ...s.exitCalls]), ...Object.values(R.feedback).map((f) => f.call)])];
const fx = {
  name: "rules-ambient", dur: 6, minMoving: 8,
  scripts: ["tools/doodle.js", "tools/motion.js", "tools/transitions.js", "tools/shots.js", "tools/shots2.js", "vendor/paths/paths.js", "tools/path.js", "tools/motion-rules.js"],
  film: `
const R = KIT.motionRules, mat = R.material('elastic'), mat2 = R.material('fluid'), sp = KIT.spring({ ...R.springs.bouncy, from: 0, to: 1 });
const box = (c, y) => { const e = KIT.el('div', 'box', S); e.style.background = c; e.style.top = y + 'px'; return e; };
const b1 = box('#36c', 10), b2 = box('#e33', 100), b3 = box('#2a7', 190), b4 = box('#c80', 280);
const dots = Array.from({ length: 6 }, (_, i) => { const e = KIT.el('div', 'dot', S); e.style.left = (420 + i * 36) + 'px'; e.style.top = '40px'; return e; });
const off = R.stagger('dashboard', 6);
window.RULES = { R, calls: ${JSON.stringify(calls)} };
KIT.start({ dur: 6, render: (t) => {
  b1.style.left = 20 + 300 * mat.ease(KIT.seg(t, 0.3, 0.3 + 0.5 * mat.durScale)) + 'px';
  b2.style.left = 20 + 300 * sp(Math.max(0, t - 0.6)) + 'px';
  b3.style.left = 20 + 300 * mat2.ease(KIT.seg(t, 1, 1 + 0.5 * mat2.durScale)) + 'px';
  b3.style.transform = 'translateY(' + R.ambient.float(t, 'b3') + 'px) scale(' + R.ambient.breathe(t, 'b3') + ')';
  b4.style.left = 20 + 300 * R.easing('standard')(KIT.seg(t, 2, 2.6)) + R.shake(t, 4, { amp: 12 }) + 'px';
  b4.style.filter = 'hue-rotate(' + R.ambient.gradient(t, 'b4') + 'deg)';
  dots.forEach((d, i) => { const p = KIT.E.out(KIT.seg(t, 1.5 + off[i], 1.9 + off[i])); d.style.opacity = p; d.style.transform = 'scale(' + (0.3 + 0.7 * p) * R.ambient.breathe(t, 'd' + i, { amount: 0.4 }) + ')'; });
} });`,
  check: async (page) => {
    const bad = await page.evaluate(() => {
      const out = [], as = (c, m) => { if (!c) out.push(m); }, { R, calls } = window.RULES, K = window.KIT;
      as(K.motionRules === R && K.material === R.material && K.springs === R.springs && K.distDur === R.distDur && K.loop === R.loop, 'KIT aliases');
      for (const [n, b] of Object.entries(R.easings)) for (const p of [0.1, 0.35, 0.6, 0.9]) as(Math.abs(R.easing(n)(p) - K.bezier(...b)(p)) < 1e-6, 'easing ' + n + ' differs from KIT.bezier');
      for (const k of Object.keys(R.springs)) {   // analytic overshoot vs the engine's spring
        const f = K.spring({ ...R.springs[k] }); let mx = 0; for (let i = 0; i < 1200; i++) mx = Math.max(mx, f(i / 240));
        as(Math.abs(mx - 1 - R.spring(k).overshoot) < 0.01, 'spring ' + k + ' overshoot ' + (mx - 1) + ' vs ' + R.spring(k).overshoot);
        let last = 0; for (let i = 0; i < 2400; i++) if (Math.abs(f(i / 240) - 1) > 0.02) last = i / 240;   // the 2 % band the docs name
        as(Math.abs(last - R.spring(k).settle) <= 0.4 * R.spring(k).settle + 0.1, 'spring ' + k + ' settle ' + last + ' vs ' + R.spring(k).settle);
      }
      for (const c of calls) { let o = window; for (const part of c.split('.')) o = o && o[part]; as(o !== undefined && o !== null, 'strategy / feedback call ' + c + ' does not exist'); }
      return out;
    });
    if (bad.length) throw new Error("rules check: " + bad.join("; "));
  },
};
await runFixtures([fx], "p6-rules");
