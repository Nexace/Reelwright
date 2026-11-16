# Type assembly: split stagger, drift, text on a path

Characters that rise and unblur in sequence, characters that drift in from scattered positions, and live text running along a curve.

Source: video-shotcraft card `type-assembly-moves` (shots: split-text-stagger, drift-assembly, text-on-path). Helper: `KIT.shotcards` in `tools/shotcards/typography.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs typography` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A headline entrance (`splitTextStagger` by char or word).
- A looser, floating entrance (`driftAssembly`); text that follows a shape (`textOnPath`).

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `typography.js` first, see the index):

```js
const a = KIT.shotcards.splitTextStagger({ text: 'Split and stagger', by: 'char', at: snap(W('a', 'split')) });
const b = KIT.shotcards.driftAssembly({ text: 'Drift assembly', spread: 600, at: snap(W('a', 'drift')) });
const c = KIT.shotcards.textOnPath({ text: 'Text that follows a curve', d: 'M 150 700 C 500 200, 1400 200, 1770 700', mode: 'slide', at: snap(W('a', 'path')) });
function render(t) { a.set(t); b.set(t); c.set(t); }
```

## Timing and easing

- Split: 0.5 s per piece, 0.04 s apart, rising 0.6 em with a 6 px blur that clears. Drift: 1.1 s `power3.out` with a seeded 0.25 s jitter per char.
- `textOnPath` is any font through SVG `<textPath>`: 'slide' keys `startOffset` from 100 % to 0, 'reveal' fades the glyphs in one by one. `d` is in stage px.

## Common mistakes

- Long text on a short path: the end is clipped. Measure with `path.getTotalLength()` if unsure.
- `by: 'word'` on a single word: nothing to stagger.

[Back to the shotcard index](b-index.md)
