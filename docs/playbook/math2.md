# Math depth: TeX glyphs, shapes, plots, fields, 3D (checkpoint 10h)

Builds on the PLAYBOOK "Math" section (`tools/math.js`: axes, plot, morph, equation). Each module below is a pure function
of t, and its header comment is the API reference. `projects/math2-hf` (`"ci": true`) is the worked example: an identity
written glyph by glyph and rearranged, a complex plane warped by z², and a saddle with a helix in 3D.

| Module | Load after | Gives |
|---|---|---|
| `tools/tex.js` | `mathjax/config.js`, `mathjax/tex-svg-full.js`, `flubber/flubber.min.js` | `KIT.tex(tex, o)` → `write`, `unwrite`, `transform(other)` (TransformMatchingTex), `color(match, c)` |
| `tools/math2.js` | doodle.js, math.js (+ flubber for morphs) | `KIT.math.shape.*` (d strings), `mob`, circle/arrow/vector/brace/surround/underline/labeled, `morphShapes` |
| `tools/plot2.js` | doodle.js, math.js | `plane` (number/polar/complex), `plot2`, `parametric`, `polar`, `implicit`, `area`, `riemann`, `secant`, `tangent`, `vline`, `tLabel`, `warp`, `basis`, `field`, `streamLines` |
| `tools/math3d.js` | runtimes.js (`KIT.three`) | `KIT.math3d.scene(el, build, { phi, theta, gamma, zoom })` with axes, surface, curve, line, arrow, dot, primitives, polyhedra, glow points; camera `orient` / `ambient` |

## KaTeX or MathJax

- **`KIT.math.equation` (KaTeX, HTML)** — keep it for equations that rise in as a whole or glyph by glyph as text; it is
  what existing films use and it is unchanged. Small (273 KB) and fast.
- **`KIT.tex` (MathJax 3.2.2, SVG paths)** — use it when the glyphs must be *drawn*: Manim's Write (outline, then fill),
  TransformMatchingTex (glyphs move to their place in a new equation), morphing glyph into glyph, colouring a substring.
- Both are vendored and work offline. MathJax is the `tex-svg-full.js` build: the smaller `tex-svg.js` loads TeX extensions
  (`\color`, `\cancel`, …) from its folder at runtime; the full build has them all, so nothing is fetched
  (`tools/selfcheck/tex-offline.mjs` typesets with the network blocked and fails on any request).
- **Typesetting finishes before READY.** `MathJax.tex2svg` is synchronous once its script has loaded, and `KIT.tex` typesets
  when it is created (while film.js loads), so no frame ever renders a half-typeset equation. There is no build step
  (`tools/commands/tex.mjs` in the plan is not needed).
- `color(match, c)` matches the glyph sequence `match` renders to; a substring that renders differently on its own (size,
  variant, a stretched `\left(`) is not found, and every run with the same glyphs is coloured. `pathArc` moves each glyph's
  centre along the arc without rotating it. Mid-morph, extra subpaths grow from or shrink to a dot.

## Shapes and morphs

- Shapes are d strings in stage px (`KIT.math.shape.*`), angles in radians counter-clockwise on screen; `KIT.math.mob(d, o)`
  draws one on (stroke, then fill) with the usual `in` / `draw` / `out`.
- `morphShapes(from, to)` takes one or many paths each side (flubber interpolate / separate / combine / interpolateAll),
  built once at creation. Mid-morph outlines are polygons; pass `flubber: { maxSegmentLength: 2 }` for smoother ones.
- `surround`, `brace`, `underline` measure their target once at load: they do not follow later transforms.

## Planes, plots, calculus, fields

- `plane({ kind: 'complex' })` gives `n2p(z)`; `'polar'` gives `pr2p(r, θ)`. Use `labels: false` on a plane you warp (labels
  don't follow), and call chained warps' `set(t)` in creation order.
- `implicit(ax, F)` is native marching squares at level 0 (`res` = grid step). `streamLines` integrate once at creation
  (RK4, fixed dt, seeded) and only draw as a function of t; with `flow` a dash runs along each line.
- `tangent`, `vline` and `tLabel` take x or a function of t (a sliding tangent).

## 3D

- Manim coordinates (z up); mapped to Three as (x, z, −y). The camera is Manim's (phi, theta, gamma, zoom), keyed by
  `orient(t0, t1, …)` windows and an `ambient` rate, evaluated from t alone.
- Colours for Three must be real colours: read `--kit-*` tokens with `getComputedStyle` (the demo's `tok()`), not `var(...)`.
- Tick labels are canvas text in sans-serif (not the theme font), so a late font can't change frames. No textures,
  OBJ/GLTF models or ConvexHull3D.
- The taste check's "near-empty frame" WARN does not see WebGL content: a 3D scene reads as empty to it.

## Verified (`node tools/selfcheck/motion.mjs`, CI on macOS, Windows, Ubuntu)

Fixtures `tex`, `math2`, `plot2`, `math3d` in `tools/selfcheck/motion/`: 12 seeks forward vs shuffled on a fresh browser,
both renderers; pvk byte-identical, HyperFrames within its raster noise (measured: plot2 ≤ 8 px, the others 0 px). Each
fixture's `check()` also asserts the module's pure parts — glyph keys and write end states, matched transforms landing within
0.05 px; shape lengths, brace tips, morph ends within 0.5 px; n2p round trips, implicit points on the curve, Riemann error,
warp ends, repeatable stream lines; Manim→Three mapping, camera state independent of seek order, surface vertex counts.
