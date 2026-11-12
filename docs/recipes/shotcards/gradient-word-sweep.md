# Gradient word sweep

A bright gradient band crosses a sentence word by word, leaving each word in the final colour.

Source: video-shotcraft card `gradient-word-sweep` (shots: gradient-word-sweep). Helper: `KIT.shotcards` in `tools/shotcards/typography.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs typography` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Highlighting words as they are spoken, without karaoke boxes.
- A slogan with a travelling accent.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `typography.js` first, see the index):

```js
const sweep = KIT.shotcards.gradientWordSweep({ text: 'Ideas become motion', at: snap(W('g', 'ideas')), per: KIT.dur(0.5), stagger: KIT.dur(0.22) });
function render(t) { sweep.set(t); }
```

## Timing and easing

- Word i's band runs `[at + i·stagger, + per]` (`power1.inOut`); before it a word is `base` (muted), after it `end`.
- Take `stagger` from the spoken word gaps (`KIT.align(id)`) if the voice sets the pace.

## Common mistakes

- Setting `color` on the words yourself: they use `background-clip: text`; the text colour is transparent.
- Colours as `hsl()` with spaces: they go into a gradient string; hex and `var()` are safe.

[Back to the shotcard index](b-index.md)
