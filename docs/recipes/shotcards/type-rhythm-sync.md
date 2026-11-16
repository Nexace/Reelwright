# Type on the rhythm: weight pump and karaoke fill

Type whose weight pumps on every beat, and a sentence that fills with colour as each word is spoken.

Source: video-shotcraft card `type-rhythm-sync` (shots: font-weight-pump, karaoke-fill-sync). Helper: `KIT.shotcards` in `tools/shotcards/typography.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs typography` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Text on a music beat (`fontWeightPump`).
- Captions that follow the voice (`karaokeFill`), without the caption bar.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `typography.js` first, see the index):

```js
const pump = KIT.shotcards.fontWeightPump({ text: 'PUMP THE BEAT', beats: [4, 5, 6, 7].map(KIT.beat), lo: 300, hi: 900, decay: 7, lag: 0.02 });
const words = ['sing', 'it', 'word', 'by', 'word'], al = KIT.align('line');   // [start, …] per word
const kar = KIT.shotcards.karaokeFill({ words, times: words.map((w, i) => [al[i], al[i + 1] ?? al[i] + 0.4]) });
function render(t) { pump.set(t); kar.set(t); }
```

## Timing and easing

- The pump is `exp(−decay·(t − lastBeat))` per letter, each letter `lag` seconds behind the last, so a wave runs along the word. Weights use `font-variation-settings` and snap to the nearest face on static fonts.
- Karaoke: each word's fill runs from its start to its end time (`times`), left to right.

## Common mistakes

- A static font family: weights snap between 300/400/700/900. Use a variable font for the smooth pump.
- Karaoke `times` where word i+1 starts before word i ends: the fills overlap; that is fine for fast speech.

[Back to the shotcard index](b-index.md)
