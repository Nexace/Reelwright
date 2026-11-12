# 3D terminal

A terminal that starts small and tilted in space, flies to near-frontal, and only then types: the camera arrives, then the text.

Card: video-shotcraft `terminal-3d` (1 shot), parity row `doodle-shots-motion:2.10`. Helper: `KIT.shotcards.terminal3d` in `tools/shotcards/camera.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs camera`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const term = KIT.shotcards.terminal3d({ layer: scene, el: codeEl, text: 'npm run build\n> ok 42 files',
  t0: V('term').start, t1: V('term').start + KIT.dur(1.2), cps: 22, mistakes: [{ index: 4, wrong: 'rum' }] });
function render(t) { term.set(t); }   // term.end = when the text is complete
```

## Numbers (ours; the source card gives none)

- Default tour: z .85, rx 14, ry -30, rz -3 to z 1.12, rx 3, ry -8 (power2.out), persp 900. Pass `poses` for your own.
- Typing starts `gap` = 0.2 s after the last pose (`KIT.typewriter`; needs motion.js), so nothing types while the camera moves.

## Common mistakes

- Making the terminal a different size from the frame: put it in `layer` and let the layer be frame-sized, so the tour numbers stay meaningful.
- Wrapping long lines: `white-space: pre`, and size the box for the longest line.

[Back to the shotcards index](README.md)
