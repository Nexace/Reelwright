# Page waterfall wall

A tilted wall of columns scrolling at different speeds and directions: a screenshot wall.

Source: video-shotcraft card `page-waterfall-wall` (shots: page-waterfall-wall). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Many pages, templates or results at once.
- A big-number backdrop ("10,000 pages").

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const wall = KIT.shotcards.pageWaterfallWall({ cols: 5, tilt: -6, speed: 70, at: 0, dur: KIT.dur(3) });
function render(t) { wall.set(t); }
```

## Timing and easing

- Each column has a seeded speed (0.6-1.4 × `speed` px/s) and alternates direction; the position is `(v·t) mod columnHeight`, so it loops seamlessly and any seek works.
- Columns enter one after another (`0.12 s`); the wall is rotated and scaled 1.2× so no edge shows.

## Common mistakes

- Real screenshots from the network: put local images in the cards.
- A wall behind small text: it is busy; dim it with a scrim.

[Back to the shotcard index](b-index.md)
