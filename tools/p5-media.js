// p5-media.js: perceptual scale and animated images (GIF / APNG / WebP / AVIF). Load after engine.js. Pure functions of t.
//
// KIT.scaleArea(a, b, p)        a scale from a to b at progress p, interpolated in AREA space (Remotion's output: 'perceptual-scale'):
//                               r = lerp(sgn(a)·a², sgn(b)·b², p), result sgn(r)·√|r|. A linear 1 → 3 looks like it slows down at the end (what
//                               the eye reads is area); this one reads steady. Exact at p = 0 and 1; a → b with a < 0 < b crosses zero smoothly.
// KIT.scaleKeys(t, pts, eases)  like KIT.keys ([[t, scale], …], one ease per segment) but each segment goes through scaleArea
//
// KIT.animatedImage(meta, { at = 0, playbackRate = 1, loopBehavior = 'loop', fit = 'contain', base = '', parent, cls, w, h }) → { el, frameAt(t), dur, set(t) }
//   meta = the .frames.json that `reelwright animimg <file>` writes next to the frames it extracts with ffmpeg at build time (GIF, APNG, WebP,
//   AVIF: any animation ffmpeg decodes): { frames: ['f0001.png', …], durations: [s, …], w, h }. Every frame is one <img> loaded at start
//   (K.img, so READY waits for them) and render(t) shows exactly one: nothing plays, so seeking in any order gives the same frame.
//   frameAt(t) → the frame index at film time t, or -1 when nothing shows. playbackRate scales the clock. loopBehavior:
//     'loop'                 wraps (default)
//     'pause-after-finish'   holds the last frame for good
//     'clear-after-finish'   hides the image once the animation has played through once
//   Before `at` nothing shows. fit is the CSS object-fit of the frames in the w × h box (default: the stage). `base` is prefixed to frame names.
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('p5-media.js: load tools/engine.js first');
  const sq = (v) => Math.sign(v) * v * v;
  K.scaleArea = (a, b, p) => { if (p <= 0) return a; if (p >= 1) return b; const r = K.lerp(sq(a), sq(b), p); return Math.sign(r) * Math.sqrt(Math.abs(r)); };
  K.scaleKeys = (t, pts, eases = []) => {
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      if (t >= pts[i + 1][0]) continue;
      const e = eases[i] || K.ease;
      return K.scaleArea(pts[i][1], pts[i + 1][1], (typeof e === 'string' ? K.easing(e) : e)(K.seg(t, pts[i][0], pts[i + 1][0])));
    }
    return pts[pts.length - 1][1];
  };

  const LOOPS = ['loop', 'pause-after-finish', 'clear-after-finish'];
  K.animatedImage = (meta, { at = 0, playbackRate = 1, loopBehavior = 'loop', fit = 'contain', base = '', parent = K.stage, cls = '', w, h } = {}) => {
    if (!meta || !Array.isArray(meta.frames) || !meta.frames.length || meta.frames.length !== (meta.durations || []).length)
      throw new Error('animatedImage: meta needs frames [] and durations [] of the same length (reelwright animimg <file> writes them)');
    if (!LOOPS.includes(loopBehavior)) throw new Error(`animatedImage: loopBehavior is ${LOOPS.join(' | ')} (got ${loopBehavior})`);
    if (!(playbackRate > 0)) throw new Error('animatedImage: playbackRate must be > 0');
    if (meta.frames.length > 400) throw new Error(`animatedImage: ${meta.frames.length} frames is too many to hold as <img>s; extract with --fps or --width to thin it`);
    const cum = [0]; for (const d of meta.durations) cum.push(cum[cum.length - 1] + d);
    const dur = cum[cum.length - 1];
    const el = K.el('div', 'kit-animimg ' + cls, parent);
    K.css(el, { position: 'absolute', left: '0px', top: '0px', width: (w ?? K.W_) + 'px', height: (h ?? K.H_) + 'px' });
    const imgs = meta.frames.map((f) => { const im = K.el('img', '', el); K.css(im, { position: 'absolute', left: '0px', top: '0px', width: '100%', height: '100%', objectFit: fit, visibility: 'hidden' }); K.img(im, base + f); return im; });
    const frameAt = (t) => {
      let l = (t - at) * playbackRate;
      if (l < 0) return -1;
      l += 1e-9;   // t = at + 0.2 is frame 1 even when the subtraction lands a hair under 0.2
      if (l >= dur) {
        if (loopBehavior === 'clear-after-finish') return -1;
        if (loopBehavior === 'pause-after-finish') return imgs.length - 1;
        l %= dur;
      }
      let lo = 0, hi = imgs.length - 1;   // last frame whose start <= l
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (cum[m] <= l) lo = m; else hi = m - 1; }
      return lo;
    };
    let shown = -2;
    return { el, dur: dur / playbackRate, frameAt, set(t) {
      const i = frameAt(t);
      if (i === shown) return;
      if (shown >= 0) imgs[shown].style.visibility = 'hidden';
      if (i >= 0) imgs[i].style.visibility = 'visible';
      shown = i;   // only a cache of what is on screen: the picture still depends on t alone, as render(t) always sets it
    } };
  };
})();
