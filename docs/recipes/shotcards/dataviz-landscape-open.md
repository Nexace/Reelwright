# Dataviz landscape open

A field of 3D bars on a surface; the camera orients from looking straight down to a three-quarter view while the bars rise in a diagonal stagger.

Card: video-shotcraft `dataviz-landscape-open` (1 shot), parity row `doodle-shots-motion:2.44`. Helper: `KIT.shotcards.datavizLandscapeOpen` in `tools/shotcards/opening.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs opening`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const land = KIT.shotcards.datavizLandscapeOpen({ parent: scene, cols: 9, rows: 7, seed: 3, t0: V('data').start, t1: V('data').end,
  colors: ['#2b6cff', '#ff5a3c'], pitch: [90, 34], yaw: [-8, -38], zoom: [1.6, 1] });
function render(t) { land.set(t); }   // illustrative data: label it ("Illustrative data") unless the numbers are real
```

## Numbers (ours; the source card gives none)

- A hand-rolled orthographic projection into one SVG (painter's sort per frame), so no 3D library and no DOM 3D: the same pixels in both renderers.
- Bars rise over half the window each, started by the diagonal distance from the far corner (`KIT.stagger` pattern); the camera eases power2.inOut over the whole window.
- Heights are seeded (`seed`); bar height blends `colors[0]` to `colors[1]` (hex only).

## Common mistakes

- Colours as CSS names or variables: `#rrggbb` only (they are blended in JS).
- Real data: pass your own heights by editing the module's `bars`; the recipe's heights are decoration.

[Back to the shotcards index](README.md)
