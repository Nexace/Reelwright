# Grain and halftone dissolves

Two outro dissolves as `KIT.transition` types: a literal film-grain dissolve (a field of seeded squares, each growing in at its own moment) and a halftone-dot dissolve (a dot grid whose dots swell and merge).

Card: video-shotcraft `grain-dissolve` (1 shot), parity row `doodle-shots-motion:2.53`. Helper: `KIT.shotcards.types.grain / types.halftone` in `tools/shotcards/dissolve.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs dissolve`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const grain = KIT.shotcards.transition('grain',    { from: last, to: endCard, at: V('outro').start, dur: KIT.dur(0.9), seed: 3 });
const dots  = KIT.shotcards.transition('halftone', { from: last, to: endCard, at: V('outro').start, dur: KIT.dur(0.9), dir: 'left' });
function render(t) { grain.set(t); /* or dots.set(t) */ }
```

## Numbers (ours; the source card gives none)

- Both are `clip-path: path()` shapes built from seeded numbers: no feTurbulence, no image decode, so the same pixels everywhere. Grain: 64 cells across, each on a seeded delay in the first 75 % and growing over 25 %. Halftone: 36 dots across, `dir` sets the sweep, dots reach radius 0.75 cell (full coverage at p = 1).
- The other types of this module (`tornEdge`, `inkBleed`, `gradientWipe`, `tearStreak`) are listed in [print-texture-transitions](print-texture-transitions.md).

## Common mistakes

- Loading `shotcards/dissolve.js` before `transitions.js`: it throws (`KIT.transition` is missing).
- A `to` layer with its own clip-path: the transition owns it.

[Back to the shotcards index](README.md)
