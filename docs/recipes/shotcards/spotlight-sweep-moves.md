# Spotlight moves: wake panel, slide pan, corner reveal

A panel that wakes and sleeps in a glow, a spotlight that pans across the columns of a slide, and content revealed by light growing from a corner.

Source: video-shotcraft card `spotlight-sweep-moves` (shots: glow-wake-sleep-panel, slide-spotlight-pan, corner-spotlight-reveal). Helper: `KIT.shotcards` in `tools/shotcards/effects.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs effects` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A device or feature coming alive (`glowWakeSleepPanel`).
- One column at a time (`slideSpotlightPan`); a reveal from a corner (`cornerSpotlightReveal`).

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `effects.js` first, see the index):

```js
const wake = KIT.shotcards.glowWakeSleepPanel({ text: 'Awake', wakeAt: snap(W('w', 'wakes')), sleepAt: snap(W('w', 'sleeps')) });
const pan = KIT.shotcards.slideSpotlightPan({ columns: ['Plan', 'Record', 'Cut', 'Ship'], every: KIT.dur(1.2), at: snap(W('w', 'steps')) });
const reveal = KIT.shotcards.cornerSpotlightReveal({ html: '<img src="shot.png" style="width:100%;height:100%">', corner: [0, 0], at: snap(W('w', 'show')) });
function render(t) { wake.set(t); pan.set(t); reveal.set(t); }
```

## Timing and easing

- Wake and sleep each take 0.6 s; the glow has a small damped pulse at the wake.
- The pan moves one column per `every` (move 0.5 s, `power3.inOut`), other columns at 35 % opacity; the corner reveal grows a radial mask over `dur` from `corner` (fractions of the box).

## Common mistakes

- Passing image URLs that need the network: use local files (the `no-network` QA gate).
- A `corner` outside 0..1: the light starts outside the box and the reveal looks late.

[Back to the shotcard index](b-index.md)
