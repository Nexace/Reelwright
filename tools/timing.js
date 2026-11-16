// timing.js: timing and animation maths the Remotion way, as pure functions (no React, no clock). Load after engine.js.
//
// KIT.interpolate(t, input, output, { left = 'extend', right = 'extend', easing }) → number
//   Remotion's interpolate(): n keyframes (input strictly ascending, output the same length), one easing for all segments or an array of n-1.
//   left / right = what happens outside the input range: 'extend' (the first / last segment carries on, linearly in its progress; a custom
//   easing FUNCTION is called with the raw progress, as in Remotion; a KIT.easing NAME clamps inside the segment and continues linearly),
//   'clamp' (the end value), 'identity' (t itself) or 'wrap' (t folded back into the range, then interpolated; both sides use it).
// KIT.color: colours without a clock.
//   KIT.color.parse(c) → [r, g, b, a] (any CSS colour the browser reads)    KIT.color.toCss([r, g, b, a]) → 'rgba(r, g, b, a)'
//   KIT.color.mix(a, b, p, { space = 'rgb' | 'hsl' | 'oklab' }) → css     hsl takes the short way round the hue wheel; oklab mixes in linear light
//   KIT.color.interpolate(t, input, colors, { space, easing, left, right }) → css   Remotion's interpolateColors()
// KIT.random(seed) → [0, 1): Remotion's random(): mulberry32 over a string hash (a number seed is used as is, ×1e10); same seed, same number, any order.
//   KIT.random.hash(str)  KIT.random.mulberry32(int) are the two halves. Use it instead of Math.random in a film: the render must not drift.
// KIT.seq({ from = 0, dur = Infinity, trim = 0, rate = 1, loop, freeze }) → s, with s(t) → the LOCAL time inside the slot, or null outside it.
//   Remotion's <Sequence from trimBefore durationInFrames playbackRate loop freeze> / <Loop> / <Freeze>, all in seconds. dur is the slot's length on the
//   film clock; local = trim + (t - from) · rate. loop: true | { every, times = Infinity }: local time wraps every `every` seconds of content
//   (default: the slot's own length · rate). freeze: a local time held for the whole slot. s.info(t) → { active, local, iteration, progress };
//   s.end = from + dur (finite after loop.times); s.at = s.
// KIT.timing.linear({ dur }), KIT.timing.spring({ stiffness, damping, mass, dur?, threshold }), KIT.timing.custom(fn, { dur })
//   → { dur, at(p) }: Remotion's linearTiming / springTiming / custom. dur of a spring = its settle time (KIT.springDur) unless `dur` stretches it;
//   at(p) is the progress 0..1 (the spring's value, which reaches 1 at p = 1 within `threshold`, default 0.005).
// KIT.tseries([{ seq: { dur, offset = 0 } }, { transition: { dur | timing }, }, { seq: … }, { overlay: { dur } }, …])
//   → { scenes: [{ start, end, dur, seq }], transitions: [{ start, end, dur, timing, from, to, progress(t) }], overlays: [{ start, end, cut }], total }
//   Remotion's <TransitionSeries>: a transition overlaps its two neighbours, so total = sum of scenes − sum of transitions (+ offsets); an overlay
//   (centred on the cut) never shortens anything; a transition longer than either neighbour is refused. Use scenes[i].seq(t) for local time and
//   transitions[i].progress(t) as the driver of KIT.transition-style effects.
// KIT.noise2 / noise3 / noise4 (seed, x, y, z, w) → [-1, 1]: simplex noise (simplex-noise 4.0.1's algorithm, seeded through Alea like @remotion/noise)
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.easing) throw new Error('timing.js: load tools/engine.js first');
  const ease = (e) => (typeof e === 'string' ? K.easing(e) : typeof e === 'function' ? e : (x) => x);

  // ── interpolate ──────────────────────────────────────────────────────────
  K.interpolate = (t, input, output, o = {}) => {
    const n = input.length;
    if (n < 2 || output.length !== n) throw new Error('interpolate: input and output need the same length, at least 2');
    for (let i = 1; i < n; i++) if (!(input[i] > input[i - 1])) throw new Error('interpolate: input must be strictly ascending');
    const L = o.left || 'extend', R = o.right || 'extend', ok = ['extend', 'clamp', 'identity', 'wrap'];
    if (!ok.includes(L) || !ok.includes(R)) throw new Error(`interpolate: left / right is ${ok.join(' | ')}`);
    const e = Array.isArray(o.easing) ? o.easing : null;
    if (e && e.length !== n - 1) throw new Error('interpolate: an easing array needs n - 1 entries');
    const span = input[n - 1] - input[0];
    if (t < input[0]) { if (L === 'clamp') return output[0]; if (L === 'identity') return t; if (L === 'wrap') t = input[0] + ((((t - input[0]) % span) + span) % span); }
    else if (t > input[n - 1]) { if (R === 'clamp') return output[n - 1]; if (R === 'identity') return t; if (R === 'wrap') t = input[0] + ((((t - input[0]) % span) + span) % span); }
    let i = 0; while (i < n - 2 && t >= input[i + 1]) i++;
    const raw = (t - input[i]) / (input[i + 1] - input[i]), f = e ? e[i] : o.easing;
    const p = raw >= 0 && raw <= 1 ? ease(f)(raw) : typeof f === 'function' ? f(raw) : raw;
    return output[i] + (output[i + 1] - output[i]) * p;
  };

  // ── colours ──────────────────────────────────────────────────────────────
  const cctx = document.createElement('canvas').getContext('2d');
  const C = (K.color = {});
  C.parse = (c) => {
    if (Array.isArray(c)) return [c[0], c[1], c[2], c[3] ?? 1];
    const read = (base) => { cctx.fillStyle = base; cctx.fillStyle = String(c); return cctx.fillStyle; };
    const s = read('#000');
    if (s !== read('#fff')) throw new Error(`color: cannot read "${c}"`);   // an unreadable colour keeps whatever was there before
    if (s[0] === '#') return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 1];
    const m = s.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] ?? 1];
  };
  const r3 = (v) => Math.round(v * 1000) / 1000;
  C.toCss = ([r, g, b, a = 1]) => `rgba(${Math.round(Math.min(255, Math.max(0, r)))}, ${Math.round(Math.min(255, Math.max(0, g)))}, ${Math.round(Math.min(255, Math.max(0, b)))}, ${r3(a)})`;
  const toHsl = ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    let h = 0; if (d) h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l];
  };
  const fromHsl = ([h, s, l]) => { h = ((h % 360) + 360) % 360; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; const k = ((h % 360) + 360) % 360 / 60 | 0; const v = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k]; return v.map((q) => (q + m) * 255); };
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const gam = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  const toLab = (c) => {   // Björn Ottosson's Oklab
    const [r, g, b] = c.map(lin), l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  };
  const fromLab = ([L, a, b]) => {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(gam);
  };
  C.mix = (a, b, p, { space = 'rgb' } = {}) => {
    const A = C.parse(a), B = C.parse(b), al = A[3] + (B[3] - A[3]) * p, lerp = (x, y) => x + (y - x) * p;
    if (space === 'rgb') return C.toCss([lerp(A[0], B[0]), lerp(A[1], B[1]), lerp(A[2], B[2]), al]);
    if (space === 'oklab') { const x = toLab(A), y = toLab(B); return C.toCss([...fromLab([lerp(x[0], y[0]), lerp(x[1], y[1]), lerp(x[2], y[2])]), al]); }
    if (space === 'hsl') {
      const x = toHsl(A), y = toHsl(B); let dh = y[0] - x[0]; if (x[1] === 0) x[0] = y[0]; else if (y[1] === 0) y[0] = x[0];   // a grey has no hue: take the other's
      dh = y[0] - x[0]; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
      return C.toCss([...fromHsl([x[0] + dh * p, lerp(x[1], y[1]), lerp(x[2], y[2])]), al]);
    }
    throw new Error('color: space is rgb | hsl | oklab');
  };
  C.interpolate = (t, input, colors, o = {}) => {
    if (colors.length !== input.length) throw new Error('interpolateColors: input and colors need the same length');
    const idx = input.map((_, i) => i), f = K.interpolate(t, input, idx, { ...o, easing: undefined, left: o.left === 'identity' ? 'clamp' : o.left, right: o.right === 'identity' ? 'clamp' : o.right });
    const i = Math.min(input.length - 2, Math.max(0, Math.floor(Math.min(f, input.length - 1 - 1e-9))));
    return C.mix(colors[i], colors[i + 1], ease(Array.isArray(o.easing) ? o.easing[i] : o.easing)(Math.min(1, Math.max(0, f - i))), o);
  };

  // ── random (Remotion random.ts) ──────────────────────────────────────────
  const mulberry32 = (a) => { let t = (a + 0x6d2b79f5) | 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return h; };
  K.random = (seed) => {
    if (typeof seed === 'string') return mulberry32(hash(seed));
    if (typeof seed === 'number' && Number.isFinite(seed)) return mulberry32(seed * 10000000000);
    throw new Error('random: seed is a string or a finite number (null would be Math.random, which a film must not use)');
  };
  K.random.hash = hash; K.random.mulberry32 = mulberry32;

  // ── seq / loop / freeze ──────────────────────────────────────────────────
  K.seq = ({ from = 0, dur = Infinity, trim = 0, rate = 1, loop, freeze } = {}) => {
    if (!(rate > 0)) throw new Error('seq: rate must be > 0');
    if (!(dur > 0)) throw new Error('seq: dur must be > 0');
    const lp = loop === true ? {} : loop && typeof loop === 'object' ? loop : null;
    const every = lp ? (lp.every ?? dur * rate) : 0;
    if (lp && !(every > 0 && Number.isFinite(every))) throw new Error('seq: a loop needs a finite `every` (or a finite dur)');
    const times = lp ? (lp.times ?? Infinity) : 1;
    const len = lp && Number.isFinite(times) ? Math.min(dur, every * times / rate) : dur;
    const info = (t) => {
      const u = t - from;
      if (u < 0 || u >= len) return { active: false, local: null, iteration: -1, progress: u < 0 ? 0 : 1 };
      let l = trim + u * rate, it = 0;
      if (lp) { const c = u * rate; it = Math.floor(c / every + 1e-9); l = trim + c - it * every; }
      if (freeze != null) l = freeze;
      return { active: true, local: l, iteration: it, progress: Number.isFinite(len) ? u / len : 0 };
    };
    const s = (t) => info(t).local;
    s.info = info; s.at = s; s.end = from + len; s.from = from;
    return s;
  };

  // ── timings ──────────────────────────────────────────────────────────────
  K.timing = {
    linear: ({ dur }) => { if (!(dur > 0)) throw new Error('timing.linear: dur > 0'); return { dur, at: (p) => K.clamp(p) }; },
    custom: (fn, { dur }) => { if (!(dur > 0)) throw new Error('timing.custom: dur > 0'); return { dur, at: (p) => fn(K.clamp(p)) }; },
    spring: ({ stiffness = 100, damping = 10, mass = 1, dur, threshold = 0.005 } = {}) => {
      const sp = K.spring({ stiffness, damping, mass }); let D = 0;   // settle: the last 1/240 s step at which the value is off by more than the threshold
      for (let i = 0; i <= 2400; i++) if (Math.abs(1 - sp(i / 240)) >= threshold) D = (i + 1) / 240;
      D = Math.min(10, D) || 1 / 240;
      return { dur: dur ?? D, native: D, at: (p) => sp(K.clamp(p) * D) };
    },
  };

  // ── TransitionSeries arithmetic ──────────────────────────────────────────
  K.tseries = (items) => {
    const scenes = [], trans = [], overlays = []; let cursor = 0, pending = null, pendingOverlay = null, prev = null;
    items.forEach((it, i) => {
      if (it.seq) {
        const d = it.seq.dur, off = it.seq.offset || 0;
        if (!(d > 0)) throw new Error(`tseries: item ${i}: a seq needs dur > 0`);
        let start = cursor + off;
        if (pending) {
          if (pending.dur > d + 1e-9 || pending.dur > scenes[scenes.length - 1].dur + 1e-9) throw new Error(`tseries: transition ${trans.length} (${pending.dur}s) is longer than a neighbouring scene`);
          start = cursor - pending.dur + off; pending.start = start; pending.end = start + pending.dur; pending.to = scenes.length;
        }
        const sc = { start, end: start + d, dur: d, seq: K.seq({ from: start, dur: d }) };
        if (pendingOverlay) { pendingOverlay.cut = start; pendingOverlay.start = start - pendingOverlay.dur / 2; pendingOverlay.end = start + pendingOverlay.dur / 2; }
        scenes.push(sc); cursor = sc.end; pending = pendingOverlay = null; prev = 'seq';
      } else if (it.transition) {
        if (prev !== 'seq') throw new Error(`tseries: item ${i}: a transition goes between two scenes`);
        const tm = it.transition.timing || K.timing.linear({ dur: it.transition.dur });
        pending = { dur: tm.dur, timing: tm, from: scenes.length - 1, to: -1, start: 0, end: 0 };
        const me = pending; me.progress = (t) => tm.at((t - me.start) / tm.dur);
        trans.push(me); prev = 'transition';
      } else if (it.overlay) {
        if (prev !== 'seq') throw new Error(`tseries: item ${i}: an overlay goes between two scenes`);
        pendingOverlay = { dur: it.overlay.dur, cut: 0, start: 0, end: 0 }; overlays.push(pendingOverlay); prev = 'overlay';
      } else throw new Error(`tseries: item ${i} is { seq } | { transition } | { overlay }`);
    });
    if (prev !== 'seq') throw new Error('tseries: it must end with a scene');
    return { scenes, transitions: trans, overlays, total: Math.max(...scenes.map((s) => s.end)) };
  };

  // ── simplex noise ────────────────────────────────────────────────────────
  const mash = () => { let n = 0xefc8249d; return (d) => { d = String(d); for (let i = 0; i < d.length; i++) { n += d.charCodeAt(i); let h = 0.02519603282416938 * n; n = h >>> 0; h -= n; h *= n; n = h >>> 0; h -= n; n += h * 0x100000000; } return (n >>> 0) * 2.3283064365386963e-10; }; };
  const alea = (seed) => {
    const m = mash(); let c = 1, s0 = m(' '), s1 = m(' '), s2 = m(' ');
    s0 -= m(seed); if (s0 < 0) s0 += 1; s1 -= m(seed); if (s1 < 0) s1 += 1; s2 -= m(seed); if (s2 < 0) s2 += 1;
    return () => { const t = 2091639 * s0 + c * 2.3283064365386963e-10; s0 = s1; s1 = s2; return (s2 = t - (c = t | 0)); };
  };
  const perms = new Map();
  const permOf = (seed) => {
    const key = String(seed); let p = perms.get(key);
    if (!p) {
      const r = alea(seed), t = new Uint8Array(512); for (let i = 0; i < 256; i++) t[i] = i;
      for (let i = 0; i < 255; i++) { const k = i + ~~(r() * (256 - i)), a = t[i]; t[i] = t[k]; t[k] = a; }
      for (let i = 256; i < 512; i++) t[i] = t[i - 256];
      perms.set(key, p = t);
    }
    return p;
  };
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6, F3 = 1 / 3, G3 = 1 / 6, F4 = (Math.sqrt(5) - 1) / 4, G4 = (5 - Math.sqrt(5)) / 20;
  const g2 = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0, 1, 0, -1];
  const g3 = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];
  const g4 = []; for (let z = 0; z < 4; z++) for (let a = 1; a >= -1; a -= 2) for (let b = 1; b >= -1; b -= 2) for (let c = 1; c >= -1; c -= 2) { const v = [a, b, c]; v.splice(z, 0, 0); g4.push(...v); }
  K.noise2 = (seed, x, y) => {
    const P = permOf(seed), s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s), t = (i + j) * G2, x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1, x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2, ii = i & 255, jj = j & 255;
    const c = (tt, gi, px, py) => { if (tt < 0) return 0; const g = (P[gi] % 12) * 2; tt *= tt; return tt * tt * (g2[g] * px + g2[g + 1] * py); };
    return 70 * (c(0.5 - x0 * x0 - y0 * y0, ii + P[jj], x0, y0) + c(0.5 - x1 * x1 - y1 * y1, ii + i1 + P[jj + j1], x1, y1) + c(0.5 - x2 * x2 - y2 * y2, ii + 1 + P[jj + 1], x2, y2));
  };
  K.noise3 = (seed, x, y, z) => {
    const P = permOf(seed), s = (x + y + z) * F3, i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s), t = (i + j + k) * G3;
    const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t); let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) { if (y0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 1, 0]; else if (x0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 0, 1]; else [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 1, 0, 1]; }
    else if (y0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 0, 1, 1]; else if (x0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 0, 1, 1]; else [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 1, 1, 0];
    const ii = i & 255, jj = j & 255, kk = k & 255;
    const c = (px, py, pz, di, dj, dk) => { let tt = 0.6 - px * px - py * py - pz * pz; if (tt < 0) return 0; const g = (P[ii + di + P[jj + dj + P[kk + dk]]] % 12) * 3; tt *= tt; return tt * tt * (g3[g] * px + g3[g + 1] * py + g3[g + 2] * pz); };
    return 32 * (c(x0, y0, z0, 0, 0, 0) + c(x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3, i1, j1, k1) + c(x0 - i2 + 2 * G3, y0 - j2 + 2 * G3, z0 - k2 + 2 * G3, i2, j2, k2) + c(x0 - 1 + 3 * G3, y0 - 1 + 3 * G3, z0 - 1 + 3 * G3, 1, 1, 1));
  };
  K.noise4 = (seed, x, y, z, w) => {
    const P = permOf(seed), s = (x + y + z + w) * F4, i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s), l = Math.floor(w + s), t = (i + j + k + l) * G4;
    const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t), w0 = w - (l - t);
    let rx = 0, ry = 0, rz = 0, rw = 0;
    if (x0 > y0) rx++; else ry++; if (x0 > z0) rx++; else rz++; if (x0 > w0) rx++; else rw++; if (y0 > z0) ry++; else rz++; if (y0 > w0) ry++; else rw++; if (z0 > w0) rz++; else rw++;
    const ii = i & 255, jj = j & 255, kk = k & 255, ll = l & 255, q = (r, m) => (r >= m ? 1 : 0);
    const c = (px, py, pz, pw, di, dj, dk, dl) => { let tt = 0.6 - px * px - py * py - pz * pz - pw * pw; if (tt < 0) return 0; const g = (P[ii + di + P[jj + dj + P[kk + dk + P[ll + dl]]]] % 32) * 4; tt *= tt; return tt * tt * (g4[g] * px + g4[g + 1] * py + g4[g + 2] * pz + g4[g + 3] * pw); };
    const a = [q(rx, 3), q(ry, 3), q(rz, 3), q(rw, 3)], b = [q(rx, 2), q(ry, 2), q(rz, 2), q(rw, 2)], d = [q(rx, 1), q(ry, 1), q(rz, 1), q(rw, 1)];
    return 27 * (c(x0, y0, z0, w0, 0, 0, 0, 0) + c(x0 - a[0] + G4, y0 - a[1] + G4, z0 - a[2] + G4, w0 - a[3] + G4, ...a) + c(x0 - b[0] + 2 * G4, y0 - b[1] + 2 * G4, z0 - b[2] + 2 * G4, w0 - b[3] + 2 * G4, ...b)
      + c(x0 - d[0] + 3 * G4, y0 - d[1] + 3 * G4, z0 - d[2] + 3 * G4, w0 - d[3] + 3 * G4, ...d) + c(x0 - 1 + 4 * G4, y0 - 1 + 4 * G4, z0 - 1 + 4 * G4, w0 - 1 + 4 * G4, 1, 1, 1, 1));
  };
})();
