# Neon frame forerunner

A short bright runner circles a frame and the neon outline draws behind it.

Source: video-shotcraft card `neon-frame-forerun` (shots: neon-frame-forerun). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Framing a screenshot or a device.
- A glow-on border for a card or a title.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const frame = KIT.shotcards.neonFrameForerun({ rect: { x: 400, y: 220, w: 1100, h: 640 }, color: '#6ee7b7', at: snap(W('n', 'frame')), dur: KIT.dur(1.6) });
function render(t) { frame.set(t); }
```

## Timing and easing

- The runner and the trail ease together (`power2.inOut`), the trail `lag` (0.12 s) behind; the frame pulses once after it closes (0.5 s).
- Path progress uses SVG `pathLength` 1 so rounded corners need no length maths.

## Common mistakes

- A colour as a name with `drop-shadow`: it works, but a hex lets you tune the glow.
- Two neon frames at once with different colours: filter stacks; keep one.

[Back to the shotcard index](b-index.md)
