// direct.js: the film-level motion budget and the cheap "a human animated this" signals. Load after engine.js and velocity.js
// (KIT.lagged). Everything is a pure function of its arguments — no clock, no DOM, no accumulator — so it is safe in render(t)
// in both renderers.
//
// KIT.direct(cues, { order = [], stagger = 0.02, total = 0.5, maxConcurrent = 2 }) → { [id]: delay }
//   cues: [{ id, role }] (or bare id strings). Roles sort by `order` (['shell','body','primary','viz']); a role not in `order`
//   goes last, and cues with the same role keep the order they were given. The cues are dealt into waves of `maxConcurrent`,
//   so no more than that many begin together, and the waves are `stagger` apart; the step shrinks so the last wave starts at
//   `total` at the latest. Numbers from Carbon's choreography guidance: a 20 ms stagger measurably lowers cognitive load, and a
//   whole entrance inside 500 ms still reads as one move.
//     KIT.direct([{ id: 'shell', role: 'shell' }, { id: 'body', role: 'body' }, { id: 'kpi', role: 'primary' },
//                 { id: 'chart', role: 'viz' }], { order: ['shell', 'body', 'primary', 'viz'] })
//     → { shell: 0, body: 0, kpi: 0.02, chart: 0.02 }
//   Feed a delay to a driver: KIT.seg(t - delay, 0, dur), KIT.spring({ … })(t - delay), or KIT.seq({ from: delay }).
// KIT.direct.hierarchy(hero, followers, { ratio = 0.35, lag = 1/60 }) → { [id]: (t) => value }
//   The secondary layer (motion-rules 3.8): support elements move `ratio` of the hero's travel — keep it in 0.25..0.4 — in the
//   same direction and on the same curve, about `lag` behind (one frame at 60 fps). The follower is KIT.lagged's closed-form
//   exponential average of the hero, scaled; the same shape comes back (number, array or { key: number }).
//   `hero` is a DISPLACEMENT driver (0 at rest), not an absolute position: add the follower's own base where it is drawn. It is
//   sampled up to ~4.6·lag in the past, so it must answer for t < 0 (drivers built from KIT.seg / KIT.clamp / KIT.spring do).
//   A follower may be { id, ratio, lag } to give it its own ratio (a stack of parts) or lag (a cascade a frame deeper).
// KIT.anticipate(t, t0, { dur = 0.08, amount = 0.06 }) → -amount..0 (normalized −1..1: pass amount = 1 for the bare shape)
//   A counter-move over [t0 − dur, t0] that is back at 0 at t0, −amount·sin²(πu): negative before the move, C¹ at both ends
//   (its slope is 0 where it starts and where it rejoins), so it multiplies into an eased value without a kink:
//   `p * (1 + KIT.anticipate(t, t0))`. Anticipation (Disney's principle 2) for six lines of arithmetic.
// KIT.step(fps = 12) → t => Math.floor(t·fps + 1e-6)/fps    Stepped time, "on twos" at 12 fps, "on threes" at 8: a pure warp.
// KIT.hold(t, t0, t1) → clamp(t, t0, t1)                   A window the driver holds still outside of: at t0 before it opens,
//   at t1 after it closes.
//   Use KIT.step / KIT.hold on a DRIVER (a value you then ease, a scale, a stagger input), never on a camera move or any
//   continuous move: a camera that jumps 12 times a second reads as a stutter, not as stop-motion.
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.clamp) throw new Error('direct.js: load tools/engine.js first');
  if (!K.lagged) throw new Error('direct.js: load tools/velocity.js first');

  const scale = (v, k) => (typeof v === 'number' ? v * k : Array.isArray(v) ? v.map((x) => x * k) : Object.fromEntries(Object.entries(v).map(([n, x]) => [n, x * k])));

  K.direct = (cues, { order = [], stagger = 0.02, total = 0.5, maxConcurrent = 2 } = {}) => {
    if (!Array.isArray(cues)) throw new Error('direct: cues is an array of { id, role } or id strings');
    if (!(stagger > 0)) throw new Error(`direct: stagger must be > 0 (got ${stagger})`);
    if (!(total > 0)) throw new Error(`direct: total must be > 0 (got ${total})`);
    if (!(maxConcurrent >= 1)) throw new Error(`direct: maxConcurrent must be >= 1 (got ${maxConcurrent})`);
    const rank = (role) => { const i = order.indexOf(role); return i < 0 ? order.length : i; };
    const sorted = cues.map((c, i) => ({ id: typeof c === 'string' ? c : c.id, role: (typeof c === 'object' && c.role) || '', i }))
      .sort((a, b) => rank(a.role) - rank(b.role) || a.i - b.i);
    const cap = Math.floor(maxConcurrent), waves = Math.ceil(sorted.length / cap);
    const step = waves > 1 ? Math.min(stagger, total / (waves - 1)) : 0;
    const out = {};
    sorted.forEach((c, i) => {
      if (!c.id) throw new Error(`direct: cue ${i} has no id`);
      if (c.id in out) throw new Error(`direct: two cues are called "${c.id}"`);
      out[c.id] = Math.floor(i / cap) * step;
    });
    return out;
  };

  K.direct.hierarchy = (hero, followers, { ratio = 0.35, lag = 1 / 60 } = {}) => {
    if (typeof hero !== 'function') throw new Error('direct.hierarchy: hero is a function of t (a displacement, 0 at rest)');
    if (!Array.isArray(followers)) throw new Error('direct.hierarchy: followers is an array of ids or { id, ratio, lag }');
    if (!(lag > 0)) throw new Error(`direct.hierarchy: lag must be > 0 (got ${lag})`);
    const out = {};
    for (const f of followers) {
      const id = typeof f === 'string' ? f : f && f.id, r = (f && f.ratio) ?? ratio, l = (f && f.lag) ?? lag;
      if (!id) throw new Error('direct.hierarchy: every follower needs an id');
      if (!(l > 0)) throw new Error(`direct.hierarchy: follower "${id}" needs lag > 0 (got ${l})`);
      out[id] = (t) => scale(K.lagged(hero, t, l), r);
    }
    return out;
  };

  K.anticipate = (t, t0, { dur = 0.08, amount = 0.06 } = {}) => {
    if (!(dur > 0)) throw new Error(`anticipate: dur must be > 0 (got ${dur})`);
    if (t <= t0 - dur || t >= t0) return 0;   // exact 0 at both ends, so the seam has no kink
    const s = Math.sin(Math.PI * (t - (t0 - dur)) / dur);
    return -amount * s * s;
  };

  K.step = (fps = 12) => { if (!(fps > 0)) throw new Error(`step: fps must be > 0 (got ${fps})`); return (t) => Math.floor(t * fps + 1e-6) / fps; };

  K.hold = (t, t0, t1) => { if (t1 < t0) throw new Error(`hold: t1 (${t1}) is before t0 (${t0})`); return Math.min(t1, Math.max(t0, t)); };
})();
