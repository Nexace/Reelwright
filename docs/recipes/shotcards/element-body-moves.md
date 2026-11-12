# Contact shadow lift

An element lifts off the ground and its shadow spreads, softens and fades as the height grows; it lands with a bounce and the shadow tightens.

Source: video-shotcraft card `element-body-moves` (shots: contact-shadow-lift). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A card or product that should feel physical.
- Any lift or pick-up.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const lift = KIT.shotcards.contactShadowLift({ el: cardEl /* or omit for a default card */, x: 960, y: 540, lift: 90, at: snap(W('l', 'lift')) });
function render(t) { lift.set(t); }
```

## Timing and easing

- Up `up` (0.5 s, `power3.out`), hang `hang` (0.5 s), down `down` (0.7 s, `bounce.out`). `lift.height(t)` is the lift in px.
- The shadow is a flat ellipse: scale 1 → 0.75 wide, blur 6 → 28 px, opacity 0.55 → 0.25 as it rises.

## Common mistakes

- A shadow on a light film: it is black at 55 %; lower the opacity in CSS if needed.
- Passing `el` that is not absolutely positioned: the translate has no effect on layout.

[Back to the shotcard index](b-index.md)
