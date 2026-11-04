# Phase 10 audit: Manim (CE + ManimGL) vs Reelwright 0.2

Sources: albertobarnabo/manim-craft (MC), adithya-s-k/manim_skill (MS: CE docs MIT; GL docs CC BY-NC-SA, features listed, nothing copied),
Manim Community Edition 0.22.1 (CE), ManimGL (GL), manim-voiceover 0.4.0 (MV). Extends docs/archive/plans/phase-9-research/manim.md; the
Phase 9 verdict stands for the *default* path (native JS), and this file adds the optional-renderer design the owner asked for.

Verified 2026-11-05 by reading: `manim-0.22.1-py3-none-any.whl` unzipped (the library source), `manim_voiceover-0.4.0` wheel,
`3b1b/manim` master `fafa083` (2026-09-09) and the `manimgl==1.7.2` wheel, the MC and MS clones (scratch/phase10/src/), PyPI/npm/GitHub
metadata (licences, wheel lists, sizes), docs.manim.community install pages. **Nothing was installed or rendered**: this Mac has no
cairo/pkg-config and the brief forbids installs outside scratch, so every runtime behaviour below (headless GL, byte-determinism, render
speed, HyperFrames playing an image sequence) is source-read only and marked UNVERIFIED where it matters.

## Headline findings

1. **Manim CE 0.22.1 changed the picture since Phase 9.** It encodes with PyAV (no ffmpeg binary needed by Manim), writes `png-sequence`
   RGBA, and has `Typst`/`MathTypst` mobjects (`pip install manim[typst]`, `typst` 0.15.0 wheels exist for macOS/Windows/Linux, ~30 MB, Apache-2.0).
   So **LaTeX is no longer mandatory for CE equations**; TinyTeX is only needed for real LaTeX. Python >= 3.11.
2. **Frame-to-time mapping is controllable.** CE and GL both render `ceil(run_time * fps)` frames per `play`/`wait`
   (CE `np.arange(0, run_time, 1/fps)`; GL `np.arange(0, run_time, 1/fps) + 1/fps`), so a bridge that passes `(n - 0.5)/fps` and asserts the
   final frame count against Reelwright's film clock lands on exact frames. **Trap (CE, source line `cairo_renderer.py:224`)**: a static
   `wait()` writes `int(duration/dt)` frames *and in `png-sequence` mode writes ONE png for the whole hold* (`output_image` per
   `write_frame`, ignoring `repeat`). Do not index png-sequence by frame number; render `.mov`/`.webm` and extract with ffmpeg, and force
   `frozen_frame=False` in every wait. GL writes every frame (no frozen shortcut).
3. **ManimGL has two different tracks.** PyPI/GitHub release **1.7.2 (2024-12-13)** = moderngl + pyglet/OpenGL. GitHub **master (Sep 2026,
   unreleased; latest release tag is still v1.7.2)** is a wgpu rewrite (`wgpu`, `glfw`, `rendercanvas`, `.wgsl` shaders, `trimesh`,
   `VideoMobject`, `Sprite`, `random_seed=0` default). Plan on 1.7.2 as the supported pin and master (pinned by commit) as an opt-in preview.
4. **Both Manims are MIT** (CE: PyPI licence_expression MIT; GL: `gh api` MIT, LICENSE.md © 3Blue1Brown LLC 2020-2026). Reelwright vendors
   nothing: a separate `uv` venv, a process boundary, the author's frames are the product.
5. **Do not make Manim a whole-film renderer first.** Reelwright's value (captions, themes, layouts, formats, DOM QA) lives in the page.
   Primary shape: a **`manim` scene block rendered to a cached, alpha-capable frame sequence and played by `KIT.manim()`** inside a normal
   film. A pure-Manim `"renderer": "manim"` is a thin second step on the same driver.
6. **Native JS first.** Most Manim authors' day-to-day (axes, plot, Write, morph, equations, 2D transforms, 3D surfaces via Three.js) can
   ship natively so films without Python still get them. The optional renderer is for what JS will not reach soon (full LaTeX, Pango text
   paths, manim ecosystem plugins, GL fractal shaders, existing scene code the author already has).

Legend: **Status** = EQUAL / BETTER / PARTIAL / MISSING vs Reelwright 0.2 with the file that proves it. **Approach** = native rewrite
(JS in tools/) / vendor lib / optional renderer / docs. **Licence** = of anything vendored (own code = none). Effort S/M/L.
Source paths: CE = `manim/` in the 0.22.1 wheel; GL = `manimlib/` (master unless "1.7.2"); MC/MS paths relative to their repos.

## Checklist

