// shapes.js: KIT.shape, the @remotion/shapes make*() functions as plain geometry (no React). Load after engine.js (nothing else needed).
// Every builder returns { path, width, height, transformOrigin }: an SVG path `d` drawn inside a 0 0 width height box (so `viewBox="0 0 w h"`
// fits it exactly) and the centre of the shape as a CSS transform-origin ("cx cy"), the same four fields Remotion returns.
//   rect({ width, height, cornerRadius = 0 })            circle({ radius })             ellipse({ rx, ry })
//   triangle({ length, direction = 'right', cornerRadius })     equilateral, `length` = one side; direction right | left | up | down
//   star({ points = 5, innerRadius, outerRadius, cornerRadius }) polygon({ points = 5, radius, cornerRadius })
//   pie({ radius, progress = 0.5, closePath = true, counterClockwise = false, rotation = 0 })   a sector from 12 o'clock; box = the whole circle
//   heart({ size, aspectRatio })                         width = size, height = size · .9175 · (aspectRatio / .9175 when given)
//   arrow({ length = 300, headWidth = 185, headLength = 120, shaftWidth = 80, direction = 'right', cornerRadius })
//   callout({ width, height, cornerRadius = 0, triangleWidth = 40, triangleHeight = 30, direction = 'bottom', triangleOffset = 0.5 })   speech-bubble;
//        width / height of the result include the pointer
//   spark({ size, pinch = 0 })                           four-pointed star with concave sides (pinch 0..0.4 pulls the sides in less)
//   KIT.shape.svg(parent, shape, { fill, stroke, strokeWidth }) → <svg> sized to the shape, overflow visible, for the stage
// cornerRadius rounds every corner with a circular-arc cubic (clamped to half the shorter neighbouring edge).
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('shapes.js: load tools/engine.js first');
  const S = (K.shape = {}), f = (v) => +v.toFixed(4), KAPPA = 0.5522847498;
  // vertices [[x, y]], radii (one number or one per vertex) → a closed path with rounded corners, shifted so the box starts at 0 0
  const poly = (pts, r = 0) => {
    const n = pts.length, R = pts.map((_, i) => (Array.isArray(r) ? r[i] : r) || 0), segs = [];
    pts.forEach((v, i) => {
      const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n], la = Math.hypot(a[0] - v[0], a[1] - v[1]), lb = Math.hypot(b[0] - v[0], b[1] - v[1]);
      const rr = Math.min(R[i], la / 2, lb / 2);
      if (rr <= 0) { segs.push({ p: v }); return; }
      const p1 = [v[0] + (a[0] - v[0]) / la * rr, v[1] + (a[1] - v[1]) / la * rr], p2 = [v[0] + (b[0] - v[0]) / lb * rr, v[1] + (b[1] - v[1]) / lb * rr];
      segs.push({ p: p1, to: p2, c1: [p1[0] + (v[0] - p1[0]) * KAPPA, p1[1] + (v[1] - p1[1]) * KAPPA], c2: [p2[0] + (v[0] - p2[0]) * KAPPA, p2[1] + (v[1] - p2[1]) * KAPPA] });
    });
    // bounding box over vertices and sampled corner curves
    const all = []; segs.forEach((s) => { all.push(s.p); if (s.to) { for (let k = 1; k <= 24; k++) { const t = k / 24, u = 1 - t; all.push([0, 1].map((q) => u * u * u * s.p[q] + 3 * u * u * t * s.c1[q] + 3 * u * t * t * s.c2[q] + t * t * t * s.to[q])); } } });
    const x0 = Math.min(...all.map((p) => p[0])), y0 = Math.min(...all.map((p) => p[1])), x1 = Math.max(...all.map((p) => p[0])), y1 = Math.max(...all.map((p) => p[1]));
    const P = (p) => `${f(p[0] - x0)} ${f(p[1] - y0)}`;
    const d = segs.map((s, i) => (i ? 'L' : 'M') + P(s.p) + (s.to ? `C${P(s.c1)} ${P(s.c2)} ${P(s.to)}` : '')).join('') + 'Z';
    return { path: d, width: f(x1 - x0), height: f(y1 - y0), transformOrigin: `${f((x1 - x0) / 2)} ${f((y1 - y0) / 2)}` };
  };
  const need = (what, v) => { if (!(v > 0)) throw new Error(`shape: ${what} must be > 0`); };
  S.rect = ({ width, height, cornerRadius = 0 }) => { need('width', width); need('height', height); return poly([[0, 0], [width, 0], [width, height], [0, height]], cornerRadius); };
  S.circle = ({ radius }) => { need('radius', radius); return S.ellipse({ rx: radius, ry: radius }); };
  S.ellipse = ({ rx, ry }) => {
    need('rx', rx); need('ry', ry);
    return { path: `M${f(rx)} 0A${f(rx)} ${f(ry)} 0 1 1 ${f(rx)} ${f(2 * ry)}A${f(rx)} ${f(ry)} 0 1 1 ${f(rx)} 0Z`, width: f(2 * rx), height: f(2 * ry), transformOrigin: `${f(rx)} ${f(ry)}` };
  };
  const ngon = (n, R, rot = -Math.PI / 2) => Array.from({ length: n }, (_, i) => [R * Math.cos(rot + 2 * Math.PI * i / n), R * Math.sin(rot + 2 * Math.PI * i / n)]);
  S.polygon = ({ points = 5, radius, cornerRadius = 0 }) => { if (points < 3) throw new Error('shape: polygon needs points >= 3'); need('radius', radius); return poly(ngon(points, radius), cornerRadius); };
  S.triangle = ({ length, direction = 'right', cornerRadius = 0 }) => {
    need('length', length);
    const h = length * Math.sqrt(3) / 2, base = { right: [[0, 0], [h, length / 2], [0, length]], left: [[h, 0], [0, length / 2], [h, length]], up: [[0, h], [length / 2, 0], [length, h]], down: [[0, 0], [length, 0], [length / 2, h]] }[direction];
    if (!base) throw new Error('shape: triangle direction is right | left | up | down');
    return poly(base, cornerRadius);
  };
  S.star = ({ points = 5, innerRadius, outerRadius, cornerRadius = 0 }) => {
    if (points < 3) throw new Error('shape: star needs points >= 3'); need('innerRadius', innerRadius); need('outerRadius', outerRadius);
    const o = ngon(points, outerRadius), i = ngon(points, innerRadius, -Math.PI / 2 + Math.PI / points);
    return poly(o.flatMap((p, k) => [p, i[k]]), cornerRadius);
  };
  S.pie = ({ radius, progress = 0.5, closePath = true, counterClockwise = false, rotation = 0 }) => {
    need('radius', radius); const R = radius, p = Math.min(1, Math.max(0, progress)), ang = p * 2 * Math.PI * (counterClockwise ? -1 : 1) + rotation - Math.PI / 2, a0 = rotation - Math.PI / 2;
    const pt = (a) => `${f(R + R * Math.cos(a))} ${f(R + R * Math.sin(a))}`, big = p > 0.5 ? 1 : 0, sweep = counterClockwise ? 0 : 1;
    const box = { width: 2 * R, height: 2 * R, transformOrigin: `${R} ${R}` };
    if (p >= 1) return { ...S.circle({ radius: R }) };
    if (p <= 0) return { path: closePath ? `M${R} ${R}L${pt(a0)}Z` : `M${pt(a0)}`, ...box };
    return { path: `M${closePath ? R + ' ' + R + 'L' : ''}${pt(a0)}A${R} ${R} 0 ${big} ${sweep} ${pt(ang)}${closePath ? 'Z' : ''}`, ...box };
  };
  S.heart = ({ size, aspectRatio }) => {   // a heart on a 20 × 18.35 grid (two lobes and a tip); aspectRatio = height / width
    need('size', size); const sx = size / 20, h = aspectRatio ? size * aspectRatio : size * 18.35 / 20, sy = h / 18.35;
    const P = (x, y) => `${f((x - 2) * sx)} ${f((y - 3) * sy)}`;
    return { path: `M${P(12, 21.35)}L${P(10.55, 20.03)}C${P(5.4, 15.36)} ${P(2, 12.28)} ${P(2, 8.5)}C${P(2, 5.42)} ${P(4.42, 3)} ${P(7.5, 3)}C${P(9.24, 3)} ${P(10.91, 3.81)} ${P(12, 5.09)}` +
      `C${P(13.09, 3.81)} ${P(14.76, 3)} ${P(16.5, 3)}C${P(19.58, 3)} ${P(22, 5.42)} ${P(22, 8.5)}C${P(22, 12.28)} ${P(18.6, 15.36)} ${P(13.45, 20.04)}L${P(12, 21.35)}Z`, width: f(size), height: f(h), transformOrigin: `${f(size / 2)} ${f(h / 2)}` };
  };
  S.arrow = ({ length = 300, headWidth = 185, headLength = 120, shaftWidth = 80, direction = 'right', cornerRadius = 0 } = {}) => {
    if (headLength >= length) throw new Error('shape: arrow headLength must be shorter than length');
    const m = Math.max(headWidth, shaftWidth) / 2, s = shaftWidth / 2, b = length - headLength, base = [[0, m - s], [b, m - s], [b, m - headWidth / 2], [length, m], [b, m + headWidth / 2], [b, m + s], [0, m + s]];
    const rot = { right: (p) => p, left: (p) => [length - p[0], p[1]], down: (p) => [p[1], p[0]], up: (p) => [p[1], length - p[0]] }[direction];
    if (!rot) throw new Error('shape: arrow direction is right | left | up | down');
    return poly(base.map(rot), cornerRadius);
  };
  S.callout = ({ width, height, cornerRadius = 0, triangleWidth = 40, triangleHeight = 30, direction = 'bottom', triangleOffset = 0.5 }) => {
    need('width', width); need('height', height);
    const sideH = direction === 'left' || direction === 'right', span = sideH ? height : width, c = span * triangleOffset, a = Math.max(0, c - triangleWidth / 2), z = Math.min(span, c + triangleWidth / 2), tip = c;
    const W = width, H = height, T = triangleHeight;
    const pts = { bottom: [[0, 0], [W, 0], [W, H], [z, H], [tip, H + T], [a, H], [0, H]], top: [[0, T], [a, T], [tip, 0], [z, T], [W, T], [W, H + T], [0, H + T]],
      right: [[0, 0], [W, 0], [W, a], [W + T, tip], [W, z], [W, H], [0, H]], left: [[T, 0], [W + T, 0], [W + T, H], [T, H], [T, z], [0, tip], [T, a]] }[direction];
    if (!pts) throw new Error('shape: callout direction is bottom | top | left | right');
    const rect = { bottom: [0, 0, W, H], top: [0, T, W, H + T], right: [0, 0, W, H], left: [T, 0, W + T, H] }[direction];
    return poly(pts, pts.map((p) => ((p[0] === rect[0] || p[0] === rect[2]) && (p[1] === rect[1] || p[1] === rect[3]) ? cornerRadius : 0)));
  };
  S.spark = ({ size, pinch = 0 }) => {
    need('size', size); const r = size / 2, c = r * pinch;
    return { path: `M${f(r)} 0Q${f(r + c)} ${f(r - c)} ${f(size)} ${f(r)}Q${f(r + c)} ${f(r + c)} ${f(r)} ${f(size)}Q${f(r - c)} ${f(r + c)} 0 ${f(r)}Q${f(r - c)} ${f(r - c)} ${f(r)} 0Z`, width: f(size), height: f(size), transformOrigin: `${f(r)} ${f(r)}` };
  };
  S.svg = (parent, shape, { fill = 'currentColor', stroke = 'none', strokeWidth = 0 } = {}) => {
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), p = document.createElementNS(NS, 'path');
    svg.setAttribute('width', shape.width); svg.setAttribute('height', shape.height); svg.setAttribute('viewBox', `0 0 ${shape.width} ${shape.height}`); svg.style.overflow = 'visible';
    p.setAttribute('d', shape.path); p.setAttribute('fill', fill); p.setAttribute('stroke', stroke); p.setAttribute('stroke-width', strokeWidth);
    svg.appendChild(p); (parent || K.stage).appendChild(svg); return svg;
  };
})();
