# Light play: spotlight and sheen sweeps

A soft spotlight that moves across a darkened frame, and a diagonal band of light that crosses a card.

Source: video-shotcraft card `light-play-moves` (shots: spotlight-sweep, sheen-sweep). Helper: `KIT.shotcards` in `tools/shotcards/effects.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs effects` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Guiding the eye across a wide screenshot (`spotlightSweep`).
- A premium glint on a card or a logo (`sheenSweep`).

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `effects.js` first, see the index):

```js
const spot = KIT.shotcards.spotlightSweep({ path: [[0.1, 0.5], [0.5, 0.4], [0.9, 0.55]], at: snap(W('l', 'look')), dur: KIT.dur(2) });
const sheen = KIT.shotcards.sheenSweep({ rect: { x: 400, y: 300, w: 900, h: 420 }, at: snap(W('l', 'shine')), every: 0.8, times: 2 });
function render(t) { spot.set(t); sheen.set(t); }
```

## Timing and easing

- `path` points are fractions of the area, eased inOut between points; the dark overlay fades in and out around the sweep.
- `sheenSweep` runs `times` passes `every` seconds apart, 0.9 s each, clipped to `rect` with the theme radius.

## Common mistakes

- Putting the spotlight under the content: it is an overlay, so add it after the scene.
- `dim` above 0.9: the rest of the frame disappears.

[Back to the shotcard index](b-index.md)
