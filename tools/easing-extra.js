// easing-extra.js — opt-in extensions to the engine's easing and timeline helpers; load after engine.js (after transitions.js
// for KIT.cut). Nothing here changes a default: without these calls the engine behaves exactly as before.
//   KIT.easing.svg('M0,0 C…')                     an ease from an SVG path of C/L segments (GSAP CustomEase model): x is
//                                                 progress, y the value; x is binary-searched. x controls must not go backwards.
//   KIT.keys(t, pts, eases, { easeReverse: true | 'outExpo' })
//                                                 on a segment whose value falls: true mirrors that segment's ease
//                                                 (1 − e(1 − s), so a ping-pong repeats the forward pass), a name uses
//                                                 that ease as the reverse. Ascending segments keep their ease.
//   KIT.range(a, b).retime('reverse' | 'mirror' | rate)   a pure t → t' remap: 'reverse' gives a + b − t; 'mirror' is a triangle
//                                                 wave over [a, b] (a → b at the midpoint → a) that repeats every dur, so a loop
//                                                 ping-pongs; a number is a playback rate (0.5 = half speed).
//                                                 Feed the result to KIT.keys / KIT.easing; there is no new sampler.
'use strict';
(function () {
  const K = window.KIT;
  if (!K || typeof K.easing !== 'function' || typeof K.keys !== 'function') throw new Error('easing-extra.js: load tools/engine.js first');

  // ── KIT.easing.svg: a cubic path in, an easing out ──────────────────────────
  const TOK = /[MLC]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
  const cubic = (p0, p1, p2, p3, u) => { const v = 1 - u; return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3; };
  const svg = (d) => {
    const toks = String(d).match(TOK);
    if (!toks) throw new Error('KIT.easing.svg: empty path');
    let i = 0, x = 0, y = 0;
    const num = () => { const v = Number(toks[i++]); if (!Number.isFinite(v)) throw new Error('KIT.easing.svg: bad number in "' + d + '"'); return v; };
    if (toks[i++] !== 'M') throw new Error('KIT.easing.svg: the path must start with M');
    x = num(); y = num();
    const x0 = x, y0 = y, segs = [];
    while (i < toks.length) {
      const c = toks[i++];
      if (c === 'C') {
        const ax = num(), ay = num(), bx = num(), by = num(), ex = num(), ey = num();
        segs.push([x, ax, bx, ex, y, ay, by, ey]); x = ex; y = ey;
      } else if (c === 'L') {
        const ex = num(), ey = num();
        segs.push([x, x + (ex - x) / 3, x + 2 * (ex - x) / 3, ex, y, y + (ey - y) / 3, y + 2 * (ey - y) / 3, ey]); x = ex; y = ey;
      } else throw new Error('KIT.easing.svg: only M, L and C are supported (got ' + c + ')');
    }
    if (!segs.length) throw new Error('KIT.easing.svg: need at least one C or L segment');
    if (!(x > x0)) throw new Error('KIT.easing.svg: the path must move right');
    if (y === y0) throw new Error('KIT.easing.svg: the path must rise');
    for (const [sx, ax, bx, ex] of segs) {
      if (!(sx <= ax && ax <= bx && bx <= ex)) throw new Error('KIT.easing.svg: x must not go backwards (binary search needs a monotonic x)');
    }
    const ys = segs.map((s) => s.slice(4)), dy = y - y0;
    return (p) => {
      p = K.clamp(p);
      if (p === 0) return 0; if (p === 1) return 1;
      const tx = x0 + p * (x - x0);
      let k = 0;
      while (k < segs.length - 1 && tx > segs[k][3]) k++;
      const s = segs[k];
      let lo = 0, hi = 1, u = 0.5;
      for (let n = 0; n < 50; n++) { u = (lo + hi) / 2; if (cubic(s[0], s[1], s[2], s[3], u) < tx) lo = u; else hi = u; }
      const [a, b, c, d] = ys[k];
      return (cubic(a, b, c, d, u) - y0) / dy;
    };
  };
  K.easing.svg = svg;

  // ── KIT.keys: a mirrored ease on descending segments ────────────────────────
  const keys = K.keys;
  K.keys = (t, pts, eases = [], opts = {}) => {
    const rev = opts && opts.easeReverse;
    if (!rev) return keys(t, pts, eases, opts);   // pass opts on: KIT.keys may also carry { output: 'perceptual-scale' }
    if (rev !== true && typeof rev !== 'string') throw new Error("KIT.keys: easeReverse is true or an easing name");
    // replace the ease of each descending segment, then hand off, so the two options compose instead of one swallowing the other
    const eff = pts.slice(0, -1).map((p, i) => {
      const e0 = eases[i] || K.ease, e = typeof e0 === 'string' ? K.easing(e0) : e0;
      if (pts[i + 1][1] >= p[1]) return e;
      return rev === true ? (s) => 1 - e(1 - s) : K.easing(rev);
    });
    return keys(t, pts, eff, opts);
  };

  // ── KIT.range: retime a range before sampling it ───────────────────────────
  K.range = (a, b) => {
    if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('KIT.range: give two times in seconds');
    if (a === b) throw new Error('KIT.range: a and b must differ');
    return {
      a, b, dur: b - a,
      retime(mode = 1) {
        if (mode === 'reverse') return (t) => a + b - t;
        if (mode === 'mirror') {   // triangle over the range: a → b at the midpoint → a, then the next cycle
          const d = b - a;
          return (t) => { const u = ((t - a) / d % 1 + 1) % 1; return a + d * (u <= 0.5 ? 2 * u : 2 * (1 - u)); };
        }
        if (typeof mode === 'number' && Number.isFinite(mode)) return (t) => a + (t - a) * mode;
        throw new Error("KIT.range.retime: 'reverse', 'mirror' or a playback rate");
      },
    };
  };
})();
