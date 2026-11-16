# Riso print hits

Ink layers in multiply blend that sit slightly off register and are thrown out of register on every hit, then settle.

Source: video-shotcraft card `riso-print-hits` (shots: riso-print-hits). Helper: `KIT.shotcards` in `tools/shotcards/effects.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs effects` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Type or a logo on a print-style film, hit on beats.
- Any beat accent where a shake would be too loud.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `effects.js` first, see the index):

```js
const riso = KIT.shotcards.risoPrintHits({ text: 'PRINT', inks: ['#ff4fa3', '#00b2ff'], hits: [snap(W('p', 'print')), KIT.beat(8), KIT.beat(12)] });
function render(t) { riso.set(t); }
```

## Timing and easing

- Each hit gives every ink a seeded jolt (±20 px, ±3°) that decays with a damped oscillation (rate 7/s), so the layers wobble back into register.
- The offsets come from `seed`: change it to change the look, never between frames.

## Common mistakes

- Three or more inks at full strength: multiply of all of them is near black. Two inks plus a pale third read better.
- A dark film background: multiply needs a light ground, which the helper draws (`paper`); fade it in over your scene.

[Back to the shotcard index](b-index.md)