| Feature | Where in source | Reelwright 0.2 status (proof) | Approach to reach EQUAL-or-BETTER | Licence | Effort |
|---|---|---|---|---|---|
| **Scene model, config, output** | | | | | |
| Sequential `construct()` with `play()`/`wait()` timeline | CE scene/scene.py, GL scene/scene.py | BETTER: `render(t)` is pure and random-access, parallel frames (tools/engine.js, pvk.mjs) | none; optional renderer maps Reelwright time onto it | n/a | S |
| `run_time`, `lag_ratio`, `rate_func`, `remover`, `introducer` per animation | CE animation/animation.py | EQUAL: `K.seg`, `K.local`, `K.stagger`, `K.easing` (tools/engine.js:10-110) | docs: one PLAYBOOK table "Manim call -> KIT call" | n/a | S |
| `AnimationGroup`, `Succession`, `LaggedStart`, `LaggedStartMap` | CE animation/composition.py | EQUAL: `K.stagger`, `K.staggerStep`, `K.local` (PLAYBOOK Motion) | docs | n/a | S |
| `.animate` builder, `MoveToTarget`/`generate_target`, `save_state`/`Restore`, `become` | CE mobject/mobject.py, animation/transform.py | EQUAL: `K.keys(t, pts, eases)` keyframes, closed form in t | docs | n/a | S |
| Updaters (`add_updater`, `dt` form), `always_redraw`, `UpdateFromFunc`, `UpdateFromAlphaFunc`, `MaintainPositionRelativeTo`, GL `.always`/`f_always` | CE animation/updaters, GL mobject_update_utils | BETTER for closed-form (recompute in `render(t)`); PARTIAL for dt-accumulating state (no stateful sims) | native: `KIT.sim(step, state0, dt)` precomputes a fixed-step table at load, `.at(t)` interpolates | own code | M |
| `ValueTracker`, `ComplexValueTracker`, GL `ExponentialValueTracker` | CE/GL value_tracker.py | EQUAL: a number computed from t; `K.count` for tickers (engine.js:408) | docs | n/a | S |
| `Wait` with `stop_condition`, `wait_until` | CE scene.py:1242,1296 | N/A by design (data-driven timing; stop conditions are time-dependent state) | docs: use `W()`/`V()` | n/a | S |
| Sections (`next_section`, `--save_sections`), `add_subcaption` (SRT) | CE scene/section.py, scene.py:1726 | EQUAL: beats sheet, VO lines, captions from real word times (tools/beats.mjs, sched.py) | none | n/a | S |
| `add_sound` | CE scene.py:1768 | BETTER: mix.py ducks music, normalises, places SFX cues | optional renderer ignores Manim audio | n/a | S |
| Frame size/fps/background/`transparent`/quality presets (`-ql..-qk`, `-r`, `--fps`, `-c`) | CE _config, GL config.py | EQUAL: project.json width/height/fps, `--formats` (render.mjs) | none | n/a | S |
| Last-frame still (`-s`), start/end animation (`-n a,b`) | CE render_options.py, GL `-n` | EQUAL: `stills t,t`, `frames from to` (render.mjs) | none | n/a | S |
| Output formats mp4/gif/webm/mov/png/png-sequence; GL `-i` gif, `-t` alpha mov | CE render_options.py:150; GL config.py:110-125 | PARTIAL: mp4 (+ README gif samples); no alpha export | native: `encode --format webm|mov` alpha path from page screenshots (omit background) | own code | M |
| Segment cache (partial movie files), `--flush_cache`, `manim cache`; GL `diskcache` for Tex/Text | CE utils/caching.py, GL utils/cache.py | BETTER: per-frame DOM fingerprint cache (.cache/frames, pvk.mjs fingerprint) | optional renderer: own input-hash cache, Manim's own cache disabled (MC landmine 14) | own code | M |
| Deterministic seed (`config.seed`, Scene `random_seed`; GL master default 0) | CE scene.py:188, GL scene.py:53 | BETTER: no randomness allowed (`seekable` gate, qa.py) | optional renderer sets seed + PYTHONHASHSEED | n/a | S |
| `manim checkhealth`, `manim plugins`, `%%manim` Jupyter magic | CE cli, utils/ipython_magic.py | EQUAL for the use case: `preview` scrubber, `stills` + sheet.jpg (preview.mjs, sheet.py) | optional: `reelwright manim doctor` | own code | S |
| **Rate functions** | | | | | |
| `linear`, `smooth`, `smoothstep/smootherstep/smoothererstep`, `there_and_back`, ease_in/out/in_out of sine, quad, cubic, quart, quint, expo, circ, back, elastic, bounce | CE utils/rate_functions.py | EQUAL: `K.easing('power2.out'|'sine.inOut'|'elastic.out'|…')` + `M.ease.smooth/thereAndBack` (engine.js:35-60, math.js:25) | none | n/a | S |
| `rush_into`, `rush_from`, `slow_into`, `double_smooth`, `there_and_back_with_pause`, `running_start`, `not_quite_there`, `wiggle`, `squish_rate_func`, `lingering`, `exponential_decay`, GL `overshoot` | CE rate_functions.py, GL utils/rate_functions.py | MISSING | native: add to `KIT.math.ease` (closed forms) | own code | S |
| **Creation / removal animations** | | | | | |
| `Create` / GL `ShowCreation` (stroke draw-on), `Uncreate` | CE animation/creation.py | PARTIAL: `K.doodle.drawOn(el, p)` per path (doodle.js:57); no whole-group sequential draw | native: `KIT.math.create(group, {lag})` over sub-paths | own code | S |
| `DrawBorderThenFill` | CE creation.py | MISSING | native (stroke draw-on then fill fade, same helper) | own code | S |
| `Write` / `Unwrite` (glyph stroke-then-fill, text and Tex) | CE creation.py, GL creation.py | PARTIAL: `equation()` glyphs rise+fade, no stroke (math.js:163) | native: build-time **MathJax** SVG (glyph paths) or Typst SVG, then `write()`; fonts via opentype.js for plain Text | Apache-2.0 (MathJax 3.2.2, 34 MB, build-step only), Apache-2.0 (typst), MIT (opentype.js) | M |
| `SpiralIn`, `ShowIncreasingSubsets`, `ShowSubmobjectsOneByOne`, `ShowPartial` | CE creation.py | EQUAL: staggered opacity/draw via `K.stagger` | docs | n/a | S |
| `AddTextLetterByLetter`, `RemoveTextLetterByLetter`, `AddTextWordByWord`, `TypeWithCursor`, `UntypeWithCursor` | CE creation.py, GL AddTextWordByWord | PARTIAL: `K.words` per VO word, HF catalog `caret-swap`/`bottom-up-letters` | native: `KIT.type(el, {cps, cursor})` pure in t | own code | S |
| `FadeIn`/`FadeOut` (shift, scale), GL `FadeInFromPoint/OutToPoint`, `VFadeIn/Out/InThenOut`, `FlashyFadeIn` | CE fading.py, GL fading.py/indication.py | EQUAL: opacity+transform in layouts/`K.E` | docs | n/a | S |
| `GrowFromPoint/Center/Edge`, `GrowArrow`, `SpinInFromNothing` | CE growing.py | EQUAL via CSS transform + easing | docs | n/a | S |
| **Indication animations** | | | | | |
| `Indicate`, `Flash`, `FocusOn`, `Circumscribe`, `Wiggle`, `Blink`, `ApplyWave`, `ShowPassingFlash(+ThinningStrokeWidth)` | CE indication.py | PARTIAL: `K.doodle.circle/underline` (Circumscribe-like), MC "rack-focus" is docs only | native: `KIT.math.indicate.*` (pulse, flash rays, wave, passing stroke) | own code | M |
| GL-only: `CircleIndicate`, `FlashAround`, `FlashUnder`, `ShowCreationThenDestruction(Around)`, `ShowCreationThenFadeOut/Around`, `WiggleOutThenIn`, `TurnInsideOut`, `AnimationOnSurroundingRectangle` | GL animation/indication.py | PARTIAL: same helpers cover most | native: same module | own code | S |
| `Broadcast` (expanding rings) | CE specialized.py, GL specialized.py | MISSING (HF catalog has confetti, not rings) | native | own code | S |
| **Transform family** | | | | | |
| `Transform`, `ReplacementTransform`, `TransformFromCopy`, `ClockwiseTransform`/`CounterclockwiseTransform` (path_arc) | CE transform.py | PARTIAL: `morph()` one subpath, straight-line interpolation, no colour/stroke interpolation (math.js:121) | vendor **flubber** for multi-subpath + hole handling; native colour/width lerp; `path_arc` as arc interpolation of points | MIT (flubber 0.4.2, 88 KB) | M |
| `TransformMatchingShapes`, `TransformMatchingTex`, GL `TransformMatchingStrings`, `TransformMatchingParts`, `FadeTransform(Pieces)` | CE transform_matching_parts.py, GL same | PARTIAL: FadeTransform = crossfade+scale (EQUAL); matching MISSING | native: glyph-path matcher (MathJax ids / `\htmlId`) + flubber for the rest | MIT/Apache above | M |
| `ApplyMethod`, `ScaleInPlace`, `ShrinkToCenter`, `Rotate`/`Rotating`, `FadeToColor`, `Swap`, `CyclicReplace`, `ApplyFunction` | CE transform.py, rotation.py | EQUAL: transforms and `K.keys` | docs | n/a | S |
| `ApplyPointwiseFunction`, `ApplyMatrix`, `ApplyComplexFunction`, `Homotopy`, `ComplexHomotopy`, `SmoothedVectorizedHomotopy` (grid warp) | CE transform.py, movement.py | MISSING (Phase 9 `gridWarp` never built) | native: `KIT.math.warp(plane, f|matrix, {in, dur})` resampling lines | own code | M |
| `PhaseFlow`, `MoveAlongPath` | CE movement.py | EQUAL for MoveAlongPath (`plot.pointAt`, HF `arc-motion-path`); PhaseFlow MISSING | native `KIT.sim` + `flow()` | own code | S |
| `ChangeSpeed` | CE speedmodifier.py | EQUAL/BETTER: `K.clip` anchors, shots speed ramps (engine.js:246, shots.js) | docs | n/a | S |
| `ChangingDecimal`, `ChangeDecimalToValue`, GL `CountInFrom` | CE/GL numbers.py | EQUAL: `K.count` (engine.js:408) | docs | n/a | S |
| `TracedPath`, `AnimatedBoundary`, GL `TracingTail` | CE changing.py, GL changing.py | PARTIAL: `plot.pointAt` + manual trail | native: `KIT.math.trace(fn, {tail, fade})` | own code | S |
| **Geometry mobjects** | | | | | |
| `Circle`, `Dot`, `Ellipse`, `Arc`, `ArcBetweenPoints`, `TangentialArc`, `Annulus`, `Sector`, `AnnularSector`, `CubicBezier`, GL `SmallDot` | CE geometry/arc.py, GL geometry.py | PARTIAL: author writes SVG/CSS by hand; no helper API, no draw-on convention | native: `KIT.math.shape.*` returning draw-on-ready SVG with theme tokens | own code | M |
| `Square`, `Rectangle`, `RoundedRectangle`, `Triangle`, `Polygon`, `Polyline`, `RegularPolygon(ram)`, `Star`, `Cutout`, `ConvexHull`, `ArcPolygon`, `Polygram` | CE geometry/polygram.py | PARTIAL (same) | native (same module; ConvexHull via own 20-line hull) | own code | M |
| `Line`, `DashedLine`, `TangentLine`, `Elbow`, `Arrow`, `Vector`, `DoubleArrow`, `CurvedArrow`, `StrokeArrow`, `Angle`, `RightAngle`, tips (`ArrowTriangleTip`, `Stealth`, circle, square) | CE geometry/line.py, tips.py | PARTIAL: lines yes by hand; arrow tips/angle arcs MISSING | native `shape.arrow/angle/tip` | own code | M |
| `SurroundingRectangle`, `BackgroundRectangle`, `Cross`, `Underline`, `Brace`, `BraceLabel`, `BraceBetweenPoints`, `ArcBrace`, GL `LineBrace` | CE shape_matchers.py, svg/brace.py | PARTIAL: `K.doodle.underline/circle` only | native: `shape.brace/surround` measuring DOM boxes once at load | own code | S |
| Boolean ops `Union`, `Difference`, `Intersection`, `Exclusion` | CE boolean_ops.py (skia-pathops), GL same | MISSING | vendor **polygon-clipping** (polygons) or own for convex; path-level via flubber sampling | MIT (polygon-clipping 0.15.7) | M |
| `Label`, `LabeledDot`, `LabeledLine`, `LabeledArrow`, `LabeledPolygram`, `AnnotationDot` | CE geometry/labeled.py | PARTIAL: DOM label next to element | native in shape module | own code | S |
| `Group`, `VGroup`, `VDict`, `arrange`, `arrange_in_grid`, `next_to`, `to_edge`, `align_to`, `match_*`, `get_center`, z-index | CE mobject/mobject.py | BETTER: CSS flex/grid, layouts, `KIT.safe` (layouts.js) | none | n/a | S |
| Colours: 130+ named constants (`BLUE_A..E`), `ManimColor`, `interpolate_color`, `color_gradient`, `set_color_by_gradient`, `set_sheen`, fill/stroke opacity, backstroke | CE utils/color, GL utils/color.py | PARTIAL: theme tokens (`--kit-*`), CSS gradients; no palette constants | native: `KIT.color.manim` palette table (facts, no code copied) + lerp; docs | own code | S |
| `SVGMobject`, `ImageMobject`, GL `VideoMobject`/`Sprite`, `PMobject`, `DotCloud`, `GlowDot(s)`, `TrueDot` | CE svg_mobject.py, image_mobject.py; GL types/ | EQUAL for SVG/images/video (`K.img`, `K.clip`, doodle.drawOn on inline SVG); point clouds/glow MISSING | native: canvas/Three `Points` helper (M); video via K.clip | MIT (three) | M |
| **Text, numbers, tables, code** | | | | | |
| `Text`, `MarkupText`, `Paragraph` (Pango, fonts, `t2c`/`t2f`/`t2s`/`t2w` per-substring style; GL `Text`) | CE text_mobject.py, GL text_mobject.py | BETTER: browser text, bundled OFL fonts, CSS (fonts/, kit.css); per-substring style = spans | docs: `KIT.rich(el, {word: style})` helper | own code | S |
| `MathTex`/`Tex` (LaTeX), `substrings_to_isolate`, `tex_to_color_map`, `set_color_by_tex`, GL `Tex(isolate, t2c)`, `TexText` | CE tex_mobject.py, GL tex_mobject.py | PARTIAL: KaTeX covers most math but no packages/tikz/physics; no per-part colour or isolate API (math.js:138) | native: `equation(tex, {colors: {'x': 'accent'}})` via `\htmlClass`/`\textcolor`; mhchem contrib from vendored KaTeX; real LaTeX = optional renderer | MIT (KaTeX) | S |
| `Typst`, `MathTypst` (+ `select` labels) | CE text/typst_mobject.py | MISSING | native option: Typst via `@myriaddreamin/typst-ts-node-compiler` at build time to SVG glyph paths (UNVERIFIED output ids); or inside the Manim renderer | Apache-2.0 | M |
| `DecimalNumber`, `Integer`, `Variable`, GL `DecimalNumber` | CE text/numbers.py | EQUAL: `K.count` + tabular-nums | docs | n/a | S |
| `Matrix`, `DecimalMatrix`, `IntegerMatrix`, `MobjectMatrix`, GL `TexMatrix` | CE matrix.py | PARTIAL: KaTeX `bmatrix` in `equation()` (PLAYBOOK Math), cell highlight/entry animation missing | native: HTML grid + brackets, entry `Indicate` | own code | S |
| `Table`, `MathTable`, `IntegerTable`, `DecimalTable`, `MobjectTable` | CE table.py | PARTIAL: HTML tables by hand | native `KIT.table` | own code | S |
| `Code` (syntax highlighting), GL `Code` | CE text/code_mobject.py, GL text_mobject.py | PARTIAL: HF `code-terminal-run` | native: build-time highlight (shiki, MIT) to spans, line-by-line reveal | MIT (shiki, UNVERIFIED version) | M |
| `BulletedList`, `Title`, GL `TexTextFromPresetString` | CE tex_mobject.py | EQUAL: layouts (`KIT.layout.*`) | docs | n/a | S |
| **Graphing and coordinate systems** | | | | | |
| `Axes` (ranges, lengths, tips, ticks, `axis_config`, `add_coordinates`, `get_axis_labels`, log `LogBase`/`LinearBase`), GL `Axes` | CE graphing/coordinate_systems.py, scale.py | PARTIAL: `axes()` linear only, no tips/log/labels API, `c2p` only (math.js:102) | native: extend `axes()` (tips, `scale:'log'`, `p2c`, axis labels) | own code | M |
| `NumberLine` (ticks, numbers, tip, `n2p`, `UnitInterval`, GL `Slider`) | CE number_line.py | PARTIAL: `numberLine()` basic (math.js:106) | native extend (elongated ticks, labels at values, brackets) | own code | S |
| `NumberPlane` (background + faded lines), `PolarPlane`, `ComplexPlane` (`n2p`, coordinates) | CE coordinate_systems.py | PARTIAL: `axes({grid})` only; polar/complex MISSING | native: `plane()`, `polarPlane()`, `complexPlane()` | own code | M |
| `plot`/`FunctionGraph` (discontinuities, `use_smoothing`), `plot_parametric_curve`, `plot_polar_graph`, `ParametricFunction`, GL `ParametricCurve` | CE graphing/functions.py | PARTIAL: `plot()` samples f, gaps on non-finite (math.js:111); parametric/polar MISSING | native: `plotParametric`, `plotPolar`, adaptive sampling + discontinuity detection | own code | M |
| `ImplicitFunction` / `plot_implicit_curve` (isosurfaces) | CE functions.py, GL functions.py | MISSING | vendor **d3-contour** (marching squares) | ISC (d3-contour 4.0.3, 38 KB) | S |
| `get_area`, `get_riemann_rectangles`, `get_secant_slope_group`, `get_vertical_line(s_to_graph)`, `get_T_label`, `input_to_graph_point`, `slope_of_tangent`, `plot_derivative_graph`, `plot_antiderivative_graph`, `plot_line_graph`, `get_graph_label` | CE coordinate_systems.py | MISSING (only `plot.pointAt`) | native: calculus helpers on top of `plot` | own code | M |
| `BarChart`, `SampleSpace` | CE probability.py, GL probability.py | PARTIAL: HF catalog `animated-bar-chart`, `chart-story` | native `KIT.math.bars` + brace/labels | own code | S |
| `Graph`/`DiGraph` (networkx layouts: spring, circular, tree, partite, kamada_kawai) | CE graph.py | MISSING | native: own layouts (circular/tree/grid) + vendor **d3-force** for spring | ISC (d3-force, UNVERIFIED version) | M |
| `VectorField`, `ArrowVectorField`, `StreamLines`, GL `TimeVaryingVectorField`, `AnimatedStreamLines` | CE vector_field.py, GL vector_field.py | MISSING | native: RK4 integrator, canvas/SVG strokes, pure in t | own code | M |
| `LinearTransformationScene`, `VectorScene` (basis vectors, matrix applied to grid, `add_vector`, `add_transformable_label`) | CE scene/vector_space_scene.py | MISSING | native: composed from `plane()`, `warp()`, `arrow()` | own code | M |
| GL fractals `MandelbrotFractal`, `JuliaFractal`, `NewtonFractal`, `MetaNewtonFractal`, `PlaneFractal` | GL mobject/fractals.py, shaders/*fractal | MISSING | native WebGL fragment shader (canvas, deterministic per frame) or GL renderer | own code | M |
| **Camera and 3D** | | | | | |
| `MovingCameraScene` (frame scale/move, `save_state`/`Restore`) | CE scene/moving_camera_scene.py | EQUAL: `KIT.shot.*`, `KIT.shoot` (shots.js) | docs | n/a | S |
| `ZoomedScene` (magnified inset, display frame) | CE scene/zoomed_scene.py | MISSING | native: `KIT.zoomInset(srcRect, dstRect)` second transformed copy of the stage layer | own code | M |
| `MultiCamera`, `SplitScreenCamera`, `MappingCamera` | CE camera/ | PARTIAL: `KIT.layout.split` composes panels, no per-panel camera | docs + `shoot()` per panel | n/a | S |
| `ThreeDScene` (`set_camera_orientation` phi/theta/gamma/zoom/focal_distance, `move_camera`, ambient rotation, GL `CameraFrame.reorient/set_euler_angles/increment_theta`) | CE scene/three_d_scene.py, GL camera_frame.py | PARTIAL: `cam3` rotates a flat DOM layer in perspective (shots.js), not 3D geometry | native: Three.js camera, orbit/dolly presets named like shots | MIT (three 0.187, 21 MB unpacked; tree-shaken build smaller, UNVERIFIED) | L |
| `add_fixed_in_frame_mobjects`, `add_fixed_orientation_mobjects`, GL `fix_in_frame`, `FullScreenRectangle` | CE three_d_scene.py, GL mobject | EQUAL in 2D (HUD outside the cam layer, MC pin_to_frame covered); 3D MISSING | native: DOM overlay above the WebGL canvas | own code | S |
| `ThreeDAxes`, `Surface` (checkerboard, resolution, `set_fill_by_value`), `ParametricFunction` 3D, `Line3D`, `Arrow3D`, `Dot3D` | CE graphing, three_d/three_dimensions.py; GL three_dimensions.py/surface.py | MISSING | native on Three.js: `KIT.three.axes/surface/curve/arrow` | MIT (three) | L |
| `Sphere`, `Cube`, `Prism`, `Cone`, `Cylinder`, `Torus`; GL `Disk3D`, `Square3D`, `VCube`, `VPrism`, `Prismify`, `SurfaceMesh` | CE/GL three_dimensions.py | MISSING | native: Three.js primitives with Manim-style wire/checker materials | MIT (three) | M |
| `Polyhedron`, `Tetrahedron`, `Octahedron`, `Icosahedron`, `Dodecahedron`, `ConvexHull3D` | CE three_d/polyhedra.py | MISSING | native: Three.js `PolyhedronGeometry`; hull via three examples (UNVERIFIED path) | MIT (three) | S |
| Lighting (`light_source`), shading, `TexturedSurface`, `ThreeDModel` (.obj via pywavefront/trimesh) | GL types/surface.py, camera.py; CE `shading` | MISSING | native: Three.js lights, `TextureLoader`, OBJ/GLTF loader (loaders vendored if wanted) | MIT (three) | M |
| 3D determinism: WebGL in headless Chromium | n/a | UNVERIFIED (pvk launch flags have no GL flags, browser.mjs) | seek-test Three.js frames across runs before shipping (as seektest did for GSAP) | n/a | S |
| **Voiceover plugin (manim-voiceover)** | | | | | |
| `VoiceoverScene.voiceover(text)` tracker: `duration`, `get_remaining_duration()`, `time_until_bookmark('<bookmark mark=…/>')`, `wait_until_bookmark` | MV voiceover_scene.py, tracker.py | BETTER: `W(id, word, nth)` word times from edge-tts, beat snap, multi-language (sched.py, vo.py, engine.js:135) | optional renderer exposes the same idea as `rw.word()`; optional shim `SpeechService` that returns Reelwright's mp3 + word boundaries so existing voiceover scenes run unchanged | MIT (manim-voiceover 0.4.0, verified) | S |
| TTS back-ends: Azure, ElevenLabs, gTTS, OpenAI, pyttsx3, Gemini, recorder, Whisper alignment, DeepL translate | MV services/ | PARTIAL: edge-tts only (vo.py); other TTS via docs/CONNECTORS.md style opt-in | connector pattern (separate Phase 10 row); not Manim's job | n/a | M |
| **Craft rules (MC)** | | | | | |
| Morph-Don't-Fade, Rack-Focus, caption bands cut, narration never printed | MC SKILL.md Moves + rules 10, 13 | EQUAL: PLAYBOOK Math bullets, qa `overlap` + `wordy` WARNs (qa_page.mjs:13-15) | docs | n/a | S |
| Layout lint OFF-FRAME / TEXT-OVERLAP / TINY-TEXT | MC scripts/craft.py | EQUAL for DOM; **MISSING for Manim frames** | optional renderer: scene exports `texts.json` (bbox, px size) and qa lints it (rewrite, MC has no licence) | own code | S |
| Pace lint (<= 2.5 words/s, gaps, >= 15 % unnarrated), dark-stretch lint | MC scripts/pace_lint.py, frame_lint.py | PARTIAL: real word times make RUSHED impossible; `dark` WARN exists (qa.py); unnarrated-fraction info line MISSING | native: info line in qa.py | own code | S |
| Landmines: LaTeX probe (binary present != pipeline works), stale segment cache, HUD vanishes on push-in | MC references/landmines.md §4, §14, §13 | n/a | optional renderer `doctor` runs a 1-frame MathTex probe; own media dir per input hash with caching disabled | n/a | S |
| **ManimGL-specific (library MIT; manim_skill GL docs CC BY-NC-SA: features listed only, nothing copied)** | | | | | |
| OpenGL/wgpu GPU renderer (shader-drawn strokes/fills, bundled draws) | GL renderer/, shaders/*.wgsl (master); 1.7.2 moderngl shaders | MISSING by nature (we are DOM/SVG); output quality comparable for 2D | optional renderer (GL) | MIT (manimgl) | L |
| Interactive embed: `-se <line>`, `embed()`, `checkpoint_paste()`, `InteractiveScene` (select/drag mobjects, undo/redo, copy), hot reload `--autoreload` | GL scene/scene_embed.py, interactive_scene.py; MSGL rules (listed only) | PARTIAL: `preview` scrubber for the finished film, no live editing of Manim code | docs: authors iterate with `-s`/`-n` stills on the GL side; studio editor (Phase 10) covers the native side | n/a | S |
| Interactive controls `Slider`, `Button`, `Checkbox`, `ControlPanel`, `Textbox`, `MotionMobject`, `LinearNumberSlider` | GL mobject/interactive.py, number_line.py | MISSING (not meaningful in a rendered film) | out of scope; studio editor may expose params as sliders | n/a | S |
| `CameraFrame` as a Mobject (`.shift/.scale/.rotate`, `reorient`, `to_default_state`, `focus_on`), `ContinuousRotation` updaters | GL camera/camera_frame.py | PARTIAL: `shots` presets | native: Three.js camera rig with the same verbs | own code | M |
| `Tex` pipeline: `latex` (or `xelatex`) -> DVI/XDV -> `dvisvgm` -> SVG, templates in tex_templates.yml (default, ctex, ~40 font presets), `diskcache` | GL utils/tex_file_writing.py, tex_templates.yml | PARTIAL (KaTeX, no packages) | optional renderer (GL) needs real LaTeX + dvisvgm (TinyTeX list below) | MIT (manimgl); LPPL TeX packages | M |
| `Text` via ManimPango with `t2c/t2f/t2s/t2w`, `MarkupText`, `Code` | GL text_mobject.py | BETTER in browser (see Text row) | none | n/a | S |
| GL drawings: `Checkmark`, `Exmark`, `Lightbulb`, `Speedometer`, `Laptop`, `VideoIcon`, `Clock`/`ClockPassesTime`, `Bubble`/`SpeechBubble`/`ThoughtBubble`, `VectorizedEarth`, `Piano`, `DieFace`, `Dartboard` | GL mobject/svg/drawings.py | PARTIAL: SVG icons by hand; `Checkmark/Exmark/SpeechBubble/Clock` trivial | native: small icon set under KIT.math.icons (optional) | own code | S |
| GL `DotCloud`, `GlowDots`, `TrueDot` (shader points) and `Surface` shading/`Sphere` as shader surfaces | GL types/dot_cloud.py, shaders/true_dot | MISSING | native: Three `Points` + additive blending | MIT (three) | M |
| GL `VideoMobject`, `Sprite` (master only) | GL types/video_mobject.py | EQUAL via `K.clip` frame sequences | docs | n/a | S |
| GL `StreamLines`, `AnimatedStreamLines`, `TimeVaryingVectorField` | GL vector_field.py | MISSING (see vector field row) | native | own code | M |
| GL-only API renames: `ShowCreation`=CE `Create`, `Tex`=`MathTex`, `TexText`=`Tex`, `Text` same, `self.frame`=`self.camera.frame`, `-w` write, `--hd`/`--uhd` | GL whatsnew.rst, scene.py | n/a | `reelwright_manim.names` alias module (S) so shared helpers work on both | own code | S |
| **Manim-as-renderer integration (what Reelwright must add)** | | | | | |
| Scene block in project.json rendered to a cached clip, played by `KIT.manim()` | design below | MISSING | optional renderer (CE + GL) | own code | L |
| `"renderer": "manim"` whole-film mode (`tools/renderers/manim.mjs`, same contract as pvk/hyperframes) | design below | MISSING | optional renderer, second step | own code | M |
| Timing bridge (kit.json: VO words, beats, theme, fmt) + Python helper package | design below | MISSING | own code | own code | M |
| `verify` / manifest / `clean` / `qa` integration | design below | MISSING | own code | own code | M |

## Optional Manim renderer design

### 1. Opt-in shape

Scene blocks, not a renderer switch. Reelwright films stay pvk or HyperFrames; one or more Manim clips are layers inside them.

```jsonc
"manim": {
  "engine": "ce",                       // default for scenes; "gl" per scene overrides
  "scenes": [{
    "id": "proof",                      // name used by KIT.manim('proof')
    "file": "manim/proof.py", "class": "Proof",
    "anchor": "L2",                     // VO line id: scene t=0 is that line's start (film time comes from sched, never typed)
    "pre": 0.3,                         // seconds before the line starts (optional)
    "alpha": true,                      // transparent background; false = theme --kit-bg baked in
    "fit": "contain",                   // other formats: contain|cover|skip. "perFormat": true re-renders at 9x16/1x1 (author handles layout)
    "fps": 60                           // default = film fps; 30 allowed (frame hold) for drafts
  }]
}
```

Film side (`film.js` / `hf/film.js`): `const mn = KIT.manim('proof'); … mn.set(t)`. `mn.at` is the anchor line's `V(id).start - pre`,
read from `window.MANIM` (so the "every timing from W()/V()" rule holds), `mn.markAt('pop')` returns a film time for a mark the scene
exported (use it for `KIT.cue`, camera, captions). `KIT.manim` returns `{ el, set(t), markAt, frameAt }` and mirrors `K.clip`.

`"renderer": "manim"` (phase 2): the scene is the whole film; `info` = scene length, `frames` = extract the clip, `stills` = nearest frame,
`encode` = existing pvk `encode()`. No DOM captions, themes or layouts (documented trade-off; MC's own rule is "narration is spoken, not printed").

### 2. Passing Reelwright timing into Python

1. `reelwright manim` runs after `sched` (needs `film/data.js` or `hf/kit-data.js`) and before `stills/frames`.
2. `tools/manim.mjs` evaluates the data file in a `vm` stub and writes `.cache/manim/kit.json`:
   `{ fps, width, height, fmt, lang, VO: { id: { start, end, words: [{w,t,d}] } }, MUSIC: { beat, bar, t0, drop }, theme: { bg, ink, accent, accent2, muted, fontText, fontDisplay (hex + family), tempo }, fonts: [ttf paths], anchors }`. Theme colours are resolved from the generated `theme.css` custom properties.
3. Python package `tools/manim/reelwright_manim/` (single source for CE and GL):
   - `core.py` (engine-neutral): loads kit.json; `Clock` with a frame-grid cursor (`rw.at(t)`, `rw.hold_until(t)`, `rw.over(t0, t1, *anims)`); `rw.word(line, word, nth)`, `rw.line(id)`, `rw.beat(k)`, `rw.bar(k)`, `rw.snap(t)`; `rw.color('accent')`; `rw.mark(name)` (writes `marks.json`); `rw.cue(name)`; asserts it never runs late by more than one frame (same spirit as the `K.clip` speed check); final `assert frames_written == round(DUR*fps)`.
   - frame quantiser: `runtime_for(n_frames) = (n - 0.5)/fps` for all `play`/`wait` (matches `ceil(rt*fps)` in CE `scene.py:1130` and GL `scene.py:462`); CE waits are called with `frozen_frame=False`.
   - `ce.py`: `RWScene(Scene)`, `RWMoving(MovingCameraScene)`, `RW3D(ThreeDScene)`; sets `config.seed`, `background_color`/`transparent`, frame size, registers fonts with `register_font` (works on macOS since ManimPango 0.2.3, source-verified), `add_subcaption` no-op.
   - `gl.py`: `RWSceneGL(Scene or InteractiveScene)`; same `rw` API; `random_seed=0`; no audio; same marks.
   - `names.py`: `Create`/`ShowCreation`, `MathTex`/`Tex`, `Tex`/`TexText` aliases so shared helpers (theme palette, label styles, safe-area `fit()`) import once.
   - `shim_voiceover.py` (optional): a `SpeechService` subclass returning Reelwright's mp3 and word boundaries so unmodified manim-voiceover scenes sync to our audio.
4. Author code: `self.rw.at(self.rw.word("L2", "pipeline")); self.play(Create(curve), run_time=self.rw.until(self.rw.word("L2", "grows")))`.
   Because absolute times come from kit.json, editing a VO line changes the cache hash and re-renders the scene (exactly like a changed `sched`).

### 3. Caching, determinism, `verify`

- **Key** = sha256 over: scene file + every local Python file it imports, `reelwright_manim` sources, the kit.json slice (VO lines used by the anchor window, beat grid, theme tokens, fps, size, fit, alpha), fonts used, Python/Manim/Typst/LaTeX/ffmpeg versions, engine name, seed.
- **Layout:** `<project>/.cache/manim/<id>-<hash12>/{scene.mov|webm, frames/%05d.png (lazy, extracted on first use), marks.json, texts.json, meta.json}`. Manim's own caching is off (`--disable_caching`; GL: a fresh `--video_dir` per hash, GL `diskcache` for Tex only), each render goes to a fresh media dir (MC landmine 14: stale segments).
- **Codec:** transparent: CE `.mov` (qtrle/argb, lossless, source-verified `video_encoder.py:123`) or `.webm` (VP9 yuva420p); opaque: CE `libx264`. GL: `-t` prores_ks (master) or `--vcodec qtrle --pix_fmt argb` (UNVERIFIED on 1.7.2). Frames are always decoded by ffmpeg to PNG at exactly `fps`; frame count is asserted, so a lossless clip gives byte-stable frames on the same machine.
- **Determinism:** `PYTHONHASHSEED=0`, `SOURCE_DATE_EPOCH`, seed 0, no network, fonts from `fonts/` only, `uv.lock`-pinned env. Same machine: expected identical (UNVERIFIED; GL master's own `tests/render_compare.py` says "within one renderer leave tolerance at zero" and has a `--twice` instability check, which suggests it holds on one GPU). Across OS/GPU: antialiasing differs, CE Cairo is far more portable than GL; the manifest's existing raster-noise path (`.github/framediff.py`) applies.
- **manifest.mjs:** `inputs` already hash every project file, so `manim/*.py` are covered; `BUILD` skips `.cache/` so the clips are excluded (good). Add `tools.manim: { engine, version, python, typst, latex, uv.lock sha }` and `clips: { id: { hash, frames, sha256 of frames } }` to the manifest.
- **verify:** default does NOT re-run Manim (heavy, may not be installed): it checks each clip's hash equals the recomputed input hash and the frame hashes match the manifest, then re-renders film frames as today. `verify --manim` re-renders the scenes into a temp dir and compares (exact on the same machine/GPU, framediff tolerance otherwise).
- **clean:** keeps `.cache/manim/` unless `--all` (a re-render costs minutes and needs the venv).

### 4. Install per OS (all optional; core stays Node + ffmpeg + edge-tts)

One mechanism: `reelwright setup --manim ce|gl|both` creates `<repo>/.venv-manim` with `uv` (Reelwright's own `pip --user` deps in setup.mjs stay untouched, and CE needs numpy >= 2.1 while requirements.txt allows older), writes `.venv-manim/reelwright.json`, then runs `manim doctor`: a 1-second scene, a MathTex probe, a Typst probe, frame-count and alpha checks.
Python: CE needs >= 3.11 (PyPI `requires_python`), GL >= 3.10; pin `uv python install 3.12` (macOS system Python here is 3.9.6, too old; uv is already on this machine).

| | macOS (arm64/x64) | Windows 10/11 native | Linux (Debian/Ubuntu; Fedora; Arch) |
|---|---|---|---|
| uv | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 \| iex"` | same curl line |
| System packages for **CE** (docs.manim.community/installation/uv, read) | `brew install cairo pkg-config` (pycairo has no macOS wheel, compiles; ManimPango has mac wheels) | none (pycairo, ManimPango, PyAV, moderngl wheels exist for win_amd64). If uv reports missing MSVC: Microsoft C++ Build Tools, "Desktop development with C++" | Debian/Ubuntu `sudo apt install build-essential python3-dev libcairo2-dev libpango1.0-dev`; Fedora `sudo dnf install python3-devel pkg-config cairo-devel pango-devel`; Arch `sudo pacman -Syu base-devel cairo pango` (pycairo and ManimPango are sdist-only on Linux PyPI, verified) |
| CE install | `uv pip install --python .venv-manim manim==0.22.1 "manim[typst]"` (~82 MB of wheels on macOS arm64 with typst, sum of PyPI file sizes, installed size UNVERIFIED) | same (~130 MB wheels) | same (~138 MB) |
| ffmpeg | CE: none (PyAV bundles libs). GL: system ffmpeg (`brew install ffmpeg`, already required by Reelwright) | GL: ffmpeg on PATH (already required) | GL: `sudo apt install ffmpeg` |
| LaTeX (only if real `Tex/MathTex`; Typst/KaTeX paths need none) | **TinyTeX**: `curl -sL "https://tinytex.yihui.org/install-bin-unix.sh" \| sh` (TinyTeX-1 darwin 67 MB release asset; 0 = 1 MB infra only), then `tlmgr install amsmath babel-english cbfonts-fd cm-super count1to ctex doublestroke dvisvgm everysel fontspec frcursive fundus-calligra gnu-freefont jknapltx latex-bin mathastext microtype multitoc physics preview prelim2e ragged2e relsize rsfs setspace standalone tipa wasy wasysym xcolor xetex xkeyval` (the CE docs' minimal list; Manim's default template also loads `dsfont`, `mathrsfs`, `calligra`, `pifont` for GL: add and probe). Alternative: `brew install --cask mactex-no-gui` (several GB) | TinyTeX `install-bin-windows.bat` (TinyTeX-1 exe 73 MB) or MiKTeX (docs' recommendation; enable auto-install of missing packages) | TinyTeX unix script (TinyTeX-1 linux-x86_64 53 MB) or `apt install texlive-full` (docs) / lighter `texlive-science texlive-fonts-extra texlive-latex-extra` (GL README) |
| **GL release 1.7.2** | `uv pip install manimgl==1.7.2` (deps incl. moderngl, pyglet-era stack, PyOpenGL, sympy, ipython). README: on ARM also `arch -arm64 brew install pkg-config cairo` | `pip install manimgl==1.7.2`; README tells Windows users to install ffmpeg + a LaTeX distribution (MiKTeX) | `sudo apt install ffmpeg libpango1.0-dev` (README), then pip; pycairo/ManimPango build as for CE |
| **GL master (wgpu)** | `uv pip install "git+https://github.com/3b1b/manim@fafa083"` (needs `wgpu` 0.32 wheels: macOS arm64/x64 exist, BSD-2; `glfw` MIT) | same; wgpu win_amd64 wheel exists | same; needs a Vulkan driver at runtime (`wgpu`); on a GPU-less box a software Vulkan (mesa lavapipe) is needed, UNVERIFIED package names |

### 5. ManimGL headless/offscreen (CI, macOS, Windows)

- **1.7.2:** `-w`/`--write_file` sets `show_in_window = not args.write_file` (config.py:323 of the wheel) and the `Camera` then calls `moderngl.create_standalone_context()` (camera.py:74); frames go through a pipe to the system `ffmpeg` binary (`scene_file_writer.py`, `-an`, rgba rawvideo). So it opens **no window** but needs an OpenGL >= 3.3 context. macOS: CGL context works without a window (UNVERIFIED, expected to work over SSH/CI on Apple Silicon). Windows: WGL standalone context needs an interactive desktop session or a GPU driver exposing OpenGL 3.3; on a GPU-less Windows server it falls to GDI OpenGL 1.1 and fails (UNVERIFIED). Linux: needs EGL or a virtual X server (`xvfb-run`) plus Mesa (llvmpipe), UNVERIFIED.
- **master (wgpu):** `Gpu.__init__` calls `wgpu.gpu.request_adapter_sync(power_preference="high-performance")` with no window; frames are read back with `FrameStream` (copy texture to MAP_READ buffer, one frame behind, drained at close) and piped to `ffmpeg`. No window is created for `-w` either. Needs Metal (macOS), D3D12/Vulkan (Windows), Vulkan (Linux). There is no fallback-adapter flag in the code, so CI without any adapter fails: use a hosted runner with software Vulkan or accept "GL needs a GPU box".
- Reelwright's stance: GL is **best-effort and local**. `doctor` renders one frame offscreen and prints adapter/context info; if it fails the scene block errors early with the exact reason and the CE fallback hint. No GL render is part of default CI.
- Determinism: the Scene seed (`random_seed=0` on master) is set; GPU rasterisation differs across vendors, so GL cache is keyed with `adapter name + driver` and `verify --manim` for GL is same-machine only.

### 6. How CE and GL share code

One Node driver (`tools/manim.mjs`: hash, cache, spawn Python, ffmpeg extract, `window.MANIM`, manifest, clean), one film-side module (`tools/manim.js`), one Python package with an engine-neutral core and two thin adapters, one `kit.json`. Differences live in three tiny tables: render CLI (`manim -ql --format mov --transparent -r W,H --fps N -o name --media_dir D --disable_caching file Scene` vs `manimgl file Scene -w -t -r WxH --fps N --video_dir D --file_name name`), quantiser constants, and alias names. Scene authors choose the engine per scene; the helper API (`rw.*`) is identical.

### 7. Plugging into mix / encode / qa

- **mix:** Manim audio is discarded (CE: don't `add_sound`; GL: `-an`). mix.py is unchanged. SFX come from `KIT.cue(mn.markAt('pop'))` so the mix still places UI sounds on Manim events.
- **encode:** unchanged. The clip is a layer in the page (pvk: an `<img>` whose `src` is swapped per frame, exactly like the screen recording, `pending` decodes awaited by `render` at engine.js:425). HyperFrames does not wait for image decodes (engine.js:433 shortcut), so for `renderer: hyperframes` the block emits a `<video>` with `data-start/data-duration` and relies on HyperFrames' own video frame extraction (vendor/hyperframes/producer, UNVERIFIED end to end).
- **qa:** existing gates run on final frames (loudness, flash, blank/jump report) and on the page (captions, overlap, tiny-text, wordy, illustrative). New: `manim-meta` FAIL gate (clip hash fresh, frame count = scene duration x fps, size, alpha as declared), `manim-texts` WARN lint over `texts.json` (off-frame, overlap, tiny text, wordy, rewritten from MC's rules), and an `illustrative` requirement: a scene that draws numbers or plotted data must call `rw.label_illustrative()`, which writes the DOM label request into `marks.json`. The `seekable` gate stays scoped to `film/*.js`; Python scenes are deterministic by the hash, not by that gate.

## Integration notes

- Scene time vs film time: scene `t=0` = anchor line start minus `pre`; film.js never types seconds. Re-running `sched` after a script edit re-keys the cache.
- Formats: Manim frame is 16:9 by default; `fit: "contain"` shows it inside the film's layout box in other formats (cheap, correct); `perFormat` re-renders with `config.frame_width` set from the aspect and `rw.safe` exposing the safe rectangle in Manim units.
- Themes: `rw.color('ink'|'accent'|…)`, `rw.font('text')`; fonts registered from `fonts/` (OFL) so Pango and the page agree.
- Alpha clips composite over theme backgrounds, captions, `KIT.shoot` cameras and masks (phone/bento cards), which a baked-in background would block.
- Disk: 60 fps x 30 s x 1080p PNG ~ 1800 frames (UNVERIFIED size, estimate a few hundred MB); lazy extraction and `fps: 30` drafts keep it manageable.
- What to build natively in JS regardless (priority order): (1) MathJax/Typst build-time glyph paths -> true `write()` and `TransformMatchingTex`; (2) flubber multi-path morph; (3) shape/arrow/brace/angle helper module; (4) graphing completeness (polar, complex, parametric, implicit via d3-contour, calculus helpers, grid warp, vector fields, bar charts); (5) Three.js 3D (surfaces, primitives, orbit camera, HUD overlay); (6) rate functions, indication animations, typewriter, Broadcast, `KIT.sim` for stateful physics; (7) tables, matrices, code; (8) zoom inset, graphs (d3-force). Each is a separate small PR with a stills check.

## Risks

- **Environment weight and fragility** (pycairo/ManimPango compile on Linux, pycairo on macOS; ~100+ MB wheels; LaTeX packages missing despite `latex` on PATH, MC landmine 4). Mitigation: isolated `.venv-manim`, `doctor`, Typst/KaTeX routes without LaTeX.
- **ManimGL instability:** release 1.7.2 is a year old, master is an unreleased wgpu rewrite whose API may move (`pin by commit`, tests dir shows active churn). GPU-less CI cannot render GL (UNVERIFIED).
- **Frame mapping bugs** (CE static wait truncation and png-sequence single-frame holds, source-read). Mitigation: dense waits, ffmpeg extraction, mandatory frame-count assertion, `doctor` self-test.
- **Byte-determinism across machines is not achievable for GL (GPU) and unlikely for Cairo/Pango (font hinting)**; the verify story is hash-of-inputs + same-machine exactness + raster-noise tolerance.
- **Licences:** Manim CE, ManimGL, manim-voiceover, typst, typst-py, wgpu, moderngl, glfw are permissive (verified or MIT/BSD/Apache per PyPI/GitHub). pycairo is LGPL-2.1 OR MPL-1.1 (dynamic, installed by the user), PyAV wheels bundle FFmpeg libraries whose licence depends on the build (UNVERIFIED), TinyTeX is GPL-2.0 and TeX packages mix LPPL/others. Reelwright redistributes none of them. MC has no licence (rewrite lint rules from behaviour); MS GL docs are CC BY-NC-SA 4.0 (copy nothing; the CE docs are MIT but are API docs, we write our own).
- **HyperFrames path** may not play a transparent image sequence per frame (engine.js:433); the `<video>` route is untested.
- **Scope creep:** the optional renderer must not become the default answer for 2D math; native JS covers it and keeps films offline and pure in t.
