// Math, part 2: planes, curves, calculus, grid warps and vector fields on KIT.math. Load after engine.js, doodle.js, math.js.
// Semantics follow Manim Community Edition (MIT, github.com/ManimCommunity/manim): NumberPlane / PolarPlane / ComplexPlane,
// plot(discontinuities), plot_parametric_curve, plot_polar_graph, ImplicitFunction, get_area, get_riemann_rectangles,
// get_secant_slope_group, TangentLine, get_vertical_line, get_T_label, input_to_graph_point, ApplyPointwiseFunction / ApplyMatrix /
// ApplyComplexFunction / Homotopy, LinearTransformationScene's basis vectors, ArrowVectorField, StreamLines, AnimatedStreamLines.
// No Manim code is copied. Built once at load; every .set(t) writes only from t. Coordinates in and out are stage px.
//   plane({ x, y, box, faded, kind, labels, clip, color, samples, in, draw, out }) → { el, kind, x, y, box, c2p, p2c, lines, set(t, p?) }
//       kind 'number' (default) | 'complex' (+ n2p(z), p2n(px, py); z a number, [re, im] or { re, im }) |
//       'polar' (+ pr2p(r, θ), p2pr(px, py) → [r, θ]; r: [rMax, step], azimuth: spokes per turn, default 12)
//       faded = faded sub-lines between two major lines (default 1); clip = hide what leaves the box (for warps)
//   plot2(ax, f, { x, samples, discontinuities, clip, ... })   like plot(): { el, progress, pointAt, set }; breaks at listed x and non-finite f
//   parametric(ax, f(u) → [x, y], { u: [u0, u1], samples })    same return
//   polar(ax, r(θ), { theta: [θ0, θ1], samples })              same return
//   implicit(ax, F(x, y), { x, y, res })                       F = 0 by marching squares (cells ≤ res wide); + paths (math coords), res
//   point(ax, f, x)                                             stage px of (x, f(x))   (input_to_graph_point)
//   area(ax, f, [a, b], { bounded: g, color, opacity })         region between f and g (default y = 0), swept in left to right
//   riemann(ax, f, [a, b], { dx, mode, step, color, opacity })  mode 'left' | 'right' | 'mid'; + bars [{ x0, x1, h }], sum; bars grow from y = 0, staggered
//   secant(ax, f, x, dx, { length, dxLabel, dyLabel })          secant line (length px) + dx / dy legs; + slope
//   tangent(ax, f, x, { length, h })                            x may be a function of t (a sliding tangent); + slope(x)
//   vline(ax, f, x)                                             dashed line from y = 0 up to the graph, grows in; x may be a function of t
//   tLabel(ax, f, x, text)                                      triangle on the x axis, text below it, vline to the graph; x may be a function of t
//   warp(plane, fn, { in, dur, kind })                          kind 'pointwise' fn([x, y]) → [x, y] | 'matrix' fn = [[a, b], [c, d]] |
//       'complex' fn({ re, im }) → { re, im } | 'homotopy' fn([x, y], p) → [x, y]; → { kind, matrix, in, at(p), progress(t), set(t) }
//   basis(plane, matrixOrWarp, { in, dur, show, colors })       î / ĵ arrows from the origin, moved by the same matrix (and warp timing)
//   field(ax, F(x, y) → [u, v], { step, scale, colorByMagnitude, maxMag })  arrows centred on a grid; + arrows [{ x, y, u, v, m }]
//   streamLines(ax, F, { seeds | n + seed, dt, steps, in, dur, flow, colorByMagnitude })  + lines (math coords)
//       integrated once at creation (RK4, fixed dt, forward only, stops at the axes' range); drawn on over [in, in + dur];
//       flow: true | { dash, speed } (px, px/s at 1080) then runs a dash along each line as a pure function of t (AnimatedStreamLines)
// Timing as math.js: in = start, draw = how long (warp/basis/streamLines: dur), out = when it has left (0.45 s fade with KIT.easeIn).
// Limits: plane labels and ticks do not follow a warp (use labels: false); warps on one plane chain (each starts from the last
// one's result) and their set(t) must be called in creation order; basis assumes it starts from the identity.
'use strict';
(function () {
  const K = window.KIT, M = K.math, SVG = 'http://www.w3.org/2000/svg';
  if (!M || !M.polyline) throw new Error('tools/plot2.js: load tools/math.js first');

  const svgEl = (tag, parent, style = {}, attrs = {}) => {
    const e = document.createElementNS(SVG, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    Object.assign(e.style, style);   // style, not presentation attributes: those don't resolve var(--kit-…)
    if (parent) parent.appendChild(e);
    return e;
  };
  const fade = (o, t) => (o.out == null ? 1 : 1 - K.easeIn(K.seg(t, o.out - K.dur(0.45), o.out)));
  const win = (o, d) => { const t0 = o.in ?? 0, t1 = t0 + (o.draw ?? K.dur(d)); return (t) => K.ease(K.seg(t, t0, t1)); };
  const xt = (x) => (typeof x === 'function' ? x : () => x);
  const fmt = (v) => String(v).replace('-', '−');
  const stroke = (o, w) => ({ fill: 'none', stroke: o.color || 'var(--kit-accent)', strokeWidth: (o.width ?? w) * K.u, strokeLinecap: 'round', strokeLinejoin: 'round' });
  const clips = new WeakMap();
  let nClip = 0;
  const clipUrl = (svg, box) => {
    let id = clips.get(svg);
    if (!id) {
      id = 'kit-plot2-clip-' + ++nClip;
      svgEl('rect', svgEl('clipPath', svg, {}, { id }), {}, { x: box.x, y: box.y, width: box.w, height: box.h });
      clips.set(svg, id);
    }
    return `url(#${id})`;
  };
  // a line a → b with a filled triangular tip at b (one path: the open shaft has no area, so fill only paints the tip)
  const arrowD = (a, b, head) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9, h = Math.min(head, 0.45 * L), ux = dx / L, uy = dy / L;
    const bx = b[0] - ux * h, by = b[1] - uy * h, f = (v) => +v.toFixed(2);
    return `M${f(a[0])} ${f(a[1])}L${f(bx)} ${f(by)}M${f(b[0])} ${f(b[1])}L${f(bx - uy * h * 0.5)} ${f(by + ux * h * 0.5)}L${f(bx + uy * h * 0.5)} ${f(by - ux * h * 0.5)}Z`;
  };
  // Manim's default vector-field colours (BLUE_E, GREEN_C, YELLOW_D, RED_C), low to high magnitude
  const MAG = ['#1C758A', '#83C167', '#F4D345', '#FC6255'].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  const magColor = (k) => {
    k = K.clamp(k) * (MAG.length - 1);
    const i = Math.min(MAG.length - 2, Math.floor(k)), f = k - i;
    return `rgb(${MAG[i].map((v, j) => Math.round(K.lerp(v, MAG[i + 1][j], f))).join(',')})`;
  };

  // ── planes ───────────────────────────────────────────────────────────────
  M.plane = (o = {}) => {
    const kind = o.kind || 'number', s = K.safe, u = K.u;
    const xr = o.x || (kind === 'polar' ? [-4, 4, 1] : [-7, 7, 1]), yr = o.y || [-4, 4, 1];
    const sx = xr[1] - xr[0], sy = yr[1] - yr[0], unit = Math.min(s.w / sx, s.h / sy);   // default box: equal units, centred in KIT.safe
    const box = o.box || { x: s.x + (s.w - sx * unit) / 2, y: s.y + (s.h - sy * unit) / 2, w: sx * unit, h: sy * unit };
    const c2p = M.coords(xr, yr, box), p2c = (px, py) => [xr[0] + ((px - box.x) / box.w) * sx, yr[0] + ((box.y + box.h - py) / box.h) * sy];
    const dOf = (pts) => M.polyline(pts.map((q) => (Number.isFinite(q[0]) && Number.isFinite(q[1]) ? c2p(q[0], q[1]) : null))).d;
    const svg = svgEl('svg', o.parent || K.stage, { position: 'absolute', left: '0', top: '0', overflow: 'visible', pointerEvents: 'none' },
      { width: K.W_, height: K.H_, class: 'kit-math' });
    const lg = svgEl('g', svg), color = o.color || 'var(--kit-accent)';
    if (o.clip) lg.setAttribute('clip-path', clipUrl(svg, box));
    const groups = { faded: svgEl('g', lg, { opacity: 0.3 }), major: svgEl('g', lg, { opacity: 0.7 }), axis: svgEl('g', lg) };
    const width = { faded: 1.2 * u, major: 2 * u, axis: 3 * u };
    const n = o.samples ?? 64, k = (o.faded ?? 1) + 1, lines = [];
    const add = (cls, pts) => lines.push({ cls, pts, el: svgEl('path', groups[cls], { fill: 'none', stroke: cls === 'axis' ? 'var(--kit-ink)' : color,
      strokeWidth: width[cls], strokeLinecap: 'round' }, { d: dOf(pts) }) });
    const seg = (a, b) => Array.from({ length: n + 1 }, (_, i) => [K.lerp(a[0], b[0], i / n), K.lerp(a[1], b[1], i / n)]);
    const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-6;
    let rMax = 0, rStep = 1;
    if (kind === 'polar') {
      [rMax, rStep] = o.r || [Math.min(-xr[0], xr[1], -yr[0], yr[1]), xr[2]];
      const az = o.azimuth ?? 12;
      for (let i = 1; (i * rStep) / k <= rMax + 1e-9; i++) {
        const r = (i * rStep) / k;
        add(i % k ? 'faded' : 'major', Array.from({ length: 2 * n + 1 }, (_, j) => [r * Math.cos((j / n) * Math.PI), r * Math.sin((j / n) * Math.PI)]));
      }
      for (let i = 0; i < az; i++) {
        const a = (2 * Math.PI * i) / az;
        if (Math.abs(Math.sin(2 * a)) > 1e-9) add('major', seg([0, 0], [rMax * Math.cos(a), rMax * Math.sin(a)]));   // spokes on the axes are the axes
      }
      add('axis', seg([-rMax, 0], [rMax, 0])); add('axis', seg([0, -rMax], [0, rMax]));
    } else {
      const axes = [];
      for (const x of M.ticks([xr[0], xr[1], xr[2] / k]))
        Math.abs(x) < 1e-9 ? axes.push(seg([x, yr[0]], [x, yr[1]])) : add(isInt(x / xr[2]) ? 'major' : 'faded', seg([x, yr[0]], [x, yr[1]]));
      for (const y of M.ticks([yr[0], yr[1], yr[2] / k]))
        Math.abs(y) < 1e-9 ? axes.push(seg([xr[0], y], [xr[1], y])) : add(isInt(y / yr[2]) ? 'major' : 'faded', seg([xr[0], y], [xr[1], y]));
      for (const a of axes) add('axis', a);
    }
    const text = svgEl('g', svg, { fill: 'var(--kit-muted)', fontFamily: 'var(--kit-font-text)', fontSize: 22 * u + 'px' });
    const lab = (str, [x, y], anchor) => { svgEl('text', text, {}, { x, y, 'text-anchor': anchor }).textContent = str; };
    if (o.labels !== false) {
      const cx = K.clamp(0, xr[0], xr[1]), cy = K.clamp(0, yr[0], yr[1]);
      if (kind === 'polar') for (let r = rStep; r <= rMax + 1e-9; r += rStep) { const [px, py] = c2p(+r.toFixed(10), 0); lab(fmt(+r.toFixed(10)), [px, py + 24 * u], 'middle'); }
      else {
        for (const x of M.ticks(xr)) if (Math.abs(x) > 1e-9) { const [px, py] = c2p(x, cy); lab(fmt(x), [px, py + 24 * u], 'middle'); }
        const im = (y) => (y === 1 ? 'i' : y === -1 ? '−i' : fmt(y) + 'i');
        for (const y of M.ticks(yr)) if (Math.abs(y) > 1e-9) { const [px, py] = c2p(cx, y); lab(kind === 'complex' ? im(y) : fmt(y), [px - 8 * u, py + 8 * u], 'end'); }
      }
    }
    const prog = win(o, 0.8);
    const P = { el: svg, kind, x: xr, y: yr, box, c2p, p2c, dOf, lines, set(t, p) {
      p = p ?? prog(t);
      K.show(svg, p > 0 ? fade(o, t) : 0);
      for (const l of lines) K.doodle.drawOn(l.el, p);
      text.style.opacity = K.seg(p, 0.4, 1);
    } };
    if (kind === 'complex') {
      P.n2p = (z) => { const [re, im] = typeof z === 'number' ? [z, 0] : Array.isArray(z) ? z : [z.re, z.im]; return c2p(re, im); };
      P.p2n = (px, py) => { const [re, im] = p2c(px, py); return { re, im }; };
    }
    if (kind === 'polar') {
      P.pr2p = (r, th) => c2p(r * Math.cos(th), r * Math.sin(th));
      P.p2pr = (px, py) => { const [x, y] = p2c(px, py); return [Math.hypot(x, y), Math.atan2(y, x)]; };
    }
    return P;
  };

  // ── curves ───────────────────────────────────────────────────────────────
  const curve = (ax, pts, o) => {
    const pl = M.polyline(pts.map((q) => (q && Number.isFinite(q[0]) && Number.isFinite(q[1]) ? ax.c2p(q[0], q[1]) : null)));
    const el = svgEl('path', ax.el, stroke(o, 5), { d: pl.d });
    if (o.clip) el.setAttribute('clip-path', clipUrl(ax.el, ax.box));
    const progress = win(o, 1.5);
    return { el, progress, pointAt: pl.at, set(t) { K.doodle.drawOn(el, progress(t)); el.style.opacity = fade(o, t); } };
  };
  M.plot2 = (ax, f, o = {}) => {
    const [x0, x1] = o.x || ax.x, n = o.samples ?? 200, eps = (x1 - x0) * 1e-6, ds = (o.discontinuities || []).filter((d) => d > x0 && d < x1);
    const xs = Array.from({ length: n + 1 }, (_, i) => K.lerp(x0, x1, i / n)).filter((x) => ds.every((d) => Math.abs(x - d) > eps));
    for (const d of ds) xs.push(d - eps, d + eps);
    xs.sort((a, b) => a - b);
    const yr = ax.y, span = yr ? yr[1] - yr[0] : 0, pts = [];
    xs.forEach((x, i) => {
      if (i && ds.some((d) => xs[i - 1] < d && x > d)) pts.push(null);
      const y = f(x);   // near an asymptote y is held to a span beyond the range; the clip hides the rest
      pts.push(Number.isFinite(y) ? [x, yr ? K.clamp(y, yr[0] - span, yr[1] + span) : y] : null);
    });
    return curve(ax, pts, { clip: !!yr, ...o });
  };
  M.parametric = (ax, f, o = {}) => {
    const [u0, u1] = o.u || [0, 1], n = o.samples ?? 200;
    return curve(ax, Array.from({ length: n + 1 }, (_, i) => f(K.lerp(u0, u1, i / n))), o);
  };
  M.polar = (ax, r, o = {}) => M.parametric(ax, (th) => { const v = r(th); return [v * Math.cos(th), v * Math.sin(th)]; },
    { samples: 400, ...o, u: o.theta || [0, 2 * Math.PI] });

  // marching squares on a (nx × ny) grid, level 0; saddles split by the cell centre's sign; segments joined through shared edges
  M.implicit = (ax, F, o = {}) => {
    const [x0, x1] = o.x || ax.x, [y0, y1] = o.y || ax.y, res = o.res ?? (x1 - x0) / 80;
    const nx = Math.max(1, Math.ceil((x1 - x0) / res - 1e-9)), ny = Math.max(1, Math.ceil((y1 - y0) / res - 1e-9));
    const X = (i) => K.lerp(x0, x1, i / nx), Y = (j) => K.lerp(y0, y1, j / ny);
    const v = Array.from({ length: nx + 1 }, (_, i) => Array.from({ length: ny + 1 }, (_, j) => F(X(i), Y(j))));
    const edge = new Map(), segs = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const c = [v[i][j], v[i + 1][j], v[i + 1][j + 1], v[i][j + 1]];
      if (!c.every(Number.isFinite)) continue;
      const P = [[X(i), Y(j)], [X(i + 1), Y(j)], [X(i + 1), Y(j + 1)], [X(i), Y(j + 1)]], s = c.map((a) => a > 0);
      // edge → [id, corner a, corner b]; a shared edge has the same id and corner order from both of its cells
      const E = { b: [`h${i},${j}`, 0, 1], r: [`v${i + 1},${j}`, 1, 2], t: [`h${i},${j + 1}`, 3, 2], l: [`v${i},${j}`, 0, 3] };
      const id = (e) => {
        const [key, a, b] = E[e];
        if (!edge.has(key)) { const q = c[a] / (c[a] - c[b]); edge.set(key, [K.lerp(P[a][0], P[b][0], q), K.lerp(P[a][1], P[b][1], q)]); }
        return key;
      };
      const hit = ['b', 'r', 't', 'l'].filter((e) => s[E[e][1]] !== s[E[e][2]]);
      if (hit.length === 2) segs.push([id(hit[0]), id(hit[1])]);
      else if (hit.length === 4) {
        const centre = F((X(i) + X(i + 1)) / 2, (Y(j) + Y(j + 1)) / 2) > 0;
        if (centre === s[1]) segs.push([id('l'), id('b')], [id('r'), id('t')]); else segs.push([id('b'), id('r')], [id('t'), id('l')]);
      }
    }
    const adj = new Map();
    segs.forEach((sg, k) => { for (const e of sg) { if (!adj.has(e)) adj.set(e, []); adj.get(e).push(k); } });
    const used = new Uint8Array(segs.length), chains = [];
    const walk = (k, cur) => {
      const ids = [cur];
      while (k != null && !used[k]) { used[k] = 1; cur = segs[k][0] === cur ? segs[k][1] : segs[k][0]; ids.push(cur); k = adj.get(cur).find((q) => !used[q]); }
      return ids;
    };
    for (const [e, ks] of adj) if (ks.length === 1 && !used[ks[0]]) chains.push(walk(ks[0], e));   // open chains first (they end at the grid edge)
    segs.forEach((sg, k) => { if (!used[k]) chains.push(walk(k, sg[0])); });   // then closed loops
    const paths = chains.map((ids) => ids.map((e) => edge.get(e)));
    return { ...curve(ax, paths.flatMap((p, i) => (i ? [null, ...p] : p)), o), paths, res };
  };

  // ── calculus on an axes / plane ─────────────────────────────────────────
  M.point = (ax, f, x) => ax.c2p(x, f(x));

  M.area = (ax, f, [a, b], o = {}) => {
    const g = o.bounded || (() => 0), n = o.samples ?? 100, xs = Array.from({ length: n + 1 }, (_, i) => K.lerp(a, b, i / n));
    const el = svgEl('path', ax.el, { fill: o.color || 'var(--kit-accent)', fillOpacity: o.opacity ?? 0.35, stroke: 'none' });
    const d = (p) => {   // the fixed samples left of the sweep plus its edge, so the curved sides don't wobble as it moves
      const xe = K.lerp(a, b, p), q = xs.filter((x) => x < xe).concat(xe);
      return M.polyline([...q.map((x) => ax.c2p(x, f(x))), ...q.slice().reverse().map((x) => ax.c2p(x, g(x)))]).d + 'Z';
    };
    const full = d(1), progress = win(o, 1);
    return { el, progress, set(t) { const p = progress(t); K.show(el, p > 0 ? fade(o, t) : 0); el.setAttribute('d', p >= 1 ? full : d(p)); } };
  };

  M.riemann = (ax, f, [a, b], o = {}) => {
    const n = Math.max(1, Math.round((b - a) / (o.dx ?? (b - a) / 10))), w = (b - a) / n, k = { left: 0, mid: 0.5, right: 1 }[o.mode || 'left'];
    if (k == null) throw new Error(`KIT.math.riemann: mode "${o.mode}" is not left, right or mid`);
    const g = svgEl('g', ax.el), t0 = o.in ?? 0, step = o.step ?? K.staggerStep, len = K.dur(0.5);
    const bars = Array.from({ length: n }, (_, i) => {
      const x0 = a + i * w, x1 = x0 + w, h = f(x0 + k * w), [px0, py0] = ax.c2p(x0, 0), [px1, py1] = ax.c2p(x1, h);
      const el = svgEl('rect', g, { fill: o.color || 'var(--kit-accent)', fillOpacity: o.opacity ?? 0.6, stroke: 'var(--kit-ink)', strokeWidth: 1.5 * K.u },
        { x: px0, y: Math.min(py0, py1), width: px1 - px0, height: Math.abs(py1 - py0) });
      return { x0, x1, h, el, py0 };
    });
    return { el: g, bars: bars.map(({ x0, x1, h }) => ({ x0, x1, h })), sum: bars.reduce((s, r) => s + r.h * w, 0), set(t) {
      K.show(g, t >= t0 ? fade(o, t) : 0);
      bars.forEach((r, i) => {   // grows from the x axis: y' = py0 + (y − py0)·p
        const p = K.ease(K.seg(t, t0 + i * step, t0 + i * step + len));
        r.el.style.visibility = p > 0 ? '' : 'hidden';
        r.el.setAttribute('transform', `translate(0 ${r.py0 * (1 - p)}) scale(1 ${p})`);
      });
    } };
  };

  M.secant = (ax, f, x, dx, o = {}) => {
    const A = ax.c2p(x, f(x)), C = ax.c2p(x + dx, f(x)), B = ax.c2p(x + dx, f(x + dx)), slope = (f(x + dx) - f(x)) / dx;
    const g = svgEl('g', ax.el), seg = (p, q) => M.polyline([p, q]).d;
    const legs = [svgEl('path', g, stroke({ color: o.dxColor || 'var(--kit-muted)' }, 3), { d: seg(A, C) }),
      svgEl('path', g, stroke({ color: o.dyColor || 'var(--kit-muted)' }, 3), { d: seg(C, B) })];
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, half = (o.length ?? L + 160 * K.u) / 2, ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
    const line = svgEl('path', g, stroke(o, 4), { d: seg([mx - ux * half, my - uy * half], [mx + ux * half, my + uy * half]) });
    const text = svgEl('g', g, { fill: 'var(--kit-ink)', fontFamily: 'var(--kit-font-text)', fontSize: 24 * K.u + 'px' });
    if (o.dxLabel) svgEl('text', text, {}, { x: (A[0] + C[0]) / 2, y: C[1] + 26 * K.u, 'text-anchor': 'middle' }).textContent = o.dxLabel;
    if (o.dyLabel) svgEl('text', text, {}, { x: C[0] + 10 * K.u, y: (C[1] + B[1]) / 2 + 8 * K.u }).textContent = o.dyLabel;
    const progress = win(o, 1);
    return { el: g, slope, set(t) {
      const p = progress(t);
      K.show(g, p > 0 ? fade(o, t) : 0);
      K.doodle.drawOn(legs[0], K.seg(p, 0, 0.4)); K.doodle.drawOn(legs[1], K.seg(p, 0.3, 0.7)); K.doodle.drawOn(line, K.seg(p, 0.5, 1));
      text.style.opacity = K.seg(p, 0.6, 1);
    } };
  };

  M.tangent = (ax, f, x, o = {}) => {
    const X = xt(x), h = o.h ?? (ax.x[1] - ax.x[0]) * 1e-5, half = ((o.length ?? 260) * K.u) / 2, slope = (x) => (f(x + h) - f(x - h)) / (2 * h);
    const g = svgEl('g', ax.el), line = svgEl('path', g, stroke(o, 4)), dot = svgEl('circle', g, { fill: o.color || 'var(--kit-accent)' }, { r: 7 * K.u });
    const progress = win(o, 0.6);
    return { el: g, slope, set(t) {
      const p = progress(t), x = X(t), y = f(x), [px, py] = ax.c2p(x, y), [qx, qy] = ax.c2p(x + 1, y + slope(x));
      const L = Math.hypot(qx - px, qy - py) || 1, r = half * p, ux = ((qx - px) / L) * r, uy = ((qy - py) / L) * r;
      K.show(g, p > 0 ? fade(o, t) : 0);
      line.setAttribute('d', `M${px - ux} ${py - uy}L${px + ux} ${py + uy}`);
      dot.setAttribute('cx', px); dot.setAttribute('cy', py);
    } };
  };

  M.vline = (ax, f, x, o = {}) => {
    const X = xt(x), progress = win(o, 0.5);
    const el = svgEl('path', ax.el, { ...stroke({ color: o.color || 'var(--kit-ink)', width: o.width }, 3), strokeDasharray: `${10 * K.u} ${8 * K.u}` });
    return { el, set(t) {
      const p = progress(t), x = X(t), [px, py0] = ax.c2p(x, 0), py1 = ax.c2p(x, f(x))[1];
      K.show(el, p > 0 ? fade(o, t) : 0);
      el.setAttribute('d', `M${px} ${py0}L${px} ${K.lerp(py0, py1, p)}`);
    } };
  };

  M.tLabel = (ax, f, x, text, o = {}) => {
    const X = xt(x), g = svgEl('g', ax.el), s = 14 * K.u, progress = win(o, 0.6), v = M.vline(ax, f, X, o);
    svgEl('path', g, { fill: o.color || 'var(--kit-accent)' }, { d: `M0 0L${-s * 0.6} ${s}L${s * 0.6} ${s}Z` });   // tip on the axis
    svgEl('text', g, { fill: 'var(--kit-ink)', fontFamily: 'var(--kit-font-text)', fontSize: 26 * K.u + 'px' }, { y: s + 28 * K.u, 'text-anchor': 'middle' }).textContent = text;
    return { el: g, line: v.el, set(t) {
      const p = progress(t), [px, py] = ax.c2p(X(t), 0);
      K.show(g, p > 0 ? p * fade(o, t) : 0);
      g.setAttribute('transform', `translate(${px} ${py + (1 - p) * 10 * K.u})`);
      v.set(t);
    } };
  };

  // ── grid warps (ApplyPointwiseFunction, ApplyMatrix, ApplyComplexFunction, Homotopy) ─────────────────
  M.warp = (plane, fn, o = {}) => {
    const kind = o.kind || (Array.isArray(fn) ? 'matrix' : 'pointwise');
    const map = { pointwise: (q) => fn(q), matrix: ([x, y]) => [fn[0][0] * x + fn[0][1] * y, fn[1][0] * x + fn[1][1] * y],
      complex: ([x, y]) => { const z = fn({ re: x, im: y }); return [z.re, z.im]; }, homotopy: (q) => fn(q, 1) }[kind];
    if (!map) throw new Error(`KIT.math.warp: kind "${kind}" is not pointwise, matrix, complex or homotopy`);
    const first = !plane.state, src = plane.state || plane.lines.map((l) => l.pts), dst = src.map((l) => l.map(map));
    plane.state = dst;   // the next warp on this plane starts here
    const t0 = o.in ?? 0, t1 = t0 + (o.dur ?? K.dur(1.5)), progress = (t) => K.ease(K.seg(t, t0, t1));
    const at = (p) => (p <= 0 ? src : p >= 1 ? dst : kind === 'homotopy' ? src.map((l) => l.map((q) => fn(q, p)))
      : src.map((l, i) => l.map((q, j) => [K.lerp(q[0], dst[i][j][0], p), K.lerp(q[1], dst[i][j][1], p)])));
    return { kind, matrix: kind === 'matrix' ? fn : null, in: t0, at, progress, set(t) {
      if (t < t0 && !first) return;   // an earlier warp in the chain owns the lines until this one starts
      at(progress(t)).forEach((l, i) => plane.lines[i].el.setAttribute('d', plane.dOf(l)));
    } };
  };

  M.basis = (plane, w, o = {}) => {
    const m = w.matrix || w, t0 = w.progress ? w.in : o.in ?? 0, dur = o.dur ?? K.dur(1.5);
    const progress = w.progress || ((t) => K.ease(K.seg(t, t0, t0 + dur))), show = o.show ?? Math.max(0, t0 - K.dur(0.6));
    const g = svgEl('g', plane.el), colors = o.colors || ['#83C167', '#FC6255'];   // Manim's î GREEN_C, ĵ RED_C
    const arrows = colors.map((c) => svgEl('path', g, { fill: c, stroke: c, strokeWidth: 4 * K.u, strokeLinejoin: 'round', strokeLinecap: 'round' }));
    const from = [[1, 0], [0, 1]], to = [[m[0][0], m[1][0]], [m[0][1], m[1][1]]];   // the matrix's columns
    return { el: g, set(t) {
      const p = progress(t), grow = K.ease(K.seg(t, show, show + K.dur(0.5)));
      K.show(g, grow > 0 ? fade(o, t) : 0);
      arrows.forEach((a, i) => a.setAttribute('d', arrowD(plane.c2p(0, 0),
        plane.c2p(K.lerp(from[i][0], to[i][0], p) * grow, K.lerp(from[i][1], to[i][1], p) * grow), 18 * K.u)));
    } };
  };

  // ── vector fields ────────────────────────────────────────────────────────
  M.field = (ax, F, o = {}) => {
    const step = o.step ?? (ax.x[2] || 1), pts = [];
    for (const x of M.ticks([ax.x[0], ax.x[1], step])) for (const y of M.ticks([ax.y[0], ax.y[1], step])) {
      const [u, v] = F(x, y);
      if (Number.isFinite(u) && Number.isFinite(v)) pts.push({ x, y, u, v, m: Math.hypot(u, v) });
    }
    const maxM = o.maxMag ?? Math.max(1e-9, ...pts.map((q) => q.m)), scale = o.scale ?? (0.85 * step) / maxM, g = svgEl('g', ax.el);
    const arrows = pts.map((q, i) => {
      const s = Math.min(q.m * scale, 0.9 * step) / (q.m || 1) / 2, c = o.colorByMagnitude ? magColor(q.m / maxM) : o.color || 'var(--kit-accent)';
      const [cx, cy] = ax.c2p(q.x, q.y);
      const el = svgEl('path', g, { fill: c, stroke: c, strokeWidth: (o.width ?? 3) * K.u, strokeLinejoin: 'round', strokeLinecap: 'round' },
        { d: arrowD(ax.c2p(q.x - q.u * s, q.y - q.v * s), ax.c2p(q.x + q.u * s, q.y + q.v * s), (o.tip ?? 14) * K.u) });
      return { el, cx, cy, k: pts.length > 1 ? i / (pts.length - 1) : 0 };   // left to right: x is the outer loop
    });
    const progress = win(o, 1);
    return { el: g, arrows: pts, set(t) {
      const p = progress(t);
      K.show(g, p > 0 ? fade(o, t) : 0);
      for (const a of arrows) {
        const s = K.seg(p, a.k * 0.6, a.k * 0.6 + 0.4);
        a.el.style.opacity = s;
        a.el.setAttribute('transform', `translate(${a.cx} ${a.cy}) scale(${s}) translate(${-a.cx} ${-a.cy})`);
      }
    } };
  };

  const rk4 = (F, [x, y], h) => {
    const a = F(x, y), b = F(x + (a[0] * h) / 2, y + (a[1] * h) / 2), c = F(x + (b[0] * h) / 2, y + (b[1] * h) / 2), d = F(x + c[0] * h, y + c[1] * h);
    return [x + (h / 6) * (a[0] + 2 * b[0] + 2 * c[0] + d[0]), y + (h / 6) * (a[1] + 2 * b[1] + 2 * c[1] + d[1])];
  };
  M.streamLines = (ax, F, o = {}) => {
    const [x0, x1] = ax.x, [y0, y1] = ax.y, dt = o.dt ?? 0.05, steps = o.steps ?? 120, r = K.doodle.rng(o.seed ?? 1);
    const seeds = o.seeds || Array.from({ length: o.n ?? 30 }, () => [K.lerp(x0, x1, r()), K.lerp(y0, y1, r())]);
    const lines = seeds.map((s) => {
      const pts = [s.slice()];
      for (let i = 0, q = s; i < steps; i++) {
        if (!(Math.hypot(...F(q[0], q[1])) > 1e-9)) break;   // at rest (or NaN)
        q = rk4(F, q, dt);
        if (!(q[0] >= x0 && q[0] <= x1 && q[1] >= y0 && q[1] <= y1)) break;
        pts.push(q);
      }
      return pts;
    }).filter((l) => l.length > 1);
    const mags = lines.map((l) => l.reduce((s, q) => s + Math.hypot(...F(q[0], q[1])), 0) / l.length), maxM = Math.max(1e-9, ...mags);
    const g = svgEl('g', ax.el), t0 = o.in ?? 0, t1 = t0 + (o.dur ?? K.dur(1.5)), fl = o.flow === true ? {} : o.flow;
    const dash = ((fl && fl.dash) ?? 50) * K.u, speed = ((fl && fl.speed) ?? 200) * K.u;
    const items = lines.map((l, i) => {
      const pl = M.polyline(l.map((q) => ax.c2p(q[0], q[1]))), c = o.colorByMagnitude ? magColor(mags[i] / maxM) : o.color || 'var(--kit-accent)';
      const st = stroke({ color: c, width: o.width }, 3);
      return { base: svgEl('path', g, st, { d: pl.d }), flow: fl && svgEl('path', g, st, { d: pl.d }), len: pl.len, phase: (i * 0.6180339887) % 1 };
    });
    return { el: g, lines, set(t) {
      const p = K.ease(K.seg(t, t0, t1)), q = K.seg(t, t1, t1 + K.dur(0.4));
      K.show(g, p > 0 ? fade(o, t) : 0);
      for (const it of items) {
        K.doodle.drawOn(it.base, p);
        if (!it.flow) continue;
        // one dash per line, [s, s + dash] along it; the gap is the whole line, so the next dash is off its end
        const per = it.len + dash, k = ((((t - t1) * speed) / per + it.phase) % 1 + 1) % 1;
        it.base.style.opacity = 1 - 0.7 * q;
        it.flow.style.strokeDasharray = `${dash} ${per}`;
        it.flow.style.strokeDashoffset = String(dash - k * per);
        K.show(it.flow, q);
      }
    } };
  };
})();
