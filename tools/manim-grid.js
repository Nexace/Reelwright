// Manim grids and shapes, native: Table / MathTable / IntegerTable / DecimalTable / MobjectTable, Matrix / DecimalMatrix / IntegerMatrix /
// MobjectMatrix / TexMatrix, boolean ops Union / Difference / Intersection / Exclusion, and Code with syntax highlighting. Load after
// engine.js, doodle.js, math.js (math2.js for boolMob / M.mob; motion.js for entry indicate). Table kind 'math' and matrix kind 'tex'
// need vendor/katex loaded; the boolean ops need vendor/polygon-clipping/polygon-clipping.umd.min.js (MIT) before this file.
// Semantics follow Manim Community Edition (MIT): mobject/table.py, mobject/matrix.py, mobject/types/vectorized_mobject boolean_ops.py,
// mobject/text/code_mobject.py. No Manim code is copied. Built once at load; every .set(t) is a pure function of t. Stage px.
//   KIT.math.table(data, { kind = 'text' | 'math' | 'integer' | 'decimal' | 'mobject', decimals = 2, rowLabels, colLabels, topLeft,
//        outerLines = false, x, y (centre; default the safe box centre), size = 40, hGap, vGap, color, lineColor, lineWidth = 3,
//        in = 0, draw = KIT.dur(1), step = KIT.staggerStep, out, parent })
//        → { el, entries (2-D elements), entry(i, j), rowLabels, colLabels, cellRect(i, j) → {x, y, w, h}, box, lines,
//            highlight(i, j, { in, out, color, opacity }), indicate(i, j, { at, dur }), set(t) }
//        data[i][j]; a 'mobject' table takes elements (DOM or strings). Lines draw on over `draw`, then the entries fade in row by row.
//        i, j are 0-based over the data (labels excluded); labels are rowLabels[i] / colLabels[j].
//   KIT.math.matrix(data, { kind = 'text' | 'integer' | 'decimal' | 'mobject' | 'tex', decimals = 1, bracket = 'square' | 'paren' | 'bar',
//        x, y, size = 48, hGap, vGap, color, bracketColor, in = 0, draw = KIT.dur(0.8), step = KIT.staggerStep, out, parent })
//        → { el, entries, entry(i, j), getEntries() (row-major), getRows(), getColumns(), brackets: { left, right }, box,
//            setRowColors(...c), setColumnColors(...c), setEntryColor(i, j, c), indicate(i, j, { at, dur }), set(t) }
//   KIT.math.flatten(d, tol = 0.25) → [{ pts: [[x, y]], closed }]   an SVG path d sampled to polylines (M L H V C S Q T A Z, abs + rel)
//   KIT.math.bool(op, ...shapes) → { d, polys, area }   op = 'union' | 'difference' (the first minus the rest) | 'intersection' |
//        'exclusion' (xor of two). A shape = a path d, a path element, a previous result, or a MultiPolygon [[ring…]…]. Curves are sampled to within
//        0.05 px (inscribed, so a circle's area is about 0.3 % low), so the result is a polyline outline (even-odd holes kept). KIT.math.union / difference / intersection / exclusion are the four.
//   KIT.math.boolMob(op, shapes, mobOptions) → KIT.math.mob(result.d, …) with .result   (needs math2.js)
//   KIT.math.code(tokens | id, { x, y, size = 30, lineNumbers = false, reveal = 'lines' | 'chars' | 'none', in = 0, step, cps = 60, pad, radius,
//        bg, out, parent }) → { el, lines, end, focus(from, to, { in, out, dim }), set(t) }
//        tokens = the object `reelwright code <project> highlight <file>` writes ({ bg, fg, lines: [[{ content, color, fontStyle }]] }),
//        or the id it was stored under in window.CODE. Highlighting is done at build time (vendor/shiki, tools/manim/code.mjs), never in the page.
'use strict';
(function () {
  const K = window.KIT, M = K.math, SVG = 'http://www.w3.org/2000/svg', u = K.u;
  if (!M || !K.doodle) throw new Error('tools/manim-grid.js: load tools/engine.js, doodle.js and math.js first');
  const f2 = (v) => +v.toFixed(2);
  const svgEl = (tag, parent, style = {}, attrs = {}) => {
    const e = document.createElementNS(SVG, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    Object.assign(e.style, style);
    if (parent) parent.appendChild(e);
    return e;
  };
  const fade = (o, t) => (o.out == null ? 1 : 1 - K.easeIn(K.seg(t, o.out - K.dur(0.45), o.out)));
  const katex = () => {
    if (!window.katex) throw new Error('KIT.math: this needs KaTeX; load vendor/katex/katex.min.js (and katex.min.css) first');
    return window.katex;
  };
  const stageSvg = (parent) => svgEl('svg', parent, { position: 'absolute', left: '0', top: '0', overflow: 'visible', pointerEvents: 'none' }, { width: K.W_, height: K.H_ });

  // ── grid layout ──────────────────────────────────────────────────────────
  // fill(kind, value) → element in `host`. 'mobject' takes DOM elements as they are (moved into the host).
  const cell = (host, kind, v, o) => {
    const el = v instanceof Element ? v : K.el('div', 'kit-cell', host);
    if (v instanceof Element) host.appendChild(v);
    else if (kind === 'math' || kind === 'tex') el.innerHTML = katex().renderToString(String(v), { throwOnError: true, displayMode: false, output: 'html' });
    else if (kind === 'integer') el.textContent = String(Math.round(Number(v))).replace('-', '−');
    else if (kind === 'decimal') el.textContent = Number(v).toFixed(o.decimals).replace('-', '−');
    else el.textContent = String(v).replace(/^-(?=\d)/, '−');
    K.css(el, { position: 'absolute', whiteSpace: 'nowrap', lineHeight: '1.2', fontVariantNumeric: 'tabular-nums' });
    return el;
  };
  // grid of elements → positions. gaps in px; returns { colW, rowH, x(j), y(i), w, h } relative to the grid's top-left
  const layout = (els, hGap, vGap) => {
    const rows = els.length, cols = Math.max(...els.map((r) => r.length));
    const colW = Array(cols).fill(0), rowH = Array(rows).fill(0);
    els.forEach((r, i) => r.forEach((e, j) => { if (!e) return; colW[j] = Math.max(colW[j], e.offsetWidth); rowH[i] = Math.max(rowH[i], e.offsetHeight); }));
    const xs = [], ys = [];
    let x = 0, y = 0;
    colW.forEach((w) => { xs.push(x); x += w + hGap; });
    rowH.forEach((h) => { ys.push(y); y += vGap + h; });
    return { colW, rowH, xs, ys, w: x - hGap, h: y - vGap, cx: (j) => xs[j] + colW[j] / 2, cy: (i) => ys[i] + rowH[i] / 2 };
  };
  const place = (els, L, left, top) => els.forEach((r, i) => r.forEach((e, j) => {
    if (!e) return;
    K.css(e, { left: f2(left + L.cx(j)) + 'px', top: f2(top + L.cy(i)) + 'px', translate: '-50% -50%' });
  }));
  const reveal = (els, t, t0, step, rise) => els.forEach((e, k) => {
    const p = K.ease(K.seg(t, t0 + k * step, t0 + k * step + K.dur(0.4)));
    e.style.opacity = String(p); e.style.visibility = p > 0 ? 'visible' : 'hidden';
    e.style.translate = `-50% calc(-50% + ${f2((1 - p) * rise)}px)`;
  });

  // ── Table ────────────────────────────────────────────────────────────────
  M.table = (data, o = {}) => {
    const kind = o.kind || 'text', parent = o.parent || K.stage, size = (o.size ?? 40) * u, t0 = o.in ?? 0, draw = o.draw ?? K.dur(1);
    const step = o.step ?? K.staggerStep, hGap = o.hGap ?? 56 * u, vGap = o.vGap ?? 30 * u, s = K.safe;
    const root = K.el('div', 'kit-table', parent);
    K.css(root, { position: 'absolute', left: '0', top: '0', width: K.W_ + 'px', height: K.H_ + 'px', pointerEvents: 'none', fontSize: size + 'px',
      color: o.color || 'var(--kit-ink)', fontFamily: 'var(--kit-font-text)', visibility: 'hidden' });
    const mk = (v, kd = kind) => cell(root, kd, v, { decimals: o.decimals ?? 2 });
    const body = data.map((r) => r.map((v) => mk(v)));
    const colLab = o.colLabels ? o.colLabels.map((v) => mk(v, kind === 'mobject' ? 'mobject' : 'text')) : null;
    const rowLab = o.rowLabels ? o.rowLabels.map((v) => mk(v, kind === 'mobject' ? 'mobject' : 'text')) : null;
    const corner = o.topLeft != null ? mk(o.topLeft, 'text') : null;
    [...(colLab || []), ...(rowLab || []), corner].forEach((e) => { if (e) e.style.fontWeight = '700'; });
    const grid = [];
    if (colLab) grid.push(rowLab ? [corner, ...colLab] : colLab);
    body.forEach((r, i) => grid.push(rowLab ? [rowLab[i], ...r] : r));
    const L = layout(grid, hGap, vGap), cx = o.x ?? s.x + s.w / 2, cy = o.y ?? s.y + s.h / 2, left = cx - L.w / 2, top = cy - L.h / 2;
    place(grid, L, left, top);
    const r0 = colLab ? 1 : 0, c0 = rowLab ? 1 : 0;   // data starts at grid row r0, column c0
    const cellRect = (i, j) => ({ x: left + L.xs[j + c0] - hGap / 2, y: top + L.ys[i + r0] - vGap / 2, w: L.colW[j + c0] + hGap, h: L.rowH[i + r0] + vGap });
    const svg = stageSvg(root);
    const hlG = svgEl('g', svg), lineG = svgEl('g', svg, { stroke: o.lineColor || 'var(--kit-ink)', strokeWidth: (o.lineWidth ?? 3) * u, strokeLinecap: 'round', fill: 'none' });
    const lines = [], X0 = left - hGap / 2, X1 = left + L.w + hGap / 2, Y0 = top - vGap / 2, Y1 = top + L.h + vGap / 2;
    const line = (a, b) => lines.push(svgEl('path', lineG, {}, { d: `M${f2(a[0])} ${f2(a[1])}L${f2(b[0])} ${f2(b[1])}` }));
    const rows = grid.length, cols = L.colW.length;
    for (let i = o.outerLines ? 0 : 1; i <= (o.outerLines ? rows : rows - 1); i++) { const y = i === 0 ? Y0 : i === rows ? Y1 : top + L.ys[i] - vGap / 2; line([X0, y], [X1, y]); }
    for (let j = o.outerLines ? 0 : 1; j <= (o.outerLines ? cols : cols - 1); j++) { const x = j === 0 ? X0 : j === cols ? X1 : left + L.xs[j] - hGap / 2; line([x, Y0], [x, Y1]); }
    const ordered = [...(corner ? [corner] : []), ...(colLab || []), ...grid.slice(r0).flatMap((r) => r)].filter((e, k, a) => e && a.indexOf(e) === k);
    const hls = [];
    const api = { el: root, entries: body, entry: (i, j) => body[i][j], rowLabels: rowLab, colLabels: colLab, cellRect, lines, box: { x: X0, y: Y0, w: X1 - X0, h: Y1 - Y0 },
      highlight(i, j, ho = {}) {
        const rc = cellRect(i, j), r = svgEl('rect', hlG, { fill: ho.color || 'var(--kit-accent)', opacity: 0 }, { x: f2(rc.x), y: f2(rc.y), width: f2(rc.w), height: f2(rc.h) });
        const h = { rect: r, set(t) {
          const a = K.ease(K.seg(t, ho.in ?? 0, (ho.in ?? 0) + K.dur(0.4))), b = ho.out == null ? 0 : K.ease(K.seg(t, ho.out, ho.out + K.dur(0.4)));
          r.style.opacity = String((ho.opacity ?? 0.35) * a * (1 - b));
        } };
        hls.push(h); return h;
      },
      indicate: (i, j, io = {}) => K.indicate.indicate(body[i][j], { parent, ...io }),
      set(t) {
        const p = K.seg(t, t0, t0 + draw);
        K.show(root, p > 0 || t >= t0 ? fade(o, t) : 0);
        lines.forEach((l) => K.doodle.drawOn(l, K.ease(K.seg(p, 0, 0.6))));
        reveal(ordered, t, t0 + draw * 0.4, step, 8 * u);
        hls.forEach((h) => h.set(t));
      } };
    return api;
  };

  // ── Matrix ───────────────────────────────────────────────────────────────
  const bracketD = (kind, x, y, h, side, w) => {   // side -1 left, +1 right; x = the edge nearest the entries
    const o = x + side * w;   // outer edge (left of the entries for side -1)
    if (kind === 'paren') return `M${f2(x)} ${f2(y)}C${f2(o)} ${f2(y + h * 0.2)} ${f2(o)} ${f2(y + h * 0.8)} ${f2(x)} ${f2(y + h)}`;
    if (kind === 'bar') return `M${f2(x + side * w / 2)} ${f2(y)}L${f2(x + side * w / 2)} ${f2(y + h)}`;
    return `M${f2(x)} ${f2(y)}L${f2(o)} ${f2(y)}L${f2(o)} ${f2(y + h)}L${f2(x)} ${f2(y + h)}`;
  };
  M.matrix = (data, o = {}) => {
    const kind = o.kind || 'text', parent = o.parent || K.stage, size = (o.size ?? 48) * u, t0 = o.in ?? 0, draw = o.draw ?? K.dur(0.8), step = o.step ?? K.staggerStep;
    const hGap = o.hGap ?? 40 * u, vGap = o.vGap ?? 16 * u, s = K.safe, bw = 14 * u;
    const root = K.el('div', 'kit-matrix', parent);
    K.css(root, { position: 'absolute', left: '0', top: '0', width: K.W_ + 'px', height: K.H_ + 'px', pointerEvents: 'none', fontSize: size + 'px',
      color: o.color || 'var(--kit-ink)', fontFamily: 'var(--kit-font-text)', visibility: 'hidden' });
    const entries = data.map((r) => r.map((v) => cell(root, kind, v, { decimals: o.decimals ?? 1 })));
    const L = layout(entries, hGap, vGap), cx = o.x ?? s.x + s.w / 2, cy = o.y ?? s.y + s.h / 2, left = cx - L.w / 2, top = cy - L.h / 2;
    place(entries, L, left, top);
    const svg = stageSvg(root), bc = o.bracketColor || 'var(--kit-ink)', pad = hGap / 2 + 4 * u, ext = vGap / 2 + 6 * u;
    const bst = { fill: 'none', stroke: bc, strokeWidth: 4 * u, strokeLinecap: 'round', strokeLinejoin: 'round' };
    const br = o.bracket || 'square';
    const left_ = svgEl('path', svg, bst, { d: bracketD(br, left - pad, top - ext, L.h + 2 * ext, -1, bw) });
    const right_ = svgEl('path', svg, bst, { d: bracketD(br, left + L.w + pad, top - ext, L.h + 2 * ext, 1, bw) });
    const flat = entries.flat(), setColor = (e, c) => { e.style.color = c; };
    const cyc = (cols, k) => cols[k % cols.length];
    return { el: root, entries, entry: (i, j) => entries[i][j], getEntries: () => flat.slice(), getRows: () => entries.map((r) => r.slice()),
      getColumns: () => entries[0].map((_, j) => entries.map((r) => r[j])), brackets: { left: left_, right: right_ },
      box: { x: left - pad - bw, y: top - ext, w: L.w + 2 * (pad + bw), h: L.h + 2 * ext },
      setRowColors(...cols) { entries.forEach((r, i) => r.forEach((e) => setColor(e, cyc(cols, i)))); return this; },
      setColumnColors(...cols) { entries.forEach((r) => r.forEach((e, j) => setColor(e, cyc(cols, j)))); return this; },
      setEntryColor(i, j, c) { setColor(entries[i][j], c); return this; },
      indicate: (i, j, io = {}) => K.indicate.indicate(entries[i][j], { parent, ...io }),
      set(t) {
        K.show(root, t >= t0 ? fade(o, t) : 0);
        const p = K.ease(K.seg(t, t0, t0 + draw));
        K.doodle.drawOn(left_, p); K.doodle.drawOn(right_, p);
        reveal(flat, t, t0 + draw * 0.5, step, 6 * u);
      } };
  };

  // ── path d → polylines ───────────────────────────────────────────────────
  M.flatten = (d, tol = 0.25) => {
    const re = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/y, out = [];
    let i = 0, cur = null, x = 0, y = 0, sx = 0, sy = 0, cmd = '', lastC = null, lastQ = null;
    const ws = () => { while (i < d.length && /[\s,]/.test(d[i])) i++; };
    const num = () => { ws(); re.lastIndex = i; const m = re.exec(d); if (!m) throw new Error(`KIT.math.flatten: number expected at ${i} in "${d.slice(0, 40)}"`); i = re.lastIndex; return parseFloat(m[0]); };
    const flag = () => { ws(); const c = d[i++]; if (c !== '0' && c !== '1') throw new Error('KIT.math.flatten: arc flag expected at ' + (i - 1)); return +c; };
    const start = (px, py) => { cur = { pts: [[px, py]], closed: false }; out.push(cur); };
    const line = (px, py) => { cur.pts.push([px, py]); x = px; y = py; };
    const cubic = (a, b, c) => {
      const dd = Math.max(Math.hypot(x - 2 * a[0] + b[0], y - 2 * a[1] + b[1]), Math.hypot(a[0] - 2 * b[0] + c[0], a[1] - 2 * b[1] + c[1]));
      const n = Math.min(200, Math.max(2, Math.ceil(Math.sqrt((0.75 * dd) / tol))));
      for (let k = 1; k <= n; k++) { const q = k / n, m = 1 - q;
        cur.pts.push([m * m * m * x + 3 * m * m * q * a[0] + 3 * m * q * q * b[0] + q * q * q * c[0], m * m * m * y + 3 * m * m * q * a[1] + 3 * m * q * q * b[1] + q * q * q * c[1]]); }
      x = c[0]; y = c[1];
    };
    const quad = (a, c) => {
      const dd = Math.hypot(x - 2 * a[0] + c[0], y - 2 * a[1] + c[1]), n = Math.min(200, Math.max(2, Math.ceil(Math.sqrt(dd / (4 * tol)))));
      for (let k = 1; k <= n; k++) { const q = k / n, m = 1 - q; cur.pts.push([m * m * x + 2 * m * q * a[0] + q * q * c[0], m * m * y + 2 * m * q * a[1] + q * q * c[1]]); }
      x = c[0]; y = c[1];
    };
    const arc = (rx, ry, phi, fa, fs, ex, ey) => {
      rx = Math.abs(rx); ry = Math.abs(ry);
      if (!rx || !ry || (ex === x && ey === y)) return line(ex, ey);
      const cp = Math.cos((phi * Math.PI) / 180), sp = Math.sin((phi * Math.PI) / 180), dx = (x - ex) / 2, dy = (y - ey) / 2;
      const x1 = cp * dx + sp * dy, y1 = -sp * dx + cp * dy, lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
      if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
      const num_ = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
      const co = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num_ / den)), cxp = (co * rx * y1) / ry, cyp = (-co * ry * x1) / rx;
      const cx = cp * cxp - sp * cyp + (x + ex) / 2, cy = sp * cxp + cp * cyp + (y + ey) / 2;
      const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      const th1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
      let dth = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
      if (!fs && dth > 0) dth -= 2 * Math.PI; else if (fs && dth < 0) dth += 2 * Math.PI;
      const r = Math.max(rx, ry), n = Math.min(400, Math.max(4, Math.ceil(Math.abs(dth) / (2 * Math.acos(Math.max(0, 1 - tol / r))))));
      for (let k = 1; k <= n; k++) { const a = th1 + (dth * k) / n, ex_ = rx * Math.cos(a), ey_ = ry * Math.sin(a); cur.pts.push([cp * ex_ - sp * ey_ + cx, sp * ex_ + cp * ey_ + cy]); }
      x = ex; y = ey;
    };
    for (;;) {
      ws();
      if (i >= d.length) break;
      if (/[A-Za-z]/.test(d[i])) cmd = d[i++]; else if (!cmd) throw new Error('KIT.math.flatten: path must start with a command');
      const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
      if (C === 'Z') { if (cur) { cur.closed = true; x = sx; y = sy; } lastC = lastQ = null; cmd = ''; continue; }
      if (C === 'M') { const nx = ox + num(), ny = oy + num(); sx = x = nx; sy = y = ny; start(nx, ny); cmd = rel ? 'l' : 'L'; lastC = lastQ = null; continue; }
      if (!cur) throw new Error('KIT.math.flatten: path must start with M');
      if (cur.closed) start(x, y);
      if (C === 'L') line(ox + num(), oy + num());
      else if (C === 'H') line((rel ? x : 0) + num(), y);
      else if (C === 'V') line(x, (rel ? y : 0) + num());
      else if (C === 'C') { const a = [ox + num(), oy + num()], b = [ox + num(), oy + num()], c = [ox + num(), oy + num()]; cubic(a, b, c); lastC = b; lastQ = null; continue; }
      else if (C === 'S') { const a = lastC ? [2 * x - lastC[0], 2 * y - lastC[1]] : [x, y], b = [ox + num(), oy + num()], c = [ox + num(), oy + num()]; cubic(a, b, c); lastC = b; lastQ = null; continue; }
      else if (C === 'Q') { const a = [ox + num(), oy + num()], c = [ox + num(), oy + num()]; quad(a, c); lastQ = a; lastC = null; continue; }
      else if (C === 'T') { const a = lastQ ? [2 * x - lastQ[0], 2 * y - lastQ[1]] : [x, y], c = [ox + num(), oy + num()]; quad(a, c); lastQ = a; lastC = null; continue; }
      else if (C === 'A') { const rx = num(), ry = num(), phi = num(), fa = flag(), fs = flag(); arc(rx, ry, phi, fa, fs, ox + num(), oy + num()); }
      else throw new Error(`KIT.math.flatten: unknown command "${cmd}"`);
      lastC = lastQ = null;
    }
    return out.filter((s) => s.pts.length > 1);
  };

  // ── boolean ops ──────────────────────────────────────────────────────────
  const pc = () => {
    if (!window.polygonClipping) throw new Error('KIT.math.bool: load vendor/polygon-clipping/polygon-clipping.umd.min.js first');
    return window.polygonClipping;
  };
  const ringArea = (r) => { let a = 0; for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a / 2; };
  const toMulti = (s) => {
    if (s && s.polys) return s.polys;
    if (Array.isArray(s)) return s;
    const d = typeof s === 'string' ? s : s && s.getAttribute ? s.getAttribute('d') : s && s.d;
    if (!d) throw new Error('KIT.math.bool: a shape must be a path d, a path element, a previous result or a MultiPolygon');
    const rings = M.flatten(d, 0.05).filter((r) => r.pts.length > 2).map((r) => r.pts);
    if (!rings.length) throw new Error('KIT.math.bool: the path has no area');
    return rings.length === 1 ? [[rings[0]]] : pc().xor(...rings.map((r) => [[r]]));   // several subpaths: even-odd, like the fill
  };
  const OPS = { union: 'union', difference: 'difference', intersection: 'intersection', exclusion: 'xor', xor: 'xor' };
  M.bool = (op, ...shapes) => {
    if (!OPS[op]) throw new Error(`KIT.math.bool: op "${op}" is not union, difference, intersection or exclusion`);
    if (shapes.length < 2) throw new Error('KIT.math.bool: needs at least two shapes');
    if (op === 'exclusion' && shapes.length !== 2) throw new Error('KIT.math.bool: exclusion takes exactly two shapes');
    const polys = pc()[OPS[op]](...shapes.map(toMulti));
    let d = '', area = 0;
    for (const poly of polys) {
      poly.forEach((ring, k) => {
        d += 'M' + ring.slice(0, -1).map((q) => `${f2(q[0])} ${f2(q[1])}`).join('L') + 'Z';
        area += (k ? -1 : 1) * Math.abs(ringArea(ring));
      });
    }
    return { d, polys, area };
  };
  for (const op of ['union', 'difference', 'intersection', 'exclusion']) M[op] = (...shapes) => M.bool(op, ...shapes);
  M.boolMob = (op, shapes, mo = {}) => {
    if (!M.mob) throw new Error('KIT.math.boolMob: load tools/math2.js first');
    const result = M.bool(op, ...shapes);
    return Object.assign(M.mob(result.d, { fill: 'var(--kit-accent)', fillOpacity: 0.6, ...mo }), { result });
  };

  // ── Code ─────────────────────────────────────────────────────────────────
  M.code = (src, o = {}) => {
    const tok = typeof src === 'string' ? (window.CODE || {})[src] : src;
    if (!tok || !tok.lines) throw new Error(`KIT.math.code: no highlighted code${typeof src === 'string' ? ` "${src}" in window.CODE` : ''}: run \`reelwright code <project> highlight <file>\` and load the file it writes`);
    const parent = o.parent || K.stage, size = (o.size ?? 30) * u, s = K.safe, mode = o.reveal || 'lines', t0 = o.in ?? 0, step = o.step ?? K.staggerStep, cps = o.cps ?? 60;
    const root = K.el('div', 'kit-code', parent);
    K.css(root, { position: 'absolute', left: '0', top: '0', boxSizing: 'border-box', padding: (o.pad ?? 28 * u) + 'px', borderRadius: (o.radius ?? 16 * u) + 'px',
      background: o.bg || tok.bg || 'var(--kit-bg)', color: tok.fg || 'var(--kit-ink)', fontFamily: 'var(--kit-font-mono, ui-monospace, "SF Mono", Menlo, Consolas, monospace)',
      fontSize: size + 'px', lineHeight: '1.55', whiteSpace: 'pre', visibility: 'hidden', fontVariantLigatures: 'none' });
    const nDigits = String(tok.lines.length).length;
    const lines = tok.lines.map((toks, i) => {
      const row = K.el('div', 'kit-code-line', root);
      row.style.position = 'relative';
      if (o.lineNumbers) { const n = K.el('span', '', row); n.textContent = String(i + 1).padStart(nDigits, ' ') + '  '; K.css(n, { opacity: 0.45, userSelect: 'none' }); }
      const spans = toks.map((tk) => {
        const e = K.el('span', '', row); e.textContent = tk.content; e.style.color = tk.color || '';
        if (tk.fontStyle & 1) e.style.fontStyle = 'italic';
        if (tk.fontStyle & 2) e.style.fontWeight = '700';
        if (tk.fontStyle & 4) e.style.textDecoration = 'underline';
        return e;
      });
      if (!toks.length) row.appendChild(document.createTextNode(' '));   // an empty line keeps its height
      return { row, spans, texts: toks.map((tk) => tk.content), n: toks.reduce((a, tk) => a + tk.content.length, 0) };
    });
    const w = root.offsetWidth, h = root.offsetHeight;
    K.css(root, { left: f2(o.x ?? s.x + (s.w - w) / 2) + 'px', top: f2(o.y ?? s.y + (s.h - h) / 2) + 'px' });
    const total = lines.reduce((a, l) => a + l.n + 1, 0), end = t0 + (mode === 'chars' ? total / cps : mode === 'lines' ? lines.length * step + K.dur(0.4) : 0);
    const focus = [];
    return { el: root, lines: lines.map((l) => l.row), end, tokens: tok,
      focus(from, to, fo = {}) { focus.push({ from, to, ...fo }); return this; },
      set(t) {
        K.show(root, t >= t0 ? fade(o, t) : 0);
        let seen = Math.max(0, (t - t0) * cps);   // chars mode: characters typed so far (a newline counts as one)
        lines.forEach((l, i) => {
          let a = 1;
          if (mode === 'lines') a = K.ease(K.seg(t, t0 + i * step, t0 + i * step + K.dur(0.4)));
          else if (mode === 'chars') {
            const k = Math.min(l.n, Math.max(0, Math.floor(seen)));
            l.spans.forEach((e, j) => { const before = l.texts.slice(0, j).reduce((x, y) => x + y.length, 0); e.textContent = l.texts[j].slice(0, Math.max(0, k - before)); });
            seen -= l.n + 1;
          }
          let dim = 1;
          for (const fc of focus) {
            const on = K.ease(K.seg(t, fc.in ?? 0, (fc.in ?? 0) + K.dur(0.4))) * (fc.out == null ? 1 : 1 - K.ease(K.seg(t, fc.out, fc.out + K.dur(0.4))));
            if (i + 1 < fc.from || i + 1 > fc.to) dim = Math.min(dim, K.lerp(1, fc.dim ?? 0.3, on));
          }
          l.row.style.opacity = String(a * dim);
        });
      } };
  };
})();
