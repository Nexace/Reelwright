# Slam entrances

A word that snaps flat out of extreme perspective, a score that slams in with a shockwave, and a reusable burst of shards.

Source: video-shotcraft card `slam-entrance-moves` (shots: kanada-perspective-snap, score-slam, impact-burst-kit). Helper: `KIT.shotcards` in `tools/shotcards/effects.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs effects` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A single huge word (`kanadaPerspectiveSnap`).
- A number as the payoff (`scoreSlam`); an accent on any beat (`impactBurst`).

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `effects.js` first, see the index):

```js
const snapW = KIT.shotcards.kanadaPerspectiveSnap({ text: 'SNAP', at: snap(W('h', 'snap')) });
const score = KIT.shotcards.scoreSlam({ value: 9850, label: 'SCORE', at: snap(W('h', 'score')), shakeEl: sceneEl });   // Illustrative data
const burst = KIT.shotcards.impactBurst({ x: 960, y: 540, at: snap(W('h', 'boom')) });
function render(t) { snapW.set(t); score.set(t); burst.set(t); }
```

## Timing and easing

- The snap is a stiff spring (damping 14, stiffness 260): rotateY 75° → 0, rotateX −25° → 0, skewX −18° → 0, scale 2.2 → 1 and the blur clears.
- `scoreSlam` counts up for `count` (0.7 s), then slams from 2.4× on `expo.out`; `score.shake(t)` is the frame shake.

## Common mistakes

- Three slams in one scene: the second and third do nothing. One per scene.
- `shakeEl` on the stage root: shake a child wrapper.

[Back to the shotcard index](b-index.md)
