# Before / after slider scrub

Two layers and a persistent divider with a knob: it scrubs, and rests at the split so the film can sit on it.

Source: video-shotcraft card `before-after-slider-scrub` (shots: before-after-slider-scrub). Helper: `KIT.shotcards` in `tools/shotcards/data.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs data` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Comparing two states of the same picture (a retouch, a redesign, a render).
- When the divider has to stay on screen, unlike a one-off `KIT.transition('wipe')`.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `data.js` first, see the index):

```js
const cmp = KIT.shotcards.beforeAfterSlider({ before: beforeImgEl /* or an HTML string, or { color, label } */, after: afterImgEl,
  keys: [[t0, 0.5], [t0 + 0.5, 0.5], [t0 + 1.2, 0.1], [t0 + 2.2, 0.9], [t0 + 3, 0.5]] });   // [time, position 0..1]
function render(t) { cmp.set(t); }
```

## Timing and easing

- `keys` are absolute times from `W()` / `snap()`; each leg is an inOut ease, and after the last key the divider rests there. Without `keys` it rests at 50 %, flicks left, then right, then settles at 50 %.
- `cmp.pos(t)` gives the divider position (0..1) if a caption has to change as it passes.

## Common mistakes

- Passing an image element that is already in the DOM elsewhere: it is moved into the layer.
- Leaving the divider at 0 or 1 at the end: half the picture disappears. Rest it near the middle.

[Back to the shotcard index](b-index.md)
