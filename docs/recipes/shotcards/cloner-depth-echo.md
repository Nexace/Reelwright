# Cloner depth echo

An element and a trail of echoes of it: each a little later, smaller, softer and fainter.

Source: video-shotcraft card `cloner-depth-echo` (shots: cloner-depth-echo). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Speed or motion on a hero card or logo.
- A depth cue without a 3D camera.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const echo = KIT.shotcards.clonerDepthEcho({ el: heroEl /* absolutely positioned */, echoes: 5, lag: 0.09,
  pose: (t) => ({ x: 300 * Math.sin(t), y: 60 * Math.sin(2 * t), s: 1, r: 6 * Math.sin(t) }) });
function render(t) { echo.set(t); }
```

## Timing and easing

- Every clone evaluates the same `pose(t − (i+1)·lag)`, so the echo is the element's own path, lagged; it is exactly the lead's past.
- Depth: scale −7 % per echo, blur 1.2 px per echo, opacity `(1 − i/(n+1))^1.6`.

## Common mistakes

- The element has an id: clones drop it, but anything that looks it up by id still finds only the lead.
- `pose` that uses clocks or `Math.random`: it must be a pure function of t.

[Back to the shotcard index](b-index.md)
