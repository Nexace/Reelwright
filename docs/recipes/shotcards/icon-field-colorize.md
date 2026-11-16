# Icon field colorize

A grid of icons that starts gray and dimmed and goes to full colour tile by tile, centre first.

Card: video-shotcraft `icon-field-colorize` (1 shot), parity row `doodle-shots-motion:2.46`. Helper: `KIT.shotcards.iconField` in `tools/shotcards/opening.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs opening`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const field = KIT.shotcards.iconField({ items: logos.map((svg) => svg), cols: 6, x: 160, y: 120, w: 1600, h: 840,
  t0: V('logos').start, t1: V('logos').end, order: 'radial', seed: 4 });
function render(t) { field.set(t); }
```

## Numbers (ours; the source card gives none)

- Per tile: `grayscale(1 - k)`, opacity 0.55 to 1, scale 0.9 to 1 with `k` = the theme ease over `dur` (0.5 s), started `KIT.stagger(rank, n, window - dur)` apart. `order`: radial (centre out), seed (shuffled), index.
- Items are HTML strings or elements; the tile is a flex cell centred on the item.

## Common mistakes

- Icons that are already gray: grayscale does nothing visible; use coloured SVG.
- `t1 - t0` shorter than `dur`: the helper throws (no room to stagger).

[Back to the shotcards index](README.md)
