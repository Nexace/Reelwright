# Crane rise with row pulse

`KIT.shot.craneRise` (starts low and zoomed, rises to level) plus the missing option: each row pulses as the camera crosses it.

Card: video-shotcraft `crane-rise-reveal` (1 shot), parity row `doodle-shots-motion:2.43`. Helper: `KIT.shotcards.craneRise` in `tools/shotcards/opening.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs opening`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const rise = KIT.shotcards.craneRise({ layer: rowsLayer, rows: [...rowsLayer.querySelectorAll('.row')],
  t0: V('rise').start, t1: V('rise').end, width: 0.22, scale: 0.06 });
function render(t) { rise.set(t); }   // --kit-pulse (0..1) is set on each row for glow styling
```

## Numbers (ours; the source card gives none)

- Pulse = (1 - |camera focal y - row y| / (width x H))^2 clamped at 0; the row scales 1 to 1.06 and gets `--kit-pulse`.
- Row y is measured once, at the first call (`offsetTop + offsetHeight / 2`, so rows must be positioned in the layer), or pass `{ el, y }`.

## Common mistakes

- Rows with their own transform animation: the helper owns their `transform`.
- Calling before fonts load: the heights are measured at the first `set`; build the helper after layout.

[Back to the shotcards index](README.md)
