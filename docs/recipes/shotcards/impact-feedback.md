# Impact feedback: hit counter and anime impact

A big count that pops, shakes and rings on every hit, and one anime-style impact: speed lines, flash, slammed word, shaken frame.

Source: video-shotcraft card `impact-feedback` (shots: hit-counter, anime-impact). Helper: `KIT.shotcards` in `tools/shotcards/effects.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs effects` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Counting hits, likes, deploys on beats (`hitCounter`).
- One big moment that needs weight (`animeImpact`).

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `effects.js` first, see the index):

```js
const hits = KIT.shotcards.hitCounter({ hits: [KIT.beat(4), KIT.beat(5), KIT.beat(6), KIT.beat(8)], label: 'DEPLOYS' });
const bam = KIT.shotcards.animeImpact({ at: snap(W('i', 'boom')), text: 'BAM!', shakeEl: sceneEl /* a wrapper around your scene */ });
KIT.cue(snap(W('i', 'boom')), 'impact');
function render(t) { hits.set(t); bam.set(t); }
```

## Timing and easing

- Each hit: a damped oscillation pop (decay 9/s, 30 rad/s), a shake that dies in 0.25 s and a ring that expands for 0.4 s.
- `animeImpact`: lines for about 0.3 s, flash −28/s, the word slams from 3.2× (`expo.out`, 0.25 s); `bam.shake(t)` returns `{x, y}` so you can shake your own layer.

## Common mistakes

- `shakeEl` set to the stage itself: shake a child scene wrapper, or the frame edges show.
- Hits closer than 0.15 s: the pops merge and the count looks like one jump.

[Back to the shotcard index](b-index.md)
