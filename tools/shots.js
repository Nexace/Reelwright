// Camera shots: KIT.cam3 / camCSS / shoot (a 3D camera state → CSS) and KIT.shot.<name>(opts) → t → state. Loaded after engine.js.
// A state is { z, x, y, rx, ry, rz, persp, blur }: z zoom, (x, y) the focal point in frame px, rotations in degrees, persp in px,
// blur in px. Film the element that fills the frame (the stage content wrapper): KIT.shoot(el, state) in render(t).
// Every preset is closed-form in t and holds its start state before its window and its end state after, so stillness
// after a move is automatic. Shape constants are frame counts at 30 fps, written f(n) = n/30 s and scaled by KIT.dur
// (the theme's tempo); start/end times always come from the caller (W/V/KIT.snap), never from here.
// Sizes in px (shake, drift) are multiplied by KIT.u so 9x16 and 1x1 keep the same proportions.
'use strict';
(function () {
  const K = window.KIT, S = {};
  const f = (n) => K.dur(n / 30);
  const id = () => ({ z: 1, x: K.W_ / 2, y: K.H_ / 2, rx: 0, ry: 0, rz: 0, persp: 1200, blur: 0 });
  const E = (n) => K.easing(n);
  const BZ = (a, b, c, d) => K.bezier(a, b, c, d);

  // fill defaults; refuse NaN/Infinity so a bad preset fails loudly instead of rendering a blank frame
  K.cam3 = (s = {}) => {
    const o = Object.assign(id(), s);
    for (const k of Object.keys(o)) if (!Number.isFinite(o[k])) throw new Error(`cam3: ${k} is ${o[k]}`);
    return o;
  };
  const n4 = (v) => +v.toFixed(4);
  // translate → rotateY → rotateX → rotateZ → scale, all about the focal point (transform-origin); the translate puts that point
  // at the frame centre; perspective sits before the rotations (only when something tilts) with its vanishing point at the centre
  K.camCSS = (state) => {
    const c = K.cam3(state), tilt = c.rx || c.ry;
    return {
      transformOrigin: `${n4(c.x)}px ${n4(c.y)}px`,
      transform: `translate(${n4(K.W_ / 2 - c.x)}px, ${n4(K.H_ / 2 - c.y)}px)${tilt && c.persp > 0 ? ` perspective(${n4(c.persp)}px)` : ''} rotateY(${n4(c.ry)}deg) rotateX(${n4(c.rx)}deg) rotateZ(${n4(c.rz)}deg) scale(${n4(c.z)})`,
      filter: c.blur > 0.01 ? `blur(${n4(c.blur)}px)` : 'none',
    };
  };
  K.shoot = (el, state) => { const c = K.camCSS(state); el.style.transformOrigin = c.transformOrigin; el.style.transform = c.transform; el.style.filter = c.filter; };

  // ---- helpers ---------------------------------------------------------------------------------------------------
  const hash = (s) => { let h = 0x811c9dc5; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
  // hand-held drift: two sines per axis (9.3 + 24.9 rad/s on x, 14.1 + 33.9 on y; 0.31/0.83/0.47/1.13 rad per frame at 30 fps),
  // each phase offset by the seed (seed 0 = the unshifted source phases). Normalised so |x|, |y| <= amp.
  K.handheld = (t, amp = 4, seed = 0) => {
    const h = hash(seed), ph = (i) => seed === 0 ? 0 : ((Math.imul(h, 2654435761 + i * 40503) >>> 0) / 4294967296) * 2 * Math.PI;
    return {
      x: amp * (Math.sin(9.3 * t + ph(0)) + 0.6 * Math.sin(24.9 * t + 1.7 + ph(1))) / 1.6,
      y: amp * (Math.sin(14.1 * t + 0.9 + ph(2)) + 0.5 * Math.sin(33.9 * t + 3.1 + ph(3))) / 1.5,
    };
  };
  // impact shake: amp * exp(-(t - t0) / tau), oscillating at ~9 and ~11 Hz; exactly 0 before t0 and after 8 tau (~14 frames for tau = 1.8 f)
  K.shake = (t, t0, amp = 14, tau = f(1.8)) => {
    const d = t - t0;
    if (d < 0 || d > 8 * tau) return { x: 0, y: 0 };
    const a = amp * Math.exp(-d / tau);
    return { x: a * Math.cos(2 * Math.PI * 9 * d), y: a * Math.sin(2 * Math.PI * 11 * d + 1) };
  };
  // time remap: [[tOut, tSrc], ...] ascending in tOut, piecewise linear, clamped at both ends. Slope 0 = freeze.
  K.remap = (t, pts) => {
    if (!Array.isArray(pts) || pts.length < 2) throw new Error('remap: need at least two [tOut, tSrc] points');
    for (let i = 1; i < pts.length; i++) if (!(pts[i][0] > pts[i - 1][0])) throw new Error('remap: tOut must ascend');
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) return K.lerp(pts[i - 1][1], pts[i][1], (t - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
    return pts[pts.length - 1][1];
  };
  // blur from how fast a state fn moves: central difference of the focal point and zoom (px/s) → blur radius, capped at px.
  // 0.0015 px of blur per px/s: a whip pan's ~16000 px/s hits the cap, a 4 s push-in stays far below visibility.
  K.speedBlur = (fn, t, px = 24) => {
    const h = 1 / 240, a = K.cam3(fn(t - h)), b = K.cam3(fn(t + h));
    const v = Math.hypot(b.x - a.x, b.y - a.y, (b.z - a.z) / ((a.z + b.z) / 2) * K.H_ / 2) / (2 * h);
    return Math.min(px, 0.0015 * v);
  };

  // ---- presets ----------------------------------------------------------------------------------------------------
  // window: t0 (or at) start, t1 end or dur; default duration is the shot's source length in frames
  const win = (o, frames) => {
    const t0 = o.t0 ?? o.at ?? 0, t1 = o.t1 ?? t0 + (o.dur ?? f(frames));
    if (!(Number.isFinite(t0) && t1 > t0)) throw new Error(`shot window needs t1 > t0 (got ${t0}, ${t1})`);
    return [t0, t1];
  };

  // slow push-in: 1.00 → 1.14, accelerating (power2.in); source 120 f
  S.pushIn = (o = {}) => {
    const [t0, t1] = win(o, 120), { from = 1, to = 1.14 } = o, e = E('power2.in');
    return (t) => K.cam3({ x: o.x ?? K.W_ / 2, y: o.y ?? K.H_ / 2, z: K.lerp(from, to, e(K.seg(t, t0, t1))) });
  };
  // pull-back: the inverse, 1.14 → 1.00 decelerating (power2.out); holds the 1.14 start before t0 (not identity)
  S.pullBack = (o = {}) => {
    const [t0, t1] = win(o, 110), { from = 1.14, to = 1 } = o, e = E('power2.out');
    return (t) => K.cam3({ x: o.x ?? K.W_ / 2, y: o.y ?? K.H_ / 2, z: K.lerp(from, to, e(K.seg(t, t0, t1))) });
  };
  // crash zoom: 1 → 2.6 in 6 f on bezier(.55,0,.7,1) while the focal point converges on (x, y) with power2.in, then
  // 'stop': a shake of 14 px decaying with tau = 1.8 f, or 'rebound': 2.6 → 2.45 over 5 f (power2.out), no shake
  S.crashZoom = (o = {}) => {
    const t0 = o.at ?? o.t0 ?? 0, d = o.dur ?? f(6), t1 = t0 + d, { zoom = 2.6, variant = 'stop', amp = 14, rebound = 2.45 } = o;
    if (variant !== 'stop' && variant !== 'rebound') throw new Error(`crashZoom: variant must be 'stop' or 'rebound'`);
    const ez = BZ(0.55, 0, 0.7, 1), ep = E('power2.in'), er = E('power2.out'), tx = o.x ?? K.W_ / 2, ty = o.y ?? K.H_ / 2, r1 = t1 + f(5);
    return (t) => {
      const p = K.seg(t, t0, t1), s = variant === 'stop' ? K.shake(t, t1, amp * K.u, f(1.8)) : { x: 0, y: 0 };
      return K.cam3({
        z: K.lerp(1, zoom, ez(p)) - (variant === 'rebound' ? (zoom - rebound) * er(K.seg(t, t1, r1)) : 0),
        x: K.lerp(K.W_ / 2, tx, ep(p)) + s.x, y: K.lerp(K.H_ / 2, ty, ep(p)) + s.y,
      });
    };
  };
  // whip pan: the focal point travels 1.5 frame widths (dir 1 = right, -1 = left) in 8 f on bezier(.6,0,.4,1) with speed blur;
  // 'brake': 70 % of the distance in the 8 f swing (power2.in), the last 30 % over a 48 f tail (power3.out) so the arrival can be read
  S.whipPan = (o = {}) => {
    const t0 = o.at ?? o.t0 ?? 0, d = o.dur ?? f(8), { variant = 'basic', dir = 1, blur = 24 } = o, D = dir * 1.5 * K.W_, e = BZ(0.6, 0, 0.4, 1);
    if (variant !== 'basic' && variant !== 'brake') throw new Error(`whipPan: variant must be 'basic' or 'brake'`);
    const dx = variant === 'basic' ? (t) => D * e(K.seg(t, t0, t0 + d))
      : (t) => D * (0.7 * E('power2.in')(K.seg(t, t0, t0 + d)) + 0.3 * E('power3.out')(K.seg(t, t0 + d, t0 + 7 * d)));
    const pos = (t) => K.cam3({ x: K.W_ / 2 + dx(t) });
    return (t) => Object.assign(pos(t), { blur: K.speedBlur(pos, t, blur) });
  };
  // fake dolly zoom, a layer preset: the hero stays put, the background scales 1 → 2.25 and blurs 0 → 3.5 px on bezier(.4,0,.3,1).
  // Returns { bg, hero }: shoot the background layer with bg and leave the hero alone (hero is the identity state).
  S.dollyZoom = (o = {}) => {
    const [t0, t1] = win(o, 95), { zoom = 1.25, blur = 3.5 } = o, e = BZ(0.4, 0, 0.3, 1);
    return (t) => { const p = e(K.seg(t, t0, t1)); return { bg: K.cam3({ z: 1 + zoom * p, blur: blur * p }), hero: K.cam3() }; };
  };
  // orbit: rotateY sweeps -18° → +18° (power2.out) with perspective 1100; z 1.1 hides the exposed edges. Holds -18° before t0.
  S.orbit = (o = {}) => {
    const [t0, t1] = win(o, 34), { ry = [-18, 18], rx = 0, z = 1.1, persp = 1100 } = o, e = E('power2.out');
    return (t) => K.cam3({ x: o.x ?? K.W_ / 2, y: o.y ?? K.H_ / 2, z, rx, persp, ry: K.lerp(ry[0], ry[1], e(K.seg(t, t0, t1))) });
  };
  // crane rise: starts low and zoomed (focal point `lift` of the frame height below centre, z 1.6, tilted rx 6°) and rises to level (power2.out); source 100 f.
  S.craneRise = (o = {}) => {
    const [t0, t1] = win(o, 100), { lift = 0.3, zoom = 1.6, tilt = 6 } = o, e = E('power2.out');
    return (t) => { const q = 1 - e(K.seg(t, t0, t1)); return K.cam3({ x: K.W_ / 2, y: K.H_ / 2 + lift * K.H_ * q, z: K.lerp(1, zoom, q), rx: tilt * q }); };
  };
  // dutch roll to level: tilted -10° with a ±0.8° slow drift and 2 px vertical drift until `at`, then 14 f (power3.out) to +1.2°, 10 f
  // (power2.inOut) to 0°; zoom 1.15 → 1.08 over the roll hides the corners; the drift fades over 6 f. Never identity: it starts tilted.
  S.dutchRoll = (o = {}) => {
    const t0 = o.at ?? o.t0 ?? 0, a = t0 + f(14), b = a + f(10), { from = -10, over = 1.2, z0 = 1.15, z1 = 1.08 } = o;
    const e1 = E('power3.out'), e2 = E('power2.inOut');
    return (t) => {
      const k = 1 - K.seg(t, t0, t0 + f(6)), roll = t < a ? K.lerp(from, over, e1(K.seg(t, t0, a))) : K.lerp(over, 0, e2(K.seg(t, a, b)));
      return K.cam3({ z: K.lerp(z0, z1, e1(K.seg(t, t0, b))), rz: roll + 0.8 * k * Math.sin(1.3 * t), y: K.H_ / 2 + 2 * K.u * k * Math.sin(1.7 * t + 1) });
    };
  };
  S.names = ['pushIn', 'pullBack', 'crashZoom', 'whipPan', 'dollyZoom', 'orbit', 'craneRise', 'dutchRoll'];

  // sequence shots: [{ at, shot }, ...] → the latest shot whose `at` has passed; shots hold their end state, so a finished move
  // stays still until the next one starts (a hard cut between them). Before the first `at`: identity.
  S.track = (list) => {
    const l = list.slice().sort((a, b) => a.at - b.at);
    return (t) => { let s = null; for (const e of l) if (e.at <= t) s = e.shot; return s ? s(t) : K.cam3(); };
  };
  K.shot = S;
})();
