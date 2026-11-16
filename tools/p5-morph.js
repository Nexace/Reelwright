// p5-morph.js: KIT.morph.handoff and KIT.morph.coverShape. Load after engine.js. Pure functions of t, built once at load.
//   KIT.morph.handoff({ from, to, t0, t1, ease, stretch = 0.35, radius, color, border, parent }) → { el, at(t), set(t) }
//     One outline travels from the box `from` to the box `to` (each { x, y, w, h, r? } in stage px, or an element: its bounding box at load).
//     The box eases between them; mid-flight it stretches along its direction of travel and squashes across it (area kept, up to
//     1 + stretch at the middle) and lands EXACTLY on `to` (stretch is 0 at both ends), so a target drawn at `to` takes over with no seam.
//     Before t0 it sits on `from`, after t1 on `to`. at(t) → { x, y, w, h, r, sx, sy, ang }.
//   KIT.morph.coverShape({ from, t0, t1, ease, shape = 'rect' | 'circle', color, parent }) → { el, at(t), set(t) }
//     A shape grows from the box `from` until it fills the whole frame (a circle grows to the radius that reaches the far corner), so what
//     comes next can be shown on top of a full-frame colour. At t1 it covers every pixel of the frame exactly.
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('p5-morph.js: load tools/engine.js first');
  const box = (b, what) => {
    if (b && b.getBoundingClientRect) { const r = b.getBoundingClientRect(), s = K.stage.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height, r: 0 }; }
    if (!b || ![b.x, b.y, b.w, b.h].every(Number.isFinite) || !(b.w > 0 && b.h > 0)) throw new Error(`morph: ${what} must be an element or { x, y, w, h } with w, h > 0`);
    return { r: 0, ...b };
  };
  const ez = (e) => (typeof e === 'function' ? e : e ? K.easing(e) : K.ease);
  const win = (t0, t1) => { if (!(Number.isFinite(t0) && t1 > t0)) throw new Error(`morph: need t1 > t0 (got ${t0}, ${t1})`); };
  const n3 = (v) => +v.toFixed(3);
  const M = (K.morph = K.morph || {});

  M.handoff = ({ from, to, t0, t1, ease, stretch = 0.35, color, border, parent = K.stage } = {}) => {
    win(t0, t1);
    const A = box(from, 'from'), B = box(to, 'to'), e = ez(ease);
    const el = K.el('div', 'kit-handoff', parent);
    K.css(el, { position: 'absolute', left: '0px', top: '0px', boxSizing: 'border-box', transformOrigin: '0 0', willChange: 'transform' });
    if (color) el.style.background = color;
    el.style.border = border || (color ? 'none' : `${3 * K.u}px solid var(--kit-accent, currentColor)`);
    const at = (t) => {
      const p = e(K.seg(t, t0, t1)), x = K.lerp(A.x, B.x, p), y = K.lerp(A.y, B.y, p), w = K.lerp(A.w, B.w, p), h = K.lerp(A.h, B.h, p), r = K.lerp(A.r, B.r, p);
      const dx = B.x + B.w / 2 - A.x - A.w / 2, dy = B.y + B.h / 2 - A.y - A.h / 2, dist = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      // stretch peaks mid-flight and grows with the travel (a short hop barely stretches): s in [1, 1 + stretch]
      const k = Math.sin(Math.PI * K.clamp(p)) * K.clamp(dist / (0.5 * Math.min(K.W_, K.H_))), s = 1 + stretch * k;
      return { x, y, w, h, r, sx: s, sy: 1 / s, ang };
    };
    return { el, at, set(t) {
      const a = at(t), cx = a.x + a.w / 2, cy = a.y + a.h / 2;
      el.style.width = n3(a.w) + 'px'; el.style.height = n3(a.h) + 'px'; el.style.borderRadius = n3(a.r) + 'px';
      // about the box centre: rotate to the travel direction, stretch along it, rotate back (identity at both ends)
      el.style.transform = `translate(${n3(cx - a.w / 2)}px, ${n3(cy - a.h / 2)}px) translate(${n3(a.w / 2)}px, ${n3(a.h / 2)}px) rotate(${n3(a.ang)}rad) scale(${n3(a.sx)}, ${n3(a.sy)}) rotate(${n3(-a.ang)}rad) translate(${n3(-a.w / 2)}px, ${n3(-a.h / 2)}px)`;
      el.style.visibility = 'visible';
    } };
  };

  M.coverShape = ({ from, t0, t1, ease, shape = 'rect', color = 'var(--kit-accent, #36c)', parent = K.stage } = {}) => {
    win(t0, t1);
    if (shape !== 'rect' && shape !== 'circle') throw new Error(`coverShape: shape is 'rect' or 'circle' (got ${shape})`);
    const A = box(from, 'from'), e = ez(ease), el = K.el('div', 'kit-cover', parent);
    K.css(el, { position: 'absolute', left: '0px', top: '0px', background: color });
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2;
    const R0 = Math.max(A.w, A.h) / 2, R1 = Math.hypot(Math.max(cx, K.W_ - cx), Math.max(cy, K.H_ - cy));   // far corner
    const at = (t) => {
      const p = e(K.seg(t, t0, t1));
      if (shape === 'circle') { const R = K.lerp(R0, R1, p); return { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R, r: R }; }
      return { x: K.lerp(A.x, 0, p), y: K.lerp(A.y, 0, p), w: K.lerp(A.w, K.W_, p), h: K.lerp(A.h, K.H_, p), r: K.lerp(A.r, 0, p) };
    };
    return { el, at, set(t) {
      const a = at(t);
      K.css(el, { left: n3(a.x) + 'px', top: n3(a.y) + 'px', width: n3(a.w) + 'px', height: n3(a.h) + 'px', borderRadius: n3(a.r) + 'px', visibility: 'visible' });
    } };
  };
})();
