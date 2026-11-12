# Collaborative cursors

Labelled cursors of several people moving at once, each with a dotted trail and a click ring.

Source: video-shotcraft card `collab-cursor-moves` (shots: collab-cursor-moves). Helper: `KIT.shotcards` in `tools/shotcards/interaction.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs interaction` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Multiplayer editing, comments, review sessions.
- Showing a team without showing faces.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `interaction.js` first, see the index):

```js
const crew = KIT.shotcards.collabCursors({ cursors: [
  { name: 'Ana', pts: [[1.0, 300, 300], [2.0, 900, 500], [3.2, 900, 500]], click: true },
  { name: 'Bo',  pts: [[1.2, 1500, 300], [2.4, 800, 700]] }] });
function render(t) { crew.set(t); }
```

## Timing and easing

- `pts` are `[time, x, y]` waypoints in stage px; each leg is an inOut ease and the cursor rests between legs. Use `W()` times for the clicks.
- The trail is `trail` dots (6) at `lag` s (0.045) steps along the same path; they only show while the cursor moves.

## Common mistakes

- Cursor paths that cross text you need to read: cursors are drawn on top.
- Real people's names for fictional users: use first names that are plainly examples.

[Back to the shotcard index](b-index.md)
