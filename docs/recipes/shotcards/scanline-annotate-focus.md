# Scanline, focus and callout

A scanline passes over a subject, the rest dims, and a connector draws out to a labelled callout.

Source: video-shotcraft card `scanline-annotate-focus` (shots: scanline-annotate-focus). Helper: `KIT.shotcards` in `tools/shotcards/effects.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs effects` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Naming one part of a screenshot or product.
- Annotating without a hand-drawn mark.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `effects.js` first, see the index):

```js
const note = KIT.shotcards.scanlineAnnotateFocus({ rect: { x: 200, y: 220, w: 700, h: 600 }, anchor: [1, 0.35], label: 'The part that matters', at: snap(W('a', 'here')) });
function render(t) { note.set(t); }
```

## Timing and easing

- Scan 1 s (`sweep`), then focus fades in 0.4 s, the elbow connector draws 0.5 s, and the label pops with `back.out(2)`.
- `anchor` is a fraction of `rect`; `target` (stage px) moves the label.

## Common mistakes

- A callout target outside the safe box: it is clipped by social-app UI on 9:16.
- Long labels: the pill grows right; keep it under 28 characters.

[Back to the shotcard index](b-index.md)
