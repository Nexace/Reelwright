# Glow orbs and fly-lines

Ambient breathing orbs, a glowing arc that a bright orb draws, and an orb that relays across nodes along arcs.

Source: video-shotcraft card `glow-flyline-moves` (shots: glow-orb-ambient, flyline-arc, orb-flyline-relay). Helper: `KIT.shotcards` in `tools/shotcards/effects.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs effects` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A soft background that breathes (`glowOrbAmbient`).
- Connection between two things (`flylineArc`), or a journey across several (`orbFlylineRelay`).

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `effects.js` first, see the index):

```js
const amb = KIT.shotcards.glowOrbAmbient({ orbs: 5, colors: ['#6ee7b7', '#93c5fd', '#c4b5fd'] });
const arc = KIT.shotcards.flylineArc({ from: { x: 200, y: 800 }, to: { x: 1700, y: 600 }, at: snap(W('a', 'send')), dur: KIT.dur(1.4) });
const relay = KIT.shotcards.orbFlylineRelay({ nodes: [{ x: 200, y: 700, label: 'A' }, { x: 700, y: 350, label: 'B' }, { x: 1200, y: 700, label: 'C' }], hop: KIT.dur(0.8) });
function render(t) { amb.set(t); arc.set(t); relay.set(t); }
```

## Timing and easing

- The arc is a quadratic Bézier whose control point is lifted by `height` (default 35 % of the span); the orb and the stroke use the same closed form.
- In the relay each node rings and lights when the orb lands; the arcs stay drawn behind it. It replaces GSAP MotionPath, which the `seekable-runtimes` gate bans.

## Common mistakes

- Orb colours as names: they go into a `radial-gradient`, hex or `var(--kit-…)` is fine.
- Hopping faster than 0.5 s per arc: the ring on landing does not finish.

[Back to the shotcard index](b-index.md)
