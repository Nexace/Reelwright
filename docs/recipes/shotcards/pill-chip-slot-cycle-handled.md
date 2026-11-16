# Chip rail with settled state

Several slot-machine chips roll through their words, one after another, and each settles into a "handled" state with a tick.

Source: video-shotcraft card `pill-chip-slot-cycle-handled` (shots: pill-chip-slot-cycle-handled). Helper: `KIT.shotcards` in `tools/shotcards/typography.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs typography` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Showing a pipeline of states (draft → review → done) in parallel.
- A status board that resolves.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `typography.js` first, see the index):

```js
const rail = KIT.shotcards.chipRail({ chips: [['draft', 'review', 'done'], ['queued', 'sent'], ['red', 'amber', 'green']], every: KIT.dur(0.5), stagger: KIT.dur(0.5), at: snap(W('c', 'status')) });
function render(t) { rail.set(t); }
```

## Timing and easing

- Chip i starts `i·stagger` later and rolls `every` per word, stopping on its last word; settling turns the border to the accent and pops the tick (`back.out(2.5)`).
- `rail.end` is when the last chip is handled: cue a `chime` there.

## Common mistakes

- Chips with one word: they have nothing to roll; use two or more.
- Setting a fixed `width` too narrow for the longest word.

[Back to the shotcard index](b-index.md)
