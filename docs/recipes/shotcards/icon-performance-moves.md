# Icon performance: attention bounce and morph

An icon that hops with squash and stretch to get attention, and a glyph that morphs into another on a springy beat.

Source: video-shotcraft card `icon-performance-moves` (shots: icon-performance-moves). Helper: `KIT.shotcards` in `tools/shotcards/effects.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs effects` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Pointing at an icon or a button (`attentionBounce`).
- A state change on one icon, play → tick (`iconMorph`).

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `effects.js` first, see the index):

```js
const hop = KIT.shotcards.attentionBounce({ el: bellEl /* absolutely positioned */, n: 3, height: 90, at: snap(W('i', 'notification')) });
const morph = KIT.shotcards.iconMorph({ a: '&#9654;', b: '&#10003;', at: snap(W('i', 'done')) });
function render(t) { hop.set(t); morph.set(t); }
```

## Timing and easing

- Each hop is `per` = 0.5 s; amplitude falls ×0.62 per hop; squash lasts the first and last 12 % of a hop; a decaying wiggle follows the last landing.
- `attentionBounce` owns `el`'s `transform`: wrap the element if you also move it.

## Common mistakes

- Setting `transform` on `el` yourself: the helper overwrites it every frame.
- Morphing icons that are images: `a` and `b` take text or HTML glyphs; for images pass `<img>` HTML.

[Back to the shotcard index](b-index.md)
