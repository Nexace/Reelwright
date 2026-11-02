// Self-check for the engine's motion math (easings, bezier, spring): node tools/motion-check.mjs
// Loads tools/engine.js in a vm with a minimal DOM stub, then asserts against published values and independent references.
import vm from 'node:vm';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const style = { setProperty() {}, getPropertyValue: () => '' };
const el = () => ({ style, set innerHTML(v) {}, appendChild() {}, setAttribute() {} });
const window = {};
const ctx = vm.createContext({
  window, console, Math,
  document: { getElementById: () => null, documentElement: el(), body: el(), fonts: Object.assign([], { add() {}, ready: Promise.resolve() }),
    styleSheets: [], createElement: el },
  getComputedStyle: () => style,   // every token reads ''
});
vm.runInContext(fs.readFileSync(fileURLToPath(new URL('./engine.js', import.meta.url)), 'utf8'), ctx);
const K = window.KIT;

let bad = 0;
const group = (name, fn) => {
  const fails = [];
  try { fn((ok, msg) => { if (!ok) fails.push(msg); }); } catch (e) { fails.push('threw: ' + e.message); }
  console.log(`${fails.length ? 'FAIL' : 'ok  '} ${name}${fails.length ? '\n  ' + fails.slice(0, 5).join('\n  ') : ''}`);
  if (fails.length) bad++;
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const P = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1], grid = Array.from({ length: 101 }, (_, i) => i / 100);

group('GSAP reference samples (p = 0 .1 .25 .5 .75 .9 1)', (t) => {
  const ref = {
    'power2.out': [0, 0.271, 0.57813, 0.875, 0.98438, 0.999, 1],
    'back.out(1.7)': [0, 0.4087, 0.81719, 1.0875, 1.06406, 1.0143, 1],
    'elastic.out(1,.3)': [0, 1.25, 0.91161, 1.01563, 1.00552, 0.99805, 1],
    'bounce.out': [0, 0.07563, 0.47266, 0.76563, 0.97266, 0.98812, 1],
  };
  for (const [n, v] of Object.entries(ref)) {
    const e = K.easing(n);
    P.forEach((p, i) => t(near(e(p), v[i], 1e-4), `${n}(${p}) = ${e(p)}, want ${v[i]}`));
  }
});

group('every ease: 0 at p=0, 1 at p=1, steps per definition', (t) => {
  for (const f of ['none', 'power1', 'power2', 'power3', 'power4', 'quad', 'cubic', 'quart', 'quint', 'sine', 'circ', 'expo', 'back', 'elastic', 'bounce'])
    for (const d of ['in', 'out', 'inOut']) {
      const e = K.easing(`${f}.${d}`);
      t(near(e(0), 0, 1e-9) && near(e(1), 1, 1e-9), `${f}.${d}: ${e(0)}, ${e(1)}`);
    }
  for (const n of Object.keys(K.E)) t(near(K.E[n](0), 0, 1e-9) && near(K.E[n](1), 1, 1e-9), `E.${n}: ${K.E[n](0)}, ${K.E[n](1)}`);
  const s = K.easing('steps(4)');
  t([0, 0.19, 0.2, 0.39, 0.4, 0.6, 0.8, 1].map(s).join() === '0,0,0.25,0.25,0.5,0.75,1,1', 'steps(4) jumps at k/(n+1)');
});

group('in/out symmetry, inOut halves', (t) => {
  for (const f of ['power2', 'power4', 'sine', 'circ', 'expo', 'back', 'elastic', 'bounce']) {
    const [i, o, io] = ['in', 'out', 'inOut'].map((d) => K.easing(`${f}.${d}`));
    for (const p of grid) {
      t(near(i(p), 1 - o(1 - p), 1e-12), `${f}: in(${p}) != 1 - out(1-${p})`);
      if (f !== 'elastic') t(near(io(p) + io(1 - p), 1, 1e-9), `${f}: inOut not antisymmetric at ${p}`);
    }
  }
  // elastic inOut uses the 0.45 default period, not 0.3
  t(!near(K.easing('elastic.inOut')(0.3), K.easing('elastic.inOut(1,.3)')(0.3), 1e-3), 'elastic.inOut default period');
});

group('out-of-range p is clamped (finite, equals the clamped value)', (t) => {
  const names = ['none', 'steps(4)'];
  for (const f of ['power1', 'power2', 'power3', 'power4', 'quad', 'cubic', 'quart', 'quint', 'sine', 'circ', 'expo', 'back', 'elastic', 'bounce'])
    for (const d of ['in', 'out', 'inOut']) names.push(`${f}.${d}`);
  for (const n of names) {
    const e = K.easing(n);
    for (const p of [-0.5, -0.1, 1.1, 1.5]) { const v = e(p), c = e(p < 0 ? 0 : 1); t(Number.isFinite(v) && v === c, `${n}(${p}) = ${v}, clamped ${c}`); }
  }
  t(K.easing(' outExpo ') === K.E.outExpo && K.easing(' power2.out ')(0.5) === 0.875, 'names are trimmed');
});

