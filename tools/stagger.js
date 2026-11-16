// Grid-aware stagger on KIT.stagger: the anime.js v4 model (each, from, grid, axis, jitter, seed), returning
// (i, n) → delay in seconds. KIT.stagger(i, n, total) keeps its old meaning, so existing films are untouched.
// Loaded after engine.js (KIT.staggerStep is the default `each`).
//   KIT.stagger({ each = KIT.staggerStep, from = 'start'|'center'|'edges'|'last', grid = [cols, rows],
//                 axis = 'x'|'y', jitter = 0, seed = 0 }) → (i, n) => delay
//   `from` is the origin of the distance field: the first item, the centre, the nearest edge, or the last item.
//   `axis` measures along one axis only (a column/row order); without it the distance is radial.
//   `jitter` adds a seeded ±jitter·each to every delay; the same seed is the same delays in every render.
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.stagger) throw new Error('stagger.js: load tools/engine.js first');
  const base = K.stagger;   // the linear (i, n, total) form
  const hash = (s) => { let h = 0x811c9dc5; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
  const mulberry32 = (a) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const num = (v, what, lo) => { if (!Number.isFinite(v) || v < lo) throw new Error(`KIT.stagger: ${what} must be a number ≥ ${lo} (got ${v})`); return v; };

  K.stagger = (o, ...rest) => {
    if (typeof o === 'number') return base(o, rest[0], rest[1]);   // the old KIT.stagger(i, n, total)
    const { each = K.staggerStep, from = 'start', grid, axis, jitter = 0, seed = 0 } = o || {};
    num(each, 'each', 0); num(jitter, 'jitter', 0);
    if (!['start', 'center', 'edges', 'last'].includes(from)) throw new Error(`KIT.stagger: from must be start | center | edges | last (got ${from})`);
    if (axis != null && axis !== 'x' && axis !== 'y') throw new Error(`KIT.stagger: axis must be x or y (got ${axis})`);
    let cols = null, rows = null;
    if (grid != null) {
      if (!Array.isArray(grid) || !(grid[0] > 0)) throw new Error('KIT.stagger: grid is [cols, rows]');
      cols = Math.max(1, Math.round(grid[0])); rows = grid[1] ? Math.max(1, Math.round(grid[1])) : null;
    }
    const dims = (n) => { const c = cols ?? Math.max(1, n), r = rows ?? Math.ceil(n / c); return [c, r]; };
    const dist = (i, n) => {
      const [c, r] = dims(n), col = i % c, row = Math.floor(i / c), midC = (c - 1) / 2, midR = (r - 1) / 2;
      if (axis) {   // one axis: the origin's coordinate on that axis, absolute distance
        const p = axis === 'x' ? col : row, mid = axis === 'x' ? midC : midR, end = axis === 'x' ? c - 1 : r - 1;
        return from === 'start' ? p : from === 'last' ? end - p : from === 'center' ? Math.abs(p - mid) : Math.min(p, end - p);
      }
      const d = (x, y) => Math.hypot(x, y);
      if (from === 'start') return d(col, row);
      if (from === 'last') return d(c - 1 - col, r - 1 - row);
      if (from === 'center') return d(col - midC, row - midR);
      return Math.min(col, c - 1 - col, row, r - 1 - row);   // edges: the nearest edge
    };
    const max = new Map();   // per n, the farthest item; computed once, so calling the function per item is cheap
    return (i, n) => {
      if (!(Number.isInteger(i) && Number.isInteger(n) && i >= 0 && i < n)) throw new Error(`KIT.stagger: want 0 ≤ i < n (got ${i}, ${n})`);
      let m = max.get(n);
      if (m == null) { m = 0; for (let k = 0; k < n; k++) m = Math.max(m, dist(k, n)); max.set(n, m); }
      const rank = m ? (dist(i, n) / m) * (n - 1) : 0;
      const j = jitter ? (mulberry32(hash(seed) ^ Math.imul(i + 1, 0x9e3779b9))() * 2 - 1) * jitter * each : 0;
      return Math.max(0, each * rank + j);
    };
  };
})();
