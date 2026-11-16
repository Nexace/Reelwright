# Research card stack into scroll

Cards appear as one stack, fan out into a column and then scroll up.

Source: video-shotcraft card `research-card-stack-scroll` (shots: research-card-stack-scroll). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Sources, findings or search results.
- Stack to list to feed in one shot.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const research = KIT.shotcards.researchCardStackScroll({ cards: [{ title: 'Alpha', body: 'Source notes.' }, { title: 'Beta', body: '…' }], at: snap(W('r', 'sources')), spreadAt: snap(W('r', 'spread')) });
function render(t) { research.set(t); }
```

## Timing and easing

- The stack enters 0.05 s apart; at `spreadAt` each card moves to its list slot (`power3.inOut`, 0.9 s, `KIT.staggerStep` apart); the scroll starts at `scrollAt` (default `spreadAt + spreadDur`) at `speed` px/s.
- Cards leaving the top fade as they go.

## Common mistakes

- Too few cards (under 4): the scroll ends at once.
- Dense body text: the cards are small; two lines at most.

[Back to the shotcard index](b-index.md)
