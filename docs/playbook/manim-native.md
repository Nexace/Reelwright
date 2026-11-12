# Manim, native: 18 more Manim features as plain KIT calls (Phase 11, package P4)

No Manim install, no Python, no render step. Each call is built once at load and every `.set(t)` is a pure function of t, so
the same film renders the same in pvk and HyperFrames (the shuffled-seek self-checks `tools/selfcheck/motion/p4-*.mjs` prove it).
The header comment of each module is the API reference; this page is the Manim name -> KIT name table and the load order.
Builds on [math2.md](math2.md) and [manim.md](manim.md) (the optional real-Manim renderer).

## Load order

| Module | Load after | Gives |
|---|---|---|
| `tools/manim-fx.js` | engine, doodle, math, motion | `KIT.indicate.broadcast`, `KIT.math.trace`, `animatedBoundary`, `create` (+ Uncreate), `KIT.type`, `KIT.math.phaseFlow`, `KIT.zoomInset` |
| `tools/manim-grid.js` | engine, doodle, math (math2 for `boolMob`, motion for `indicate`; katex for math cells; `vendor/polygon-clipping/polygon-clipping.umd.min.js` for the boolean ops) | `KIT.math.table`, `matrix`, `bool` / `union` / `difference` / `intersection` / `exclusion`, `flatten`, `code` |
| `tools/manim-graph.js` | engine, doodle, math, plot2 (math2 for braces and brackets, manim-grid for the matrix label) | `KIT.math.axes2`, `numberLine2`, `unitInterval`, `slider`, `bars`, `sampleSpace`, `vectorScene`, `linearScene` |
| `tools/manim-3d.js` | runtimes, math3d | `KIT.math3d.sceneExt` (model, texturedSurface, canvasTexture, lightSource, shade, billboard), `fixInFrame`, `fullScreenRect`, `project`, `parseObj` |

HyperFrames: the renderer copies every `tools/*.js` and `vendor/polygon-clipping/` into `hf/kit/`, so the same names load from `kit/`.

## Manim -> KIT

| Manim | KIT | Row |
|---|---|---|
| `Broadcast` | `KIT.indicate.broadcast(el, { n, radius, lag })` | m4.3 |
| `TracedPath`, GL `TracingTail` | `KIT.math.trace(fn, { tail, fade, taper })` | m5.8 |
| `AnimatedBoundary` | `KIT.math.animatedBoundary(el, { colors, cycleRate })` | m5.8 |
| `Union`, `Difference`, `Intersection`, `Exclusion` | `KIT.math.union / difference / intersection / exclusion(a, b, ...)`, `boolMob(op, shapes)` | m6.5 |
| `Table`, `MathTable`, `IntegerTable`, `DecimalTable`, `MobjectTable` | `KIT.math.table(data, { kind: 'text' \| 'math' \| 'integer' \| 'decimal' \| 'mobject', rowLabels, colLabels })` | m7.6 |
| `ZoomedScene` | `KIT.zoomInset(srcRect, dstRect)` | m9.2 |
| `Create`, `ShowCreation`, `Uncreate` | `KIT.math.create(items, { lag, mode })` | m3.1 |
| `AddTextLetterByLetter`, `AddTextWordByWord`, `TypeWithCursor`, `Remove…`, `Untype…` | `KIT.type(el, text, { by, mode: 'untype', cursor })` | m3.5 |
| `PhaseFlow` (`MoveAlongPath` is `KIT.path.follow`) | `KIT.math.phaseFlow(plane, F, { from })` | m5.5 |
| `Matrix`, `DecimalMatrix`, `IntegerMatrix`, `MobjectMatrix`, GL `TexMatrix` | `KIT.math.matrix(data, { kind })` | m7.5 |
| `Code` | `reelwright code <p> highlight file.py` then `KIT.math.code('id')` (shiki at build time) | m7.7 |
| `Axes` (tips, `axis_config`, `add_coordinates`, `get_axis_labels`, `LogBase`) | `KIT.math.axes2({ tips, xAxis, yAxis: { scale: 'log' } })` | m8.1 |
| `NumberLine`, `UnitInterval`, GL `Slider` | `KIT.math.numberLine2`, `unitInterval`, `slider` | m8.2 |
| `BarChart`, `SampleSpace` | `KIT.math.bars`, `sampleSpace` | m8.7 |
| `VectorScene`, `LinearTransformationScene` | `KIT.math.vectorScene`, `linearScene(matrix, { matrixLabel })` | m8.10 |
| `add_fixed_in_frame_mobjects`, `add_fixed_orientation_mobjects`, `FullScreenRectangle` | `KIT.math3d.fixInFrame`, `api.billboard`, `fullScreenRect` | m9.5 |
| `light_source`, shading, `TexturedSurface`, `ThreeDModel` | `api.lightSource`, `api.shade`, `api.texturedSurface`, `api.model` (inside `KIT.math3d.sceneExt`) | m9.9 |
| layout lint (OFF-FRAME / TEXT-OVERLAP / TINY-TEXT), pace lint | `reelwright_manim.texts` + `tools/checks/manim-texts.page.mjs`, `manim-pace.page.mjs`, `reelwright manim-lint` | m11.2, m11.3 |

## Things to know

- **Order of `set(t)`.** `KIT.zoomInset(...).set(t)` last: it clones the layer as the other `set` calls left it. Canvases are copied
  pixel for pixel; a WebGL canvas only if its context keeps the drawing buffer (the `KIT.three` one does).
- **Log axes.** `yAxis: { scale: 'log' }` takes the range in exponents (`[0, 3, 1]` = 1 ... 1000) and `c2p`, `p2c` and `KIT.math.plot`
  take real values (`c2p(2, 100)` sits at exponent 2).
- **Booleans are polylines.** Curves are sampled to 0.05 px before `polygon-clipping` (a circle comes out about 0.3 % small in area);
  holes survive (even-odd fill). Chain results: `union(union(a, b), c)`.
- **Code highlighting is build time.** `reelwright code <project> highlight file.js [--lang L] [--theme github-dark|github-light] [--id name]`
  writes `film/code-<id>.js` (HyperFrames: `hf/code-<id>.js`); the page never runs shiki. Languages: js, ts, python, json, bash, html, css.
- **Models are OBJ text.** `reelwright code <project> model thing.obj` writes `model-<id>.js`; `api.model('id', { height: 2, up: 'y' })`.
- **Lights.** `sceneExt(..., { lights: false })` then `api.lightSource(posOrFn)`; with the default lights the source only adds to them.
- **Lint.** A Manim scene opts into the text lint with `texts.snapshot(self, self.rw, 'label')` after what you want checked has landed and
  `texts.write(self.rw)` at the end of `construct()`; `qa` then gates OFF-FRAME, TEXT-OVERLAP and TINY-TEXT. Pace lines (RUSHED over
  2.5 words/s, GAP over 4 s, UNNARRATED under 15 %, and the `unnarrated N %` info line) show for films with a `"manim"` block, or `"qa": { "pace": true }`.
  Dark stretches are QA's `dark` WARN; `reelwright manim-lint <p> dark --video file.mp4` runs the same idea on any clip.
- **Font size estimate.** The exporter turns Manim's `font_size` into pixels as `font_size / 100 * px per scene unit` (not checked against a live Manim here).

## Self-checks

`node tools/selfcheck/motion.mjs p4-fx p4-grid p4-graph p4-3d` (browser, both renderers, shuffled seeks plus the numbers),
`node tools/selfcheck/p4-bool.mjs`, `p4-code.mjs`, `p4-obj.mjs`, `p4-lint.mjs` (no browser; the last also runs the Python exporter test).
