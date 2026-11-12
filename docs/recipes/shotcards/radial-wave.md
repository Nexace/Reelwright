# Radial wave

A ripple expands from the centre; each chip on the ring pops when the front reaches it.

Source: video-shotcraft card `radial-wave` (shots: radial-wave). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Many items arriving from a centre (members, regions, files).
- A radial feature map.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const wave = KIT.shotcards.radialWave({ count: 12, /* or items: ['a', 'b', …] */ rings: [300, 460], at: snap(W('r', 'everyone')), speed: 600 });
function render(t) { wave.set(t); }
```

## Timing and easing

- Chip arrival = `at + distance / speed`; the three rings follow 0.18 s apart and fade past 70 % of the larger frame side.
- With `rings` of several radii the chips alternate between them, offset by 0.3 rad.

## Common mistakes

- `speed` too slow: the last chips arrive after the voice moved on. Compute it from the voice: `farthest / (spokenDuration)`.
- Chips over 90 px on 9:16: they collide on the inner ring.

[Back to the shotcard index](b-index.md)
