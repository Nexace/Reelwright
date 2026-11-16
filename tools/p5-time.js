// p5-time.js: KIT.timeRemap (speed keys) and KIT.world (one canvas, one travelling camera). Load after engine.js and shots.js (world also
// wants p5-camera.js). Closed-form and stateless: the same t gives the same answer in any order.
//
// KIT.timeRemap(keys, { ramp = 0.3 }) → { at(t), speedAt(t), filmOf(src), freezes, dur }
//   keys [{ at, speed, ramp?, keepsMoving? }], `at` in output seconds ascending, the first one at 0 (its speed is the start speed). Between
//   keys the speed changes along a smoothstep over `ramp` seconds that starts AT the key, then holds. at(t) = the source (film) time shown at
//   output time t, the integral of the speed (closed form, no sampling). filmOf(src) is the inverse (monotone: speeds are >= 0): the output
//   time at which source time `src` is on screen, for placing a cue on a remapped take. freezes = the output windows where the speed is
//   under 0.01. Dead-air rule: a speed under 0.01 is refused unless that key says keepsMoving: true (something else on screen keeps moving
//   during the freeze: a camera drift, a particle, a pulse); a held picture with nothing moving reads as a crash.
// KIT.world({ regions: { name: { x, y, w, h, html?, el?, cls? } }, parent }) → { el, region(name), frame(name, { fit = 0.9 }), tour(stops), shoot(t, tour) }
//   Every beat is a box on ONE canvas (world px). frame(name) is the camera state that fits the box in the frame (log2 zoom, so p5-camera
//   keys travel at a steady rate); tour([{ at, region, fit?, ease? }]) is a t → state function through them; shoot(t, tour) applies it to the
//   world element. No slide cuts: the camera flies between regions, and what is between them is on screen while it passes.
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.cam3) throw new Error('p5-time.js: load tools/engine.js and tools/shots.js first');
  const smooth = (u) => u * u * (3 - 2 * u);

  K.timeRemap = (keys, { ramp = 0.3 } = {}) => {
    if (!Array.isArray(keys) || !keys.length) throw new Error('timeRemap: need keys [{ at, speed }]');
    const k = keys.map((x) => ({ at: x.at, speed: x.speed, ramp: x.ramp ?? ramp, keepsMoving: !!x.keepsMoving }));
    if (k[0].at !== 0) throw new Error('timeRemap: the first key must be at 0 (its speed is the start speed)');
    k.forEach((x, i) => {
      if (!Number.isFinite(x.at) || !Number.isFinite(x.speed) || x.speed < 0) throw new Error(`timeRemap: key ${i} needs a finite at and speed >= 0`);
      if (x.speed < 0.01 && !x.keepsMoving)
        throw new Error(`timeRemap: speed ${x.speed} at ${x.at}s is a freeze with nothing moving (dead air); add keepsMoving: true once something else on screen moves, or keep the speed >= 0.01`);
      if (i && !(x.at > k[i - 1].at)) throw new Error('timeRemap: key times must ascend');
    });
    // ∫ a + (b - a)·smoothstep(x / r) dx over [0, d]
    const ramped = (a, b, r, d) => { const u = r > 0 ? Math.min(1, d / r) : 1; return a * d + (b - a) * r * (u * u * u - (u * u * u * u) / 2); };
    const seg = []; let F = 0;   // segments {t0, t1, s0, s1, F0}: the start speed, then per key a ramp and a hold
    const push = (t0, t1, s0, s1) => { seg.push({ t0, t1, s0, s1, F0: F }); if (t1 !== Infinity) F += s0 === s1 ? s0 * (t1 - t0) : ramped(s0, s1, t1 - t0, t1 - t0); };
    push(0, k.length > 1 ? k[1].at : Infinity, k[0].speed, k[0].speed);
    for (let i = 1; i < k.length; i++) {
      const hold0 = k[i].at + k[i].ramp, end = i + 1 < k.length ? k[i + 1].at : Infinity;
      if (hold0 > end + 1e-9) throw new Error(`timeRemap: the ramp into key ${i} (${k[i].ramp}s) runs past key ${i + 1}`);
      if (k[i].ramp > 0) push(k[i].at, hold0, k[i - 1].speed, k[i].speed);
      push(hold0, end, k[i].speed, k[i].speed);
    }
    const pick = (t) => { for (const g of seg) if (t < g.t1) return g; return seg[seg.length - 1]; };
    const at = (t) => {
      if (t <= 0) return t * k[0].speed;
      const g = pick(t), d = t - g.t0;
      return g.F0 + (g.s0 === g.s1 ? g.s0 * d : ramped(g.s0, g.s1, g.t1 - g.t0, d));
    };
    const speedAt = (t) => { const g = pick(Math.max(0, t)); return g.s0 === g.s1 ? g.s0 : K.lerp(g.s0, g.s1, smooth(K.seg(t, g.t0, g.t1))); };
    const filmOf = (src) => {   // bisection on the monotone at(): 60 steps is far below a microsecond
      if (src <= 0) return k[0].speed > 0 ? src / k[0].speed : 0;
      let lo = 0, hi = 1;
      while (at(hi) < src) { hi *= 2; if (hi > 1e6) return Infinity; }
      for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (at(m) < src) lo = m; else hi = m; }
      return (lo + hi) / 2;
    };
    const freezes = seg.filter((g) => g.s0 < 0.01 && g.s1 < 0.01 && g.t1 > g.t0).map((g) => [g.t0, g.t1]);
    return { at, speedAt, filmOf, freezes, keys: k };
  };

  K.world = ({ regions, parent = K.stage } = {}) => {
    const names = Object.keys(regions || {});
    if (!names.length) throw new Error('world: need regions { name: { x, y, w, h } }');
    const el = K.el('div', 'kit-world', parent); K.css(el, { position: 'absolute', left: '0px', top: '0px', width: K.W_ + 'px', height: K.H_ + 'px' });
    const R = {};
    for (const n of names) {
      const r = regions[n];
      if (![r.x, r.y, r.w, r.h].every(Number.isFinite) || !(r.w > 0 && r.h > 0)) throw new Error(`world: region "${n}" needs finite x, y and w, h > 0`);
      const e = r.el || K.el('div', r.cls || '', el, r.html || '');
      if (r.el) el.appendChild(e);
      K.css(e, { position: 'absolute', left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
      R[n] = { ...r, el: e };
    }
    const region = (n) => { if (!R[n]) throw new Error(`world: no region "${n}" (have ${names.join(', ')})`); return R[n]; };
    const frame = (n, { fit = 0.9 } = {}) => { const r = region(n); return K.cam3({ x: r.x + r.w / 2, y: r.y + r.h / 2, z: fit * Math.min(K.W_ / r.w, K.H_ / r.h) }); };
    const tour = (stops) => {
      if (!stops.length) throw new Error('world.tour: need stops [{ at, region }]');
      const key = (s) => Object.assign({ t: s.at, ease: s.ease }, frame(s.region, { fit: s.fit ?? 0.9 }));
      if (K.shot && K.shot.keys) return K.shot.keys(stops.map(key));   // log2 zoom, per-leg ease (p5-camera.js)
      if (K.shot && K.shot.tour) return K.shot.tour(stops.map((s) => ({ t: s.at, state: frame(s.region, { fit: s.fit ?? 0.9 }), ease: s.ease })));
      throw new Error('world.tour: load tools/p5-camera.js (or shots2.js)');
    };
    return { el, regions: R, region, frame, tour, shoot: (t, fn) => K.shoot(el, fn(t)) };
  };
})();
