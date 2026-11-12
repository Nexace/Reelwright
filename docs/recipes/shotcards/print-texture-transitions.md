# Print texture transitions

Three print-look transitions: halftone-dot dissolve, torn-paper edge wipe, ink bleed (plus `KIT.transition('brush')` that already ships).

Card: video-shotcraft `print-texture-transitions` (1 shot), parity row `doodle-shots-motion:2.75`. Helper: `KIT.shotcards.types.halftone / tornEdge / inkBleed` in `tools/shotcards/dissolve.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs dissolve`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const t1 = KIT.shotcards.transition('halftone', { from: a, to: b, at, dur: KIT.dur(0.9), dir: 'left' });
const t2 = KIT.shotcards.transition('tornEdge', { from: a, to: b, at, dur: KIT.dur(0.9), dir: 'right', color: '#f3eee3', seed: 3 });   // color = the paper lip
const t3 = KIT.shotcards.transition('inkBleed', { from: a, to: b, at, dur: KIT.dur(1.1), x: 960, y: 540, seed: 7 });
```

## Numbers (ours; the source card gives none)

- Torn edge: 57 points across the frame, jitter up to 5 % of the length plus a slow wobble, a 1.2 % paper lip on the old scene (overlay polygon in `color`). Sweeps from -1.5 m to the far edge, so it starts and ends clean.
- Ink bleed: ten 28-point blots (the first at `x, y`, the rest seeded) growing with `power2.inOut`, unioned by the nonzero fill; the first blot alone is enough to cover the frame at p = 1.

## Common mistakes

- Different `seed` per transition in a film, or every wipe has the same edge.
- A paper colour close to the scene colour: the lip disappears.

[Back to the shotcards index](README.md)
