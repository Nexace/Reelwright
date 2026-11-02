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
    styleSheets: [], createElement: el,
    createElementNS: () => ({ style: {}, attrs: {}, kids: [], setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.kids.push(c); } }) },
  getComputedStyle: () => style,   // every token reads ''
});
vm.runInContext(fs.readFileSync(fileURLToPath(new URL('./engine.js', import.meta.url)), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(fileURLToPath(new URL('./shots.js', import.meta.url)), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(fileURLToPath(new URL('./doodle.js', import.meta.url)), 'utf8'), ctx);
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
  const cases = [['underdamped', { mass: 1, damping: 10, stiffness: 100 }], ['critical', { mass: 1, damping: 20, stiffness: 100 }]];
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
  for (const bad of ['nope', 'power9.out', 'power2', 'back.sideways', 'steps', 'back.out(x)', '', 'constructor.out', 'steps(0)', 'steps(-2)', 'steps(2.5)', 'steps(x)'])
    { let threw = false; try { K.easing(bad); } catch { threw = true; } t(threw, `easing("${bad}") should throw`); }
  t(K.easing('back.out(1.7)')(0.5) !== K.easing('back.out')(0.5), 'args are applied');
});

group('closed-form spot values', (t) => {
  const c = (n, p, want) => t(near(K.easing(n)(p), want, 1e-9), `${n}(${p}) = ${K.easing(n)(p)}, want ${want}`);
  c('power1.out', 0.5, 0.75); c('power1.out', 0.25, 1 - 0.75 ** 2);
  c('power2.out', 0.5, 0.875); c('power3.out', 0.5, 0.9375); c('power4.out', 0.5, 0.96875); c('power4.out', 0.25, 1 - 0.75 ** 5);
  c('sine.out', 0.5, Math.sin(Math.PI / 4)); c('sine.out', 0.25, Math.sin(Math.PI / 8));
  c('circ.out', 0.5, Math.sqrt(0.75)); c('circ.out', 0.25, Math.sqrt(1 - 0.5625));
  c('expo.out', 0.5, 1 - (2 ** -5 * 0.5 + 0.5 ** 6 * 0.5)); c('expo.out', 0.25, 1 - (2 ** -2.5 * 0.75 + 0.75 ** 6 * 0.25));
  c('back.out(1.7)', 0.5, 1.0875); c('power2.in', 0.5, 0.125); c('power2.inOut', 0.25, 0.0625);
  t(Number.isFinite(K.easing('elastic.out(1,0)')(0.5)) && K.easing('elastic.out(1,0)')(0.5) === K.easing('elastic.out(1,.3)')(0.5), 'elastic period 0 = default');
});

group('theme --kit-ease / --kit-ease-in values all parse', (t) => {
  const dir = fileURLToPath(new URL('../themes/', import.meta.url));
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.css')))
    for (const k of ['ease', 'ease-in']) {
      const v = (fs.readFileSync(dir + f, 'utf8').match(new RegExp(`--kit-${k}:\\s*([^;]+);`)) || [])[1];
      if (!v) continue;
      try { const e = K.easing(v.trim()); t(near(e(0), 0, 1e-9) && near(e(1), 1, 1e-9), `${f} ${k}: ${v} endpoints`); }
      catch (e) { t(false, `${f} --kit-${k}: ${v} throws`); }
    }
});

group('theme motion tokens fall back to the documented defaults', (t) => {
  t(grid.every((p) => K.easeIn(p) === K.E.in(p)), 'easeIn defaults to in');
  t(K.staggerStep === 0.08 && K.settle === 0.6, `staggerStep ${K.staggerStep}, settle ${K.settle}`);
});

