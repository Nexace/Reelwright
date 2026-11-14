// fx-reveal.js: weather and reveal effects (Remotion @remotion/effects row 2.3.8), rewritten, no Remotion. Load after engine.js and fx-color.js.
// Every one builds at load and exposes a pure set(...) for render(t): the same arguments give the same picture in any order.
// Reveals take an element and p 0..1 (0 = hidden, 1 = fully shown; at p >= 1 the mask is removed, at p <= 0 the element is hidden):
//   KIT.fx.irisWipe(el, { x = 0.5, y = 0.5 })      → { set(p) }   a circle grows from (x, y) (fractions of the box) until it covers the farthest corner
//   KIT.fx.radialWipe(el, { from = 0 (deg, 0 = up) })→ { set(p) }   a clock-hand sweep around the centre
//   KIT.fx.venetianBlinds(el, { count = 8, vertical = false }) → { set(p) }   `count` slats open from hairlines to the full pitch
//   KIT.fx.pixelDissolve(el, { cell = 24, seed = 1, w, h })  → { set(p) }   square cells switch on one by one in a seeded random order
//   KIT.fx.evolve(el, { cell = 40, seed = 1, soft = 0.25, w, h }) → { set(p) }   a smooth noise field is the threshold: blobs that grow and merge
// Canvas (src = any CanvasImageSource, w × h px; every set() redraws from src):
//   KIT.fx.pixelate(src, { w, h, parent }) → { el, set(block px) }                     block = 1 is the plain picture
//   KIT.fx.pixelate.progressive(src, { w, h, parent, axis = 'y', max = 32, strip = 8 }) → { el, set(p) }   block size 1 at the start edge, p·max at the far edge
// Weather (stateless particle fields: particle i sits at a position that is a pure function of (seed, i, t)):
//   KIT.fx.snowFall(parent, { count = 80, seed = 1, w, h, size = 6, speed = 40 (px/s), drift = 20 (px), color }) → { el, set(t) }
//   KIT.fx.rainFall(parent, { count = 120, seed = 1, w, h, length = 22, speed = 600, angle = 12 (deg), color }) → { el, set(t) }
// shortcut: pixelDissolve and evolve rebuild a small mask canvas per frame and hand it over as a data: URL (mask-image); fine to a few hundred
// cells per side, upgrade to an SVG mask if a film needs more.
'use strict';
(function () {
  const K = window.KIT, X = K && K.fx;
  if (!X || !X.rgb) throw new Error('fx-reveal.js: load tools/engine.js and tools/fx-color.js first');
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const mask = (el, v) => { el.style.maskImage = el.style.webkitMaskImage = v; el.style.maskSize = el.style.webkitMaskSize = '100% 100%'; el.style.clipPath = ''; };
  const gate = (el, p) => { el.style.visibility = p <= 0 ? 'hidden' : ''; return p > 0 && p < 1; };
  const done = (el) => { mask(el, 'none'); el.style.clipPath = 'none'; };

  X.irisWipe = (el, { x = 0.5, y = 0.5 } = {}) => {
    const W = el.offsetWidth || K.W_, H = el.offsetHeight || K.H_;
    const R = Math.max(Math.hypot(W * x, H * y), Math.hypot(W * (1 - x), H * y), Math.hypot(W * x, H * (1 - y)), Math.hypot(W * (1 - x), H * (1 - y)));
    return { set(p) { if (gate(el, p)) el.style.clipPath = `circle(${(R * p).toFixed(2)}px at ${x * 100}% ${y * 100}%)`; else el.style.clipPath = 'none'; } };
  };
  X.radialWipe = (el, { from = 0 } = {}) => ({ set(p) {
    if (gate(el, p)) mask(el, `conic-gradient(from ${from}deg at 50% 50%, #000 ${(p * 360).toFixed(2)}deg, transparent ${(p * 360).toFixed(2)}deg)`); else done(el);
  } });
  X.venetianBlinds = (el, { count = 8, vertical = false } = {}) => {
    const L = (vertical ? el.offsetWidth : el.offsetHeight) || (vertical ? K.W_ : K.H_), s = L / count;
    return { set(p) {
      if (gate(el, p)) { const o = (s * p).toFixed(3); mask(el, `repeating-linear-gradient(${vertical ? 90 : 180}deg, #000 0 ${o}px, transparent ${o}px ${s.toFixed(3)}px)`); } else done(el);
    } };
  };

  // a mask canvas of cols × rows cells, cell (c, r) is on when its threshold < p (soft = width of the fade at the edge, in p)
  const cells = (el, { cell, seed, soft = 0, smooth = false, crisp = false, w, h }) => {
    const W = w ?? (el.offsetWidth || K.W_), H = h ?? (el.offsetHeight || K.H_), cols = Math.ceil(W / cell), rows = Math.ceil(H / cell), r = rng(seed);
    let th = Float32Array.from({ length: cols * rows }, r);
    if (smooth) { for (let k = 0; k < 3; k++) { const n = new Float32Array(th.length); for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { let s = 0, c = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < cols && b < rows) { s += th[b * cols + a]; c++; } } n[j * cols + i] = s / c; } th = n; }
      let lo = Infinity, hi = -Infinity; for (const v of th) { lo = Math.min(lo, v); hi = Math.max(hi, v); } th = th.map((v) => (v - lo) / (hi - lo)); }
    const c = document.createElement('canvas'); c.width = crisp ? cols * cell : cols; c.height = crisp ? rows * cell : rows;
    const g = c.getContext('2d'), im = g.createImageData(cols, rows);
    return { set(p) {
      if (!gate(el, p)) return done(el);
      const q = p * (1 + soft);
      for (let i = 0; i < th.length; i++) { const a = Math.min(1, Math.max(0, (q - th[i]) / Math.max(1e-6, soft || 1e-6))); im.data[i * 4 + 3] = Math.round((soft ? a : q > th[i] ? 1 : 0) * 255); }
      if (crisp) { g.clearRect(0, 0, c.width, c.height); g.fillStyle = '#000'; for (let i = 0; i < th.length; i++) if (im.data[i * 4 + 3] > 127) g.fillRect((i % cols) * cell, Math.floor(i / cols) * cell, cell, cell); } else g.putImageData(im, 0, 0);
      el.style.maskImage = el.style.webkitMaskImage = `url(${c.toDataURL()})`; el.style.maskSize = el.style.webkitMaskSize = '100% 100%';
      el.style.maskRepeat = el.style.webkitMaskRepeat = 'no-repeat'; 
    } };
  };
  // pixelDissolve draws hard square cells at full size; evolve keeps one mask pixel per cell and lets the browser blend them into blobs
  X.pixelDissolve = (el, { cell = 24, seed = 1, w, h } = {}) => cells(el, { cell, seed, crisp: true, w, h });
  X.evolve = (el, { cell = 40, seed = 1, soft = 0.25, w, h } = {}) => cells(el, { cell, seed, soft, smooth: true, w, h });

  const canvas = (parent, w, h) => { const el = K.el('canvas', 'kit-fx', parent); el.width = w; el.height = h; K.css(el, { position: 'absolute', left: '0px', top: '0px', width: w + 'px', height: h + 'px' }); return { el, g: el.getContext('2d') }; };
  const small = document.createElement('canvas');
  const blocky = (g, src, w, h, b, x, y, cw, ch) => {   // draw src pixelated at block b into the rect x, y, cw, ch of g
    small.width = Math.max(1, Math.ceil(w / b)); small.height = Math.max(1, Math.ceil(h / b));
    const s = small.getContext('2d'); s.imageSmoothingEnabled = true; s.imageSmoothingQuality = 'high'; s.clearRect(0, 0, small.width, small.height); s.drawImage(src, 0, 0, small.width, small.height);
    g.save(); g.beginPath(); g.rect(x, y, cw, ch); g.clip(); g.imageSmoothingEnabled = false; g.drawImage(small, 0, 0, small.width * b, small.height * b); g.restore();
  };
  X.pixelate = (src, { w = K.W_, h = K.H_, parent = K.stage } = {}) => {
    const { el, g } = canvas(parent, w, h);
    return { el, set(block) { g.clearRect(0, 0, w, h); if (block <= 1) g.drawImage(src, 0, 0, w, h); else blocky(g, src, w, h, Math.round(block), 0, 0, w, h); } };
  };
  X.pixelate.progressive = (src, { w = K.W_, h = K.H_, parent = K.stage, axis = 'y', max = 32, strip = 8 } = {}) => {
    const { el, g } = canvas(parent, w, h), n = Math.ceil((axis === 'y' ? h : w) / strip);
    return { el, set(p) {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < n; i++) {
        const b = Math.max(1, Math.round(1 + p * (max - 1) * (i + 0.5) / n));
        if (axis === 'y') b > 1 ? blocky(g, src, w, h, b, 0, i * strip, w, strip) : (g.save(), g.beginPath(), g.rect(0, i * strip, w, strip), g.clip(), g.drawImage(src, 0, 0, w, h), g.restore());
        else b > 1 ? blocky(g, src, w, h, b, i * strip, 0, strip, h) : (g.save(), g.beginPath(), g.rect(i * strip, 0, strip, h), g.clip(), g.drawImage(src, 0, 0, w, h), g.restore());
      }
    } };
  };

  const field = (parent, o, build) => {
    const W = o.w ?? K.W_, H = o.h ?? K.H_, root = K.el('div', 'kit-fx', parent), r = rng(o.seed ?? 1);
    K.css(root, { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', overflow: 'hidden', pointerEvents: 'none' });
    const ps = Array.from({ length: o.count }, (_, i) => { const p = { x: r() * W, y: r() * H, k: 0.6 + 0.8 * r(), ph: r() * 6.2832, sz: 0.5 + r() }; p.el = build(root, p, i); return p; });
    return { el: root, W, H, ps };
  };
  X.snowFall = (parent, o = {}) => {
    const q = { count: 80, size: 6, speed: 40, drift: 20, color: '#fff', ...o }, F = field(parent, q, (root, p) => {
      const e = K.el('div', '', root), s = q.size * p.sz; K.css(e, { width: s + 'px', height: s + 'px', borderRadius: '50%', background: q.color, opacity: String(0.5 + 0.5 * p.k / 1.4) }); return e; });
    return { el: F.el, set(t) { for (const p of F.ps) {
      const y = (((p.y + t * q.speed * p.k) % (F.H + 20)) + F.H + 20) % (F.H + 20) - 10, x = p.x + Math.sin(t * p.k + p.ph) * q.drift;
      p.el.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)`; } } };
  };
  X.rainFall = (parent, o = {}) => {
    const q = { count: 120, length: 22, speed: 600, angle: 12, color: 'rgba(200,220,255,0.7)', ...o }, a = q.angle * Math.PI / 180;
    const F = field(parent, q, (root, p) => { const e = K.el('div', '', root); K.css(e, { width: '1.5px', height: q.length * p.sz + 'px', background: q.color, transformOrigin: '0 0' }); return e; });
    return { el: F.el, set(t) { for (const p of F.ps) {
      const d = ((p.y + t * q.speed * p.k) % (F.H + 40)) , y = d - 20, x = ((p.x + d * Math.tan(a)) % F.W + F.W) % F.W;
      p.el.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${(-q.angle).toFixed(1)}deg)`; } } };
  };
})();
