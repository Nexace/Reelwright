// highlight.js: hand-drawn text marks in the doodle style (Remotion @remotion/rough-notation Highlight / StrikeThrough / CrossedOff / Box /
// Bracket; Underline and Circle already are KIT.doodle.underline / circle). Load after doodle.js and doodle2.js. Thin wrappers over D.stroke
// (pen ribbon, retrace, grain), so the look follows the pen `style` and everything is a pure function of (t, id, options).
//   KIT.doodle.mark(el, kind, o) → { set(t), strokes }   kind = 'highlight' | 'strike' | 'crossed' | 'box' | 'bracket'
//   o: { in, draw (total seconds, default KIT.dur(0.5)), out, id, style, color, w, pad, ease, ... } like D.stroke; `progress` instead of in/draw:
//   mark.at(p) draws the mark to p (0..1) with no clock, for a mark driven by your own curve. Several strokes (crossed, bracket both) are
//   drawn one after the other inside `draw`. highlight: a marker band that scribbles back and forth over the text height (opacity .45, multiply);
//   box: one loop around the element; bracket { side = 'both' | 'left' | 'right' }; strike: through the middle; crossed: an X.
// Sizes are measured once at load (offsetWidth / offsetHeight), like D.underline.
'use strict';
(function () {
  const K = window.KIT, D = K && K.doodle;
  if (!D || !D.stroke) throw new Error('highlight.js: load tools/doodle.js and tools/doodle2.js first');
  const shapes = {
    highlight: (w, h, pad) => { const n = Math.max(3, Math.round(w / (h * 1.1))), pts = []; for (let i = 0; i <= n; i++) pts.push([-pad + (w + 2 * pad) * i / n, h * (i % 2 ? 0.8 : 0.2)]); return [pts]; },
    strike: (w, h, pad) => [[[-pad, h * 0.52], [w * 0.3, h * 0.48], [w * 0.65, h * 0.54], [w + pad, h * 0.5]]],
    crossed: (w, h, pad) => [[[-pad, -pad], [w * 0.5, h * 0.5], [w + pad, h + pad]], [[w + pad, -pad], [w * 0.5, h * 0.5], [-pad, h + pad]]],
    box: (w, h, pad) => [[[-pad, -pad], [w * 0.5, -pad * 1.2], [w + pad, -pad], [w + pad * 1.2, h * 0.5], [w + pad, h + pad], [w * 0.5, h + pad * 1.2], [-pad, h + pad], [-pad * 1.2, h * 0.5], [-pad * 0.8, -pad * 0.6]]],
    bracket: (w, h, pad, side) => {
      const l = (s) => { const x = s < 0 ? -pad * 1.5 : w + pad * 1.5, d = s < 0 ? 1 : -1, t = h * 0.1, b = h * 0.9; return [[x + d * pad, t], [x, t], [x, (t + b) / 2], [x, b], [x + d * pad, b]]; };
      return side === 'left' ? [l(-1)] : side === 'right' ? [l(1)] : [l(-1), l(1)];
    },
  };
  D.mark = (el, kind, o = {}) => {
    if (!shapes[kind]) throw new Error(`doodle.mark: kind is ${Object.keys(shapes).join(' | ')} (got ${kind})`);
    const w = el.offsetWidth, h = el.offsetHeight, pad = o.pad ?? 4 * K.u, id = o.id || (el.id || 'mark') + '-' + kind, parts = shapes[kind](w, h, pad, o.side || 'both');
    const hl = kind === 'highlight', t0 = o.in ?? 0, total = o.draw ?? K.dur(0.5), each = total / parts.length;
    const base = { ...o, style: o.style || (hl ? 'marker' : 'pencil') };
    if (hl) { base.w = o.w ?? h * 0.55; base.opacity = o.opacity ?? 0.45; }
    delete base.in; delete base.draw; delete base.side;
    const strokes = parts.map((pts, i) => D.stroke(el, pts, { ...base, id: id + '-' + i, in: t0 + i * each, draw: each }));
    if (hl) for (const s of strokes) s.el.ownerSVGElement.style.mixBlendMode = 'multiply';
    const set = (t) => { for (const s of strokes) s.set(t); };
    // at(p): the same mark drawn to progress p, on a clock of its own (0 → 1 over `total`), for a caller that has its own curve
    return { strokes, set, at: (p) => set(t0 + total * Math.min(1, Math.max(0, p))) };
  };
})();
