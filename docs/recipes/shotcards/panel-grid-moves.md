# Comic panel split

A multi-panel split with gutters: panels wipe in one by one, each from a different side, like comic panels. (`KIT.transition('barnDoor')` and `KIT.layout.split` cover the other grid moves.)

Card: video-shotcraft `panel-grid-moves` (1 shot), parity row `doodle-shots-motion:2.61`. Helper: `KIT.shotcards.comicPanels` in `tools/shotcards/rhythm.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs rhythm`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const comic = KIT.shotcards.comicPanels({ layout: [[1, 1], [2, 1, 1]], gutter: 14 * KIT.u, margin: 24 * KIT.u,
  t0: V('grid').start, t1: V('grid').end, order: [0, 1, 3, 2, 4] });
// content: comic.panels[i].el (overflow hidden), comic.panels[i] = { x, y, w, h }
function render(t) { comic.set(t); }
```

## Numbers (ours; the source card gives none)

- `layout` = rows of column weights; rows are equal height; the stage shows through the gutters. Each panel wipes in over `dur` (0.35 s, power3.out) from left, top, right or bottom in turn, with a 1.05 to 1 scale.
- `order` lists the panels in reveal order (default reading order); an `order` that skips or repeats a panel throws before anything is built.

## Common mistakes

- Content wider than its panel: panels clip (`overflow: hidden`); fit the media with `object-fit: cover`.
- A panel border from the theme: the default is a 3 px x K.u ink border; override on `panels[i].el`.

[Back to the shotcards index](README.md)
