# Assemble, then type fly-in

Skeleton blocks fly in from all sides and assemble into a panel; a headline then types in above it, each letter flying from depth.

Source: video-shotcraft card `assemble-then-type-flyin` (shots: assemble-then-type-flyin). Helper: `KIT.shotcards` in `tools/shotcards/effects.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs effects` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Introducing a UI or a feature: the panel appears, then it is named.
- A title that should land after the picture, not before.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `effects.js` first, see the index):

```js
const intro = KIT.shotcards.assembleThenTypeFlyin({ text: 'Meet the editor', bars: 5, at: snap(W('hook', 'meet')) });
function render(t) { intro.set(t); }
```

## Timing and easing

- Bars assemble `KIT.staggerStep` apart over `per`; the letters start when the last bar lands (`intro.end` is when the headline is complete).
- Each letter eases in with `back.out(1.2)` from `translateZ` and `rotateX` in perspective, 0.05 s apart (`stagger`).

## Common mistakes

- Setting `text` longer than about 24 characters: the per-letter stagger makes it last over a second.
- Putting other content in the same box: the headline sits above the panel.

[Back to the shotcard index](b-index.md)
