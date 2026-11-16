// tools/velocity.js: velocityAt / lagged / dampedSettle driving boxes over 6 s; check() asserts the numbers (a ramp's velocity, the
// lag of an exponential follower, a spring's overshoot / critical / overdamped shapes, shape-preserving) and that calls are order-free.
export default { scripts: ["tools/velocity.js"], dur: 6, film: `
const K = KIT, box = (cls, css) => { const e = K.el('div', cls, S); K.css(e, css); return e; };
const target = (t) => 40 + 520 * K.ease(K.seg(t, 1, 2.5));
const A = box('box a', { left: '0px', top: '20px' }), B = box('box b', { left: '0px', top: '120px' }), C = box('box c', { left: '0px', top: '220px' }),
  V = box('dot', { left: '0px', top: '320px' });
window.T = { target };
K.start({ dur: 6, render: (t) => {
  A.style.transform = 'translateX(' + target(t).toFixed(3) + 'px)';
  B.style.transform = 'translateX(' + K.lagged(target, t, 0.35).toFixed(3) + 'px)';
  C.style.transform = 'translateX(' + (40 + K.dampedSettle(t, 3, { from: 0, to: 520, freq: 2.5, zeta: 0.3 })).toFixed(3) + 'px)';
  V.style.transform = 'translateX(' + (40 + Math.min(560, Math.abs(K.velocityAt(target, t)) / 4)).toFixed(3) + 'px)';
} });`,
  check: async (p) => {
    const errs = await p.evaluate(() => {
      const K = KIT, bad = [], near = (a, b, e, what) => { if (!(Math.abs(a - b) <= e)) bad.push(`${what}: ${a} vs ${b}`); };
      near(K.velocityAt((t) => 3 * t + 1, 2.2), 3, 1e-6, 'velocityAt of a ramp');
      near(K.velocityAt((t) => t * t, 1.5), 3, 1e-6, 'velocityAt of t^2');
      const v = K.velocityAt((t) => ({ x: 2 * t, y: -t, z: 5 }), 1);
      near(v.x, 2, 1e-6, 'velocityAt.x'); near(v.y, -1, 1e-6, 'velocityAt.y'); near(v.z, 0, 1e-6, 'velocityAt.z (constant)');
      const va = K.velocityAt((t) => [t, 4 * t], 0.3); near(va[0], 1, 1e-6, 'velocityAt [0]'); near(va[1], 4, 1e-6, 'velocityAt [1]');
      // an exponential follower of a ramp trails it by tau; of a constant it is that constant
      near(K.lagged((t) => 3 * t, 5, 0.4), 3 * (5 - 0.4), 0.02, 'lagged ramp trails by tau');
      near(K.lagged(() => 7, 3, 0.2), 7, 1e-9, 'lagged constant');
      const lc = K.lagged((t) => ({ z: 1 + t, rz: 2 * t }), 2, 0.5); near(lc.z, 1 + 2 - 0.5, 0.02, 'lagged object z'); near(lc.rz, 2 * (2 - 0.5), 0.02, 'lagged object rz');
      // a step seen through the follower: 1 - e^(-s/tau) after s seconds (taps sample the kernel, so a few % of slack)
      near(K.lagged((t) => (t >= 0 ? 1 : 0), 0.5, 0.5), 1 - Math.exp(-1), 0.03, 'lagged step response');
      near(K.dampedSettle(0.9, 1), 0, 0, 'dampedSettle holds `from` before t0'); near(K.dampedSettle(1, 1, { from: 4, to: 9 }), 4, 0, 'dampedSettle starts at from');
      near(K.dampedSettle(9, 1, { from: 4, to: 9 }), 9, 1e-3, 'dampedSettle ends at to');
      let over = 0; for (let t = 1; t < 3; t += 0.005) over = Math.max(over, K.dampedSettle(t, 1, { zeta: 0.3 }));
      if (!(over > 1.2 && over < 1.5)) bad.push(`zeta 0.3 overshoot ${over} not in (1.2, 1.5)`);   // theory: 1 + e^(-pi z / sqrt(1 - z^2)) = 1.37
      for (const z of [1, 2.5]) { let prev = 0; for (let t = 1; t < 4; t += 0.01) { const x = K.dampedSettle(t, 1, { zeta: z }); if (x < prev - 1e-9 || x > 1 + 1e-9) { bad.push(`zeta ${z} not monotone into 1 at t = ${t}`); break; } prev = x; } }
      let s = 0; for (const t of [3.3, 1.1, 2.2, 3.3, 1.1]) s += K.lagged((x) => Math.sin(x), t, 0.3);   // same inputs, any order, same outputs
      near(K.lagged(Math.sin, 3.3, 0.3) * 2 + K.lagged(Math.sin, 1.1, 0.3) * 2 + K.lagged(Math.sin, 2.2, 0.3), s, 1e-12, 'lagged is order-free');
      for (const f of [() => K.velocityAt(Math.sin, 1, 0), () => K.lagged(Math.sin, 1, 0), () => K.dampedSettle(1, 0, { freq: 0 })])
        try { f(); bad.push('a bad argument did not throw'); } catch {}
      return bad;
    });
    if (errs.length) throw new Error("velocity check:\n  " + errs.join("\n  "));
  } };
