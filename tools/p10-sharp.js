// Sharp camera layer (Phase 11, row 2b.1): KIT.camCSS / KIT.shoot with { sharp: true }. Loaded after shots.js; wraps it, edits nothing.
// The standard camera is `scale(z)`: Chromium rasterises the filmed layer at its native size and scales that texture, so small text
// softens at high zoom or under a 3D tilt. `sharp` zooms the layer's LAYOUT instead (CSS `zoom: z`), so text is laid out and
// rasterised at its final size, and keeps the rotations and perspective as they were. Same camera state, same picture, crisper type.
//   KIT.shoot(el, state, { sharp: true })         // el = the layer that fills the frame (its box starts at the frame's top-left)
//   KIT.camCSS(state, { sharp: true }) → { zoom, width, height, transformOrigin, transform, filter }
// Without the option both calls are exactly what shots.js does (and `zoom` is cleared). Shortcut: the layer is sized in px from
// the frame (width/height = KIT.W_/KIT.H_), so children sized in % of it follow the zoom; a layer that is not frame-sized
// (a card, a bleed floor at inset -40%) should be filmed through a frame-sized wrapper.
'use strict';
(function () {
  const K = window.KIT, base = K.camCSS, baseShoot = K.shoot;
  const n4 = (v) => +v.toFixed(4);
  // `zoom` multiplies every length the element writes (box, translate, transform-origin, perspective), so each is written / z
  // to land where scale(z) would put it: the focal point (x, y) maps to (x z, y z) in layout, and is translated to the centre.
  K.camCSS = (state, o = {}) => {
    if (!o.sharp) return base(state);
    const c = K.cam3(state), z = c.z, tilt = c.rx || c.ry;
    return {
      zoom: String(n4(z)), width: `${n4(K.W_)}px`, height: `${n4(K.H_)}px`,
      transformOrigin: `${n4(c.x)}px ${n4(c.y)}px`,
      transform: `translate(${n4(K.W_ / (2 * z) - c.x)}px, ${n4(K.H_ / (2 * z) - c.y)}px)${tilt && c.persp > 0 ? ` perspective(${n4(c.persp / z)}px)` : ''} rotateY(${n4(c.ry)}deg) rotateX(${n4(c.rx)}deg) rotateZ(${n4(c.rz)}deg)`,
      filter: c.blur > 0.01 ? `blur(${n4(c.blur / z)}px)` : 'none',
    };
  };
  K.shoot = (el, state, o = {}) => {
    const was = el.__p10Box;   // the box the layer had before the first sharp shot, put back when a shot is not sharp
    if (!o.sharp) { el.style.zoom = ''; if (was) { el.style.width = was[0]; el.style.height = was[1]; el.__p10Box = null; } return baseShoot(el, state); }
    if (!was) el.__p10Box = [el.style.width, el.style.height];
    const c = K.camCSS(state, o);
    el.style.zoom = c.zoom; el.style.width = c.width; el.style.height = c.height;
    el.style.transformOrigin = c.transformOrigin; el.style.transform = c.transform; el.style.filter = c.filter;
  };
})();