group('shots: purity, start/end states, camCSS, helpers', (t) => {
  const W = 1920, H = 1080, id = K.cam3(), same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const t0 = 2, t1 = 6, keys = ['z', 'x', 'y', 'rx', 'ry', 'rz', 'persp', 'blur'];
  const mk = {
    pushIn: () => K.shot.pushIn({ t0, t1 }), pullBack: () => K.shot.pullBack({ t0, t1 }), crashZoom: () => K.shot.crashZoom({ at: t0, variant: 'stop' }),
    crashRebound: () => K.shot.crashZoom({ at: t0, variant: 'rebound' }), whipPan: () => K.shot.whipPan({ at: t0 }), whipBrake: () => K.shot.whipPan({ at: t0, variant: 'brake' }),
    dollyZoom: () => { const s = K.shot.dollyZoom({ t0, t1 }); return (x) => s(x).bg; }, orbit: () => K.shot.orbit({ t0, t1 }),
    craneRise: () => K.shot.craneRise({ t0, t1 }), dutchRoll: () => K.shot.dutchRoll({ at: t0 }),
  };
  t(K.shot.names.every((n) => typeof K.shot[n] === 'function') && K.shot.names.length === 8, 'shot.names are all presets');
  const times = Array.from({ length: 400 }, (_, i) => i * 0.025);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const [n, make] of Object.entries(mk)) {
    const a = make(), fwd = times.map((x) => JSON.stringify(a(x)));
    for (let r = 0; r < 50; r++) {   // pure: any evaluation order, any fresh instance, same states
      const b = r % 2 ? a : make(), order = times.map((_, i) => i).sort(() => rnd() - 0.5), got = [];
      for (const i of order) got[i] = JSON.stringify(b(times[i]));
      if (!got.every((g, i) => g === fwd[i])) { t(false, `${n}: state depends on evaluation order`); break; }
    }
    for (const x of times) { const c = K.camCSS(a(x)); if (/NaN|undefined|Infinity/.test(c.transform + c.transformOrigin + c.filter)) { t(false, `${n}: bad camCSS at ${x}`); break; } }
    t(same(a(t0 - 1), a(t0 - 0.5)) || n === 'dutchRoll', `${n}: not still before t0`);
    t(same(a(t1 + 5), a(t1 + 50)) || n === 'dutchRoll', `${n}: not still after the end`);
  }
  // identity before the window (presets that start at the frame) and the documented end states
  for (const n of ['pushIn', 'crashZoom', 'crashRebound', 'whipPan', 'whipBrake', 'dollyZoom']) t(same(mk[n]()(t0 - 1), id), `${n}: identity before t0`);
  t(near(mk.pushIn()(t1).z, 1.14, 1e-9) && mk.pushIn()(t0).z === 1 && mk.pushIn()(4).z < 1.07, 'pushIn 1 → 1.14, accelerating');
  t(near(mk.pullBack()(t0).z, 1.14, 1e-9) && near(mk.pullBack()(t1).z, 1, 1e-9) && mk.pullBack()(4).z < 1.07, 'pullBack 1.14 → 1, decelerating');
  const cz = mk.crashZoom(), dur = 6 / 30;
  t(near(cz(t0 + dur).z, 2.6, 1e-9) && cz(t0 + dur / 2).z < 2.6 && cz(t0 + 1).z === 2.6, 'crashZoom reaches 2.6 in 6 frames');
  t(near(cz(t0 + dur).x - W / 2, 14, 1e-9) && Math.abs(cz(t0 + dur).y - H / 2) <= 14, 'crashZoom shake starts at 14 px');
  t(same(cz(t0 + 1), { ...id, z: 2.6 }) && same(cz(100), cz(t0 + 1)), 'crashZoom z=2.6 and centred after the shake decays');
  t(near(mk.crashRebound()(100).z, 2.45, 1e-9) && mk.crashRebound()(t0 + dur).z === 2.6, 'crashZoom rebound 2.6 → 2.45');
  t(near(mk.whipPan()(100).x, W / 2 + 1.5 * W, 1e-9) && near(mk.whipBrake()(100).x, W / 2 + 1.5 * W, 1e-9), 'whipPan travels 1.5 frame widths');
  t(mk.whipPan()(t0 + 4 / 30).blur > 20 && mk.whipPan()(t0 - 1).blur === 0 && mk.whipPan()(100).blur === 0 && mk.whipPan()(t0 + 0.001).blur < 5, 'whipPan blurs only while it moves fast');
  const wb = mk.whipBrake(); t(near(wb(t0 + 8 / 30).x - W / 2, 0.7 * 1.5 * W, 1e-9), 'whipPan brake: 70 % of the distance in the swing');
  const dz = K.shot.dollyZoom({ t0, t1 })(t1); t(near(dz.bg.z, 2.25, 1e-9) && near(dz.bg.blur, 3.5, 1e-9) && same(dz.hero, id), 'dollyZoom: bg 2.25 + 3.5 px blur, hero pinned');
  t(mk.orbit()(t0).ry === -18 && near(mk.orbit()(t1).ry, 18, 1e-9), 'orbit ±18°');
  t(near(mk.craneRise()(t1).y, H / 2, 1e-9) && mk.craneRise()(t1).rx === 0 && mk.craneRise()(t0).y > H / 2, 'craneRise lifts to level');
  const dr = mk.dutchRoll(); t(Math.abs(dr(0).rz + 10) <= 0.8 + 1e-9 && dr(t0 + 14 / 30).rz > 1.19 && dr(100).rz === 0 && dr(100).y === H / 2 && dr(100).z === 1.08, 'dutchRoll -10° → +1.2° → 0°');
  t(Math.max(...times.map((x) => dr(x).rz)) > 1.19 && Math.max(...times.map((x) => dr(x).rz)) <= 1.2 + 1e-9, 'dutchRoll overshoots to +1.2° and no further');
  // track: latest started shot wins, holds its end state, identity before the first
  const tr = K.shot.track([{ at: 8, shot: K.shot.pushIn({ t0: 8, t1: 9 }) }, { at: 1, shot: K.shot.dutchRoll({ at: 1 }) }]);
  t(same(tr(0), id) && tr(5).rz === 0 && tr(8.5).z > 1 && near(tr(20).z, 1.14, 1e-9), 'track picks by time and holds');
  // camCSS
  const css = K.camCSS({ z: 1.5, x: 1000, y: 400, ry: 20, rz: 3, blur: 4 });
  t(css.transformOrigin === '1000px 400px' && css.transform === 'translate(-40px, 140px) perspective(1200px) rotateY(20deg) rotateX(0deg) rotateZ(3deg) scale(1.5)' && css.filter === 'blur(4px)', 'camCSS strings: ' + css.transform);
  t(K.camCSS().filter === 'none' && !/perspective/.test(K.camCSS().transform), 'identity camCSS');
  let threw = false; try { K.cam3({ z: NaN }); } catch { threw = true; } t(threw, 'cam3 rejects NaN');
  const st = { transform: '' }; K.shoot({ style: st }, { z: 2 }); t(st.transform.endsWith('scale(2)'), 'shoot writes style');
  // helpers
  for (const sd of [0, 1, 'a', 'hero']) {
    let m = 0, ok = true;
    for (let x = 0; x < 30; x += 0.013) { const h = K.handheld(x, 5, sd); ok = ok && Number.isFinite(h.x) && Number.isFinite(h.y); m = Math.max(m, Math.abs(h.x), Math.abs(h.y)); }
    t(ok && m <= 5 + 1e-9 && m > 3, `handheld seed ${sd}: finite, bounded by amp (max ${m})`);
  }
  t(same(K.handheld(1.234, 4, 'x'), K.handheld(1.234, 4, 'x')) && !same(K.handheld(1.234, 4, 'x'), K.handheld(1.234, 4, 'y')), 'handheld seeded');
  t(near(K.handheld(1, 1, 0).x, (Math.sin(9.3) + 0.6 * Math.sin(24.9 + 1.7)) / 1.6, 1e-12), 'handheld seed 0 = source phases');
  t(K.shake(1, 2, 14, 0.06).x === 0 && near(K.shake(2, 2, 14, 0.06).x, 14, 1e-9) && Math.abs(K.shake(2.06, 2, 14, 0.06).x) <= 14 / Math.E + 1e-9 && K.shake(3, 2, 14, 0.06).y === 0, 'shake decays and ends');
  const rm = [[0, 0], [1, 2], [2, 2], [3, 5]];
  t(K.remap(-1, rm) === 0 && K.remap(0, rm) === 0 && K.remap(0.5, rm) === 1 && K.remap(1.5, rm) === 2 && K.remap(3, rm) === 5 && K.remap(9, rm) === 5, 'remap endpoints, ramp, freeze');
  threw = false; try { K.remap(0, [[1, 0], [1, 1]]); } catch { threw = true; } t(threw, 'remap rejects non-ascending');
  const sb = K.speedBlur((x) => K.cam3({ x: 100 * x }), 1, 24);
  t(near(sb, 0.15, 1e-6) && K.speedBlur((x) => K.cam3({ x: 1e6 * x }), 1, 24) === 24 && K.speedBlur(() => K.cam3(), 1) === 0, 'speedBlur: proportional, capped, 0 when still');
});

