// More hand-drawn helpers on KIT.doodle. Load after doodle.js (hf: <script src="kit/doodle2.js">; pvk: the same way as doodle.js).
// Same rules as doodle.js: every output is a pure function of (t, ids, options), seeded from D.hash(id), never a clock;
// the DOM is measured only at load. Sizes default in KIT.u; points are [x, y] px (in the user units of an <svg> parent).
//   noise(seed, x, y)         seeded 2-octave gradient noise in [0, 1], smooth in x and y
//   wobble2 / boil2           smooth hand wobble (neighbours move together); boil2 re-keys on floor(t*hz) like D.boil
//   ribbon(pts, o)            filled pen-ribbon `d` {w, taper, pressure, rough, seed|id, p}: p cuts the centreline so the tip keeps its taper
//   grain(svg, o)             once, at load: a pencil-tooth <mask> baked from noise into a periodic tile; returns 'url(#id)'
//   styles                    pen presets: pencil, marker, ballpoint, chalk, blueprint, riso (any field can be overridden per mark)
//   stroke(parent, pts, o)    one pen mark → {el, len, set(t)}: ribbon + retrace + grain; o = {id, style, in, draw, out, ease, color, zoom, ...}
//   score(marks, t0, t1, o)   drawing score: marks ordered by deps, timed by length (D.schedule) → {windows, order, set(t)}; t ≥ t1 = the finished picture
//   drawSVG(svg, o)           an inline SVG draws itself: outlines draw on, fills wash in after; at t ≥ t1 every attribute is the original again
//   letters(parent, text, o)  pen lettering on an authored single-stroke skeleton, constant nib speed → {el, width, set(t)}
//   glyphs                    that skeleton: A–Z 0–9 space . , ! ? - ' : — as [advance, strokes] on a 1000-unit em (cap 0..700, baseline 700)
//   planes([{el, z}], cam)    depth parallax for one camera {x, y, zoom}: offset ∝ 1/z, scale zoom^(1/z)
//   weight(zoom)              line-weight compensation zoom^-0.35 (D.stroke applies it when o.zoom is given)
//   matchedMove(o)            seam arithmetic: the exit accelerates into the cut, the entry leaves it at the same speed → {exit(u), entry(u)}
// Numbers marked "anidoodle" are from docs/archive/plans/phase-9-research/doodle-lottie.md §1.2.
'use strict';
(function () {
  const K = window.KIT, D = K && K.doodle;
  if (!D || !D.hash) throw new Error('doodle2.js: load tools/doodle.js first (KIT.doodle is missing)');
  const SVG = 'http://www.w3.org/2000/svg', u = K.u, f2 = (v) => +v.toFixed(2);
  const HZ = parseFloat(K.token('boil')) || 0;   // theme token, read once, as in doodle.js
  const ezOf = (e, d) => (e == null ? d : typeof e === 'function' ? e : K.easing(e));
  const mk = (tag, attrs, parent) => {
    const e = document.createElementNS(SVG, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  // ── noise ────────────────────────────────────────────────────────────────
  const lattice = (seed, ix, iy) => {   // integer hash of a lattice corner → gradient angle
    let h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iy | 0, 0x165667b1) ^ (seed >>> 0);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); h ^= h >>> 15;
    return ((h >>> 0) / 4294967296) * 2 * Math.PI;
  };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (seed, x, y, per = 0) => {   // Perlin gradient noise in [-√½, √½]; per > 0 tiles it every `per` cells
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, w = (i) => (per ? ((i % per) + per) % per : i);
    const dot = (i, j) => { const a = lattice(seed, w(x0 + i), w(y0 + j)); return Math.cos(a) * (fx - i) + Math.sin(a) * (fy - j); };
    const sx = fade(fx), a = dot(0, 0) + sx * (dot(1, 0) - dot(0, 0)), b = dot(0, 1) + sx * (dot(1, 1) - dot(0, 1));
    return a + fade(fy) * (b - a);
  };
  const R2 = Math.SQRT1_2;
  D.noise = (seed, x, y) => K.clamp(0.5 + (grad(seed, x, y) + 0.5 * grad(seed + 7919, 2 * x, 2 * y)) / (3 * R2));
  const FREQ = 0.035;   // anidoodle `wob`: noise cycles per px
  const smooth = (seed, pts, amp) => {
    const s = FREQ / u;
    return pts.map(([x, y]) => [x + (D.noise(seed, x * s, y * s) - 0.5) * 2 * amp, y + (D.noise(seed + 1013, x * s, y * s) - 0.5) * 2 * amp]);
  };
  D.wobble2 = (id, pts, amp = 1.2 * u) => smooth(D.hash(id), pts, amp);
  D.boil2 = (id, pts, t, amp = 0.6 * u, hz = HZ) =>
    hz > 0 ? smooth(D.hash(id) * 911 + Math.floor(t * hz + 1e-6), pts, amp) : pts.map((p) => p.slice());

  // ── ribbon ───────────────────────────────────────────────────────────────
  const crSample = (pts, per = 10) => {   // Catmull-Rom (tension 0.5), `per` samples a segment (anidoodle: 10)
    const n = pts.length, out = [];
    if (n < 2) return pts.map((p) => p.slice());
    const at = (i) => pts[Math.max(0, Math.min(n - 1, i))];
    for (let i = 0; i < n - 1; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      for (let k = 0; k < per; k++) {
        const s = k / per, s2 = s * s, s3 = s2 * s;
        out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * s + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * s2 + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * s3)));
      }
    }
    out.push(pts[n - 1].slice());
    return out;
  };
  const lerp = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  const upTo = (c, p) => {   // anidoodle upTo: equal-index cut of the centreline
    if (p >= 1) return c;
    const n = (c.length - 1) * p, i = Math.floor(n), f = n - i, out = c.slice(0, i + 1);
    if (f > 0) out.push(lerp(c[i], c[i + 1], f));
    return out;
  };
  const densify = (c, step) => {
    const out = [c[0]];
    for (let i = 1; i < c.length; i++) {
      const m = Math.max(1, Math.ceil(Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]) / step));
      for (let k = 1; k <= m; k++) out.push(lerp(c[i - 1], c[i], k / m));
    }
    return out;
  };
  const lenOf = (c) => { let l = 0; for (let i = 1; i < c.length; i++) l += Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]); return l; };
  // centreline c + half-widths hw → closed polygon: left edge, then the right edge reversed; each edge bites by ±rough/2
  const outline = (c, hw, rough, seed) => {
    const r = D.rng(seed * 31 + 7), N = c.length, P = new Array(2 * N);
    for (let i = 0; i < N; i++) {
      const a = c[Math.max(0, i - 1)], b = c[Math.min(N - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
      const l = Math.max(0, hw[i] + (r() - 0.5) * rough), q = Math.max(0, hw[i] + (r() - 0.5) * rough);
      P[i] = [c[i][0] - (dy / m) * l, c[i][1] + (dx / m) * l];
      P[2 * N - 1 - i] = [c[i][0] + (dy / m) * q, c[i][1] - (dx / m) * q];
    }
    return 'M' + P.map(([x, y]) => f2(x) + ' ' + f2(y)).join('L') + 'Z';
  };
  D.ribbon = (pts, o = {}) => {
    const p = o.p ?? 1;
    if (!(p > 0) || pts.length < 2) return '';
    const w = o.w ?? 6 * u, taper = o.taper ?? 1, pr = o.pressure ?? 1, rough = o.rough ?? 1.15 * u, seed = o.seed ?? D.hash(o.id ?? '');
    let c = upTo(crSample(pts), p);
    if (rough > 0) c = densify(c, 1.5 * u);   // anidoodle: ~1.5 px spacing so the bite reads
    const N = c.length, a = (seed % 17) * 0.37, b = (seed % 11) * 0.53;
    const hw = c.map((_, i) => {
      const t = N > 1 ? i / (N - 1) : 0, ends = Math.min(1, t / 0.14, (1 - t) / 0.2);   // 14 % attack, 20 % release
      const tp = 1 - taper + taper * Math.pow(Math.max(0.04, ends), 0.7);
      const q = Math.max(0.14, 1 - 0.26 * pr + pr * (0.3 * Math.sin(5.5 * t + a) + 0.14 * Math.sin(17 * t + b)));
      return (w * tp * q) / 2;
    });
    return outline(c, hw, rough, seed);
  };

  // ── grain ────────────────────────────────────────────────────────────────
  const tiles = {};
  const tile = (seed, size, cell) => (tiles[[seed, size, cell]] ||= (() => {   // baked once: white, alpha = clamp(-2.0 v + 2.05) (anidoodle pencilTooth)
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), im = g.createImageData(size, size), per = size / cell;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const v = 0.5 + grad(seed, x / cell, y / cell, per) * R2, i = 4 * (y * size + x);
      im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * K.clamp(-2.0 * v + 2.05));
    }
    g.putImageData(im, 0, 0);
    return c.toDataURL('image/png');
  })());
  let grains = 0;
  D.grain = (svg, o = {}) => {
    const size = o.size ?? 256, cell = o.cell ?? 4, seed = o.seed ?? 8, key = `${seed}-${size}-${cell}`;
    const have = [...svg.querySelectorAll('mask[data-kit-grain]')].find((m) => m.getAttribute('data-kit-grain') === key);
    if (have) return `url(#${have.id})`;
    if (size % cell) throw new Error(`doodle.grain: size ${size} is not a multiple of cell ${cell} (the tile would not repeat seamlessly)`);
    const id = 'kit-grain-' + grains++, href = tile(seed, size, cell), big = { x: -1e4, y: -1e4, width: 2e4, height: 2e4 };
    let defs = [...svg.children].find((e) => e.tagName === 'defs');
    if (!defs) defs = svg.insertBefore(mk('defs', {}), svg.firstChild);
    const pat = mk('pattern', { id: id + '-p', patternUnits: 'userSpaceOnUse', width: size, height: size }, defs);
    const img = mk('image', { href, width: size, height: size, preserveAspectRatio: 'none' }, pat);
    const mask = mk('mask', { id, 'data-kit-grain': key, maskUnits: 'userSpaceOnUse', ...big }, defs);
    mk('rect', { ...big, fill: `url(#${id}-p)` }, mask);
    // render(t) awaits K.img decodes, so the first frame already has the tooth (the proxy keeps the data: URL off the element)
    if (img.decode) K.img({ dataset: {}, decode: () => img.decode() }, href);
    return `url(#${id})`;
  };

  // ── styles + stroke ──────────────────────────────────────────────────────
  // pencil and riso: anidoodle w 3.4 × nib (1.45 / 1.7), wobble 1.1 × medium, boil 0.55, rough, taper, pressure, opacity 0.96
  D.styles = {
    pencil:    { w: 4.9 * u, taper: 1, pressure: 1, rough: 1.15 * u, wobble: 1.1 * u, boil: 0.55 * u, retrace: true, grain: true, color: 'var(--kit-ink)', opacity: 0.96 },
    riso:      { w: 5.8 * u, taper: 0.5, pressure: 0.5, rough: 0.9 * u, wobble: 1.76 * u, boil: 0.55 * u, retrace: false, grain: false, color: 'var(--kit-accent)', opacity: 0.9 },
    marker:    { w: 11 * u, taper: 0.25, pressure: 0.2, rough: 0.4 * u, wobble: 1.2 * u, boil: 0.5 * u, retrace: false, grain: false, color: 'var(--kit-accent)', opacity: 0.85 },
    ballpoint: { w: 2.6 * u, taper: 0.6, pressure: 0.6, rough: 0.3 * u, wobble: 0.9 * u, boil: 0.4 * u, retrace: true, grain: false, color: '#26408b', opacity: 0.92 },
    chalk:     { w: 7 * u, taper: 0.4, pressure: 0.7, rough: 1.6 * u, wobble: 1.4 * u, boil: 0.7 * u, retrace: true, grain: true, color: '#f4f1e8', opacity: 0.9 },
    blueprint: { w: 3 * u, taper: 0.1, pressure: 0.1, rough: 0.2 * u, wobble: 0.5 * u, boil: 0.25 * u, retrace: false, grain: false, color: '#e8f1ff', opacity: 0.95 },
  };
  const styleOf = (o, what) => {
    const s = D.styles[o.style || 'pencil'];
    if (!s) throw new Error(`doodle.${what}: unknown style "${o.style}" (have: ${Object.keys(D.styles).join(', ')})`);
    return { ...s, ...Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) };
  };
  const host = (parent) => {   // an <svg>/<g> parent gets a <g>; an HTML element gets an <svg> overlay child, as doodle.js marks do
    if (parent instanceof SVGElement) return { g: mk('g', {}, parent), svg: parent.ownerSVGElement || parent };
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    const svg = mk('svg', { width: parent.offsetWidth, height: parent.offsetHeight, style: 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none' }, parent);
    return { g: mk('g', {}, svg), svg };
  };
  const jitter = (seed, pts, amp) => { const r = D.rng(seed); return pts.map(([x, y]) => [x + (r() - 0.5) * 2 * amp, y + (r() - 0.5) * 2 * amp]); };
  const fadeOut = (t, out) => (out == null ? 1 : 1 - K.easeIn(K.seg(t, out - K.dur(0.45), out)));
  D.weight = (zoom) => Math.pow(zoom, -0.35);

  let strokes = 0;
  D.stroke = (parent, pts, o = {}) => {
    const s = styleOf(o, 'stroke'), id = o.id || 'stroke-' + strokes++, seed = D.hash(id), hz = o.hz ?? HZ;
    const { g, svg } = host(parent), ease = ezOf(o.ease, K.ease), t0 = o.in ?? 0, t1 = t0 + (o.draw ?? K.dur(0.5));
    const main = mk('path', {}, g), re = s.retrace ? mk('path', { opacity: 0.4 }, g) : null;   // anidoodle retrace: opacity × 0.4
    main.style.fill = s.color; if (re) re.style.fill = s.color;
    if (s.grain) g.setAttribute('mask', D.grain(svg));
    const base = s.wobble ? D.wobble(id, pts, s.wobble) : pts, len = lenOf(crSample(base));
    let last;
    return { el: g, len, set(t) {
      const b = hz > 0 ? Math.floor(t * hz + 1e-6) : 0, p = ease(K.seg(t, t0, t1));
      const z = typeof o.zoom === 'function' ? o.zoom(t) : o.zoom, w = s.w * (z == null ? 1 : D.weight(z)), key = `${b} ${p} ${w}`;
      if (key !== last) {   // new d only when the boil bucket, the progress or the weight changes
        last = key;
        const r = { w, taper: s.taper, pressure: s.pressure, rough: s.rough, seed, p };
        main.setAttribute('d', D.ribbon(s.boil ? D.boil(id, base, t, s.boil, hz) : base, r));
        // anidoodle retrace: half width, jitter boil + 1.3 × the medium wobble (its base wobble is 1.1 px), seed × 577 + bucket
        if (re) re.setAttribute('d', D.ribbon(jitter(seed * 577 + b, base, s.boil + (1.3 / 1.1) * s.wobble), { ...r, w: w * 0.5 }));
      }
      g.style.opacity = String(s.opacity * fadeOut(t, o.out));
      g.style.visibility = p > 0 ? '' : 'hidden';
    } };
  };

  // ── drawing score ────────────────────────────────────────────────────────
  // marks: [{id, pts | el, deps, layer, ...stroke options}]; pts marks are D.strokes in o.parent (or mark.parent), el marks are
  // SVG geometry drawn with D.drawOn. o = {parent, rest, layers}: layers lists the layers to draw (default all; others are skipped).
  D.score = (marks, t0, t1, o = {}) => {
    const ids = new Set();
    for (const m of marks) {
      if (!m.id) throw new Error('doodle.score: every mark needs an id');
      if (ids.has(m.id)) throw new Error(`doodle.score: duplicate id "${m.id}"`);
      ids.add(m.id);
    }
    for (const m of marks) for (const d of m.deps || []) if (!ids.has(d)) throw new Error(`doodle.score: "${m.id}" depends on unknown "${d}"`);
    const keep = o.layers ? marks.filter((m) => o.layers.includes(m.layer ?? 'main')) : marks, kept = new Set(keep.map((m) => m.id));
    const done = new Set(), order = [];
    while (order.length < keep.length) {   // stable topological order: always the earliest mark whose deps are drawn
      const m = keep.find((m) => !done.has(m.id) && (m.deps || []).every((d) => done.has(d) || !kept.has(d)));
      if (!m) throw new Error('doodle.score: dependency cycle among ' + keep.filter((m) => !done.has(m.id)).map((m) => m.id).join(', '));
      done.add(m.id); order.push(m);
    }
    for (const m of marks) if (!kept.has(m.id) && m.el) m.el.style.visibility = 'hidden';
    const win = D.schedule(order.map((m) => (m.el ? m.el.getTotalLength() : lenOf(crSample(m.pts)))), t0, t1, o.rest ?? 0.1);
    const windows = {}, sets = order.map((m, i) => {
      const [s, e] = (windows[m.id] = win[i]);
      if (m.el) { const ease = ezOf(m.ease, K.easing('none')); return (t) => D.drawOn(m.el, ease(K.seg(t, s, e))); }
      const h = D.stroke(m.parent || o.parent, m.pts, { ...m, in: s, draw: e - s, ease: m.ease ?? 'none', out: undefined });
      return (t) => h.set(t);
    });
    return { windows, order: order.map((m) => m.id), set(t) { for (const f of sets) f(t); } };
  };

  // ── an imported SVG draws itself ─────────────────────────────────────────
  // o = {t0, t1, order, style, rest, color}: order(el, i) → sort key (default DOM order); style = draw the outlines as D.stroke
  // ribbons of that preset, which hand over to the original lines as the fills wash in. Dashed outlines lose their dashes while drawing.
  const SKIP = new Set(['defs', 'clippath', 'mask', 'pattern', 'marker', 'symbol', 'lineargradient', 'radialgradient', 'filter']);
  let svgs = 0;
  D.drawSVG = (svg, o = {}) => {
    const t0 = o.t0 ?? 0, t1 = o.t1 ?? t0 + K.dur(2), n = svgs++;
    if (o.style && !D.styles[o.style]) throw new Error(`doodle.drawSVG: unknown style "${o.style}" (have: ${Object.keys(D.styles).join(', ')})`);
    const inDefs = (e) => { for (let p = e.parentNode; p && p !== svg; p = p.parentNode) if (SKIP.has(p.tagName.toLowerCase())) return true; return false; };
    const all = [...svg.querySelectorAll('path,line,polyline,polygon,rect,circle,ellipse')].filter((e) => !inDefs(e));
    const cs = new Map(all.map((e) => [e, getComputedStyle(e)]));
    const orig = all.map((e) => [e, e.getAttribute('style'), e.getAttribute('pathLength')]);   // restored verbatim at t ≥ t1
    let lines = all.map((el, i) => ({ el, i })).filter(({ el }) => cs.get(el).stroke !== 'none' && parseFloat(cs.get(el).strokeWidth) > 0 && el.getTotalLength() > 0);
    if (o.order) lines = lines.map((l) => ({ ...l, k: o.order(l.el, l.i) })).sort((a, b) => a.k - b.k || a.i - b.i);
    const wash = Math.min(K.dur(0.4), (t1 - t0) / 4);
    const win = D.schedule(lines.map((l) => l.el.getTotalLength()), t0, t1 - wash, o.rest ?? 0.1), end = new Map(lines.map((l, k) => [l.el, win[k][1]]));
    // a fill washes in after its own outline, or (no outline) after the last outline drawn before it in the SVG
    const fillAt = (el, i) => end.get(el) ?? Math.max(t0, ...lines.filter((l) => l.i < i).map((l) => end.get(l.el)));
    const fills = all.map((el, i) => ({ el, s: fillAt(el, i), fo: parseFloat(cs.get(el).fillOpacity) }))
      .filter(({ el, fo }) => cs.get(el).fill !== 'none' && fo > 0);
    const pens = !o.style ? [] : lines.map(({ el, i }, k) => {   // the ribbon sits next to its element, in the same user space
      const c = cs.get(el), sc = (parseFloat(c.strokeWidth) * 1.3) / D.styles[o.style].w, st = D.styles[o.style];   // ribbon width 1.3 × the line's
      const wrap = mk('g', el.getAttribute('transform') ? { transform: el.getAttribute('transform') } : {});
      el.parentNode.insertBefore(wrap, el.nextSibling);
      const h = D.stroke(wrap, D.sample(el, 8 * u), { id: `svg${n}:${i}`, style: o.style, color: o.color ?? c.stroke,
        w: st.w * sc, rough: st.rough * sc, wobble: st.wobble * sc, boil: st.boil * sc, in: win[k][0], draw: win[k][1] - win[k][0], ease: 'none' });
      return { el, wrap, h, e: win[k][1], op: parseFloat(c.opacity) };
    });
    return { set(t) {
      if (t >= t1) {
        for (const [el, st, pl] of orig) {
          el.setAttribute('style', st ?? '');   // set first: Chromium re-adds style="" if a pending el.style write meets a bare remove
          if (st == null) el.removeAttribute('style');
          pl == null ? el.removeAttribute('pathLength') : el.setAttribute('pathLength', pl);
        }
        for (const p of pens) p.wrap.style.display = 'none';
        return;
      }
      if (!o.style) lines.forEach(({ el }, k) => D.drawOn(el, K.seg(t, win[k][0], win[k][1])));
      for (const { el, s, fo } of fills) el.style.fillOpacity = String(fo * K.seg(t, s, s + wash));
      for (const p of pens) {   // the pen line, then the original line fades in over it as the pen fades out
        const q = K.seg(t, p.e, p.e + wash);
        p.h.set(t); p.wrap.style.display = ''; p.wrap.style.opacity = String(1 - q);
        p.el.style.opacity = String(p.op * q); p.el.style.visibility = q > 0 ? '' : 'hidden';
      }
    } };
  };

  // ── pen lettering ────────────────────────────────────────────────────────
  // Single-stroke centrelines authored for Reelwright (no font data): 'x y x y …' per stroke, '|' between strokes, y down.
  const G = {
    A: [600, '50 700 300 0 550 700|140 450 460 450'],
    B: [560, '90 0 90 700|90 0 300 0 400 30 440 100 430 190 380 250 300 340 90 340|90 340 330 340 440 390 470 480 450 600 380 670 290 700 90 700'],
    C: [600, '520 110 440 30 330 0 220 10 120 80 60 200 50 350 60 500 120 620 220 690 330 700 440 670 520 590'],
    D: [620, '90 0 90 700|90 0 300 0 430 50 520 160 550 350 520 540 430 650 300 700 90 700'],
    E: [520, '460 0 90 0 90 700 460 700|90 340 380 340'],
    F: [500, '460 0 90 0 90 700|90 340 360 340'],
    G: [640, '540 110 450 30 340 0 230 10 130 80 70 200 60 350 70 500 130 620 230 690 340 700 450 680 550 610 560 400 360 400'],
    H: [620, '90 0 90 700|530 0 530 700|90 350 530 350'],
    I: [220, '110 0 110 700'],
    J: [460, '380 0 380 520 360 620 300 685 220 700 140 685 80 630 60 560'],
    K: [580, '90 0 90 700|510 0 90 430|240 300 530 700'],
    L: [480, '90 0 90 700 440 700'],
    M: [740, '80 700 80 0 370 520 660 0 660 700'],
    N: [640, '90 700 90 0 550 700 550 0'],
    O: [680, '340 0 210 20 110 100 55 220 50 350 55 480 110 600 210 680 340 700 470 680 570 600 625 480 630 350 625 220 570 100 470 20 340 0'],
    P: [540, '90 700 90 0 300 0 410 40 460 120 460 230 410 310 300 360 90 360'],
    Q: [680, '340 0 210 20 110 100 55 220 50 350 55 480 110 600 210 680 340 700 470 680 570 600 625 480 630 350 625 220 570 100 470 20 340 0|380 520 600 720'],
    R: [580, '90 700 90 0 300 0 410 40 460 120 460 230 410 310 300 360 90 360|280 360 520 700'],
    S: [540, '470 100 400 30 290 0 180 10 100 70 80 160 120 250 220 310 340 370 440 440 470 540 430 640 330 695 210 700 110 660 50 590'],
    T: [560, '40 0 520 0|280 0 280 700'],
    U: [620, '90 0 90 470 120 600 200 680 310 700 420 680 500 600 530 470 530 0'],
    V: [600, '40 0 300 700 560 0'],
    W: [860, '40 0 230 700 430 120 630 700 820 0'],
    X: [580, '60 0 520 700|520 0 60 700'],
    Y: [580, '50 0 290 360 530 0|290 360 290 700'],
    Z: [560, '70 0 490 0 70 700 490 700'],
    0: [560, '280 0 170 30 100 130 70 350 100 570 170 670 280 700 390 670 460 570 490 350 460 130 390 30 280 0'],
    1: [400, '90 140 230 0 230 700'],
    2: [540, '90 160 140 60 240 0 350 10 430 80 450 180 410 290 300 420 80 700 470 700'],
    3: [540, '100 90 190 20 300 0 400 30 440 120 410 230 300 330 200 340|300 340 420 400 470 500 450 610 370 680 260 700 150 680 80 610'],
    4: [560, '380 700 380 0 60 480 500 480'],
    5: [540, '440 0 140 0 110 320 220 280 330 280 430 330 480 430 470 560 410 650 300 700 190 690 100 630'],
    6: [540, '420 40 330 0 230 10 140 80 85 220 70 400 90 560 160 660 270 700 380 670 450 580 460 470 420 380 330 330 230 330 140 380 85 470'],
    7: [520, '60 0 480 0 220 700'],
    8: [560, '280 340 180 300 120 220 120 120 180 40 280 0 380 40 440 120 440 220 380 300 280 340 160 400 90 500 100 610 180 680 280 700 380 680 460 610 470 500 400 400 280 340'],
    9: [560, '470 270 420 360 330 400 220 400 140 340 90 240 100 130 160 50 260 0 360 10 440 80 480 220 480 400 450 560 380 660 280 700 170 680 110 630'],
    ' ': [300, ''],
    '.': [220, '110 670 110 700'],
    ',': [220, '120 650 120 700 90 780'],
    '!': [220, '110 0 110 500|110 670 110 700'],
    '?': [500, '80 140 140 50 240 0 340 10 420 80 430 180 380 260 250 340 250 480|250 670 250 700'],
    '-': [380, '60 400 320 400'],
    "'": [180, '90 0 90 200'],
    ':': [220, '110 230 110 260|110 670 110 700'],
    '—': [1000, '60 400 940 400'],
  };
  D.glyphs = {};
  for (const ch in G) {
    D.glyphs[ch] = [G[ch][0], G[ch][1] ? G[ch][1].split('|').map((st) => {
      const v = st.trim().split(/\s+/).map(Number), out = [];
      for (let i = 0; i < v.length; i += 2) out.push([v[i], v[i + 1]]);
      return out;
    }) : []];
  }
  // pointed nib (anidoodle lettering.ts): width = hair + (shade - hair) × v, v = smoothed share of the direction pointing down,
  // ^1.7 sharpened; tapered 0.35..1 over the first 3 % and the last 8 %. q = the share of the arc length laid so far.
  const inked = (c, q, shade, hair, rough, seed) => {
    if (!(q > 0)) return '';
    let cc = c;
    if (q < 1) {   // cut by arc length (the nib moves at constant speed)
      const want = q * lenOf(c); let acc = 0; cc = [c[0]];
      for (let i = 1; i < c.length; i++) {
        const d = Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]);
        if (acc + d >= want) { cc.push(lerp(c[i - 1], c[i], d ? (want - acc) / d : 0)); break; }
        acc += d; cc.push(c[i]);
      }
    }
    if (cc.length < 2) return '';
    if (rough > 0) cc = densify(cc, 1.5 * u);
    const N = cc.length, down = cc.map((_, i) => {
      const a = cc[Math.max(0, i - 1)], b = cc[Math.min(N - 1, i + 1)], m = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return m ? Math.max(0, (b[1] - a[1]) / m) : 0;
    });
    const L = lenOf(cc); let acc = 0;
    const hw = cc.map((p, i) => {
      if (i) acc += Math.hypot(p[0] - cc[i - 1][0], p[1] - cc[i - 1][1]);
      let v = 0, k = 0;
      for (let j = Math.max(0, i - 4); j <= Math.min(N - 1, i + 4); j++, k++) v += down[j];
      const s = L ? acc / L : 0, tp = 0.35 + 0.65 * K.clamp(Math.min(s / 0.03, (1 - s) / 0.08));
      return ((hair + (shade - hair) * Math.pow(v / k, 1.7)) * tp) / 2;
    });
    return outline(cc, hw, rough, seed);
  };
  let words = 0;
  // o = {id, x, y (baseline), size (em, px), weight (shade width), hair, style, in, draw, ease, out, color}; draw defaults to a
  // 700 px/s nib. Upper case only: lower case maps to upper; any other character throws.
  D.letters = (parent, text, o = {}) => {
    const s = styleOf(o, 'letters'), id = o.id || 'letters-' + words++, size = o.size ?? 120 * u, k = size / 1000, hz = o.hz ?? HZ;
    const shade = o.weight ?? size * 0.09, hair = o.hair ?? shade * 0.25, ox = o.x ?? 0, oy = (o.y ?? size * 0.7) - 700 * k;
    const { g, svg } = host(parent), base = [];
    let x = ox;
    for (const ch of String(text).toUpperCase()) {
      const gl = D.glyphs[ch];
      if (!gl) throw new Error(`doodle.letters: no glyph for "${ch}" (have A–Z, 0–9 and space . , ! ? - ' : —)`);
      for (const st of gl[1]) base.push(st.map(([gx, gy]) => [x + gx * k, oy + gy * k]));
      x += gl[0] * k;
    }
    const strokes = base.map((pts, i) => {
      const sid = `${id}:${i}`, b = s.wobble ? D.wobble(sid, pts, s.wobble) : pts;
      return { sid, seed: D.hash(sid), b, len: lenOf(crSample(b)), path: mk('path', {}, g) };
    });
    let total = 0;   // the nib's whole path: every stroke plus the pen-lift legs between them
    strokes.forEach((st, i) => {
      if (i) { const a = strokes[i - 1].b, z = a[a.length - 1]; total += Math.hypot(st.b[0][0] - z[0], st.b[0][1] - z[1]); }
      st.start = total; total += st.len;
    });
    for (const st of strokes) st.path.style.fill = s.color;
    if (s.grain) g.setAttribute('mask', D.grain(svg));
    const ease = ezOf(o.ease, (p) => K.clamp(p)), t0 = o.in ?? 0, t1 = t0 + (o.draw ?? K.dur(total / (700 * u)));
    return { el: g, width: x - ox, set(t) {
      const bk = hz > 0 ? Math.floor(t * hz + 1e-6) : 0, uu = ease(K.seg(t, t0, t1)), laid = uu * total;
      for (const st of strokes) {
        const q = uu >= 1 ? 1 : st.len ? K.clamp((laid - st.start) / st.len) : +(laid >= st.start), key = `${bk} ${q}`;
        if (key === st.last) continue;
        st.last = key;
        st.path.setAttribute('d', inked(crSample(s.boil ? D.boil(st.sid, st.b, t, s.boil, hz) : st.b), q, shade, hair, s.rough, st.seed));
      }
      g.style.opacity = String(s.opacity * fadeOut(t, o.out));
    } };
  };

  // ── depth + seams ────────────────────────────────────────────────────────
  // cam from the film's render(t): x/y = camera pan in px at the focus plane z = 1, zoom = its scale. Planes scale about their own
  // transform-origin (default: their centre; full-frame layers → the frame centre). z > 1 is farther (moves less), z < 1 nearer.
  D.planes = (list, cam = {}) => {
    const x = cam.x ?? 0, y = cam.y ?? 0, zoom = cam.zoom ?? 1;
    for (const { el, z } of list) {
      if (!(z > 0)) throw new Error(`doodle.planes: z must be > 0 (got ${z})`);
      el.style.transform = `translate(${f2(-x / z)}px, ${f2(-y / z)}px) scale(${+Math.pow(zoom, 1 / z).toFixed(5)})`;
    }
  };
  // exit(u) = dist·u³ along dir (u over exitDur), entry(u) = -dist·(1-u)³ (u over entryDur): both move at v = 3·dist/dur px/s at the
  // cut. Give entryDist or entryDur and the other is solved; both must agree within 1 %; neither = the exit's duration.
  D.matchedMove = ({ dir = 'left', exitDist, exitDur, entryDist, entryDur } = {}) => {
    if (!(exitDist > 0 && exitDur > 0)) throw new Error('doodle.matchedMove: exitDist and exitDur must be > 0');
    const v = (3 * exitDist) / exitDur;
    if (entryDist == null && entryDur == null) entryDur = exitDur;
    if (entryDist == null) entryDist = (v * entryDur) / 3;
    else if (entryDur == null) entryDur = (3 * entryDist) / v;
    else if (Math.abs((3 * entryDist) / entryDur / v - 1) > 0.01)
      throw new Error(`doodle.matchedMove: an entry of ${entryDist}px in ${entryDur}s does not leave the cut at the exit's ${f2(v)}px/s; drop entryDist (→ ${f2((v * entryDur) / 3)}) or entryDur (→ ${f2((3 * entryDist) / v)})`);
    let d = Array.isArray(dir) ? dir : { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
    if (!d) throw new Error(`doodle.matchedMove: dir is left, right, up, down or [dx, dy] (got ${dir})`);
    const m = Math.hypot(d[0], d[1]) || 1; d = [d[0] / m, d[1] / m];
    const along = (s) => [d[0] * s, d[1] * s];
    return { v, entryDist, entryDur,
      exit: (q) => along(exitDist * Math.pow(K.clamp(q), 3)),
      entry: (q) => along(-entryDist * Math.pow(1 - K.clamp(q), 3)) };
  };
})();
