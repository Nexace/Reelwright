# Product card, progressively assembled

A skeleton card with a shimmer that fills in part by part: image, title, price, button.

Source: video-shotcraft card `product-card-progressive-assemble` (shots: product-card-progressive-assemble). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A shop or marketplace card, built live.
- Loading states that resolve.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const prod = KIT.shotcards.productCardProgressive({ title: 'Aurora lamp', price: '$49', button: 'Add to cart', at: snap(W('p', 'product')), per: KIT.dur(0.5), gap: KIT.dur(0.35) });   // Illustrative data
function render(t) { prod.set(t); }
```

## Timing and easing

- Parts fill every `gap` (0.35 s) from `at + 0.5`: the image wipes down, the title wipes right, the price pops (`back.out(2)`), the button slides in.
- The skeleton shimmer is a band moving every 1.2 s, a function of t.

## Common mistakes

- Real prices or product names: label them "Illustrative data".
- Skipping the skeleton: without it the first frame is an empty card.

[Back to the shotcard index](b-index.md)
