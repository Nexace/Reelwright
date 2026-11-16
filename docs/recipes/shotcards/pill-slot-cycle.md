# Pill slot cycle

A pill whose word rolls vertically through a reel, one word per beat, with a small overshoot.

Source: video-shotcraft card `pill-slot-cycle` (shots: pill-slot-cycle). Helper: `KIT.shotcards` in `tools/shotcards/typography.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs typography` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A sentence with one word that changes ("Built for [teams]").
- A product name or audience cycle.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `typography.js` first, see the index):

```js
const pill = KIT.shotcards.pillSlotCycle({ words: ['faster', 'cleaner', 'smarter', 'ready'], every: KIT.beat(1) - KIT.beat(0), at: KIT.beat(4) /* , loop: true */ });
function render(t) { pill.set(t); }
```

## Timing and easing

- Each step rolls during the last `move` (0.45 s) of `every` with `back.out(1.4)`; the pill width is the widest word, measured at build.
- `loop: true` adds the first word again at the end and rolls back to it, then stops.

## Common mistakes

- Building before fonts load: the pill is sized for the fallback font.
- `every` below 0.5 s: the roll never rests.

[Back to the shotcard index](b-index.md)
