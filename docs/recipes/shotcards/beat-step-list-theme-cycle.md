# Beat step list with theme cycle

A list steps one item per beat while the whole panel flips to the next theme on each beat.

Card: video-shotcraft `beat-step-list-theme-cycle` (1 shot), parity row `doodle-shots-motion:2.60`. Helper: `KIT.shotcards.stepList` in `tools/shotcards/rhythm.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs rhythm`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const beats = [0, 1, 2, 3].map((i) => KIT.snap(V('list').start) + (i + 1) * (KIT.beat(1) - KIT.beat(0)));   // or KIT.beat(k) for chosen beat numbers
const steps = KIT.shotcards.stepList({ root: panel, items: [...panel.querySelectorAll('li')], beats,
  themes: [{ bg: '#111', ink: '#fff', accent: '#ff3b6b' }, { bg: '#fff', ink: '#111', accent: '#1a6bff' }, { bg: '#ffd400', ink: '#111', accent: '#e00' }] });
function render(t) { steps.set(t); }   // steps.step(t) = how many beats have passed
```

## Numbers (ours; the source card gives none)

- Item j enters on `beats[j]` (rise 14 px x u + fade over 0.18 s, scale pulse 1.06 decaying with 0.12 s); the newest item takes the theme accent, older ones dim to 0.4.
- The theme is `themes[(step - 1) % n]`, a hard cut on the beat (a fade would blur the rhythm).

## Common mistakes

- Beat times from `Math.random` or a clock: derive them from `KIT.snap` / `KIT.beat` / `V()`.
- Fewer beats than items: the helper throws.

[Back to the shotcards index](README.md)
