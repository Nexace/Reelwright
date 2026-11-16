// p5-camera.js: more camera on KIT.shot (load after engine.js, shots.js; planes need shots2.js only for their consumers).
//   KIT.shot.keys(keys, { log = true, mono = false })   authored camera keys [{ t, z, x, y, rx, ry, rz, persp, blur, ease? }] → t → state.
//       Each key's `ease` shapes the segment that ARRIVES at it (default the theme's K.ease). z is interpolated in log2 by default, so a
//       1 → 4 zoom reads as constant speed; mono clamps z to the segment's two keys (an overshooting ease never zooms past a key).
//       Exactly the key's state at its t; holds the first and last key outside. KIT.shot.path(fn) is an authored t → state function.
//   KIT.shot.monoZoom(z0, z1, p)                        log2 zoom between z0 and z1 at progress p (exact at 0 and 1)
//   KIT.shot.lens({ t0, t1, to, ease })                 lens zoom: the focal length changes, depth does not (planes do not move apart)
//   KIT.shot.dollyZoomReal(planes, { t0, t1, dolly, ease })   dolly-zoom solved per frame over >= 2 depth planes [{ el, z }] (z = 1 is the
//       subject plane, bigger = farther). The camera dollies by q (the planes' pose, S.planes: depth d scales 1 / (1 - q / d)) while the lens
//       zooms by (1 - q) so the SUBJECT plane keeps its size; a far plane ends at (1 - q) / (1 - q / d). Returns fn(t) that writes the
//       styles, with .at(t) → [{ scale, line }] (line = --kit-line, the stroke compensation) and .lens(t).
//   KIT.shakeNoise(t, t0, { amp = 14, dur = 0.5, attack = 0.04, hz = 14, rot = 1.2, seed = 0 }) → { x, y, rz } gradient-noise shake: the
//       amplitude ramps up over `attack` s (smoothstep), then decays as (1 - u)^2; the rotation (deg, about the frame centre) rides the same
//       envelope. Exactly 0 outside [t0, t0 + dur]. KIT.shot.withShake(shot, t0, opts) adds it to a shot (x, y and rz, about the centre).
//   KIT.project(state, [x, y])   where world point [x, y] lands on screen under camera `state` (KIT.cam3: z, x, y, rz; rx and ry are ignored)
// Pure functions of t: no state between calls, no Math.random (the noise is hashed from the seed).
'use strict';
(function () {
  const K = window.KIT, S = K && K.shot;
  if (!S || !K.cam3) throw new Error('p5-camera.js: load tools/engine.js and tools/shots.js first');
  const FIELDS = ['z', 'x', 'y', 'rx', 'ry', 'rz', 'persp', 'blur'], n4 = (v) => +v.toFixed(4);
  const fin = (v, what) => { if (!Number.isFinite(v)) throw new Error(`${what} is ${v}`); return v; };
  const ez = (e) => (typeof e === 'function' ? e : e ? K.easing(e) : K.ease);

  K.project = (state, [x, y]) => {
    const c = K.cam3(state), a = (c.rz * Math.PI) / 180, px = (x - c.x) * c.z, py = (y - c.y) * c.z;
    return [K.W_ / 2 + px * Math.cos(a) - py * Math.sin(a), K.H_ / 2 + px * Math.sin(a) + py * Math.cos(a)];
  };

  S.monoZoom = (z0, z1, p) => {
    if (!(z0 > 0 && z1 > 0)) throw new Error('monoZoom: zooms must be > 0');
    return p <= 0 ? z0 : p >= 1 ? z1 : Math.pow(2, K.lerp(Math.log2(z0), Math.log2(z1), p));
  };
  S.path = (fn) => (t) => K.cam3(fn(t));

  S.keys = (keys, { log = true, mono = false } = {}) => {
    if (!Array.isArray(keys) || !keys.length) throw new Error('keys: need at least one { t, ... } key');
    const sorted = keys.slice().sort((a, b) => a.t - b.t);
    let prev = {};   // a field a key leaves out carries over from the key before it (the first key: the identity), so a key says only what changes
    const P = sorted.map((k) => {
      prev = Object.assign({}, prev, Object.fromEntries(FIELDS.filter((f) => k[f] != null).map((f) => [f, k[f]])));
      return { t: fin(k.t, 'keys: key t'), s: K.cam3(prev), e: ez(k.ease) };
    });
    for (let i = 1; i < P.length; i++) if (!(P[i].t > P[i - 1].t)) throw new Error('keys: key times must differ');
    return (t) => {
      if (t <= P[0].t) return K.cam3(P[0].s);
      for (let i = 1; i < P.length; i++) if (t < P[i].t) {
        const a = P[i - 1].s, b = P[i].s, p = P[i].e(K.seg(t, P[i - 1].t, P[i].t)), o = {};
        for (const f of FIELDS) o[f] = K.lerp(a[f], b[f], p);
        if (log) o.z = Math.pow(2, K.lerp(Math.log2(a.z), Math.log2(b.z), p));
        if (mono) o.z = K.clamp(o.z, Math.min(a.z, b.z), Math.max(a.z, b.z));
        return K.cam3(o);
      }
      return K.cam3(P[P.length - 1].s);
    };
  };

  S.lens = ({ t0, t1, to = 2, from = 1, ease } = {}) => {
    if (!(t1 > t0)) throw new Error('lens: need t1 > t0');
    const e = ez(ease);
    return (t) => K.cam3({ z: S.monoZoom(from, to, e(K.seg(t, t0, t1))) });
  };

  S.dollyZoomReal = (planes, { t0, t1, dolly = 0.4, from = 0, ease } = {}) => {
    if (!Array.isArray(planes) || planes.length < 2) throw new Error('dollyZoomReal: needs at least 2 depth planes [{ el, z }]; one plane has nothing to move against');
    for (const l of planes) if (!(l.el && l.z > 0)) throw new Error('dollyZoomReal: every plane needs { el, z > 0 }');
    if (!(t1 > t0)) throw new Error('dollyZoomReal: need t1 > t0');
    if (!(dolly < 1 && from < 1)) throw new Error('dollyZoomReal: dolly must stay below 1 (the camera cannot reach the subject plane)');
    const e = ez(ease), q = (t) => K.lerp(from, dolly, e(K.seg(t, t0, t1)));
    const at = (t) => {
      const d = q(t), lens = 1 - d;
      return planes.map((l) => {
        const den = 1 - d / l.z;
        if (!(den > 0.01)) throw new Error(`dollyZoomReal: the camera passed the plane at z = ${l.z}`);
        const scale = lens / den;
        return { scale, line: n4(Math.pow(scale, 0.35) / scale) };
      });
    };
    const fn = (t) => at(t).forEach((s, i) => { K.shoot(planes[i].el, K.cam3({ z: s.scale })); planes[i].el.style.setProperty('--kit-line', String(s.line)); });
    fn.at = at; fn.lens = (t) => 1 - q(t);
    return fn;
  };

  // 1-D Perlin gradient noise in about [-0.7, 0.7], smooth in x; the lattice gradients are hashed from the seed
  const grad = (seed, i) => { let h = Math.imul(i | 0, 0x27d4eb2d) ^ (seed >>> 0); h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h ^= h >>> 13; return ((h >>> 0) / 4294967296) * 2 - 1; };
  const noise1 = (seed, x) => {
    const i = Math.floor(x), f = x - i, s = f * f * f * (f * (f * 6 - 15) + 10);
    return K.lerp(grad(seed, i) * f, grad(seed, i + 1) * (f - 1), s);
  };
  K.shakeNoise = (t, t0, { amp = 14, dur = 0.5, attack = 0.04, hz = 14, rot = 1.2, seed = 0 } = {}) => {
    const d = t - t0;
    if (!(d > 0) || d >= dur) return { x: 0, y: 0, rz: 0 };
    const u = d / dur, up = K.seg(d, 0, attack), env = up * up * (3 - 2 * up) * (1 - u) * (1 - u), k = 2 * amp * K.u * env;   // noise is about ±0.5: ×2 → ±amp
    return { x: k * noise1(seed * 3 + 1, d * hz), y: k * noise1(seed * 3 + 2, d * hz), rz: 2 * rot * env * noise1(seed * 3 + 3, d * hz) };
  };
  S.withShake = (shot, t0, o = {}) => (t) => {
    const c = shot(t), s = K.shakeNoise(t, t0, o);
    return K.cam3({ ...c, x: c.x + s.x, y: c.y + s.y, rz: c.rz + s.rz });   // rz turns about the frame centre when the focal point is the centre (the default)
  };
  if (S.names && !S.names.includes('keys')) S.names.push('keys', 'lens', 'dollyZoomReal', 'withShake');
})();
