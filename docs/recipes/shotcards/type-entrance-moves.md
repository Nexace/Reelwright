# Letter drop with bounce

Letters fall from above and bounce to rest, squashing on first contact.

Source: video-shotcraft card `type-entrance-moves` (shots: letter-drop-physics). Helper: `KIT.shotcards` in `tools/shotcards/typography.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs typography` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A playful title or a loading word.
- Anything that should feel physical.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `typography.js` first, see the index):

```js
const drop = KIT.shotcards.letterDrop({ text: 'DROP IT', at: snap(W('d', 'drop')), fall: KIT.dur(0.9), stagger: KIT.dur(0.06) });
KIT.cue(snap(W('d', 'drop')) + KIT.dur(0.9 / 2.75), 'tap', 0.5);   // first contact
function render(t) { drop.set(t); }
```

## Timing and easing

- Each letter uses `bounce.out` (closed form), so there is no simulation: it is the same at every fps.
- First contact is at `fall / 2.75` after the letter starts; the squash (scaleY 0.75 for 0.1 s) is keyed to it, so a cue can match.

## Common mistakes

- `fall` under 0.5 s: the bounces are too fast to read.
- `drop` larger than the frame: the letters start off screen and the first part is dead time.

[Back to the shotcard index](b-index.md)
