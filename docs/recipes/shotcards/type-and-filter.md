# Type and filter

A search field types a query while the list filters per character: rows that stop matching collapse, matching letters light up.

Source: video-shotcraft card `type-and-filter` (shots: type-and-filter). Helper: `KIT.shotcards` in `tools/shotcards/interaction.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs interaction` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Search, command palettes, filters.
- Showing that a result list reacts instantly.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `interaction.js` first, see the index):

```js
const find = KIT.shotcards.typeAndFilter({ rows: ['Apple pie', 'Apricot tart', 'Banana bread', 'Apple crumble'], query: 'apple', cps: 7, at: snap(W('q', 'search')) });
function render(t) { find.set(t); }
```

## Timing and easing

- Character k lands at `at + k / cps`; a row is hidden from the first character that breaks its match (`find.hideTimes[i]` has the time) and collapses over 0.3 s.
- Match is a case-insensitive substring of the typed prefix, so `app` keeps Apple and Apricot until the second p.

## Common mistakes

- A query that matches nothing: the list ends empty. Keep at least one row matching the full query.
- `cps` above 10: the rows collapse faster than the eye follows.

[Back to the shotcard index](b-index.md)
