# Text as mask

Media (a gradient, an image, a video poster) is seen only through the letters: `background-clip: text`, the media zooming and drifting while the letters wipe in.

Card: video-shotcraft `text-as-mask` (1 shot), parity row `doodle-shots-motion:2.52`. Helper: `KIT.shotcards.textMask` in `tools/shotcards/opening.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs opening`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const mask = KIT.shotcards.textMask({ text: 'FILM', media: 'url(assets/sea.jpg)', x: KIT.W_ / 2, y: KIT.H_ / 2,
  w: 0.8 * KIT.W_, h: 0.4 * KIT.H_, font: `900 ${0.3 * KIT.H_}px Inter, sans-serif`, t0: V('word').start, t1: V('word').end, zoom: [1.5, 1] });
function render(t) { mask.set(t); }
```

## Numbers (ours; the source card gives none)

- `media` is any CSS background value; it zooms 1.5 to 1 (power2.inOut) and drifts 8 % either way over the window; a left-to-right clip wipe reveals the letters over the first 60 %.
- Needs a heavy weight and a large size to read: thin letters show almost nothing of the media.

## Common mistakes

- A video as the media: `background-clip: text` takes images and gradients, not `<video>`; use a poster frame.
- Text longer than the box: it is `white-space: nowrap`; size `w` for it.

[Back to the shotcards index](README.md)
