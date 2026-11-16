// p9-text.js: @remotion/layout-utils on canvas measureText, no DOM layout, no reflow. Load after engine.js. Call after document.fonts.ready (K.start waits
// for fonts; call these at load inside the film script, not from render). Pure functions of their arguments and the loaded fonts.
// Text options everywhere: { text, fontFamily = 'sans-serif', fontSize, fontWeight = 400, fontStyle = 'normal', letterSpacing = '0px' | 'N em' | number px }
//   KIT.measureText(o) → { width, height }                      one line; height = fontSize · lineHeight (default 1.2)
//   KIT.fitText({ text, withinWidth, fontFamily, fontWeight, letterSpacing }) → { fontSize }   the size at which ONE line is exactly withinWidth wide
//   KIT.fitTextOnNLines({ text, maxBoxWidth, maxLines, maxFontSize = 200, minFontSize = 4, fontFamily, … }) → { fontSize, lines, fits }
//                                                               the largest whole-pixel size at which the text wraps into <= maxLines lines of <= maxBoxWidth
//   KIT.fillTextBox({ maxBoxWidth, maxLines }) → { add({ text, fontFamily, fontSize, … }) → { exceedsBox, newLine } }
//                                                               words are added one text run after another (each run keeps its own font), wrapping when the line
//                                                               is full; exceedsBox = true when the add needs more than maxLines lines. The box is only advanced by an add that fits.
//   KIT.measureDom(nodesOrSelector, { relativeTo = KIT.stage }) → [{ x, y, width, height }]   layout boxes in stage px, undone from any scale of the stage
// KIT.fit (tools/fit.js) is the DOM-driven helper that sets el.style.fontSize; this file is the Remotion-shaped numeric API.
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('p9-text.js: load tools/engine.js first');
  const ctx = document.createElement('canvas').getContext('2d');
  const ls = (o, size) => { const v = o.letterSpacing; return typeof v === 'number' ? v + 'px' : /em$/.test(String(v || '')) ? parseFloat(v) * size + 'px' : v || '0px'; };
  const set = (o, size = o.fontSize) => { ctx.font = `${o.fontStyle || 'normal'} ${o.fontWeight || 400} ${size}px ${o.fontFamily || 'sans-serif'}`; ctx.letterSpacing = ls(o, size); };
  const width = (text, o, size) => { set(o, size); return ctx.measureText(text).width; };
  K.measureText = (o) => { if (!(o.fontSize > 0)) throw new Error('measureText: fontSize is required'); return { width: width(o.text, o, o.fontSize), height: o.fontSize * (o.lineHeight || 1.2) }; };
  K.fitText = (o) => {
    if (!(o.withinWidth > 0)) throw new Error('fitText: withinWidth is required');
    const ref = 100, w = width(o.text, o, ref);   // text width is linear in the size (letterSpacing in em, or px that scale with it): scale from a 100 px probe
    if (!(w > 0)) throw new Error('fitText: the text measures 0 wide');
    let size = ref * o.withinWidth / w;
    const px = typeof o.letterSpacing === 'number' || /px$/.test(String(o.letterSpacing || ''));   // fixed px spacing is not linear: settle by bisection
    if (px) { let lo = 1, hi = Math.max(2, size * 2); for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (width(o.text, o, m) <= o.withinWidth) lo = m; else hi = m; } size = lo; }
    return { fontSize: size };
  };
  const wrap = (text, o, size, maxW) => {
    set(o, size); const out = [];
    for (const para of String(text).split('\n')) {
      let cur = '';
      for (const wd of para.split(/\s+/).filter(Boolean)) { const next = cur ? cur + ' ' + wd : wd; if (cur && ctx.measureText(next).width > maxW) { out.push(cur); cur = wd; } else cur = next; }
      out.push(cur);
    }
    return out;
  };
  K.fitTextOnNLines = (o) => {
    const { maxBoxWidth, maxLines, maxFontSize = 200, minFontSize = 4 } = o;
    if (!(maxBoxWidth > 0) || !(maxLines >= 1)) throw new Error('fitTextOnNLines: maxBoxWidth and maxLines are required');
    const probe = (size) => { const lines = wrap(o.text, o, size, maxBoxWidth); set(o, size); return { fontSize: size, lines, fits: lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxBoxWidth + 1e-6) }; };
    let lo = minFontSize, hi = Math.floor(maxFontSize), best = probe(lo);
    while (lo < hi) { const m = Math.ceil((lo + hi) / 2), r = probe(m); if (r.fits) { best = r; lo = m; } else hi = m - 1; }
    return best;
  };
  K.fillTextBox = ({ maxBoxWidth, maxLines }) => {
    if (!(maxBoxWidth > 0) || !(maxLines >= 1)) throw new Error('fillTextBox: maxBoxWidth and maxLines are required');
    let lines = 1, x = 0;
    return { add(o) {
      let L = lines, X = x, newLine = false;
      const space = width(' ', o, o.fontSize);
      for (const wd of String(o.text).split(/\s+/).filter(Boolean)) {
        const w = width(wd, o, o.fontSize), need = X === 0 ? w : space + w;
        if (X > 0 && X + need > maxBoxWidth) { L++; X = w; newLine = true; } else X += need;
        if (w > maxBoxWidth) return { exceedsBox: true, newLine };   // one word wider than the box can never fit
      }
      if (L > maxLines) return { exceedsBox: true, newLine };
      lines = L; x = X; return { exceedsBox: false, newLine };
    } };
  };
  K.measureDom = (nodes, { relativeTo = K.stage } = {}) => {
    const list = typeof nodes === 'string' ? [...document.querySelectorAll(nodes)] : nodes instanceof Element ? [nodes] : [...nodes];
    const base = relativeTo.getBoundingClientRect(), sx = base.width / (relativeTo.offsetWidth || base.width) || 1, sy = base.height / (relativeTo.offsetHeight || base.height) || 1;
    return list.map((n) => { const r = n.getBoundingClientRect(); return { x: (r.left - base.left) / sx, y: (r.top - base.top) / sy, width: r.width / sx, height: r.height / sy }; });
  };
})();
