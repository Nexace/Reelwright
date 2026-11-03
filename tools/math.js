// Math primitives: KIT.math. Loaded after engine.js and doodle.js (draw-on is KIT.doodle.drawOn); equation() also needs KaTeX
// (vendor/katex: katex.min.css in <head>, katex.min.js before this file; the HyperFrames renderer copies it to hf/kit/katex/).
// Manim-style building blocks as SVG/HTML built once at load; every .set(t) is a pure function of t. Coordinates are stage px.
//   axes({ x: [min, max, step], y: [min, max, step], box, grid, labels, in, draw, out })   → { el, x, y, box, c2p(x, y), set(t, p?) }
//   numberLine({ range: [min, max, step], box, labels, in, draw, out })                     → same shape (c2p(x) ignores y)
//   plot(axes, f, { x: [x0, x1], samples, in, draw, out, color, width })                    → { el, set(t), progress(t), pointAt(p) }
//   morph(pathA, pathB, { in, dur, n })                                                     → { el, set(t) }
//   equation(tex, { in, step, out, size, x, y, display, parent })                           → { el, glyphs, set(t) }
//   ease.smooth / ease.thereAndBack                                                          Manim's smoothstep and there-and-back
// Options follow KIT.layout: in = start; draw/dur = how long; out (optional) = when it has left: it fades over the 0.45 s before
// `out` with KIT.easeIn. Hidden before `in`. Defaults: box = KIT.safe less room for labels; draw = KIT.dur(0.8) (axes),
// KIT.dur(1.5) (plot); morph dur = KIT.dur(1); equation step = KIT.staggerStep, size = 56 px at 1080 (KaTeX draws 1.21 em of it).
// Colors and fonts are theme tokens (--kit-ink, --kit-muted, --kit-accent, --kit-font-text); labels are 26 px at 1080.
// plot() samples f once; points where f is not finite break the line. It does not clip to the box: keep f inside y.
// morph() takes one subpath each (open or closed, closed = the d ends in Z); transforms on the paths are ignored. pathA is the
// element that changes; pathB is only read (a d string works too). At p = 0 A's own d is back, at p = 1 B's d exactly.
'use strict';
(function () {
  const K = window.KIT, M = (K.math = {});
  const SVG = 'http://www.w3.org/2000/svg';
  if (!K.doodle) throw new Error('tools/math.js: load tools/doodle.js first (KIT.doodle.drawOn)');

  // ── pure parts (motion-check tests these) ────────────────────────────────
  const smooth = (p) => { p = K.clamp(p); return p * p * (3 - 2 * p); };
  M.ease = { smooth, thereAndBack: (p) => (p < 0.5 ? smooth(2 * p) : smooth(2 - 2 * p)) };
  M.ticks = ([a, b, s]) => Array.from({ length: Math.floor((b - a) / s + 1e-9) + 1 }, (_, i) => +(a + i * s).toFixed(10));
  // c2p for a box: y up; yr null (number line) puts every point on the box's middle line
  M.coords = (xr, yr, box) => (x, y = 0) => [box.x + ((x - xr[0]) / (xr[1] - xr[0])) * box.w,
    box.y + box.h - (yr ? (y - yr[0]) / (yr[1] - yr[0]) : 0.5) * box.h];
  // points (null = gap) → { d, len, at(p) }: at(p) is the point a fraction p along the drawn length, as pathLength=1 draws it
  M.polyline = (pts) => {
    const f = (v) => +v.toFixed(2), segs = [];
    let d = '', len = 0;
    pts.forEach((q, i) => {
      if (!q) return;
      const prev = pts[i - 1];
      d += `${prev ? 'L' : 'M'}${f(q[0])} ${f(q[1])}`;
      if (prev) { const l = Math.hypot(q[0] - prev[0], q[1] - prev[1]); segs.push([prev, q, len, l]); len += l; }
    });
    const first = pts.find(Boolean) || [0, 0];
    const at = (p) => {
      const s = K.clamp(p) * len;
      for (const [a, b, s0, l] of segs) if (s <= s0 + l) { const k = l ? (s - s0) / l : 0; return [K.lerp(a[0], b[0], k), K.lerp(a[1], b[1], k)]; }
      return segs.length ? segs[segs.length - 1][1].slice() : first.slice();
    };
    return { d, len, at };
  };
  // b re-indexed to match a point for point: closed → the rotation with least squared distance, open → b or b reversed
  M.align = (a, b, closed) => {
    const n = a.length, cost = (bb, k) => { let c = 0; for (let i = 0; i < n; i++) { const q = bb[(i + k) % n]; c += (a[i][0] - q[0]) ** 2 + (a[i][1] - q[1]) ** 2; } return c; };
    if (!closed) { const r = b.slice().reverse(); return cost(r, 0) < cost(b, 0) ? r : b.slice(); }
    let best = 0, bc = Infinity;
    for (let k = 0; k < n; k++) { const c = cost(b, k); if (c < bc) { bc = c; best = k; } }
    return b.map((_, i) => b[(i + best) % n]);
  };

  // ── DOM helpers ──────────────────────────────────────────────────────────
  const svgEl = (tag, parent, style = {}, attrs = {}) => {
    const e = document.createElementNS(SVG, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    Object.assign(e.style, style);   // style, not presentation attributes: those don't resolve var(--kit-…)
    if (parent) parent.appendChild(e);
    return e;
  };
  const fade = (o, t) => (o.out == null ? 1 : 1 - K.easeIn(K.seg(t, o.out - K.dur(0.45), o.out)));
  const fmtLabel = (v) => String(v).replace('-', '−');

  function build(o, xr, yr, box) {
    const c2p = M.coords(xr, yr, box), u = K.u, t0 = o.in ?? 0, t1 = t0 + (o.draw ?? K.dur(0.8));
    const svg = svgEl('svg', o.parent || K.stage, { position: 'absolute', left: '0', top: '0', overflow: 'visible', pointerEvents: 'none' },
      { width: K.W_, height: K.H_, class: 'kit-math' });
    const cx = yr ? K.clamp(0, xr[0], xr[1]) : xr[0], cy = yr ? K.clamp(0, yr[0], yr[1]) : 0;   // where the axes cross
    const grid = svgEl('g', svg, { stroke: 'var(--kit-muted)', strokeWidth: 1.5 * u });
    if (o.grid && yr) {
      for (const x of M.ticks(xr)) svgEl('path', grid, {}, { d: `M${c2p(x, yr[0])}L${c2p(x, yr[1])}` });
      for (const y of M.ticks(yr)) svgEl('path', grid, {}, { d: `M${c2p(xr[0], y)}L${c2p(xr[1], y)}` });
    }
    const line = { fill: 'none', stroke: 'var(--kit-ink)', strokeWidth: 3 * u, strokeLinecap: 'round' };
    const lines = [svgEl('path', svg, line, { d: `M${c2p(xr[0], cy)}L${c2p(xr[1], cy)}` })];
    if (yr) lines.push(svgEl('path', svg, line, { d: `M${c2p(cx, yr[0])}L${c2p(cx, yr[1])}` }));
    const marks = svgEl('g', svg, { stroke: 'var(--kit-ink)', strokeWidth: 3 * u });
    const text = svgEl('g', svg, { fill: 'var(--kit-muted)', fontFamily: 'var(--kit-font-text)', fontSize: 26 * u + 'px' });
    const label = o.labels === false ? null : typeof o.labels === 'function' ? o.labels : fmtLabel, tk = 10 * u;
    for (const x of M.ticks(xr)) {
      const [px, py] = c2p(x, cy);
      svgEl('path', marks, {}, { d: `M${px} ${py - tk}L${px} ${py + tk}` });
      if (label && !(yr && x === cx && cy > yr[0])) svgEl('text', text, {}, { x: px, y: py + tk + 30 * u, 'text-anchor': 'middle' }).textContent = label(x);
    }
    if (yr) for (const y of M.ticks(yr)) {
      const [px, py] = c2p(cx, y);
      svgEl('path', marks, {}, { d: `M${px - tk} ${py}L${px + tk} ${py}` });
      if (label && !(y === cy && cx > xr[0])) svgEl('text', text, {}, { x: px - tk - 10 * u, y: py + 9 * u, 'text-anchor': 'end' }).textContent = label(y);
    }
    return { el: svg, x: xr, y: yr, box, c2p, set(t, p) {
      p = p ?? K.ease(K.seg(t, t0, t1));
      K.show(svg, p > 0 ? fade(o, t) : 0);
      for (const l of lines) K.doodle.drawOn(l, p);
      grid.style.opacity = 0.3 * p; marks.style.opacity = p; text.style.opacity = K.seg(p, 0.4, 1);
    } };
  }

  M.axes = (o = {}) => {
    const s = K.safe, u = K.u;
    return build(o, o.x || [-5, 5, 1], o.y || [-3, 3, 1], o.box || { x: s.x + 70 * u, y: s.y + 10 * u, w: s.w - 90 * u, h: s.h - 70 * u });
  };
  M.numberLine = (o = {}) => {
    const s = K.safe, u = K.u;
    return build(o, o.range || [-5, 5, 1], null, o.box || { x: s.x + 40 * u, y: s.y + s.h / 2, w: s.w - 80 * u, h: 0 });
  };

  M.plot = (ax, f, o = {}) => {
    const [x0, x1] = o.x || ax.x, n = o.samples ?? 200, t0 = o.in ?? 0, t1 = t0 + (o.draw ?? K.dur(1.5));
    const pts = Array.from({ length: n + 1 }, (_, i) => { const x = K.lerp(x0, x1, i / n), y = f(x); return Number.isFinite(y) ? ax.c2p(x, y) : null; });
    const pl = M.polyline(pts);
    const el = svgEl('path', ax.el, { fill: 'none', stroke: o.color || 'var(--kit-accent)', strokeWidth: (o.width ?? 5) * K.u,
      strokeLinecap: 'round', strokeLinejoin: 'round' }, { d: pl.d });
    const progress = (t) => K.ease(K.seg(t, t0, t1));
    return { el, progress, pointAt: pl.at, set(t) { K.doodle.drawOn(el, progress(t)); el.style.opacity = fade(o, t); } };
  };

  M.morph = (a, b, o = {}) => {
    const n = o.n ?? 120, t0 = o.in ?? 0, t1 = t0 + (o.dur ?? K.dur(1));
    const dA = a.getAttribute('d'), dB = typeof b === 'string' ? b : b.getAttribute('d'), closed = /z\s*$/i.test(dA);
    const probe = svgEl('path', a.parentNode);   // getPointAtLength on a path in the document, at load only
    const sample = (d) => {
      probe.setAttribute('d', d);
      const len = probe.getTotalLength(), m = closed ? n : n - 1;
      return Array.from({ length: n }, (_, i) => { const q = probe.getPointAtLength((len * i) / m); return [q.x, q.y]; });
    };
    const A = sample(dA), B = M.align(A, sample(dB), closed);
    probe.remove();
    return { el: a, set(t) {
      const p = K.ease(K.seg(t, t0, t1));
      a.setAttribute('d', p <= 0 ? dA : p >= 1 ? dB : M.polyline(A.map((q, i) => [K.lerp(q[0], B[i][0], p), K.lerp(q[1], B[i][1], p)])).d + (closed ? 'Z' : ''));
    } };
  };

  M.equation = (tex, o = {}) => {
    if (!window.katex) throw new Error('KIT.math.equation: load vendor/katex/katex.min.js (and katex.min.css) before tools/math.js');
    const s = K.safe, t0 = o.in ?? 0, step = o.step ?? K.staggerStep, rise = 12 * K.u, len = K.dur(0.4);
    const el = K.el('div', 'kit-math-eq', o.parent || K.stage,
      window.katex.renderToString(tex, { throwOnError: true, displayMode: o.display ?? true, output: 'html' }));   // a bad formula throws here
    K.css(el, { position: 'absolute', left: (o.x ?? s.x + s.w / 2) + 'px', top: (o.y ?? s.y + s.h / 2) + 'px', transform: 'translate(-50%, -50%)',
      whiteSpace: 'nowrap', color: o.color || 'var(--kit-ink)', fontSize: (o.size ?? 56) * K.u + 'px' });
    for (const d of el.querySelectorAll('.katex-display')) d.style.margin = '0';
    // glyphs in reading order: text leaves, plus rules and stretchy svgs (fraction bars, radicals). A .vlist's rows are
    // walked by their style top, highest first (a fraction's DOM order is denominator, bar, numerator); a matrix (.mtable,
    // one vlist per column) is walked row by row, left to right. Ordered once at load.
    const isGlyph = (e) => e.tagName.toLowerCase() === 'svg' ||
      /(^| )(frac-line|overline-line|underline-line|hline|rule)( |$)/.test(e.getAttribute('class') || '') || (!e.childElementCount && e.textContent.trim());
    const rows = (v) => [...v.children].sort((a, b) => (parseFloat(a.style.top) || 0) - (parseFloat(b.style.top) || 0));
    const glyphs = [], walk = (e) => {
      if (e.classList.contains('mtable')) {   // shortcut: column separators (|) aren't glyphs, so they show with the table
        const cols = [...e.children].map((c) => c.querySelector('.vlist')).filter(Boolean).map(rows);
        for (let r = 0; r < Math.max(0, ...cols.map((c) => c.length)); r++) for (const c of cols) if (c[r]) walk(c[r]);
        return;
      }
      const kids = e.classList.contains('vlist') ? rows(e) : [...e.children];
      for (const k of kids) if (isGlyph(k)) glyphs.push(k); else walk(k);
    };
    walk(el.querySelector('.katex-html'));
    for (const g of glyphs) if (getComputedStyle(g).display === 'inline') g.style.display = 'inline-block';   // transforms skip inline boxes
    return { el, glyphs, set(t) {
      K.show(el, t >= t0 ? fade(o, t) : 0);
      glyphs.forEach((g, i) => {
        const p = K.ease(K.seg(t, t0 + i * step, t0 + i * step + len));
        g.style.opacity = p; g.style.transform = `translateY(${(1 - p) * rise}px)`;
      });
    } };
  };
})();
