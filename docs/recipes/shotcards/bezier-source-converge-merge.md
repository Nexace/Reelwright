# Bézier sources converge and merge

Several sources send chips along curved paths that draw as they travel and merge into one result node.

Source: video-shotcraft card `bezier-source-converge-merge` (shots: bezier-source-converge-merge). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Several inputs (files, sources, people) becoming one output.
- A "combine" beat.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const merge = KIT.shotcards.bezierConverge({ sources: [{ x: 200, y: 200, label: 'A' }, { x: 220, y: 860, label: 'B' }, { x: 1700, y: 200, label: 'C' }], target: { x: 960, y: 540 }, result: 'Merged', at: snap(W('m', 'combine')) });
function render(t) { merge.set(t); }
```

## Timing and easing

- Chip i leaves at `at + i·stagger` (0.12 s) and travels for `dur` (1 s, `power2.inOut`); the trail is the path dash-drawn to the same p; arrival of the last chip is `merge.end − 0.6`.
- At the merge a ring pulses (0.5 s) and the result pops with `back.out(2)`.

## Common mistakes

- Sources with no space to curve: set `curve` to 0.15.
- Drawing straight lines between far-apart points: keep the default curve for the "flow" feel.

[Back to the shotcard index](b-index.md)
