# Letterform zoom

The camera dives into a big glyph: its counter (the hole in an O) grows until it holds the next scene.

Card: video-shotcraft `transition-travel` (1 shot), parity row `doodle-shots-motion:2.79`. Helper: `KIT.shotcards.letterformZoom` in `tools/shotcards/transition.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs transition`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const dive = KIT.transition(KIT.shotcards.letterformZoom({ r: 0.09 * KIT.H_ }),   // r = the counter's radius at scale 1
  { from: titleLayer, to: nextLayer, at: V('next').start, dur: KIT.dur(1.1), x: counterX, y: counterY });
function render(t) { dive.set(t); }   // (x, y) = the centre of the glyph's counter in stage px
```

## Numbers (ours; the source card gives none)

- `from` scales exponentially about (x, y) up to hypot(W, H) / r x 1.05 (a constant-rate zoom feels even); `to` shows through a circle of the counter's size that grows with it, coming up from 0.6 to 1. Scale is done with translate pairs, so no transform-origin is left behind.
- `KIT.shotcards.types.letterformZoom` is the same with r = 0.09 H.

## Common mistakes

- A glyph with no counter (an L): aim at the middle of a stroke and let `r` be the stroke's half-height.
- Wrong (x, y): the circle opens beside the glyph; measure the counter from the real layout.

[Back to the shotcards index](README.md)
