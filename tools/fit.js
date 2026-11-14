// Text-fit and text measure for hand-built scenes: KIT.fit. Loaded after engine.js. Uses canvas measureText, so nothing is
// laid out or reflowed; every call is a pure function of its arguments (and the loaded fonts: call again after document.fonts.ready).
//   KIT.fit.measure(text, { font, size, weight, letterSpacing }) → { width, height }   one line, px
//   KIT.fit.lines(text, { font, size, weight, maxWidth }) → string[]                   greedy word wrap at maxWidth
//   KIT.fit(text, { font, maxWidth, maxHeight, max, min, weight, lineHeight, lines }) → { size, lines, width, height, fits }
//        largest font size (px, integer, ≤ max, ≥ min) at which text wraps inside maxWidth (and maxHeight / at most `lines` lines)
//   KIT.fit.apply(el, { maxWidth, maxHeight, max, min, lines }) → fit result, sets el.style.fontSize from el's own text and font
'use strict';
(function () {
  const K = window.KIT || (window.KIT = {});
  const ctx = document.createElement('canvas').getContext('2d');
  const setFont = (o, size) => { ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 400} ${size}px ${o.font || 'sans-serif'}`; ctx.letterSpacing = (o.letterSpacing || 0) + 'px'; };
  const measure = (text, o = {}) => { setFont(o, o.size || 16); return { width: ctx.measureText(text).width, height: (o.size || 16) * (o.lineHeight || 1.2) }; };
  const lines = (text, o = {}) => {
    setFont(o, o.size || 16);
    const out = [];
    for (const para of String(text).split('\n')) {
      let cur = '';
      for (const w of para.split(/\s+/).filter(Boolean)) {
        const next = cur ? cur + ' ' + w : w;
        if (cur && ctx.measureText(next).width > o.maxWidth) { out.push(cur); cur = w; } else cur = next;
      }
      out.push(cur);
    }
    return out;
  };
  const fit = (text, o = {}) => {
    const { maxWidth, maxHeight = Infinity, max = 200, min = 8, lineHeight = 1.2, lines: maxLines = Infinity } = o;
    if (!(maxWidth > 0)) throw new Error('KIT.fit: maxWidth is required');
    const probe = (size) => {
      const ls = lines(text, { ...o, size, maxWidth });
      setFont(o, size);
      const width = Math.max(...ls.map((l) => ctx.measureText(l).width));
      const height = ls.length * size * lineHeight;
      // a single word wider than the box cannot wrap: it only fits by shrinking
      return { size, lines: ls, width, height, fits: width <= maxWidth && height <= maxHeight && ls.length <= maxLines };
    };
    let lo = min, hi = max, best = probe(min);
    while (lo < hi) {   // fits is monotone in size, so bisect to whole pixels
      const m = Math.ceil((lo + hi) / 2), r = probe(m);
      if (r.fits) { best = r; lo = m; } else hi = m - 1;
    }
    return best;
  };
  fit.measure = measure; fit.lines = lines;
  fit.apply = (el, o = {}) => {
    const cs = getComputedStyle(el);
    const r = fit(el.textContent, { font: cs.fontFamily, weight: cs.fontWeight, letterSpacing: parseFloat(cs.letterSpacing) || 0, ...o });
    el.style.fontSize = r.size + 'px'; return r;
  };
  K.fit = fit;
})();
