# Nested compositions — `KIT.mount`

A HyperFrames composition file (a `<template>` whose root has `data-composition-id` and whose script registers
`window.__timelines[<id>]`) can be dropped into any film as one timed layer. Use it for a piece made elsewhere — a
catalog scene, a lower third you reuse across films, an export from HyperFrames Studio — when rebuilding it in
film.js isn't worth it.

```html
<script src="kit/compose.js"></script>            <!-- hf, after kit/engine.js -->
<script src="../../../tools/compose.js"></script> <!-- pvk, after tools/engine.js -->
```

```js
// film.js: hf/compositions/lower-third.html (hf) or film/compositions/lower-third.html (pvk)
const lt = KIT.mount('lower-third', { start: V('name').start, dur: V('name').end - V('name').start + 0.6,
  playbackStart: 0, vars: { title: 'Ada Lovelace' } });   // → the host div, position it like any element
KIT.css(lt, { transform: `scale(${KIT.u})` });
```

- Times come from the call (`W()`, `V()`, `KIT.snap()`), never from the child file. The child is seeked to
  `playbackStart + clamp(t − start, 0, dur)` after your own `render(t)`, and its host is `display: none` outside
  `[start, start + dur)`.
- The child's timeline only needs `seek(t)` (and optionally `pause()`): a paused GSAP timeline works if the film
  loads GSAP, so does a plain `{ seek(t) { … } }` object. Keep it a pure function of `t`, like `render(t)`.
- `vars` are written to the host's `data-variable-values`, and `window.__hyperframes.getVariables()` returns them
  while the child's scripts run (read them at load, not inside `seek`).
- Scope the child's queries to its own copy: `document.currentScript.parentNode.querySelector(…)`. A
  `document.querySelector('[data-composition-id="x"] …')` finds only the first mount of the same file.
- The child's CSS is not scoped: prefix its selectors with `[data-composition-id="x"]`, as HyperFrames asks.

## How it works, per renderer

Both renderers use the same path: `compose.js` fetches the file with a synchronous XHR (like `KIT.block`), inlines
the template into a host div, re-creates its scripts so they run, and **moves the child's timeline out of
`window.__timelines`** into its own list. On the hf renderer that keeps the HyperFrames runtime from seeking it a
second time as a scene (the runtime seeks every non-root `__timelines` entry whose `data-composition-id` it finds in
the DOM, which the inlined root has). The root also gets `data-no-timeline`, or the producer waits 45 s per render
for a timeline it never sees. Don't put `data-start`/`data-duration` on the child's root: the producer then treats it as a timed clip and
hides the mount after that duration (seen in projects/engine-hf); `KIT.mount`'s `start`/`dur` set the window. HyperFrames' own `data-composition-src` host, created by film.js at load, was
tried: the runtime loads it and shows and hides it on time, but a `{ seek(t) }` child timeline stayed at its first
frame. KIT.mount does not use that host.

| | hf | pvk |
|---|---|---|
| child placed and seeked at the right times | yes | yes |
| `vars` / `getVariables()` at load | yes | yes |
| media (`<video data-start>`, `<audio>`) inside the child | not re-timed — put media in the film | no |
