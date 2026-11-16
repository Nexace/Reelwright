# Orbit ring title open

A title nucleus with satellites circling it on a drawn, tilted ring: front half bigger and above the nucleus, back half smaller and behind.

Card: video-shotcraft `orbit-ring-title-open` (1 shot), parity row `doodle-shots-motion:2.49`. Helper: `KIT.shotcards.orbitRingTitle` in `tools/shotcards/opening.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs opening`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const orb = KIT.shotcards.orbitRingTitle({ parent: scene, nucleus: titleEl, satellites: [...scene.querySelectorAll('.sat')],
  cx: KIT.W_ / 2, cy: KIT.H_ / 2, rx: 0.34 * KIT.W_, ry: 0.14 * KIT.H_, tilt: -14, t0: V('title').start, t1: V('title').end, turns: 0.5, drift: 0.25 });
function render(t) { orb.set(t); }
```

## Numbers (ours; the source card gives none)

- The ellipse draws itself over the first 60 % (dash offset), the nucleus pops with `back.out(1.7)`, satellites pop staggered, and turn `turns` revolutions over the window (power2.out), then drift at `drift` rad/s.
- Depth: scale 1 + 0.25 sin(theta), opacity 0.7 + 0.3 sin(theta), z-index 3 in front, 1 behind, nucleus 2.

## Common mistakes

- Putting satellites inside the nucleus element: they are positioned in the stage, not in the nucleus.
- `drift` > 0 means the film never holds still after `t1`; set 0 for a still end.

[Back to the shotcards index](README.md)
