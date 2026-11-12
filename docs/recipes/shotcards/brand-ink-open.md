# Brand ink open

Gooey ink bleeds out behind a pen-drawn brand mark: a core circle grows, smaller blobs travel outward and merge through an SVG goo filter.

Card: video-shotcraft `brand-ink-open` (1 shot), parity row `doodle-shots-motion:2.42`. Helper: `KIT.shotcards.inkBloom` in `tools/shotcards/opening.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs opening`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const ink = KIT.shotcards.inkBloom({ x: KIT.W_ / 2, y: KIT.H_ / 2, r: 0.2 * KIT.H_, color: 'var(--kit-accent)',
  t0: V('brand').start, t1: V('brand').start + KIT.dur(1.1), seed: 2, blobs: 12 });
// the mark: draw it on top with tools/doodle2.js (D.letters / D.stroke / D.drawSVG), timed from the same V('brand')
function render(t) { ink.set(t); /* + the doodle mark's set(t) */ }
```

## Numbers (ours; the source card gives none)

- Goo = Gaussian blur (6 % of r) then alpha contrast (22x - 10) on one group: deterministic in both renderers.
- Blobs start 10 - 60 % into the window and ease out (power3.out); the core reaches 0.62 r by 60 %.

## Common mistakes

- Putting the mark inside the goo group: it would melt. Draw it above.
- Using it for more than about 14 blobs: it turns into a cloud; raise `r` instead.

[Back to the shotcards index](README.md)
