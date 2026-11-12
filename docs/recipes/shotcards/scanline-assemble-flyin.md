# Scanline assemble fly-in

A glowing scanline sweeps down the frame; each item flies in from the side as the line reaches its row.

Source: video-shotcraft card `scanline-assemble-flyin` (shots: scanline-assemble-flyin). Helper: `KIT.shotcards` in `tools/shotcards/effects.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs effects` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A grid of feature tiles that should build in reading order.
- A tech or scan look where the line is the cause of the appearance.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `effects.js` first, see the index):

```js
const grid = KIT.shotcards.scanlineAssembleFlyin({ items: ['Record', 'Script', 'Voice', 'Edit', 'Render', 'Ship'], at: snap(W('f', 'everything')), dur: KIT.dur(2) });
function render(t) { grid.set(t); }
```

## Timing and easing

- An item's start is the time the scanline crosses the middle of its row (`at + dur · row position`), so a taller grid takes longer.
- Items come in with a blur that clears as they land (0.5 s, `power3.out`), alternating sides by column.

## Common mistakes

- Fewer than 4 items: the scan has nothing to reveal.
- Setting `dur` below about 1 s: the rows arrive in a blur.

[Back to the shotcard index](b-index.md)
