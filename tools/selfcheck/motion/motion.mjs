// tools/motion.js: every indication, a typewriter with one mistake, and a KIT.sim of three bouncing balls.
// hfNoise: HyperFrames re-rasters a rotated element differently depending on what it drew before (pvk re-rasters every
// frame and stays byte-identical). Measured 2026-11-09 on macOS at 640x360: 59 px off by > 2/255 at t = 1.64 (same in 3
// runs); 120-165 px with other wiggle angles/sizes while the module was written. Frames inside [at] get this stated limit; all others keep the default 64 px.
export default { scripts: ["tools/doodle.js", "tools/motion.js"], dur: 6,
  hfNoise: { px: 200, at: [0.4, 2.4], why: "rotated element (KIT.indicate.wiggle)" }, film: `
const place = (e, x, y, w, h) => KIT.css(e, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
const sq = (x, y, c, n = 50) => { const e = KIT.el('div', 'box', S); place(e, x, y, n, n); if (c) e.style.background = c; return e; };
const b1 = sq(30, 30), b2 = sq(110, 30, '#e0a030'), b3 = sq(190, 30, '#2f9e6b'), b5 = sq(350, 30), b6 = sq(430, 30, '#e0a030');
const d4 = KIT.el('div', 'dot', S); place(d4, 285, 40, 30, 30);
const d7 = KIT.el('div', 'dot', S); place(d7, 525, 40, 30, 30);
const wave = KIT.el('div', '', S, 'Wave through text'); KIT.css(wave, { left: '30px', top: '110px', fontSize: '26px', whiteSpace: 'nowrap' });
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute('width', 640); svg.setAttribute('height', 360); svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path.setAttribute('d', 'M30 190 C120 130 200 250 330 180'); path.style.cssText = 'fill:none;stroke:#999;stroke-width:4px';
svg.appendChild(path); S.appendChild(svg);
const tw = KIT.el('div', '', S); KIT.css(tw, { left: '30px', top: '230px', fontSize: '26px', whiteSpace: 'nowrap' });
const fx = [
  KIT.indicate.indicate(b1, { at: 0.3 }),
  KIT.indicate.wiggle(b2, { at: 0.4, dur: 2 }),   // 4 samples land inside the rotation (see hfNoise)
  KIT.indicate.blink(b3, { at: 1.3 }),
  KIT.indicate.flash(d4, { at: 1.8 }),
  KIT.indicate.focusOn(b5, { at: 2.3 }),
  KIT.indicate.circumscribe(b6, { at: 2.8 }),
  KIT.indicate.circumscribe(d7, { at: 3.3, shape: 'circle' }),
  KIT.indicate.applyWave(wave, { at: 3.0, dur: 1.5 }),
  KIT.indicate.showPassingFlash(path, { at: 4.0, dur: 1.2 }),
];
const type = KIT.typewriter(tw, 'Hello, world', { at: 0.2, cps: 8, mistakes: [{ index: 7, wrong: 'xyz' }] });
const sim = KIT.sim((s, dt) => {
  const y = [], v = [];
  s.y.forEach((py, i) => {
    let nv = s.v[i] + 900 * dt, ny = py + nv * dt;
    if (ny > 330) { ny = 330; nv = -nv * (0.7 + 0.08 * i); }
    y.push(ny); v.push(nv);
  });
  return { y, v };
}, { y: [100, 140, 180], v: [0, 0, 0] }, { dur: 6 });
const balls = [0, 1, 2].map((i) => { const e = KIT.el('div', 'dot', S); place(e, 400 + i * 70, 0, 30, 30); return e; });
Object.assign(window, { TW: type, TWEL: tw, SIM: sim, TW_AT: 0.2 });
KIT.start({ dur: 6, render: (t) => {
  fx.forEach((f) => f.set(t)); type.set(t);
  const s = sim.at(t); balls.forEach((e, i) => { e.style.top = (s.y[i] - 30) + 'px'; });
} });`,
  check: async (p) => { await p.evaluate(() => {
    const fail = (m) => { throw new Error('motion check: ' + m); };
    const near = (a, b, m) => { if (!(Math.abs(a - b) < 1e-9)) fail(m + ': ' + a + ' != ' + b); };
    const R = KIT.rate;
    // [fn, f(0), f(1)] for each one-argument rate function
    const ends = { linear: [0, 1], smooth: [0, 1], smoothstep: [0, 1], smootherstep: [0, 1], rushInto: [0, 1], rushFrom: [0, 1],
      slowInto: [0, 1], doubleSmooth: [0, 1], thereAndBack: [0, 0], thereAndBackWithPause: [0, 0], runningStart: [0, 1], overshoot: [0, 1],
      wiggle: [0, 0], lingering: [0, 1], exponentialDecay: [0, 1 - Math.exp(-10)] };
    const fns = Object.assign({}, R, { notQuiteThere: R.notQuiteThere(R.smooth, 0.7), squish: R.squish(R.smooth, 0.4, 0.6) });
    for (const k in fns) {
      for (let i = 0; i <= 200; i++) if (!Number.isFinite(fns[k](i / 200))) fail(k + ' not finite at ' + i / 200);
      if (ends[k]) { near(fns[k](0), ends[k][0], k + '(0)'); near(fns[k](1), ends[k][1], k + '(1)'); }
    }
    near(fns.notQuiteThere(1), 0.7, 'notQuiteThere(1)'); near(fns.notQuiteThere(0), 0, 'notQuiteThere(0)');
    near(fns.squish(0.1), 0, 'squish before a'); near(fns.squish(0.9), 1, 'squish after b');
    near(R.thereAndBack(0.5), 1, 'thereAndBack(0.5)'); near(R.thereAndBackWithPause(0.5), 1, 'pause plateau');
    near(R.smooth(0.5), 0.5, 'smooth(0.5)'); near(R.lingering(0.8), 1, 'lingering(0.8)');
    near(R.smoothstep(0.5), KIT.math ? KIT.math.ease.smooth(0.5) : 0.5, 'smoothstep = math smooth');
    let lo = 0, hi = 1;
    for (let i = 0; i <= 200; i++) { lo = Math.min(lo, R.runningStart(i / 200)); hi = Math.max(hi, R.overshoot(i / 200)); }
    if (!(lo < -0.01)) fail('runningStart never dips below 0'); if (!(hi > 1.01)) fail('overshoot never exceeds 1');

    // typewriter: the visible text is a function of t
    const text = 'Hello, world', seen = [];
    for (let t = 0; t <= TW.end + 1; t += 0.01) { TW.set(t); seen.push(TWEL.textContent); }
    if (seen[seen.length - 1] !== text) fail('final text "' + seen[seen.length - 1] + '"');
    TW.set(TW_AT - 0.1); if (TWEL.textContent !== '') fail('text before at');
    const wrongAt = seen.findIndex((s) => s.includes('Hello, xyz'));
    if (wrongAt < 0) fail('mistake never typed');
    if (!seen.slice(wrongAt).some((s) => s === 'Hello, ')) fail('mistake never backspaced');
    if (seen.slice(0, wrongAt).some((s) => s.includes('xyz'))) fail('xyz before the mistake');
    TW.set(TW.end); if (TWEL.textContent !== text) fail('text at end');

    // sim: seekable
    const s0 = SIM.at(0);
    if (JSON.stringify(s0) !== JSON.stringify({ y: [100, 140, 180], v: [0, 0, 0] })) fail('sim.at(0) != state0');
    for (const i of [1, 37, 240, 719, 720]) {
      if (JSON.stringify(SIM.at(i * SIM.dt)) !== JSON.stringify(SIM.samples[i])) fail('sim sample ' + i + ' != at(i*dt)');
    }
    const ts = Array.from({ length: 50 }, (_, i) => i * 0.1237 % 6), want = ts.map((t) => JSON.stringify(SIM.at(t)));
    let s = 5; const order = ts.map((_, i) => i).sort(() => ((s = (s * 16807) % 2147483647) / 2147483647) - 0.5);
    order.forEach((i) => { if (JSON.stringify(SIM.at(ts[i])) !== want[i]) fail('sim.at differs when shuffled at t=' + ts[i]); });
    if (JSON.stringify(SIM.at(-1)) !== JSON.stringify(s0) || JSON.stringify(SIM.at(99)) !== JSON.stringify(SIM.samples[SIM.samples.length - 1])) fail('sim.at not clamped');
  }); } };