group('old KIT.E outputs unchanged', (t) => {
  const old = {
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    out: (p) => 1 - Math.pow(1 - p, 3),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    in: (p) => p * p * p,
    outBack: (p) => { const c = 1.6; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
  };
  for (const [n, f] of Object.entries(old)) for (const p of grid) t(K.E[n](p) === f(p), `E.${n}(${p})`);
  t(K.ease === K.E.out, 'KIT.ease defaults to E.out with no theme token');
  t(K.easing('outExpo') === K.E.outExpo && K.easing('premium') === K.E.premium, 'old keys and named curves resolve to K.E');
});

group('bezier', (t) => {
  const b = K.bezier(0.25, 0.1, 0.25, 1);
  // dense bisection reference (independent of the engine's solver)
  const X = (s) => 3 * (1 - s) ** 2 * s * 0.25 + 3 * (1 - s) * s * s * 0.25 + s ** 3, Y = (s) => 3 * (1 - s) ** 2 * s * 0.1 + 3 * (1 - s) * s * s + s ** 3;
  const ref = (p) => { let lo = 0, hi = 1; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (X(m) < p) lo = m; else hi = m; } return Y((lo + hi) / 2); };
  let prev = -1;
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000, v = b(p);
    t(v >= prev, `not monotone at ${p}`); prev = v;
    t(near(v, ref(p), 1e-6), `bezier(${p}) = ${v}, ref ${ref(p)}`);
  }
  t(K.E.settle(0.5) > 0.5 && Math.max(...grid.map(K.E.settle)) > 1, 'settle overshoots');
});

group('spring vs RK4', (t) => {
  // m x'' + c x' + k (x - 1) = 0 from rest at 0; RK4 with a fine step
  const rk4 = ({ mass, damping, stiffness }, T) => {
    const f = ([x, v]) => [v, (-damping * v - stiffness * (x - 1)) / mass], h = 1e-4, out = [];
    let y = [0, 0];
    for (let i = 0; i <= T / h; i++) {
      if (i % 100 === 0) out.push([i * h, y[0]]);
      const k1 = f(y), k2 = f(y.map((q, j) => q + h / 2 * k1[j])), k3 = f(y.map((q, j) => q + h / 2 * k2[j])), k4 = f(y.map((q, j) => q + h * k3[j]));
      y = y.map((q, j) => q + h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    }
    return out;
  };
  const cases = [['underdamped', { mass: 1, damping: 10, stiffness: 100 }], ['critical', { mass: 1, damping: 20, stiffness: 100 }],
  ];
  for (const [n, o] of cases) {
    const s = K.spring(o);
    for (const [x, y] of rk4(o, 2)) t(near(s(x), y, 1e-3), `${n}: t=${x} got ${s(x)}, want ${y}`);
  }
  // ratio >= 1 uses the critical formula (Remotion parity): damping 200 is the same curve as damping 20, not a true overdamped one
  const crit = K.spring({ damping: 20 }), over = K.spring({ damping: 200 });
  for (const x of [0, 0.1, 0.3, 0.7, 1.5]) t(over(x) === crit(x), `ratio >= 1 is critical: t=${x}`);
  const s = K.spring({ from: 2, to: 5 });
  t(s(0) === 2 && s(-1) === 2 && near(s(10), 5, 1e-3), 'from/to');
  const d = K.springDur({ mass: 1, damping: 10, stiffness: 100 });
  t(d > 0.5 && d < 2 && Math.abs(K.spring()(d) - 1) < 0.005, `springDur default = ${d}`);
  t(K.springDur({ damping: 0, stiffness: 100 }) === 10, 'springDur caps at 10 s');
});

group('keys, stagger, local, easing errors', (t) => {
  const k = [[1, 10], [2, 20], [4, 0]], lin = K.easing('none');
  t(K.keys(0, k) === 10 && K.keys(5, k) === 0 && K.keys(2, k) === 20, 'clamped ends and knots');
  t(K.keys(1.5, k, [lin, lin]) === 15 && K.keys(3, k, [lin, 'none']) === 10, 'per-segment eases (functions or names)');
  t(K.keys(1.5, k) === 10 + 10 * K.ease(0.5), 'default ease is KIT.ease');
  t(K.stagger(0, 4, 3) === 0 && K.stagger(3, 4, 3) === 3 && K.stagger(1, 4, 3) === 1 && K.stagger(0, 1, 3) === 0, 'stagger');
  t(K.local(0, 2, 3) === 0 && K.local(3, 2, 3) === 1 && K.local(9, 2, 3) === 3 && K.local(3, 2, 3, 2) === 2, 'local');
  for (const bad of ['nope', 'power9.out', 'power2', 'back.sideways', 'steps', 'back.out(x)', '', 'constructor.out'])
    { let threw = false; try { K.easing(bad); } catch { threw = true; } t(threw, `easing("${bad}") should throw`); }
  t(K.easing('back.out(1.7)')(0.5) !== K.easing('back.out')(0.5), 'args are applied');
});

group('theme motion tokens fall back to the documented defaults', (t) => {
  t(grid.every((p) => K.easeIn(p) === K.E.in(p)), 'easeIn defaults to in');
  t(K.staggerStep === 0.08 && K.settle === 0.6, `staggerStep ${K.staggerStep}, settle ${K.settle}`);
});

process.exit(bad ? 1 : 0);
