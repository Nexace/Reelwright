// node tools/selfcheck/noise.mjs — tools/noise.js (KIT.noise) and tools/stagger.js (the grid-aware KIT.stagger).
// Loads engine.js, timing.js, noise.js and stagger.js in a vm with the same minimal DOM stub as motion-check.mjs.
// Proves: the same seed and t are the same value (byte-stable frames); duplicate ids sit at different phases, and
// stagger: 0 puts them on the same one; a position id equals the matching index; curl is a bounded, divergence-free-ish
// vector; octaves/gain/timeScale change the field. Stagger: centre symmetry, start/last/axis order, the each·(n−1)
// span, seeded jitter stability and the old KIT.stagger(i, n, total) form. Offline, no browser.
import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const style = { setProperty() {}, getPropertyValue: () => '' };
const el = (tag) => tag === 'canvas' ? { style: {}, getContext: () => ({ fillStyle: '' }) } : { style, set innerHTML(v) {}, appendChild() {}, setAttribute() {} };
const window = {};
const ctx = vm.createContext({
  window, console, Math,
  document: { getElementById: () => null, documentElement: el(), body: el(), fonts: Object.assign([], { add() {}, ready: Promise.resolve() }),
    styleSheets: [], createElement: el,
    createElementNS: () => ({ style: {}, attrs: {}, kids: [], setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.kids.push(c); } }) },
  getComputedStyle: () => style,
});
const run = (f) => vm.runInContext(fs.readFileSync(fileURLToPath(new URL('../' + f, import.meta.url)), 'utf8'), ctx);
for (const f of ['engine.js', 'timing.js', 'noise.js', 'stagger.js']) run(f);
const K = window.KIT;

const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);
const N = (t, id, o) => K.noise(t, id, o);

// ── KIT.noise ──
assert.equal(N(1.25, 3, { seed: 7 }), N(1.25, 3, { seed: 7 }), 'same seed and (t, id) must be identical');
assert.notEqual(N(1.25, 3, { seed: 7 }), N(1.25, 3, { seed: 8 }), 'a different seed must be a different field');
assert.notEqual(N(0, 0), N(0, 1), 'duplicate 0 and 1 must sit at different phases');
assert.equal(N(0.7, 0, { stagger: 0 }), N(0.7, 5, { stagger: 0 }), 'stagger: 0 puts every duplicate on the same phase');
assert.equal(N(0, [2, 0], { stagger: 1 }), N(0, 2), 'a position [x, 0] is the duplicate index x');
assert.equal(N(2, 0, { timeScale: 0 }), N(0, 0), 'timeScale: 0 freezes the field');
assert.notEqual(N(1, 0, { octaves: 1 }), N(1, 0, { octaves: 4 }), 'octaves must change the field');
assert.notEqual(N(1, 0, { gain: 0.2 }), N(1, 0, { gain: 0.8 }), 'gain must change the field');
for (const t of [0, 0.5, 1.3, 7]) { const v = N(t, 4); assert.ok(v >= -1 && v <= 1, `scalar bound at t=${t}: ${v}`); }

const h = 0.25, V = (x, y) => N(0, [x, y], { curl: true, seed: 3 });
let worstDiv = 0, worstCurl = 0;
for (let y = 0; y < 6; y += 0.7) for (let x = 0; x < 6; x += 0.7) {
  const c = V(x, y);
  assert.ok(Array.isArray(c) && c.length === 2, 'curl returns [x, y]');
  worstCurl = Math.max(worstCurl, Math.abs(c[0]), Math.abs(c[1]));
  const div = (V(x + h, y)[0] - V(x - h, y)[0]) / (2 * h) + (V(x, y + h)[1] - V(x, y - h)[1]) / (2 * h);
  worstDiv = Math.max(worstDiv, Math.abs(div));
}
assert.ok(worstCurl <= 1 + 1e-12, `curl must be bounded by amp (got ${worstCurl})`);
assert.ok(worstDiv < 0.05, `curl must be divergence-free-ish (worst divergence ${worstDiv})`);
for (const f of [() => N(NaN, 0), () => N(0, 0, { octaves: 0 }), () => N(0, 0, { gain: 2 }), () => N(0, 0, { freq: -1 }), () => N(0, 'x')])
  assert.throws(f, /KIT\.noise/);

// ── KIT.stagger ──
assert.equal(K.stagger(1, 3, 0.4), 0.2, 'the old KIT.stagger(i, n, total) keeps its meaning');
const centre = K.stagger({ each: 0.1, grid: [3, 3], from: 'center' });
const delays = Array.from({ length: 9 }, (_, i) => centre(i, 9));
assert.equal(delays[4], 0, 'from centre: the centre starts first');
assert.equal(delays[0], delays[2]); assert.equal(delays[0], delays[6]); assert.equal(delays[0], delays[8]);
assert.equal(delays[1], delays[3]); assert.equal(delays[1], delays[5]); assert.equal(delays[1], delays[7]);
near(delays[0], 0.8, 1e-12, 'corner delay'); near(delays[1], 0.8 / Math.SQRT2, 1e-12, 'edge delay');

const start = K.stagger({ each: 0.05, grid: [3, 3], from: 'start' });
assert.equal(start(0, 9), 0, 'from start: item 0 starts first');
near(Math.max(...Array.from({ length: 9 }, (_, i) => start(i, 9))), 0.4, 1e-12, 'the span is each·(n−1)');
const last = K.stagger({ each: 0.05, grid: [3, 3], from: 'last' });
assert.equal(last(8, 9), 0, 'from last: the last item starts first'); near(last(0, 9), 0.4, 1e-12, 'from last: item 0 is last');
const xAxis = K.stagger({ each: 0.1, grid: [3, 1], from: 'start', axis: 'x' });
assert.deepEqual([0, 1, 2].map((i) => xAxis(i, 3)), [0, 0.1, 0.2]);
const yAxis = K.stagger({ each: 0.1, grid: [1, 3], from: 'start', axis: 'y' });
assert.deepEqual([0, 1, 2].map((i) => yAxis(i, 3)), [0, 0.1, 0.2]);

const j1 = K.stagger({ each: 0.1, jitter: 0.5, seed: 9 }), j2 = K.stagger({ each: 0.1, jitter: 0.5, seed: 9 });
for (let i = 0; i < 20; i++) assert.equal(j1(i, 20), j2(i, 20), 'seeded jitter is stable across runs');
assert.notDeepEqual(Array.from({ length: 8 }, (_, i) => j1(i, 8)), Array.from({ length: 8 }, (_, i) => K.stagger({ each: 0.1, jitter: 0.5, seed: 10 })(i, 8)),
  'a different jitter seed must move the delays');

console.log(`noise self-check: scalar/curl (max |curl| ${worstCurl.toFixed(3)}, worst divergence ${worstDiv.toFixed(4)}), ` +
  `stagger grid centre/start/last/axis/jitter, old form kept`);
