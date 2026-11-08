// SVG path helpers: KIT.path. Loaded after engine.js and vendor/paths/paths.js (@remotion/paths, MIT; sets window.RemotionPaths).
// pvk: <script src="../../../vendor/paths/paths.js"> then ../../../tools/path.js; HyperFrames: kit/paths/paths.js then kit/path.js.
// Everything is a pure function of its arguments (p = 0..1, clamped); the only caches hold facts about a path string or an element's size.
//   KIT.path(d | SVGPathElement)                  → { d, len, at(p) → { x, y, angle }, slice(p0, p1) → d, box → { x1, y1, x2, y2 } }
//                                                    angle is the tangent in degrees (0 = pointing right, 90 = down, as y grows down)
//   KIT.path.draw(pathEl, p)                      draw-on: p = 0 shows nothing, p = 1 the whole stroke (strokeDasharray / strokeDashoffset)
//   KIT.path.morph(a, b, p)                       → d, a at p = 0 and b at p = 1 exactly (interpolatePath; the two ds may differ in shape)
//   KIT.path.morphMany(ds, p)                     → d through ds at evenly spaced stops (interpolatePaths)
//   KIT.path.follow(el, path, p, { rotate = true, offset = [0, 0] })
//        moves an absolutely positioned el (left/top 0, same coordinate space as the path) so its centre sits at p along path
//        (a KIT.path or a d); transform = translate(x − w/2 + ox, y − h/2 + oy) rotate(angle). Size is measured once per element.
//   KIT.path.fromPoints(pts, { curviness = 1, closed = false })   → a smooth d through [[x, y], …] (Catmull-Rom as cubic Béziers;
//        curviness 0 = straight segments)
//   KIT.path.lib                                  window.RemotionPaths (parsePath, getLength, warpPath, …) for anything else
'use strict';
(function () {
  const K = window.KIT, R = window.RemotionPaths;
  if (!R) throw new Error('tools/path.js: load vendor/paths/paths.js first (window.RemotionPaths)');

  const dOf = (x) => (typeof x === 'string' ? x : x.getAttribute('d'));
  const lens = new Map();   // d → length: a path's length never changes, parsing it every frame is the cost
  const lenOf = (d) => { let l = lens.get(d); if (l === undefined) lens.set(d, (l = R.getLength(d))); return l; };

  const P = (src) => {
    const d = dOf(src);
    if (!d) throw new Error('KIT.path: expected a path d string or an SVGPathElement with a d attribute');
    const len = lenOf(d), b = R.getBoundingBox(d);
    const at = (p) => {
      const s = Math.min(len, K.clamp(p) * len), pt = R.getPointAtLength(d, s), tg = R.getTangentAtLength(d, s);
      return { x: pt.x, y: pt.y, angle: Math.atan2(tg.y, tg.x) * 180 / Math.PI };
    };
    // the part from p0 to p1: cut the front at p1, flip, cut what is left at the length of the piece, flip back
    const slice = (p0, p1) => {
      p0 = K.clamp(p0); p1 = K.clamp(p1);
      if (p1 <= p0) { const q = at(p0); return `M${q.x} ${q.y}`; }
      const head = p1 >= 1 ? d : R.cutPath(d, p1 * len);
      return p0 <= 0 ? head : R.reversePath(R.cutPath(R.reversePath(head), (p1 - p0) * len));
    };
    return { d, len, at, slice, box: { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2 } };
  };

  P.draw = (el, p) => {
    const e = R.evolvePath(K.clamp(p), el.getAttribute('d'));
    el.style.strokeDasharray = e.strokeDasharray;
    el.style.strokeDashoffset = e.strokeDashoffset;
  };

  P.morph = (a, b, p) => R.interpolatePath(K.clamp(p), a, b);

  P.morphMany = (ds, p) => {
    const n = ds.length - 1;
    return n < 1 ? ds[0] : R.interpolatePaths(K.clamp(p), ds.map((_, i) => i / n), ds, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  };

  const sizes = new WeakMap();
  P.follow = (el, path, p, { rotate = true, offset = [0, 0] } = {}) => {
    let s = sizes.get(el);
    if (!s) sizes.set(el, (s = [el.offsetWidth, el.offsetHeight]));
    const q = (path.at ? path : P(path)).at(p);
    el.style.transform = `translate(${q.x - s[0] / 2 + offset[0]}px, ${q.y - s[1] / 2 + offset[1]}px)` + (rotate ? ` rotate(${q.angle}deg)` : '');
  };

  P.fromPoints = (pts, { curviness = 1, closed = false } = {}) => {
    const f = (v) => +v.toFixed(3), n = pts.length;
    if (!n) throw new Error('KIT.path.fromPoints: need at least one point');
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const b = pts[(i + 1) % n];
      if (!curviness) { d += `L${f(b[0])} ${f(b[1])}`; continue; }
      const a = pts[i], pre = closed ? pts[(i - 1 + n) % n] : pts[Math.max(i - 1, 0)], post = closed ? pts[(i + 2) % n] : pts[Math.min(i + 2, n - 1)], k = curviness / 6;
      d += `C${f(a[0] + (b[0] - pre[0]) * k)} ${f(a[1] + (b[1] - pre[1]) * k)} ${f(b[0] - (post[0] - a[0]) * k)} ${f(b[1] - (post[1] - a[1]) * k)} ${f(b[0])} ${f(b[1])}`;
    }
    return closed && n > 1 ? d + 'Z' : d;
  };

  P.lib = R;
  K.path = P;
})();
