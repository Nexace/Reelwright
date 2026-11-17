// fx-starburst.js: starburst rays and the filmBurn transition (Remotion row 2.2.10), written from scratch, no Remotion code. Load after engine.js and
// fx-color.js; load tools/transitions.js BEFORE it to get the filmBurn transition. Pure functions of what set(...) / the transition is given.
//   KIT.fx.starburst(parent, { rays = 16, colors = ['#ffd36a', '#ff8a3d'], rotate = 20, width = 0.5, x = 0.5, y = 0.5, reach = 0.9, blend = 'screen', seed })
//        → { el, set(t, amount = 1) }     `rays` wedges around (x, y) (fractions of the box), ray i takes colors[i % colors.length] and fills `width`
//          of its wedge (0..1); the pattern turns `rotate` degrees per second (set's t, in seconds) and fades out at `reach` of the farthest corner.
//          amount 0..1 is the opacity. `seed` (a number) starts the pattern at a seeded angle.
//   KIT.fx.starburst.css({ rays, colors, width, angle, x, y, reach }, w, h) → the CSS background (conic rays + radial fade as a mask-free gradient stack)
//   KIT.transition('filmBurn', { from, to, at, dur, x, y, seed, color })  a film-stock burn: both scenes over-expose and warm up, a hot core and rays flare
//        at (x, y) and the cut lands at the brightest moment. `color` tints the rays (default amber). Same options as every KIT.transition.
'use strict';
(function () {
  const K = window.KIT, X = K && K.fx;
  if (!X || !X.layer) throw new Error('fx-starburst.js: load tools/engine.js and tools/fx-color.js first');
  const f = (n) => +n.toFixed(3);
  const seedAngle = (seed) => { let a = (seed >>> 0) + 0x6d2b79f5; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 360; };

  // rays as a conic-gradient, hard-edged wedges; the fade is a radial mask applied by the caller (mask on the layer)
  const rays = ({ rays: n = 16, colors = ['#ffd36a', '#ff8a3d'], width = 0.5, angle = 0, x = 0.5, y = 0.5 } = {}, W, H) => {
    if (!(n >= 1 && Number.isInteger(n))) throw new Error('starburst: rays is a whole number >= 1');
    const pitch = 360 / n, stops = [];
    for (let i = 0; i < n; i++) {
      const c = X.rgb(colors[i % colors.length]).join(','), a = f(i * pitch), b = f(i * pitch + pitch * width), e = f((i + 1) * pitch);
      stops.push(`rgb(${c}) ${a}deg ${b}deg`, `transparent ${b}deg ${e}deg`);
    }
    return `conic-gradient(from ${f(angle)}deg at ${f(x * W)}px ${f(y * H)}px, ${stops.join(', ')})`;
  };
  const fade = (reach, x, y, W, H) => {   // radial mask: opaque in the middle, gone at `reach` of the distance to the farthest corner
    const R = Math.max(Math.hypot(x * W, y * H), Math.hypot((1 - x) * W, y * H), Math.hypot(x * W, (1 - y) * H), Math.hypot((1 - x) * W, (1 - y) * H)) * reach;
    return `radial-gradient(circle ${f(R)}px at ${f(x * W)}px ${f(y * H)}px, #000 0, transparent 100%)`;
  };

  X.starburst = (parent, { rays: n = 16, colors = ['#ffd36a', '#ff8a3d'], rotate = 20, width = 0.5, x = 0.5, y = 0.5, reach = 0.9, blend = 'screen', seed = 0 } = {}) => {
    const W = parent.offsetWidth || K.W_, H = parent.offsetHeight || K.H_, el = X.layer(parent, { opacity: '0', mixBlendMode: blend });
    const m = fade(reach, x, y, W, H);
    el.style.maskImage = el.style.webkitMaskImage = m;
    rays({ rays: n, colors });   // a bad ray count throws here, not at the first set()
    const o = { rays: n, colors, width, x, y }, start = seed ? seedAngle(seed) : 0;
    return { el, set(t, amount = 1) {
      el.style.backgroundImage = rays({ ...o, angle: start + rotate * t }, W, H);
      el.style.opacity = String(Math.min(1, Math.max(0, amount)));
    } };
  };
  X.starburst.css = (o = {}, W = K.W_, H = K.H_) => rays(o, W, H);

  if (K.transition && K.transition.register) {
    const { tri, cutAt, wash } = K.transition.util;
    K.transition.register('filmBurn', (p, c) => {
      const a = tri(p), hot = Math.pow(a, 0.7), col = c.color ? X.rgb(c.color).join(',') : '255,150,40', fx = c.x, fy = c.y;
      const core = `radial-gradient(circle ${f(0.55 * Math.max(K.W_, K.H_) * (0.4 + a))}px at ${f(fx)}px ${f(fy)}px, rgba(255,250,225,${f(hot)}) 0, rgba(${col},${f(0.85 * hot)}) 30%, rgba(255,70,20,${f(0.45 * hot)}) 62%, transparent 100%)`;
      const spokes = rays({ rays: 14, colors: [`rgb(${col})`, '#fff1c8'], width: 0.35, angle: seedAngle(c.seed) + 90 * p, x: fx / K.W_, y: fy / K.H_ }, K.W_, K.H_);
      c.overlay.style.background = core + ', ' + spokes;
      c.overlay.style.mixBlendMode = 'screen';
      c.overlay.style.maskImage = c.overlay.style.webkitMaskImage = fade(0.95, fx / K.W_, fy / K.H_, K.W_, K.H_);
      const look = `brightness(${f(1 + 1.4 * a)}) sepia(${f(0.6 * a)}) saturate(${f(1 + 0.8 * a)})`;
      c.from.style.filter = c.to.style.filter = look;
      wash(c, a); cutAt(p, c);
    });
  }
})();
