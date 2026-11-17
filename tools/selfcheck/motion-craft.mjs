// node tools/selfcheck/motion-craft.mjs — the motion-craft layer, in node: tools/direct.js (KIT.direct, KIT.direct.hierarchy,
// KIT.anticipate, KIT.step, KIT.hold) and the spring / perceptual-scale additions to tools/timing.js. Loads engine.js, timing.js,
// velocity.js and direct.js in a vm with a DOM stub (no browser), then asserts exact numbers: the budget's arithmetic, a wind-up
// that is negative before t0 and 0 at it, 12 poses a second, springs that settle at visualDuration within 0.1 %, the documented
// overshoot per preset, a velocity hand-off that removes the snap, and perceptual scale at its mid-points. The shuffled-seek
// purity of a film that uses all of them is tools/selfcheck/remotion-kit/motion-craft.mjs (both renderers).
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const style = { setProperty() {}, getPropertyValue: () => '' };
const el = () => ({ style, set innerHTML(v) {}, appendChild() {}, setAttribute() {} });
const canvas = () => ({ getContext: () => ({ set fillStyle(v) {}, get fillStyle() { return '#000'; } }) });
const window = {};
const ctx = vm.createContext({
  window, console, Math,
  document: { getElementById: () => null, documentElement: el(), body: el(), fonts: Object.assign([], { add() {}, ready: Promise.resolve() }),
    styleSheets: [], createElement: (n) => (n === 'canvas' ? canvas() : el()),
    createElementNS: () => ({ style: {}, attrs: {}, kids: [], setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.kids.push(c); } }) },
  getComputedStyle: () => style,
});
for (const f of ['engine.js', 'timing.js', 'velocity.js', 'direct.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8'), ctx);
const K = window.KIT;

