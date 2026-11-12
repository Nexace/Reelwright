# List stack press

A list of rows; a finger presses one and the stack compresses around it, then springs back.

Source: video-shotcraft card `list-stack-press` (shots: list-stack-press). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Showing a tap on a list item without a phone mockup.
- A spring-loaded interaction.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const press = KIT.shotcards.listStackPress({ rows: ['Inbox', 'Drafts', 'Sent', 'Archive'], row: 1, at: snap(W('p', 'tap')), hold: KIT.dur(0.5) });
KIT.cue(snap(W('p', 'tap')) + KIT.dur(0.4), 'tap');
function render(t) { press.set(t); }
```

## Timing and easing

- The finger arrives over `pressAt − 0.1 s`; the press-in takes 0.18 s, the hold `hold`, then a spring (damping 9, stiffness 160) releases with an overshoot.
- The pressed row scales to 0.93 × 0.88; neighbours within a row or two shrink less and shift towards it.

## Common mistakes

- Pressing the first or last row without checking: the squash is one-sided; that is correct but check the look.
- Too many rows: neighbours beyond two barely move.

[Back to the shotcard index](b-index.md)
