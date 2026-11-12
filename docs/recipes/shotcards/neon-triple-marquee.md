# Neon triple marquee

Three rows of neon text on a tilted plane run in alternating directions at different speeds, seamless because the offset wraps by one repeat.

Card: video-shotcraft `neon-triple-marquee` (1 shot), parity row `doodle-shots-motion:2.55`. Helper: `KIT.shotcards.neonMarquee` in `tools/shotcards/outro.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs outro`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const neon = KIT.shotcards.neonMarquee({ rows: ['LAUNCH', 'FILMS', 'FROM CODE'], t0: V('end').start, t1: V('end').end, speeds: [140, -190, 110],
  colors: ['#ff2d95', '#22e6ff', '#b6ff3b'], size: 0.11 * KIT.H_, pitch: 0.2 * KIT.H_, rx: 38, rz: -7 });
function render(t) { neon.set(t); }
```

## Numbers (ours; the source card gives none)

- Offset = ((speed x K.u x (t - t0)) mod period + period) mod period - period, a function of t, so a seek anywhere gives the same frame. Period = one repeat's width + gap, measured at the first `set`.
- Neon = four stacked text-shadows of the row colour; the glow stutters (seeded) for the first 0.5 s; the block fades in and out over 0.4 s.

## Common mistakes

- `reps` too small for a long gap or a small font: the row runs out before the frame edge; raise it (default 16).
- A CSS `@keyframes` marquee: not seekable.

[Back to the shotcards index](README.md)
