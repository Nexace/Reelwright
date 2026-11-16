# Fracture

The opening card shatters into seeded triangles that drift apart from the impact point, revealing the next scene.

Card: video-shotcraft `fracture` (1 shot), parity row `doodle-shots-motion:2.45`. Helper: `KIT.shotcards.fracture` in `tools/shotcards/opening.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs opening`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const fr = KIT.shotcards.fracture({ source: titleCard, to: nextScene, at: V('open').end, dur: KIT.dur(0.9), seed: 5, cols: 6, rows: 4, x: KIT.W_ / 2, y: KIT.H_ / 2 });
function render(t) { fr.set(t); }   // titleCard and nextScene are frame-sized layers; keep them in one wrapper you show and hide
```

## Numbers (ours; the source card gives none)

- 6 x 4 cells, each split into two triangles by the seed; shards are clones of `source` taken at creation (so it must be at rest), each `clip-path: polygon`, travelling 0.12 - 0.62 W with up to 25 degrees of spin, ripple-delayed by their distance from the impact, fading out in the last 45 %.
- The helper owns `source`, `to` and shard visibility and z-index (to 1, source 2, shards 3).

## Common mistakes

- An animated `source`: the clones are snapshots. Shatter a still title card, or hold the animation first.
- Creating the helper before the card is laid out: clone after fonts and layout are in place.

[Back to the shotcards index](README.md)
