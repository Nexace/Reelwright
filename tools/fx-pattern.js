// fx-pattern.js: textures and patterns as CSS / SVG / canvas layers (Remotion @remotion/effects row 2.3.6), rewritten, no Remotion. Load after
// engine.js and fx-color.js. Each builds ONE absolutely positioned layer inside `parent` at load and returns { el, set(p) } (set is a pure
// description of the layer for p; call it from render(t); a static pattern's set is a no-op). Options (all optional):
//   color (ink, default '#000'), bg (default transparent), opacity (0..1), size (px of one cell), blend (mix-blend-mode).
// CSS gradient layers, set({ x = 0, y = 0 }) scrolls the tile by px:
//   checkerboard { size = 32, color, bg = '#fff' }   dotGrid { size = 24, radius = 2 }   gridlines { size = 40, width = 1 }
//   lines { size = 12, width = 2, angle = 45 }       scanlines { size = 4, width = 1, color = black, opacity 0.25 }   rings { size = 20, width = 2 }
//   flannel { size = 24, width = 8, color = '#a33', bg = '#d8c8b0' } plaid with a fine twill
// SVG tiles (set({ x, y }) scrolls): zigzag { size = 20, width = 2 }   waves { size = 40, height = 14, width = 2 }
//   pattern { svg: '<path …/>', w, h }   any SVG markup as the tile (viewBox 0 0 w h)
// SVG-filter noise (set({ phase }) breathes the frequency ±15 %, the same phase gives the same picture; seed = the filter's integer seed):
//   noise { frequency = 0.65, octaves = 2, seed, color, strength = 1 }        turbulence, ink alpha = noise
//   fractalNoise { …the same… }                                                 fractal noise (softer clouds)
//   speckle { frequency = 0.9, density = 0.25 }                                 sparse specks
//   contourLines { frequency = 0.008, levels = 8 }                              thin iso-lines of a noise field
//   liquidContours { frequency = 0.008, levels = 8 }                            alternating filled bands of the field: animate with set({ phase })
//   paper { frequency = 0.04, color = '#f4efe4' }                               lit fractal noise, a paper tooth
//   burlap { color = '#c9a66b' }                                                crossed coarse fibres, lit
// Canvas: whiteNoise { w, h, size = 128 (tile px) } set({ seed }) → hash noise per pixel (pure: same seed, same pixels);
//         halftone { w, h, cell = 14, angle = 45, field = 'radial' | 'linear' | (u, v, p) → 0..1 } set(p) → dots on a rotated grid, radius = field · cell · 0.7
// emboss({ strength = 1 }) → SVG-filter handle (on(el)), the 3×3 emboss kernel on whatever the element shows.
// tvSignalOff(parent, { w, h }) → { el, set(p 0..1) }  CRT switch-off: the picture squeezes to a bright line (p 0..0.55), the line to a dot (to 0.85), the dot fades.
// KIT.fx.pattern.<name>(parent, o); the names above are all there is. Everything is a pure function of its arguments.
'use strict';
(function () {
  const K = window.KIT, X = K && K.fx;
  if (!X || !X.svgf) throw new Error('fx-pattern.js: load tools/engine.js and tools/fx-color.js first');
  const P = (X.pattern = {}), smooth = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
  const FULL = 'x="0" y="0" width="100%" height="100%"';
  const base = (parent, o, css) => X.layer(parent, { opacity: String(o.opacity ?? 1), mixBlendMode: o.blend || '', backgroundColor: o.bg || 'transparent', ...css });
  const scroll = (el) => (q = {}) => { el.style.backgroundPosition = `${q.x || 0}px ${q.y || 0}px`; };
  const css = (name, build) => { P[name] = (parent, o = {}) => { const el = base(parent, o, build({ color: '#000', ...o })); return { el, set: scroll(el) }; }; };
  const ink = (o, a = 1) => { const c = X.rgb(o.color || '#000'); return `rgba(${c},${a})`; };

  css('checkerboard', (o) => { const s = o.size ?? 32; return { backgroundImage: `repeating-conic-gradient(${o.color} 0 25%, ${o.bg || '#fff'} 0 50%)`, backgroundSize: `${2 * s}px ${2 * s}px`, backgroundColor: '' }; });
  css('dotGrid', (o) => { const s = o.size ?? 24, r = o.radius ?? 2; return { backgroundImage: `radial-gradient(circle at center, ${o.color} ${r}px, transparent ${r + 0.7}px)`, backgroundSize: `${s}px ${s}px` }; });
  css('gridlines', (o) => { const s = o.size ?? 40, w = o.width ?? 1, l = (d) => `linear-gradient(${d}, ${o.color} ${w}px, transparent ${w}px)`; return { backgroundImage: `${l('to right')}, ${l('to bottom')}`, backgroundSize: `${s}px ${s}px` }; });
  css('lines', (o) => { const s = o.size ?? 12, w = o.width ?? 2; return { backgroundImage: `repeating-linear-gradient(${o.angle ?? 45}deg, ${o.color} 0 ${w}px, transparent ${w}px ${s}px)` }; });
  css('scanlines', (o) => { const s = o.size ?? 4, w = o.width ?? 1; return { opacity: String(o.opacity ?? 0.25), backgroundImage: `repeating-linear-gradient(180deg, ${o.color} 0 ${w}px, transparent ${w}px ${s}px)` }; });
  css('rings', (o) => { const s = o.size ?? 20, w = o.width ?? 2; return { backgroundImage: `repeating-radial-gradient(circle at 50% 50%, ${o.color} 0 ${w}px, transparent ${w}px ${s}px)` }; });
  css('flannel', (o) => {
    const s = o.size ?? 24, w = o.width ?? 8, c = ink({ color: o.color || '#a33' }, 0.35), l = (d) => `repeating-linear-gradient(${d}, ${c} 0 ${w}px, transparent ${w}px ${s}px)`;
    return { backgroundColor: o.bg || '#d8c8b0', backgroundImage: `${l('0deg')}, ${l('90deg')}, repeating-linear-gradient(45deg, rgba(0,0,0,0.07) 0 1px, transparent 1px 3px)` };
  });
  const tile = (name, build) => { P[name] = (parent, o = {}) => {
    const { w, h, svg } = build({ color: '#000', ...o }), el = base(parent, o, {});
    el.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svg}</svg>`)}")`;
    el.style.backgroundSize = `${w}px ${h}px`;
    return { el, set: scroll(el) };
  }; };
  const stroke = (o) => `fill="none" stroke="${o.color}" stroke-width="${o.width ?? 2}"`;
  tile('zigzag', (o) => { const s = o.size ?? 20; return { w: s, h: s / 2, svg: `<path ${stroke(o)} d="M0 ${s / 2 - 1} L${s / 4} 1 L${s * 3 / 4} ${s / 2 - 1} L${s} 1"/>` }; });
  tile('waves', (o) => { const s = o.size ?? 40, h = o.height ?? 14; return { w: s, h, svg: `<path ${stroke(o)} d="M0 ${h / 2} C${s / 4} 0 ${s / 4} 0 ${s / 2} ${h / 2} S${s * 3 / 4} ${h} ${s} ${h / 2}"/>` }; });
  tile('pattern', (o) => { if (!o.svg || !o.w || !o.h) throw new Error('pattern: needs { svg, w, h }'); return { w: o.w, h: o.h, svg: o.svg }; });

  // SVG-filter layers: a div with a background-less box, filtered into noise
  const turb = (type, f, o, seed = o.seed ?? 0) => `<feTurbulence type="${type}" baseFrequency="${f}" numOctaves="${o.octaves ?? 2}" seed="${seed}" result="n"/>`;
  const alphaOf = (o, k = 1) => { const c = X.rgb(o.color || '#000'); return `<feColorMatrix in="n" type="matrix" values="0 0 0 0 ${c[0] / 255}  0 0 0 0 ${c[1] / 255}  0 0 0 0 ${c[2] / 255}  ${k} 0 0 0 0"/>`; };
  const bands = (n, f) => Array.from({ length: n * 6 }, (_, i) => f(Math.floor(i / 6))).join(' ');   // n bands × 6 table steps
  const fl = (name, def, build) => { P[name] = (parent, o = {}) => {
    const q = { ...def, ...o }, el = base(parent, q, {}), h = X.svgf(build(q, 0), false, FULL);
    el.style.filter = h.url;
    return { el, set(s = {}) { h.f.innerHTML = build(q, s.phase || 0); } };
  }; };
  const fq = (q, phase) => (q.frequency * (1 + 0.15 * Math.sin(phase))).toFixed(5);
  fl('noise', { frequency: 0.65 }, (q, ph) => turb('turbulence', fq(q, ph), q) + alphaOf(q, q.strength ?? 1));
  fl('fractalNoise', { frequency: 0.65 }, (q, ph) => turb('fractalNoise', fq(q, ph), q) + alphaOf(q, q.strength ?? 1));
  fl('speckle', { frequency: 0.9, density: 0.25 }, (q, ph) => turb('fractalNoise', fq(q, ph), { ...q, octaves: 1 }) + alphaOf(q).replace('result', 'x') + `<feComponentTransfer><feFuncA type="discrete" tableValues="${bands(20, (i) => (i >= Math.round(20 * (1 - q.density)) ? 1 : 0))}"/></feComponentTransfer>`);
  fl('contourLines', { frequency: 0.008, levels: 8 }, (q, ph) => turb('fractalNoise', fq(q, ph), q) + alphaOf(q) + `<feComponentTransfer><feFuncA type="discrete" tableValues="${Array.from({ length: q.levels * 8 }, (_, i) => (i % 8 === 0 ? 1 : 0)).join(' ')}"/></feComponentTransfer>`);
  fl('liquidContours', { frequency: 0.008, levels: 8 }, (q, ph) => turb('fractalNoise', fq(q, ph), q) + alphaOf(q) + `<feComponentTransfer><feFuncA type="discrete" tableValues="${bands(q.levels, (i) => i % 2)}"/></feComponentTransfer>`);
  const lit = (c) => `<feDiffuseLighting in="n" surfaceScale="2" lighting-color="${c}" result="l"><feDistantLight azimuth="45" elevation="60"/></feDiffuseLighting>`;
  fl('paper', { frequency: 0.04, color: '#f4efe4', octaves: 5 }, (q, ph) => turb('fractalNoise', fq(q, ph), q) + lit(q.color));
  fl('burlap', { color: '#c9a66b' }, (q) => turb('fractalNoise', '0.04 0.9', { octaves: 2 }, 1).replace('result="n"', 'result="a"') +
    `<feTurbulence type="fractalNoise" baseFrequency="0.9 0.04" numOctaves="2" seed="2" result="b"/><feComposite in="a" in2="b" operator="arithmetic" k1="0" k2="0.5" k3="0.5" k4="0" result="n"/>` + lit(q.color));

  P.emboss = ({ strength = 1 } = {}) => X.svgf(`<feConvolveMatrix order="3" preserveAlpha="true" kernelMatrix="${[-2, -1, 0, -1, 1, 1, 0, 1, 2].map((v) => v * strength).join(' ')}" divisor="1" bias="0"/>`);

  // canvas
  const canvasLayer = (parent, o) => {
    const el = K.el('canvas', 'kit-fx', parent), w = o.w ?? K.W_, h = o.h ?? K.H_; el.width = w; el.height = h;
    K.css(el, { position: 'absolute', left: '0px', top: '0px', width: w + 'px', height: h + 'px', opacity: String(o.opacity ?? 1), mixBlendMode: o.blend || '' });
    return { el, g: el.getContext('2d'), w, h };
  };
  P.whiteNoise = (parent, o = {}) => {
    const { el, g, w, h } = canvasLayer(parent, { w: o.size ?? 128, h: o.size ?? 128, ...o, opacity: o.opacity ?? 1 });
    // tile the small canvas over the whole parent through a CSS background of its dataURL would cost per frame; the canvas itself is scaled up instead
    el.style.width = '100%'; el.style.height = '100%'; el.style.imageRendering = 'pixelated';
    return { el, set({ seed = 0 } = {}) {
      const im = g.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let v = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul(seed + 1, 1274126177);
        v = Math.imul(v ^ (v >>> 13), 1274126177); v = (v ^ (v >>> 16)) & 255;
        im.data.set([v, v, v, 255], (y * w + x) * 4);
      }
      g.putImageData(im, 0, 0);
    } };
  };
  P.halftone = (parent, o = {}) => {
    const { el, g, w, h } = canvasLayer(parent, o), cell = o.cell ?? 14, a = (o.angle ?? 45) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const field = typeof o.field === 'function' ? o.field : o.field === 'linear' ? (u) => 1 - u : (u, v) => Math.max(0, 1 - 1.4 * Math.hypot(u - 0.5, v - 0.5));
    g.fillStyle = '';
    return { el, set(p) {
      g.clearRect(0, 0, w, h); g.fillStyle = o.color || '#000';
      const R = Math.hypot(w, h) / 2;
      for (let j = -R; j <= R; j += cell) for (let i = -R; i <= R; i += cell) {
        const x = w / 2 + i * ca - j * sa, y = h / 2 + i * sa + j * ca;
        if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue;
        const r = field(x / w, y / h, p) * cell * 0.7;
        if (r > 0.2) { g.beginPath(); g.arc(x, y, r, 0, 6.283185307179586); g.fill(); }
      }
    } };
  };

  P.tvSignalOff = (parent, o = {}) => {
    const W = o.w ?? K.W_, H = o.h ?? K.H_, root = X.layer(parent, {});
    const bar = () => { const e = K.el('div', '', root); K.css(e, { background: '#000' }); return e; }, top = bar(), bot = bar(), lef = bar(), rig = bar();
    const gap = K.el('div', '', root); K.css(gap, { background: '#fff' });
    const put = (e, x, y, w, h) => K.css(e, { left: x + 'px', top: y + 'px', width: Math.max(0, w) + 'px', height: Math.max(0, h) + 'px' });
    return { el: root, set(p) {
      const gapH = Math.max(3, H * (1 - smooth(p / 0.55))), gapW = Math.max(6, W * (1 - smooth((p - 0.55) / 0.3))), x0 = (W - gapW) / 2, y0 = (H - gapH) / 2;
      put(top, 0, 0, W, y0); put(bot, 0, y0 + gapH, W, H - y0 - gapH); put(lef, 0, y0, x0, gapH); put(rig, x0 + gapW, y0, W - x0 - gapW, gapH); put(gap, x0, y0, gapW, gapH);
      gap.style.opacity = String(p < 0.55 ? smooth(p / 0.55) * 0.9 : 1 - smooth((p - 0.85) / 0.15));
      if (p <= 0) root.style.visibility = 'hidden'; else root.style.visibility = '';
    } };
  };
})();
