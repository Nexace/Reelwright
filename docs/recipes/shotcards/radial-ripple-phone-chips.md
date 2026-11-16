# Radial ripple, phone, chips

A phone in the middle sends ripples out; chips fly out of it along rays and settle on a ring.

Source: video-shotcraft card `radial-ripple-phone-chips` (shots: radial-ripple-phone-chips). Helper: `KIT.shotcards` in `tools/shotcards/effects.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs effects` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- What the app connects to, from the phone outwards.
- Notifications or integrations leaving a device.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `effects.js` first, see the index):

```js
const ripple = KIT.shotcards.radialRipplePhoneChips({ chips: ['Mail', 'Chat', 'Maps', 'Pay', 'Photos', 'Music'], at: snap(W('p', 'everything')) /* , phone: yourPhoneEl */ });
function render(t) { ripple.set(t); }
```

## Timing and easing

- Chip i leaves at `at + 0.3 s + i·per` (0.35 s) and flies for 0.7 s with `back.out(1.4)`; three rings repeat every 1.5 s, half a second apart.
- After landing each chip drifts a few degrees on a slow sine, so the ring is alive but each frame is a function of t.

## Common mistakes

- More than about 10 chips: they overlap on the ring. Use two radii (`radialWave`).
- Passing `phone` as an element that has its own `transform` animation: it is left alone, so it will not pulse with the ripple.

[Back to the shotcard index](b-index.md)
