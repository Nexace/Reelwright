# Aurora bloom background flip

A drifting aurora background; a white bloom peaks and the palette flips underneath it.

Source: video-shotcraft card `aurora-bloom-bg-flip` (shots: aurora-bloom-bg-flip). Helper: `KIT.shotcards` in `tools/shotcards/effects.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs effects` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A mood change between two halves of a film (problem → answer).
- An animated background that is still a pure function of t.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `effects.js` first, see the index):

```js
const bg = KIT.shotcards.auroraBloomBgFlip({ palettes: [['#1e3a8a', '#6d28d9', '#0ea5e9'], ['#9a3412', '#db2777', '#f59e0b']], flipAt: snap(W('b', 'now')), bloom: KIT.dur(0.8) });
// put your scenes above bg.el
function render(t) { bg.set(t); }
```

## Timing and easing

- Colours are interpolated in RGB through the bloom's peak (`flipAt − 0.1·bloom` to `flipAt + 0.5·bloom`); the glow is `sin(π·p)²` so it rises and falls.
- Blob motion is a sum of sines in t: it never repeats exactly, and a seek lands on the same frame.

## Common mistakes

- Palettes as `hsl()` or names: use hex strings (the mixer parses `#rrggbb`).
- Text over the bloom's peak: it washes out for about half a second; keep the headline off the beat.

[Back to the shotcard index](b-index.md)
