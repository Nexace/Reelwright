// Hand-drawn helpers: KIT.doodle. Loaded after engine.js (like layouts.js / shots.js); the doodle theme uses them, any film may.
// Everything is a pure function of t and a string id: a stroke's look comes from hash(id), never from Math.random or frame numbers
// (marks without an `id` and without an element id get an auto id that follows creation order, so pass `id` to pin the look), so scrubbing backwards and --formats / other fps give the same drawing. Points are [x, y] pairs in px.
// (`wobble` and `boil` options are px amplitudes.)
//   wobble  static hand shake (same for the same id)      boil   re-jitters every 1/hz s (--kit-boil; 0 = still)
//   path    Catmull-Rom → cubic Bézier `d`                 sample points along an SVG path (do it once, at load)
//   drawOn  stroke-dashoffset draw-on; exactly drawn at p ≥ 1, hidden at p ≤ 0   schedule  per-stroke time windows by length (+ 9 px per pen lift)
//   underline / circle  build an SVG overlay inside an element once; .set(t) in render(t)
// underline/circle options follow KIT.layout: { in, draw, out, id, color, width, ease, wobble, boil, pad }
//   in = when the draw-on starts; draw = draw-on duration (default KIT.dur(0.5)); out (optional) = when the mark has left: it fades over
//   the 0.45 s before `out` with KIT.easeIn, as layouts do; without `out` it stays drawn. Hidden before `in`.
//   The overlay is an <svg> child of the element: it follows the element's transforms but is clipped by an `overflow:hidden`
//   ancestor, and its size (offsetWidth/Height) is measured once, at load. Marks wobble by id (default: the element's id, else a
//   counter), so give each mark on the same element its own `id` to make them differ.
'use strict';
(function () {
  const K = window.KIT, D = (K.doodle = {});
  const SVG = 'http://www.w3.org/2000/svg';

  D.hash = (str) => {   // FNV-1a, 32 bit, over the UTF-8 bytes
    let h = 0x811c9dc5;
    for (const c of unescape(encodeURIComponent(String(str)))) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
    return h;
  };
  D.rng = (seed) => {   // mulberry32: () → [0, 1)
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const jitter = (seed, pts, amp) => { const r = D.rng(seed); return pts.map(([x, y]) => [x + (r() - 0.5) * 2 * amp, y + (r() - 0.5) * 2 * amp]); };
  D.wobble = (id, pts, amp = 1.2 * K.u) => jitter(D.hash(id), pts, amp);
  const HZ = parseFloat(K.token('boil')) || 0;   // theme token, read once; other themes leave it at 0
  D.boil = (id, pts, t, amp = 0.6 * K.u, hz = HZ) =>
    hz > 0 ? jitter(D.hash(id) * 911 + Math.floor(t * hz + 1e-6), pts, amp) : pts.map((p) => p.slice());

  D.path = (pts, closed = false) => {   // Catmull-Rom (tension 0.5) as cubic Béziers
    const n = pts.length, f = (v) => +v.toFixed(2);
    if (n < 2) return '';
    const at = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + (closed ? 'Z' : '');
  };
  D.sample = (pathEl, step = 8 * K.u) => {   // call once at load (getPointAtLength is slow), reuse the points every frame
    const len = pathEl.getTotalLength(), n = Math.max(2, Math.ceil(len / step)), out = [];
    for (let i = 0; i <= n; i++) { const p = pathEl.getPointAtLength((len * i) / n); out.push([p.x, p.y]); }
    return out;
  };

  D.drawOn = (el, p) => {
    p = K.clamp(p);   // NaN-safe is the caller's job; ≥ 1 is exactly 1 so the last frame matches the finished drawing
    el.style.visibility = p > 0 ? '' : 'hidden';   // '' (not 'visible') so a hidden ancestor still hides it; at p = 0 a round cap would still dot the path end
    el.setAttribute('pathLength', '1');
    el.style.strokeDasharray = '1 1';
    el.style.strokeDashoffset = String(p >= 1 ? 0 : 1 - p);
  };
  // one stroke at a time; a stroke costs length + 9 (a pen lift), long strokes run fast per px; `rest` s between strokes
  D.schedule = (lengths, t0, t1, rest = 0.1) => {
    const n = lengths.length, span = t1 - t0 - (n - 1) * rest;
    if (!n) return [];
    if (!(span > 0)) throw new Error(`doodle.schedule: ${n} strokes with ${rest}s rests do not fit in ${t1 - t0}s`);
    const cost = lengths.map((l) => l + 9), total = cost.reduce((a, b) => a + b, 0), out = [];
    let s = t0;
    cost.forEach((c, i) => { const e = i === n - 1 ? t1 : s + (span * c) / total; out.push([s, e]); s = e + rest; });
    return out;
  };

  // overlay: an <svg> child of el (so it follows el's transforms), path coordinates in el's own px, overflow visible
  let marks = 0;
  const mark = (el, o, pts, closed) => {
    const id = o.id || el.id || 'doodle-' + marks++, w = o.width ?? 6 * K.u, ease = o.ease ? K.easing(o.ease) : K.ease;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const svg = document.createElementNS(SVG, 'svg'), path = document.createElementNS(SVG, 'path');
    svg.setAttribute('width', el.offsetWidth); svg.setAttribute('height', el.offsetHeight);
    svg.setAttribute('style', 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none');
    for (const [k, v] of Object.entries({ fill: 'none', stroke: o.color || 'var(--kit-accent)', 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) path.setAttribute(k, v);
    svg.appendChild(path); el.appendChild(svg);
    const base = D.wobble(id, pts, o.wobble), t0 = o.in ?? 0, t1 = t0 + (o.draw ?? K.dur(0.5));
    let lastK;
    return { path, set(t) {
      const k = Math.floor(t * HZ + 1e-6);
      if (k !== lastK) { path.setAttribute('d', D.path(D.boil(id, base, t, o.boil), closed)); lastK = k; }   // new d only when the bucket changes
      D.drawOn(path, ease(K.seg(t, t0, t1)));
      svg.style.opacity = String(o.out == null ? 1 : 1 - K.easeIn(K.seg(t, o.out - K.dur(0.45), o.out)));
    } };
  };
  // opts: see the header; pad = px beyond the element's box
  D.underline = (el, o = {}) => {
    const w = el.offsetWidth, h = el.offsetHeight, pad = o.pad ?? 4 * K.u;
    return mark(el, o, [[-pad, h * 0.93], [w * 0.25, h * 0.97], [w * 0.55, h * 0.92], [w * 0.8, h * 0.96], [w + pad, h * 0.9]]);
  };
  D.circle = (el, o = {}) => {   // one loop of ~1.1 turns, drifting outwards a little, like a marker
    const w = el.offsetWidth, h = el.offsetHeight, pad = o.pad ?? 14 * K.u, n = 16, pts = [];
    for (let i = 0; i <= n; i++) {
      const a = ((-110 + 400 * (i / n)) * Math.PI) / 180, g = 1 + 0.06 * (i / n);
      pts.push([w / 2 + (w / 2 + pad) * 1.05 * g * Math.cos(a), h / 2 + (h / 2 + pad) * 1.05 * g * Math.sin(a)]);
    }
    return mark(el, o, pts, false);
  };
})();
