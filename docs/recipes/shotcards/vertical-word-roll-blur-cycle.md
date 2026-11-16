# Vertical word roll with blur

Words roll up through one slot, blurring and fading out as they leave and unblurring as they arrive, endlessly or to a stop.

Source: video-shotcraft card `vertical-word-roll-blur-cycle` (shots: vertical-word-roll-blur-cycle). Helper: `KIT.shotcards` in `tools/shotcards/typography.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs typography` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A headline with a rotating key word, at display size.
- More than the pill version: it needs no container.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `typography.js` first, see the index):

```js
const roll = KIT.shotcards.verticalWordRoll({ words: ['Design', 'Build', 'Ship', 'Learn'], every: KIT.beat(2) - KIT.beat(0), at: KIT.beat(4), blur: 14, loop: true });
function render(t) { roll.set(t); }
```

## Timing and easing

- It is an endless carousel on a ring (the word at signed distance d from the reel): position `d·dist`, blur `|d|·blur`, opacity `1 − 1.4|d|`.
- `loop: false` stops on the last word; `move` is the roll time, 0.5 s with `power3.inOut`.

## Common mistakes

- Two words of very different width in the same slot: the line jumps. Centre it and give the sentence room.
- Roll faster than 0.8 s per word: nobody reads it.

[Back to the shotcard index](b-index.md)
