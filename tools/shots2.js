// More camera shots, added to KIT.shot (loaded after engine.js and shots.js; same conventions as shots.js): a preset is
// KIT.shot.name(opts) → (t) → state, applied with KIT.shoot(el, state); windows come from the caller (t0/at + t1/dur), shape
// constants are frame counts at 30 fps written f(n) and scaled by KIT.dur, px scale by KIT.u; every preset holds its start state
// before its window and its end state after. Layer presets (planes, parallax, explode, rackFocus) return (t) → void and write
// the styles themselves; each also has .at(t) → the numbers it writes, for checks. All closed-form in t: no state between calls.
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.shot || !K.cam3) throw new Error('shots2.js: KIT.shot is missing; load tools/engine.js and tools/shots.js first');
  const S = K.shot, f = (n) => K.dur(n / 30), E = (n) => K.easing(n), n4 = (v) => +v.toFixed(4);
  const ez = (e) => (typeof e === 'function' ? e : e ? K.easing(e) : K.ease);
  const fin = (v, what) => { if (!Number.isFinite(v)) throw new Error(`${what} is ${v}`); return v; };
  // same window rule as shots.js (private there)
  const win = (o, frames) => {
    const t0 = o.t0 ?? o.at ?? 0, t1 = o.t1 ?? t0 + (o.dur ?? f(frames));
    if (!(Number.isFinite(t0) && t1 > t0)) throw new Error(`shot window needs t1 > t0 (got ${t0}, ${t1})`);
    return [t0, t1];
  };
  const FIELDS = ['z', 'x', 'y', 'rx', 'ry', 'rz', 'persp', 'blur'];
  const mix = (a, b, p) => { const o = {}; for (const k of FIELDS) o[k] = K.lerp(a[k], b[k], p); return K.cam3(o); };

  // multi-pose tour (basic-3d-scene, cursor-flyover, terminal-3d): poses [{ t, state, ease? }] at absolute times; each flight eases
  // every state field (the arriving pose's `ease`, else the theme's K.ease); exactly the pose's state at its t; holds first/last
  S.tour = (poses) => {
    if (!Array.isArray(poses) || poses.length < 1) throw new Error('tour: need at least one { t, state } pose');
    const P = poses.map((p) => ({ t: fin(p.t, 'tour: pose t'), s: K.cam3(p.state), e: ez(p.ease) })).sort((a, b) => a.t - b.t);
    for (let i = 1; i < P.length; i++) if (!(P[i].t > P[i - 1].t)) throw new Error('tour: pose times must differ');
    return (t) => {
      if (t <= P[0].t) return K.cam3(P[0].s);
      for (let i = 1; i < P.length; i++) if (t < P[i].t) {
        const p = P[i].e(K.seg(t, P[i - 1].t, P[i].t));
        return p <= 0 ? K.cam3(P[i - 1].s) : mix(P[i - 1].s, P[i].s, p);
      }
      return K.cam3(P[P.length - 1].s);
    };
  };

  // true depth parallax (anidoodle camera.ts): one camera, planes [{ el, z }] at depth z (1 = focal plane, bigger = farther, <1 nearer).
  // The camera's zoom is a dolly: a plane at depth d scales 1 / (1 - (1 - 1/zoom) / d), its pan is the camera's / d. Each plane also
  // gets --kit-line = S^0.35 / S: multiply stroke widths inside the plane by it and their on-screen weight grows as S^0.35, not S.
  S.planes = (layers, cam) => {
    if (typeof cam !== 'function') throw new Error('planes: cam must be a (t) → state function (a shot or tour)');
    for (const l of layers) if (!(l.el && l.z > 0)) throw new Error('planes: every layer needs { el, z > 0 }');
    const at = (t) => {
      const c = K.cam3(cam(t)), dolly = 1 - 1 / c.z;
      return layers.map((l) => {
        const den = 1 - dolly / l.z;
        if (!(den > 0.01)) throw new Error(`planes: the camera passed the plane at z = ${l.z}`);
        const z = 1 / den;
        return { state: K.cam3({ ...c, z, x: K.W_ / 2 + (c.x - K.W_ / 2) / l.z, y: K.H_ / 2 + (c.y - K.H_ / 2) / l.z }), line: n4(Math.pow(z, 0.35) / z) };
      });
    };
    const fn = (t) => at(t).forEach((s, i) => { K.shoot(layers[i].el, s.state); layers[i].el.style.setProperty('--kit-line', String(s.line)); });
    fn.at = at;
    return fn;
  };
  // multiplane parallax (depth-layer-moves), the simple form: layers [{ el, coef }] each translated by coef × offset(t);
  // coef defaults by index to far / mid / near = 0.35 / 0.7 / 1.4
  S.parallax = (layers, offset) => {
    if (typeof offset !== 'function') throw new Error('parallax: offset must be a (t) → { x, y } function');
    const at = (t) => { const o = offset(t); return layers.map((l, i) => { const c = l.coef ?? S.parallax.coefs[i] ?? 1; return { x: fin(c * (o.x || 0), 'parallax x'), y: fin(c * (o.y || 0), 'parallax y') }; }); };
    const fn = (t) => at(t).forEach((d, i) => { layers[i].el.style.transform = `translate(${n4(d.x)}px, ${n4(d.y)}px)`; });
    fn.at = at;
    return fn;
  };
  S.parallax.coefs = [0.35, 0.7, 1.4];

  // overhead tilt-reveal: looking down at the floor (rx 58°, z 1.2, persp 900) tilts up to frontal, power3.out over 50 f
  S.tiltReveal = (o = {}) => {
    const [t0, t1] = win(o, 50), { tilt = 58, zoom = 1.2, persp = 900 } = o, e = E('power3.out');
    return (t) => { const q = 1 - e(K.seg(t, t0, t1)); return K.cam3({ x: o.x ?? K.W_ / 2, y: o.y ?? K.H_ / 2, rx: tilt * q, z: K.lerp(1, zoom, q), persp }); };
  };
  // overhead tabletop drop: high above the table (z 0.6, rx 35°, rz -8°) drops onto it and levels, expo.out over 40 f
  S.tabletopDrop = (o = {}) => {
    const [t0, t1] = win(o, 40), { from = 0.6, tilt = 35, roll = -8, persp = 1000 } = o, e = E('expo.out');
    return (t) => { const q = 1 - e(K.seg(t, t0, t1)); return K.cam3({ x: o.x ?? K.W_ / 2, y: o.y ?? K.H_ / 2, z: K.lerp(1, from, q), rx: tilt * q, rz: roll * q, persp }); };
  };
  // drone dive to landing: high and banked (z 0.45, rx 50°, rz 12°, focal point 0.25 H below) dives in on bezier(.5,0,.2,1) over 70 f
  S.droneDive = (o = {}) => {
    const [t0, t1] = win(o, 70), { from = 0.45, tilt = 50, bank = 12, drop = 0.25, persp = 1000 } = o, e = K.bezier(0.5, 0, 0.2, 1);
    const x = o.x ?? K.W_ / 2, y = o.y ?? K.H_ / 2;
    return (t) => { const q = 1 - e(K.seg(t, t0, t1)); return K.cam3({ x, y: y + drop * K.H_ * q, z: K.lerp(1, from, q), rx: tilt * q, rz: bank * q, persp }); };
  };
  // graze-face tour: a low camera (rx 68°, z 1.4, persp 700) skims along a face from `from` to `to` (fractions of W), sine.inOut over 90 f
  S.graze = (o = {}) => {
    const [t0, t1] = win(o, 90), { from = 0.2, to = 0.8, tilt = 68, zoom = 1.4, persp = 700 } = o, e = E('sine.inOut');
    return (t) => K.cam3({ x: K.W_ * K.lerp(from, to, e(K.seg(t, t0, t1))), y: o.y ?? K.H_ / 2, rx: tilt, z: zoom, persp });
  };
  // steep-tilt glide: the page turned rotateY -60° (persp 1400, z 0.9) glides 0.3 W → -0.3 W on bezier(.3,.12,.72,.9) over 60 f.
  // ghosts: n → fn.ghosts(t) = [{ state, opacity }] trailing copies, each f(3) later than the last, opacity halving
  S.steepTilt = (o = {}) => {
    const [t0, t1] = win(o, 60), { ry = -60, from = 0.3, to = -0.3, zoom = 0.9, persp = 1400, ghosts = 0 } = o, e = K.bezier(0.3, 0.12, 0.72, 0.9);
    const fn = (t) => K.cam3({ x: K.W_ / 2 - K.W_ * K.lerp(from, to, e(K.seg(t, t0, t1))), y: o.y ?? K.H_ / 2, ry, z: zoom, persp });
    fn.ghosts = (t) => Array.from({ length: ghosts }, (_, k) => ({ state: fn(t - (k + 1) * f(3)), opacity: n4(0.5 ** (k + 1)) }));
    return fn;
  };

  // exploded view: o.el is the stack (made preserve-3d), layers [el, ...] bottom → top; over 45 f (power3.inOut) the layers separate
  // along z to `gap` px apart (60 × u) while the stack turns to an axonometric view (rx 55°, rz -30°, z 0.9; persp 1000)
  S.explode = (layers, o = {}) => {
    if (!o.el) throw new Error('explode: o.el (the stack element) is required');
    const [t0, t1] = win(o, 45), { gap = 60 * K.u, rx = 55, rz = -30, zoom = 0.9, persp = 1000 } = o, e = E('power3.inOut'), n = layers.length;
    const at = (t) => { const p = e(K.seg(t, t0, t1)); return { rx: n4(rx * p), rz: n4(rz * p), z: n4(K.lerp(1, zoom, p)), dz: layers.map((_, i) => n4((i - (n - 1) / 2) * gap * p)) }; };
    const fn = (t) => {
      const s = at(t);
      K.css(o.el, { transformStyle: 'preserve-3d', transformOrigin: '50% 50%', transform: `perspective(${persp}px) rotateX(${s.rx}deg) rotateZ(${s.rz}deg) scale(${s.z})` });
      layers.forEach((el, i) => { el.style.transform = `translateZ(${s.dz[i]}px)`; });
    };
    fn.at = at;
    return fn;
  };

  // bullet-time freeze orbit, two clocks: world(t) slows to half over `ramp` (f(8)) before t0, freezes t0..t1, ramps back after t1,
  // then runs at normal speed (lagging); cam(t) orbits ry -25° → 25° (sine.inOut, z 1.15, persp 1000) across t0..t1 at normal speed.
  // Feed world(t) to the film's own animation instead of t.
  S.bulletTime = (o = {}) => {
    const [t0, t1] = win(o, 60), { ramp = f(8), orbit = 25, zoom = 1.15, persp = 1000 } = o, e = E('sine.inOut');
    if (!(ramp > 0)) throw new Error('bulletTime: ramp must be > 0 s');
    const a = t0 - ramp, w0 = t0 - ramp / 2, pts = [[a, a], [t0, w0], [t1, w0], [t1 + ramp, w0 + ramp / 2]], lag = t1 + ramp - (w0 + ramp / 2);
    return {
      world: (t) => (t <= a ? t : t >= t1 + ramp ? t - lag : K.remap(t, pts)),
      cam: (t) => K.cam3({ x: o.x ?? K.W_ / 2, y: o.y ?? K.H_ / 2, ry: K.lerp(-orbit, orbit, e(K.seg(t, t0, t1))), z: zoom, persp }),
    };
  };

  // rack focus relay: near sharp / far blurred (6 px) → near blurred / far sharp, sine.inOut over 20 f; writes filter on both elements
  S.rackFocus = (near, far, o = {}) => {
    const [t0, t1] = win(o, 20), { blur = 6 } = o, e = E('sine.inOut');
    const at = (t) => { const p = e(K.seg(t, t0, t1)); return { near: n4(blur * p), far: n4(blur * (1 - p)) }; };
    const b = (v) => (v > 0.01 ? `blur(${v}px)` : 'none');
    const fn = (t) => { const s = at(t); near.style.filter = b(s.near); far.style.filter = b(s.far); };
    fn.at = at;
    return fn;
  };

  // depth-of-field band on a tilted page (video-shotcraft PageCam dof): CSS props for an overlay above the page that blurs
  // everything (backdrop-filter) except a sharp band around `center` (0..1 along `angle`, 180° = top → bottom), `width` wide,
  // fading over `soft`; blur in px like the blur caps. Pure in its arguments: animate center from t in render(t). Not a state fn.
  S.dof = (o = {}) => {
    const { center = 0.5, width = 0.2, soft = 0.15, blur = 4, angle = 180 } = o;
    for (const [k, v] of Object.entries({ center, width, soft, blur, angle })) fin(v, `dof: ${k}`);
    const pc = (v) => `${n4(100 * v)}%`, a = center - width / 2, b = center + width / 2;
    const mask = `linear-gradient(${angle}deg, #000 ${pc(a - soft)}, transparent ${pc(a)}, transparent ${pc(b)}, #000 ${pc(b + soft)})`;
    return { backdropFilter: `blur(${n4(blur)}px)`, webkitBackdropFilter: `blur(${n4(blur)}px)`, maskImage: mask, webkitMaskImage: mask };
  };

  const add = ['tour', 'planes', 'parallax', 'tiltReveal', 'tabletopDrop', 'droneDive', 'graze', 'steepTilt', 'explode', 'bulletTime', 'rackFocus', 'dof'];
  if (Array.isArray(S.names)) for (const n of add) if (!S.names.includes(n)) S.names.push(n);
})();
