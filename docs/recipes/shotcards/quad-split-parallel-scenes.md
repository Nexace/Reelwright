# Quad split of parallel scenes

Four sub-scenes on a 2 x 2 grid, each on its own clock, each built with the film's normal coordinates.

Card: video-shotcraft `quad-split-parallel-scenes` (1 shot), parity row `doodle-shots-motion:2.62`. Helper: `KIT.shotcards.quadSplit` in `tools/shotcards/rhythm.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs rhythm`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const quad = KIT.shotcards.quadSplit({ gap: 12 * KIT.u, offsets: [0, 0.4, 0.8, 1.2], t0: V('quad').start });
// build each sub-scene into quad.cells[i].inner (a W x H element scaled to fit its cell), e.g. KIT.browser(quad.cells[i].inner, ...)
function render(t) {
  quad.set(t);
  subScenes.forEach((s, i) => s.set(quad.local(i, t)));   // local(i, t) = t - offsets[i]
}
```

## Numbers (ours; the source card gives none)

- Each cell is `overflow: hidden`; its `inner` is the full frame at `scale(cell / frame)` from the top-left, so sub-scene code needs no changes.
- Cells pop in (scale .92 to 1, fade, power3.out, 0.35 s) `K.stagger` apart over the first 0.3 s.

## Common mistakes

- Sub-scene text at a quarter of the frame is small: use big type in the sub-scenes (the PLAYBOOK size floor applies after scaling).
- Sharing one `KIT.stage`-parented helper between cells: pass `parent: quad.cells[i].inner`.

[Back to the shotcards index](README.md)
