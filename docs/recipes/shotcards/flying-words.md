# Flying words (word tunnel)

Words travel along z towards the camera in perspective and pass it, one after another.

Source: video-shotcraft card `flying-words` (shots: flying-words). Helper: `KIT.shotcards` in `tools/shotcards/typography.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs typography` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A hype line or a list of nouns.
- Transition energy without a camera move.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `typography.js` first, see the index):

```js
const tunnel = KIT.shotcards.flyingWords({ words: ['Make', 'every', 'frame', 'count'], at: snap(W('f', 'make')), gap: KIT.dur(0.25), travel: KIT.dur(1.6) });
function render(t) { tunnel.set(t); }
```

## Timing and easing

- Word i starts at `at + i·gap` and flies for `travel`; z eases from far (−6× the perspective) to 0.85× past the camera, it fades in over the first 12 % and out over the last 15 %.
- x and y are seeded off the centre line, alternating sides.

## Common mistakes

- A `gap` longer than `travel`: only one word is ever on screen. Overlap them.
- Text the viewer must read: it flies for under two seconds. Use a kinetic layout for sentences.

[Back to the shotcard index](b-index.md)
