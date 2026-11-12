# FUI HUD: brackets, readouts, reticle

Corner brackets that draw in, readouts that flicker, and a reticle that spins in from large and locks on.

Source: video-shotcraft card `fui-hud-moves` (shots: fui-hud-moves). Helper: `KIT.shotcards` in `tools/shotcards/effects.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs effects` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A product shot that should read as scanned or targeted.
- A sci-fi lower-third or an inspection beat.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `effects.js` first, see the index):

```js
const hud = KIT.shotcards.fuiHud({ rect: { x: 300, y: 120, w: 1100, h: 640 }, readouts: [{ label: 'ALT', base: 3200, amp: 40, unit: ' m' }], lockAt: snap(W('h', 'lock')) });
function render(t) { hud.set(t); }
```

## Timing and easing

- `lockAt` is when the reticle settles; a flash and a blinking `LOCK` follow. The readouts re-roll 12 times a second from a seeded hash, so they flicker but replay identically.
- The ring and crosshair spin from 180° and 2.6× over `lockAt − at`.

## Common mistakes

- Readouts that are real data: they are decoration. Label real numbers with a `Source:` credit elsewhere.
- More than three readouts: the column crowds the top-left bracket.

[Back to the shotcard index](b-index.md)
