# Text columns converge

Columns of lines slide in from both sides and meet in the middle; a middle column rises from below.

Source: video-shotcraft card `text-column-converge` (shots: text-column-converge). Helper: `KIT.shotcards` in `tools/shotcards/typography.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs typography` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Comparing or listing in 2-3 columns.
- A title card built from short phrases.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `typography.js` first, see the index):

```js
const cols = KIT.shotcards.textColumnConverge({ columns: [['Plan', 'Draft', 'Review'], ['Ship'], ['Measure', 'Learn', 'Repeat']], at: snap(W('c', 'plan')), dur: KIT.dur(0.9) });
function render(t) { cols.set(t); }
```

## Timing and easing

- The left half comes from the left, the right half from the right (55 % of the frame), a middle column rises 120 px; lines are `KIT.staggerStep` apart and the middle column starts 2 steps later.
- `cols.end` is when everything has landed.

## Common mistakes

- More than 3 columns on 9:16: they get too narrow; the width is `min(0.9·W/n, 420)` px.
- Uneven column lengths: shorter columns end higher; pad or split.

[Back to the shotcard index](b-index.md)
