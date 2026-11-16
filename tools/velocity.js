// State-free velocity helpers (Phase 11, row 2b.3): KIT.velocityAt, KIT.lagged, KIT.dampedSettle. Loaded after engine.js (needs
// nothing else). Every one is a closed-form or fixed-tap function of t, never an accumulator, so seeking to any t gives the same
// answer in any order: they are safe in render(t) in both renderers.
//   KIT.velocityAt(fn, t, h?)            d fn / dt by a central difference, in fn's units per second (h = 1/240 s, like K.speedBlur)
//   KIT.lagged(fn, t, tau, taps?)        what a follower with time constant tau (s) would show: fn averaged over its own past with
//                                        weight e^(-s/tau)/tau, in `taps` equal-weight samples (default 48); trails fn by about tau
//   KIT.dampedSettle(t, t0, opts?)       a damped spring step from `from` to `to` that starts at t0: { from 0, to 1, freq 3 Hz,
//                                        zeta 0.35 }; zeta < 1 overshoots and rings out, 1 is critical, > 1 creeps in
// `fn` is t → number | number[] | { key: number, … } (a KIT.cam3 state works); the result has the same shape.
'use strict';
(function () {
  const K = window.KIT;
  const map = (v, g) => (typeof v === 'number' ? g(v) : Array.isArray(v) ? v.map((x) => g(x)) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, g(x)])));
  const zip = (parts, g) => {   // combine same-shaped values part by part
    const a = parts[0];
    if (typeof a === 'number') return g(parts);
    if (Array.isArray(a)) return a.map((_, i) => g(parts.map((p) => p[i])));
    return Object.fromEntries(Object.keys(a).map((k) => [k, g(parts.map((p) => p[k]))]));
  };
  const finite = (v, what) => { map(v, (x) => { if (!Number.isFinite(x)) throw new Error(`${what}: got ${x}`); return x; }); return v; };

  K.velocityAt = (fn, t, h = 1 / 240) => {
    if (!(h > 0)) throw new Error(`velocityAt: h must be > 0 (got ${h})`);
    return zip([fn(t - h), fn(t + h)], ([a, b]) => (b - a) / (2 * h));
  };

  K.lagged = (fn, t, tau, taps = 48) => {
    if (!(tau > 0)) throw new Error(`lagged: tau must be > 0 (got ${tau})`);
    // taps at the midpoint quantiles of the exponential distribution: equal weights give the e^(-s/tau)/tau average
    const vs = Array.from({ length: taps }, (_, i) => fn(t + tau * Math.log(1 - (i + 0.5) / taps)));
    return zip(vs, (xs) => xs.reduce((a, x) => a + x, 0) / taps);
  };

  K.dampedSettle = (t, t0, { from = 0, to = 1, freq = 3, zeta = 0.35 } = {}) => {
    if (!(freq > 0) || !(zeta > 0)) throw new Error(`dampedSettle: freq and zeta must be > 0 (got ${freq}, ${zeta})`);
    const d = t - t0;
    if (d <= 0) return from;
    const w = 2 * Math.PI * freq;
    let x;
    if (zeta < 1) { const wd = w * Math.sqrt(1 - zeta * zeta), a = zeta * w; x = 1 - Math.exp(-a * d) * (Math.cos(wd * d) + (a / wd) * Math.sin(wd * d)); }
    else if (zeta === 1) x = 1 - Math.exp(-w * d) * (1 + w * d);
    else { const r = w * Math.sqrt(zeta * zeta - 1), a = zeta * w, s1 = -a + r, s2 = -a - r; x = 1 - (s2 * Math.exp(s1 * d) - s1 * Math.exp(s2 * d)) / (s2 - s1); }
    return finite(from + (to - from) * x, 'dampedSettle');
  };
})();
