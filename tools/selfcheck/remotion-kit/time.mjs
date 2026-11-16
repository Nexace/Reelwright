// tools/timing.js: interpolate extrapolation modes, colour mixing (rgb / hsl / oklab), random, seq (+ loop, freeze), timings, tseries, noise2/3/4.
// check() asserts the pure parts; the film drives a box, a colour, a seq-looped dot and noise jitter from t for the shuffled-seek run.
export default { scripts: ["tools/timing.js"], dur: 6, film: `
const el = (cls, css) => { const e = KIT.el('div', cls, S); KIT.css(e, css); return e; };
const box = el('box', { top: '40px' }), dot = el('dot', { top: '150px' }), nz = el('dot', { top: '250px' }), bg = el('scene', {}); bg.style.opacity = '0.35';
const loopSeq = KIT.seq({ from: 1, dur: 4, loop: { every: 1 } });
const T = window.T = {};
KIT.start({ dur: 6, render: (t) => {
  box.style.left = KIT.interpolate(t, [0, 3], [0, 400], { right: 'wrap' }) + 'px';
  bg.style.background = KIT.color.interpolate(t, [0, 3, 6], ['#ff0000', '#00ff00', '#0000ff'], { space: 'oklab' });
  const l = loopSeq(t); dot.style.left = l == null ? '-100px' : 20 + l * 500 + 'px';
  nz.style.left = 300 + 200 * KIT.noise2('film', t * 0.7, 0.3) + 'px'; nz.style.top = 250 + 60 * KIT.noise3('film', t * 0.5, 1, 2) + 'px';
  dot.style.opacity = String(0.5 + 0.5 * KIT.noise4('s', t, 0, 1, 2) ** 2);
} });`,
  check: async (p) => {
    const bad = await p.evaluate(() => {
      const K = KIT, bad = [], eq = (what, got, want, e = 1e-9) => { if (!(Math.abs(got - want) <= e)) bad.push(`${what}: got ${got}, want ${want}`); };
      const is = (what, ok, got) => { if (!ok) bad.push(what + ': ' + JSON.stringify(got)); };
      // interpolate
      eq('extend right', K.interpolate(2, [0, 1], [0, 10]), 20); eq('extend left', K.interpolate(-1, [0, 1], [0, 10]), -10);
      eq('clamp', K.interpolate(2, [0, 1], [0, 10], { right: 'clamp' }), 10); eq('clamp left', K.interpolate(-5, [0, 1], [0, 10], { left: 'clamp' }), 0);
      eq('identity', K.interpolate(2.5, [0, 1], [0, 10], { right: 'identity' }), 2.5);
      eq('wrap right', K.interpolate(1.5, [0, 1], [0, 10], { right: 'wrap' }), 5); eq('wrap left', K.interpolate(-0.25, [0, 1], [0, 10], { left: 'wrap' }), 7.5);
      eq('3 keys', K.interpolate(1.5, [0, 1, 2], [0, 10, 0]), 5); eq('3 keys extend uses the LAST segment', K.interpolate(3, [0, 1, 2], [0, 10, 0]), -10);
      eq('easing array', K.interpolate(0.5, [0, 1, 2], [0, 10, 20], { easing: [(x) => x * x, (x) => x] }), 2.5);
      eq('custom easing sees the raw progress outside the range', K.interpolate(2, [0, 1], [0, 10], { easing: (x) => x * x }), 40);
      eq('named easing: inside it eases', K.interpolate(0.5, [0, 1], [0, 1], { easing: 'power2.in' }), 0.125, 1e-6); eq('named easing: outside it is linear', K.interpolate(2, [0, 1], [0, 1], { easing: 'power2.in' }), 2);
      try { K.interpolate(0, [1, 1], [0, 1]); bad.push('equal inputs accepted'); } catch (e) { /* refused */ }
      // colours
      const rgbs = (c) => K.color.parse(c).slice(0, 3).map(Math.round).join();
      is('rgb mid red-blue', rgbs(K.color.mix('#f00', '#00f', 0.5)) === '128,0,128', K.color.mix('#f00', '#00f', 0.5));
      is('hsl mid red-blue goes through magenta', rgbs(K.color.mix('#f00', '#00f', 0.5, { space: 'hsl' })) === '255,0,255', K.color.mix('#f00', '#00f', 0.5, { space: 'hsl' }));
      const ok = K.color.mix('#f00', '#00f', 0.5, { space: 'oklab' }); is('oklab mid differs from rgb mid, brighter', rgbs(ok) !== '128,0,128' && K.color.parse(ok)[0] > 128, ok);
      for (const sp of ['rgb', 'hsl', 'oklab']) is(sp + ' endpoints exact', rgbs(K.color.mix('#f00', '#00f', 0, { space: sp })) === '255,0,0' && rgbs(K.color.mix('#f00', '#00f', 1, { space: sp })) === '0,0,255', sp);
      is('alpha mixes', K.color.parse(K.color.mix('rgba(255,0,0,1)', 'rgba(255,0,0,0)', 0.25))[3] === 0.75, K.color.mix('rgba(255,0,0,1)', 'rgba(255,0,0,0)', 0.25));
      is('interpolateColors 3 stops', rgbs(K.color.interpolate(1.5, [0, 1, 2], ['#f00', '#0f0', '#00f'])) === '0,128,128', K.color.interpolate(1.5, [0, 1, 2], ['#f00', '#0f0', '#00f']));
      is('interpolateColors clamps', rgbs(K.color.interpolate(9, [0, 1], ['#f00', '#00f'], { right: 'clamp' })) === '0,0,255', 0);
      try { K.color.parse('notacolor'); bad.push('bad colour accepted'); } catch (e) { /* refused */ }
      // random
      is('random is deterministic', K.random('x') === K.random('x') && K.random(7) === K.random(7) && K.random('x') !== K.random('y'), 0);
      let sum = 0; for (let i = 0; i < 2000; i++) { const v = K.random('s' + i); if (!(v >= 0 && v < 1)) bad.push('random out of range'); sum += v; }
      is('random spreads about .5', Math.abs(sum / 2000 - 0.5) < 0.03, sum / 2000);
      try { K.random(null); bad.push('random(null) accepted'); } catch (e) { /* refused */ }
      // seq
      const s = K.seq({ from: 2, dur: 4, trim: 1, rate: 2 });
      is('seq: null before, local inside, null from the end', s(1.9) === null && s(2) === 1 && s(3) === 3 && s(5.99) > 8.9 && s(6) === null, [s(1.9), s(2), s(3), s(6)]);
      const lo = K.seq({ from: 0, loop: { every: 1, times: 3 } });
      is('loop: wraps every second and ends after 3 times', Math.abs(lo(0.5) - 0.5) < 1e-9 && Math.abs(lo(1.5) - 0.5) < 1e-9 && lo.info(2.25).iteration === 2 && lo(3) === null && lo.end === 3, [lo(0.5), lo(1.5), lo.info(2.25), lo(3), lo.end]);
      const ls = K.seq({ from: 1, dur: 4, loop: { every: 1 } }); eq('loop inside a finite slot wraps by content time', ls(3.25), 0.25); is('loop: the slot still ends', ls(5) === null, ls(5));
      const fz = K.seq({ from: 1, dur: 2, trim: 0, freeze: 1.25 });
      is('freeze: the local time is held for the whole slot', fz(1) === 1.25 && fz(2.9) === 1.25 && fz(3) === null, [fz(1), fz(2.9), fz(3)]);
      // timing
      const lt = K.timing.linear({ dur: 2 }); eq('linear', lt.at(0.5), 0.5);
      const st = K.timing.spring({ stiffness: 100, damping: 10, mass: 1 });
      is('spring timing: dur from the settle time, 0 at start, 1 at the end', st.dur > 0.3 && st.dur < 10 && st.at(0) === 0 && Math.abs(st.at(1) - 1) < 0.006, [st.dur, st.at(0), st.at(1)]);
      is('spring timing: dur can be stretched', K.timing.spring({ dur: 3 }).dur === 3, 0);
      // tseries
      const ts = K.tseries([{ seq: { dur: 3 } }, { transition: { dur: 0.5 } }, { seq: { dur: 2 } }, { transition: { timing: K.timing.linear({ dur: 0.5 }) } }, { seq: { dur: 2 } }]);
      is('tseries: total = sum - overlaps', Math.abs(ts.total - 6) < 1e-9 && ts.scenes.map((x) => x.start).join() === '0,2.5,4', [ts.total, ts.scenes.map((x) => x.start)]);
      is('tseries: transition progress runs 0..1 over its window; scenes give local time', ts.transitions[0].progress(2.5) === 0 && Math.abs(ts.transitions[0].progress(2.75) - 0.5) < 1e-9 && ts.transitions[0].progress(3) === 1 && ts.scenes[1].seq(3) === 0.5, 0);
      const ov = K.tseries([{ seq: { dur: 2 } }, { overlay: { dur: 0.4 } }, { seq: { dur: 2 } }]);
      is('tseries: an overlay does not shorten, it is centred on the cut', ov.total === 4 && Math.abs(ov.overlays[0].start - 1.8) < 1e-9 && Math.abs(ov.overlays[0].end - 2.2) < 1e-9, ov);
      const off = K.tseries([{ seq: { dur: 2 } }, { seq: { dur: 2, offset: 1 } }]); is('tseries: offset shifts a scene (gap)', off.total === 5, off.total);
      try { K.tseries([{ seq: { dur: 1 } }, { transition: { dur: 2 } }, { seq: { dur: 3 } }]); bad.push('a transition longer than its neighbour was accepted'); } catch (e) { /* refused */ }
      // noise
      for (const [name, f, n] of [['noise2', (i) => K.noise2('a', i * 0.137, i * 0.071), 0], ['noise3', (i) => K.noise3('a', i * 0.137, i * 0.071, i * 0.05), 0], ['noise4', (i) => K.noise4('a', i * 0.137, i * 0.071, i * 0.05, i * 0.03), 0]]) {
        let mn = 9, mx = -9, s1 = 0, s2 = 0, maxStep = 0; const N = 4000;
        for (let i = 0; i < N; i++) { const v = f(i); mn = Math.min(mn, v); mx = Math.max(mx, v); s1 += v; s2 += v * v; maxStep = Math.max(maxStep, Math.abs(f(i + 1e-3) - v)); }
        is(name + ' range within [-1, 1], spreading out, near zero mean', mn >= -1.0001 && mx <= 1.0001 && mx - mn > 1.0 && Math.abs(s1 / N) < 0.1 && Math.sqrt(s2 / N) > 0.15, [mn, mx, s1 / N, Math.sqrt(s2 / N)]);
        is(name + ' is smooth (a 1e-3 step moves it by far less than 0.05)', maxStep < 0.05, maxStep);
      }
      is('noise: same seed same value, any order; other seed another field', K.noise2('a', 1.3, 2.7) === K.noise2('a', 1.3, 2.7) && K.noise2('a', 1.3, 2.7) !== K.noise2('b', 1.3, 2.7) && K.noise2(5, 1.3, 2.7) === K.noise2(5, 1.3, 2.7), 0);
      eq('noise2 is 0 at the origin lattice corner', K.noise2('a', 0, 0), 0); eq('noise3 is 0 at the origin lattice corner', K.noise3('a', 0, 0, 0), 0); eq('noise4 is 0 at the origin lattice corner', K.noise4('a', 0, 0, 0, 0), 0);
      return bad;
    });
    if (bad.length) throw new Error('time check:\n  ' + bad.join('\n  '));
  } };
