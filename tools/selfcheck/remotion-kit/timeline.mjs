// The five timeline mechanisms: KIT.cut / KIT.progress (tools/transitions.js), KIT.easing.svg / easeReverse / KIT.range
// (tools/easing-extra.js) and KIT.path motion (tools/path.js). check() asserts the pure parts; the shuffled-seek run then
// proves the film is a pure function of t in pvk and HyperFrames.
export default { scripts: ["vendor/paths/paths.js", "tools/path.js", "tools/transitions.js", "tools/easing-extra.js"], dur: 4, film: `
const T = window.T = {};
const A = KIT.el('div', 'scene a', S), B = KIT.el('div', 'scene b', S);
T.cut = KIT.cut(2, { from: A, to: B, dur: 0.5, transition: 'wipe', audio: 'whoosh' });
T.ease = KIT.easing.svg('M0,0 C0.15,0.1 0.35,0.65 0.5,0.75 C0.65,0.85 0.9,0.95 1,1');
T.path = KIT.path('M40 300 C 160 40 480 320 600 60', { autoRotate: true, start: 0.1, end: 0.9 });
T.range = KIT.range(0, 4).retime('mirror');
const dot = T.dot = KIT.el('div', 'dot', S);
const bar = T.bar = KIT.el('div', 'box', S);
KIT.css(bar, { left: '20px', top: '20px' });
const E = KIT.easing('outExpo'), KEYS = [[0, 0.2], [2, 1], [4, 0.2]];
KIT.start({ dur: 4, render: (t) => {
  T.cut.set(t);
  T.path.place(dot, T.ease(KIT.progress(2, 0.5)(t)));
  bar.style.width = 120 * KIT.keys(T.range(t), KEYS, [E, E], { easeReverse: true }) + 'px';
} });`,
  check: async (page) => {
    const bad = await page.evaluate(() => {
      const out = [], ok = (n, c) => { if (!c) out.push(n); }, near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
      const K = window.KIT, T = window.T;
      // 1. cut-centred window: [cut − dur/2, cut + dur/2], film length untouched
      ok('KIT.cut: at is cut − dur/2', near(T.cut.at, 1.75));
      ok('KIT.cut: end is cut + dur/2', near(T.cut.end, 2.25));
      ok('KIT.cut: the film keeps its length', window.FILM.DUR === 4);
      ok('KIT.cut: audio is a cue at the cut', window.FILM.cues.some((c) => c.kind === 'whoosh' && near(c.t, 2, 1e-3)));
      const prog = K.progress(2, 0.5);
      ok('KIT.progress: 0.5 at the cut', near(prog(2), 0.5));
      ok('KIT.progress: clamped to 0 before the window', prog(1.5) === 0 && prog(-3) === 0);
      ok('KIT.progress: clamped to 1 after the window', prog(2.5) === 1 && prog(9) === 1);
      // 2. SVG ease: exact at its control-point joins, clamped outside, monotonic in x
      const e = T.ease;
      ok('KIT.easing.svg: starts at 0', e(0) === 0);
      ok('KIT.easing.svg: ends at 1', e(1) === 1);
      ok('KIT.easing.svg: hits the join point (0.5, 0.75)', near(e(0.5), 0.75));
      ok('KIT.easing.svg: clamps outside', e(-1) === 0 && e(2) === 1);
      let mono = true, last = -Infinity;
      for (let i = 0; i <= 200; i++) { const v = e(i / 200); if (v < last - 1e-9) mono = false; last = v; }
      ok('KIT.easing.svg: monotonic in x', mono);
      let threw = false; try { K.easing.svg('M0,0 C0.6,0 0.2,1 1,1'); } catch { threw = true; }
      ok('KIT.easing.svg: a backwards x throws', threw);
      // 3. easeReverse: a descending segment mirrors the forward pass
      const pts = [[0, 0], [1, 1], [2, 0]], ex = K.easing('outExpo'), es = [ex, ex];
      ok('easeReverse: mirror-identical on a negative segment', near(K.keys(1.5, pts, es, { easeReverse: true }), K.keys(0.5, pts, es), 1e-12));
      ok('easeReverse: off keeps the forward ease', near(K.keys(1.5, pts, es), 1 - ex(0.5), 1e-12));
      ok('easeReverse: a named reverse ease is used', near(K.keys(1.5, pts, es, { easeReverse: 'none' }), 0.5, 1e-12));
      // the two KIT.keys wrappers (easeReverse here, perceptual-scale in tools/timing.js) compose instead of one dropping the other's options
      ok('easeReverse + perceptual-scale: the area interpolation still applies on the way up',
        near(K.keys(0.5, [[0, 0], [1, 1]], [ex], { easeReverse: true, output: 'perceptual-scale' }),
          K.keys(0.5, [[0, 0], [1, 1]], [ex], { output: 'perceptual-scale' }), 1e-12));
      ok('easeReverse + perceptual-scale: a descending segment is still mirrored',
        near(K.keys(1.5, pts, es, { easeReverse: true, output: 'perceptual-scale' }),
          K.keys(0.5, pts, es, { output: 'perceptual-scale' }), 1e-12));
      // 4. path motion: position and tangent at known fractions of known paths
      const line = K.path('M0 0 L300 0', { autoRotate: true });
      ok('KIT.path: len of a 300px line', near(line.len, 300, 0.01));
      ok('KIT.path: at(0.25) is a quarter along', near(line.at(0.25).x, 75, 0.01) && near(line.at(0.25).y, 0, 0.01));
      ok('KIT.path: horizontal tangent is 0', near(line.at(0.5).angle, 0, 0.01));
      ok('KIT.path: vertical tangent is 90', near(K.path('M0 0 L0 100', { autoRotate: true }).at(0.5).angle, 90, 0.01));
      const seg = K.path('M0 0 L100 0', { start: 0.2, end: 0.8 });
      ok('KIT.path: start/end map the fractions', near(seg.at(0).x, 20, 0.01) && near(seg.at(1).x, 80, 0.01));
      ok('KIT.path: autoRotate off is angle 0', K.path('M0 0 L0 100', { autoRotate: false }).at(0.5).angle === 0);
      ok('KIT.path: a number adds to the tangent', near(K.path('M0 0 L0 100', { autoRotate: 45 }).at(0.5).angle, 135, 0.01));
      ok('KIT.path: points + curviness 0 is straight', near(K.path([[0, 0], [100, 0], [100, 100]], { curviness: 0 }).len, 200, 0.01));
      // an opts that asks for no motion keeps the legacy shape ({ d, len, at, slice, box }), as it did before motion existed
      const legacy = K.path('M0 0 L100 0', {}), legacyTrue = K.path('M0 0 L100 0', true), mo = K.path('M0 0 L100 0', { autoRotate: true });
      ok('KIT.path: an empty opts keeps the legacy shape', !('place' in legacy) && near(legacy.len, 100, 0.01) && near(legacy.box.x2, 100, 0.01) && typeof legacy.slice === 'function');
      ok('KIT.path: a non-object second argument keeps the legacy shape', !('place' in legacyTrue) && near(legacyTrue.len, 100, 0.01) && legacyTrue.box.y2 === 0);
      ok('KIT.path: autoRotate asks for the motion object', typeof mo.place === 'function' && typeof mo.at === 'function');
      // 5. range retiming is a pure t remap
      const mir = K.range(2, 5).retime('mirror'), rev = K.range(2, 5).retime('reverse'), half = K.range(2, 5).retime(0.5);
      ok('KIT.range: mirror is a triangle: a at a, b at the midpoint, a at b', near(mir(2), 2) && near(mir(3.5), 5) && near(mir(5), 2));
      ok('KIT.range: mirror halfway up the ramp is halfway along', near(mir(3), 4));
      ok('KIT.range: mirror repeats every dur (a loop ping-pongs)', near(mir(5 + 3), mir(5)) && near(mir(5 + 1.5), 5));
      ok('KIT.range: reverse maps t to a + b − t', near(rev(1), 6));
      ok('KIT.range: 0.5 is half speed', near(half(4), 3));
      return out;
    });
    if (bad.length) throw new Error('timeline check:\n  ' + bad.join('\n  '));
  } };
