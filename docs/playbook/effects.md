# Effects: colour, blur, lighting, distortion, patterns, reveals, highlights (Phase 11, P9)

Renderer-neutral replacements for `@remotion/effects` (UNLICENSED, so not used) and `@remotion/rough-notation`, as CSS filter, SVG filter, canvas and
SVG-ribbon code, plus WebGL2 fragment shaders for the ones that need per-pixel work. Everything is a pure function of what `set(...)` is given: build
once at load, call `set` from `render(t)`. The header of each file is the API reference. Proof: `node tools/selfcheck/remotion-kit.mjs fx-color fx-blur
fx-distort fx-pattern fx-reveal hl` (pixel statistics on real screenshots, then shuffled seeks in pvk and HyperFrames), and for the WebGL2 set
`node tools/selfcheck/fx-gl.mjs` (the same, plus the renderer pass).

| Row | What | File |
|---|---|---|
| 2.3.2 colour and tone | `KIT.fx.filter({ hue, invert, saturate, … })`, `tint`, `duotone`, `exposure`, `whiteBalance`, `shadowsHighlights`, `levels`, `curves` (2-32 points, per channel, smooth or linear), `vibrance`, `colorKey` (with `spillSuppression` and `smoothness`) | `tools/fx-color.js` |
| 2.3.3 blur family | `progressiveBlur` (linear and radial), `regionBlur`, `zoomBlur`, `lensBlur`, `lightTrail`; plain blur is in `fx.filter` | `tools/fx-blur.js` |
| 2.3.4 lighting | `fx.filter({ dropShadow, glow })`, `longShadow`, `shine`, `vignette`, and the WebGL `starburst`, `filmBurn` | `tools/fx-color.js`, `tools/fx-gl.js` |
| 2.3.5 distortion | `chromaticAberration`, `noiseDisplacement`, `turbulentDisplace`, `cornerPin`, `transform` (skew, scale, translate), and canvas `barrelDistortion`, `fisheye`, `mirror`, `tile`, `wave`; the WebGL `uvTranslate` | `tools/fx-distort.js`, `tools/fx-gl.js` |
| 2.3.6 textures | `KIT.fx.pattern.*`: checkerboard, dotGrid, gridlines, lines, scanlines, rings, flannel, zigzag, waves, pattern, noise, fractalNoise, speckle, contourLines, liquidContours, paper, burlap, whiteNoise, halftone, emboss, tvSignalOff; the WebGL `halftoneLinearGradient` | `tools/fx-pattern.js`, `tools/fx-gl.js` |
| 2.3.7 edges and 3D | `outline`, `roughenEdges`, `shrinkwrap`, `tear`, `bevelAlpha`, `cylinder`, `sphere`, `pageTurn`, `shatter` | `tools/fx-gl.js` |
| 2.3.8 weather and reveal | `snowFall`, `rainFall`, `irisWipe`, `radialWipe`, `venetianBlinds`, `pixelDissolve`, `evolve`, `pixelate`, `pixelate.progressive`; the WebGL `radialProgressivePixelate` | `tools/fx-reveal.js`, `tools/fx-gl.js` |
| 2.3.10 colour gradients and LUTs | `linearGradient`, `linearGradientTint`, `thermalVision`, `lut` (`.cube`, trilinear) | `tools/fx-gl.js` |
| 2.3.11 `Trail` | `KIT.fx.trail(parent, make, { layers, lag, opacity })`: copies at `t - lag * i` (the shutter motion blur is `project.json motionBlur`) | `tools/fx-blur.js` |
| 2.5.7 text highlights | `KIT.doodle.mark(el, 'highlight' \| 'strike' \| 'crossed' \| 'box' \| 'bracket', { in, draw, out, style, color })`; underline and circle are `KIT.doodle.underline / circle` | `tools/highlight.js` |

## WebGL2 effects (`tools/fx-gl.js`)

Load after `engine.js` and `fx-color.js`. Two ways in, by what you hand the effect:

```js
// a source: canvas, <img>, <video>, ImageBitmap, or another fx handle (they chain, in call order, like Remotion's effects array)
const ring = KIT.fx.outline(canvas, { w: 1920, h: 1080, parent: KIT.stage, width: 24, color: '#ff3b6b' });
ring.set({ width: 24 * p });                        // in render(t); nothing is kept between calls
// a DOM element (a scene, a card): the page shows it plain, the renderer's pass applies the effect afterwards
KIT.fx.pageTurn(scene, { at: [turn, turn + 1.2], foldPosition: [0.7, 0.7], foldRadius: 60 });
```

- Every option is Remotion's name and default, and any option may be a function of `t` on the DOM form. `disabled: true` passes the source through.
- The DOM form runs in `tools/renderers/shader_pass.mjs`, the same pass as `KIT.shader`: outside transition windows the frame is captured without that
  element, then the element alone on transparency, and the effect's shader composites it back on top. It lands above everything else in the frame, and
  it loses to a `KIT.shader` window it overlaps.
- `lut`, `shatter` and `lightning` are source-only: they need the whole picture, not a layer.
- Needs WebGL2. Headless Chromium has it on SwiftShader, which is what the pass uses. A pvk render on a GPU-less Linux box needs
  `--enable-unsafe-swiftshader`, otherwise a source effect throws "needs WebGL2"; the hyperframes renderer always works.

## Limits

- A 3D `.cube` LUT on a DOM node needs per-pixel work; `KIT.grade` (hyperframes) already carries `.cube` for `<img>` and `<video>`. `fx.curves` and `levels`
  are per-channel 1D, which covers the Remotion `curves()` and `levels()` rows.
- Canvas effects (`zoomBlur`, `lensBlur`, `lightTrail`, the remaps, `pixelate`, `colorKey`, `vibrance`, and every `fx-gl` source effect) redraw from a
  source (`<canvas>`, `<img>`, `<video>`) on every `set`; an image from another origin taints the canvas, so use a `data:` URL or a canvas as the source.
- `progressiveBlur` and `regionBlur` are `backdrop-filter` stacks: they blur what is *below* them in the stacking order.
- The reveal masks (`pixelDissolve`, `evolve`) rebuild a small mask image per frame: fine to a few hundred cells a side.
- `lensBlur` is a plain disc kernel (no highlight boost).
- Not built: `outline`'s `edgeSimplification`, `lightning`'s other lightning types, `alphaObstacle` and `fractalType`, `magnify`'s `link`, and
  `createEffect()` (a React API). Video matting (`@remotion/video-matting`, a local ML model) is out: `colorKey` needs a keyable backdrop.
- The `fx-gl` DOM path costs three screenshots per frame with an effect active (base, layer, composite), so keep its windows short.
