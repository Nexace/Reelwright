# Value stagger with gradient ramp

Tiles whose values count up in turn, each tile's colour read from a ramp at its current value.

Source: video-shotcraft card `value-stagger-gradient` (shots: value-stagger-gradient). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Several scores or percentages side by side.
- Red to green meaning without a legend.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const vals = KIT.shotcards.valueStaggerGradient({ values: [{ label: 'Speed', value: 35 }, { label: 'Quality', value: 72 }, { label: 'Reach', value: 94 }], suffix: '%', ramp: [[8, 85, 62], [45, 90, 58], [150, 70, 52]], at: snap(W('v', 'scores')) });   // Illustrative data
function render(t) { vals.set(t); }
```

## Timing and easing

- Tile i counts from `at + i·stagger` (0.25 s) for `dur` (1.2 s, `outExpo`); the bar height and colour follow `value / max` live, so the colour climbs with the number.
- `ramp` is HSL stops `[h, s, l]`, interpolated linearly.

## Common mistakes

- Made-up values without the "Illustrative data" label.
- A `max` smaller than a value: the bar passes the tile top.

[Back to the shotcard index](b-index.md)
