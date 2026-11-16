# Outline word, then fill

Live text drawn as an outline left to right, then washed with a solid fill.

Source: video-shotcraft card `outline-word-fill` (shots: outline-word-fill). Helper: `KIT.shotcards` in `tools/shotcards/typography.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs typography` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A big single word with a two-step reveal.
- Any font: it is live text, not a traced path.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `typography.js` first, see the index):

```js
const word = KIT.shotcards.outlineWordFill({ text: 'OUTLINE', size: 160, color: 'var(--kit-accent)', at: snap(W('o', 'outline')), outline: KIT.dur(0.6), fill: KIT.dur(0.7) });
function render(t) { word.set(t); }
```

## Timing and easing

- The outline is revealed with a clip over `outline`; after `gap` the fill wash runs over `fill`.
- Stroke width is 3 % of the font size unless you pass `strokeW`.

## Common mistakes

- Very thin fonts: the 3 % outline vanishes. Raise `strokeW`.
- Needs a stroke colour that differs from the background (`stroke`).

[Back to the shotcard index](b-index.md)
