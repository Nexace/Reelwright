// Manim graphs, native: Axes (tips, log scale, tick and number options, add_coordinates, get_axis_labels), NumberLine (elongated ticks,
// labels at values, brackets, UnitInterval, Slider), BarChart, SampleSpace, VectorScene and LinearTransformationScene. Load after engine.js,
// doodle.js, math.js and plot2.js (planes, warps; math2.js for brackets and braces; manim-grid.js for the matrix label). Semantics follow
// Manim Community Edition (MIT): mobject/graphing/coordinate_systems.py, number_line.py, scale.py, probability.py, scene/vector_space_scene.py.
// No Manim code is copied. Built once at load; every .set(t) is a pure function of t. Coordinates are stage px; options follow KIT.math
// (in = start, draw = how long, out = when it has left).
//   KIT.math.axes2({ x: [min, max, step], y, box | length: [w, h], tips = true, xAxis, yAxis, numbers = true, in, draw, out, parent })
//        axis config { scale: 'linear' | 'log', base = 10, tip, ticks = true, numbers, numbersToExclude, elongated: [values], longer = 1.5, decimals,
//        labels: fn(v) → string, color }  → { el, x, y, box, c2p(x, y), p2c(px, py), xAxis, yAxis, addCoordinates(), getAxisLabels(x, y), set(t, p) }
//        Log scale: the range is in exponents ([0, 4, 1] = 1 … 10 000, ticks labelled 10^k) and c2p / p2c / KIT.math.plot take real values
//        (c2p(100, …) sits at exponent 2). Same shape as KIT.math.axes, so KIT.math.plot, plane warps and plot2 helpers take it.
//        addCoordinates({ x: true | [values], y: … }) adds number labels to axes built with numbers: false; getAxisLabels('x', 'y') → { x, y }
//        text elements at the positive ends (they fade in with the axes).
//   KIT.math.numberLine2({ range: [min, max, step], box | length, tip, numbers, elongated, labels: { value: 'text' }, scale, decimals, in, draw, out })
//        → { el, c2p, n2p(v), p2n(px), bracket(a, b, { label, side, depth }), set(t, p) }   NumberLine; n2p / p2n map values and px (log: real values).
//   KIT.math.unitInterval(opts)   NumberLine 0 … 1 step 0.1, ticks at 0 and 1 elongated and numbered
//   KIT.math.slider(nl, value | fn(t) → value, { r, color, label = true, decimals = 1 }) → { el, valueAt(t), set(t) }   GL Slider: a knob riding the line with a readout
//   KIT.math.bars(values, { names, colors, yRange: [min, max, step], box, barWidth = 0.6, valueLabels = false, fillOpacity = 0.7, in, draw, step })
//        → { axes, bars: [{ el, label }], valuesAt(t), change(values, { in, dur }), brace(i, j, label, { in }), set(t) }   BarChart; change_bar_values is a
//        scheduled tween (several changes chain, in order).
//   KIT.math.sampleSpace({ x, y, w, h, color, opacity, stroke }) → { rect, divide(props, { dir: 'h' | 'v', colors, labels, braces = true, in, dur }), set(t) }
//        SampleSpace: divide(0.3) or divide([0.2, 0.5, 0.3]) splits the rectangle by probability (dir 'h' = side by side, 'v' = stacked) into
//        { rect, labelEl, space } parts; each part is itself a space you can divide again (the tree diagram). Labels sit in the parts; braces + p labels beyond.
//   KIT.math.vectorScene({ plane: planeOptions | plane, in }) → { plane, vectors, addVector(v, { color, label, in, from }), set(t) }   VectorScene
//   KIT.math.linearScene(matrix, { plane, in, dur, basis = true, matrixLabel = false | { x, y, kind } }) → everything vectorScene returns plus
//        { warp, basis, matrixLabel, applyMatrix(m, { in, dur }), addTransformableLabel(vector, text, { newText }) }   LinearTransformationScene: the grid
//        warps by the matrix, vectors move with it (tip = lerp(v, M v, progress)), labels follow the tips and turn into L(text) as it lands.
//        A second applyMatrix chains from the first's result (warps must not overlap in time).
'use strict';
(function () {
  const K = window.KIT, M = K.math, SVG = 'http://www.w3.org/2000/svg', u = K.u;
  if (!M || !K.doodle) throw new Error('tools/manim-graph.js: load tools/engine.js, doodle.js and math.js first');
  const f2 = (v) => +v.toFixed(2), fmtN = (v) => String(v).replace('-', '−');
  const svgEl = (tag, parent, style = {}, attrs = {}) => {
    const e = document.createElementNS(SVG, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    Object.assign(e.style, style);
    if (parent) parent.appendChild(e);
    return e;
  };
  const fade = (o, t) => (o.out == null ? 1 : 1 - K.easeIn(K.seg(t, o.out - K.dur(0.45), o.out)));
  const stageSvg = (parent) => svgEl('svg', parent || K.stage, { position: 'absolute', left: '0', top: '0', overflow: 'visible', pointerEvents: 'none' }, { width: K.W_, height: K.H_, class: 'kit-math' });
  const tri = (tip, dir, size) => {   // filled triangle at `tip` pointing along unit `dir`
    const bx = tip[0] - dir[0] * size, by = tip[1] - dir[1] * size, nx = -dir[1] * size * 0.45, ny = dir[0] * size * 0.45;
    return `M${f2(tip[0])} ${f2(tip[1])}L${f2(bx + nx)} ${f2(by + ny)}L${f2(bx - nx)} ${f2(by - ny)}Z`;
  };
  const arrowD = (a, b, head) => {   // shaft + tip as one path (the open shaft has no area, so fill only paints the tip)
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9, h = Math.min(head, 0.45 * L), ux = dx / L, uy = dy / L;
    const bx = b[0] - ux * h, by = b[1] - uy * h;
    return `M${f2(a[0])} ${f2(a[1])}L${f2(bx)} ${f2(by)}M${f2(b[0])} ${f2(b[1])}L${f2(bx - uy * h * 0.5)} ${f2(by + ux * h * 0.5)}L${f2(bx + uy * h * 0.5)} ${f2(by - ux * h * 0.5)}Z`;
  };

  // ── one axis: values ↔ 0..1 along its range ─────────────────────────────
  const spec = (range, cfg = {}) => {
    const [a, b] = range, log = cfg.scale === 'log', base = cfg.base ?? 10;
    const exp = (v) => (log ? Math.log(v) / Math.log(base) : v), val = (e) => (log ? Math.pow(base, e) : e);
    const frac = (v) => (exp(v) - a) / (b - a), fromFrac = (p) => val(a + p * (b - a));
    const ticks = M.ticks(range);   // in exponent space for log
    const label = cfg.labels || ((e) => (log ? null : fmtN(+(+e).toFixed(cfg.decimals ?? 10))));
    return { range, log, base, frac, fromFrac, ticks, val, label, cross: log ? Math.pow(base, a) : K.clamp(0, a, b) };
  };
  const superLabel = (parent, base, e, x, y, anchor, style) => {   // 10^e as text with a raised exponent
    const t = svgEl('text', parent, style, { x: f2(x), y: f2(y), 'text-anchor': anchor });
    t.appendChild(document.createTextNode(String(base)));
    const s = svgEl('tspan', t, { fontSize: '70%' }, { dy: f2(-10 * u) }); s.textContent = fmtN(e);
    return t;
  };

  // ── axes ─────────────────────────────────────────────────────────────────
  M.axes2 = (o = {}) => {
    const s = K.safe, xr = o.x || [-5, 5, 1], yr = o.y || [-3, 3, 1], t0 = o.in ?? 0, t1 = t0 + (o.draw ?? K.dur(0.8)), tipSize = 18 * u;
    const box = o.box || (o.length ? { x: s.x + (s.w - o.length[0]) / 2, y: s.y + (s.h - o.length[1]) / 2, w: o.length[0], h: o.length[1] }
      : { x: s.x + 70 * u, y: s.y + 10 * u, w: s.w - 100 * u, h: s.h - 70 * u });
    const xc = { tip: o.tips ?? true, ticks: true, numbers: o.numbers ?? true, ...o.xAxis }, yc = { tip: o.tips ?? true, ticks: true, numbers: o.numbers ?? true, ...o.yAxis };
    const X = spec(xr, xc), Y = spec(yr, yc);
    const c2p = (x, y = Y.val(yr[0])) => [box.x + X.frac(x) * box.w, box.y + box.h - Y.frac(y) * box.h];
    const p2c = (px, py) => [X.fromFrac((px - box.x) / box.w), Y.fromFrac((box.y + box.h - py) / box.h)];
    const svg = stageSvg(o.parent), col = o.color || 'var(--kit-ink)';
    const line = { fill: 'none', stroke: col, strokeWidth: (o.width ?? 3) * u, strokeLinecap: 'round' };
    const xAt = box.y + box.h - Y.frac(Y.cross) * box.h, yAt = box.x + X.frac(X.cross) * box.w;   // where the axes cross, in px
    const xLine = svgEl('path', svg, line, { d: `M${f2(box.x)} ${f2(xAt)}L${f2(box.x + box.w)} ${f2(xAt)}` });
    const yLine = svgEl('path', svg, line, { d: `M${f2(yAt)} ${f2(box.y + box.h)}L${f2(yAt)} ${f2(box.y)}` });
    const tips = [];
    if (xc.tip) tips.push(svgEl('path', svg, { fill: col }, { d: tri([box.x + box.w + tipSize * 0.6, xAt], [1, 0], tipSize) }));
    if (yc.tip) tips.push(svgEl('path', svg, { fill: col }, { d: tri([yAt, box.y - tipSize * 0.6], [0, -1], tipSize) }));
    const marks = svgEl('g', svg, { stroke: col, strokeWidth: (o.width ?? 3) * u });
    const text = svgEl('g', svg, { fill: 'var(--kit-muted)', fontFamily: 'var(--kit-font-text)', fontSize: 26 * u + 'px' });
    const tk = 10 * u, labelled = { x: new Set(), y: new Set() };
    const number = (axis, e, v, px, py, anchor, dx, dy, cfg, key) => {
      if (labelled[key].has(e)) return; labelled[key].add(e);
      if (axis.log && !cfg.labels) superLabel(text, axis.base, e, px + dx, py + dy, anchor, {});
      else { const l = axis.label(e, v); if (l != null) svgEl('text', text, {}, { x: f2(px + dx), y: f2(py + dy), 'text-anchor': anchor }).textContent = l; }
    };
    const skip = (cfg, e) => (cfg.numbersToExclude || []).includes(e);
    const drawTicks = (axis, cfg, horizontal) => {
      if (!cfg.ticks) return;
      for (const e of axis.ticks) {
        const v = axis.val(e), h = tk * ((cfg.elongated || []).includes(v) ? cfg.longer ?? 1.5 : 1), p = axis.frac(v);
        const px = horizontal ? box.x + p * box.w : yAt, py = horizontal ? xAt : box.y + box.h - p * box.h;
        svgEl('path', marks, {}, { d: horizontal ? `M${f2(px)} ${f2(py - h)}L${f2(px)} ${f2(py + h)}` : `M${f2(px - h)} ${f2(py)}L${f2(px + h)} ${f2(py)}` });
      }
    };
    drawTicks(X, xc, true); drawTicks(Y, yc, false);
    const addNumbers = (axis, cfg, horizontal, only) => {
      for (const e of axis.ticks) {
        const v = axis.val(e);
        if (skip(cfg, e) || (only && !only.includes(v) && !only.includes(e))) continue;
        if (!horizontal && !axis.log && Math.abs(e) < 1e-9 && !X.log && Math.abs(X.cross) < 1e-9) continue;   // the origin is numbered once, by the x axis
        if (horizontal) number(axis, e, v, box.x + axis.frac(v) * box.w, xAt, 'middle', 0, tk + 30 * u, cfg, 'x');
        else number(axis, e, v, yAt, box.y + box.h - axis.frac(v) * box.h, 'end', -tk - 10 * u, 9 * u, cfg, 'y');
      }
    };
    if (xc.numbers) addNumbers(X, xc, true); if (yc.numbers) addNumbers(Y, yc, false);
    const ends = { x: [box.x + box.w, xAt], y: [yAt, box.y] };
    const api = { el: svg, x: xr, y: yr, box, c2p, p2c, xAxis: { n2p: (v) => c2p(v)[0], p2n: (px) => X.fromFrac((px - box.x) / box.w) },
      yAxis: { n2p: (v) => c2p(undefined, v)[1], p2n: (py) => Y.fromFrac((box.y + box.h - py) / box.h) },
      addCoordinates(sel = {}) {
        const pick = (c) => (c === true || c == null ? null : c);
        addNumbers(X, xc, true, pick(sel.x)); addNumbers(Y, yc, false, pick(sel.y)); return api;
      },
      getAxisLabels(xl = 'x', yl = 'y') {
        const st = { fill: col, fontFamily: 'var(--kit-font-text)', fontSize: 30 * u + 'px', fontStyle: 'italic' };
        const lx = svgEl('text', svg, st, { x: f2(ends.x[0] + 38 * u), y: f2(ends.x[1] + 10 * u), 'text-anchor': 'start' }), ly = svgEl('text', svg, st, { x: f2(ends.y[0] + 18 * u), y: f2(ends.y[1] - 18 * u), 'text-anchor': 'start' });
        lx.textContent = xl; ly.textContent = yl; labelEls.push(lx, ly);
        return { x: lx, y: ly };
      },
      set(t, p) {
        p = p ?? K.ease(K.seg(t, t0, t1));
        K.show(svg, p > 0 ? fade(o, t) : 0);
        K.doodle.drawOn(xLine, p); K.doodle.drawOn(yLine, p);
        tips.forEach((e) => { e.style.opacity = String(K.seg(p, 0.7, 1)); });
        marks.style.opacity = p; text.style.opacity = K.seg(p, 0.4, 1);
        labelEls.forEach((e) => { e.style.opacity = String(K.seg(p, 0.6, 1)); });
      } };
    const labelEls = [];
    return api;
  };

  // ── number line ──────────────────────────────────────────────────────────
  M.numberLine2 = (o = {}) => {
    const s = K.safe, range = o.range || [-5, 5, 1], t0 = o.in ?? 0, t1 = t0 + (o.draw ?? K.dur(0.8)), tipSize = 18 * u, col = o.color || 'var(--kit-ink)';
    const box = o.box || (o.length ? { x: s.x + (s.w - o.length) / 2, y: s.y + s.h / 2, w: o.length, h: 0 } : { x: s.x + 40 * u, y: s.y + s.h / 2, w: s.w - 80 * u, h: 0 });
    const A = spec(range, { scale: o.scale, base: o.base, decimals: o.decimals, labels: o.numberFormat }), svg = stageSvg(o.parent);
    const n2p = (v) => [box.x + A.frac(v) * box.w, box.y], p2n = (px) => A.fromFrac((px - box.x) / box.w);
    const lineStyle = { fill: 'none', stroke: col, strokeWidth: (o.width ?? 3) * u, strokeLinecap: 'round' };
    const line = svgEl('path', svg, lineStyle, { d: `M${f2(box.x)} ${f2(box.y)}L${f2(box.x + box.w)} ${f2(box.y)}` });
    const tip = (o.tip ?? false) ? svgEl('path', svg, { fill: col }, { d: tri([box.x + box.w + tipSize * 0.6, box.y], [1, 0], tipSize) }) : null;
    const marks = svgEl('g', svg, { stroke: col, strokeWidth: (o.width ?? 3) * u }), text = svgEl('g', svg, { fill: 'var(--kit-muted)', fontFamily: 'var(--kit-font-text)', fontSize: 26 * u + 'px' });
    const tk = 10 * u, elong = o.elongated || [], custom = o.labels || null, showNums = o.numbers ?? !custom;
    for (const e of A.ticks) {
      const v = A.val(e), h = tk * (elong.includes(v) ? o.longer ?? 1.5 : 1), [px] = n2p(v);
      svgEl('path', marks, {}, { d: `M${f2(px)} ${f2(box.y - h)}L${f2(px)} ${f2(box.y + h)}` });
      const key = Object.keys(custom || {}).find((k) => Math.abs(+k - v) < 1e-9);
      if (key != null) svgEl('text', text, {}, { x: f2(px), y: f2(box.y + h + 30 * u), 'text-anchor': 'middle' }).textContent = custom[key];
      else if (showNums && (!o.onlyElongated || elong.includes(v))) { if (A.log) superLabel(text, A.base, e, px, box.y + h + 30 * u, 'middle', {}); else svgEl('text', text, {}, { x: f2(px), y: f2(box.y + h + 30 * u), 'text-anchor': 'middle' }).textContent = A.label(e); }
    }
    const extra = [];
    return { el: svg, x: range, box, c2p: (x) => n2p(x), n2p, p2n,
      bracket(a, b, bo = {}) {   // a brace under (or over) the stretch a → b with an optional label
        if (!M.shape) throw new Error('KIT.math.numberLine2.bracket: load tools/math2.js first');
        const side = bo.side ?? 1, pa = n2p(a), pb = n2p(b), depth = (bo.depth ?? 28) * u;
        const d = M.shape.brace(pa, pb, { depth, side }), g = svgEl('g', svg, { opacity: 0 }), path = svgEl('path', g, { fill: 'none', stroke: bo.color || 'var(--kit-accent)', strokeWidth: 3 * u, strokeLinecap: 'round' }, { d });
        let lab = null;
        if (bo.label) { lab = svgEl('text', g, { fill: bo.color || 'var(--kit-accent)', fontFamily: 'var(--kit-font-text)', fontSize: 28 * u + 'px' }, { x: f2((pa[0] + pb[0]) / 2), y: f2(box.y + side * (depth + 40 * u)), 'text-anchor': 'middle' }); lab.textContent = bo.label; }
        const h = { el: g, path, label: lab, set(t) { const p = K.ease(K.seg(t, bo.in ?? t1, (bo.in ?? t1) + K.dur(0.6))); g.style.opacity = String(p); K.doodle.drawOn(path, p); } };
        extra.push(h); return h;
      },
      set(t, p) {
        p = p ?? K.ease(K.seg(t, t0, t1));
        K.show(svg, p > 0 ? fade(o, t) : 0);
        K.doodle.drawOn(line, p); if (tip) tip.style.opacity = String(K.seg(p, 0.7, 1));
        marks.style.opacity = p; text.style.opacity = K.seg(p, 0.4, 1);
        extra.forEach((h) => h.set(t));
      } };
  };
  M.unitInterval = (o = {}) => M.numberLine2({ range: [0, 1, 0.1], elongated: [0, 1], decimals: 1, onlyElongated: true, ...o });

  M.slider = (nl, value, o = {}) => {
    const g = svgEl('g', nl.el), r = (o.r ?? 12) * u, [lo, hi] = [nl.x[0], nl.x[1]], dec = o.decimals ?? 1, vf = typeof value === 'function' ? value : () => value;
    const knob = svgEl('circle', g, { fill: o.color || 'var(--kit-accent)', stroke: 'var(--kit-bg)', strokeWidth: 2 * u }, { r: f2(r), cy: f2(nl.box.y) });
    const lab = o.label === false ? null : svgEl('text', g, { fill: o.color || 'var(--kit-accent)', fontFamily: 'var(--kit-font-text)', fontSize: 26 * u + 'px' }, { 'text-anchor': 'middle', y: f2(nl.box.y - r - 14 * u) });
    const valueAt = (t) => K.clamp(vf(t), Math.min(lo, hi), Math.max(lo, hi));
    return { el: g, knob, label: lab, valueAt, set(t) {
      const v = valueAt(t);
      knob.setAttribute('cx', f2(nl.n2p(v)[0]));
      if (lab) { lab.setAttribute('x', f2(nl.n2p(v)[0])); lab.textContent = fmtN(v.toFixed(dec)); }
    } };
  };

  // ── BarChart ─────────────────────────────────────────────────────────────
  const PALETTE = ['#003f5c', '#58508d', '#bc5090', '#ff6361', '#ffa600'];
  M.bars = (values, o = {}) => {
    const n = values.length, hi = Math.max(0, ...values), lo = Math.min(0, ...values), ys = o.yRange || [lo, Math.max(hi * 1.1, 1), Math.max(1, Math.ceil((hi - lo) / 5))];
    const t0 = o.in ?? 0, draw = o.draw ?? K.dur(0.8), step = o.step ?? K.staggerStep, bw = o.barWidth ?? 0.6, colors = o.colors || PALETTE;
    const ax = M.axes2({ x: [0, n, 1], y: ys, box: o.box, tips: o.tips ?? false, in: t0, draw, parent: o.parent, xAxis: { numbers: false, ticks: false }, yAxis: { numbersToExclude: [] }, out: o.out });
    const g = svgEl('g', ax.el), changes = [], u0 = ax.c2p(0, 0)[1];
    const barEls = values.map((_, i) => {
      const c = colors[i % colors.length], el = svgEl('rect', g, { fill: c, fillOpacity: o.fillOpacity ?? 0.7, stroke: c, strokeWidth: 3 * u });
      const label = o.valueLabels ? svgEl('text', g, { fill: 'var(--kit-ink)', fontFamily: 'var(--kit-font-text)', fontSize: 26 * u + 'px' }, { 'text-anchor': 'middle' }) : null;
      return { el, label };
    });
    if (o.names) o.names.forEach((nm, i) => { svgEl('text', ax.el, { fill: 'var(--kit-muted)', fontFamily: 'var(--kit-font-text)', fontSize: 26 * u + 'px' },
      { x: f2(ax.c2p(i + 0.5, 0)[0]), y: f2(u0 + 40 * u), 'text-anchor': 'middle' }).textContent = nm; });
    // values over time: a chain of tweens from the last values to the new ones
    const valuesAt = (t) => {
      let cur = values.slice();
      for (const c of changes) { const p = K.ease(K.seg(t, c.in, c.in + c.dur)); if (t < c.in) break; cur = cur.map((v, i) => K.lerp(v, c.to[i], p)); if (p < 1) break; }
      return cur;
    };
    const braces = [];
    const api = { axes: ax, bars: barEls, valuesAt,
      change(vals, co = {}) { changes.push({ to: vals, in: co.in ?? 0, dur: co.dur ?? K.dur(0.8) }); changes.sort((a, b) => a.in - b.in); return api; },
      brace(i, j, label, bo = {}) {
        if (!M.shape) throw new Error('KIT.math.bars.brace: load tools/math2.js first');
        const top = Math.max(...values.slice(i, j + 1)), y = ax.c2p(0, top)[1] - 10 * u, pa = [ax.c2p(i + (1 - bw) / 2, 0)[0], y], pb = [ax.c2p(j + (1 + bw) / 2, 0)[0], y];
        const bg = svgEl('g', ax.el, { opacity: 0 }), path = svgEl('path', bg, { fill: 'none', stroke: 'var(--kit-ink)', strokeWidth: 3 * u, strokeLinecap: 'round' }, { d: M.shape.brace(pa, pb, { depth: 24 * u, side: -1 }) });
        const lab = svgEl('text', bg, { fill: 'var(--kit-ink)', fontFamily: 'var(--kit-font-text)', fontSize: 28 * u + 'px' }, { x: f2((pa[0] + pb[0]) / 2), y: f2(y - 24 * u - 14 * u), 'text-anchor': 'middle' }); lab.textContent = label;
        const h = { path, label: lab, set(t) { const p = K.ease(K.seg(t, bo.in ?? t0 + draw + 0.5, (bo.in ?? t0 + draw + 0.5) + K.dur(0.6))); bg.style.opacity = String(p); K.doodle.drawOn(path, p); } };
        braces.push(h); return h;
      },
      set(t) {
        ax.set(t);
        const vals = valuesAt(t);
        barEls.forEach((b, i) => {
          const p = K.ease(K.seg(t, t0 + draw + i * step, t0 + draw + i * step + K.dur(0.5))), v = vals[i] * p, x0 = ax.c2p(i + (1 - bw) / 2, 0)[0], x1 = ax.c2p(i + (1 + bw) / 2, 0)[0], y = ax.c2p(0, v)[1], yb = ax.c2p(0, 0)[1];
          b.el.setAttribute('x', f2(x0)); b.el.setAttribute('width', f2(x1 - x0)); b.el.setAttribute('y', f2(Math.min(y, yb))); b.el.setAttribute('height', f2(Math.abs(yb - y)));
          b.el.style.visibility = p > 0 ? '' : 'hidden';
          if (b.label) { b.label.setAttribute('x', f2((x0 + x1) / 2)); b.label.setAttribute('y', f2(v >= 0 ? y - 10 * u : y + 30 * u)); b.label.textContent = fmtN(+vals[i].toFixed(2)); b.label.style.opacity = String(p); }
        });
        braces.forEach((h) => h.set(t));
      } };
    return api;
  };

  // ── SampleSpace ──────────────────────────────────────────────────────────
  const space = (parent, r, o, depth = 0) => {
    const rect = svgEl('rect', parent, { fill: o.color || 'var(--kit-muted)', fillOpacity: o.opacity ?? 0.3, stroke: o.stroke || 'var(--kit-ink)', strokeWidth: 3 * u },
      { x: f2(r.x), y: f2(r.y), width: f2(r.w), height: f2(r.h) });
    const kids = [], decos = [];
    const sp = { rect, r, parts: kids,
      divide(props, d = {}) {
        const ps = Array.isArray(props) ? props : [props, 1 - props];
        const dir = d.dir || 'h', t0 = d.in ?? 0, dur = d.dur ?? K.dur(0.8), colors = d.colors || ['var(--kit-accent)', 'var(--kit-accent-2)', 'var(--kit-ink)'], labels = d.labels || [];
        let cur = 0; const group = [];
        ps.forEach((p, i) => {
          const sub = dir === 'h' ? { x: r.x + cur * r.w, y: r.y, w: p * r.w, h: r.h } : { x: r.x, y: r.y + cur * r.h, w: r.w, h: p * r.h };
          cur += p;
          const child = space(parent, sub, { color: colors[i % colors.length], opacity: 0.55, stroke: colors[i % colors.length] }, depth + 1);
          let lab = null, br = null, brLab = null;
          if (labels[i] != null) {
            lab = svgEl('text', parent, { fill: 'var(--kit-ink)', fontFamily: 'var(--kit-font-text)', fontSize: 28 * u + 'px', opacity: 0 }, { x: f2(sub.x + sub.w / 2), y: f2(sub.y + sub.h / 2 + 9 * u), 'text-anchor': 'middle' });
            lab.textContent = labels[i];
          }
          if ((d.braces ?? true) && M.shape) {
            const pa = dir === 'h' ? [sub.x, sub.y] : [sub.x, sub.y + sub.h], pb = dir === 'h' ? [sub.x + sub.w, sub.y] : [sub.x, sub.y], dp = 22 * u;
            br = svgEl('path', parent, { fill: 'none', stroke: colors[i % colors.length], strokeWidth: 3 * u, strokeLinecap: 'round', opacity: 0 }, { d: M.shape.brace(pa, pb, { depth: dp, side: dir === 'h' ? -1 : 1 }) });
            brLab = svgEl('text', parent, { fill: colors[i % colors.length], fontFamily: 'var(--kit-font-text)', fontSize: 26 * u + 'px', opacity: 0 },
              { x: f2(dir === 'h' ? sub.x + sub.w / 2 : sub.x - dp - 14 * u), y: f2(dir === 'h' ? sub.y - dp - 12 * u : sub.y + sub.h / 2 + 9 * u), 'text-anchor': dir === 'h' ? 'middle' : 'end' });
            brLab.textContent = String(+p.toFixed(3));
          }
          const part = { rect: child.rect, labelEl: lab, space: child, brace: br, braceLabel: brLab, p };
          group.push(part); kids.push(part);
          decos.push((t) => {
            const a = K.ease(K.seg(t, t0 + i * K.staggerStep, t0 + i * K.staggerStep + dur));
            child.rect.style.opacity = String(a); child.rect.style.visibility = a > 0 ? '' : 'hidden';
            [lab, br, brLab].forEach((e) => { if (e) e.style.opacity = String(K.seg(a, 0.5, 1)); });
            if (br) K.doodle.drawOn(br, K.seg(a, 0.3, 1));
            child.set(t);
          });
        });
        return group;
      },
      set(t) { decos.forEach((f) => f(t)); } };
    return sp;
  };
  M.sampleSpace = (o = {}) => {
    const s = K.safe, r = { x: o.x ?? s.x + s.w * 0.25, y: o.y ?? s.y + s.h * 0.2, w: o.w ?? s.w * 0.5, h: o.h ?? s.h * 0.6 }, svg = stageSvg(o.parent);
    return Object.assign(space(svg, r, o), { el: svg });
  };

  // ── VectorScene / LinearTransformationScene ──────────────────────────────
  const mul = (m, [x, y]) => [m[0][0] * x + m[0][1] * y, m[1][0] * x + m[1][1] * y];
  M.vectorScene = (o = {}) => {
    if (!M.plane) throw new Error('KIT.math.vectorScene: load tools/plot2.js first');
    const plane = o.plane && o.plane.c2p ? o.plane : M.plane({ labels: false, clip: true, in: o.in, ...o.plane }), vectors = [], warps = [];
    const sc = {
      plane, vectors, warps,
      applyMatrix(m, wo = {}) {
        const w = M.warp(plane, m, { kind: 'matrix', in: wo.in ?? 0, dur: wo.dur ?? K.dur(1.5) });
        const prev = warps.length ? warps[warps.length - 1].cum : [[1, 0], [0, 1]];
        const cum = [[m[0][0] * prev[0][0] + m[0][1] * prev[1][0], m[0][0] * prev[0][1] + m[0][1] * prev[1][1]], [m[1][0] * prev[0][0] + m[1][1] * prev[1][0], m[1][0] * prev[0][1] + m[1][1] * prev[1][1]]];
        warps.push({ w, m, cum, prev }); return w;
      },
      // the point v (math coords) as it is at time t: carried by every warp so far
      carried(v, t) {
        let pos = v;
        for (const { w, m } of warps) { const p = w.progress(t); if (p <= 0) break; const to = mul(m, pos); if (p < 1) return [K.lerp(pos[0], to[0], p), K.lerp(pos[1], to[1], p)]; pos = to; }
        return pos;
      },
      addVector(v, vo = {}) {
        const color = vo.color || '#F4D345', from = vo.from || [0, 0], t0 = vo.in ?? 0, g = svgEl('g', plane.el);
        const arrow = svgEl('path', g, { fill: color, stroke: color, strokeWidth: 5 * u, strokeLinejoin: 'round', strokeLinecap: 'round' });
        let lab = null;
        if (vo.label) { lab = svgEl('text', g, { fill: color, fontFamily: 'var(--kit-font-text)', fontSize: 30 * u + 'px', fontStyle: 'italic' }, { 'text-anchor': 'middle' }); lab.textContent = vo.label === true ? '' : vo.label; }
        const h = { el: g, arrow, label: lab, v, tipAt: (t) => sc.carried(v, t),
          set(t) {
            const grow = K.ease(K.seg(t, t0, t0 + K.dur(0.6))), tip = sc.carried(v, t), a = plane.c2p(...from), b = plane.c2p(from[0] + (tip[0] - from[0]) * grow, from[1] + (tip[1] - from[1]) * grow);
            K.show(g, grow > 0 ? 1 : 0);
            arrow.setAttribute('d', arrowD(a, b, 18 * u));
            if (lab) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; lab.setAttribute('x', f2(b[0] + (dx / L) * 26 * u)); lab.setAttribute('y', f2(b[1] + (dy / L) * 26 * u + 9 * u)); }
          } };
        vectors.push(h); return h;
      },
      set(t) {
        plane.set(t);
        warps.forEach(({ w }) => w.set(t));
        vectors.forEach((v) => v.set(t));
        (sc.extras || []).forEach((e) => e.set(t));
      } };
    return sc;
  };

  M.linearScene = (matrix, o = {}) => {
    const sc = M.vectorScene(o), t0 = o.in ?? 0, dur = o.dur ?? K.dur(1.5), extras = (sc.extras = []);
    const w = sc.applyMatrix(matrix, { in: t0, dur });
    const basis = o.basis === false ? null : M.basis(sc.plane, w, { out: o.out });
    if (basis) extras.push(basis);
    let mlabel = null;
    if (o.matrixLabel) {
      if (!M.matrix) throw new Error('KIT.math.linearScene: matrixLabel needs tools/manim-grid.js');
      const mo = typeof o.matrixLabel === 'object' ? o.matrixLabel : {}, s = K.safe;
      mlabel = M.matrix(matrix, { kind: matrix.flat().every(Number.isInteger) ? 'integer' : 'decimal', size: 40, x: s.x + s.w * 0.12, y: s.y + s.h * 0.12, in: Math.max(0, t0 - K.dur(0.8)), ...mo });
      extras.push(mlabel);
    }
    sc.warp = w; sc.basis = basis; sc.matrixLabel = mlabel;
    sc.addTransformableLabel = (vec, text, lo = {}) => {
      const color = lo.color || vec.arrow.style.fill, mk = () => svgEl('text', vec.el, { fill: color, fontFamily: 'var(--kit-font-text)', fontSize: 30 * u + 'px', fontStyle: 'italic' }, { 'text-anchor': 'middle' });
      const a = mk(), b = mk(); a.textContent = text; b.textContent = lo.newText ?? `L(${text})`;
      if (vec.label) vec.label.style.display = 'none';   // the transformable label replaces a plain one
      const h = { before: a, after: b, set(t) {
        const tip = sc.plane.c2p(...vec.tipAt(t)), o0 = sc.plane.c2p(0, 0), dx = tip[0] - o0[0], dy = tip[1] - o0[1], L = Math.hypot(dx, dy) || 1, x = tip[0] + (dx / L) * 28 * u, y = tip[1] + (dy / L) * 28 * u + 9 * u;
        const p = w.progress(t);
        for (const e of [a, b]) { e.setAttribute('x', f2(x)); e.setAttribute('y', f2(y)); }
        a.style.opacity = String(1 - K.seg(p, 0.35, 0.55)); b.style.opacity = String(K.seg(p, 0.55, 0.75));
      } };
      extras.push(h); return h;
    };
    return sc;
  };
})();
