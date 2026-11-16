# Scan bracket sweep

Four corner brackets close onto a subject while a scan band sweeps down through it and back, a percent readout counting.

Source: video-shotcraft card `scan-bracket-sweep` (shots: scan-bracket-sweep). Helper: `KIT.shotcards` in `tools/shotcards/effects.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs effects` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Inspecting or analysing one object on screen.
- A verification beat.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `effects.js` first, see the index):

```js
const scan = KIT.shotcards.scanBracketSweep({ rect: { x: 600, y: 200, w: 700, h: 640 }, at: snap(W('s', 'scanning')), dur: KIT.dur(1.8) });
function render(t) { scan.set(t); }
```

## Timing and easing

- The brackets close in `close` (0.6 s, `power3.out`) from 120 px out, the frame outside the box dims, then the band runs down and up over `dur`.
- The readout is `SCAN 000%` to `100%` over the sweep; it is decoration, not a measurement.

## Common mistakes

- A `rect` that is tiny (under 100 px): the corner marks overlap.
- Scanning something you also zoom with the camera: pass the rect in post-zoom pixels.

[Back to the shotcard index](b-index.md)
