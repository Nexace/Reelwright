# Row embed

A list row grows to embed a card inside it, pushing the rows below down; optionally shrinks back.

Source: video-shotcraft card `row-embed` (shots: row-embed). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Expanding a list item (an email, a task) to show detail.
- An accordion without the chevron.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const emb = KIT.shotcards.rowEmbed({ rows: ['Report', 'Budget', 'Roadmap', 'Notes'], row: 1, embed: { title: 'Budget', body: 'Q3 is 4 % under plan.' }, at: snap(W('e', 'open')), close: true });   // Illustrative data
function render(t) { emb.set(t); }
```

## Timing and easing

- The row grows by `embedH` over `dur` (0.7 s, `power3.out`); the card inside fades in from 30 % and scales 0.92 → 1; with `close: true` it shrinks after `hold` (1 s).
- Row positions are recomputed from their heights every frame, so the rows below follow exactly.

## Common mistakes

- A long embed text: the card has a fixed height (`embedH`).
- Setting the row's `height` yourself: the helper owns it.

[Back to the shotcard index](b-index.md)
