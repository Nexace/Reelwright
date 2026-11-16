# Logo shrink into wordmark lockup

The logo sits large and alone, then shrinks and slides to its place while the wordmark writes out beside it, ending as a [logo word] lockup.

Card: video-shotcraft `logo-shrink-wordmark-lockup` (1 shot), parity row `doodle-shots-motion:2.54`. Helper: `KIT.shotcards.logoLockup` in `tools/shotcards/outro.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs outro`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const lock = KIT.shotcards.logoLockup({ logo: logoEl, word: wordEl, cx: KIT.W_ / 2, cy: KIT.H_ / 2, gap: 24 * KIT.u,
  t0: V('end').start, t1: V('end').start + KIT.dur(1.4), scale0: 2.4 });
function render(t) { lock.set(t); }   // after docs/recipes/end-card.md: this replaces its logo pop
```

## Numbers (ours; the source card gives none)

- Logo: scale0 to 1 and centre to its lockup place over 70 % of the window (power3.inOut). Word: from 35 % in, `clip-path` writes it out from the left while it slides in 0.3 of its width (power3.out).
- The lockup is centred on (cx, cy) using the elements' layout sizes, measured at the first `set` (after fonts).

## Common mistakes

- Sizing logo and word with transforms: `offsetWidth` ignores them, so size with width/height or font-size.
- Leaving the wordmark visible before `t0`: the helper hides it until its clip opens.

[Back to the shotcards index](README.md)
