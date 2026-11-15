# Effects: colour, blur, lighting, distortion, patterns, reveals, highlights (Phase 11, P9)

Renderer-neutral replacements for `@remotion/effects` (UNLICENSED, so not used) and `@remotion/rough-notation`, as CSS filter, SVG filter, canvas and
SVG-ribbon code. Everything is a pure function of what `set(...)` is given: build once at load, call `set` from `render(t)`. The header of each file is
the API reference. Proof: `node tools/selfcheck/p9-motion.mjs fx-color fx-blur fx-distort fx-pattern fx-reveal hl` (pixel statistics on real screenshots,
then shuffled seeks in pvk and HyperFrames).

| Row | What | File |
|---|---|---|
| 2.3.2 colour and tone | `KIT.fx.filter({ hue, invert, saturate, … })`, `tint`, `duotone`, `exposure`, `whiteBalance`, `shadowsHighlights`, `levels`, `curves` (2-32 points, per channel, smooth or linear), `vibrance`, `colorKey` | `tools/fx-color.js` |
| 2.3.3 blur family | `progressiveBlur` (linear and radial), `regionBlur`, `zoomBlur`, `lensBlur`, `lightTrail`; plain blur is in `fx.filter` | `tools/fx-blur.js` |
| 2.3.4 lighting | `fx.filter({ dropShadow, glow })`, `longShadow`, `shine`, `vignette` | `tools/fx-color.js` |
| 2.3.5 distortion | `chromaticAberration`, `noiseDisplacement`, `turbulentDisplace`, `cornerPin`, `transform` (skew, scale, translate), and canvas `barrelDistortion`, `fisheye`, `mirror`, `tile`, `wave` | `tools/fx-distort.js` |
| 2.3.6 textures | `KIT.fx.pattern.*`: checkerboard, dotGrid, gridlines, lines, scanlines, rings, flannel, zigzag, waves, pattern, noise, fractalNoise, speckle, contourLines, liquidContours, paper, burlap, whiteNoise, halftone, emboss, tvSignalOff | `tools/fx-pattern.js` |
| 2.3.8 weather and reveal | `snowFall`, `rainFall`, `irisWipe`, `radialWipe`, `venetianBlinds`, `pixelDissolve`, `evolve`, `pixelate`, `pixelate.progressive` | `tools/fx-reveal.js` |
| 2.3.11 `Trail` | `KIT.fx.trail(parent, make, { layers, lag, opacity })`: copies at `t - lag * i` (the shutter motion blur is `project.json motionBlur`) | `tools/fx-blur.js` |
| 2.5.7 text highlights | `KIT.doodle.mark(el, 'highlight' \| 'strike' \| 'crossed' \| 'box' \| 'bracket', { in, draw, out, style, color })`; underline and circle are `KIT.doodle.underline / circle` | `tools/p9-highlight.js` |

## Limits

- A 3D `.cube` LUT on a DOM node needs per-pixel work; `KIT.grade` (hyperframes) already carries `.cube` for `<img>` and `<video>`. `fx.curves` and `levels`
  are per-channel 1D, which covers the Remotion `curves()` and `levels()` rows.
- Canvas effects (`zoomBlur`, `lensBlur`, `lightTrail`, the remaps, `pixelate`, `colorKey`, `vibrance`) redraw from a source (`<canvas>`, `<img>`, `<video>`) on every
  `set`; an image from another origin taints the canvas, so use a `data:` URL or a canvas as the source.
- `progressiveBlur` and `regionBlur` are `backdrop-filter` stacks: they blur what is *below* them in the stacking order.
- The reveal masks (`pixelDissolve`, `evolve`) rebuild a small mask image per frame: fine to a few hundred cells a side.
- `lensBlur` is a plain disc kernel (no highlight boost).
