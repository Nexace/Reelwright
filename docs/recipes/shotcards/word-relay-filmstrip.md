# Word relay on a filmstrip

Words in frames on a filmstrip: each step the strip is thrown one cell with an overshoot and the centre word lights up.

Source: video-shotcraft card `word-relay-filmstrip` (shots: word-relay-filmstrip). Helper: `KIT.shotcards` in `tools/shotcards/typography.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs typography` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A process (Idea, Script, Shoot, Cut, Ship) shown as a handed-on baton.
- A film-themed list.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `typography.js` first, see the index):

```js
const strip = KIT.shotcards.wordRelayFilmstrip({ words: ['Idea', 'Script', 'Shoot', 'Cut', 'Ship'], every: KIT.dur(0.8), at: snap(W('w', 'idea')) /* , loop: false */ });
function render(t) { strip.set(t); }
```

## Timing and easing

- Each throw lasts `move` (0.4 s) with `back.out(1.6)` at the end of `every`; the sprocket holes slide with the strip; the word at the centre scales to 1.1 and takes the accent frame.
- It loops by default (ring of words); `loop: false` ends on the last word.

## Common mistakes

- Fewer than 4 words: the ring looks sparse; add blanks.
- Reading speed: each word is the centre word for `every − move` seconds.

[Back to the shotcard index](b-index.md)
