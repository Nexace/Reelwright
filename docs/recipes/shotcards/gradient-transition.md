# Gradient wipe

A feathered gradient-edge wipe with an optional coloured glow riding the edge.

Card: video-shotcraft `gradient-transition` (1 shot), parity row `doodle-shots-motion:2.71`. Helper: `KIT.shotcards.types.gradientWipe / gradientWipe(opts)` in `tools/shotcards/dissolve.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs dissolve`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const wipe = KIT.shotcards.transition('gradientWipe', { from: a, to: b, at: V('b').start, dur: KIT.dur(0.8), dir: 'left', color: '#ffe14d' });
// other feather or glow: KIT.transition(KIT.shotcards.gradientWipe({ feather: 0.5, glow: '#7af' }), { from: a, to: b, at, dur })
function render(t) { wipe.set(t); }
```

## Numbers (ours; the source card gives none)

- A `linear-gradient` mask on `to` (#000 up to the edge, then transparent over `feather` of the length, default 0.3); it starts fully transparent and ends fully opaque with no jump. The glow is a screen-blended gradient on the overlay, strongest mid-transition.

## Common mistakes

- `feather: 0`: a hard wipe (`KIT.transition('wipe')`); the factory refuses it.
- A glow colour on a light scene: screen blend vanishes on white; use a darker colour or `mix-blend-mode` on your own overlay.

[Back to the shotcards index](README.md)