group('doodle: hash, rng, wobble, boil, path, schedule, drawOn', (t) => {
  const D = K.doodle, same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  // FNV-1a 32-bit published vectors; UTF-8 bytes for non-ASCII
  t(D.hash('') === 0x811c9dc5 && D.hash('a') === 0xe40c292c && D.hash('foobar') === 0xbf9cf968, `fnv1a: ${D.hash('a').toString(16)}`);
  let h8 = 0x811c9dc5; for (const b of [0xc3, 0xa9]) h8 = Math.imul(h8 ^ b, 0x01000193) >>> 0; t(D.hash('é') === h8, 'hash non-ASCII = FNV-1a over UTF-8 bytes');
  // mulberry32 against an independent bit-by-bit reference
  const ref = (seed) => { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
  for (const sd of [0, 1, 42, 0xdeadbeef, 2 ** 40 + 5]) { const a = D.rng(sd), b = ref(sd); for (let i = 0; i < 50; i++) if (a() !== b()) { t(false, `rng seed ${sd} differs at ${i}`); break; } }
  const r0 = D.rng(0); t(near(r0(), 0.26642920868471265, 1e-15) && near(r0(), 0.0003297457005828619, 1e-15), 'rng(0) first values');
  const r1 = D.rng(7); t([...Array(1000)].every(() => { const v = r1(); return v >= 0 && v < 1; }), 'rng in [0,1)');
  // wobble: static per id, bounded by amp, different ids differ
  const pts = [[0, 0], [10, 5], [20, 0], [30, 8]];
  t(same(D.wobble('a', pts, 1), D.wobble('a', pts, 1)) && !same(D.wobble('a', pts, 1), D.wobble('b', pts, 1)), 'wobble seeded by id');
  t(D.wobble('a', pts, 1.5).every(([x, y], i) => Math.abs(x - pts[i][0]) <= 1.5 && Math.abs(y - pts[i][1]) <= 1.5) && same(D.wobble('a', pts, 0), pts), 'wobble bounded by amp');
  // boil: pure in (id, t), changes only when floor(t*hz) changes, hz 0 = still
  const w = D.wobble('s', pts, 1), hz = 8, bo = (x) => JSON.stringify(D.boil('s', w, x, 0.6, hz));
  const ts = Array.from({ length: 200 }, (_, i) => i * 0.0173), fwd = ts.map(bo);
  const order = ts.map((_, i) => i).sort((a, b) => ((a * 7919) % 211) - ((b * 7919) % 211)), got = [];
  for (const i of order) got[i] = bo(ts[i]);
  t(got.every((g, i) => g === fwd[i]), 'boil: same (id, t) → same points in any call order');
  t(ts.every((x, i) => i === 0 || (Math.floor(x * hz + 1e-6) === Math.floor(ts[i - 1] * hz + 1e-6)) === (fwd[i] === fwd[i - 1])), 'boil changes exactly when floor(t*hz) changes');
  t(bo(0.375) !== bo(0.374) && bo(0.375) === bo(0.4999) && bo(0.375 - 1e-12) === bo(0.375), 'boil bucket edge 3/8 s is float-stable');
  t(same(D.boil('s', w, 3, 0.6, 0), w) && D.boil('s', w, 3, 0.6, 0) !== w && same(D.boil('s', w, 3, 0.6), w), 'hz 0 (and the default token) = no boil, copies');
  t(D.boil('s', w, 1, 0.6, 8).every(([x, y], i) => Math.abs(x - w[i][0]) <= 0.6 && Math.abs(y - w[i][1]) <= 0.6) && !same(D.boil('s', w, 1, 0.6, 8), D.boil('s', w, 1, 0.6, 8).map((p) => [p[0] + 1, p[1]])), 'boil bounded by amp');
  // path: starts at p0, ends at pn, one C per segment; straight line stays straight
  const d = D.path(pts); t(d.startsWith('M0 0C') && d.endsWith('30 8') && (d.match(/C/g) || []).length === 3, 'path: ' + d);
  t(D.path([[0, 0], [5, 5], [10, 10]]) === 'M0 0C0.83 0.83 3.33 3.33 5 5C6.67 6.67 9.17 9.17 10 10', 'collinear points → handles on the line');
  t(D.path(pts, true).endsWith('Z') && (D.path(pts, true).match(/C/g) || []).length === 4 && D.path([[1, 1]]) === '', 'closed path / degenerate');
  // sample
  const line = { getTotalLength: () => 100, getPointAtLength: (l) => ({ x: l, y: 0 }) };
  const sm = D.sample(line, 25); t(sm.length === 5 && sm[0][0] === 0 && sm[4][0] === 100 && sm[2][0] === 50, 'sample spacing');
  // schedule: ordered, inside [t0, t1], proportional to length + 9, rests between
  const L = [100, 400, 40], sc = D.schedule(L, 2, 6, 0.1);
  t(sc.length === 3 && sc[0][0] === 2 && sc[2][1] === 6, 'schedule spans [t0, t1] exactly');
  t(sc.every(([s, e], i) => e > s && (i === 0 || near(s - sc[i - 1][1], 0.1, 1e-12))), 'schedule: ordered, 0.1 s rests');
  t(sc.every(([s, e], i) => near((e - s) / (L[i] + 9), (sc[0][1] - sc[0][0]) / 109, 1e-12)), 'schedule: duration ∝ length + 9');
  t(D.schedule([], 0, 1).length === 0 && same(D.schedule([50], 1, 3), [[1, 3]]), 'schedule: none / single');
  let threw = false; try { D.schedule([1, 2, 3], 0, 0.15, 0.1); } catch { threw = true; } t(threw, 'schedule rejects a window too short for the rests');
  // drawOn
  const st = {}, el = { style: st, setAttribute(k, v) { this[k] = v; } };
  D.drawOn(el, 0.25); t(el.pathLength === '1' && st.strokeDasharray === '1 1' && st.strokeDashoffset === '0.75', 'drawOn 0.25');
  D.drawOn(el, 1); t(st.strokeDashoffset === '0' && st.visibility === '', 'drawOn 1 → offset exactly 0, visibility cleared');
  D.drawOn(el, 1 - 1e-17); D.drawOn(el, 1.0000001); t(st.strokeDashoffset === '0', 'drawOn ≥ 1 → exactly 0');
  D.drawOn(el, -3); t(st.strokeDashoffset === '1' && st.visibility === 'hidden', 'drawOn ≤ 0 → offset 1, hidden (no round-cap dot)');
  D.drawOn(el, 0); t(st.visibility === 'hidden', 'drawOn 0 hidden'); D.drawOn(el, 0.001); t(st.visibility === '', 'drawOn > 0 clears visibility (no override of a hidden ancestor)');
});

group('doodle marks: underline/circle timing (in, draw, out)', (t) => {
  const D = K.doodle, host = () => ({ id: '', style: {}, offsetWidth: 200, offsetHeight: 50, kids: [], appendChild(c) { this.kids.push(c); } });
  for (const kind of ['underline', 'circle']) {
    const h = host(), m = D[kind](h, { in: 1, draw: 1, out: 4 }), svg = h.kids[0], path = svg.kids[0];
    const at = (x) => { m.set(x); return { vis: path.style.visibility, off: +path.style.strokeDashoffset, op: +svg.style.opacity }; };
    t([0, 0.5, 0.999, 1].every((x) => at(x).vis === 'hidden'), `${kind}: hidden up to in`);
    t(at(1.001).vis === '' && at(1.001).off < 1, `${kind}: visible once drawing`);
    let prev = 1, rising = true;
    for (let x = 1.05; x <= 2; x += 0.05) { const o = at(x).off; rising = rising && o <= prev && near(o, 1 - K.ease(K.seg(x, 1, 2)), 1e-12); prev = o; }
    t(rising, `${kind}: drawn fraction follows the theme ease over [in, in+draw]`);
    t([2, 2.5, 3, 3.55].every((x) => at(x).off === 0 && at(x).op === 1 && at(x).vis === ''), `${kind}: fully drawn and opaque 2 .. 3.55`);
    const want = 1 - K.easeIn(K.seg(3.8, 4 - K.dur(0.45), 4));
    t(near(at(3.8).op, want, 1e-12) && want > 0 && want < 1, `${kind}: opacity at 3.8 = ${at(3.8).op}, want ${want}`);
    t(at(4).op === 0 && at(9).op === 0, `${kind}: opacity 0 from out`);
    const free = host(), f = D[kind](free, { in: 1, draw: 1 }); f.set(50);
    t(free.kids[0].style.opacity === '1' && free.kids[0].kids[0].style.strokeDashoffset === '0', `${kind}: without out it stays drawn`);
  }
});

process.exit(bad ? 1 : 0);
