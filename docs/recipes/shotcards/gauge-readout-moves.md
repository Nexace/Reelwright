# Gauge readouts: needle self-test and tape scroll

An instrument dial whose needle self-tests (full scale, back to zero) before springing to the value, and a ruler tape that slides under a fixed pointer.

Source: video-shotcraft card `gauge-readout-moves` (shots: needle-sweep-selftest, tape-scroll-fixed-pointer). Helper: `KIT.shotcards` in `tools/shotcards/data.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs data` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A single metric that should feel measured, not typed (`needleSweepSelftest`).
- A value that runs a long way and has to be read as it passes (`tapeScrollFixedPointer`).

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `data.js` first, see the index):

```js
const dial = KIT.shotcards.needleSweepSelftest({ min: 0, max: 100, value: 72, unit: '%', at: snap(W('g', 'seventy')) });
const tape = KIT.shotcards.tapeScrollFixedPointer({ from: 0, to: 240, step: 20, unit: ' km/h', at: snap(W('g', 'speed')) });   // Illustrative data
function render(t) { dial.set(t); tape.set(t); }
```

## Timing and easing

- The dial: 0.7 s up, a short hold, 0.7 s down, then a spring to `value` that overshoots once. `dial.value(t)` is the number the needle shows.
- The tape: the value decelerates (`power4.out`) so the last digits are readable; `pitch` is px per labelled tick (at most 400 ticks).

## Common mistakes

- A `value` very close to `max`: the spring overshoot swings the needle past the end of the dial.
- Using the tape for a range of thousands of ticks: raise `step`.

[Back to the shotcard index](b-index.md)
