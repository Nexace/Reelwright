// Scene transitions: KIT.transition. Loaded after engine.js. Every transition is a pure function of t: the DOM (one overlay
// per transition) is built at creation, set(t) only writes styles from t, a seed and the options. No Math.random, clocks, CSS
// transitions or state between calls, so scrubbing, shuffled seeks and --formats give the same frames.
//   KIT.transition(type, { from, to, at, dur = KIT.dur(0.6), dir = 'left', x, y, seed = 1, color, cue, ease = KIT.ease })
//                                                                                    → { set(t), p(t), at, end }
//   from / to  scene layers: full-stage absolutely positioned elements the film does not style with transform, clip-path, mask,
//              filter, opacity, z-index or visibility (the helper owns those). Either may be null. Window = [at, at + dur],
//              p = ease(seg(t, at, at + dur)). Before `at`: from shown, to hidden. After the window: to shown, from hidden.
//   dir        left | right | up | down: where the motion goes (slide 'left' = the new scene enters from the right)
//   x, y       iris centre and clockWipe pivot in stage px (default the stage centre)    color  flash / fadeThrough / pushCut colour
//   seed       brush, glitch and lightLeak look (same seed, same look)                  cue    KIT.cue(at, cue) once, e.g. 'whoosh'
//   type       one of KIT.transition.names, or (p, { from, to, dir, overlay, ... }) => void for your own (writes styles only)
// Types: cut fade fadeThrough slide push wipe barnDoor blinds clockWipe iris flip cube zoom pushCut flash lightLeak brush glitch (+ none = cut)
// A layer can be the `to` of one transition and the `from` of the next (a chain): whichever transition started most recently
// owns the layer, so the order of the set() calls does not matter. Call every transition's set(t) from render(t).
// Overlays (flash, light leak, glitch bars, fadeThrough colour) are children of KIT.stage with z-index 30 and are hidden outside the window.
// brush paints with a clip-path path() of seeded bristle rects (synchronous: no image decode, unlike an SVG mask url); glitch tears
// by swapping seeded bands between the layers and adds coloured offset bars, it cannot shift one band of a layer by itself.
'use strict';
(function () {
  const K = window.KIT, W = K.W_, H = K.H_;
  const hash = (s) => { let h = 0x811c9dc5; for (const c of unescape(encodeURIComponent(String(s)))) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0; return h; };
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const f = (n) => +n.toFixed(3);
  const DIR = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  const tri = (p) => 1 - Math.abs(1 - 2 * p);   // 0 → 1 at the middle → 0
  const mask = (e, v) => { e.style.maskImage = v; e.style.webkitMaskImage = v; };
  const move = (dx, dy, k) => 'translate(' + f(dx * k) + 'px,' + f(dy * k) + 'px)';
  // hidden = visibility + opacity 0: a child with visibility:visible (KIT.show writes it) still paints inside a hidden parent
  const hide = (e) => { e.style.visibility = 'hidden'; e.style.opacity = '0'; };
  const cutAt = (p, c) => hide(p < 0.5 ? c.to : c.from);   // the cut: only one layer is up
  const wash = (c, op) => { K.show(c.overlay, op); };
  const RESET = ['transform', 'clipPath', 'maskImage', 'webkitMaskImage', 'filter', 'opacity', 'zIndex', 'backfaceVisibility'];
  const reset = (e, vis) => { for (const k of RESET) e.style[k] = ''; if (vis === 'hidden') hide(e); else e.style.visibility = vis; };
  const SPARE = [document.createElement('div'), document.createElement('div')];   // writes for a missing or not-owned layer go here
  const reg = new WeakMap();   // layer → transitions that use it, by `at`
  const owner = (e, t) => { const l = reg.get(e); let o = l[0]; for (const x of l) if (x.at <= t) o = x; return o; };
  const P = 2 * Math.max(W, H);   // 3D perspective distance
  const inset = (d, p) => { const k = f((1 - p) * 100) + '%'; return 'inset(' + (d[1] < 0 ? k : 0) + ' ' + (d[0] > 0 ? k : 0) + ' ' + (d[1] > 0 ? k : 0) + ' ' + (d[0] < 0 ? k : 0) + ')'; };
  const angles = { left: 270, right: 90, up: 0, down: 180 };   // gradient angle that grows from the side the motion starts at

  const TYPES = {
    cut: (p, c) => cutAt(p, c),
    fade: (p, c) => { c.to.style.opacity = p; if (!c.hasTo) c.from.style.opacity = 1 - p; },
    fadeThrough: (p, c) => { c.overlay.style.background = c.color || 'var(--kit-bg)'; wash(c, tri(p)); cutAt(p, c); },
    slide: (p, c) => { c.to.style.transform = move(-c.d[0] * W, -c.d[1] * H, 1 - p); },
    push: (p, c) => { c.from.style.transform = move(c.d[0] * W, c.d[1] * H, p); c.to.style.transform = move(-c.d[0] * W, -c.d[1] * H, 1 - p); },
    wipe: (p, c) => { c.to.style.clipPath = inset(c.d, p); },
    barnDoor: (p, c) => {   // from is on top and splits open along its middle line
      const a = f(50 - 50 * p), b = f(50 + 50 * p);
      c.from.style.zIndex = 1; c.to.style.zIndex = '';
      mask(c.from, 'linear-gradient(' + (c.d[0] ? 90 : 180) + 'deg,#000 0,#000 ' + a + '%,transparent ' + a + '%,transparent ' + b + '%,#000 ' + b + '%,#000 100%)');
    },
    blinds: (p, c) => {
      const S = (c.d[0] ? W : H) / 8;
      mask(c.to, 'repeating-linear-gradient(' + angles[c.dir] + 'deg,#000 0,#000 ' + f(p * S) + 'px,transparent ' + f(p * S) + 'px,transparent ' + f(S) + 'px)');
    },
    clockWipe: (p, c) => { mask(c.to, 'conic-gradient(from 0deg at ' + c.x + 'px ' + c.y + 'px,#000 0,#000 ' + f(360 * p) + 'deg,transparent 0)'); },
    iris: (p, c) => {
      const R = Math.max(Math.hypot(c.x, c.y), Math.hypot(W - c.x, c.y), Math.hypot(c.x, H - c.y), Math.hypot(W - c.x, H - c.y));
      c.to.style.clipPath = 'circle(' + f(p * R) + 'px at ' + c.x + 'px ' + c.y + 'px)';
    },
    flip: (p, c) => {   // a card turning over; each face is hidden once it faces away
      const ax = c.d[1] ? 'X' : 'Y', s = c.d[0] || -c.d[1];
      c.from.style.backfaceVisibility = c.to.style.backfaceVisibility = 'hidden';
      c.from.style.transform = 'perspective(' + P + 'px) rotate' + ax + '(' + f(s * 180 * p) + 'deg)';
      c.to.style.transform = 'perspective(' + P + 'px) rotate' + ax + '(' + f(s * (180 * p - 180)) + 'deg)';
    },
    cube: (p, c) => {
      const ax = c.d[1] ? 'X' : 'Y', s = c.d[0] || -c.d[1], D = c.d[0] ? W : H;
      const t = (a) => 'perspective(' + P + 'px) translateZ(' + -D / 2 + 'px) rotate' + ax + '(' + f(a) + 'deg) translateZ(' + D / 2 + 'px)';
      c.from.style.transform = t(s * 90 * p); c.to.style.transform = t(s * (90 * p - 90));
    },
    zoom: (p, c) => {
      c.from.style.transform = 'scale(' + f(1 + 0.25 * p) + ')';
      c.to.style.transform = 'scale(' + f(0.85 + 0.15 * p) + ')'; c.to.style.opacity = p;
      if (!c.hasTo) c.from.style.opacity = 1 - p;
    },
    pushCut: (p, c) => {
      const q = Math.min(1, 2 * p);
      c.from.style.transform = 'scale(' + f(1 + 0.15 * q * q) + ')';
      c.overlay.style.background = c.color || '#fff'; wash(c, tri(p)); cutAt(p, c);
    },
    flash: (p, c) => { c.overlay.style.background = c.color || '#fff'; wash(c, tri(p)); cutAt(p, c); },
    lightLeak: (p, c) => {
      const r = rng(hash(c.seed + ':leak')), cols = ['255,150,50', '255,90,70', '255,215,130'], bg = [];
      for (let i = 0; i < 3; i++) {
        const u = r(), v = r(), R = (0.45 + 0.3 * r()) * Math.max(W, H), along = (2 * p - 1) * 0.7 + (i - 1) * 0.18;
        const cx = c.d[0] ? W / 2 + c.d[0] * along * W : u * W, cy = c.d[1] ? H / 2 + c.d[1] * along * H : v * H;
        bg.push('radial-gradient(circle ' + f(R) + 'px at ' + f(cx) + 'px ' + f(cy) + 'px,rgba(' + cols[i] + ',.95) 0,rgba(' + cols[i] + ',.45) 40%,rgba(' + cols[i] + ',0) 72%)');
      }
      bg.push('linear-gradient(rgba(255,190,110,.55),rgba(255,190,110,.55))');
      c.overlay.style.background = bg.join(','); c.overlay.style.mixBlendMode = 'screen';
      wash(c, Math.sin(Math.PI * p)); cutAt(p, c);
    },
    brush: (p, c) => {   // 6 strokes of 5 bristles each; every bristle's front is ragged by a seeded amount
      const horiz = !c.d[1], A = horiz ? W : H, B = horiz ? H : W, n = 6, m = 5, jm = 0.07 * A, r = rng(hash(c.seed + ':brush'));
      const pt = ([a, b]) => (c.dir === 'left' ? [W - a, b] : c.dir === 'right' ? [a, b] : c.dir === 'up' ? [b, H - a] : [b, a]).map(f).join(' ');
      let d = '';
      for (let i = 0; i < n; i++) {
        const delay = r() * 0.35, sp = K.seg(p, delay, delay + 0.65), s = sp * sp * (3 - 2 * sp);
        for (let j = 0; j < m; j++) {
          const jit = (r() - 0.5) * 2 * jm, front = (A + jm) * s + jit * Math.sin(Math.PI * s), b0 = (i * m + j) * B / (n * m) - 0.5, b1 = b0 + B / (n * m) + 1;
          if (front > 0) d += 'M' + pt([-1, b0]) + 'L' + pt([front, b0]) + 'L' + pt([front, b1]) + 'L' + pt([-1, b1]) + 'Z';
        }
      }
      c.to.style.clipPath = d ? "path('" + d + "')" : 'inset(100%)';
    },
    glitch: (p, c) => {   // seeded bands swap between the layers (to shows in them before the middle, from after), layers jitter and shift hue
      const a = Math.sin(Math.PI * p), r = rng(hash(c.seed + ':glitch:' + Math.floor(p * 14))), nb = Math.round(a * 7), bands = [];
      for (let i = 0; i < nb; i++) { const h = (0.02 + 0.1 * r()) * H; bands.push({ y: r() * (H - h), h, s: (r() - 0.5) * 2, x0: r() * 0.3 * W, w: (0.4 + 0.4 * r()) * W }); }
      const dx = (r() - 0.5) * 2 * 0.05 * W * a, hue = (r() - 0.5) * 90 * a;
      const rect = (b) => 'M0 ' + f(b.y) + 'h' + W + 'v' + f(b.h) + 'h' + -W + 'z', all = bands.map(rect).join('');
      c.from.style.transform = 'translateX(' + f(dx) + 'px)'; c.to.style.transform = 'translateX(' + f(-dx) + 'px)';
      c.from.style.filter = c.to.style.filter = 'hue-rotate(' + f(hue) + 'deg) saturate(' + f(1 + a) + ')';
      if (p < 0.5) { if (nb) c.to.style.clipPath = "path('" + all + "')"; else hide(c.to); }
      else if (nb) c.to.style.clipPath = "path(evenodd,'M0 0h" + W + 'v' + H + 'h' + -W + 'z' + all + "')";
      const bar = (b, col, x) => 'linear-gradient(' + col + ',' + col + ') ' + f(x) + 'px ' + f(b.y) + 'px/' + f(b.w) + 'px ' + f(b.h) + 'px no-repeat';
      c.overlay.style.background = bands.flatMap((b) => [bar(b, 'rgba(255,0,70,.55)', b.x0), bar(b, 'rgba(0,255,255,.55)', b.x0 + b.s * 0.06 * W)]).join(',');
      c.overlay.style.mixBlendMode = 'screen'; wash(c, nb ? 1 : 0);
    },
  };
  TYPES.none = TYPES.cut;

  K.transition = (type, { from = null, to = null, at, dur = K.dur(0.6), dir = 'left', x = W / 2, y = H / 2, seed = 1, color, cue, ease = K.ease } = {}) => {
    const fn = typeof type === 'function' ? type : TYPES[type];
    if (!fn) throw new Error('KIT.transition: unknown type "' + type + '" (' + K.transition.names.join(', ') + ')');
    if (!Number.isFinite(at)) throw new Error('KIT.transition: `at` (seconds) is required');
    if (!DIR[dir]) throw new Error('KIT.transition: dir must be left, right, up or down');
    const end = at + dur, d = DIR[dir], ov = K.el('div', 'kit-transition-overlay', K.stage);
    K.css(ov, { left: 0, top: 0, width: W + 'px', height: H + 'px', pointerEvents: 'none', zIndex: 30, visibility: 'hidden' });
    const p = (t) => ease(K.seg(t, at, end));
    const me = { at, end, p, set(t) {
      const s = K.seg(t, at, end), fo = from && owner(from, t) === me, tw = to && owner(to, t) === me;
      for (const k of ['background', 'mixBlendMode']) ov.style[k] = '';
      K.show(ov, 0);
      if (s <= 0 || s >= 1) {   // outside the window: before = from up, after = to up
        if (fo) reset(from, s >= 1 ? 'hidden' : 'visible');
        if (tw) reset(to, s >= 1 ? 'visible' : 'hidden');
        return;
      }
      const F = fo ? from : SPARE[0], T = tw ? to : SPARE[1];
      reset(F, 'visible'); reset(T, 'visible'); T.style.zIndex = 1;
      fn(ease(s), { from: F, to: T, hasFrom: !!from, hasTo: !!to, dir, d, x, y, seed, color, overlay: ov });
    } };
    for (const e of [from, to]) if (e) { const l = reg.get(e) || []; l.push(me); l.sort((a, b) => a.at - b.at); reg.set(e, l); }
    if (cue) K.cue(at, cue);
    return me;
  };
  K.transition.names = Object.keys(TYPES);
})();
