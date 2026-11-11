// TeX as drawable glyphs: KIT.tex. Load after engine.js, vendor/mathjax/config.js, vendor/mathjax/tex-svg-full.js and
// vendor/flubber/flubber.min.js (the HyperFrames renderer copies both folders to hf/kit/). KIT.math.equation (KaTeX, HTML) stays
// for plain rise-in equations; KIT.tex is the MathJax SVG path, for Manim-style Write and Transform. Animation semantics follow
// Manim Community (MIT): Write/Unwrite (DrawBorderThenFill per glyph, lagged), Transform with path_arc, TransformMatchingTex,
// set_color_by_tex. No Manim code is copied.
//   KIT.tex(tex, { x, y, size, color, parent, display, anchor })  → { el, glyphs, set(t), write(o), unwrite(o), transform(other, o), color(match, c) }
//     size = 1 em in px (default 56 * KIT.u); anchor 'center' | 'left' | 'right' at (x, y), y is the vertical middle.
//     glyphs: every visible path and rule in MathJax's document order, each { el, key, box }: key = MathJax's data-c codepoint
//     (rules, e.g. fraction and sqrt bars, are 'rule'); box = { x, y, w, h } in the parent's px. Rules become <path>s.
//   write({ at, dur, lag })     each glyph's outline draws on, then fills; glyphs start left to right `lag` apart (default
//                               KIT.staggerStep, shrunk so the whole write ends at at + dur; dur default KIT.dur(1))
//   unwrite({ at, dur, lag })   the reverse, right to left; ends hidden
//   transform(other, { at, dur, matching = true, pathArc = 0 })   other is another KIT.tex (hidden until then, shown at the end).
//     matching: glyphs with the same key pair up in order and move + scale from their box to the target's (along an arc of
//     pathArc radians, positive = counter-clockwise as in Manim); unmatched source glyphs fade out, unmatched targets fade in.
//     matching = false: glyph i morphs into target glyph i (flubber, interpolators built here); extras fade. Colours blend.
//   color(match, c)             colour every run of glyphs that `match`, rendered alone, produces → the glyphs coloured
// Hidden before its first scheduled call. Several calls may be scheduled on one tex; per glyph the latest started wins.
// Every set(t) writes every glyph's d, transform and style: a pure function of t. Both texes of a transform share a parent.
// Limits: color() matches the substring's glyph keys as a contiguous run, so a substring that renders differently alone
// (a different size or variant, \left( stretched by context) is not found, and every run of the same glyphs is coloured
// (x in x^2 and in 2x alike); it throws when nothing matches. Morphs sample glyph outlines to polygons (exact at both ends).
// MathJax <text> (characters outside its fonts) and nested <svg>s are not glyphs and are not drawn.
'use strict';
(function () {
  const K = window.KIT, SVG = 'http://www.w3.org/2000/svg';
  if (!K) throw new Error('tools/tex.js: load tools/engine.js first');
  if (!window.MathJax || typeof window.MathJax.tex2svg !== 'function') throw new Error('tools/tex.js: load vendor/mathjax/config.js, then vendor/mathjax/tex-svg-full.js, before it');
  if (!window.flubber) throw new Error('tools/tex.js: load vendor/flubber/flubber.min.js before it');

  // ── pure parts ───────────────────────────────────────────────────────────
  const smooth = (p) => { p = K.clamp(p); return p * p * (3 - 2 * p); };
  // Manim's path_along_arc for one point; screen y is down, so flip it to keep positive angles counter-clockwise
  const arc = (a, b, ang, p) => {
    const tn = Math.tan(ang / 2);
    if (!ang || Math.abs(tn) < 1e-9) return [K.lerp(a[0], b[0], p), K.lerp(a[1], b[1], p)];
    const vx = b[0] - a[0], vy = a[1] - b[1], cx = a[0] + vx / 2 - vy / 2 / tn, cy = -a[1] + vy / 2 + vx / 2 / tn;
    const r = ang * p, dx = a[0] - cx, dy = -a[1] - cy;
    return [cx + dx * Math.cos(r) - dy * Math.sin(r), -(cy + dx * Math.sin(r) + dy * Math.cos(r))];
  };
  // a glyph's look at write progress p: outline over the first half, fill (stroke fading) over the second
  const drawn = (p) => { const b = smooth(K.seg(p, 0.5, 1)); return { op: p > 0 ? 1 : 0, fill: b, stroke: 1 - b, a: smooth(K.seg(p, 0, 0.5)) }; };
  const HIDDEN = { op: 0 }, FULL = { op: 1, fill: 1, stroke: 0, a: 1 };
  const mix = (a, b, p) => (p <= 0 || a === b ? a : p >= 1 ? b : `color-mix(in srgb, ${a} ${+((1 - p) * 100).toFixed(3)}%, ${b})`);

  // ── MathJax → glyph list ─────────────────────────────────────────────────
  const render = (tex, display) => {
    const svg = window.MathJax.tex2svg(String(tex), { display }).querySelector('svg');
    const err = svg && svg.querySelector('[data-mjx-error]');
    if (!svg || err) throw new Error(`KIT.tex: ${err ? err.getAttribute('data-mjx-error') : 'no output'} in "${tex}"`);
    const parts = [...svg.querySelectorAll('path, rect')].filter((e) => !e.hasAttribute('data-background'));
    // a \color{...} in the source is an ancestor fill (not currentColor): it becomes that glyph's own colour
    const tint = (e) => { for (let a = e; a && a !== svg; a = a.parentNode) { const f = a.getAttribute && a.getAttribute('fill'); if (f && f !== 'currentColor' && f !== 'none') return f; } return null; };
    return { svg, parts, tints: parts.map(tint), hollow: parts.map((e) => e.tagName === 'rect' && e.getAttribute('fill') === 'none'),   // \boxed: an outline
      keys: parts.map((e) => (e.tagName === 'rect' ? 'rule' : e.getAttribute('data-c') || 'path')) };
  };
  const toUser = (e, root) => {   // the element's transforms up to MathJax's <svg>, as one matrix
    let m = new DOMMatrix();
    for (let a = e; a && a !== root; a = a.parentNode) {
      const c = a.transform && a.transform.baseVal.consolidate();
      if (c) m = DOMMatrix.fromMatrix(c.matrix).multiply(m);
      if (a.tagName === 'svg') {   // a nested <svg> (stretched delimiters, over/underbraces, arrows): its x/y and viewBox stretch
        const n = (k) => +a.getAttribute(k) || 0, vb = (a.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
        let v = new DOMMatrix().translate(n('x'), n('y'));
        if (vb.length === 4 && vb[2] && vb[3]) v = v.scale((n('width') || vb[2]) / vb[2], (n('height') || vb[3]) / vb[3]).translate(-vb[0], -vb[1]);
        m = v.multiply(m);
      }
    }
    return m;
  };
  const boxOf = (b, m) => {   // a local bbox through m → { x, y, w, h }
    const q = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
    const xs = q.map((p) => p.x), ys = q.map((p) => p.y), x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  };
  const center = (b) => [b.x + b.w / 2, b.y + b.h / 2];
  // a glyph's subpaths as polygons through m (for flubber), sampled once at creation
  const rings = (g, m, probe) => window.flubber.splitPathString(g.d).map((d) => {
    probe.setAttribute('d', d);
    const len = probe.getTotalLength(), n = K.clamp(Math.ceil(len / 8), 12, 240);
    return Array.from({ length: n }, (_, i) => { const q = probe.getPointAtLength((len * i) / n), p = new DOMPoint(q.x, q.y).matrixTransform(m); return [p.x, p.y]; });
  });
  const dot = (r) => { const [x, y] = r.reduce((s, p) => [s[0] + p[0] / r.length, s[1] + p[1] / r.length], [0, 0]); return [[x, y], [x + 0.5, y], [x, y + 0.5]]; };

  const INT = new WeakMap();   // tex → { G, acts, toStage }

  K.tex = (tex, o = {}) => {
    const size = o.size ?? 56 * K.u, color = o.color || 'var(--kit-ink)', parent = o.parent || K.stage, anchor = o.anchor || 'center';
    const src = render(tex, o.display ?? true);
    const [mx, my, vw, vh] = src.svg.getAttribute('viewBox').split(/[\s,]+/).map(Number), k = size / 1000;   // MathJax: 1000 units per em
    const W = vw * k, H = vh * k, x = o.x ?? K.safe.x + K.safe.w / 2, y = o.y ?? K.safe.y + K.safe.h / 2;
    const left = x - (anchor === 'left' ? 0 : anchor === 'right' ? W : W / 2), top = y - H / 2;
    const svg = document.createElementNS(SVG, 'svg');
    for (const [a, v] of [['width', W], ['height', H], ['viewBox', `${mx} ${my} ${vw} ${vh}`], ['class', 'kit-tex']]) svg.setAttribute(a, v);
    K.css(svg, { position: 'absolute', left: left + 'px', top: top + 'px', overflow: 'visible', pointerEvents: 'none', color });
    parent.appendChild(svg);
    const grp = document.createElementNS(SVG, 'g');
    grp.setAttribute('fill', 'currentColor'); grp.setAttribute('stroke', 'currentColor');
    grp.style.strokeLinejoin = 'round'; grp.style.strokeLinecap = 'round';
    svg.appendChild(grp);
    const toStage = new DOMMatrix().translate(left, top).scale(k).translate(-mx, -my);
    const G = src.parts.map((e, i) => {
      const M = toUser(e, src.svg);
      const d = e.tagName === 'rect' ? (([x0, y0, w, h]) => `M${x0} ${y0}H${x0 + w}V${y0 + h}H${x0}Z`)(['x', 'y', 'width', 'height'].map((a) => +e.getAttribute(a) || 0)) : e.getAttribute('d');
      const el = document.createElementNS(SVG, 'path');
      el.setAttribute('d', d); el.setAttribute('transform', M.toString());
      grp.appendChild(el);
      const ubox = boxOf(el.getBBox(), M), s = Math.sqrt(Math.abs(M.a * M.d - M.b * M.c)) || 1;
      return { el, key: src.keys[i], box: boxOf({ x: ubox.x, y: ubox.y, width: ubox.w, height: ubox.h }, toStage),
        d, M, m: M.toString(), ubox, len: el.getTotalLength(), sw: (3 * K.u) / (k * s), color: src.tints[i] || color, hollow: src.hollow[i] };
    });
    const order = G.map((_, i) => i).sort((a, b) => G[a].box.x - G[b].box.x || G[a].box.y - G[b].box.y);
    const rank = []; order.forEach((g, r) => (rank[g] = r));
    const acts = [];

    const apply = (g, s) => {
      g.el.setAttribute('d', s.d || g.d);
      g.el.setAttribute('transform', s.m || g.m);
      const a = s.a ?? 1, st = g.el.style;
      st.opacity = s.op; st.visibility = s.op > 0.001 ? 'visible' : 'hidden';
      const fill = s.fill ?? 1, stroke = s.stroke ?? 0;   // a hollow rule (\boxed) keeps its outline where others fill
      st.fillOpacity = g.hollow ? 0 : fill; st.strokeOpacity = g.hollow ? Math.max(fill, stroke) : stroke; st.strokeWidth = g.sw + 'px';
      st.strokeDasharray = a < 1 ? `${g.len} ${g.len}` : 'none'; st.strokeDashoffset = a < 1 ? g.len * (1 - a) : 0;
      st.color = s.color || g.color; st.fillRule = s.d ? 'evenodd' : 'nonzero';
    };
    const draw = (op, rev) => {
      const at = op.at ?? 0, dur = op.dur ?? K.dur(1), n = G.length;
      const lag = n > 1 ? Math.min(op.lag ?? K.staggerStep, (dur * 0.7) / (n - 1)) : 0, w = dur - lag * (n - 1);
      const start = (i) => at + (rev ? n - 1 - rank[i] : rank[i]) * lag;
      acts.push({ start, state: (i, t) => { const p = K.seg(t, start(i), start(i) + w); return drawn(rev ? 1 - p : p); } });
      return api;
    };

    const api = { el: svg, glyphs: G.map((g) => ({ el: g.el, key: g.key, box: g.box })),
      set(t) {
        G.forEach((g, i) => {
          let best = null, bs = -Infinity;
          for (const a of acts) { const s = a.start(i); if (s <= t && s >= bs) { bs = s; best = a; } }
          apply(g, best ? best.state(i, t) : HIDDEN);
        });
      },
      write: (op = {}) => draw(op, false),
      unwrite: (op = {}) => draw(op, true),
      transform(other, op = {}) {
        const I = INT.get(other);
        if (!I) throw new Error('KIT.tex transform: `other` must be another KIT.tex');
        const T = I.G, at = op.at ?? 0, dur = op.dur ?? K.dur(1), ang = op.pathArc ?? 0, matching = op.matching ?? true;
        const pair = G.map(() => -1), taken = T.map(() => false);
        G.forEach((g, i) => {
          const j = matching ? T.findIndex((h, j) => !taken[j] && h.key === g.key) : i < T.length ? i : -1;
          if (j >= 0) { pair[i] = j; taken[j] = true; }
        });
        const back = toStage.inverse().multiply(I.toStage);   // the other tex's user units → ours
        const probe = document.createElementNS(SVG, 'path'); grp.appendChild(probe);
        const plan = G.map((g, i) => {
          const j = pair[i];
          if (j < 0) return null;
          const tb = boxOf({ x: T[j].ubox.x, y: T[j].ubox.y, width: T[j].ubox.w, height: T[j].ubox.h }, back);
          if (matching) return { tb };
          const A = rings(g, g.M, probe), B = rings(T[j], back.multiply(T[j].M), probe);
          while (A.length < B.length) A.push(dot(B[A.length]));
          while (B.length < A.length) B.push(dot(A[B.length]));
          return { f: A.map((r, q) => window.flubber.interpolate(r, B[q], { string: true })) };
        });
        probe.remove();
        const ease = (t) => K.ease(K.seg(t, at, at + dur));
        acts.push({ start: () => at, state(i, t) {
          const p = ease(t), g = G[i], P = plan[i];
          if (!P) return { ...FULL, op: 1 - p };
          const c = mix(g.color, T[pair[i]].color, p);
          if (P.f) return p <= 0 ? { ...FULL, color: c } : { ...FULL, op: p >= 1 ? 0 : 1, color: c, d: P.f.map((f) => f(p)).join(' '), m: 'translate(0)' };
          const c0 = center(g.ubox), c1 = center(P.tb), cp = arc(c0, c1, ang, p);
          const sx = g.ubox.w ? K.lerp(1, P.tb.w / g.ubox.w, p) : 1, sy = g.ubox.h ? K.lerp(1, P.tb.h / g.ubox.h, p) : 1;
          const m = new DOMMatrix().translate(cp[0], cp[1]).scale(sx, sy).translate(-c0[0], -c0[1]).multiply(g.M).toString();
          return { ...FULL, op: p >= 1 ? 0 : 1, color: c, m };   // at the end the target takes over, exactly where this lands
        } });
        I.acts.push({ start: () => at, state: (j, t) => { const p = ease(t); return p >= 1 ? FULL : taken[j] ? HIDDEN : { ...FULL, op: p }; } });
        return api;
      },
      color(match, c) {
        const keys = render(match, false).keys, hit = [];
        for (let i = 0; keys.length && i + keys.length <= G.length; i++) {
          if (keys.every((kk, q) => G[i + q].key === kk)) { for (let q = 0; q < keys.length; q++) { G[i + q].color = c; hit.push(api.glyphs[i + q]); } i += keys.length - 1; }
        }
        if (!hit.length) throw new Error(`KIT.tex color: "${match}" not found in "${tex}"`);
        return hit;
      } };
    INT.set(api, { G, acts, toStage });
    api.set(-Infinity);
    return api;
  };
})();
