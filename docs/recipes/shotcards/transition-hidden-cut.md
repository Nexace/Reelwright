# Hidden cut: invisible cut, versus slam, light-leak burn

Three ways to hide the cut. Invisible cut: a foreground band sweeps across and covers the frame, the cut happens behind it. Versus slam: two halves slam together on a diagonal seam, then the new scene takes the frame. Light-leak burn: warm leaks and an over-exposure burn.

Card: video-shotcraft `transition-hidden-cut` (3 shots), parity row `doodle-shots-motion:2.78`. Helper: `KIT.shotcards.types.invisibleCut / versusSlam / lightLeakBurn` in `tools/shotcards/transition.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs transition`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const SC = KIT.shotcards, at = V('cut').start;
const hidden = SC.transition('invisibleCut',  { from: a, to: b, at, dur: KIT.dur(0.7), dir: 'right', color: '#0b0b0f' });
const versus = SC.transition('versusSlam',    { from: a, to: b, at, dur: KIT.dur(0.9), color: '#fff' });   // color = the impact flash
const burn   = SC.transition('lightLeakBurn', { from: a, to: b, at, dur: KIT.dur(0.8), dir: 'up', seed: 3 });
```

## Numbers (ours; the source card gives none)

- Invisible cut: a band 1.6 x the frame, skewed, fully covers from p ~ .37 to .63; the cut is at .5. Versus slam: seam skew 0.12 W; slam travel p 0 - .55 (power3.in), impact flash and decaying shake .55 - .7, then the seam runs on. Burn: brightness to 2.6, saturation to 1.6, white core peaking at the cut.
- Every one calls the cut exactly once, at p = .5.

## Common mistakes

- Using `versusSlam` on scenes with important text near the seam: it crosses the middle.
- Photosensitivity: the burn and the slam flash are strong; keep them to one per film and short.

[Back to the shotcards index](README.md)
