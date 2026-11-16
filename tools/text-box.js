// text-box.js: a rounded highlight box behind multi-line text (the shape of @remotion/rounded-text-box). Load after engine.js. Call at load, after
// document.fonts.ready, on an element that is not itself scaled or rotated yet (it reads the text layout once; render(t) can then move / fade the svg).
//   KIT.roundedTextBox(el, { radius = 12, pad = 8 | { x, y }, color = 'rgba(0,0,0,.85)' }) → { svg, path, d, lines }
//     measures one box per line of el's text (stage px, undone from any scale of the stage), joins them into one outline with rounded corners (convex and
//     concave) and puts an <svg> with that path just before el in its parent (el's parent becomes position:relative if it was static). el's text stays on top.
//   KIT.roundedTextBox.outline(lines, { radius, pad }) → { points, d }   the pure part: lines = [{ x, y, width, height }, …] top to bottom.
//     Neighbouring lines meet halfway between them; a corner's radius is cut down to half of its shorter edge, so a small step in line width stays a small step.
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('text-box.js: load tools/engine.js first');
  const r3 = (v) => +v.toFixed(3);
  const padOf = (p) => (typeof p === 'number' ? { x: p, y: p } : { x: p?.x ?? 8, y: p?.y ?? 8 });
  const outline = (lines, { radius = 12, pad = 8 } = {}) => {
    if (!lines.length) throw new Error('roundedTextBox: no lines');
    const { x: px, y: py } = padOf(pad), n = lines.length;
    const L = lines.map((l) => ({ l: l.x - px, r: l.x + l.width + px, t: l.y, b: l.y + l.height }));
    L[0].t -= py; L[n - 1].b += py;
    for (let i = 0; i < n - 1; i++) L[i].b = L[i + 1].t = (L[i].b + L[i + 1].t) / 2;
    let pts = [...L.flatMap((c) => [[c.r, c.t], [c.r, c.b]]), ...[...L].reverse().flatMap((c) => [[c.l, c.b], [c.l, c.t]])];
    const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
    pts = pts.filter((p, i) => !same(p, pts[(i + pts.length - 1) % pts.length]));   // duplicates
    pts = pts.filter((p, i) => { const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length]; return Math.abs((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])) > 1e-6; });   // collinear
    const m = pts.length, at = (p, q, d) => { const len = Math.hypot(q[0] - p[0], q[1] - p[1]); return [p[0] + (q[0] - p[0]) / len * d, p[1] + (q[1] - p[1]) / len * d]; };
    const cut = pts.map((p, i) => { const a = pts[(i + m - 1) % m], b = pts[(i + 1) % m], r = Math.min(radius, Math.hypot(p[0] - a[0], p[1] - a[1]) / 2, Math.hypot(b[0] - p[0], b[1] - p[1]) / 2); return [at(p, a, r), at(p, b, r)]; });
    const f = (p) => `${r3(p[0])} ${r3(p[1])}`;
    const d = `M ${f(cut[0][0])} ` + pts.map((p, i) => `Q ${f(p)} ${f(cut[i][1])} L ${f(cut[(i + 1) % m][0])}`).join(' ') + ' Z';
    return { points: pts.map((p) => p.map(r3)), d };
  };
  K.roundedTextBox = (el, { radius = 12, pad = 8, color = 'rgba(0,0,0,.85)' } = {}) => {
    const par = el.parentNode;
    if (getComputedStyle(par).position === 'static') par.style.position = 'relative';
    const base = par.getBoundingClientRect(), sx = base.width / (par.offsetWidth || base.width) || 1, sy = base.height / (par.offsetHeight || base.height) || 1;
    const range = document.createRange(); range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5).sort((a, b) => a.top - b.top || a.left - b.left), lines = [];
    for (const r of rects) {
      const g = lines.at(-1), mid = (r.top + r.bottom) / 2;
      if (g && mid > g.top && mid < g.bottom) { g.left = Math.min(g.left, r.left); g.right = Math.max(g.right, r.right); g.top = Math.min(g.top, r.top); g.bottom = Math.max(g.bottom, r.bottom); }
      else lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
    }
    const boxes = lines.map((g) => ({ x: (g.left - base.left) / sx - par.clientLeft, y: (g.top - base.top) / sy - par.clientTop, width: (g.right - g.left) / sx, height: (g.bottom - g.top) / sy }));
    const { d } = outline(boxes, { radius, pad });
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), path = document.createElementNS(NS, 'path');
    svg.setAttribute('style', 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none');
    path.setAttribute('d', d); path.setAttribute('fill', color); svg.appendChild(path);
    par.insertBefore(svg, el);
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';   // so the text paints above the svg
    return { svg, path, d, lines: boxes };
  };
  K.roundedTextBox.outline = outline;
})();
