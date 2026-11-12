# Neon frame orbit and drop

A dot orbits a neon frame, then drops into the middle with a bounce and the frame lights up fully.

Source: video-shotcraft card `neon-frame-orbit-drop` (shots: neon-frame-orbit-drop). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A loading beat before a reveal.
- A "charge" metaphor: orbit, then land.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const orbit = KIT.shotcards.neonFrameOrbitDrop({ rect: { x: 400, y: 220, w: 1100, h: 640 }, laps: 2, orbit: KIT.dur(1.8), drop: KIT.dur(0.7), at: snap(W('n', 'charge')) });
function render(t) { orbit.set(t); }
```

## Timing and easing

- The dot eases (`power1.inOut`) around the rectangle `laps` times with a 20 % tail; at `at + orbit` it falls to the centre with `bounce.out`.
- The frame brightens from 15 % to 100 % over the drop's last 40 % and 0.25 s after; the dot flares on landing.

## Common mistakes

- More than 3 laps: the tail wraps over itself.
- A drop of less than 0.4 s: the bounce is invisible.

[Back to the shotcard index](b-index.md)
