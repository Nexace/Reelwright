# Scroll brake (changelog, reticle lock)

A list that scrolls at speed and brakes onto one row: the row you want the viewer to read lands under a lock-on reticle.

Source: video-shotcraft card `scroll-brake-moves` (shots: changelog-scroll-brake, brake-reticle-lock). Helper: `KIT.shotcards` in `tools/shotcards/data.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs data` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A changelog or release-notes list where one entry is the point.
- Any long list that has to end on a specific row without a hard stop.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `data.js` first, see the index):

```js
// 'changelog': the landing row grows and takes the accent
const log = KIT.shotcards.scrollBrake({ rows: notes /* [{ tag: 'v2.4', text: '…' }] */, target: 10, at: snap(W('log', 'new')), dur: KIT.dur(2.4) });
// 'reticle': the same scroll, a bracket reticle wanders wide and snaps onto the row as the scroll slows
const lock = KIT.shotcards.scrollBrake({ rows: notes, target: 10, variant: 'reticle', at: snap(W('log', 'new')) });
function render(t) { log.set(t); }
```

## Timing and easing

- The scroll cruises for the first 55 % of `dur` (`cruise`), then brakes with a power-3 decel (`power`). The two speeds match exactly (a = n·c / (n·c + 1 − c)), so there is no visible gear change.
- `log.velocity(t)` is the scroll speed in px/s: use it to time a `whoosh` cue at the start and a `tap` when it reaches 0.
- Blur on the list follows the speed, so the fast part is soft and the landing is sharp.

## Common mistakes

- Making `dur` shorter than about 1.6 s: the cruise part vanishes and it reads as one long ease.
- Picking a `target` near the end of the list: the rows below it are missing, so the landing row sits low. Keep a few rows after the target.

[Back to the shotcard index](b-index.md)
