# Lead word zoom, then assemble

The first word fills the frame, holds, then settles into the sentence while the rest assembles around it.

Source: video-shotcraft card `lead-word-zoom-assemble` (shots: lead-word-zoom-assemble). Helper: `KIT.shotcards` in `tools/shotcards/typography.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs typography` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A sentence whose first word is the point ("Faster …").
- A title card with a punch.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `typography.js` first, see the index):

```js
const lead = KIT.shotcards.leadWordZoomAssemble({ words: ['Faster', 'than', 'a', 'storyboard'], at: snap(W('l', 'faster')), hold: KIT.dur(0.5), dur: KIT.dur(0.8) });
function render(t) { lead.set(t); }
```

## Timing and easing

- The lead is centred at 3.2× and holds `hold`; it then eases (`power3.inOut`) into its slot in the line while the other words fly in from seeded directions, `KIT.staggerStep` apart.
- The geometry is measured once at build: build after fonts load.

## Common mistakes

- Building before the font is ready: the lead lands in the wrong place. Wait for `document.fonts.ready` or build in the film's load step.
- A lead word wider than the frame at 3.2×: lower `zoom`.

[Back to the shotcard index](b-index.md)
