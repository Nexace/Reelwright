// fx-blur.js: the blur family (Remotion @remotion/effects row 2.3.3) and `Trail` (row 2.3.11), rewritten, no Remotion. Load after engine.js and
// fx-color.js. Pure functions of what set() is given: call set(...) from render(t). Plain blur is KIT.fx.filter({ blur: px }) (fx-color.js).
//
// Layers over a parent (backdrop-filter stacks, so they blur what is BELOW them: create them after the content they blur, or give the
// content a lower z-index; the layers sit at z-index 5):
//   KIT.fx.progressiveBlur(parent, { direction = 'down' | 'up' | 'left' | 'right', max = 24, steps = 6, from = 0, to = 1 }) → { el, set(amount 0..1) }
//       linearProgressiveBlur: sharp at `from` (fraction of the box along `direction`), full `max` px blur at `to`; `steps` stacked layers
//   KIT.fx.progressiveBlur(parent, { shape: 'radial', center = [0.5, 0.5], max, steps, from = 0, to = 1 })    radialProgressiveBlur: sharp inside
//       `from`, full blur at `to` (fractions of the distance to the farthest corner)
//   KIT.fx.regionBlur(parent, { x, y, w, h, blur = 16, feather = 12 }) → { el, set({ x, y, w, h, blur }) }   blur only inside the box (px), feathered edge
// Canvas effects (src = any CanvasImageSource, w × h px; every set() redraws from src):
//   KIT.fx.zoomBlur(src, { w, h, samples = 12, origin = [0.5, 0.5] }) → { el, set(amount) }   radial smear, amount 0.1 = the last copy is 10 % larger
//   KIT.fx.lensBlur(src, { w, h, samples = 24 }) → { el, set(radius px) }                      disc blur (every sample on a golden-angle spiral)
//   KIT.fx.lightTrail(src, { w, h, samples = 16, decay = 0.85 }) → { el, set({ dx, dy }) }   bright pixels smear along (dx, dy) px, the trail fading by decay per step
// Trail (Remotion <Trail layers lagInFrames trailOpacity>): KIT.fx.trail(parent, make, { layers = 4, lag = 0.05, opacity = 0.5 }) → { set(t) }
//   make(host) builds the picture once inside `host` and returns its own set(t); trail calls it for t, t - lag, t - 2·lag, …, each copy in its own
//   layer at opacity · (1 - (i - 1) / layers) (the real one, i = 0, at 1), the oldest copy underneath. Stateless: copy i is just render(t - lag·i).
// shortcut: lensBlur is a plain disc kernel (no bokeh highlight boost), upgrade when a film needs shaped highlights.
'use strict';
(function () {
  const K = window.KIT, X = K && K.fx;
  if (!X || !X.layer) throw new Error('fx-blur.js: load tools/engine.js and tools/fx-color.js first');
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const mask = (e, v, composite) => { e.style.maskImage = e.style.webkitMaskImage = v; if (composite) { e.style.maskComposite = 'intersect'; e.style.webkitMaskComposite = 'source-in'; } };
  const blurLayer = (parent, css) => X.layer(parent, { zIndex: '5', ...css });

  X.progressiveBlur = (parent, { shape = 'linear', direction = 'down', center = [0.5, 0.5], max = 24, steps = 6, from = 0, to = 1 } = {}) => {
    if (!(steps >= 1) || !(to > from)) throw new Error('progressiveBlur: steps >= 1 and to > from');
    const el = K.el('div', 'kit-fx', parent); K.css(el, { position: 'absolute', left: '0px', top: '0px', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '5' });
    const dir = { down: 'to bottom', up: 'to top', right: 'to right', left: 'to left' }[direction];
    if (shape === 'linear' && !dir) throw new Error('progressiveBlur: direction is down | up | left | right');
    const ls = Array.from({ length: steps }, (_, k) => {
      const a = from + (to - from) * k / steps, b = from + (to - from) * (k + 1) / steps, e = blurLayer(el, {});
      const A = (a * 100).toFixed(2), B = (b * 100).toFixed(2);
      mask(e, shape === 'radial' ? `radial-gradient(circle farthest-corner at ${center[0] * 100}% ${center[1] * 100}%, transparent ${A}%, #000 ${B}%)` : `linear-gradient(${dir}, transparent ${A}%, #000 ${B}%)`);
      return { e, px: max / 2 ** (steps - 1 - k) };   // doubling radii: the stack adds up to about `max`
    });
    return { el, set(amount) { for (const l of ls) { const v = `blur(${(l.px * clamp01(amount)).toFixed(3)}px)`; l.e.style.backdropFilter = l.e.style.webkitBackdropFilter = v; } } };
  };

  X.regionBlur = (parent, { x = 0, y = 0, w = 100, h = 100, blur = 16, feather = 12 } = {}) => {
    const el = blurLayer(parent, {});
    return { el, set(q = {}) {
      const r = { x, y, w, h, blur, ...q }, f = Math.min(feather, r.w / 2, r.h / 2);
      K.css(el, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
      el.style.backdropFilter = el.style.webkitBackdropFilter = `blur(${r.blur}px)`;
      const g = (d) => `linear-gradient(${d}, transparent, #000 ${f}px, #000 calc(100% - ${f}px), transparent)`;
      mask(el, `${g('to right')}, ${g('to bottom')}`, true);
    } };
  };

  const canvasFx = (src, { w = K.W_, h = K.H_, parent = K.stage } = {}, draw) => {
    const el = K.el('canvas', '', parent); el.width = w; el.height = h;
    K.css(el, { position: 'absolute', left: '0px', top: '0px', width: w + 'px', height: h + 'px' });
    const g = el.getContext('2d');
    return { el, set(p) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, w, h); draw(g, p, w, h); g.globalAlpha = 1; } };
  };
  X.zoomBlur = (src, o = {}) => {
    const n = o.samples ?? 12, [ox, oy] = o.origin || [0.5, 0.5];
    return canvasFx(src, o, (g, amount, w, h) => {
      for (let i = 0; i < n; i++) {   // running mean: sample i drawn at 1/(i+1) is the plain average of all samples so far
        const s = 1 + amount * (n > 1 ? i / (n - 1) : 0);
        g.globalAlpha = 1 / (i + 1); g.setTransform(s, 0, 0, s, ox * w * (1 - s), oy * h * (1 - s)); g.drawImage(src, 0, 0, w, h);
      }
    });
  };
  X.lensBlur = (src, o = {}) => {
    const n = o.samples ?? 24;
    return canvasFx(src, o, (g, r, w, h) => {
      for (let i = 0; i < n; i++) {
        const rr = r * Math.sqrt((i + 0.5) / n), a = i * 2.399963229728653;   // golden angle: an even disc
        g.globalAlpha = 1 / (i + 1); g.drawImage(src, rr * Math.cos(a), rr * Math.sin(a), w, h);
      }
    });
  };
  X.lightTrail = (src, o = {}) => {
    const n = o.samples ?? 16, decay = o.decay ?? 0.85;
    return canvasFx(src, o, (g, { dx = 0, dy = 0 } = {}, w, h) => {
      g.drawImage(src, 0, 0, w, h);
      g.globalCompositeOperation = 'lighten';
      for (let i = 1; i <= n; i++) { g.globalAlpha = decay ** i; g.drawImage(src, dx * i / n, dy * i / n, w, h); }
    });
  };

  X.trail = (parent, make, { layers = 4, lag = 0.05, opacity = 0.5 } = {}) => {
    const all = [];
    for (let i = layers; i >= 0; i--) {   // the oldest copy first, so it ends up underneath
      const host = K.el('div', 'kit-fx-trail', parent);
      K.css(host, { position: 'absolute', left: '0px', top: '0px', width: '100%', height: '100%' });
      all.push({ i, host, set: make(host) });
    }
    return { set(t) { for (const l of all) { l.set(t - lag * l.i); l.host.style.opacity = String(l.i ? opacity * (1 - (l.i - 1) / layers) : 1); } } };
  };
})();