const fails = [];
const group = (name, fn) => {
  const before = fails.length;
  try { fn(); } catch (e) { fails.push(`${name}: threw ${e.message}`); }
  console.log(`${fails.length > before ? 'FAIL' : 'ok  '} ${name}`);
};
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, want ${b} ± ${tol}`);

// ── 1. the motion budget ───────────────────────────────────────────────────
group('direct: roles sort by order, waves of maxConcurrent, step shrink to total', () => {
  const cues = [{ id: 'viz', role: 'viz' }, { id: 'shell', role: 'shell' }, { id: 'body', role: 'body' }, { id: 'kpi', role: 'primary' }];
  const d = K.direct(cues, { order: ['shell', 'body', 'primary', 'viz'] });
  ok(JSON.stringify(d) === JSON.stringify({ shell: 0, body: 0, kpi: 0.02, viz: 0.02 }), `defaults gave ${JSON.stringify(d)}`);
  const seq = K.direct(['a', 'b', 'c'], { maxConcurrent: 1 });
  ok(JSON.stringify(seq) === JSON.stringify({ a: 0, b: 0.02, c: 0.04 }), `maxConcurrent 1 gave ${JSON.stringify(seq)}`);
  // no role in `order` goes last, in the order given
  const un = K.direct([{ id: 'x', role: 'zzz' }, { id: 'y', role: 'shell' }, { id: 'z', role: 'aaa' }], { order: ['shell'], stagger: 0.1, maxConcurrent: 1 });
  ok(JSON.stringify(un) === JSON.stringify({ y: 0, x: 0.1, z: 0.2 }), `unknown roles gave ${JSON.stringify(un)}`);
  // 40 cues: the step shrinks so the last wave starts at total, never past it
  const many = K.direct(Array.from({ length: 40 }, (_, i) => 'c' + i), { maxConcurrent: 1, stagger: 0.02, total: 0.5 });
  const ds = Object.values(many);
  near(Math.max(...ds), 0.5, 1e-12, 'the last of 40 starts at total');
  ok(ds.every((v) => v <= 0.5), 'no cue starts after total');
  ok(ds.every((v, i) => !i || v > ds[i - 1]), 'the cues are strictly staggered when maxConcurrent is 1');
  // at most maxConcurrent cues share a start time
  const waves = K.direct(Array.from({ length: 9 }, (_, i) => 'c' + i), { maxConcurrent: 3 });
  const share = new Map(); for (const v of Object.values(waves)) share.set(v, (share.get(v) || 0) + 1);
  ok(Math.max(...share.values()) === 3 && share.size === 3, `3 per wave: ${JSON.stringify([...share])}`);
  ok(Object.keys(K.direct([])).length === 0, 'no cues is an empty object');
  for (const bad of [() => K.direct([{ id: 'a' }, { id: 'a' }]), () => K.direct('a'), () => K.direct(['a'], { stagger: 0 }), () => K.direct(['a'], { total: 0 }), () => K.direct(['a'], { maxConcurrent: 0 })])
    { try { bad(); ok(false, 'a bad budget was accepted'); } catch { /* refused */ } }
});

// ── 2. anticipation ────────────────────────────────────────────────────────
group('anticipate: negative before t0, 0 at t0, C1 at both ends, peak = -amount', () => {
  const t0 = 1, A = (t) => K.anticipate(t, t0);
  ok(A(1) === 0 && A(1.2) === 0, `at and after t0 it is 0 (${A(1)}, ${A(1.2)})`);
  ok(A(0.9) === 0 && A(0.5) === 0, 'before the window it is 0');
  ok(A(0.96) < 0 && A(0.99) < 0, 'strictly negative inside the window');
  near(A(t0 - 0.04), -0.06, 1e-12, 'the peak at the middle of the window is -amount');
  let mn = 0, mx = 0; for (let i = 0; i <= 1000; i++) { const v = A(0.8 + i * 0.0004); mn = Math.min(mn, v); mx = Math.max(mx, v); }
  ok(mn >= -0.06 - 1e-12 && mx <= 0, `range is [-amount, 0] (${mn}, ${mx})`);
  // slope 0 at a seam: the one-sided derivative from inside the window must vanish as h → 0 (the outside slope is 0)
  const d = (t, h = 1e-5) => (A(t + h) - A(t)) / h, one = (h) => Math.abs(A(t0 - h) / h);
  ok(one(1e-4) < 0.05 && one(1e-5) < 0.005 && one(1e-6) < 5e-4, `the slope at the seam goes to 0 (${one(1e-4)}, ${one(1e-5)}, ${one(1e-6)})`);
  ok(one(1e-6) / one(1e-5) > 0.05, 'and it does so linearly, as a C¹ join does');
  ok(Math.abs(d(0.96)) < 0.05 && Math.abs(d(0.94)) > 1, `flat at the peak, moving at a quarter (${d(0.96)}, ${d(0.94)})`);
  // multiplied into an eased value it dips below the eased value before t0 and is back on it at t0
  const p = (t) => K.clamp((t - (t0 - 0.3)) / 0.6);
  ok(p(0.95) * (1 + A(0.95)) < p(0.95) && p(0.99) * (1 + A(0.99)) < p(0.99), 'p * (1 + anticipate) is a counter-move');
  near(p(t0) * (1 + A(t0)), p(t0), 1e-12, 'and it rejoins the eased value exactly at t0');
  try { K.anticipate(0, 1, { dur: 0 }); ok(false, 'dur 0 was accepted'); } catch { /* refused */ }
});

// ── 3. stepped time and holds ──────────────────────────────────────────────
group('step / hold: 12 poses a second, a clamp inside a window', () => {
  const s = K.step();
  ok(s(0) === 0 && s(1 / 12 - 1e-4) === 0 && s(1 / 12) === 1 / 12, `12 fps steps at 1/12 (${s(1 / 12 - 1e-4)}, ${s(1 / 12)})`);
  const poses = new Set(); for (let i = 0; i < 3000; i++) poses.add(K.step()(i / 1000));
  ok(poses.size === 36, `3 s at 12 fps holds 36 poses (got ${poses.size})`);
  let held = 0; const v = []; for (let i = 0; i < 12; i++) v.push(s(1 + i / 12)); for (let i = 1; i < 12; i++) if (v[i] === v[i - 1]) held++;
  ok(held === 0, 'every pose in a second differs');
  ok(K.step(8)(0.24) === 0.125 && K.step(8)(0.249) === 0.125, `on threes: ${K.step(8)(0.24)}`);
  ok(K.step(12)(1 / 12 + 1e-7) === 1 / 12, 'the +1e-6 nudge keeps float noise off the previous pose');
  try { K.step(0); ok(false, 'fps 0 was accepted'); } catch { /* refused */ }
  ok(K.hold(0.5, 1, 2) === 1 && K.hold(1.5, 1, 2) === 1.5 && K.hold(9, 1, 2) === 2, 'hold clamps outside the window, identity inside');
  try { K.hold(0, 2, 1); ok(false, 'a reversed window was accepted'); } catch { /* refused */ }
});

// ── 4. springs: by feel, presets, velocity hand-off ───────────────────────
const peak = (sp, from, to, span = 6) => { let m = -Infinity; for (let i = 0; i <= 6000; i++) m = Math.max(m, sp(i * span / 6000)); return (m - from) / (to - from) - 1; };
const zeta = ({ mass, stiffness, damping }) => damping / (2 * Math.sqrt(stiffness * mass));
const overshoot = (z) => (z < 1 ? Math.exp(-z * Math.PI / Math.sqrt(1 - z * z)) : 0);

group('spring: the old form is untouched, visualDuration settles at 0.1 %, overshoot is the formula', () => {
  // the engine's own closed form, written out again: the legacy call must still match it
  const ref = (t, { mass = 1, stiffness = 100, damping = 10 } = {}) => {
    const w0 = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
    if (t <= 0) return 0;
    if (z >= 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    const a = z * w0, w1 = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-a * t) * (Math.cos(w1 * t) + a / w1 * Math.sin(w1 * t));
  };
  for (const cfg of [{ stiffness: 100, damping: 10, mass: 1 }, { stiffness: 200, damping: 18, mass: 1 }, { stiffness: 120, damping: 7, mass: 1 }, { stiffness: 400, damping: 40, mass: 1 }]) {
    const sp = K.spring(cfg);
    for (const t of [0, 1 / 240, 0.1, 0.37, 0.75, 1.6, 3]) near(sp(t), ref(t, cfg), 1e-12, `legacy spring ${JSON.stringify(cfg)} at ${t}`);
  }
  ok(K.spring({ from: 2, to: 5 })(-1) === 2 && K.spring({ from: 2, to: 5 })(0) === 2, 'from before it starts');
  // by feel: the envelope e^(-ζω0·t) is at 0.1 % at visualDuration (the value itself is that envelope times cos/sin)
  for (const bounce of [0, 0.25, 0.5, 0.75]) {
    const vd = 0.6, sp = K.spring({ visualDuration: vd, bounce, from: 0, to: 1 }), z = 1 - bounce;
    const w0 = -Math.log(0.001) / (z * vd), bound = 0.001 * (1 + (z < 1 ? z / Math.sqrt(1 - z * z) : w0 * vd));
    ok(Math.abs(sp(vd) - 1) <= bound, `bounce ${bounce}: |value - 1| at visualDuration is ${Math.abs(sp(vd) - 1)}, over the 0.1 % envelope (${bound})`);
    ok(Math.abs(sp(vd) - 1) <= 0.008, `bounce ${bounce}: settled within 1 % at visualDuration (${Math.abs(sp(vd) - 1)})`);
    ok(Math.abs(sp(vd / 2) - 1) > 0.002, `bounce ${bounce}: it is not already settled at half of it`);
    if (z < 1) near(peak(sp, 0, 1), overshoot(z), 2e-3, `bounce ${bounce}: overshoot vs e^(-ζπ/√(1-ζ²))`);
    else ok(Math.abs(peak(sp, 0, 1)) < 1e-6, 'bounce 0 does not overshoot');
  }
  ok(K.spring({ visualDuration: 0.4, bounce: 0.3, from: 10, to: 20 })(0.4) > 19.98, 'from/to are honoured');
  near(overshoot(0.5), 0.1630, 1e-4, 'the documented 16.3 % at ζ = 0.5');
  for (const bad of [() => K.spring({ visualDuration: 0 }), () => K.spring({ bounce: 1 }), () => K.spring({ bounce: -0.1 }),
    () => K.spring({ bounce: 0.4, stiffness: 100 }), () => K.spring('nope')]) { try { bad(); ok(false, 'a bad spring was accepted'); } catch { /* refused */ } }
});

group('spring: overshootClamping stops at the target on every form, and leaves the unclamped path alone', () => {
  const peakOf = (sp) => { let m = -Infinity; for (let i = 0; i <= 3000; i++) m = Math.max(m, sp(i / 500)); return m; };
  for (const cfg of [{ stiffness: 120, damping: 7, mass: 1 }, { visualDuration: 0.5, bounce: 0.5 }, { stiffness: 120, damping: 7, mass: 1, velocity: 3 }]) {
    ok(peakOf(K.spring({ ...cfg })) > 1.05, `${JSON.stringify(cfg)} overshoots without the flag`);
    ok(peakOf(K.spring({ ...cfg, overshootClamping: true })) === 1, `${JSON.stringify(cfg)} is clamped at 1 with it`);
  }
  const down = K.spring({ from: 10, to: 0, visualDuration: 0.5, bounce: 0.5, overshootClamping: true });
  ok(Array.from({ length: 600 }, (_, i) => down(i / 100)).every((v) => v >= 0 && v <= 10), 'falling spring never goes below the target');
  const tm = K.timing.spring({ stiffness: 120, damping: 7, overshootClamping: true });
  ok(Array.from({ length: 101 }, (_, i) => tm.at(i / 100)).every((v) => v <= 1), 'KIT.timing.spring honours overshootClamping');
  near(K.spring({ stiffness: 100, damping: 10 })(0.37), K.spring({ stiffness: 100, damping: 10, overshootClamping: false })(0.37), 0, 'false changes nothing');
});

group('spring presets: the Motion Canvas table, each at its measured overshoot', () => {
  const table = K.spring.presets;
  ok(Object.keys(table).sort().join() === 'beat,bounce,jump,plop,smooth,strike,swing', `presets: ${Object.keys(table)}`);
  const documented = { plop: 0.582, strike: 0.108, smooth: 0.095, bounce: 0.880, swing: 0.158, jump: 0.147, beat: 0.247 };   // measured, in docs/playbook/timing.md
  for (const [name, p] of Object.entries(table)) {
    const sp = K.spring(name, 0, 1);
    ok(sp(0) === 0 && sp(-1) === 0, `${name}: starts at from`);
    near(peak(sp, 0, 1), documented[name], 2e-3, `${name}: measured peak`);
    const z = zeta(p);
    if (!p.velocity) near(peak(sp, 0, 1), overshoot(z), 2e-3, `${name}: its v0 is 0, so the peak is the ζ overshoot`);
    else ok(peak(sp, 0, 1) > overshoot(z), `${name}: its initial kick adds to the ζ overshoot (${peak(sp, 0, 1)} > ${overshoot(z)})`);
  }
  ok(K.spring('plop')(0) === 0 && K.spring('plop')(5) > 0.999, 'a preset with no from/to is a 0 → 1 spring');
});

group('spring velocity: the hand-off from the previous segment removes the snap', () => {
  // segment A: a spring in, retargeted at t1; the hand-off velocity is A's slope there (one-sided: a spring is flat before 0)
  const A = K.spring({ stiffness: 120, damping: 12, mass: 1, from: 0, to: 1 }), t1 = 0.2;
  const slope = (f, t, h = 1e-5) => (f(t + h) - f(t)) / h;
  const v = slope(A, t1 - 1e-5), y1 = A(t1);
  const B = K.spring({ visualDuration: 0.5, bounce: 0.3, from: y1, to: 0, velocity: v });
  near(slope(B, 0, 1e-6), v, 1e-2, 'B leaves at the velocity it was handed');
  const snapped = K.spring({ visualDuration: 0.5, bounce: 0.3, from: y1, to: 0 });
  ok(Math.abs(slope(snapped, 0, 1e-6) - v) > 1, `without velocity it starts at rest: the snap is ${(slope(snapped, 0, 1e-6) - v).toFixed(2)} units/s`);
  // and the two segments join: the value is continuous and the slope does not jump
  near(B(0), y1, 1e-12, 'the join is continuous');
  near(slope(B, 0, 1e-5), v, 1e-2, 'the slope does not jump across the retarget');
  near(K.spring({ stiffness: 100, damping: 10, mass: 1, velocity: 2 })(0), 0, 1e-12, 'velocity does not move the start value');
});

group('timing.spring: by feel, dur = visualDuration, at(1) is settled', () => {
  const tm = K.timing.spring({ visualDuration: 0.5, bounce: 0.4 });
  ok(tm.dur === 0.5 && tm.at(0) === 0 && Math.abs(tm.at(1) - 1) <= 0.005, `timing.spring: ${tm.dur}, ${tm.at(0)}, ${tm.at(1)}`);
  ok(K.timing.spring({ visualDuration: 0.5, dur: 2 }).dur === 2, 'dur still stretches it');
  const old = K.timing.spring({ stiffness: 100, damping: 10, mass: 1 });
  ok(old.dur > 0.3 && old.dur < 10 && old.at(0) === 0 && Math.abs(old.at(1) - 1) < 0.006, `the old timing.spring is unchanged (${old.dur})`);
});

// ── 5. perceptual scale ────────────────────────────────────────────────────
group('perceptual-scale: the signed area is interpolated, then square-rooted back', () => {
  const o = { output: 'perceptual-scale' };
  near(K.interpolate(0.5, [0, 1], [0, 1], o), Math.sqrt(0.5), 1e-12, '0 → 1 at the middle is √0.5');
  near(K.interpolate(0.5, [0, 1], [1, 2], o), Math.sqrt(2.5), 1e-12, '1 → 2 at the middle is √2.5');
  near(K.interpolate(0.5, [0, 1], [0, -1], o), -Math.sqrt(0.5), 1e-12, '0 → -1 at the middle is -√0.5');
  ok(K.interpolate(0, [0, 1], [0.5, 2], o) === 0.5 && K.interpolate(1, [0, 1], [0.5, 2], o) === 2, 'the endpoints are exact');
  near(K.interpolate(0.5, [0, 1], [0, 1], { ...o, easing: (p) => p * p }), 0.5, 1e-12, 'easing still shapes the progress');
  ok(K.interpolate(0.5, [0, 1], [0, 1]) === 0.5, 'without the option the value is linear');
  const lin = [(x) => x];   // K.keys' default ease is the theme's, so pin the progress
  near(K.keys(0.5, [[0, 0], [1, 1]], lin, o), Math.sqrt(0.5), 1e-12, 'K.keys takes it too');
  ok(K.keys(0.5, [[0, 0], [1, 1]], lin) === 0.5, 'K.keys without the option is unchanged');
  near(K.keys(0.5, [[0, 1], [1, 2]], lin, o), Math.sqrt(2.5), 1e-12, 'K.keys: 1 → 2');
  near(K.keys(0.75, [[0, 0], [1, 1]], lin, o), Math.sqrt(0.75), 1e-12, 'K.keys at three quarters');
  try { K.interpolate(0.5, [0, 1], [0, 1], { output: 'perceptual' }); ok(false, 'a bad output was accepted'); } catch { /* refused */ }
  try { K.interpolate(0.5, [0, 1], ['0px', '10px'], o); ok(false, 'perceptual-scale accepted strings'); } catch { /* refused */ }
});

// ── 6. the secondary layer ─────────────────────────────────────────────────
group('direct.hierarchy: 35 % of the hero, same direction, one frame behind', () => {
  const hero = (t) => t;   // a linear driver: the exponential average of a line is exactly t - tau
  const f = K.direct.hierarchy(hero, ['a', 'b', { id: 'c', ratio: 0.25, lag: 1 / 30 }], { lag: 1 / 60 });
  near(f.a(2), 0.35 * (2 - 1 / 60), 3e-4, 'a trails the hero by about one frame, at 35 %');
  ok(f.a(2) === f.b(2), 'two followers with the same settings agree');
  near(f.c(2), 0.25 * (2 - 1 / 30), 3e-4, 'c has its own ratio and lag');
  ok(f.a(2) > 0 && f.a(2) < hero(2), 'it is behind, not ahead');
  near(2 - f.a(2) / 0.35, 1 / 60, 1e-3, 'the lag it actually shows is a frame');
  const vec = K.direct.hierarchy((t) => [t, 2 * t], ['v']);
  near(vec.v(1)[0], 0.35 * (1 - 1 / 60), 3e-4, 'a vector keeps its direction: x');
  near(vec.v(1)[1], 0.7 * (1 - 1 / 60), 6e-4, 'a vector keeps its direction: y');
  ok(Math.abs(vec.v(1)[1] / vec.v(1)[0] - 2) < 1e-9, 'the vector is only scaled, never rotated');
  const obj = K.direct.hierarchy((t) => ({ x: t, y: -t }), ['v']);
  near(obj.v(1).x, 0.35 * (1 - 1 / 60), 3e-4, 'an object driver works too');
  ok(K.direct.hierarchy((t) => t, []) && typeof K.direct.hierarchy((t) => t, ['a']).a === 'function', 'returns functions');
  for (const bad of [() => K.direct.hierarchy(1, ['a']), () => K.direct.hierarchy((t) => t, 'a'), () => K.direct.hierarchy((t) => t, ['a'], { lag: 0 })])
    { try { bad(); ok(false, 'a bad hierarchy was accepted'); } catch { /* refused */ } }
});

if (fails.length) { console.error(`motion-craft: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log('motion-craft self-check: the budget, anticipation, stepped time, springs by feel and presets, the velocity hand-off, perceptual scale and the secondary layer all hold');
