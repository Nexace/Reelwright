# Picker and feature carousel

A row of option chips whose highlight moves every few seconds while a feature card cycles in step.

Source: video-shotcraft card `picker-carousel-feature-cycle` (shots: picker-carousel-feature-cycle). Helper: `KIT.shotcards` in `tools/shotcards/interaction.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs interaction` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- One screen with 3-5 modes or tabs, each with its own feature.
- A feature tour with a visible index.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `interaction.js` first, see the index):

```js
const tour = KIT.shotcards.pickerCarousel({ options: ['Design', 'Build', 'Ship'], contents: [{ title: 'Design', body: 'Layouts that adapt.', color: '#6ee7b7' }, /* … */],
  every: KIT.dur(1.3), at: snap(W('p', 'design')) });
function render(t) { tour.set(t); }
```

## Timing and easing

- Step k runs from `at + k·every`; the highlight and the cards move during the last `move` seconds (0.5) of the step with `back.out(1.2)`, so the old card has gone before the next is read.
- `loop: false` stops on the last option; the default wraps and the highlight sweeps back to the first chip.

## Common mistakes

- `every` shorter than 1 s with long body text: the card changes before it is read.
- Different content heights: the cards are all the same size; keep body text to two lines.

[Back to the shotcard index](b-index.md)
