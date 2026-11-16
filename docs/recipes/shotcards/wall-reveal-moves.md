# Wall reveals: bento light-up and wireframe draw-on

A bento grid whose cells light up in turn, and a wireframe page drawn on line by line before it fills with colour.

Source: video-shotcraft card `wall-reveal-moves` (shots: bento-light-up, wireframe-draw-on). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A feature wall (`bentoLightUp`).
- A UI that is sketched before it is shown (`wireframeDrawOn`).

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const bento = KIT.shotcards.bentoLightUp({ cols: 4, rows: 3, order: 'radial', at: snap(W('w', 'everything')), stagger: KIT.dur(0.1) });
const wire = KIT.shotcards.wireframeDrawOn({ at: snap(W('w', 'sketch')), per: KIT.dur(0.45), stagger: KIT.dur(0.18) });
function render(t) { bento.set(t); wire.set(t); }
```

## Timing and easing

- Bento: cell order is 'radial' (from the middle), 'row' or 'seed'; each cell flashes its colour (glow, 3 % scale) over 0.5 s and settles to a tint.
- Wireframe: each rect's stroke runs on via `pathLength`, then its text lines, then the whole thing washes with colour at `at + (n−1)·stagger + 1.5·per`.

## Common mistakes

- Cells passed as `cells: [{ c, r, cs, rs }]` that overlap: the helper does not check.
- A wireframe over a busy photo: the outlines vanish.

[Back to the shotcard index](b-index.md)
