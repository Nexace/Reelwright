# Segmented thumb and hero

A segmented control whose thumb springs to a selection, driving a hero panel below it.

Source: video-shotcraft card `segmented-thumb-hero` (shots: segmented-thumb-hero). Helper: `KIT.shotcards` in `tools/shotcards/interaction.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs interaction` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Switching a view (Day / Week / Month, Light / Dark) with the result shown big.
- The cleanest way to show a toggle without a cursor.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `interaction.js` first, see the index):

```js
const seg = KIT.shotcards.segmentedThumb({ segments: ['Day', 'Week', 'Month'], sel: [[snap(W('s', 'week')), 1], [snap(W('s', 'month')), 2]],
  heroes: [{ title: 'Day', color: '#6ee7b7' }, { title: 'Week', color: '#93c5fd' }, { title: 'Month', color: '#fca5a5' }] });
function render(t) { seg.set(t); }
```

## Timing and easing

- `sel` is `[[time, index], …]`; the thumb springs there (damping 13, stiffness 240, a small overshoot) and the hero slides and fades over 0.45 s.
- `seg.pos(t)` is the thumb position in segments (can overshoot past the last one).

## Common mistakes

- A selection list that is not in time order: it is read in order and later times win.
- Very long segment labels: they are clipped to the segment width.

[Back to the shotcard index](b-index.md)
