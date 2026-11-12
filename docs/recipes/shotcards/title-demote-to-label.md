# Title demotes to a label

The big title shrinks, moves and recolours into the small label of the section it introduced (A), or hands over to a separate label (B).

Source: video-shotcraft card `title-demote-to-label` (shots: title-demote-to-label (A and B variants)). Helper: `KIT.shotcards` in `tools/shotcards/typography.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs typography` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A chapter title that has to stay on screen as a header.
- A product name that becomes a corner mark.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `typography.js` first, see the index):

```js
// measure the two boxes once (getBoundingClientRect) or pass numbers
const demote = KIT.shotcards.titleDemoteToLabel({ text: 'Reelwright', variant: 'A', at: snap(W('t', 'now')),
  from: { x: 960, y: 540, size: 120, color: '#f4f1ea' }, to: { x: 150, y: 60, size: 28, color: '#6ee7b7' } });
// variant 'B': text becomes label: 'Chapter one'; the title drifts up and fades while the label settles
function render(t) { demote.set(t); }
```

## Timing and easing

- Both variants take `dur` (0.7 s) with the theme ease. A morphs one element (translate, size, colour); B cross-hands with the label arriving from below, and a rule draws under it in the last 30 %.
- `from` and `to` are centre points and font px.

## Common mistakes

- Animating `font-size` on a long paragraph: it relays out every frame. Use it for one line.
- Colours as names: the mixer reads `#rrggbb` or `[r, g, b]`.

[Back to the shotcard index](b-index.md)
