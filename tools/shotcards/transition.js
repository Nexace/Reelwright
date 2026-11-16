// Shotcards, transitions: KIT.shotcards.types.<name> are (p, ctx) transition types for KIT.transition (tools/transitions.js; same rules: the
// layers' transform, clip-path, mask, filter, opacity, z-index and visibility belong to the transition); KIT.shotcards.transition(name, opts)
// is KIT.transition(types[name], opts). Load after engine.js and transitions.js (cardFlock also after motion.js for KIT.sim and, optionally,
// shots.js). HyperFrames: kit/shotcards/transition.js; pvk: ../../../tools/shotcards/transition.js. Pure functions of p and a seed.
//   types.pageTurn            a page hinged on the side opposite `dir` swings over like a book page, with fold shading
//   types.versusSlam          a diagonal seam: `from` and `to` slam together to a versus split (flash, shake), then `to` takes the frame
//   types.invisibleCut        a foreground band (opts.color) sweeps across and covers the frame; the cut happens behind it
//   types.lightLeakBurn       light-leak overlay plus an over-exposure burn on both layers
//   types.letterformZoom      zoom into the glyph at (x, y) until `to` fills it; K.shotcards.letterformZoom({ r }) sets the counter radius
//   cardFlock({ text, t0, t1 })  many cards tumble from a seeded scatter into the glyph boxes of a word, then cross-dissolve to the word
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.transition) throw new Error('shotcards/transition.js: load engine.js and transitions.js first');
  const C = (K.shotcards = K.shotcards || {}), n4 = (v) => +v.toFixed(4), n1 = (v) => +v.toFixed(1), E = (n) => K.easing(n), W = K.W_, H = K.H_;
  const hash = (s) => { let h = 0x811c9dc5; for (const c of unescape(encodeURIComponent(String(s)))) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0; return h; };
  const rng = (seed) => { let a = hash(seed) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const need = (ok, msg) => { if (!ok) throw new Error(msg); };
  const hide = (e) => { e.style.visibility = 'hidden'; e.style.opacity = '0'; };
  const P3 = 2 * Math.max(W, H), T = {};

  // The hinge is the side opposite the motion (dir left -> hinge at the left edge, the page swings over to the left). The hinge is a
  // translate pair inside perspective(), not transform-origin, so nothing is left on the layer after the window. `from` is on top and
  // hides its back face; it darkens as it lifts; a shadow band follows its free edge across `to`.
  const ANG = { left: 90, right: 270, up: 180, down: 0 };
  T.pageTurn = (p, c) => {
    const a = 180 * p, rad = Math.PI * p, hx = -c.d[0] * W / 2, hy = -c.d[1] * H / 2;
    const rot = c.d[0] ? 'rotateY(' + n1(c.d[0] * a) + 'deg)' : 'rotateX(' + n1(-c.d[1] * a) + 'deg)';
    c.from.style.transform = 'perspective(' + P3 + 'px) translate(' + hx + 'px,' + hy + 'px) ' + rot + ' translate(' + -hx + 'px,' + -hy + 'px)';
    c.from.style.backfaceVisibility = 'hidden'; c.from.style.zIndex = 2; c.to.style.zIndex = '';
    c.from.style.filter = 'brightness(' + n4(1 - 0.3 * Math.sin(rad)) + ')';
    const e = Math.max(0, Math.cos(rad)) * 100, s = 0.45 * Math.sin(rad) * (1 - K.seg(a, 90, 150));
    c.overlay.style.background = 'linear-gradient(' + ANG[c.dir] + 'deg,transparent ' + n1(e) + '%,rgba(0,0,0,' + n4(s) + ') ' + n1(e) + '%,transparent ' + n1(e + 30) + '%)';
    K.show(c.overlay, s > 0.003 ? 1 : 0);
  };

  // versus-slam: the seam is a diagonal (skew 0.12 W). Phase 1 (p < .55, power3.in): it travels from beyond the right edge to the middle,
  // `from` slides left behind it and `to` slides in from the right: the two halves slam together. Phase 2 (.55 - .7): a white impact flash
  // and a decaying shake, the versus split holds. Phase 3: the seam runs on to the left and `to` takes the frame. The seam is a 1 px gap.
  T.versusSlam = (p, c) => {
    const k = 0.12 * W, ph1 = K.seg(p, 0, 0.55), ph3 = K.seg(p, 0.7, 1);
    const s = p < 0.55 ? K.lerp(1.15, 0.5, E('power3.in')(ph1)) : p < 0.7 ? 0.5 : K.lerp(0.5, -0.2, E('power3.inOut')(ph3)), sx = s * W;
    const d = Math.max(0, p - 0.55), amp = p > 0.55 ? 14 * K.u * Math.exp(-d / 0.04) : 0, sh = [amp * Math.cos(d * 250), amp * 0.6 * Math.sin(d * 310)];
    const poly = (pts) => 'polygon(' + pts.map((q) => n1(q[0]) + 'px ' + n1(q[1]) + 'px').join(',') + ')';
    c.from.style.clipPath = poly([[0, 0], [sx + k - 1, 0], [sx - k - 1, H], [0, H]]);
    c.to.style.clipPath = poly([[sx + k, 0], [W, 0], [W, H], [sx - k, H]]);
    c.from.style.transform = 'translate(' + n1(-0.06 * W * (1.15 - Math.max(s, 0.5)) / 0.65 + sh[0]) + 'px,' + n1(sh[1]) + 'px)';
    c.to.style.transform = 'translate(' + n1(0.5 * W * Math.max(0, s - 0.5) + sh[0]) + 'px,' + n1(sh[1]) + 'px)';
    c.overlay.style.background = c.color || '#fff'; K.show(c.overlay, p >= 0.55 && p < 0.7 ? n4(0.85 * (1 - K.seg(p, 0.55, 0.64))) : 0);
  };

  // invisible-cut (foreground-as-transition): a band 1.6 x the frame, skewed, sweeps across in `dir`; the frame is fully covered from
  // p ~ .37 to .63 and the cut is at .5, so no frame ever shows the cut. The band is opts.color (default near-black).
  T.invisibleCut = (p, c) => {
    const horiz = !c.d[1], A = horiz ? W : H, B = horiz ? H : W, bw = 1.6 * A, k = 0.15 * B, aR = p * (A + bw), aL = aR - bw;
    const pt = ([a, b]) => (c.dir === 'left' ? [W - a, b] : c.dir === 'right' ? [a, b] : c.dir === 'up' ? [b, H - a] : [b, a]).map(n1).join(' ');
    const pts = [[aL + k, 0], [aR + k, 0], [aR - k, B], [aL - k, B]];
    c.overlay.style.background = c.color || '#0b0b0f'; c.overlay.style.clipPath = 'polygon(' + pts.map((q) => pt(q).replace(' ', 'px ') + 'px').join(',') + ')';
    K.show(c.overlay, 1); hide(p < 0.5 ? c.to : c.from);
  };

  // light-leak-burn: three seeded warm radial gradients (screen blend) travel across, a white core peaks at the cut, and both layers blow
  // out (brightness up to 2.6, saturation 1.6) around it. Triangle in p. Stronger than KIT.transition('lightLeak').
  T.lightLeakBurn = (p, c) => {
    const a = Math.sin(Math.PI * p), r = rng(c.seed + ':burn'), cols = ['255,140,40', '255,70,60', '255,210,120'], bg = [];
    for (let i = 0; i < 3; i++) {
      const R = (0.55 + 0.35 * r()) * Math.max(W, H), u = r(), v = r(), along = (2 * p - 1) * 0.7 + (i - 1) * 0.2;
      const cx = c.d[0] ? W / 2 + c.d[0] * along * W : u * W, cy = c.d[1] ? H / 2 + c.d[1] * along * H : v * H;
      bg.push('radial-gradient(circle ' + n1(R) + 'px at ' + n1(cx) + 'px ' + n1(cy) + 'px,rgba(' + cols[i] + ',1) 0,rgba(' + cols[i] + ',.55) 45%,rgba(' + cols[i] + ',0) 75%)');
    }
    bg.push('linear-gradient(rgba(255,255,255,' + n4(0.9 * a * a) + '),rgba(255,255,255,' + n4(0.9 * a * a) + '))');
    c.overlay.style.background = bg.join(','); c.overlay.style.mixBlendMode = 'screen'; K.show(c.overlay, n4(Math.min(1, 1.3 * a)));
    c.from.style.filter = c.to.style.filter = 'brightness(' + n4(1 + 1.6 * a) + ') saturate(' + n4(1 + 0.6 * a) + ')';
    hide(p < 0.5 ? c.to : c.from);
  };

  // letterform-zoom: the camera dives into the glyph at (x, y): `from` scales about that point exponentially to ~hypot(W, H) / r, and `to`
  // shows through a circle the size of the glyph's counter (radius r at scale 1) that grows with it, `to` itself coming up from 0.6 to 1.
  // The scale is about the point with translate pairs (no transform-origin is left behind).
  C.letterformZoom = ({ r = 0.09 * H } = {}) => (p, c) => {
    const smax = 1.05 * Math.hypot(W, H) / r, s = Math.exp(Math.log(smax) * p), q = 0.6 + 0.4 * p, about = (k) => 'translate(' + n1(c.x - W / 2) + 'px,' + n1(c.y - H / 2) + 'px) scale(' + n4(k) + ') translate(' + n1(W / 2 - c.x) + 'px,' + n1(H / 2 - c.y) + 'px)';
    c.from.style.transform = about(s); c.to.style.transform = about(q);
    c.to.style.clipPath = 'circle(' + n1(r * s / q) + 'px at ' + n1(c.x) + 'px ' + n1(c.y) + 'px)';
  };
  T.letterformZoom = C.letterformZoom();

  C.types = Object.assign(C.types || {}, T);
  C.transition = (name, opts) => { const t = typeof name === 'function' ? name : C.types[name]; need(t, 'shotcards.transition: unknown type ' + name + ' (' + Object.keys(C.types).join(', ') + ')'); return K.transition(t, opts); };

  // card-flock-tumble: `per` (6) coloured cards for each non-space letter of `text` (glyph boxes 0.62 x 0.8 of fontSize, centred on x, y)
  // start at seeded points above the frame and tumble in on springs (KIT.sim: underdamped position and rotation, released over the first
  // 30 % of the window), landing as a block-letter mosaic of the word at t1 (the last 0.25 s blends onto the exact slots). `word` (optional
  // element with the real text) cross-dissolves in over t1 - t1 + .25 while the cards fade. Needs motion.js. The sim runs once, now.
  C.cardFlock = ({ parent = K.stage, text, word = null, x = W / 2, y = H / 2, fontSize = 0.28 * H, per = 6, t0, t1, seed = 1, colors = ['#ff4d4d', '#ffc400', '#2bb673', '#2b6cff', '#a259ff'] } = {}) => {
    need(text && t1 > t0 && K.sim, 'cardFlock: need { text, t0, t1 > t0 } and tools/motion.js (KIT.sim)');
    const rn = rng('flock:' + seed), letters = [...text].filter((ch) => ch.trim()), bw = fontSize * 0.62, bh = fontSize * 0.8, D = t1 - t0;
    const nl = [...text].length, left = x - nl * bw / 2, cols = 2, rows = Math.ceil(per / cols), cw = bw * 0.9 / cols, ch = bh * 0.9 / rows, cards = [];
    [...text].forEach((chr, li) => { if (!chr.trim()) return; for (let j = 0; j < per; j++) cards.push({
      tx: left + li * bw + bw / 2 + ((j % cols) - (cols - 1) / 2) * cw, ty: y + (Math.floor(j / cols) - (rows - 1) / 2) * ch,
      sx: rn() * W, sy: -0.2 * H - rn() * 0.6 * H, r0: (rn() - 0.5) * 720, rel: rn() * 0.3 * D, col: colors[cards.length % colors.length] }); });
    const dt = 1 / 120, k = 90, cd = 2 * 0.55 * Math.sqrt(k), kr = 60, cr = 2 * 0.35 * Math.sqrt(kr);
    const state0 = { c: cards.map((m) => [m.sx, m.sy, 0, 0, m.r0, 0]) };
    const sim = K.sim((s, h, i) => ({ c: s.c.map((q, j) => {
      const m = cards[j]; if (i * h < m.rel) return q;
      const vx = q[2] + (k * (m.tx - q[0]) - cd * q[2]) * h, vy = q[3] + (k * (m.ty - q[1]) - cd * q[3]) * h, vr = q[5] + (-kr * q[4] - cr * q[5]) * h;
      return [q[0] + vx * h, q[1] + vy * h, vx, vy, q[4] + vr * h, vr];
    }) }), state0, { dt, dur: D });
    const els = cards.map((m) => { const e = K.el('div', 'kit-flock-card', parent); K.css(e, { position: 'absolute', left: '0px', top: '0px', width: n1(cw) + 'px', height: n1(ch) + 'px', borderRadius: n1(4 * K.u) + 'px', background: m.col }); return e; });
    const at = (t) => {
      const s = sim.at(t - t0).c, w = K.seg(t - t0, D - 0.25, D), dis = K.seg(t, t1 + 0.1, t1 + 0.3);
      return { op: n4(Math.min(1 - dis, K.seg(t, t0, t0 + 0.05))), word: n4(K.seg(t, t1 - 0.05, t1 + 0.25)), c: s.map((q, j) => ({ x: n1(K.lerp(q[0], cards[j].tx, w)), y: n1(K.lerp(q[1], cards[j].ty, w)), r: n1(q[4] * (1 - w)) })) };
    };
    const set = (t) => {
      const a = at(t);
      els.forEach((e, j) => { e.style.transform = 'translate(' + a.c[j].x + 'px,' + a.c[j].y + 'px) translate(-50%,-50%) rotate(' + a.c[j].r + 'deg)'; K.show(e, a.op); });
      if (word) K.show(word, a.word);
    };
    return { set, at, end: t1, cards: els, letters: letters.length };
  };
})();
