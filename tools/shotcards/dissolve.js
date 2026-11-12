// Shotcards, texture transitions: KIT.shotcards.types.<name> are (p, ctx) transition types for KIT.transition (tools/transitions.js; the
// transition owns the layers' transform, clip-path, mask, filter, opacity, z-index and visibility); KIT.shotcards.transition(name, opts) is
// KIT.transition(types[name], opts). Load after engine.js and transitions.js. HyperFrames: kit/shotcards/dissolve.js; pvk:
// ../../../tools/shotcards/dissolve.js. Pure functions of p and the seed (opts.seed): the textures are clip-path path() shapes built
// synchronously from seeded numbers (no feTurbulence, no image decode), so every renderer and every seek draws the same frame.
//   types.grain          film-grain dissolve: a field of seeded squares, each growing in at its own moment (64 across)
//   types.halftone       halftone-dot dissolve: a dot grid whose dots swell and merge, sweeping in the direction of `dir`
//   types.tornEdge       torn-paper edge wipe: a ragged seeded edge with a white paper-fibre lip on the old scene
//   types.inkBleed       ink bleed: ten wobbling ink blots spread from (x, y) and across the frame and merge
//   types.gradientWipe   feathered gradient-edge wipe (mask), a coloured glow along the edge when opts.color is set;
//                        K.shotcards.gradientWipe({ feather, glow }) for other settings
//   types.tearStreak     a torn edge sweeping through while the old scene is pushed on, with light streaks trailing the tear
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.transition) throw new Error('shotcards/dissolve.js: load engine.js and transitions.js first');
  const C = (K.shotcards = K.shotcards || {}), n4 = (v) => +v.toFixed(4), n1 = (v) => +v.toFixed(1), E = (n) => K.easing(n), W = K.W_, H = K.H_;
  const hash = (s) => { let h = 0x811c9dc5; for (const c of unescape(encodeURIComponent(String(s)))) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0; return h; };
  const rng = (seed) => { let a = hash(seed) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const need = (ok, msg) => { if (!ok) throw new Error(msg); };
  const mask = (e, v) => { e.style.maskImage = v; e.style.webkitMaskImage = v; };
  const clip = (e, d) => { e.style.clipPath = d ? "path('" + d + "')" : 'inset(100%)'; };
  const ANG = { left: 270, right: 90, up: 0, down: 180 };   // as transitions.js: the gradient grows from the side the motion starts at
  const T = {};
  // (a, b) = distance along the motion from the side `to` enters, and across it; pt maps to stage px (same mapping as transitions.js brush)
  const geo = (c) => { const horiz = !c.d[1], A = horiz ? W : H, B = horiz ? H : W;
    return { A, B, pt: ([a, b]) => (c.dir === 'left' ? [W - a, b] : c.dir === 'right' ? [a, b] : c.dir === 'up' ? [b, H - a] : [b, a]) }; };
  const poly = (g, pts) => 'M' + pts.map((q) => g.pt(q).map(n1).join(' ')).join('L') + 'Z';
  // sweep phase 0 (enters first) -> 1 for a pixel at x, y: where the wipe direction reaches it
  const phi = (c, x, y) => (c.d[0] ? (c.d[0] < 0 ? 1 - x / W : x / W) : (c.d[1] < 0 ? 1 - y / H : y / H));

  T.grain = (p, c) => {
    const cell = Math.max(W, H) / 64, nx = Math.ceil(W / cell), ny = Math.ceil(H / cell), r = rng(c.seed + ':grain');
    let d = '';
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const t0 = r() * 0.75, s = K.seg(p, t0, t0 + 0.25);
      if (s <= 0) continue;
      const sz = s >= 1 ? cell + 0.6 : cell * s, x = i * cell + (cell - sz) / 2, y = j * cell + (cell - sz) / 2;
      d += 'M' + n1(x) + ' ' + n1(y) + 'h' + n1(sz) + 'v' + n1(sz) + 'h' + n1(-sz) + 'z';
    }
    clip(c.to, d);
  };

  T.halftone = (p, c) => {
    const cell = Math.max(W, H) / 36, nx = Math.ceil(W / cell), ny = Math.ceil(H / cell);
    let d = '';
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const cx = (i + 0.5) * cell, cy = (j + 0.5) * cell, k = K.clamp(p * 1.5 - 0.5 * phi(c, cx, cy)), r = cell * 0.75 * k;
      if (r < 0.3) continue;
      d += 'M' + n1(cx - r) + ' ' + n1(cy) + 'a' + n1(r) + ' ' + n1(r) + ' 0 1 0 ' + n1(2 * r) + ' 0a' + n1(r) + ' ' + n1(r) + ' 0 1 0 ' + n1(-2 * r) + ' 0z';
    }
    clip(c.to, d);
  };

  // the ragged edge: N+1 points across the motion; |jitter| <= 1.5 m, and the sweep runs from -1.5 m to A + 1.5 m so it starts and ends clean
  const rag = (c, p, N = 56) => {
    const g = geo(c), m = 0.05 * g.A, r = rng(c.seed + ':rag'), ph = r() * 6.28, q = p * (g.A + 3 * m) - 1.5 * m, edge = [], lip = [];
    for (let k = 0; k <= N; k++) {
      const a = Math.max(0, q + (r() - 0.5) * 2 * m + 0.5 * m * Math.sin(k * 0.9 + ph));
      edge.push([a, k * g.B / N]); lip.push([a + (0.4 + 0.6 * r()) * 0.012 * g.A, k * g.B / N]);
    }
    return { g, edge, lip, q };
  };
  T.tornEdge = (p, c) => {
    const { g, edge, lip } = rag(c, p);
    clip(c.to, poly(g, [[0, 0], ...edge, [0, g.B]]));
    c.overlay.style.background = c.color || '#f3eee3'; c.overlay.style.clipPath = "path('" + poly(g, [...edge, ...lip.slice().reverse()]) + "')"; K.show(c.overlay, 1);
  };

  T.inkBleed = (p, c) => {
    const r = rng(c.seed + ':ink'), big = Math.hypot(W, H), blots = [];
    for (let i = 0; i < 10; i++) {
      const b = { x: i ? r() * W : c.x, y: i ? r() * H : c.y, delay: i ? 0.05 + 0.4 * r() : 0, R: big * (i ? 0.35 + 0.4 * r() : 1.15), ph: r() * 6.28, j: [] };
      for (let k = 0; k < 28; k++) b.j.push(r());
      blots.push(b);
    }
    let d = '';
    for (const b of blots) {
      const rad = b.R * E('power2.inOut')(K.seg(p, b.delay, 1));
      if (rad < 1) continue;
      d += 'M' + Array.from({ length: 28 }, (_, k) => { const a = 2 * Math.PI * k / 28, rr = rad * (1 + 0.05 * Math.sin(a * 3 + b.ph) + 0.06 * (b.j[k] - 0.5)); return n1(b.x + rr * Math.cos(a)) + ' ' + n1(b.y + rr * Math.sin(a)); }).join('L') + 'Z';
    }
    clip(c.to, d);
  };

  C.gradientWipe = ({ feather = 0.3, glow = null } = {}) => {
    need(feather > 0, 'gradientWipe: feather must be > 0');
    return (p, c) => {
      const a = (p * (1 + feather) - feather) * 100, b = a + feather * 100, ang = ANG[c.dir], col = glow || c.color;
      mask(c.to, 'linear-gradient(' + ang + 'deg,#000 0,#000 ' + n1(a) + '%,transparent ' + n1(b) + '%)');
      if (col) {
        c.overlay.style.background = 'linear-gradient(' + ang + 'deg,transparent ' + n1(a) + '%,' + col + ' ' + n1((a + b) / 2) + '%,transparent ' + n1(b + feather * 40) + '%)';
        c.overlay.style.mixBlendMode = 'screen'; K.show(c.overlay, n4(Math.sin(Math.PI * p)));
      }
    };
  };
  T.gradientWipe = C.gradientWipe();

  // tear-streak: the torn edge of tornEdge (no lip) with `from` pushed on in the motion direction (6 % of the frame) and tilted 1.2 degrees,
  // and five seeded streaks (white, 2 - 4 px x K.u, 15 - 40 % of the frame long) trailing the tear, screen-blended on the overlay.
  T.tearStreak = (p, c) => {
    const { g, edge, q } = rag(c, p), r = rng(c.seed + ':streak'), rects = [];
    clip(c.to, poly(g, [[0, 0], ...edge, [0, g.B]]));
    for (let i = 0; i < 5; i++) {
      const b = (0.08 + 0.84 * r()) * g.B, len = (0.15 + 0.25 * r()) * g.A, th = (2 + 2 * r()) * K.u, p1 = g.pt([Math.max(0, q - len), b]), p2 = g.pt([q, b + th]);
      const x = Math.min(p1[0], p2[0]), y = Math.min(p1[1], p2[1]), w = Math.abs(p2[0] - p1[0]) || th, h = Math.abs(p2[1] - p1[1]) || th;
      rects.push('linear-gradient(' + ANG[c.dir] + 'deg,transparent,' + (c.color || '#fff') + ') ' + n1(x) + 'px ' + n1(y) + 'px/' + n1(w) + 'px ' + n1(h) + 'px no-repeat');
    }
    c.overlay.style.background = rects.join(','); c.overlay.style.mixBlendMode = 'screen'; K.show(c.overlay, n4(Math.sin(Math.PI * p) ** 0.5));
    c.from.style.transform = 'translate(' + n1(c.d[0] * 0.06 * g.A * p) + 'px,' + n1(c.d[1] * 0.06 * g.A * p) + 'px) rotate(' + n1(1.2 * p) + 'deg)';
  };

  C.types = Object.assign(C.types || {}, T);
  C.transition = C.transition || ((name, opts) => { const t = typeof name === 'function' ? name : C.types[name]; need(t, 'shotcards.transition: unknown type ' + name + ' (' + Object.keys(C.types).join(', ') + ')'); return K.transition(t, opts); });
})();
