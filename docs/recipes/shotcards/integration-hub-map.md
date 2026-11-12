# Integration hub map

A hub tile with logo tiles around it: connectors draw out and each tile pops and glows in the order it is spoken.

Source: video-shotcraft card `integration-hub-map` (shots: integration-hub-map). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- "Works with" screens, integration lists.
- A platform with spokes.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const hub = KIT.shotcards.integrationHubMap({ hub: 'Hub', nodes: ['Slack', 'Git', 'Docs', 'Mail', 'Cal'].map((label) => ({ label })),
  times: ['slack', 'git', 'docs', 'mail', 'cal'].map((w) => KIT.W('apps', w)) });   // narration order
function render(t) { hub.set(t); }
```

## Timing and easing

- Tile i is lit at `times[i]`: its connector draws in the 0.25 s before, the tile pops over 0.35 s and its glow fades over 0.6 s; without `times` they are `per` (0.35 s) apart from `at + 0.5`.
- Connectors turn from muted to accent when their tile is reached.

## Common mistakes

- Brand logos you may not use: tiles take text; put your own SVG in `label` HTML.
- More than 8 nodes: the ring gets crowded.

[Back to the shotcard index](b-index.md)
