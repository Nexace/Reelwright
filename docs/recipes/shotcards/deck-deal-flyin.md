# Deck deal fly-in, then orbit open

A pile deals out to a grid with accelerating gaps, each card flipping face up, then the deck orbits open into a ring.

Source: video-shotcraft card `deck-deal-flyin` (shots: deck-deal-flyin). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A set of items (plans, cards, features) revealed as dealt.
- A gambling-free "deal" look for a content pile.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const deal = KIT.shotcards.deckDealFlyin({ cards: ['1', '2', '3', '4', '5', '6', '7', '8'], gap: KIT.dur(0.35), accel: 0.82, at: snap(W('d', 'deal')) /* , orbit: false */ });
function render(t) { deal.set(t); }
```

## Timing and easing

- The gap before card k is `gap · accel^k` (so each card follows faster); each flies for `fly` (0.6 s, `back.out(1.1)`) arcing up by 0.4 card heights and turning from rotateY 180°.
- After the last card (`+ fly`) the grid eases into a rotating ring over `open` (1.2 s); `orbit: false` stays in the grid.

## Common mistakes

- Over 12 cards: the grid cells shrink and the ring crowds.
- No `at` from `W()`: the first card falls before the word.

[Back to the shotcard index](b-index.md)
