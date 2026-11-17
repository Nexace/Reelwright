// Seeded noise on KIT.noise: sample the same field by (t, id), where id is a duplicate index or a position,
// so N copies sit at different phases of one field and every frame is reproducible from its seed.
// Cavalry's Noise behaviour is the model: Seed, Octaves, Gain, Curl Amount, Stagger, index/position context.
// Loaded after engine.js and timing.js (it wraps KIT.noise2, the seeded simplex noise there).
//   KIT.noise(t, id?, opts?) → number (or [x, y] with curl)
//     id      a duplicate index (0, 1, 2 …) or a position [x, y] / {x, y}
//     seed    integer or string; the same seed is the same field in every render (default 0)
//     freq    field units per second (and per id/position unit), default 1
//     octaves fractal layers (default 3), gain each layer's amplitude (default 0.5)
//     amp     the result's bound: scalar in [-amp, amp], curl components in [-amp, amp] (default 1)
//     curl    true (or a positive amount) → the curl of the scalar field: a divergence-free 2D vector
//     stagger phase step between duplicate indices (default 1; 0 = every duplicate identical)
//     timeScale  how fast t moves through the field (default 1)
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.noise2) throw new Error('noise.js: load tools/engine.js and tools/timing.js first');
  const num = (v, what, lo, hi) => {
    if (!Number.isFinite(v) || v < lo || (hi != null && v > hi)) throw new Error(`KIT.noise: ${what} must be a number in [${lo}, ${hi ?? '∞'}] (got ${v})`);
    return v;
  };

  const fbm = (seed, x, y, octaves, gain) => {   // normalised so every octave sum stays in [-1, 1]
    let v = 0, a = 1, f = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
      v += a * K.noise2(o ? `${seed}#${o}` : seed, x * f, y * f);
      norm += a; a *= gain; f *= 2;
    }
    return v / norm;
  };

  K.noise = (t, id = 0, opts = {}) => {
    const { seed = 0, freq = 1, octaves = 3, gain = 0.5, amp = 1, curl = false, stagger = 1, timeScale = 1 } = opts;
    num(t, 't'); num(freq, 'freq', 0); num(gain, 'gain', 0, 1); num(amp, 'amp', 0); num(stagger, 'stagger', 0); num(timeScale, 'timeScale');
    if (!Number.isInteger(octaves) || octaves < 1 || octaves > 8) throw new Error(`KIT.noise: octaves must be an integer in [1, 8] (got ${octaves})`);
    const isIndex = typeof id === 'number';
    if (!isIndex && !Array.isArray(id) && !(id && typeof id === 'object')) throw new Error(`KIT.noise: id must be a duplicate index or a position [x, y] (got ${id})`);
    const pos = Array.isArray(id) ? id : id && typeof id === 'object' ? [id.x ?? 0, id.y ?? 0] : [id, 0];
    if (!Number.isFinite(pos[0]) || !Number.isFinite(pos[1] ?? 0)) throw new Error(`KIT.noise: id position must be finite (got ${JSON.stringify(id)})`);
    const x = (isIndex ? pos[0] * stagger : pos[0]) * freq, y = (pos[1] || 0) * freq, tt = t * timeScale * freq;
    const field = (fx, fy) => fbm(seed, fx, fy, octaves, gain);
    if (!curl) return amp * field(x, y + tt);
    const h = 0.25, amount = typeof curl === 'number' ? Math.abs(curl) : 1;   // curl of the scalar field: (∂ψ/∂y, −∂ψ/∂x)
    const dx = (field(x + h, y + tt) - field(x - h, y + tt)) / (2 * h), dy = (field(x, y + tt + h) - field(x, y + tt - h)) / (2 * h);
    const k = 0.25 * amount;   // a fixed scale keeps the vector field's divergence at zero; the clamp is only a bound
    const bound = (v) => amp * Math.max(-1, Math.min(1, v * k));
    return [bound(dy), bound(-dx)];
  };
})();
