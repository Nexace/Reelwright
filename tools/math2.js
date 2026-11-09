// Manim-style shapes and mobjects: more of KIT.math. Loaded after engine.js, doodle.js and math.js; the morphs also need
// vendor/flubber/flubber.min.js (flubber 0.4.2, MIT; window.flubber) before this file. Shape semantics follow Manim Community
// Edition (MIT): geometry/arc.py, line.py, polygram.py, tips.py, shape_matchers.py, svg/brace.py, labeled.py.
// Coordinates are stage px. Angles are radians, counter-clockwise on screen (Manim's y-up): the point at angle a is
// (cx + r cos a, cy − r sin a). Everything is built once at load; every .set(t) is a pure function of t.
//   M.shape.* → SVG path `d` strings (pure; no DOM)
//     circle(cx, cy, r)  ellipse(cx, cy, rx, ry)  arc(cx, cy, r, a0, a1)  arcBetween(p, q, angle = π/2)
//     annulus(cx, cy, rOuter, rInner)  sector(cx, cy, r, a0, a1)  annularSector(cx, cy, rInner, rOuter, a0, a1)
//     polygon(pts, closed = true)  regularPolygon(n, r, { cx, cy, rot = π/2 })  star(n, r, inner = 0.4 r, { cx, cy, rot })
//     rect(x, y, w, h)  roundedRect(x, y, w, h, r)  line(p, q)  elbow(corner, size, rot = 0)  cross(x, y, w, h)
//     angle(vertex, a, b, r)  rightAngle(vertex, a, b, size)   the arc / square between the rays vertex→a and vertex→b (smaller angle)
//     brace(p, q, { depth, side })  arcBrace(cx, cy, r, a0, a1, { depth, side })
//         Manim's brace: two quarter-curves to a centre tip, `depth` px from the chord p→q (the tip is mid(p, q) + n·depth).
//         side 1 (default) puts the tip on the clockwise side of p→q (below, for left to right); −1 flips. arcBrace: 1 = outside.
//     arrow(p, q, { tip, size, double, curved }) → { d: shaft, tip, tip2 }  tip: 'triangle' (default) | 'stealth' | 'circle' |
//         'square' | 'none'; curved = the arc's angle (arcBetween); tip / tip2 are filled paths at q / (double) p.
//   M.mob(d | shape, { stroke, fill, width, dash, parent, in, draw, out, label }) → { el, path, set(t) }
//     stroke draws on over [in, in + draw] (default KIT.dur(0.8); the stroke is --kit-ink, 4 px at 1080), a fill fades in over the
//     0.4 s after it (stroke 'none': the fill fades in over the draw instead), arrow tips appear as the stroke ends, out fades it
//     over the 0.45 s before `out` (KIT.easeIn). dash = true | px | [dash, gap] (at 1080) draws a dashed stroke, still drawn on.
//     label = 'text' | { text, at: [x, y], size, color, anchor }: fades in as the stroke ends; default at = centre of the path's box.
//     parent = an <svg>/<g> (e.g. axes().el) to draw inside, else an own full-stage <svg>. Fill uses even-odd (annulus).
//   Wrappers (opts = the mob options plus the shape's own):
//     circle({ cx, cy, r })  dot(cx, cy, { r })  line(p, q)  arrow(p, q, { tip, size, double, curved })
//     vector(axes?, [vx, vy], { from })    arrow from the axes' origin to c2p(v); without axes v is px, y up, from the stage centre
//     brace(target | p, q, { dir: 'down' | 'up' | 'left' | 'right', gap, depth, label })   BraceLabel: the label sits beyond the tip
//     arcBrace(cx, cy, r, a0, a1, { depth, label })
//     surround(target, { pad, radius })  backgroundRect(target, { pad })  underline(target, { gap })  cross(target)
//     labeled.dot(cx, cy, text, { dir })  labeled.line(p, q, text)  labeled.arrow(p, q, text)   target = an element or { x, y, w, h }
//   Elements are measured once at load (getBoundingClientRect in stage px), so later transforms on them are not followed.
//   M.morphShapes(from, to, { in, dur, show, out, stroke, fill, width, parent, flubber }) → { el, els, set(t) }
//     from / to = a d string or an array of them: 1→1 flubber.interpolate, 1→n separate, n→1 combine, n→n interpolateAll
//     (one path). Interpolators are built once; at p = 0 the start shapes are back and at p = 1 the end shapes (flubber
//     re-samples the points but the outline is the input's). `show` = when it becomes visible (default 0); `flubber` = its options.
'use strict';
(function () {
  const K = window.KIT, M = K.math, SVG = 'http://www.w3.org/2000/svg', PI = Math.PI;
  if (!M) throw new Error('tools/math2.js: load tools/math.js first (KIT.math)');
  const S = (M.shape = {}), u = K.u;

  // ── pure geometry ─────────────────────────────────────────────────────────
  const f = (v) => +v.toFixed(2), P = (q) => `${f(q[0])} ${f(q[1])}`;
  const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  const unit = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  const sweep = (a0, a1) => (a1 > a0 ? 0 : 1);   // SVG sweep flag 0 = counter-clockwise on screen
  const arcCmd = (cx, cy, r, a0, a1) => {   // "A…" from the point at a0 to the point at a1 (two halves for a full turn)
    const span = a1 - a0, A = `A${f(r)} ${f(r)} 0 `;
    if (Math.abs(span) >= 2 * PI - 1e-6) return `${A}1 ${sweep(a0, a1)} ${P(pol(cx, cy, r, a0 + PI * Math.sign(span)))}${A}1 ${sweep(a0, a1)} ${P(pol(cx, cy, r, a0))}`;
    return `${A}${Math.abs(span) > PI ? 1 : 0} ${sweep(a0, a1)} ${P(pol(cx, cy, r, a1))}`;
  };

  S.ellipse = (cx, cy, rx, ry) => `M${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}Z`;
  S.circle = (cx, cy, r) => S.ellipse(cx, cy, r, r);
  S.arc = (cx, cy, r, a0, a1) => `M${P(pol(cx, cy, r, a0))}${arcCmd(cx, cy, r, a0, a1)}`;
  S.arcBetween = (p, q, angle = PI / 2) => {
    const c = Math.hypot(q[0] - p[0], q[1] - p[1]), a = Math.abs(angle);
    if (a < 1e-6) return S.line(p, q);
    const r = c / (2 * Math.sin(a / 2));
    return `M${P(p)}A${f(r)} ${f(r)} 0 ${a > PI ? 1 : 0} ${angle > 0 ? 0 : 1} ${P(q)}`;
  };
  S.annulus = (cx, cy, ro, ri) => S.circle(cx, cy, ro) + S.circle(cx, cy, ri);
  S.sector = (cx, cy, r, a0, a1) => `M${f(cx)} ${f(cy)}L${P(pol(cx, cy, r, a0))}${arcCmd(cx, cy, r, a0, a1)}Z`;
  S.annularSector = (cx, cy, ri, ro, a0, a1) =>
    `M${P(pol(cx, cy, ro, a0))}${arcCmd(cx, cy, ro, a0, a1)}L${P(pol(cx, cy, ri, a1))}${arcCmd(cx, cy, ri, a1, a0)}Z`;
  S.polygon = (pts, closed = true) => 'M' + pts.map(P).join('L') + (closed ? 'Z' : '');
  S.regularPolygon = (n, r, o = {}) => S.polygon(Array.from({ length: n }, (_, i) => pol(o.cx ?? 0, o.cy ?? 0, r, (o.rot ?? PI / 2) + (2 * PI * i) / n)));
  S.star = (n, r, inner = r * 0.4, o = {}) => S.polygon(Array.from({ length: 2 * n }, (_, i) =>
    pol(o.cx ?? 0, o.cy ?? 0, i % 2 ? inner : r, (o.rot ?? PI / 2) + (PI * i) / n)));
  S.rect = (x, y, w, h) => S.polygon([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  S.roundedRect = (x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    const a = (px, py) => `A${f(r)} ${f(r)} 0 0 1 ${f(px)} ${f(py)}`;
    return `M${f(x + r)} ${f(y)}H${f(x + w - r)}${a(x + w, y + r)}V${f(y + h - r)}${a(x + w - r, y + h)}H${f(x + r)}${a(x, y + h - r)}V${f(y + r)}${a(x + r, y)}Z`;
  };
  S.line = (p, q) => `M${P(p)}L${P(q)}`;
  S.cubic = (p0, c1, c2, p1) => `M${P(p0)}C${P(c1)} ${P(c2)} ${P(p1)}`;   // CubicBezier
  S.elbow = (corner, size, rot = 0) => S.polygon([pol(corner[0], corner[1], size, rot + PI), corner, pol(corner[0], corner[1], size, rot - PI / 2)], false);
  S.cross = (x, y, w, h) => `M${f(x)} ${f(y)}L${f(x + w)} ${f(y + h)}M${f(x + w)} ${f(y)}L${f(x)} ${f(y + h)}`;
  S.angle = (v, a, b, r) => {
    const aa = Math.atan2(v[1] - a[1], a[0] - v[0]), ab = Math.atan2(v[1] - b[1], b[0] - v[0]);
    let d = (ab - aa) % (2 * PI);
    if (d > PI) d -= 2 * PI; else if (d < -PI) d += 2 * PI;
    return S.arc(v[0], v[1], r, aa, aa + d);
  };
  S.rightAngle = (v, a, b, size) => {
    const ua = unit(v, a), ub = unit(v, b), at = (x, y) => [v[0] + (ua[0] * x + ub[0] * y) * size, v[1] + (ua[1] * x + ub[1] * y) * size];
    return S.polygon([at(1, 0), at(1, 1), at(0, 1)], false);
  };

  // brace in (s, h) coordinates: s along the chord (0..L), h out to the tip side. Cubics [P0, C1, C2, P1], lines as flat cubics.
  const braceSegs = (L, depth) => {
    const ky = depth / 2, kx = Math.min(ky, L / 4), m = L / 2, k = 0.55, ex = kx * (1 - k), ey = ky * k, v = (a, b) => [a, b];
    const line = (a, b) => [a, a, b, b];
    return [[v(0, 0), v(0, ey), v(ex, ky), v(kx, ky)], line(v(kx, ky), v(m - kx, ky)),
      [v(m - kx, ky), v(m - ex, ky), v(m, 2 * ky - ey), v(m, 2 * ky)],
      [v(m, 2 * ky), v(m, 2 * ky - ey), v(m + ex, ky), v(m + kx, ky)], line(v(m + kx, ky), v(L - kx, ky)),
      [v(L - kx, ky), v(L - ex, ky), v(L, ey), v(L, 0)]];
  };
  const bez = (s, t) => { const a = 1 - t; return [0, 1].map((i) => a * a * a * s[0][i] + 3 * a * a * t * s[1][i] + 3 * a * t * t * s[2][i] + t * t * t * s[3][i]); };
  const frame = (p, q, o) => {   // chord frame for a brace: unit u (p→q), unit normal n (tip side), depth, tip
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]), u = unit(p, q), side = o.side ?? 1, n = [-u[1] * side, u[0] * side], depth = o.depth ?? 40 * K.u;
    return { L, u, n, depth, tip: [(p[0] + q[0]) / 2 + n[0] * depth, (p[1] + q[1]) / 2 + n[1] * depth] };
  };
  S.brace = (p, q, o = {}) => {
    const { L, u, n, depth } = frame(p, q, o), at = ([s, h]) => P([p[0] + u[0] * s + n[0] * h, p[1] + u[1] * s + n[1] * h]), segs = braceSegs(L, depth);
    return `M${at(segs[0][0])}` + segs.map((s) => `C${at(s[1])} ${at(s[2])} ${at(s[3])}`).join('');
  };
  S.arcBrace = (cx, cy, r, a0, a1, o = {}) => {   // the flat brace bent round the arc, sampled (14 points per piece)
    const L = r * Math.abs(a1 - a0), side = o.side ?? 1, segs = braceSegs(L, o.depth ?? 40 * K.u), pts = [];
    segs.forEach((s) => { for (let i = pts.length ? 1 : 0; i <= 14; i++) { const [x, h] = bez(s, i / 14); pts.push(pol(cx, cy, r + side * h, a0 + ((a1 - a0) * x) / L)); } });
    return S.polygon(pts, false);
  };

  const TIP_BACK = { triangle: 0.9, stealth: 0.7, circle: 1, square: 0.8, none: 0 };   // shaft stops this fraction of `size` short of the tip point
  const tipPath = (kind, T, h, s) => {   // T = tip point, h = heading (y-up angle), s = length
    const d = [Math.cos(h), -Math.sin(h)], at = (a, b) => [T[0] - d[0] * a - d[1] * b, T[1] - d[1] * a + d[0] * b];   // a back, b to the left
    if (kind === 'none') return '';
    if (kind === 'circle') return S.circle(...at(s / 2, 0), s / 2);
    if (kind === 'square') return S.polygon([at(0, 0.4 * s), at(0.8 * s, 0.4 * s), at(0.8 * s, -0.4 * s), at(0, -0.4 * s)]);
    return S.polygon(kind === 'stealth' ? [T, at(s, 0.45 * s), at(0.7 * s, 0), at(s, -0.45 * s)] : [T, at(s, 0.45 * s), at(s, -0.45 * s)]);
  };
  S.arrow = (p, q, o = {}) => {
    const kind = o.tip ?? 'triangle', s = o.size ?? 24 * K.u, back = TIP_BACK[kind] * s, ang = o.curved || 0;
    if (!(kind in TIP_BACK)) throw new Error(`KIT.math.shape.arrow: unknown tip '${kind}' (triangle, stealth, circle, square, none)`);
    const chord = Math.atan2(p[1] - q[1], q[0] - p[0]), h1 = chord + ang / 2, h0 = chord - ang / 2;   // headings at q and at p
    const pt = (h, T, k) => [T[0] + Math.cos(h) * k, T[1] - Math.sin(h) * k];
    const a = o.double ? pt(h0, p, back) : p, b = pt(h1, q, -back);   // shortened ends (the curved shaft keeps its angle: a hair off at big tips)
    return { d: ang ? S.arcBetween(a, b, ang) : S.line(a, b), tip: tipPath(kind, q, h1, s), tip2: o.double ? tipPath(kind, p, h0 + PI, s) : '' };
  };

  // ── DOM ───────────────────────────────────────────────────────────────────
  const svgEl = (tag, parent, style = {}, attrs = {}) => {
    const e = document.createElementNS(SVG, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    Object.assign(e.style, style);   // style, not attributes: those don't resolve var(--kit-…)
    parent.appendChild(e);
    return e;
  };
  const layer = (parent) => parent instanceof SVGElement ? svgEl('g', parent) :
    svgEl('svg', parent || K.stage, { position: 'absolute', left: '0', top: '0', overflow: 'visible', pointerEvents: 'none' }, { width: K.W_, height: K.H_, class: 'kit-math2' });
  const fade = (o, t) => (o.out == null ? 1 : 1 - K.easeIn(K.seg(t, o.out - K.dur(0.45), o.out)));
  const boxOf = (t) => {   // element → { x, y, w, h } in stage px, measured now
    if (!t.getBoundingClientRect) return t;
    const r = t.getBoundingClientRect(), s = K.stage.getBoundingClientRect(), k = s.width / K.W_;
    return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k };
  };
  // dasharray that shows the first fraction p of a dashed path: whole dashes, the cut one clipped, then a gap longer than the path
  const dashArray = (len, [d, g], p) => {
    if (p >= 1) return `${d} ${g}`;
    const L = len * p, a = [];
    for (let s = 0; s < L;) { a.push(Math.min(d, L - s)); s += d; if (s >= L) break; a.push(g); s += g; }
    if (a.length % 2) a.push(len); else a[a.length - 1] += len;
    return a.join(' ');
  };

  M.mob = (src, o = {}) => {
    const shape = typeof src === 'string' ? { d: src } : src, t0 = o.in ?? 0, t1 = t0 + (o.draw ?? K.dur(0.8));
    const stroke = o.stroke ?? 'var(--kit-ink)', fill = o.fill ?? 'none', noStroke = stroke === 'none';
    const dash = o.dash ? [].concat(o.dash === true ? [12, 8] : o.dash).map((v) => v * u) : null;
    if (dash && dash.length < 2) dash.push(dash[0]);
    const root = layer(o.parent);
    const path = svgEl('path', root, { fill, stroke, strokeWidth: (o.width ?? 4) * u, strokeLinecap: 'round', strokeLinejoin: 'round', fillRule: 'evenodd' }, { d: shape.d });
    const tips = [shape.tip, shape.tip2].filter(Boolean).map((d) => svgEl('path', root, { fill: stroke, stroke: 'none' }, { d }));
    const len = dash ? path.getTotalLength() : 0;
    let lab = null;
    if (o.label != null) {
      const l = typeof o.label === 'string' ? { text: o.label } : o.label, bb = path.getBBox(), at = l.at || [bb.x + bb.width / 2, bb.y + bb.height / 2];
      lab = svgEl('text', root, { fill: l.color || 'var(--kit-ink)', fontFamily: 'var(--kit-font-text)', fontSize: (l.size ?? 26) * u + 'px',
        textAnchor: l.anchor || 'middle', dominantBaseline: 'central' }, { x: f(at[0]), y: f(at[1]) });
      lab.textContent = l.text;
    }
    return { el: root, path, set(t) {
      const p = K.ease(K.seg(t, t0, t1));
      K.show(root, p > 0 ? fade(o, t) : 0);
      if (dash) { path.style.visibility = p > 0 ? '' : 'hidden'; path.style.strokeDasharray = dashArray(len, dash, p); } else K.doodle.drawOn(path, p);
      const fs = noStroke ? t0 : t1;
      path.style.fillOpacity = (o.fillOpacity ?? 1) * K.seg(t, fs, noStroke ? t1 : fs + K.dur(0.4));
      tips.forEach((e, i) => K.show(e, i ? K.seg(p, 0, 0.1) : K.seg(p, 0.85, 1)));
      if (lab) lab.style.opacity = K.seg(p, 0.7, 1);
    } };
  };

  // ── wrappers ──────────────────────────────────────────────────────────────
  M.circle = (o = {}) => M.mob(S.circle(o.cx ?? K.W_ / 2, o.cy ?? K.H_ / 2, o.r ?? 100 * u), o);
  M.dot = (cx, cy, o = {}) => M.mob(S.circle(cx, cy, o.r ?? 8 * u), { stroke: 'none', fill: 'var(--kit-ink)', ...o });
  M.line = (p, q, o = {}) => M.mob(S.line(p, q), o);
  M.arrow = (p, q, o = {}) => M.mob(S.arrow(p, q, o), o);
  M.vector = (ax, v, o) => {
    if (!(ax && ax.c2p)) { o = v; v = ax; ax = null; }
    o = o || {};
    const O = ax ? ax.c2p(0, 0) : o.from || [K.W_ / 2, K.H_ / 2], E = ax ? ax.c2p(v[0], v[1]) : [O[0] + v[0], O[1] - v[1]];
    return M.arrow(O, E, { stroke: 'var(--kit-accent)', parent: ax && ax.el, ...o });
  };

  const braceLabel = (o, at) => o.label == null ? undefined : { at, ...(typeof o.label === 'string' ? { text: o.label } : o.label) };
  M.brace = (a, b, o) => {
    let p, q;
    if (Array.isArray(b)) { p = a; q = b; o = o || {}; } else {
      o = b || {};
      const r = boxOf(a), g = (o.gap ?? 10) * u, x1 = r.x + r.w, y1 = r.y + r.h;
      [p, q] = { down: [[r.x, y1 + g], [x1, y1 + g]], up: [[x1, r.y - g], [r.x, r.y - g]],
        left: [[r.x - g, r.y], [r.x - g, y1]], right: [[x1 + g, y1], [x1 + g, r.y]] }[o.dir || 'down'];
    }
    const { n, tip } = frame(p, q, o), e = 22 * u;
    return M.mob(S.brace(p, q, o), { ...o, label: braceLabel(o, [tip[0] + n[0] * e, tip[1] + n[1] * e]) });
  };
  M.arcBrace = (cx, cy, r, a0, a1, o = {}) => {
    const depth = o.depth ?? 40 * u, side = o.side ?? 1;
    return M.mob(S.arcBrace(cx, cy, r, a0, a1, o), { ...o, label: braceLabel(o, pol(cx, cy, r + side * (depth + 22 * u), (a0 + a1) / 2)) });
  };

  M.surround = (t, o = {}) => {
    const b = boxOf(t), pad = o.pad ?? 14 * u;
    return M.mob(S.roundedRect(b.x - pad, b.y - pad, b.w + 2 * pad, b.h + 2 * pad, o.radius ?? 12 * u), { stroke: 'var(--kit-accent)', ...o });
  };
  M.backgroundRect = (t, o = {}) => {
    const b = boxOf(t), pad = o.pad ?? 10 * u, m = M.mob(S.rect(b.x - pad, b.y - pad, b.w + 2 * pad, b.h + 2 * pad),
      { stroke: 'none', fill: 'var(--kit-bg)', fillOpacity: 0.75, ...o });
    if (t.parentNode === K.stage && !o.parent) K.stage.insertBefore(m.el, t);   // behind the element it backs
    return m;
  };
  M.underline = (t, o = {}) => {
    const b = boxOf(t), y = b.y + b.h + (o.gap ?? 6) * u;
    return M.mob(S.line([b.x, y], [b.x + b.w, y]), { stroke: 'var(--kit-accent)', width: 6, ...o });
  };
  M.cross = (t, o = {}) => { const b = boxOf(t); return M.mob(S.cross(b.x, b.y, b.w, b.h), { stroke: 'var(--kit-accent)', width: 6, ...o }); };

  const lineLabel = (p, q, text, o, shape) => {   // label beside the middle of p→q, on its upper side
    const v = unit(p, q), e = (o.offset ?? 22) * u;
    return M.mob(shape, { ...o, label: { text, at: [(p[0] + q[0]) / 2 + v[1] * e, (p[1] + q[1]) / 2 - v[0] * e] } });
  };
  M.labeled = {
    dot: (cx, cy, text, o = {}) => {
      const r = o.r ?? 8 * u;
      return M.mob(S.circle(cx, cy, r), { stroke: 'none', fill: 'var(--kit-ink)', ...o, label: { text, at: pol(cx, cy, r + 22 * u, o.dir ?? PI / 2) } });
    },
    line: (p, q, text, o = {}) => lineLabel(p, q, text, o, S.line(p, q)),
    arrow: (p, q, text, o = {}) => lineLabel(p, q, text, o, S.arrow(p, q, o)),
  };

  // ── multi-path morph ──────────────────────────────────────────────────────
  M.morphShapes = (from, to, o = {}) => {
    const fl = window.flubber;
    if (!fl) throw new Error('KIT.math.morphShapes: load vendor/flubber/flubber.min.js before tools/math2.js');
    const A = [].concat(from), B = [].concat(to), t0 = o.in ?? 0, t1 = t0 + (o.dur ?? K.dur(1)), opt = o.flubber;
    const interps = A.length === 1 && B.length === 1 ? [fl.interpolate(A[0], B[0], opt)] : A.length === 1 ? fl.separate(A[0], B, opt) :
      B.length === 1 ? fl.combine(A, B[0], opt) : [fl.interpolateAll(A, B, { ...opt, single: true })];
    const root = layer(o.parent);
    const els = interps.map(() => svgEl('path', root, { fill: o.fill ?? 'none', stroke: o.stroke ?? 'var(--kit-ink)', strokeWidth: (o.width ?? 4) * K.u,
      strokeLinecap: 'round', strokeLinejoin: 'round', fillRule: 'evenodd' }));
    return { el: root, els, set(t) {
      const p = K.ease(K.seg(t, t0, t1));
      els.forEach((e, i) => e.setAttribute('d', interps[i](p)));
      K.show(root, t >= (o.show ?? 0) ? fade(o, t) : 0);
    } };
  };
})();
