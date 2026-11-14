// fx-color.js: colour, tone and lighting effects (Remotion @remotion/effects rows 2.3.2 and 2.3.4, rewritten, no Remotion). Load after engine.js;
// the other fx-*.js files load after this one. Renderer-neutral (CSS filter, SVG filter, canvas), pure functions of their arguments: call
// h.set(p) / set(t) from render(t), never keep state between frames.
//
// KIT.fx.filter({ brightness, contrast, saturate|saturation, hue (deg), grayscale, sepia, invert, blur (px), dropShadow:{x,y,blur,color},
//                 glow:{radius,color,strength} }) → a CSS `filter` string ('none' for {}). Hue-rotate, invert, dropShadow and glow live here.
// KIT.fx.on(el, ...parts)       el.style.filter = the parts (strings from filter() or handles from below) joined
// SVG-filter handles { url, id, f, on(el), set(p) }; set(p) is a pure re-description (the same p gives the same filter):
//   KIT.fx.tint({ color, amount = 1 })                      luminance recoloured toward `color`
//   KIT.fx.duotone({ dark, light, amount = 1 })             luminance mapped between two colours
//   KIT.fx.exposure({ stops })                              gain 2^stops in LINEAR light (true exposure)
//   KIT.fx.whiteBalance({ temperature = 0, tint = 0 })      -1 cool..1 warm, -1 green..1 magenta
//   KIT.fx.shadowsHighlights({ shadows = 0, highlights = 0 })  -1..1: lift (+) or crush (-) the darks / pull (+) or push (-) the brights
//   KIT.fx.levels({ inBlack, inWhite, gamma, outBlack, outWhite })  0..1, gamma > 0 (1 = none)
//   KIT.fx.curves(points | { rgb, r, g, b }, { channel = 'rgb', smooth = true })   2 to 32 points [[x, y], …] in 0..1, x ascending;
//        smooth = monotone cubic (Fritsch-Carlson), else linear; KIT.fx.curve(points, smooth) → f(x) is the same curve as a function
//   KIT.fx.longShadow({ length, angle = 45 (deg, 0 = right, clockwise), color })   a solid shadow dragged `length` px
// Canvas (the source is any CanvasImageSource: canvas, <img>, <video>; an image from another origin taints the canvas, use a canvas or data: URL):
//   KIT.fx.pixels(src, fn(d, i, p), { w, h, parent }) → { el, set(p) }   per-pixel map on a copy of src
//   KIT.fx.colorKey(src, { key = '#00ff00', similarity = 0.4, smoothness = 0.1 }) → { el, set(p?) }   key colour becomes transparent
//   KIT.fx.vibrance(src, { amount }) → { el, set(a) }   saturation boost that spares already saturated pixels (a in -1..1)
// Overlays (build once at load, set(…) per frame): KIT.fx.vignette(parent, { color, strength, size }) → { el, set(amount 0..1) };
//   KIT.fx.shine(parent, { angle, width, color, opacity }) → { el, set(progress 0..1) } a light sweep across `parent`.
// shortcut: no 3D .cube LUT here, a DOM node has no per-pixel LUT without canvas; KIT.grade (hyperframes) already carries .cube for <img>/<video>.
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('fx-color.js: load tools/engine.js first');
  const X = (K.fx = K.fx || {}), NS = 'http://www.w3.org/2000/svg', LUM = [0.2126, 0.7152, 0.0722];
  let n = 0;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  X.rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const cx = document.createElement('canvas').getContext('2d');
  X.rgb = (c) => {   // any CSS colour or [r, g, b] → [r, g, b] 0..255
    if (Array.isArray(c)) return c;
    cx.fillStyle = '#000'; cx.fillStyle = c;
    const v = cx.fillStyle;
    return v[0] === '#' ? [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)) : v.match(/[\d.]+/g).slice(0, 3).map(Number);
  };
  // a hidden <svg><filter> in the page; `linear` computes in linearRGB (the SVG default) instead of sRGB
  X.svgf = (inner, linear = false, region = 'x="-20%" y="-20%" width="140%" height="140%"') => {
    const id = 'kfx' + n++, s = document.createElementNS(NS, 'svg');
    s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.setAttribute('style', 'position:absolute;left:0;top:0');
    s.innerHTML = `<filter id="${id}" ${region} color-interpolation-filters="${linear ? 'linearRGB' : 'sRGB'}">${inner}</filter>`;
    document.body.appendChild(s);
    const h = { id, url: `url(#${id})`, f: s.firstChild, on(el) { el.style.filter = h.url; return h; } };
    return h;
  };
  const live = (build, p0, linear, region) => { const h = X.svgf(build(p0), linear, region); h.set = (p) => { h.f.innerHTML = build(p); return h; }; return h; };
  X.filter = (s = {}) => {
    const p = [], add = (k, f, u = '') => { if (s[k] != null) p.push(`${f}(${s[k]}${u})`); };
    add('brightness', 'brightness'); add('contrast', 'contrast'); if (s.saturate != null || s.saturation != null) p.push(`saturate(${s.saturate ?? s.saturation})`);
    add('hue', 'hue-rotate', 'deg'); add('grayscale', 'grayscale'); add('sepia', 'sepia'); add('invert', 'invert'); add('blur', 'blur', 'px');
    if (s.dropShadow) { const d = s.dropShadow; p.push(`drop-shadow(${d.x ?? 0}px ${d.y ?? 4}px ${d.blur ?? 8}px ${d.color || 'rgba(0,0,0,0.5)'})`); }
    if (s.glow) for (let i = 0; i < (s.glow.strength ?? 2); i++) p.push(`drop-shadow(0 0 ${s.glow.radius ?? 12}px ${s.glow.color || '#fff'})`);
    return p.join(' ') || 'none';
  };
  X.on = (el, ...parts) => { el.style.filter = parts.map((q) => q.url || q).join(' '); };

  const mat = (rows) => `<feColorMatrix type="matrix" values="${rows.flat().map((v) => +v.toFixed(5)).join(' ')}"/>`;
  const eye = (c) => [0, 1, 2].map((i) => (i === c ? 1 : 0));
  const row = (c, a, w, off) => [...[0, 1, 2].map((i) => (1 - a) * (i === c ? 1 : 0) + a * w[i]), 0, a * off];   // (1-a)·identity + a·(w·rgb + off)
  const alpha = [0, 0, 0, 1, 0];
  X.tint = (p) => live(({ color, amount = 1 }) => { const c = X.rgb(color); return mat([0, 1, 2].map((k) => row(k, amount, LUM.map((l) => l * c[k] / 255), 0)).concat([alpha])); }, p);
  X.duotone = (p) => live(({ dark, light, amount = 1 }) => {
    const d = X.rgb(dark), l = X.rgb(light);
    return mat([0, 1, 2].map((k) => row(k, amount, LUM.map((w) => w * (l[k] - d[k]) / 255), d[k] / 255)).concat([alpha]));
  }, p);
  X.exposure = (p) => live(({ stops }) => { const s = 2 ** stops; return `<feComponentTransfer>${'RGB'.split('').map((c) => `<feFunc${c} type="linear" slope="${s}"/>`).join('')}</feComponentTransfer>`; }, p, true);
  X.whiteBalance = (p) => live(({ temperature = 0, tint = 0 }) => mat([[1 + 0.3 * temperature, 0, 0, 0, 0], [0, 1 - 0.2 * tint, 0, 0, 0], [0, 0, 1 - 0.3 * temperature, 0, 0], alpha]), p);

  const table = (fns) => `<feComponentTransfer>${['R', 'G', 'B'].map((c, i) => `<feFunc${c} type="table" tableValues="${Array.from({ length: 256 }, (_, k) => clamp01(fns[i](k / 255)).toFixed(4)).join(' ')}"/>`).join('')}</feComponentTransfer>`;
  const same = (f) => table([f, f, f]);
  X.shadowsHighlights = (p) => live(({ shadows = 0, highlights = 0 }) => same((x) => x + 1.5 * shadows * x * (1 - x) ** 2 - 1.5 * highlights * x * x * (1 - x)), p);
  X.levels = (p) => live(({ inBlack = 0, inWhite = 1, gamma = 1, outBlack = 0, outWhite = 1 }) => {
    if (!(gamma > 0) || !(inWhite > inBlack)) throw new Error('levels: gamma > 0 and inWhite > inBlack');
    return same((x) => outBlack + (outWhite - outBlack) * clamp01((x - inBlack) / (inWhite - inBlack)) ** (1 / gamma));
  }, p);
  X.curve = (pts, smooth = true) => {
    if (!Array.isArray(pts) || pts.length < 2 || pts.length > 32) throw new Error('curves: 2 to 32 points [[x, y], …]');
    const P = pts.map(([x, y]) => [+x, +y]), N = P.length, d = [], m = [];
    for (let i = 1; i < N; i++) if (!(P[i][0] > P[i - 1][0])) throw new Error('curves: x must ascend');
    for (let i = 0; i < N - 1; i++) d[i] = (P[i + 1][1] - P[i][1]) / (P[i + 1][0] - P[i][0]);
    m[0] = d[0]; m[N - 1] = d[N - 2];
    for (let i = 1; i < N - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < N - 1; i++) {   // Fritsch-Carlson: no overshoot between points
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
    }
    return (x) => {
      if (x <= P[0][0]) return P[0][1];
      if (x >= P[N - 1][0]) return P[N - 1][1];
      let i = 0; while (x > P[i + 1][0]) i++;
      const h = P[i + 1][0] - P[i][0], u = (x - P[i][0]) / h, u2 = u * u, u3 = u2 * u;
      if (!smooth) return P[i][1] + u * (P[i + 1][1] - P[i][1]);
      return (2 * u3 - 3 * u2 + 1) * P[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * P[i + 1][1] + (u3 - u2) * h * m[i + 1];
    };
  };
  X.curves = (pts, { channel = 'rgb', smooth = true } = {}) => {
    const spec = (q) => ({ spec: Array.isArray(q) ? { [channel]: q } : q, smooth });
    const h = live(({ spec: sp, smooth: sm }) => {
      const f = (k) => (sp[k] ? X.curve(sp[k], sm) : (x) => x), M = f('rgb');
      return table(['r', 'g', 'b'].map((k) => { const c = f(k); return (x) => c(M(x)); }));
    }, spec(pts));
    const raw = h.set; h.set = (q) => raw(spec(q));
    return h;
  };

  X.longShadow = (p) => live(({ length, angle = 45, color = '#000' }) => {
    const steps = Math.max(1, Math.min(64, Math.ceil(length / 2))), a = angle * Math.PI / 180;
    let s = '';
    for (let i = 1; i <= steps; i++) s += `<feOffset in="SourceAlpha" dx="${(Math.cos(a) * length * i / steps).toFixed(2)}" dy="${(Math.sin(a) * length * i / steps).toFixed(2)}" result="o${i}"/>`;
    return `${s}<feMerge result="m">${Array.from({ length: steps }, (_, i) => `<feMergeNode in="o${i + 1}"/>`).join('')}</feMerge>` +
      `<feFlood flood-color="${color}" result="c"/><feComposite in="c" in2="m" operator="in" result="sh"/><feMerge><feMergeNode in="sh"/><feMergeNode in="SourceGraphic"/></feMerge>`;
  }, p, false, 'filterUnits="userSpaceOnUse" x="-512" y="-512" width="4096" height="4096"');   // the shadow leaves the box: a fixed big region

  // ── canvas ───────────────────────────────────────────────────────────────
  X.pixels = (src, fn, { w = K.W_, h = K.H_, parent = K.stage } = {}) => {
    const el = K.el('canvas', '', parent); el.width = w; el.height = h;
    K.css(el, { position: 'absolute', left: '0px', top: '0px', width: w + 'px', height: h + 'px' });
    const g = el.getContext('2d', { willReadFrequently: true });
    return { el, set(p) {
      g.clearRect(0, 0, w, h); g.drawImage(src, 0, 0, w, h);
      const im = g.getImageData(0, 0, w, h), d = im.data;
      for (let i = 0; i < d.length; i += 4) fn(d, i, p);
      g.putImageData(im, 0, 0);
    } };
  };
  const smooth = (a, b, x) => { const u = clamp01((x - a) / Math.max(1e-9, b - a)); return u * u * (3 - 2 * u); };
  X.colorKey = (src, { key = '#00ff00', similarity = 0.4, smoothness = 0.1, ...o } = {}) => {
    const k = X.rgb(key);
    return X.pixels(src, (d, i) => { d[i + 3] *= smooth(similarity, similarity + smoothness, Math.hypot(d[i] - k[0], d[i + 1] - k[1], d[i + 2] - k[2]) / 441.673); }, o);
  };
  X.vibrance = (src, { amount = 0.5, ...o } = {}) =>
    X.pixels(src, (d, i, a = amount) => {
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      const g = 1 + a * (mx ? 1 - (mx - mn) / mx : 0), avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
      for (let c = 0; c < 3; c++) d[i + c] = Math.min(255, Math.max(0, avg + (d[i + c] - avg) * g));
    }, o);

  // ── overlays ─────────────────────────────────────────────────────────────
  const layer = (parent, css) => { const e = K.el('div', 'kit-fx', parent); K.css(e, { position: 'absolute', left: '0px', top: '0px', width: '100%', height: '100%', pointerEvents: 'none', ...css }); return e; };
  X.layer = layer;
  X.vignette = (parent, { color = '#000', strength = 0.7, size = 0.55 } = {}) => {
    const c = X.rgb(color), el = layer(parent, { background: `radial-gradient(ellipse at center, rgba(${c},0) ${size * 100}%, rgba(${c},${strength}) 100%)`, opacity: '0' });
    return { el, set(a) { el.style.opacity = String(clamp01(a)); } };
  };
  X.shine = (parent, { angle = 105, width = 0.12, color = '#fff', opacity = 0.6 } = {}) => {
    const c = X.rgb(color), a = 50 - width * 50, b = 50 + width * 50;
    const el = layer(parent, { backgroundImage: `linear-gradient(${angle}deg, rgba(${c},0) ${a}%, rgba(${c},${opacity}) 50%, rgba(${c},0) ${b}%)`, backgroundSize: '300% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: '100% 0' });
    return { el, set(p) { el.style.backgroundPosition = `${100 * (1 - clamp01(p))}% 0`; } };
  };
})();
