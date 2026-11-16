// fx-distort.js: distortion (Remotion @remotion/effects row 2.3.5), rewritten, no Remotion. Load after engine.js and fx-color.js. Pure functions
// of what set() / the call is given; build once at load, call from render(t).
//
// DOM (SVG filter handles from fx-color.js: { url, on(el), set(p) }):
//   KIT.fx.chromaticAberration({ amount = 4 (px), angle = 0 (deg) })      red and blue copies pulled apart along `angle`, green stays
//   KIT.fx.noiseDisplacement({ scale = 20, frequency = 0.02, seed = 0, phase = 0 })   pixels pushed by one octave of fractal noise
//   KIT.fx.turbulentDisplace({ scale = 20, frequency = 0.02, octaves = 3, seed = 0, phase = 0 })   the same with turbulence (several octaves)
//       phase (radians) morphs the noise: the frequency breathes by ±15 % so it can move with t; the same phase gives the same picture
// Transforms (strings / matrices, set el.style.transform):
//   KIT.fx.cornerPin(el, pts, { w, h })   pins the el's box (w × h, default offsetWidth / offsetHeight) to four points [[x, y] × 4] = TL, TR, BR, BL
//                                         in px from the el's layout position: a homography, applied as matrix3d with transform-origin 0 0.
//                                         KIT.fx.cornerPin.matrix(w, h, pts) → the 16 numbers
//   KIT.fx.transform({ x, y, scale, scaleX, scaleY, skewX, skewY, rotate })   → a CSS transform string (translate / scale / skew; deg)
// Canvas remaps (src = any CanvasImageSource, w × h px; set() redraws from src; each output pixel samples src bilinearly, off-source = transparent):
//   KIT.fx.remap(src, fn(x, y, w, h, p) → [sx, sy] | null, { w, h, parent }) → { el, set(p) }   the general one the rest are made of
//   KIT.fx.barrelDistortion(src, o) → { el, set(k) }   k > 0 bulges (source radius = r / (1 + k·r²), r = 0 centre, 1 edge midpoint), k < 0 pinches
//   KIT.fx.fisheye(src, o) → { el, set(a 0..1) }       source radius = tan(r·A) / tan(A), A = 1.4·a; a = 0 is the plain picture
//   KIT.fx.mirror(src, { axis = 'x' | 'y' | 'both', at = 0.5, ... }) → { el, set() }   the far side of `at` mirrors the near side
//   KIT.fx.tile(src, o) → { el, set({ cols = 2, rows = 1, ox = 0, oy = 0 }) }   the picture repeated cols × rows; ox, oy scroll it (px of one tile)
//   KIT.fx.wave(src, o) → { el, set({ amp, length, phase, axis = 'x' }) }       rows (axis 'x') or columns (axis 'y') shift by amp·sin(2π·pos/length + phase)
// skew / scale / translate: KIT.fx.transform. An image from another origin taints the canvas (use a canvas or a data: URL as src).
'use strict';
(function () {
  const K = window.KIT, X = K && K.fx;
  if (!X || !X.svgf) throw new Error('fx-distort.js: load tools/engine.js and tools/fx-color.js first');
  const TAU = Math.PI * 2;
  const live = (build, p0) => { const h = X.svgf(build(p0)); h.set = (p) => { h.f.innerHTML = build(p); return h; }; return h; };

  X.chromaticAberration = (p) => live(({ amount = 4, angle = 0 }) => {
    const a = angle * Math.PI / 180, dx = (Math.cos(a) * amount).toFixed(2), dy = (Math.sin(a) * amount).toFixed(2);
    const ch = (r, g, b, id) => `<feColorMatrix in="SourceGraphic" type="matrix" values="${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0" result="${id}"/>`;
    return ch(1, 0, 0, 'r') + `<feOffset in="r" dx="${dx}" dy="${dy}" result="ro"/>` + ch(0, 1, 0, 'g') + ch(0, 0, 1, 'b') + `<feOffset in="b" dx="${-dx}" dy="${-dy}" result="bo"/>` +
      `<feBlend in="ro" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="bo" mode="screen"/>`;
  }, p);
  const displace = (type, oct) => (p) => live(({ scale = 20, frequency = 0.02, octaves = oct, seed = 0, phase = 0 }) =>
    `<feTurbulence type="${type}" baseFrequency="${(frequency * (1 + 0.15 * Math.sin(phase))).toFixed(5)}" numOctaves="${octaves}" seed="${seed}" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>`, p);
  X.noiseDisplacement = displace('fractalNoise', 1);
  X.turbulentDisplace = displace('turbulence', 3);

  X.transform = ({ x = 0, y = 0, scale, scaleX, scaleY, skewX = 0, skewY = 0, rotate = 0 } = {}) =>
    `translate(${x}px, ${y}px) rotate(${rotate}deg) skew(${skewX}deg, ${skewY}deg) scale(${scaleX ?? scale ?? 1}, ${scaleY ?? scale ?? 1})`;

  // homography from the rect (0,0)-(w,h) to four points: solve the 8 unknowns of [a b c; d e f; g h 1] by Gauss-Jordan
  const matrix = (w, h, pts) => {
    if (!Array.isArray(pts) || pts.length !== 4) throw new Error('cornerPin: pts is four [x, y] points, TL TR BR BL');
    const src = [[0, 0], [w, 0], [w, h], [0, h]], A = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = pts[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]);
    }
    for (let c = 0; c < 8; c++) {
      let m = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r;
      if (Math.abs(A[m][c]) < 1e-12) throw new Error('cornerPin: the four points are degenerate (three on a line?)');
      [A[c], A[m]] = [A[m], A[c]];
      for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k]; }
    }
    const [a, b, c, d, e, f, g, hh] = A.map((r, i) => r[8] / r[i]);
    return [a, d, 0, g, b, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1];
  };
  X.cornerPin = (el, pts, { w = el.offsetWidth, h = el.offsetHeight } = {}) => {
    el.style.transformOrigin = '0 0'; el.style.transform = `matrix3d(${matrix(w, h, pts).join(',')})`;
  };
  X.cornerPin.matrix = matrix;

  // ── canvas remaps ─────────────────────────────────────────────────────────
  X.remap = (src, fn, { w = K.W_, h = K.H_, parent = K.stage } = {}) => {
    const el = K.el('canvas', '', parent); el.width = w; el.height = h;
    K.css(el, { position: 'absolute', left: '0px', top: '0px', width: w + 'px', height: h + 'px' });
    const g = el.getContext('2d', { willReadFrequently: true }), tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
    const tg = tmp.getContext('2d', { willReadFrequently: true });
    return { el, set(p) {
      tg.clearRect(0, 0, w, h); tg.drawImage(src, 0, 0, w, h);
      const s = tg.getImageData(0, 0, w, h).data, out = g.createImageData(w, h), o = out.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const m = fn(x + 0.5, y + 0.5, w, h, p);
        if (!m) continue;
        const fx = m[0] - 0.5, fy = m[1] - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
        if (x0 < -1 || y0 < -1 || x0 > w - 1 || y0 > h - 1) continue;
        const i = (y * w + x) * 4, at = (xx, yy, c) => s[(Math.min(h - 1, Math.max(0, yy)) * w + Math.min(w - 1, Math.max(0, xx))) * 4 + c];
        for (let c = 0; c < 4; c++) o[i + c] = (at(x0, y0, c) * (1 - tx) + at(x0 + 1, y0, c) * tx) * (1 - ty) + (at(x0, y0 + 1, c) * (1 - tx) + at(x0 + 1, y0 + 1, c) * tx) * ty;
      }
      g.putImageData(out, 0, 0);
    } };
  };
  const polar = (f) => (x, y, w, h, p) => {   // f(r) → source radius factor; r = 0 at the centre, 1 at the edge midpoint (of the wider side)
    const cx = w / 2, cy = h / 2, R = Math.max(cx, cy), dx = (x - cx) / R, dy = (y - cy) / R, r = Math.hypot(dx, dy);
    const k = r < 1e-9 ? 1 : f(r, p) / r;
    return [cx + dx * k * R, cy + dy * k * R];
  };
  X.barrelDistortion = (src, o) => X.remap(src, polar((r, k) => r / (1 + k * r * r)), o);
  X.fisheye = (src, o) => X.remap(src, polar((r, a) => { const A = 1.4 * a; return A < 1e-6 ? r : Math.tan(r * A) / Math.tan(A); }), o);
  X.mirror = (src, { axis = 'x', at = 0.5, ...o } = {}) => X.remap(src, (x, y, w, h) => {
    const mx = axis === 'x' || axis === 'both', my = axis === 'y' || axis === 'both', cx = at * w, cy = at * h;
    return [mx && x > cx ? 2 * cx - x : x, my && y > cy ? 2 * cy - y : y];
  }, o);
  X.tile = (src, o) => X.remap(src, (x, y, w, h, { cols = 2, rows = 1, ox = 0, oy = 0 } = {}) => [(((x * cols + ox) % w) + w) % w, (((y * rows + oy) % h) + h) % h], o);
  X.wave = (src, o) => X.remap(src, (x, y, w, h, { amp = 8, length = 50, phase = 0, axis = 'x' } = {}) =>
    (axis === 'x' ? [x + amp * Math.sin(TAU * y / length + phase), y] : [x, y + amp * Math.sin(TAU * x / length + phase)]), o);
})();
