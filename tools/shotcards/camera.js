// Shotcards, camera: KIT.shotcards.cursorFlyover / pullBackIsolation / terminal3d. Load after engine.js, shots.js, shots2.js and
// motion.js (terminal3d types with KIT.typewriter). HyperFrames: kit/shotcards/camera.js; pvk: ../../../tools/shotcards/camera.js.
// Every helper is a pure function of t: DOM is built once at creation, set(t) only writes styles from t. Each returns { set(t), cam(t),
// at(t) } (at = the numbers set writes, for checks). Timings are our choices where the source card gives none.
//   cursorFlyover({ layer, poses: [{ t, state, cursor: { x, y }, click?, ease? }], size })   a camera tour whose cursor stays `size` px on screen
//   pullBackIsolation({ layer, focus: { x, y }, siblings, t0, t1, from = 1.35, dim = 0.2 })    pull back from a subject while the rest dims
//   terminal3d({ layer, el, text, t0, t1, poses?, cps, gap, mistakes })                       a tilted terminal flown to frontal, then it types
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.shot || !K.shot.tour) throw new Error('shotcards/camera.js: load engine.js, shots.js and shots2.js first');
  const C = (K.shotcards = K.shotcards || {}), S = K.shot, n4 = (v) => +v.toFixed(4);
  const fin = (v, what) => { if (!Number.isFinite(v)) throw new Error(what + ' is ' + v); return v; };

  // cursor-flyover: S.tour flies the layer; a second tour (same times and eases) moves the cursor in layer px; the cursor is a child of
  // the layer drawn at scale(1/z) so it keeps its size on screen however far the camera is in. A pose with click: true dips it for 0.18 s.
  C.cursorFlyover = ({ layer, poses, size = 26 * K.u } = {}) => {
    if (!layer || !Array.isArray(poses) || poses.some((p) => !p.cursor)) throw new Error('cursorFlyover: need { layer, poses: [{ t, state, cursor: { x, y } }] }');
    const cam = S.tour(poses.map((p) => ({ t: p.t, state: p.state, ease: p.ease })));
    const cur = S.tour(poses.map((p) => ({ t: p.t, state: { x: fin(p.cursor.x, 'cursor x'), y: fin(p.cursor.y, 'cursor y') }, ease: p.ease })));
    const el = K.el('div', 'kit-flycursor', layer, '<svg viewBox="0 0 14 21" width="100%" height="100%"><path d="M0.5 0.5 L0.5 17 L4.6 13.2 L7.4 19.8 L10 18.7 L7.2 12.2 L12.8 12.2 Z" fill="#111" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>');
    K.css(el, { position: 'absolute', left: '0px', top: '0px', width: size * 14 / 21 + 'px', height: size + 'px', transformOrigin: '0 0', pointerEvents: 'none', zIndex: 40 });
    const clicks = poses.filter((p) => p.click).map((p) => p.t);
    const at = (t) => {
      const c = cam(t), q = cur(t);
      let press = 0;
      for (const ct of clicks) if (t >= ct && t < ct + 0.18) press = Math.max(press, Math.sin(Math.PI * (t - ct) / 0.18));
      return { z: n4(c.z), cx: n4(q.x), cy: n4(q.y), scale: n4((1 / c.z) * (1 - 0.15 * press)) };
    };
    const set = (t) => {
      K.shoot(layer, cam(t));
      const s = at(t);
      el.style.transform = 'translate(' + s.cx + 'px,' + s.cy + 'px) scale(' + s.scale + ')';
    };
    return { set, cam, at, el };
  };

  // pull-back-isolation (tension-camera-moves; the bullet-time half is KIT.shot.bulletTime): the camera starts `from` zoomed on the
  // subject (focus, layer px) and pulls back to the whole frame (power2.out, the focal point recentres, so it ends at identity) while
  // every sibling eases to `dim` opacity, leaving the subject alone. Siblings' opacity belongs to this helper.
  C.pullBackIsolation = ({ layer, focus, siblings = [], t0, t1, from = 1.35, dim = 0.2, dimStart = 0.15 } = {}) => {
    if (!layer || !focus || !(t1 > t0)) throw new Error('pullBackIsolation: need { layer, focus: { x, y }, t0, t1 > t0 }');
    const e = K.easing('power2.out');
    const cam = (t) => { const p = e(K.seg(t, t0, t1)); return K.cam3({ z: K.lerp(from, 1, p), x: K.lerp(focus.x, K.W_ / 2, p), y: K.lerp(focus.y, K.H_ / 2, p) }); };
    const op = (t) => n4(K.lerp(1, dim, K.easing('sine.inOut')(K.seg(t, t0 + dimStart * (t1 - t0), t1))));
    const set = (t) => { K.shoot(layer, cam(t)); const o = op(t); siblings.forEach((s) => { s.style.opacity = o; }); };
    return { set, cam, at: (t) => ({ ...cam(t), siblings: op(t) }) };
  };

  // terminal-3d: S.tour from a tilted, small terminal (default z .85 rx 14 ry -30 rz -3) to a near-frontal one (z 1.12, ry -8),
  // power2.out; KIT.typewriter types `text` into `el` once the last pose is reached (+ gap s). Needs motion.js. end = text complete.
  C.terminal3d = ({ layer, el, text, t0, t1, poses, cps = 22, gap = 0.2, mistakes = [] } = {}) => {
    if (!layer || !el || !(t1 > t0)) throw new Error('terminal3d: need { layer, el, text, t0, t1 > t0 }');
    if (!K.typewriter) throw new Error('terminal3d: load tools/motion.js (KIT.typewriter)');
    const P = poses || [{ t: t0, state: { z: 0.85, rx: 14, ry: -30, rz: -3, persp: 900 } }, { t: t1, state: { z: 1.12, rx: 3, ry: -8, persp: 900 }, ease: 'power2.out' }];
    const cam = S.tour(P), tw = K.typewriter(el, text, { at: P[P.length - 1].t + gap, cps, mistakes });
    return { set: (t) => { K.shoot(layer, cam(t)); tw.set(t); }, cam, end: tw.end, at: (t) => cam(t) };
  };
})();
