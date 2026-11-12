# Card stack

A fanned stack of cards; every step the top card is thrown to the right and slips under the stack.

Source: video-shotcraft card `card-stack` (shots: card-stack). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A pile of options, quotes or features, one at a time.
- The "deck" metaphor without a flip.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const stack = KIT.shotcards.cardStack({ cards: ['One', 'Two', 'Three', 'Four'], every: KIT.dur(1), at: snap(W('c', 'first')) });
function render(t) { stack.set(t); }
```

## Timing and easing

- Step k throws card (k mod n): it leaves to +0.9 card widths with a 14° tilt in the first half, slips to the bottom in the second (z-index flips at the middle); others move up one slot, smaller by 5 % per slot.
- Last `move` seconds (0.7) of `every` carry the motion; the card then rests.

## Common mistakes

- One long card text: cards are fixed-size; keep it to a few words.
- Six or more cards: deep slots fade out (between slots 3 and 5).

[Back to the shotcard index](b-index.md)
