# Phase 10z: non-EQUAL rows, grouped by reason

Generated 2026-11-12 by tools/parity_compile.mjs from docs/parity/*.md. Do not hand-edit. **Owner rulings 2026-11-12: the 80 rows of groups 1-9 and the rows the re-audit tagged except are accepted exceptions; rows tagged build are planned for Phase 11 (not claimed); the four rows tagged "proposed" wait for the owner. The state is shown after every row.** This is every row whose status is not EQUAL, BETTER or EQUAL/BETTER, grouped by the reason the row's own text (or the plan's Known exceptions) gives. The last group, "Not done, no stated reason", is the to-do list.

Total rows 601; EQUAL + BETTER + EQUAL/BETTER 222; not 379 (grand total of the groups below: 379).

| # | Group | Rows |
|--:|---|--:|
| 1 | Excluded by owner decision or repo rule | 7 |
| 2 | Needs WebGPU / specific hardware | 4 |
| 3 | Licence-blocked or non-OSI (and what was done instead) | 11 |
| 4 | Not seekable / not deterministic, so kept out by the seekable gate | 5 |
| 5 | Optional renderer / install not bundled (Remotion, Manim CE, ManimGL) | 15 |
| 6 | shotcraft audio, social publishing, JianYing and third-party tools skipped | 4 |
| 7 | Paid-connector-only (Higgsfield) | 20 |
| 8 | The audit's own approach column says skip / defer / not needed | 21 |
| 9 | Not applicable by design (N/A, UNVERIFIED, DIFFERENT) | 9 |
| 10 | Not done, no stated reason | 283 |
| | **Grand total** | **379** |

Row format: `source:id — feature — status`, then what the row says (status text) and, for open items, its approach column. IDs: HyperFrames and Higgsfield use the source ids; the other sources use `<section>.<n>` (Manim `m<group>.<n>`), numbering the data rows of that section in file order.

How rows are grouped: a row goes to the first group whose keyword rule matches what the row itself says (feature, status text, and for some groups the approach or licence cell); anything unmatched is in the last group. The rules are in `REASONS` in tools/parity_compile.mjs. The grouping is a reading aid, not a ruling: read the quoted text. A row with `(mixed)` was written EQUAL or BETTER but its own text also names a MISSING or PARTIAL piece, so it is counted PARTIAL. Rows the audit marked `same row` inherit the status of the row above.

## 1. Excluded by owner decision or repo rule (7) — 7 approved

Rows marked OUT (no cloud render, with Colab staying; no HeyGen accounts, paid or closed-source desktop app; no MCP/plugin packaging), and rows whose status text cites the owner decision or the repo rule.

By source: hyperframes 6, remotion 1

### HyperFrames (6)

- `hyperframes:G14` — `skills` / `update` / `upgrade` / `figma` / `events` / `templates` / `usage` / `telemetry` / `feedback` — OUT — exception (owner-approved 2026-11-12)
  - says: for `auth billing cloud lambda cloudrun publish open catch-up usage telemetry feedback templates` (HeyGen accounts, hosted, paid, or tracking). `skills` see M1
  - approach: none
- `hyperframes:G17` — `catch-up`, `open` (desktop app) — OUT — exception (owner-approved 2026-11-12)
  - says: (desktop app is closed source, needs a HeyGen sign-in)
- `hyperframes:H6` — WebMCP tools (`studio_look/select/inspect/set_style/frame`) for an in-browser agent — OUT — exception (owner-approved 2026-11-12)
  - says: (repo rule: no MCP; browser origin trial only)
- `hyperframes:H7` — Studio desktop app (agent beside preview, Make-something box, brand kits, reference video, share) — OUT — exception (owner-approved 2026-11-12)
  - says: (closed source, HeyGen sign-in, not in this repo)
- `hyperframes:I14` — Distributed render plan/assemble (Lambda, Cloud Run, k8s jobs) — OUT — exception (owner-approved 2026-11-12)
  - says: (owner: no cloud). Colab render (`cloud/`) stays
- `hyperframes:L3` — Claude/Codex/Cursor plugin packaging and marketplace — OUT — exception (owner-approved 2026-11-12)
  - says: (repo rule: standalone, no plugin/MCP)

### Remotion + its skills (1)

- `remotion:2.7.15` — Cloud: Lambda, Cloud Run, Vercel Sandbox, Azure, Cloudflare, `@remotion/lambda`, distributed render, client-side `@remotion/web-renderer` (… — N/A — exception (owner-approved 2026-11-12)
  - says: (owner: no cloud render to AWS/GCP; Colab/Actions exist)
  - approach: out of scope, do not wrap

## 2. Needs WebGPU / specific hardware (4) — 3 approved, 1 partial

Plan "Known exceptions": WebGPU blocks are supported only where the machine has WebGPU, flagged otherwise. Rows whose feature or status text names WebGPU or a hardware adapter.

By source: hyperframes 4

### HyperFrames (4)

- `hyperframes:B7` — TypeGPU / raw WebGPU (`__hfTypegpuTime`, `data-requires-webgpu`, hardware adapter required unless SwiftShader device) — MISSING — exception (owner-approved 2026-11-12)
  - says: (eng). 37 blocks need it; not byte-reproducible across GPUs
  - approach: defer as opt-in "needs a GPU" extra; do not vendor
- `hyperframes:B10` — Video textures into WebGL/WebGPU in render mode (`video-texture-compat`) — MISSING — exception (owner-approved 2026-11-12)
  - says: (needs A7)
  - approach: follow A7
- `hyperframes:E3` — 210 blocks (`hyperframes:block`, full 5-30 s scenes, mounted as sub-compositions at `compositions/<name>.html`). Needs: HF nested-compositi… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10f). 136 of 210 vendored, converted to `KIT.mount` templates by `tools/blocks.mjs import` and each verified under the HyperFrames runtime (two shuffled seek orders, second mount 7 s later, same pixels, no network): `v…
  - approach: clipper-lib, d3-delaunay (not approved); media re-timing in KIT.mount; licences for the 19 blocks' assets
- `hyperframes:E4` — Block categories to cover: transitions (33 tagged), overlays (31), backgrounds (30), carousels (26 `carousel-*`), 3D (20), lower thirds (13… — PARTIAL — partial, rest planned (open)
  - says: (10f). 136 of 210 upstream blocks are supported; all 33 transition, 26 carousel and 11 lt-* are in, maps 3 of 8, code-* 5 of 12. The 74 left out (UNSUPPORTED.md): 37 need WebGPU, 19 unknown-licence assets, 14 fail verif…
  - approach: follows E3

## 3. Licence-blocked or non-OSI (and what was done instead) (11) — 3 approved, 8 open

Rows whose status text or licence cell says the upstream is UNLICENSED, has no licence, is all-rights-reserved, not open source, or a paid licence. The row text says what was done instead (native rewrite, skip).

By source: hyperframes 1, remotion 9, higgsfield-workflows 1

### HyperFrames (1)

- `hyperframes:E7` — Data/map blocks: `us-map`, `us-map-bubble`, `us-map-flow`, `us-map-hex`, `world-map`, `spain-map`, `nyc-paris-flight`, `north-korea-locked-… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10f): `world-map`, `us-map-bubble` supported (d3 7.9.2, topojson-client 3.1.0, us-atlas 3.0.1, world-atlas 2.0.2 vendored); `us-map`, `us-map-flow`, `spain-map` (es-atlas data not vendored: its blocks failed the seek-o…
  - approach: make the 3 failing maps seekable

### Remotion + its skills (9)

- `remotion:2.2.1` — `<TransitionSeries>` Sequence + Transition + Overlay; total = sum - overlaps; overlays do not shorten; `offset` — PARTIAL — open
  - says: (10e): `KIT.transition` with chains; scenes overlap by the transition window, 18 types (`tools/transitions.js`); shuffled-seek fixture in `tools/selfcheck/motion/transitions.mjs`, docs/playbook/motion.md; missing: film-…
  - approach: [N] `K.transition(t, cut, dur, kind, dir)` -> `{enter, exit}` + overlap arithmetic in sched/film total; [R] free
- `remotion:2.2.2` — Timings `linearTiming`, `springTiming` (duration from spring settle; `getDurationInFrames({fps})`), custom timing — PARTIAL — open
  - says: (10e): `dur` (linear) and `ease` (any `KIT.easing` name or function) on `KIT.transition`, plus `K.springDur` (settle time, tools/engine.js) to wire a spring by hand; missing: a spring timing preset that sets `dur` from…
  - approach: [N] part of K.transition
- `remotion:2.3.1` — `@remotion/effects`: ~91 effect docs (list in skills `SKILL.md` and `docs/effects/`); `effects={[...]}` on Img/CanvasImage/AnimatedImage/So… — MISSING — exception (owner-approved 2026-11-12)
  - says: (no effects stack; CSS filters only via themes)
  - approach: [R] free (needs `--gl=angle`, Remotion Chrome). [N] cherry-pick CSS/SVG-filter ones below
- `remotion:2.3.2` — Colour and tone: brightness, contrast, saturation, hue, grayscale, invert, tint, duotone, vibrance, exposure, whiteBalance, shadowsHighligh… — PARTIAL — open
  - says: (10a): `KIT.grade` (tools/compose.js, docs/playbook/grading-effects.md): 13 grade presets, `adjust` exposure / contrast / highlights / shadows / whites / blacks / temperature / tint / vibrance / saturation, wheels, curv…
  - approach: [N] ffmpeg `curves`/`lut3d`/`eq` for footage in encode; CSS `filter` for DOM layers (Phase 9 item 11). [R] free GPU path
- `remotion:2.3.3` — Blur family: blur, lightTrail, linearProgressiveBlur, radialProgressiveBlur, regionBlur, zoomBlur, lensBlur — PARTIAL — open
  - says: (10a/10e): `KIT.grade` `effects.blur` animatable (hyperframes, tools/compose.js); `KIT.shot.rackFocus` / `dof` tilted-page focus band (tools/shots2.js, tools/selfcheck/motion/shots2.mjs); `K.speedBlur` (tools/shots.js);…
  - approach: [N] CSS `filter: blur` + masks for the simple ones; rest [R]
- `remotion:2.3.4` — Lighting: dropShadow, longShadows, glow, shine, vignette — PARTIAL — open
  - says: (10a): `KIT.grade` `details.vignette` / `grain` and effect `bloom` (hyperframes only, pvk skips them with one warning; tools/compose.js), blocks `vfx-anamorphic-flare`, themes carry shadows; missing: a renderer-neutral…
  - approach: [N] `KIT.fx.vignette/glow` as CSS
- `remotion:2.3.5` — Distortion: barrelDistortion, chromaticAberration, cornerPin, fisheye, mirror, noiseDisplacement, wave, tile, skew, scale, translate, turbu… — PARTIAL — open
  - says: (10a): `KIT.vfx` `wave-warp` and `displacement-map` (hyperframes only, tools/compose.js), `KIT.grade` `effects.chromaticAberration` / `crtCurvature` (hyperframes), shaders `chromatic-split`, `ripple-waves`, `gravitation…
  - approach: [R]; [N] chromatic aberration + wave as SVG filters
- `remotion:2.3.6` — Textures/patterns: burlap, checkerboard, contourLines, dotGrid, emboss, flannel, gridlines, halftone, lines, liquidContours, noise, fractal… — PARTIAL — open
  - says: (10a/10f): `KIT.grade` `effects` scanlines / halftone / ascii / dither and `details` grain (hyperframes, tools/compose.js), `KIT.vfx` `fractal-noise` (hyperframes), blocks `halftone-field`, `vfx-liquid-background`, `sta…
  - approach: [R]; [N] scanlines, grain, dotGrid, halftone, paper as CSS/SVG layers (theme-friendly)
- `remotion:2.3.8` — Weather/reveal: snowFall, rainFall, irisWipe, radialWipe, evolve, pixelate, pixelDissolve, progressive pixelate, venetianBlinds — PARTIAL — open
  - says: (10e/10f): reveals: `KIT.transition` `iris`, `clockWipe`, `blinds`, `barnDoor` (tools/transitions.js, tools/selfcheck/motion/transitions.mjs), shader `sdf-iris` (tools/shaders.js), blocks `transitions-radial`, `transiti…
  - approach: [R]; [N] wipes/pixel dissolve through `K.transition` masks

### Higgsfield workflows (docusphere, cth9191) (1)

- `higgsfield-workflows:33` — Gallery preview videos and wordmark/screenshots — N/A — exception (owner-approved 2026-11-12)
  - says: third-party media, all rights reserved; do not vendor
  - approach: -

## 4. Not seekable / not deterministic, so kept out by the seekable gate (5) — 4 approved, 1 partial

Rows whose status text says the upstream feature is interactive, wall-clock or random, and is banned or excluded because Reelwright films must be pure functions of t.

By source: remotion 1, doodle-shots-motion 4

### Remotion + its skills (1)

- `remotion:2.4.3` — `<Html5Video>`, `<Html5Audio>` — N/A — exception (owner-approved 2026-11-12)
  - says: (non-seekable, qa forbids)
  - approach: none

### anidoodle, video-shotcraft, motion-design-skill, GSAP, Lottie (4)

- `doodle-shots-motion:2.53` — grain-dissolve [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.shader domain-warp/ridged-burn noise dissolves (tools/shaders.js; docs/playbook/shader-transitions.md), doodle2.grain tooth mask; missing: literal film-grain and halftone-dot dissolves; grain-overlay uses CSS…
  - approach: R2 docs
- `doodle-shots-motion:4.15` — ScrambleText: scramble then reveal — PARTIAL (mixed) — exception (owner-approved 2026-11-12)
  - says: BY-EXCLUSION (10b): not bundled and banned by the `seekable-runtimes` gate (Math.random every render); seeded scramble still MISSING
  - approach: DO NOT use: calls Math.random on every render (L102, L169, L246); two fresh pages gave 666 differing px at the same t. Native seeded `KIT.scramble(t, ...)` or catalog block
- `doodle-shots-motion:4.19` — gsap.utils: interpolate, mapRange, snap, wrap, clamp, normalize, pipe, distribute, shuffle/random(non-det.) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10b): bundled with gsap.min.js; `utils.random/shuffle` banned by the seekable-runtimes gate; the rest untested
  - approach: bundle; lint random/shuffle
- `doodle-shots-motion:4.22` — ScrollTrigger, ScrollSmoother, ScrollTo, Observer, Draggable, Inertia, matchMedia, ticker/delayedCall/quickSetter, React/Vue hooks — N/A — exception (owner-approved 2026-11-12)
  - says: interactive or wall-clock features, not seekable
  - approach: exclude from the bundle (about 130 KB saved); lint `ScrollTrigger`, `.play(`, `repeat:-1`, global `gsap.to(` outside a paused timeline

## 5. Optional renderer / install not bundled (Remotion, Manim CE, ManimGL) (15) — 15 approved

Plan: Remotion, Manim CE and ManimGL are opt-in installs, never bundled. Rows whose status text puts the gap in the optional renderer or says it was not built there.

By source: remotion 9, manim 6

### Remotion + its skills (9)

- `remotion:2.1.14` — `<Track>` non-overlapping named timeline lanes; editable timeline groups — MISSING — exception (owner-approved 2026-11-12)
  - says: (Studio-only concept)
  - approach: [R] only; for [N] a "scene list" in project.json is enough
- `remotion:2.2.6` — HTML-in-canvas shader presentations: `blurSlide, bookFlip, crossZoom, crosswarp, dissolve, dreamyZoom, filmBurn, linearBlur, ripple, swap,… — MISSING — exception (owner-approved 2026-11-12)
  - approach: [R] only (needs Remotion's Chrome build; Chrome 149+ flag in preview). Native alternative later via WebGL, L. 12 more look ideas, not a must
- `remotion:2.3.7` — Edges and 3D: outline, roughenEdges, shrinkwrap, tear, bevelAlpha, cylinder, sphere, pageTurn (WebGPU), shatter — MISSING — exception (owner-approved 2026-11-12)
  - approach: [R] only (WebGPU); skip natively
- `remotion:2.3.9` — `createEffect()` custom effect API (2d/webgl2/webgpu backends) — N/A — exception (owner-approved 2026-11-12)
  - approach: [R] only
- `remotion:2.3.10` — `<HtmlInCanvas>` (DOM drawn into canvas, `onPaint`, WebGL/WebGPU; Chrome 149+ flag; nesting needs Chrome 157; Remotion ships its own Chrome… — MISSING — exception (owner-approved 2026-11-12)
  - approach: [R] only. Not portable to our Playwright pages (flag/version: UNVERIFIED there)
- `remotion:2.6.2` — `@remotion/three` `<ThreeCanvas width height>`, drive by `useCurrentFrame` (no `useFrame`), `<Sequence layout="none">` inside, `useVideoTex… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: →EQUAL for a WebGL scene (10b): Three.js bundled, `KIT.three(el, build)` with preserveDrawingBuffer; no React Three Fiber, video textures untested; `tools/runtimes.js`, `tools/selfcheck/runtimes.mjs` (shuffled seeks, pv…
  - approach: owner: bundle Three.js (MIT): [N] `KIT.three(canvas, sceneFn)` that renders one frame per `render(t)` with `preserveDrawingBuffer`; [R] free, but React-only
- `remotion:2.6.3` — `@remotion/skia` (`SkiaCanvas`, `enableSkia`; Shopify react-native-skia CanvasKit WASM) — MISSING — exception (owner-approved 2026-11-12)
  - approach: [R] only; native = skip (CanvasKit is large). Canvas 2D covers most
- `remotion:2.6.4` — `@remotion/rive` `<RemotionRiveCanvas>` — MISSING — exception (owner-approved 2026-11-12)
  - approach: [R] only; skip
- `remotion:2.8.2` — Interactivity: `Interactive.Div/Svg/Path...`, `Interactive.create()` + `InteractivitySchema` (number, boolean, color, enum, array, asset, f… — MISSING — exception (owner-approved 2026-11-12)
  - approach: [R] only; the idea to copy for our studio: edit values inline in `film.js` with codemods (their `@remotion/codemods`). Do not copy skills text

### Manim CE + ManimGL + manim skills (6)

- `manim:m4.2` — GL-only: `CircleIndicate`, `FlashAround`, `FlashUnder`, `ShowCreationThenDestruction(Around)`, `ShowCreationThenFadeOut/Around`, `WiggleOut… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: same helpers cover most
  - approach: native: same module
- `manim:m8.11` — GL fractals `MandelbrotFractal`, `JuliaFractal`, `NewtonFractal`, `MetaNewtonFractal`, `PlaneFractal` — MISSING — exception (owner-approved 2026-11-12)
  - says: `tools/shaders.js` holds the 14 shader transitions, not fractals; except: a GL-only effect; a fragment shader on a canvas is possible but nothing asked for it [10z: except]
  - approach: native WebGL fragment shader (canvas, deterministic per frame) or GL renderer
- `manim:m12.1` — OpenGL/wgpu GPU renderer (shader-drawn strokes/fills, bundled draws) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10i): a ManimGL adapter (`python/reelwright_manim/gl.py`) and tests that skip without it; ManimGL was never installed or run (the owner approved only the CE install; it needs an OpenGL 3.3 context, so local-only, never…
  - approach: optional renderer (GL)
- `manim:m12.11` — GL-only API renames: `ShowCreation`=CE `Create`, `Tex`=`MathTex`, `TexText`=`Tex`, `Text` same, `self.frame`=`self.camera.frame`, `-w` writ… — N/A — exception (owner-approved 2026-11-12)
  - approach: `reelwright_manim.names` alias module (S) so shared helpers work on both
- `manim:m13.1` — Scene block in project.json rendered to a cached clip, played by `KIT.manim()` — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10i): `"manim"` block, `reelwright manim <p> install|doctor|render|verify`, clips cached by input hash, played by `KIT.manim(id)` (`tools/manim.js`, `tools/manim.mjs`, `python/reelwright_manim/`); pvk + hyperframes pla…
  - approach: optional renderer (CE + GL)
- `manim:m13.2` — `"renderer": "manim"` whole-film mode (`tools/renderers/manim.mjs`, same contract as pvk/hyperframes) — MISSING — exception (owner-approved 2026-11-12)
  - says: (not built in 10i: scenes are layers in a normal film)
  - approach: optional renderer, second step

## 6. shotcraft audio, social publishing, JianYing and third-party tools skipped (4) — 4 approved

Plan "Known exceptions": JianYing export, Upload-Post publishing, Freesound tool and the Mixkit/untraceable shotcraft audio.

By source: doodle-shots-motion 4

### anidoodle, video-shotcraft, motion-design-skill, GSAP, Lottie (4)

- `doodle-shots-motion:1.43` — Original score composed in code: 21 genre vocabularies, instruments, form fits length; novelty gate — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10g): 4 numpy beds, chill, drive, house (124 BPM), hiphop (90 BPM), with `drop_bar` / `end_bar` form; proof: tools/selfcheck/sound.mjs (builds all four, deterministic); missing: the lofi and ambient beds from the Appro…
  - approach: do not port the TS engine. Add 3-4 numpy beds (house 124, hiphop 90, lofi, ambient) = replacement for shotcraft Mixkit BGM too
- `doodle-shots-motion:2b.15` — JianYing (CapCut CN) draft export: per-shot clips, caption tracks, SFX/BGM tracks (mac tested, win untested) — MISSING — exception (owner-approved 2026-11-12)
  - approach: skip; if an interchange export is wanted use OpenTimelineIO / FCPXML (documented formats) over timeline.json - separate decision
- `doodle-shots-motion:2b.16` — Social publishing via Upload-Post API (TikTok, IG, YouTube, LinkedIn, X) — MISSING — exception (owner-approved 2026-11-12)
  - approach: do not build: network, accounts, third-party service; conflicts with offline core. Document manual upload
- `doodle-shots-motion:2b.21` — Freesound SFX search/download tool (CC0 default, manifest + credits, no API key) — MISSING — exception (owner-approved 2026-11-12)
  - approach: do NOT ship; the no-key page scraping may breach Freesound terms (UNVERIFIED). Offer instead: manual `assets/sfx/` folder + `sfx-credits.json` checked by qa when a CC BY file is mixed in

## 7. Paid-connector-only (Higgsfield) (20) — 16 approved, 4 proposed

Rows from the Higgsfield audit whose status or approach says the capability (generated media, AI music, cloned voices) needs the paid Higgsfield connector (docs/CONNECTORS.md). Core stays free, local and offline.

By source: higgsfield-workflows 20

### Higgsfield workflows (docusphere, cth9191) (20)

- `higgsfield-workflows:1` — Style locking: three fixed text blocks (image style, video style, avoid-list) reused verbatim for every scene; "style once, action per clip" — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (mixed: EQUAL for free output): theme CSS + brand.json lock the look: tools/look.mjs, themes/*.css). MISSING for generated media: no stored style block feeding `gen`. Owner dropped checkpoint 10l (Higgsfield depth) on 2…
  - approach: Add optional `gen` block in project.json (`style`, `avoid`, per-kind) that `gen` prepends/appends to every prompt and includes in the cache key. Local: themes already do it. Paid need: nothing extra…
- `higgsfield-workflows:2` — Style reference sheet: generate one master board image, get approval, attach to EVERY later generation as the visual source of truth — MISSING — exception (owner-approved 2026-11-12)
  - says: (gen takes a prompt only: tools/gen.mjs, gen/higgsfield.mjs `bodyOf` = prompt + opts)
  - approach: Needs reference-image input on image and video calls (row 8). Higgsfield: image call with reference; model ids in the repo (`nano_banana_pro`, `gpt_image_2`) come from CLI/MCP, NOT from docs.higgsfie…
- `higgsfield-workflows:4` — Assembled prompt columns (IMG = style + shot + text; VID = style + action + text + sfx + avoid) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: columns survive in `raw` but are not used or assembled (tools/beats.mjs header comment)
  - approach: Optional `beats export --prompts` / `gen --beats` that fills IMG/VID PROMPT from the locked style (row 1) + `beats[].shot/motion/onScreen/sfx`. Pure text, free
- `higgsfield-workflows:5` — Clip Duration must be >= VO Length and in the model's allowed set (4/6/8 s) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: `beats` stores `target`/`clip`; no check against measured TTS length (tools/beats.mjs; vo.py measures real length). Allowed-set differs per model: Higgsfield Seedance 2.0 reference-to-video accepts 4-15 s integer, Kling…
  - approach: Add a `sched`/`beats` WARN when a measured VO line exceeds its `clip` (free). Allowed-set table is connector-only knowledge, keep it out of core
- `higgsfield-workflows:8` — Image generation per scene, with reference image(s) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: text-to-image only (`gen --kind image`, default `higgsfield-ai/soul/standard`; tools/gen/higgsfield.mjs). No reference upload
  - approach: Higgsfield REST needs: `POST /files/generate-upload-url` (content_type jpeg/png/webp/gif, wav, mp4) -> PUT presigned URL (no credentials to the storage host) -> pass `public_url` as `image_url`/`imag…
- `higgsfield-workflows:9` — Image-to-video (animate each still; camera move + action, duration, resolution, optional baked audio) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: text-to-video only; default `kling-video/v2.5-turbo/pro/text-to-video` (tools/gen/higgsfield.mjs)
  - approach: Docs-verified endpoints: `kling-video/v2.5-turbo/{pro,standard}/image-to-video` (`image_url`, `duration` 5|10, `cfg_scale`, `negative_prompt`); `bytedance/seedance-2.0/reference-to-video` (`prompt`,…
- `higgsfield-workflows:10` — Motion transfer / video-reference recreation: reuse a supplied clip's choreography with a new subject or copy — MISSING — exception (owner-approved 2026-11-12)
  - says: as generation. The *process* (map + compare) is docs-only
  - approach: Higgsfield endpoints (docs-verified): `POST /higgsfield/genjutsu/motion-transfer/v1.0` (`video_url` >= 4 s, trimmed to 30 s; `image_urls` 1-8; `prompt` <= 10000; `resolution` 480p/720p/1080p; output…
- `higgsfield-workflows:11` — Preset gallery: 10 looks (kinetic typography, glass UI launch, product hyper-motion, tropical product, exploded product, blueprint-to-build… — PARTIAL — PROPOSED (awaiting the owner)
  - says: 4 look-alikes via themes/layouts (kinetic -> `kinetic` layout + brutalist/neon; flat-vector -> playful/pastel; editorial -> editorial; glass UI -> dark-tech + tilted device). Gap: "glass" and "blueprint" palettes. 3D/CG…
  - approach: Native themes `glass`, `blueprint` from palette words only (themes/*.css); optional "recipe" docs per look. CG looks: EQUAL impossible without a video model
- `higgsfield-workflows:13` — Prompt craft rules: viewer takeaway first; each beat reveals something; "headline hidden" meaning test; exact-copy list per shot; reading h… — PARTIAL — PROPOSED (awaiting the owner)
  - says: Truthfulness rules + "Illustrative data" QA gate exist (docs/PLAYBOOK.md, tools/qa.py `illustrative`); reading-hold and takeaway checks not written down as a pre-build checklist
  - approach: Docs: add "Brief" and "Self-review" sections to PLAYBOOK (paraphrased). `wordy`/`tiny-text` WARNs already cover copy density. Owner dropped checkpoint 10l (Higgsfield depth) on 2026-11-09: proposed e…
- `higgsfield-workflows:15` — Prompt-fix recipes: no morphing, one-direction camera, name elements by position, always repeat style in video prompt, longer clip + simple… — MISSING — exception (owner-approved 2026-11-12)
  - says: as docs; only meaningful with generation
  - approach: Short "when a generated clip misbehaves" paragraph in docs/CONNECTORS.md (own words). Free, no code
- `higgsfield-workflows:17` — Audio design: sound effects baked per clip, VO separate, music continuous at ~0.25, clip audio ~0.3 — PARTIAL — PROPOSED (awaiting the owner)
  - says: (mixed: BETTER for UI sounds): synth SFX at `KIT.cue` times, ducking, -14 LUFS normalise, loudness gate (tools/mix.py, tools/qa.py). MISSING: mixing the *embedded* audio of a generated clip at a set level. Owner dropped…
  - approach: Small option in mix.py/`clip` for embedded-audio gain (free). Generated-SFX quality: needs the video model's `generate_audio` (Seedance docs: default true)
- `higgsfield-workflows:19` — Generation orchestration: batches of 3 (plan concurrency), `--wait`, timeouts — PARTIAL — exception (owner-approved 2026-11-12)
  - says: one request at a time, poll 2 s x1.5 to 10 s, 15 min timeout, 429 Retry-After, cache, estimate then confirm (tools/gen.mjs, gen/higgsfield.mjs). No batch/queue
  - approach: `gen --batch beats.csv` running N at a time after one total estimate and ONE confirmation. Docs: concurrency number is per account in the console, not published (verify-higgsfield.md) so default 1-2…
- `higgsfield-workflows:21` — Asset management: scene folders, backups `still-v1`, manifest of prompts/models/job ids, "save exact submitted prompt/settings/job record,… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: /BETTER: `assets/gen.json` (file, provider, model, kind, prompt, date, sha256, host), cache keyed by provider+model+kind+prompt, `verify` hashes assets (docs/CONNECTORS.md). MISSING: version history on regenerate (new p…
  - approach: Keep prior file as `<name>-v1` on overwrite; store `requestId`/`estimateUsd` in manifest; `gen --resume <request_id>` polling an existing job (status endpoint is documented and free to poll)
- `higgsfield-workflows:23` — Review checklist: requirement+time / planned asset / observed result+timestamp / pass-fail-not-inspected; judge story and motion separately… — PARTIAL — PROPOSED (awaiting the owner)
  - says: automated gates for duration/loudness/captions/flash/seekable/ai-label (tools/qa.py) + `stills` contact sheet and "look at frames around every flag" (AGENTS.md). No written per-requirement review table; no "listen for c…
  - approach: Docs-only template in PLAYBOOK (table with the same four columns, own wording) + optional `reelwright review <name>` that prints the table prefilled from `beats` (label, time, exact on-screen copy) w…
- `higgsfield-workflows:24` — Re-generation loop: inspect, fix SHOT/MOTION only (style stays locked), regenerate, keep first result for comparison; cth9191: ONE correcti… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: changing the prompt -> new cache key -> pays again, old cached file kept in `.gen` (tools/gen.mjs) so comparison is possible; no retry bound / counter, no per-beat redo command
  - approach: `gen --redo <beat>`: re-runs one beat's prompt with versioned output (row 21); optional `gen.maxAttempts` per asset in project.json (default 2) that refuses a 3rd paid call without `--yes`. Aligns wi…
- `higgsfield-workflows:26` — One-complete-film request: all timed shots in a single video prompt with design-world, motion-rules, contiguous shots, soundscape, non-dieg… — MISSING — exception (owner-approved 2026-11-12)
  - says: as generation (gen has no multi-shot prompt builder). The same *structure* is Reelwright's own beats + film.js
  - approach: Optional `beats export --film-prompt` producing the one-request prompt text from `beats` (timed shots from `W()`/schedule + exact-copy list + audio block), for pasting or `gen --kind video`. Seedance…
- `higgsfield-workflows:27` — Reference roles: identity vs style vs start/end frame vs motion; storyboard sheet only as general reference, never as literal first frame — MISSING — exception (owner-approved 2026-11-12)
  - approach: Part of the reference upload work (row 8): `refs: [{file, role}]` in a gen request mapped to `image_urls`/`video_urls`/`audio_urls`. Seedance docs: reference arrays cannot be combined with `image_url…
- `higgsfield-workflows:28` — Media upload handoff: local path is not a remote attachment; upload, record returned ids — MISSING — exception (owner-approved 2026-11-12)
  - approach: `files/generate-upload-url` flow (row 8), never send Higgsfield credentials to the presigned storage URL (docs). Our existing rule already keeps creds off the CDN download (tools/gen.mjs)
- `higgsfield-workflows:31` — Targeted video edit / audio finishing via Higgsfield media tools — MISSING — exception (owner-approved 2026-11-12)
  - approach: Not documented on the docs.higgsfield.ai pages read (no edit endpoint found): UNVERIFIED. Local: ffmpeg trim/conform already used by encode; replacement of a bad region = regenerate that beat
- `higgsfield-workflows:32` — Setup / connection (CLI login `higgsfield auth login`, Pro plan; MCP connection) — DIFFERENT — exception (owner-approved 2026-11-12)
  - says: intentionally: REST key via env or git-ignored file, plain fetch, no SDK (docs/CONNECTORS.md). CLI needs a paid plan and browser login (providers.md) so unsuitable for headless
  - approach: docs only; keep REST. MCP: a Claude Code MCP is outside the repo

## 8. The audit's own approach column says skip / defer / not needed (21) — 21 approved

PARTIAL / MISSING rows whose approach column starts with skip, defer, n/a or none, or says "skip" for the hard part. The audit itself proposes not doing these; the reason is in the approach text.

By source: hyperframes 6, remotion 9, doodle-shots-motion 6

### HyperFrames (6)

- `hyperframes:A15` — HTML-in-canvas (`drawElementImage`, Chrome experimental flag) as WebGL/Three texture; draw-element fast capture — MISSING — exception (owner-approved 2026-11-12)
  - says: (eng; flag logic vendored). Browser-version fragile
  - approach: defer; opt-in later. UNVERIFIED on Playwright's headless shell
- `hyperframes:A21` — Interactive slideshow (manifest, fragments, branches, hotspots, presenter view, deck audio), `present`/`play` — MISSING — exception (owner-approved 2026-11-12)
  - says: Output is a live deck, not an MP4
  - approach: defer: out of the video scope; record as "not planned" unless owner wants decks
- `hyperframes:B9` — Map readiness: Leaflet, MapLibre, Mapbox GL, Google Maps (wait for load/tiles) — MISSING — exception (owner-approved 2026-11-12)
  - says: Tiles need network, Mapbox/Google need keys: conflicts with offline core
  - approach: skip live maps; the 7 d3/topojson map blocks (us-map*, world-map...) cover offline data maps (E7)
- `hyperframes:K4` — `SDK` (`openComposition`, `find`, text/style/timing/asset/variable/animation edits, JSON patches, undo/redo, memory/fs/headless adapters, o… — MISSING — exception (owner-approved 2026-11-12)
  - says: only useful for HF-native HTML
  - approach: skip unless H4 is done
- `hyperframes:K5` — `parsers`: HTML parse/serialise, GSAP AST read/write (acorn, recast), `hf-id` stamping, spring-ease generator — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (vendored, unused). Reelwright has its own `KIT.spring`
  - approach: n/a
- `hyperframes:K6` — `inspector` package (source maps, CSS/JS scope analysis for the studio picker) — MISSING — exception (owner-approved 2026-11-12)
  - says: not needed without H2
  - approach: skip

### Remotion + its skills (9)

- `remotion:2.1.15` — Premounting (`premountFor`), `SequenceActivityBudget` — N/A — exception (owner-approved 2026-11-12)
  - says: (pure `render(t)` has no mount cost)
  - approach: none
- `remotion:2.1.20` — `<Folder>`, `<Still>`, many `<Composition>` per project, `id` selection — PARTIAL — exception (owner-approved 2026-11-12)
  - says: one film per project folder
  - approach: none (project folders are our unit)
- `remotion:2.3.12` — Greenscreen via `colorKey()`; video matting (`@remotion/video-matting`, local WebGPU model) — MISSING — exception (owner-approved 2026-11-12)
  - approach: [N] ffmpeg `chromakey`/`colorkey` in a footage pre-pass (S); AI matting = skip (model download, GPU)
- `remotion:2.4.10` — `@remotion/media-parser`, `@remotion/webcodecs` (convert/crop/resize/transcribe in browser), Remotion Convert — N/A — exception (owner-approved 2026-11-12)
  - says: (ffmpeg does this)
  - approach: none
- `remotion:2.5.8` — `@remotion/animated-emoji` (Noto animated emoji) — MISSING — exception (owner-approved 2026-11-12)
  - approach: skip (CC BY 4.0 needs attribution; Lottie covers it if wanted)
- `remotion:2.5.9` — `@remotion/mac-cursors` (macOS cursor set) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: drawn `K.cursor`
  - approach: skip (Remotion Licence)
- `remotion:2.7.11` — Env/config: `remotion.config.ts` (`Config.set*`), `--env-file`, `--log`, `--timeout`, `--bundle-cache`, `--public-dir`, `--port` — N/A — exception (owner-approved 2026-11-12)
  - approach: none
- `remotion:2.7.13` — Media cache sizes: `--media-cache-size-in-bytes`, `--offthreadvideo-cache-size-in-bytes`, `--offthreadvideo-video-threads` — N/A — exception (owner-approved 2026-11-12)
  - approach: none
- `remotion:2.8.5` — Studio export to OpenTimelineIO; Editor Starter ($600) and Timeline (paid) editors; Recorder template; Elements catalog (copy-in components) — N/A — exception (owner-approved 2026-11-12)
  - approach: skip; paid or product-specific

### anidoodle, video-shotcraft, motion-design-skill, GSAP, Lottie (6)

- `doodle-shots-motion:1.18` — 32 art styles (pencil, watercolour, woodcut, rubber hose, sumi-e, toy brick, ...) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10g): 6 of the 32 in `D.styles` (pencil, riso, marker, ballpoint, chalk, blueprint; tools/doodle2.js, docs/playbook/doodle.md); the Approach's 5 cheap ones are all there, the other 26 style plates are not ported by des…
  - approach: do not port 32 (each is hundreds of canvas lines). Port the cheap ones as theme+filter variants over D.ribbon: pencil, marker, chalkboard, blueprint, ballpoint (L for 5). Others: docs 'bring your own…
- `doodle-shots-motion:1.38` — Isometric / low-poly / halftone / stipple render styles — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): style plates, the Approach says skip (halftone/dither exist as HF catalog blocks). Suggest: accept as exception.
  - approach: skip (style plates); halftone/dither exist as HF catalog ordered-dither-pass, halftone-dissolve
- `doodle-shots-motion:1.39` — Photo -> marks (tone + direction fields from a user photo) — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): needs per-style mark engines, the Approach says skip. Suggest: accept as exception.
  - approach: skip: needs per-style mark engines
- `doodle-shots-motion:1.42` — Character consistency across shots/styles — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): needs character rigs, the Approach says skip. Suggest: accept as exception.
  - approach: skip (needs character rigs)
- `doodle-shots-motion:1.44` — Optional recorded-instrument sound pack (piano, harp, marimba... 373 MB, hash-pinned download) — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): 373 MB hash-pinned CC0 + CC BY 4.0 download, the Approach says do NOT bundle and at most an opt-in fetcher. Suggest: accept as exception.
  - approach: do NOT bundle; at most an opt-in `reelwright setup --sound-pack` fetcher. NOTICE says CC0 samples + CC BY 4.0 impulse responses (attribution required)
- `doodle-shots-motion:3.15` — Accessibility / reduced motion / performance / context adaptation — N/A — exception (owner-approved 2026-11-12)
  - says: mp4 output; photosensitivity flash gate exists (qa.py)
  - approach: none needed

## 9. Not applicable by design (N/A, UNVERIFIED, DIFFERENT) (9) — 9 approved

Rows the audit marks n/a, UNVERIFIED or DIFFERENT. Not a gap in the usual sense; the owner confirms they can be dropped from the checklist (or, for UNVERIFIED, tested).

By source: remotion 5, manim 2, doodle-shots-motion 2

### Remotion + its skills (5)

- `remotion:2.4.16` — Arabic/RTL text rules (direction, animate by word, keep letters joined) — UNVERIFIED — exception (owner-approved 2026-11-12)
  - says: (not tested in Reelwright)
  - approach: [D] PLAYBOOK note + add an Arabic/Hebrew test film frame
- `remotion:2.6.10` — Canvas capture, `@remotion/svg-3d-engine`, `@remotion/preload`, `@remotion/enable-scss`, `@remotion/tailwind(-v4)`, `@remotion/babel-loader… — N/A — exception (owner-approved 2026-11-12)
  - approach: Tailwind: `animate-*`/`transition-*` forbidden (skills `tailwind.md`), same as our seekable lint
- `remotion:2.7.16` — `@remotion/renderer` Node API (`renderMedia`, `renderFrames`, `renderStill`, `selectComposition`, `getCompositions`, `stitchFramesToVideo`,… — N/A — exception (owner-approved 2026-11-12)
  - approach: [R] bridge can call the CLI (simplest) or the API; API (`renderFrames` + own ffmpeg) is what Remotion calls "custom workflow": it sends no telemetry automatically
- `remotion:2.7.17` — Bundler / site: `npx remotion bundle`, `serveUrl` reuse across renders — N/A — exception (owner-approved 2026-11-12)
  - approach: [R] bundle once, reuse for stills and frames
- `remotion:2.8.7` — `npx create-video`, `npx remotion add <pkg>` (installs the exact matching version), `npx remotion upgrade`, `versions` — N/A — exception (owner-approved 2026-11-12)
  - approach: [R] scaffold pins every `@remotion/*` to one exact version (a mismatch errors)

### Manim CE + ManimGL + manim skills (2)

- `manim:m1.7` — `Wait` with `stop_condition`, `wait_until` — N/A — exception (owner-approved 2026-11-12)
  - says: by design (data-driven timing; stop conditions are time-dependent state)
  - approach: docs: use `W()`/`V()`
- `manim:m11.4` — Landmines: LaTeX probe (binary present != pipeline works), stale segment cache, HUD vanishes on push-in — N/A — exception (owner-approved 2026-11-12)
  - approach: optional renderer `doctor` runs a 1-frame MathTex probe; own media dir per input hash with caching disabled

### anidoodle, video-shotcraft, motion-design-skill, GSAP, Lottie (2)

- `doodle-shots-motion:4.21` — MotionPathHelper (in-browser path editor) — N/A — exception (owner-approved 2026-11-12)
  - approach: authoring aid for a human in a browser; do not bundle (and it is a visual animation-building tool: see Risks)
- `doodle-shots-motion:4.23` — EaselPlugin / PixiPlugin (canvas libraries) — N/A — exception (owner-approved 2026-11-12)
  - approach: exclude

## 10. Not done, no stated reason (283) — 72 approved, 27 planned, 166 partial, 18 open

PARTIAL / MISSING rows whose own text gives none of the reasons above.

**These 283 rows gave no stated reason in the first compile.** After the re-audit each carries a tag (see the state after every row): accepted exception, planned for Phase 11, partial, or still open without a tag. Nothing here is claimed as done.

By source: hyperframes 60, remotion 38, manim 36, doodle-shots-motion 149

### HyperFrames (60)

#### Docs / PLAYBOOK note only (5)

- `hyperframes:A1` — Root contract: `data-composition-id`, `data-width/height/duration/fps`, `window.__timelines[id]` registry, `data-no-timeline` — PARTIAL — exception (owner-approved 2026-11-12)
  - says: hf/index.html carries the root contract and tools/engine.js:435 registers one `main` shim whose seek(t) calls render(t). HF-native composition files (own root + __timelines entry) are mounted by KIT.mount (docs/playbook…
  - approach: docs: say HF-native roots are allowed beside the KIT shim
- `hyperframes:A20` — Tailwind browser runtime `init --tailwind` (`__tailwindReady`) — MISSING — exception (owner-approved 2026-11-12)
  - says: No `init --tailwind` and no doc line on compiling Tailwind to CSS under hf/. Not built: the runtime is a CDN script, which the offline/deterministic rule (hf-lint, PLAYBOOK) forbids; a prebuilt CSS file in hf/ already w…
  - approach: docs only: "compile Tailwind to CSS"
- `hyperframes:L1` — 9 agent skills (`hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use` core; `figma slideshow remotion-to-hyperframes revers… — PARTIAL — partial, rest planned (open)
  - says: One skill, `.claude/skills/product-video/SKILL.md` (52 lines: commands, workflow, rules), plus AGENTS.md, docs/PLAYBOOK.md, docs/playbook/*.md (incl. claude-workflow.md) and docs/recipes/. No split into per-topic skill…
  - approach: docs: split the product-video skill into references; add registry/CLI skills when the new commands land
- `hyperframes:L2` — Workflow guides: product launch, faceless explainer, PR to video, music/lyric video, captions and recuts, avatar presenter (HeyGen: OUT), p… — PARTIAL — partial, rest planned (open)
  - says: Workflow docs: AGENTS.md workflow, docs/playbook/claude-workflow.md, 8 scene recipes (docs/recipes/), `from-url`. No PR-to-video, lyric-video, faceless-explainer, podcast or captions/recut recipe (no mention in docs). N…
  - approach: docs: add 3 recipes (PR to video via `gh api`, lyric video, faceless explainer)
- `hyperframes:L4` — `prompting/` cookbook (color grading, data and maps, design systems, motion, recreating references, editing existing videos) — PARTIAL — partial, rest planned (open)
  - says: Topic notes cover colour grading (docs/playbook/grading-effects.md), motion (motion.md), design systems (themes.md, theme-brief.md) and editing existing clips (video-audio.md); they document the API rather than give pro…
  - approach: docs only

#### Native code to add in tools/ (or a flag/command) (41)

- `hyperframes:A2` — Timed clips: `data-start`, `data-duration`, `data-track-index`, `class="clip"`; visibility keyed off `data-start`; tracks are display only,… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: Block clips keep working: tools/blocks.mjs rewrites data-start/data-duration to data-block-* and applies them with the block's local time; films show elements from render(t) and PLAYBOOK forbids times in data-start. Mis…
  - approach: native: `KIT.clip(el,{start,end})` that stamps `data-start/duration` from `W()/V()/snap()` at load, so HF tooling and blocks see real attributes
- `hyperframes:A5` — Composition variables: `data-composition-variables` (string number color boolean enum font image), `getVariables()`, `data-var-text/src`, C… — PARTIAL — partial, rest planned (open)
  - says: Per-mount variables exist: KIT.mount/KIT.block `vars` write data-variable-values and window.__hyperframes.getVariables() returns them; blocks keep their declared defaults (tools/compose.js, tools/blocks.mjs, docs/playbo…
  - approach: native: `project.json "variables"` read by `KIT.vars`; `--variables`/`--variables-file` flags
- `hyperframes:A6` — Batch render: one output per variables row (`--batch rows.json`, `--batch-concurrency`, `--batch-fail-fast`, JSON result) — MISSING — planned (Phase 11)
  - says: No batch command in bin/reelwright.mjs or tools/commands/ (`beats import` parses CSV only). Not built: depends on film-level variables (A5). Suggest: build.
  - approach: native: `reelwright batch <project> rows.csv` loops `film` per row with variables A5
- `hyperframes:A19` — Text-fit helpers `__hyperframes.fitTextFontSize`, `pretext` measure (no reflow) — PARTIAL — partial, rest planned (open)
  - says: tools/layouts.js:28 has a private binary-search `fit(el,w,h,max)` (clone, scrollWidth/Height, re-run after fonts) used by the title/number layouts; QA flags caption overflow (tools/qa_page.mjs). Missing: a public `KIT.f…
  - approach: native `KIT.fit(text,{font,maxWidth})` using canvas `measureText`
- `hyperframes:D1` — Audio FX rack per clip: 16 effects (highpass lowpass peaking lowshelf highshelf gain compressor limiter truepeak gate saturate bitcrush del… — MISSING — planned (Phase 11)
  - says: tools/mix.py has per-cue gain, a music duck, loudnorm and a tanh soft clip; no per-clip effect chain, `fx` key in project.json or filter mapping. Not built: no audio clips exist yet to hang a chain on (A8). Suggest: bui…
  - approach: native: map each effect to an ffmpeg filter (highpass, lowpass, equalizer, bass/treble, volume, acompressor, alimiter, agate, asoftclip, acrusher, aecho, chorus, aphaser, rubberband) in `mix.py` / pr…
- `hyperframes:D2` — 22 presets (voice-clean, voice-broadcast, voice-warm, rumble-cut, room-gate, boom-tame, harsh-tame, telephone, radio-am, megaphone, lofi-ta… — MISSING — planned (Phase 11)
  - says: No preset table anywhere in tools/ or docs/playbook/sound.md. Not built: needs the D1 chain. Suggest: build (S, after D1).
  - approach: native presets table on D1
- `hyperframes:D3` — Automation lanes (`data-automation`: volume, FX params, sample-accurate), clip fades, volume above 1 — PARTIAL — partial, rest planned (open)
  - says: tools/mix.py has a −6 dB music duck under subdrop (and impact/riser with music.duck_sfx), per-cue `gain` and a 0.3 s end fade. Missing: automation lanes, per-clip fades, FX-parameter automation, gain above unity per cli…
  - approach: native on D1/A8
- `hyperframes:D4` — Voiceover carve (`data-fx-carve`): EQ-notch the music under named voice tracks — PARTIAL — exception (owner-approved 2026-11-12)
  - says: Music is ducked (gain) under the voice and under SFX (tools/mix.py); no EQ carve or sidechaincompress. Both reach the goal. Not built: carve. Suggest: except.
  - approach: native: ffmpeg `sidechaincompress` + speech-band `equalizer` on the bed
- `hyperframes:D5` — Groups, mute, master bus FX on the root (`data-audio-group`) — MISSING — exception (owner-approved 2026-11-12)
  - says: mix.py is a fixed voice/music/SFX mix with one master loudnorm; no groups, mute or buses. Not built: only matters once D1 exists. Suggest: except.
  - approach: native `buses` in project.json
- `hyperframes:D6` — Beat detection `beats` (writes `.hyperframes/beats`, BPM, beat times) and `audio` analysis (onsets, sections, rhythm, `--place-at`, `--at`,… — PARTIAL — partial, rest planned (open)
  - says: tools/beatgrid.py (`reelwright beatgrid`) fits tempo and phase from sample-accurate kick/transient onsets (residual_ms), bar loudness and the drop → music/grid.json, used via KIT.snap; no selfcheck. Missing: an onset/se…
  - approach: native: `reelwright audio <file>` printing onsets/sections from the same numpy code
- `hyperframes:D7` — `normalize-audio` (EBU R128 match to a reference clip) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: The film is loudnormed to project.json `loudness` (default −14 LUFS) in tools/mix.py. Missing: per-clip match to a reference clip; there is no clip-level audio. Suggest: except unless A8 audio clips are built.
  - approach: native flag on A8 clips
- `hyperframes:D8` — True-peak limiter (4x oversample, lookahead) — PARTIAL — partial, rest planned (open)
  - says: tools/mix.py applies loudnorm TP=−1.5 plus a tanh soft clip; no lookahead oversampling limiter (ffmpeg alimiter is not used). Suggest: build (one ffmpeg filter after loudnorm).
  - approach: ffmpeg `alimiter` after loudnorm
- `hyperframes:D9` — Local TTS `tts` (Kokoro-82M ONNX, 9 language groups, speed) — PARTIAL — partial, rest planned (open)
  - says: tools/vo.py uses edge-tts (online, gives word times). No Kokoro/ONNX provider; the core voiceover stays online. Not built: needs word times from D10 alignment. Suggest: build (opt-in install, like `manim install`).
  - approach: native: `vo` provider `kokoro` (model downloaded once, opt-in), word times from D10 alignment
- `hyperframes:D11` — `media-use resolve`: asset resolver with reuse cache (`.media/`, `~/.media`), types bgm sfx image icon logo voice video brand grade lut; Op… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: Synth SFX/music (tools/mix.py, tools/music.py) and the paid opt-in `gen` connector with an assets/.gen/ prompt-hash cache (tools/gen.mjs). No `asset` resolver, shared cache or Openverse/logo/LUT sources. Not built: need…
  - approach: native `reelwright asset` with a content-hash cache; offline SFX = keep synth; Openverse as opt-in HTTP; skip HeyGen types (OUT)
- `hyperframes:E2` — Asset-bearing components (9) — PARTIAL — partial, rest planned (open)
  - says: 239 single-file components are vendored; tools/commands/add.mjs refuses any component with more than one file (vendor/hyperframes/VENDORED.md: assets/ left out), while converted blocks do ship licence-checked assets (to…
  - approach: copy `assets/` too; licences per CREDITS.md
- `hyperframes:E5` — 8 `examples` registry items (decision-tree, kinetic-type, nyt-graph, play-mode, product-promo, swiss-grid, vignelli, warm-grain) + `init --… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: Themes part BETTER: themes/hf-{bold,editorial,neutral}.css among 27 themes. `reelwright new` offers only example, example-hf and remotion starters (bin/reelwright.mjs); none of the 8 upstream examples is ported. Not bui…
  - approach: port the 8 as `reelwright new --example` starters
- `hyperframes:E6` — `catalog` listing / search by `--type`, `--tag`, `--json`; picker; `add` by tag (`add captions`) — PARTIAL — partial, rest planned (open)
  - says: `add --list [tag]` lists supported blocks and components, filtered by tag (tools/commands/add.mjs, vendor/hyperframes/registry/blocks/CATALOG.md). Missing: a `catalog` command with `--type`/`--json`, a picker, and `add`…
  - approach: native: `reelwright catalog [--tag]` over registry.json; `add` accepts tags
- `hyperframes:E9` — Registry item schema (`registry-item.json`: params, variables, controls, preview, license, stability), `registry.json` — PARTIAL — exception (owner-approved 2026-11-12)
  - says: `add` and tools/blocks.mjs read registry-item.json (variables, tags, files); no JSON-schema validation in tools/ or .github/workflows/ci.yml. Not built: items are upstream's unmodified files, so schema checks add little…
  - approach: validate with the schema in CI
- `hyperframes:F2` — Caption lint: overflow, container-relative position, fit-text scale, shadow on group, hard-kill exit, transcript not inline — PARTIAL — open
  - says: Six caption rules (overflow risk, clipped scaled words, container-relative position, fit-text scale, shadow on group, hard-kill exit) are not in SKIP, so `qa` runs them via the vendored lint; `caption_transcript_not_inl…
  - approach: port as WARN checks
- `hyperframes:F3` — Caption editing in Studio (click a word, restyle, retime) — MISSING — exception (owner-approved 2026-11-12)
  - says: tools/studio/studio.js has no caption panel; captions are drawn by the engine from the VO line text and edge-tts word times, and the inspector edits the line text (re-voice to retime). Not built: hand-retiming or restyl…
  - approach: native studio panel (see H)
- `hyperframes:G1` — `init` (examples, `--resolution` presets, `--video/--audio` with auto-transcribe + H.264 conversion, `--tailwind`, writes AGENTS.md/CLAUDE.… — PARTIAL — partial, rest planned (open)
  - says: `new <name> [--renderer hyperframes/remotion]` copies the example/template (bin/reelwright.mjs); `--formats` covers resolution presets. Missing: `--video/--audio` import, auto-transcribe (D10 not built), writing AGENTS.…
  - approach: add `new --video/--audio` once A7/D10 exist
- `hyperframes:G3` — `capture <url>`: scroll screenshots (default 21, full-page plate), HTML/CSS, visible text, design tokens, fonts downloaded to `assets/fonts… — PARTIAL — partial, rest planned (open)
  - says: tools/capture_site.mjs (`from-url`, `theme-from`): scroll-to-load, hero + per-heading shots, sections, full page, images, text, headings, colours, font names; read-only (writes faked, workers/sockets blocked); `file://`…
  - approach: native: add font download, SVG, animation metadata, loopback `--local-file`, SSRF policy (reject private IPs)
- `hyperframes:G4` — `lint`, `check`, `validate`/`inspect`/`layout` (deprecated): 143 documented lint rules (structure 6, composition contract 27, CSS/scripts 2… — PARTIAL — partial, rest planned (open)
  - says: `qa` runs the vendored `@hyperframes/lint` on hyperframes films (96 of 140 rule codes; 44 SKIP, 5 DOWNGRADE; fixture `qa-broken-lint`; tools/selfcheck/hf-lint.mjs) plus qa.py/qa_page.mjs gates (loudness, captions, flash…
  - approach: ~~wire `lintProject()` into `qa` for hf projects (S)~~ done in 10m; vendor the four in-page audit scripts for layout/occlusion/contrast into `qa_page.mjs` (M)
- `hyperframes:G5` — `snapshot` (frames at `--at`, `--frames N`, `--zoom selector`, `--against ref.mp4`, held video frames) — PARTIAL — partial, rest planned (open)
  - says: `stills [t,t,..]` writes stills/t<time>.jpg (12 evenly spaced by default) and stills/sheet.jpg (tools/renderers/pvk.mjs, hyperframes.mjs, sheet.py). Missing: `--frames N`, `--zoom <selector>`, `--against <ref.mp4>` and…
  - approach: native `stills --zoom` crop; `--against` = G9 diff
- `hyperframes:G6` — `keyframes` (list detected GSAP/CSS/anime keyframes; onion-skin PNG of one element) — MISSING — exception (owner-approved 2026-11-12)
  - says: No keyframe listing or onion-skin command; `render(t)` is a pure function with no tween list to introspect. Not built: low value (the row itself says so), and `stills` at chosen times already shows motion. Suggest: exce…
  - approach: native onion skin: render N frames of one selector with ghosting; low value
- `hyperframes:G7` — `compare` N variants into one labelled PNG; `grade-compare` — PARTIAL — partial, rest planned (open)
  - says: `remix` renders stills at 25/50/75 % in 3 themes x 3 formats onto one labelled sheet (bin/reelwright.mjs, tools/sheet.py). No `compare <dirA> <dirB> --at` for arbitrary variants and no `grade-compare`. Not built: N-vari…
  - approach: native `compare <dirA> <dirB> --at`
- `hyperframes:G8` — `timeline` (list tracks/clips; move/trim/split/delete/set/duplicate/apply with `--plan` diff, receipts, `undo`) and `history` (who/label/fi… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: Script edits exist as `beats import/export` (CSV <-> project.json) and the studio inspector (line text and gap, atomic save, sched re-run: tools/studio/server.mjs). No clip-level `timeline` verbs, `--plan` diffs, receip…
  - approach: native: `reelwright lines/beats` edit verbs with `--plan`, undo from a receipt; studio panel (H)
- `hyperframes:G9` — `reverse` / `measure` (probe, cuts, frames, face) / `diff` (SSIM per frame vs original video, missed/extra cuts, audio offset, non-zero exi… — MISSING — planned (Phase 11)
  - says: No `measure`, `diff` or `reverse` command (bin/reelwright.mjs, tools/commands/); `verify` only compares Reelwright's own frames to its manifest (tools/manifest.mjs). Not built: ffmpeg scene-detect/ssim wrappers. Suggest…
  - approach: native `measure cuts/probe` (ffmpeg scene detect + ffprobe) and `diff` (ffmpeg `ssim`), S each
- `hyperframes:G10` — `render` (see section I) and `benchmark` (tries fps/quality/workers, reports time and size) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: `frames` renders the whole film or a pvk range (`frames <from> <to>`, tools/renderers/pvk.mjs), `PAGES`/`FPS` env and `output.crf` tune it; no `benchmark` command trying fps/quality/workers. Not built: timings depend on…
  - approach: native `benchmark` loops `frames` for a sample range
- `hyperframes:G13` — `doctor` (Node, FFmpeg, Chrome, Docker, GPU, cache dir, version), `browser ensure/path/clear`, `clean`, `info`, `compositions`, `docs <topi… — PARTIAL — partial, rest planned (open)
  - says: `setup`/`setup.mjs` installs and checks node, ffmpeg, Python libs and Playwright Chromium (setup.mjs:53-60), `clean` deletes frames/stills/cache, `manim doctor` checks Manim only; `info` is the timeline.json build step,…
  - approach: native `reelwright doctor` that prints the same checks plus codecs available
- `hyperframes:G15` — `--json` envelope on every command, `_meta` version/update notice, exit codes 0/1/2, "did you mean" — PARTIAL — partial, rest planned (open)
  - says: Exit codes: 0, and 1 on a FAIL gate or error (qa.py, bin/reelwright.mjs `run`); machine-readable files exist (timeline.json, .manifest.json, stills/). No global `--json` envelope, no version/update `_meta`, no exit code…
  - approach: native: `--json` for `stills`, `qa`, `info`, `sched` first
- `hyperframes:G16` — `figma asset/tokens/component` (REST: SVG/PNG/JPG/PDF assets frozen under `.media/`, variables to brand tokens, frame to editable HTML) + F… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: tools/figma_export.py exports a file's or node's top-level frames as PNG at `--scale` (default 2) with frames.json, using FIGMA_TOKEN. No SVG/PDF export, no variables-to-brand.json, no frame-to-HTML, no Figma Motion. No…
  - approach: native: SVG/PDF export + variables to `brand.json`; component-to-HTML is a large step (L)
- `hyperframes:H2` — Edits source-backed DOM: click element in preview, Design panel (Text, Layout, Style, Media, Motion, Effects, Grade, 3D transform), canvas… — MISSING — exception (owner-approved 2026-11-12)
  - says: The studio never touches the frame DOM or film.js/hf (docs/playbook/studio.md 'What it never does'). Not built: Reelwright's DOM is created by `render(t)` every frame, so there is no source-backed element to patch from…
  - approach: native editor edits what Reelwright actually stores (script lines, gaps, theme, layout, format)
- `hyperframes:H3` — Timeline: tracks, move/trim/split/ripple/linked selection/snapping/beat markers/range select; waveform and meters; nested-composition drill… — PARTIAL — partial, rest planned (open)
  - says: Studio timeline (tools/studio/studio.js): scenes with gaps, VO lines, beat/bar grid with the drop, SFX cues; click/drag seek, space/arrows/shift; inspector edits line text and gap. Missing: waveform and meters (only `pr…
  - approach: native timeline of VO lines, SFX cues, music grid, drop, captions (read from `timeline.json`), drag a gap to edit `project.json`
- `hyperframes:H5` — Right-panel tools: Audio FX rack with presets, Blur (motion blur) tab, Variables, Slideshow, Renders panel (format/resolution/fps/quality/G… — PARTIAL — partial, rest planned (open)
  - says: Inspector (text, gap, style, title, fps), raw project.json and brand.json editors, stills at the playhead, contact sheet, taste and embed jobs, job log (tools/studio/studio.js; job allow-list sched/audio/stills/taste/em…
  - approach: native panels, in priority order: renders queue, QA/lint, script/VO lines, stills sheet
- `hyperframes:I4` — Quality: `draft`, `looks` (CRF 16), `standard`, `high`/`delivery`; `--crf`, `--video-bitrate`, `--max-bitrate`, `--buffer-size`, `--keyfram… — PARTIAL — partial, rest planned (open)
  - says: mp4 is x264 slow, high profile, AAC 256k; `output.crf` sets mp4 (default 16) and webm (24) quality (tools/renderers/pvk.mjs encode, docs/playbook/output-formats.md). No draft/standard/high presets, no bitrate/maxrate/bu…
  - approach: native flags mapping to ffmpeg args
- `hyperframes:I5` — Resolution presets and 4K supersampling (`--resolution 4k/portrait-4k/square-4k` via `deviceScaleFactor`, aspect must match) — PARTIAL — partial, rest planned (open)
  - says: Size comes from project.json width/height or `--formats` (re-layout, 5 formats). `output.scale` only resizes the extra output format (webm/mov/gif/apng/png), not the mp4, and pages use deviceScaleFactor 1 (pvk.mjs:70, s…
  - approach: native: `--scale 2` sets Playwright `deviceScaleFactor` (pvk) / `resolution` option (hf)
- `hyperframes:I8` — Workers `--workers` 1-24 (auto by cores/memory/frames), `--low-memory-mode`, Chrome per worker ~256 MB — PARTIAL — partial, rest planned (open)
  - says: `PAGES=N` sets render tabs (pvk) or producer workers (hf), default 4 (pvk.mjs:59, hyperframes.mjs:66); no auto-tuning from cores/RAM and no low-memory mode. Not built: auto default. Suggest: build (S: min(cores/2, RAM/5…
  - approach: native: default = min(cores/2, RAM/512 MB)
- `hyperframes:I10` — Streaming encode (no raw frames on disk), segmented capture + `--resume`, partial `--start/--end` render — PARTIAL — partial, rest planned (open)
  - says: pvk: `frames [from] [to]` and the `.cache/frames/` content-hash cache re-render only changed frames (BETTER for iteration); hyperframes ignores the range ('renders the whole film', hyperframes.mjs:119) and has no frame…
  - approach: native: let hf reuse `.cache/frames` by content hash; `frames <from>-<to>`
- `hyperframes:I13` — Timeouts and safety: browser/player-ready/protocol timeouts, `--strict`, `--best-effort`, render lock queue, preflight disk estimate — PARTIAL — partial, rest planned (open)
  - says: `qa` exits 1 on a FAIL gate, WARN lines never fail; the hf path uses producer defaults; no `--strict`, `--best-effort`, timeouts flags, render lock or disk estimate. Not built: `--strict`. Suggest: build (S: `qa --stric…
  - approach: expose `--strict` = fail on lint/QA warnings
- `hyperframes:K2` — `init --video` converts non-web codecs to H.264, preview proxies for HEVC/ProRes — PARTIAL — exception (owner-approved 2026-11-12)
  - says: Render needs no transcode: `KIT.video` frames are extracted by ffmpeg, so HEVC/ProRes work (tools/renderers/media.mjs; docs/playbook/video-audio.md). No import-time H.264 conversion (`new --video` does not exist) and no…
  - approach: ffmpeg transcode on import

#### Vendor a library (2)

- `hyperframes:B5` — Lottie / dotLottie (`window.__hfLottie`, `goToAndStop`) — PARTIAL — partial, rest planned (open)
  - says: lottie-web 5.13.0 in vendor/lottie/; `KIT.lottie` (tools/runtimes.js) seek-driven, svg + canvas; tools/selfcheck/runtimes.mjs checks a shape animation under shuffled seeks on pvk and hyperframes; docs/playbook/runtimes.…
  - approach: vendor lib: `lottie-web` (+ `@lottiefiles/dotlottie-web`) bundled; seek test for masks/text/images; `K.lottie(anim)`
- `hyperframes:B8` — d3 transitions readiness (`__hfD3`) — PARTIAL — partial, rest planned (open)
  - says: d3 7.9.2 UMD (includes d3-delaunay) is vendored (vendor/d3/) and copied to hf/kit/d3/ by tools/kit_files.mjs; the map blocks load it and pass tools/selfcheck/blocks.mjs. No KIT helper, pvk loading or playbook recipe for…
  - approach: vendor lib `d3` (ISC) + `d3-delaunay`; call `.tick`/pure scales from `render(t)`, no transitions

#### Points at another row (5)

- `hyperframes:E8` — Caption-style components (16, tag `caption-style`) + 1 caption block; fed by a transcript — PARTIAL — partial, rest planned (open)
  - says: All 17 caption-* components are vendored and installable with `reelwright add` (vendor/hyperframes/registry/components/caption-*). Reelwright's own karaoke captions come from VO words (KIT.subtitles). Missing: a transcr…
  - approach: link to D10; add a `captions` adapter that writes `transcript.json` from `timeline.json` words
- `hyperframes:F4` — `caption-zone` and `frame-check` gates — PARTIAL — partial, rest planned (open)
  - says: Safe area is enforced two ways: `KIT.safe` and the qa.py `captions` gate (caption row inside the safe box, tools/qa_page.mjs:69); the taste plug-in adds cramped/empty/balance WARNs. There is no `--caption-zone` / `--fra…
  - approach: see G4
- `hyperframes:G2` — `add`, `catalog` — PARTIAL — partial, rest planned (open)
  - says: `add <name>` installs a component or block and `add --list [tag]` lists supported blocks and components, filtered by tag (tools/commands/add.mjs). Missing: a `catalog` command with `--type`/`--json`, a picker, and `add`…
  - approach: see E6
- `hyperframes:G11` — `preview` (hot reload, background/foreground/status/list, port) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: `preview` (tools/preview.mjs): live scrubber on :4173 (PORT=), fs.watch + SSE reload at the same t, Host-checked; `studio` adds a port flag. Missing: background/foreground/status/list sub-commands. Not built: one local…
  - approach: see H
- `hyperframes:H1` — What it is: `npx hyperframes preview` serves the React 19 app `@hyperframes/studio` (167k lines TS/TSX, 977 files, Vite + Bun build) on the… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: `reelwright studio` (tools/studio/server.mjs, studio.js, studio.html; ~630 lines plain JS, 127.0.0.1, Host/Origin checked, writes only project.json/brand.json) around the vendored player; self-check `node tools/selfchec…
  - approach: see H-verdict below

#### Other (read the approach text) (7)

- `hyperframes:D10` — `transcribe`: Whisper.cpp (tiny..large-v3) or Parakeet TDT 0.6B v3 (sherpa-onnx, 25 langs); imports whisper JSON, OpenAI JSON, SRT, VTT; ex… — MISSING — planned (Phase 11)
  - says: No transcribe command in bin/reelwright.mjs or tools/commands/; word times come only from edge-tts for its own lines; no SRT/VTT/whisper-JSON import. Not built: needs an opt-in model download. Suggest: build (faster-whi…
  - approach: opt-in download: python `faster-whisper` (MIT, CTranslate2) or `whisper.cpp`; Parakeet model is CC-BY-4.0 (needs attribution), runtime Apache-2.0
- `hyperframes:H4` — Keyframe animation panel (auto-record manual edits as keyframes, GSAP AST read/write via `@hyperframes/parsers`) — MISSING — exception (owner-approved 2026-11-12)
  - says: No keyframe or GSAP authoring in the studio (docs/playbook/studio.md: never writes film.js or animation code). Not built: films are `render(t)` code, not keyframe data, and GSAP's licence argues against shipping an auth…
  - approach: only for hf-native comps (A2); not for `render(t)` films
- `hyperframes:I3` — fps: 1-240 or rational (`30000/1001`); root `data-fps` — PARTIAL — exception (owner-approved 2026-11-12)
  - says: fps comes from `FPS` env or project.json `fps` (integer, default 60; tools/render.mjs:33, hyperframes.mjs:36, studio inspector validates it); no `--fps` flag, no rational rates like 30000/1001. Not built: frame cache ke…
  - approach: accept rational, add `--fps` flag
- `hyperframes:I9` — GPU: `--gpu` hardware ffmpeg (NVENC, VideoToolbox, AMF, VAAPI, QSV), `--browser-gpu` — MISSING — exception (owner-approved 2026-11-12)
  - says: Software GL is forced (`PRODUCER_BROWSER_GPU_MODE` default software) and the encode is libx264/libvpx; no hardware-encode flag. Not built: hardware encoders and GPU rasterisation vary by machine, which is what the repea…
  - approach: opt-in `--gpu` encode flag only
- `hyperframes:I11` — Docker deterministic render (`--docker`) — MISSING — exception (owner-approved 2026-11-12)
  - says: No Dockerfile or `--docker` (repo has cloud/ Colab files and .github/workflows only). Determinism is software GL + `verify` + docs/REPRODUCIBLE.md. Not built: a container adds an install step with no repeatability gain…
  - approach: optional `Dockerfile` for CI only
- `hyperframes:K1` — `remove-background`: `u2net_human_seg` ONNX (~168 MB, CoreML/CUDA/CPU), outputs webm-alpha / ProRes 4444 / PNG, `--background-output` plate… — MISSING — exception (owner-approved 2026-11-12)
  - says: No background-removal code anywhere in tools/ or bin/. Not built: needs a ~168 MB u2net model plus onnxruntime for an effect product-demo films rarely use; a pre-cut alpha webm/PNG already plays through `KIT.video` / `K…
  - approach: opt-in download (model + `onnxruntime`), needs I2 for alpha output
- `hyperframes:K3` — Local generation: mflux images, LTX video (opt-in) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: `gen --provider higgsfield` is paid and opt-in, and `gen --import <file> --source firefly/express` registers a file made elsewhere, offline (tools/gen.mjs, tools/gen/). No local mflux or LTX provider. Not built: multi-G…
  - approach: out of scope; keep `gen`

### Remotion + its skills (38)

#### Docs / PLAYBOOK note only (2)

- `remotion:2.6.5` — Spline/Figma/After Effects import — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10b): `tools/figma_export.py` exports PNG; After Effects reaches films as Lottie JSON through `KIT.lottie` (tools/runtimes.js, CI demo projects/runtimes-hf); missing: the SVG-paste note for Figma in the docs, Spline. S…
  - approach: [D] mention SVG paste for Figma
- `remotion:2.6.11` — Text rules in skills `video-layout.md`: 1080-wide minimums 84 px headline, 44 px supporting; safe area 80 px sides, 100 px top/bottom — PARTIAL — partial, rest planned (open)
  - says: (10z audit): `KIT.safe` title-safe box per format (6 % sides and 8 % top / bottom at 16x9, tools/engine.js) and the qa tiny-text WARN below 24 px * `KIT.u` (tools/qa_page.mjs); missing: the 84 px headline / 44 px suppor…
  - approach: [D] cite in PLAYBOOK as defaults (rewrite wording)

#### Native code to add in tools/ (or a flag/command) (33)

- `remotion:2.1.2` — Extrapolation modes `extend`, `clamp`, `identity`, `wrap` (default `extend`) — PARTIAL — open
  - says: (10z audit): `K.keys`, `K.seg`, `K.local`, `K.remap` clamp only (tools/engine.js, tools/shots.js); missing: `extend`, `identity`, `wrap` for numbers (a new module, engine.js is frozen). [N] gap; [R] core `interpolate()`…
  - approach: [N] add `{left,right}` modes to `K.keys`
- `remotion:2.1.3` — `output:'perceptual-scale'` — MISSING — planned (Phase 11)
  - says: (no grep hit). Not built (10z audit): no perceptual-scale anywhere (a log-space lerp exists only inside the tools/media.js speed ramps). [N] gap; [R] core `interpolate()` has it in React films only. Suggest: build
  - approach: [N] area-space lerp, 1 line (Phase 9 item 3)
- `remotion:2.1.4` — `posterize` N (stepped look) — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): no `posterize` option; stepping a film's time is one expression (`K.keys(Math.floor(t * n) / n, pts)`), so a helper adds nothing. [R] core `interpolate()` has it in React films only. Suggest: acce…
  - approach: [N] `K.keys` option: sample every Nth frame (needs fps)
- `remotion:2.1.5` — `outputType` string outputs (`"20deg"`, `"0px 0px"`, transform-origin, font-weight) — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): no unit-string lerp callable from `render(t)`; `KIT.gsap` / `KIT.anime` tweens interpolate units, colours and transforms natively and pass shuffled seeks (tools/selfcheck/runtimes.mjs). Suggest: a…
  - approach: [N] small `K.lerpStr` for CSS values with units; low priority
- `remotion:2.1.6` — `interpolateColors()` (rgb, hsl, oklab, easing option) — PARTIAL — partial, rest planned (open)
  - says: (10b): colours tween under seek through `KIT.gsap` / `KIT.anime` (anime `backgroundColor` fixture in tools/selfcheck/runtimes.mjs, which passed in the 10z audit); missing: a pure `K.color` rgb/hsl/oklab lerp callable fr…
  - approach: [N] oklab/rgb lerp helper (also needed by theme tokens)
- `remotion:2.1.9` — `random(seed)` deterministic PRNG (mulberry32 over string hash) — PARTIAL — open
  - says: (10g): `D.rng(seed)` (mulberry32) + `D.hash(str)` (FNV-1a) in tools/doodle.js, proven by tools/selfcheck/doodle2.mjs; `KIT.transition`, `KIT.math3d` keep private copies; missing: a public `K.random(seed)` outside doodle…
  - approach: [N] expose `K.random(seed)` (seeded) and lint hint
- `remotion:2.1.10` — `<Sequence from trimBefore durationInFrames playbackRate loop freeze premountFor postmountFor layout name>` — PARTIAL — open
  - says: (10a/10e): pieces exist: `K.local(t,from,dur,rate)` (tools/engine.js), `K.remap` time-remap points for trim/rate/freeze (tools/shots.js), `K.video` `in`/`rate`/`ramp` (tools/media.js), `KIT.mount` `playbackStart` (tools…
  - approach: [N] add `K.seq({from,trim,dur,rate,loop,freeze})` returning local time or null (Phase 9 item 4); [R] gives components
- `remotion:2.1.11` — `<Series>` / `Series.Sequence offset` — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): scene starts come from `V()` / `W()` and the script's `gap`s (tools/sched.py), which already sum the scene lengths and give `offset`. [R] core `<Series>` in React films only. Suggest: accept as ex…
  - approach: [N] `K.series([{dur,offset}])` returns start times; sums scene lengths
- `remotion:2.1.12` — `<Loop times durationInFrames>` / `useLoop()`; `loop` prop — PARTIAL — partial, rest planned (open)
  - says: (10b): `KIT.lottie(..., {loop})` loops a Lottie (tools/runtimes.js, tools/selfcheck/runtimes.mjs); everything else is modulo by hand; missing: a general loop helper (planned inside `K.seq`, not built). [R] core `<Loop>`…
  - approach: [N] `K.seq` `loop` covers it
- `remotion:2.1.13` — `<Freeze frame>` / `<Sequence freeze>` — PARTIAL — open
  - says: (9b/10e): `K.remap` with slope 0 holds a source time (tools/shots.js); `KIT.shot.bulletTime` `world(t)` freezes the scene clock while the camera moves (tools/shots2.js, tools/selfcheck/motion/shots2.mjs); `K.keys` clamp…
  - approach: [N] `K.seq` `freeze` (local time held)
- `remotion:2.1.21` — `@remotion/animation-utils` `interpolateStyles`, `makeTransform` — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): no style-object lerp (`K.styles`); GSAP tweens in `KIT.gsap` animate whole style sets with units natively (shuffled-seek proven, tools/selfcheck/runtimes.mjs) and `K.camCSS` builds transform strin…
  - approach: [N] `K.styles(t, keys)`: lerp whole style objects (needs unit parsing, see row above)
- `remotion:2.2.10` — Starburst / `filmBurn` / `starburst()` effect, `@remotion/starburst` — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): no starburst / filmBurn; `KIT.transition` `lightLeak` / `flash` and the vendored blocks `light-leak`, `editorial-flash-overlay`, `organic-light-leak-overlay` (vendor/hyperframes/registry/blocks) c…
  - approach: [N] optional CSS conic burst; low value
- `remotion:2.3.11` — Motion blur: `<HtmlInCanvasMotionBlur shutterAngle=180 samples=8>`; `<CameraMotionBlur samples=10>`; `<Trail layers lagInFrames trailOpacit… — PARTIAL — open
  - says: (10a): the shutter model is built on both renderers: project.json `"motionBlur": {shutter, samples}` (pvk averages sub-frame `render(t)` with ffmpeg `tmix`, hyperframes passes the engine's sub-frame option; tools/render…
  - approach: [N] shutter model (verified from `CameraMotionBlur.tsx`: samples k=1..n at offsets `shutterAngle/360 * k/n` frames behind, each at opacity 1/n, additively blended): render N sub-frame times and avera…
- `remotion:2.4.1` — `<Video>` (@remotion/media; Mediabunny/WebCodecs; frame-perfect; trimBefore, durationInFrames, playbackRate, loop, volume curve, muted, obj… — PARTIAL — open
  - says: (10a): `KIT.video(src, {start, dur, in, rate, ramp, audio, volume})` (tools/media.js, docs/playbook/video-audio.md; rendered in CI demo projects/engine-hf): ffmpeg pre-extracts frames for pvk, a `<video>` for hyperframe…
  - approach: [N] `K.video(src, {trim, dur, rate})` for imported mp4s: pre-extract frames with ffmpeg (deterministic), seek by `<img>` index (same idea as OffthreadVideo); [R] free
- `remotion:2.4.4` — `<Audio>` trim (`trimBefore`, `durationInFrames`), delay (`from`), `volume` static or per-frame curve, `muted` toggle, `playbackRate` (no r… — PARTIAL — open
  - says: (10a): `KIT.audio(src, {start, in, out, gain, fadeIn, fadeOut})` mixed over mix.wav at encode, plus `KIT.video` `audio` / `volume` and speed-ramped sound with pitch kept (tools/media.js, tools/renderers/media.mjs, docs/…
  - approach: [N] `K.audio(src,{from,trim,dur,vol:[[t,v]...],rate,loop})` -> mix.py layer with an envelope; pitch via ffmpeg `asetrate/atempo` or `rubberband` if present. In [R] mode Reelwright still mixes (render…
- `remotion:2.4.7` — Audio visualisation: `useWindowedAudioData`, `visualizeAudio` (FFT bins, numberOfSamples power of 2, bass = left), `visualizeAudioWaveform`… — PARTIAL — partial, rest planned (open)
  - says: `KIT.pulse` / beats only (beatgrid.py). Not built (10z audit): no continuous spectrum or level (`K.level(t)`, `K.spectrum(t,n)`); no FFT in the build besides music.py synthesis. [N] gap; [R] `@remotion/media-utils` hook…
  - approach: [N] build-time numpy FFT -> per-frame `bands` array in kit data, `K.level(t)`, `K.spectrum(t,n)` (Phase 9 item 7). Pure lookup
- `remotion:2.4.9` — Silence detection recipe (loudnorm `input_thresh` -> `silencedetect noise=..:d=0.5`; merge gaps <0.2 s); `getSilentParts()` in renderer — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): no silence-detect step; VO is TTS (no dead air) and music is trimmed with `music.start`; only user-supplied recordings would need it, and `ffmpeg silencedetect` is one command by hand. Suggest: ac…
  - approach: [N] `tools/silence.py` or in mix.py to trim VO/takes (Phase 9 item 8)
- `remotion:2.4.13` — Animated images `<AnimatedImage>` (GIF/APNG/WebP/AVIF, `playbackRate`, `loopBehavior` loop/pause-after-finish/clear-after-finish, fit) and… — MISSING — planned (Phase 11)
  - says: (no GIF layer). Not built (10z audit): no animated-image layer; `KIT.video` may accept a .gif source (ffmpeg extracts GIF frames) but that is untested here. [N] gap; [R] core `<AnimatedImage>` / `@remotion/gif` in React…
  - approach: [N] decode GIF/APNG to PNG frames with ffmpeg at build, show frame by index from `render(t)`; honour loop behaviours. [R] free
- `remotion:2.4.14` — Cropping `cropLeft/Right/Top/Bottom` ratios on any layer — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (CSS clip-path by hand). Not built (10z audit): no `K.crop`; `clip-path: inset(t r b l)` is the one-liner (it is what tools/transitions.js uses for wipes). Suggest: accept as exception
  - approach: [N] `K.crop(el,{l,r,t,b})`
- `remotion:2.4.17` — `@remotion/layout-utils`: `measureText`, `fitText`, `fitTextOnNLines`, `fillTextBox` (overflow check); `measureDomNodes` — PARTIAL — partial, rest planned (open)
  - says: qa gates caption fit / contrast and overlap / tiny-text WARNs (tools/qa_page.mjs). Not built (10z audit): no authoring-time `K.fit` / `fitText` / `measureText` helper. [R] `@remotion/layout-utils` in React films only. S…
  - approach: [N] `K.fit(el, {w,h,maxLines})` binary search on font-size using DOM measure
- `remotion:2.4.18` — `@remotion/rounded-text-box` (rounded highlight box behind multi-line text) — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): no rounded text-highlight box; `KIT.math.surround` / `backgroundRect` (tools/math2.js) draw a rounded box around one element's rect. Suggest: accept as exception (low value)
  - approach: [N] optional SVG path builder; low value
- `remotion:2.5.1` — `Caption` JSON type `{text, startMs, endMs, timestampMs, confidence, pageBreakAfter?}`; whitespace-sensitive (leading space per word) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: our VO words `{w,t,d}` in seconds. Not built (10z audit): no `Caption` JSON adapter; captions leave as .srt / .vtt beside the mp4 (tools/renderers/pvk.mjs `subtitles`), which is the interchange format. Suggest: accept a…
  - approach: [N] export/import adapter `toCaptions()/fromCaptions()` so tools can share data
- `remotion:2.5.5` — Transcribe: `@remotion/whisper-webgpu` (WebGPU, Node/browser, Transformers.js), `whisper-web`, `install-whisper-cpp` (whisper.cpp), `openai… — MISSING — exception (owner-approved 2026-11-12)
  - says: (we only have TTS word times). Not built (10z audit): no speech-to-text; needs a model download and the owner's call on model size, and the VO is generated, not recorded. Suggest: accept as exception (revisit if films s…
  - approach: [N] optional `reelwright transcribe <audio>` via whisper.cpp or faster-whisper (local, offline after model download, opt-in); needs maintainers' call on model size
- `remotion:2.5.7` — Text highlights `@remotion/rough-notation` (Highlight, Circle, Underline, StrikeThrough, CrossedOff, Box, Bracket; `progress` prop; roughjs) — PARTIAL — partial, rest planned (open)
  - says: (10g/10h): `KIT.doodle` underline / circle / drawOn (tools/doodle.js), `D.stroke` pen-style freehand lines usable for any mark (tools/doodle2.js, tools/selfcheck/doodle2.mjs), `KIT.indicate.circumscribe` (tools/motion.j…
  - approach: [N] extend `KIT.doodle` with highlight, strike, crossed, box, bracket (Phase 9 item 9)
- `remotion:2.6.6` — `@remotion/shapes`: components (Rect, Circle, Ellipse, Triangle, Star, Polygon, Pie, Heart, Arrow, Callout, Spark) + `makeX()` returning `{… — PARTIAL — open
  - says: (10h): `KIT.math.shape.*` path builders (tools/math2.js, tools/selfcheck/motion/math2.mjs): circle, ellipse, rect, roundedRect, regularPolygon (triangle / polygon), star, sector (pie), arc, arrow; missing: heart, callou…
  - approach: [N] port the `make*` functions into `tools/shapes.js` (`KIT.shape.*`); [R] free
- `remotion:2.6.8` — `@remotion/noise` `noise2D/3D/4D(seed,x,y,z,w)` (simplex-noise 4.0.1 + seed) — PARTIAL — open
  - says: (10g): `D.noise(seed, x, y)` seeded 2-octave gradient noise in [0, 1] (tools/doodle2.js; determinism and smoothness proven in tools/selfcheck/doodle2.mjs, which passed in the 10z audit); missing: 3D / 4D, simplex, and a…
  - approach: [N] add `KIT.noise2/3` by depending on `simplex-noise` (MIT, npm) or a 30-line seeded simplex
- `remotion:2.7.1` — Codecs `h264` (default), `h265`, `vp8`, `vp9`, `av1`, `prores` (profiles proxy..4444 XQ), `gif`, audio-only `mp3/aac/wav`, image sequence `… — PARTIAL — open
  - says: (10a): `encode()` (tools/renderers/pvk.mjs, docs/playbook/output-formats.md): H.264 + AAC mp4 always, plus `output.format` webm (VP9 + Opus, alpha), mov (ProRes proxy / lt / 422 / hq / 4444 / 4444xq), gif, apng, png fol…
  - approach: [N] `--codec h265/vp9/av1/prores/gif` presets in `encode()` (ffmpeg flags; no Remotion needed) and `project.json` `"codec"`
- `remotion:2.7.2` — Quality knobs: `--crf`, `--video-bitrate`, `--max-rate`, `--buffer-size`, `--x264-preset`, `--gop`, `--jpeg-quality`, `--pixel-format`, `--… — PARTIAL — partial, rest planned (open)
  - says: (10a): `output.crf` (mp4 16, webm 24), `output.scale` and `gifFps` in `encode()` (tools/renderers/pvk.mjs); everything else stays fixed (`-preset slow`, yuv420p, high profile); missing: video-bitrate, max-rate, buffer-s…
  - approach: [N] expose crf/preset/bitrate/pix_fmt/colorspace in project.json -> `encode()`
- `remotion:2.7.3` — Hardware-accelerated encode (`--hardware-acceleration`, VideoToolbox / NVENC) — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): no hardware encode; it needs the machine's GPU encoder, differs per platform and would break byte-identical encodes. Suggest: accept as exception
  - approach: [N] optional `"hwaccel": true` -> `h264_videotoolbox`/`h264_nvenc` with fallback
- `remotion:2.7.5` — Frame range `--frames 0-9`, `100-`, single, comma list (tested: `0,30,60` gives `element-00/30/60`); `--every-nth-frame`; `--duration` — PARTIAL — open
  - says: (10.0): pvk `stills t,t,...` and `frames [from] [to]` (tools/renderers/pvk.mjs); the hyperframes renderer ignores a frame range ("renders the whole film", tools/renderers/hyperframes.mjs); missing: `--every-nth-frame`,…
  - approach: [N] nothing; pvk already has ranges; [R] used by stills
- `remotion:2.7.10` — Parameterised renders: `--props file.json|'{...}'` -> `getInputProps()`/component props; `defaultProps`; Zod `schema` (all Zod types, `zCol… — PARTIAL — partial, rest planned (open)
  - says: `project.json` + `--lang` / `--style` / `--formats` only. Not built (10z audit): no per-run props (`all --props data.json`, `KIT.props`, batch from a csv); the Remotion renderer passes only project / vo / music as props…
  - approach: [N] `reelwright all --props data.json` -> merged into kit data `window.PROPS` and `KIT.props`; `batch <csv>` loops builds (S); schema validation = JSON Schema file `props.schema.json`. [R] free (Zod)
- `remotion:2.7.14` — HDR (not supported: headless Chrome), Rspack, `--repro` bundle, `--metadata key=value` into the mp4, `--license-key`, `--is-production` — PARTIAL — partial, rest planned (open)
  - says: (10a): HDR is built on hyperframes (`output.hdr`, HEVC Main 10 HLG / PQ when the page has HDR sources; docs/playbook/output-formats.md), which Remotion does not do; manifest.json carries the hashes (tools/manifest.mjs);…
  - approach: [N] write title/comment metadata via ffmpeg `-metadata` in encode (S). HDR = not supported (document)
- `remotion:2.8.4` — `<Player>` (`@remotion/player`): controls, loop, autoPlay, inFrame/outFrame, playbackRate, fullscreen, volume, poster, `renderCustomControl… — PARTIAL — open
  - says: (10d): `reelwright embed` writes one self-contained page played by the vendored HyperFrames player (controls, loop, muted, autoplay, volume, playback-rate, poster attributes; mix.wav as audio; offline, `#12.5` opens at…
  - approach: [N] our own tiny player over `render(t)` (no Remotion): timeline slider + audio element (mix.wav) + pure render; Remotion's Player needs a React app and, for companies, makes you an "Automator" (Term…

#### Other (read the approach text) (3)

- `remotion:2.4.2` — `<OffthreadVideo>` (Rust+FFmpeg exact frame as `<Img>`; `transparent`) — PARTIAL — open
  - says: (10a): same mechanism natively: pvk pre-extracts exact frames with ffmpeg and shows them as `<img>` (tools/renderers/media.mjs, `KIT.video`); missing: `transparent` (alpha) source video, since the extracted frames are J…
  - approach: same
- `remotion:2.6.9` — Maps: static map as image; Mapbox GL, MapLibre GL, MapTiler SDK + Turf, CesiumJS flyovers (Google 3D tiles needs billing key); render-stabi… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10f): offline maps from the vendored d3 + topojson + world / US atlases as blocks `world-map`, `us-map-bubble`, `us-map-hex` (vendor/hyperframes/registry/blocks, tools/selfcheck/blocks.mjs samples the d3 + atlas path);…
  - approach: static map: [D] `<img>` already works. MapLibre route animation: optional [N] later (MapLibre BSD-3, but tiles need network/key: breaks offline-core, keep opt-in). Mapbox/Cesium/MapTiler/Google need…
- `remotion:2.8.1` — Remotion Studio (`npx remotion studio`): timeline, props sidebar (Cmd/Ctrl+J), canvas zoom, quick switcher, shortcuts, render-from-UI, WebM… — PARTIAL — open
  - says: (10k): `reelwright studio` (tools/studio/, docs/playbook/studio.md): vendored player, timeline of scenes / VO / beats / SFX, inspector for line text, gap, style, title, fps, raw project.json / brand.json editors, stills…
  - approach: owner wants a Reelwright studio editor: [N] build on preview.mjs (scrub + data panel + project.json edits); [R] gives Remotion Studio for free for `renderer: remotion` projects

### Manim CE + ManimGL + manim skills (36)

#### Docs / PLAYBOOK note only (2)

- `manim:m9.3` — `MultiCamera`, `SplitScreenCamera`, `MappingCamera` — PARTIAL — exception (owner-approved 2026-11-12)
  - says: `KIT.layout` split composes panels and `KIT.shoot` moves each panel's layer (`tools/layouts.js`, `tools/shots.js`, `tools/shots2.js`); no per-panel camera preset or doc recipe; except: composition by hand covers it [10z…
  - approach: docs + `shoot()` per panel
- `manim:m12.2` — Interactive embed: `-se <line>`, `embed()`, `checkpoint_paste()`, `InteractiveScene` (select/drag mobjects, undo/redo, copy), hot reload `-… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: `reelwright preview` scrubs a finished film and `reelwright studio` (10k, `tools/studio/`) edits the native film; no live editing of Manim code; except: authors iterate with Manim's own `-s`/`-n` stills [10z: except]
  - approach: docs: authors iterate with `-s`/`-n` stills on the GL side; studio editor (Phase 10) covers the native side

#### Native code to add in tools/ (or a flag/command) (27)

- `manim:m3.1` — `Create` / GL `ShowCreation` (stroke draw-on), `Uncreate` — PARTIAL — partial, rest planned (open)
  - says: (10z): Create = `KIT.math.mob` stroke draw-on then fill (`tools/math2.js`, fixture `tools/selfcheck/motion/math2.mjs`); `KIT.tex.unwrite` reverses glyph draw (`tools/tex.js`); missing: Uncreate as a reversed stroke for…
  - approach: native: `KIT.math.create(group, {lag})` over sub-paths
- `manim:m3.5` — `AddTextLetterByLetter`, `RemoveTextLetterByLetter`, `AddTextWordByWord`, `TypeWithCursor`, `UntypeWithCursor` — PARTIAL — partial, rest planned (open)
  - says: (10z): `KIT.typewriter(el, text, {cps, caret, mistakes})` types, blinks a caret, backspaces mistakes (`tools/motion.js`, fixture `tools/selfcheck/motion/motion.mjs`); words by VO word via `K.words`; missing: a whole-tex…
  - approach: native: `KIT.type(el, {cps, cursor})` pure in t
- `manim:m4.3` — `Broadcast` (expanding rings) — MISSING — planned (Phase 11)
  - says: `KIT.indicate.flash` (tools/motion.js) bursts radial lines, not expanding rings; build: concentric circles scaling and fading as a pure function of t, about 15 lines in tools/motion.js [10z: build]
  - approach: native
- `manim:m5.5` — `PhaseFlow`, `MoveAlongPath` — PARTIAL — partial, rest planned (open)
  - says: (10z): MoveAlongPath = `KIT.path.follow` (`tools/path.js`, fixture `tools/selfcheck/motion/path.mjs`); missing: PhaseFlow (carry a mobject along a vector field: `KIT.sim` with `KIT.math.field` F would do it, no new libr…
  - approach: native `KIT.sim` + `flow()`
- `manim:m5.8` — `TracedPath`, `AnimatedBoundary`, GL `TracingTail` — MISSING — planned (Phase 11)
  - says: no trail helper; `KIT.path.follow` + a `KIT.sim` position table can draw one by hand; build: `KIT.path.trace(fn, {tail, fade})` over a sampled position function [10z: build]
  - approach: native: `KIT.math.trace(fn, {tail, fade})`
- `manim:m6.1` — `Circle`, `Dot`, `Ellipse`, `Arc`, `ArcBetweenPoints`, `TangentialArc`, `Annulus`, `Sector`, `AnnularSector`, `CubicBezier`, GL `SmallDot` — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10h): `KIT.math.shape.*` + `KIT.math.mob`: circle, ellipse, arc, arcBetween, annulus, sector, annularSector, cubic; TangentialArc not built (`tools/math2.js`); shuffled-seek fixture in `tools/selfcheck/motion/`, docs/p…
  - approach: native: `KIT.math.shape.*` returning draw-on-ready SVG with theme tokens
- `manim:m6.3` — `Line`, `DashedLine`, `TangentLine`, `Elbow`, `Arrow`, `Vector`, `DoubleArrow`, `CurvedArrow`, `StrokeArrow`, `Angle`, `RightAngle`, tips (… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10h): line, dashed (`dash`), elbow, arrow tips (triangle/stealth/circle/square), double, curved, vector, angle, rightAngle; TangentLine is `KIT.math.tangent` (plot2.js) (`tools/math2.js`); shuffled-seek fixture in `too…
  - approach: native `shape.arrow/angle/tip`
- `manim:m6.8` — Colours: 130+ named constants (`BLUE_A..E`), `ManimColor`, `interpolate_color`, `color_gradient`, `set_color_by_gradient`, `set_sheen`, fil… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: theme tokens `--kit-*` (themes/*.css) and CSS `color-mix`; no Manim palette constants (a Manim scene gets theme colours from `rw.color()`); except: the 130 named constants are trivia, add only if a native scene needs th…
  - approach: native: `KIT.color.manim` palette table (facts, no code copied) + lerp; docs
- `manim:m6.9` — `SVGMobject`, `ImageMobject`, GL `VideoMobject`/`Sprite`, `PMobject`, `DotCloud`, `GlowDot(s)`, `TrueDot` — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10z): SVG/images/video EQUAL (`K.img`, `K.clip`, `KIT.doodle.drawOn`); 3D `DotCloud`/`GlowDots` = `KIT.math3d` `points` (`tools/math3d.js`, fixture `tools/selfcheck/motion/math3d.mjs`); missing: `TrueDot` shader points…
  - approach: native: canvas/Three `Points` helper (M); video via K.clip
- `manim:m7.2` — `MathTex`/`Tex` (LaTeX), `substrings_to_isolate`, `tex_to_color_map`, `set_color_by_tex`, GL `Tex(isolate, t2c)`, `TexText` — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10h): `KIT.tex` (MathJax) with `color(match, c)` = set_color_by_tex (key-sequence match; misses a substring that renders differently alone); KaTeX `KIT.math.equation` unchanged. No build-time `tools/commands/tex.mjs`:…
  - approach: native: `equation(tex, {colors: {'x': 'accent'}})` via `\htmlClass`/`\textcolor`; mhchem contrib from vendored KaTeX; real LaTeX = optional renderer
- `manim:m7.3` — `Typst`, `MathTypst` (+ `select` labels) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10z): `MathTypst` works inside an optional Manim CE scene (`python/reelwright_manim/examples/hello.py`, `projects/manim-hf`, CE verified on macOS arm64); native equations use MathJax `KIT.tex` (`tools/tex.js`), not Typ…
  - approach: native option: Typst via `@myriaddreamin/typst-ts-node-compiler` at build time to SVG glyph paths (UNVERIFIED output ids); or inside the Manim renderer
- `manim:m7.5` — `Matrix`, `DecimalMatrix`, `IntegerMatrix`, `MobjectMatrix`, GL `TexMatrix` — PARTIAL — partial, rest planned (open)
  - says: (10z): `KIT.tex` typesets and writes `\begin{bmatrix}` (tools/tex.js; `tools/selfcheck/tex-offline.mjs` typesets one), `color(match, c)` colours entries; missing: a cell-grid API with per-entry `Indicate` and `get_entri…
  - approach: native: HTML grid + brackets, entry `Indicate`
- `manim:m7.6` — `Table`, `MathTable`, `IntegerTable`, `DecimalTable`, `MobjectTable` — MISSING — planned (Phase 11)
  - says: HTML tables by hand are native in the browser; no `KIT.table` helper (grid + lines draw-on + entry reveal); build: small helper over `KIT.math.mob` lines + text cells [10z: build]
  - approach: native `KIT.table`
- `manim:m7.7` — `Code` (syntax highlighting), GL `Code` — PARTIAL — partial, rest planned (open)
  - says: (10z): HyperFrames code blocks installable with `reelwright add` (10f: code-diff, code-3d-extrude, code-particle-assemble, code-slice-hero, code-shader-dissolve; `tools/blocks.mjs`, `tools/selfcheck/blocks.mjs`); missin…
  - approach: native: build-time highlight (shiki, MIT) to spans, line-by-line reveal
- `manim:m8.1` — `Axes` (ranges, lengths, tips, ticks, `axis_config`, `add_coordinates`, `get_axis_labels`, log `LogBase`/`LinearBase`), GL `Axes` — PARTIAL — partial, rest planned (open)
  - says: (10z): `KIT.math.axes` plus `plane({kind})` with labels, `c2p`/`p2c`, sublines (`tools/math.js`, `tools/plot2.js`, fixture `tools/selfcheck/motion/plot2.mjs`); missing: axis tips, log scales, `get_axis_labels`/`add_coor…
  - approach: native: extend `axes()` (tips, `scale:'log'`, `p2c`, axis labels)
- `manim:m8.2` — `NumberLine` (ticks, numbers, tip, `n2p`, `UnitInterval`, GL `Slider`) — PARTIAL — partial, rest planned (open)
  - says: `KIT.math.numberLine` basic (`tools/math.js`); missing: elongated ticks, labels at chosen values, brackets, `Slider` [10z: build]
  - approach: native extend (elongated ticks, labels at values, brackets)
- `manim:m8.7` — `BarChart`, `SampleSpace` — PARTIAL — partial, rest planned (open)
  - says: (10z): HyperFrames chart blocks installable with `reelwright add` (10f: bar-chart-race, data-chart, mk-line-graph, animated-bar-chart; `tools/blocks.mjs`); missing: a native `KIT.math.bars` with braces and labels, and `…
  - approach: native `KIT.math.bars` + brace/labels
- `manim:m8.8` — `Graph`/`DiGraph` (networkx layouts: spring, circular, tree, partite, kamada_kawai) — MISSING — exception (owner-approved 2026-11-12)
  - says: no graph layouts; except: niche, and spring layout needs a new vendored library (d3-force); circular/tree/grid layouts would be a small native helper if wanted [10z: except]
  - approach: native: own layouts (circular/tree/grid) + vendor d3-force for spring
- `manim:m8.10` — `LinearTransformationScene`, `VectorScene` (basis vectors, matrix applied to grid, `add_vector`, `add_transformable_label`) — PARTIAL — partial, rest planned (open)
  - says: (10h): `KIT.math.basis` + matrix warp on a plane; no matrix label or add_transformable_label (`tools/plot2.js`); shuffled-seek fixture in `tools/selfcheck/motion/`, docs/playbook/math2.md; 10z: the matrix label and add_…
  - approach: native: composed from `plane()`, `warp()`, `arrow()`
- `manim:m9.2` — `ZoomedScene` (magnified inset, display frame) — MISSING — planned (Phase 11)
  - says: no magnified inset; build: `KIT.zoomInset(srcRect, dstRect)` as a second transformed copy of a layer with a frame, small [10z: build]
  - approach: native: `KIT.zoomInset(srcRect, dstRect)` second transformed copy of the stage layer
- `manim:m9.5` — `add_fixed_in_frame_mobjects`, `add_fixed_orientation_mobjects`, GL `fix_in_frame`, `FullScreenRectangle` — PARTIAL — partial, rest planned (open)
  - says: (10z): fixed-in-frame HUD = a DOM overlay above the 3D canvas (`projects/math2-hf`: tag and captions over `KIT.math3d`); fixed-orientation labels only as axes tick labels (Sprites, `tools/math3d.js`); missing: a general…
  - approach: native: DOM overlay above the WebGL canvas
- `manim:m9.8` — `Polyhedron`, `Tetrahedron`, `Octahedron`, `Icosahedron`, `Dodecahedron`, `ConvexHull3D` — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10h): tetrahedron, octahedron, icosahedron, dodecahedron (`tools/math3d.js`, fixture `tools/selfcheck/motion/math3d.mjs`); no `ConvexHull3D` (needs Three's ConvexGeometry add-on, not vendored); except: niche [10z: exce…
  - approach: native: Three.js `PolyhedronGeometry`; hull via three examples (UNVERIFIED path)
- `manim:m9.9` — Lighting (`light_source`), shading, `TexturedSurface`, `ThreeDModel` (.obj via pywavefront/trimesh) — PARTIAL — partial, rest planned (open)
  - says: (10h): lights and MeshStandardMaterial shading (`tools/math3d.js`); no textures or OBJ/GLTF models (Three's loaders are not vendored; adding them needs the owner's approval) [10z: build]
  - approach: native: Three.js lights, `TextureLoader`, OBJ/GLTF loader (loaders vendored if wanted)
- `manim:m11.3` — Pace lint (<= 2.5 words/s, gaps, >= 15 % unnarrated), dark-stretch lint — PARTIAL — partial, rest planned (open)
  - says: (10z): the taste check warns on VO lines faster than 6.5 words/s and on stretches over 4 s where nothing moves (`tools/checks/taste.page.mjs`, `tools/selfcheck/taste.mjs`); real word times make Manim's RUSHED impossible…
  - approach: native: info line in qa.py
- `manim:m12.4` — `CameraFrame` as a Mobject (`.shift/.scale/.rotate`, `reorient`, `to_default_state`, `focus_on`), `ContinuousRotation` updaters — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10h): 3D camera via `KIT.math3d` orient/ambient (`tools/math3d.js`); 2D CameraFrame verbs stay `KIT.shot` (`tools/shots.js`, `tools/shots2.js`: tour, planes, orbit); the Mobject API (`.shift/.scale/.rotate/reorient/foc…
  - approach: native: Three.js camera rig with the same verbs
- `manim:m12.7` — GL drawings: `Checkmark`, `Exmark`, `Lightbulb`, `Speedometer`, `Laptop`, `VideoIcon`, `Clock`/`ClockPassesTime`, `Bubble`/`SpeechBubble`/`… — MISSING — exception (owner-approved 2026-11-12)
  - says: no icon set; except: optional, SVG icons by hand are easy and Checkmark/Exmark/Clock are trivial [10z: except]
  - approach: native: small icon set under KIT.math.icons (optional)
- `manim:m12.8` — GL `DotCloud`, `GlowDots`, `TrueDot` (shader points) and `Surface` shading/`Sphere` as shader surfaces — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10h): `points` (additive glow sprites) = GlowDots/DotCloud (`tools/math3d.js`); no `TrueDot` shader; except: niche [10z: except]
  - approach: native: Three `Points` + additive blending

#### Vendor a library (2)

- `manim:m5.1` — `Transform`, `ReplacementTransform`, `TransformFromCopy`, `ClockwiseTransform`/`CounterclockwiseTransform` (path_arc) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10h): glyph morphs (flubber) and `path_arc` in `KIT.tex.transform` (`tools/tex.js`), multi-path and hole-safe `KIT.math.morphShapes` (`tools/math2.js`, split subpaths); fixtures `tools/selfcheck/motion/tex.mjs`, `math2…
  - approach: vendor flubber for multi-subpath + hole handling; native colour/width lerp; `path_arc` as arc interpolation of points
- `manim:m6.5` — Boolean ops `Union`, `Difference`, `Intersection`, `Exclusion` — MISSING — planned (Phase 11)
  - says: no path boolean ops; build: vendor polygon-clipping (MIT) for `Union/Difference/Intersection/Exclusion` over sampled outlines: a new library, ask the owner first [10z: build]
  - approach: vendor polygon-clipping (polygons) or own for convex; path-level via flubber sampling

#### Other (read the approach text) (5)

- `manim:m10.2` — TTS back-ends: Azure, ElevenLabs, gTTS, OpenAI, pyttsx3, Gemini, recorder, Whisper alignment, DeepL translate — PARTIAL — exception (owner-approved 2026-11-12)
  - says: edge-tts only (`tools/vo.py`); other voices go through the paid-connector pattern (docs/CONNECTORS.md); except: not Manim's job [10z: except]
  - approach: connector pattern (separate Phase 10 row); not Manim's job
- `manim:m11.2` — Layout lint OFF-FRAME / TEXT-OVERLAP / TINY-TEXT — PARTIAL — partial, rest planned (open)
  - says: (10i): DOM lint exists (`tools/qa_page.mjs`); a Manim scene can mark itself with `rw.label_illustrative()`; missing: scenes exporting `texts.json` (bbox, px size) and a QA check over it for OFF-FRAME, OVERLAP and TINY t…
  - approach: optional renderer: scene exports `texts.json` (bbox, px size) and qa lints it (rewrite, MC has no licence)
- `manim:m12.3` — Interactive controls `Slider`, `Button`, `Checkbox`, `ControlPanel`, `Textbox`, `MotionMobject`, `LinearNumberSlider` — MISSING — exception (owner-approved 2026-11-12)
  - says: not meaningful in a rendered film; except: out of scope (the studio editor exposes film parameters instead) [10z: except]
  - approach: out of scope; studio editor may expose params as sliders
- `manim:m12.5` — `Tex` pipeline: `latex` (or `xelatex`) -> DVI/XDV -> `dvisvgm` -> SVG, templates in tex_templates.yml (default, ctex, ~40 font presets), `d… — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10z): native `KIT.tex` (MathJax, no TeX needed, offline: `tools/selfcheck/tex-offline.mjs`) and Typst inside a Manim CE scene; real LaTeX via CE `MathTex`/GL `Tex` needs a TeX install that is not on this machine (never…
  - approach: optional renderer (GL) needs real LaTeX + dvisvgm (TinyTeX list below)
- `manim:m13.4` — `verify` / manifest / `clean` / `qa` integration — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10i): `reelwright manim <p> verify` checks clip hashes, frame counts and data.js (`tools/manim.mjs`, `tools/selfcheck/manim.mjs`); `all`, `verify` and the manifest do not run Manim (shared files left alone by decision)…
  - approach: own code

### anidoodle, video-shotcraft, motion-design-skill, GSAP, Lottie (149)

#### Docs / PLAYBOOK note only (54)

- `doodle-shots-motion:1.15` — Lessons: step sheet + captioned timelapse, drawn-stroke captions — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): the teaching niche; D.score gives the timelapse but there is no step sheet and no drawn-stroke captions. Suggest: accept as exception.
  - approach: docs recipe on top of D.score + captions; low priority (teaching niche)
- `doodle-shots-motion:1.19` — Motion deck: 46 named moves with numbers (open/seam/cam/reveal/type/act/emph/close) + deal/find tool — PARTIAL — partial, rest planned (open)
  - says: (10e): docs/playbook/motion.md covers paths, transitions (`KIT.transition.names`), camera shots (`KIT.shot`, `S.names`) and motion helpers; missing: the 46-name deck table mapped to KIT calls and a `shots` CLI listing (…
  - approach: docs: 'Motion deck' table of the 46 names mapped to KIT calls; `reelwright shots` prints names (bin/reelwright.mjs has no `shots` command today)
- `doodle-shots-motion:1.30` — World: every beat a region on one canvas, one camera travels (anti slide-deck) — PARTIAL — partial, rest planned (open)
  - says: (10e): `S.tour` flies one camera through poses (tools/shots2.js) and cam3 works over a frame-sized layer; missing: `KIT.world(regions)` placing regions in world coordinates, and a 'One world' recipe in docs/playbook/mot…
  - approach: docs 'One world' recipe + `KIT.world(regions)` placing regions in world coords (S)
- `doodle-shots-motion:1.41` — Brand import (Figma sheet, logos, inventory, check) — PARTIAL — partial, rest planned (open)
  - says: brand.json (palette and fonts read by tools/look.mjs), tools/figma_export.py, `theme-from` (url or image); missing: logo inventory and the brand check (nothing in tools/ or bin/ inventories logos). Suggest: build.
  - approach: docs; S additions: logo inventory check
- `doodle-shots-motion:2.11` — before-after-slider-scrub [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.transition('wipe') moves a clip edge over two layers (tools/transitions.js; selfcheck motion/transitions.mjs); missing: persistent divider + rest-at-split recipe; before-after-wipe/comparison-split are GSAP+C…
  - approach: R2 docs + recipe wrapper
- `doodle-shots-motion:2.17` — aurora-bloom-bg-flip [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): mesh-gradient-bg installs via `reelwright add`, animated gradient bg through --hf-x1..y3 vars (hand-driven, HF only); missing: bloom + bg colour flip recipe; aurora-drift is GSAP+CDN, not drivable [10z: build]
  - approach: R2 docs + bg flip recipe
- `doodle-shots-motion:2.19` — fui-hud-moves [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.indicate.circumscribe and showPassingFlash (tools/motion.js; selfcheck motion/motion.mjs, projects/motion-hf) give a lock-on ring and glint; missing: corner-bracket HUD, readout ticker, reticle recipe; teleme…
  - approach: R2 docs; reticle-lock-on recipe
- `doodle-shots-motion:2.21` — icon-performance-moves [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.indicate.indicate/wiggle (scale pop, rotate shake; tools/motion.js), KIT.spring overshoot, badge-pop component (hand-driven, HF only); missing: attention-bounce recipe doc, icon morph (icon-morph-beat/spring-…
  - approach: R2 docs recipe attention-bounce
- `doodle-shots-motion:2.23` — light-play-moves (spotlight-sweep, sheen-sweep) [2 shots] — PARTIAL — partial, rest planned (open)
  - says: (10z): shimmer-sweep (--shimmer-pos gradient sheen) and spotlight-card (CSS-var spotlight + lit border) install via `reelwright add` (hand-driven, HF only); no per-component self-check; missing: no self-check proves the…
  - approach: R2 docs (spotlight-sweep, sheen-sweep)
- `doodle-shots-motion:2.26` — scan-bracket-sweep [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.indicate.circumscribe and showPassingFlash (tools/motion.js; selfcheck motion/motion.mjs); missing: scan band sweeping a bracketed subject; scan-band/camera-scan-gate are GSAP+CDN, not drivable [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2.27` — scanline-annotate-focus [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.doodle.underline/circle marks (tools/doodle.js, projects/shots-hf) and KIT.indicate.focusOn/circumscribe (tools/motion.js); missing: scanline pass and connector + callout label; vox-annotate/cursor-annotate n…
  - approach: R2 docs
- `doodle-shots-motion:2.29` — slam-entrance-moves (kanada-perspective-snap, score-slam, impact-burst-kit) [3 shots] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.shake impact decay and crashZoom (tools/shots.js), KIT.spring overshoot, KIT.layout.fullBleed word rise (tools/layouts.js); missing: kanada-perspective-snap, score-slam, impact-burst-kit; slam components are…
  - approach: R2 docs (kanada-perspective-snap, score-slam, impact-burst-kit missing)
- `doodle-shots-motion:2.34` — collab-cursor-moves [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.cursor pointer and KIT.path travel (tools/engine.js, tools/path.js; selfcheck motion/path.mjs); missing: labelled multi-cursor ensemble (cast-ensemble), dotted trail; multiplayer-cursors/cursor-glyph-trail no…
  - approach: R2 docs (cast-ensemble)
- `doodle-shots-motion:2.37` — picker-carousel-feature-cycle [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): tabs-slide-indicator (pill slides via --hf-tab-x; hand-driven, HF only) + verified carousel-circle/orbit/path blocks (KIT.mount; tools/selfcheck/blocks.mjs); missing: picker-to-feature content cycle recipe; scree…
  - approach: R2 docs
- `doodle-shots-motion:2.38` — segmented-thumb-hero [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): tabs-slide-indicator is the sliding segmented thumb (--hf-tab-x, pill/width vars); settings-toggle-flow adds toggle rows; both install via `reelwright add` (hand-driven, HF only); missing: no self-check proves th…
  - approach: R2 docs
- `doodle-shots-motion:2.42` — brand-ink-open [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): pen-drawn brand mark via KIT.doodle2 stroke/letters/drawSVG (tools/doodle2.js; selfcheck doodle2.mjs; projects/doodle2-hf) and doodle.drawOn; missing: gooey ink-bleed bloom behind the mark; ink-bleed-reveal/white…
  - approach: R2 docs
- `doodle-shots-motion:2.46` — icon-field-colorize [1 shot] — PARTIAL — partial, rest planned (open)
  - says: cat: avatar-cloud, logo-wall; 10z: Only avatar-cloud/logo-wall exist: GSAP+CDN, never seeked by KIT.block; nothing in the kit builds an icon field. Recommend build: icon grid with KIT.stagger tweening filter grayscale t…
  - approach: R2 docs
- `doodle-shots-motion:2.47` — letterspace-materialize [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): tracking-in component (letter-spacing + rise reveal; hand-driven, HF only); a letter-spacing tween from KIT.seg in render(t) gives the same on both renderers; missing: no self-check proves the component (the 136…
  - approach: R2 docs
- `doodle-shots-motion:2.49` — orbit-ring-title-open [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): carousel-orbit-1..5 blocks (KIT.mount; tools/selfcheck/blocks.mjs), KIT.path ellipse travel (tools/path.js), KIT.shot.orbit camera (tools/shots.js); missing: nucleus + satellite title lockup recipe; locked-nucleu…
  - approach: R2 docs
- `doodle-shots-motion:2.52` — text-as-mask [1 shot] — PARTIAL — partial, rest planned (open)
  - says: cat: texture-mask-text, svg-mask-reveal; 10z: svg-mask-reveal is GSAP+CDN (not seeked by KIT.block); texture-mask-text ships 67 files so `add` refuses it; no kit helper or recipe masks media by text. Recommend build: do…
  - approach: R2 docs
- `doodle-shots-motion:2.54` — logo-shrink-wordmark-lockup [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): docs/recipes/end-card.md (logo pop with KIT.spring, CTA, hold) + verified logo-outro/yt-logo-intro blocks (KIT.mount); missing: logo-shrinks-into-wordmark lockup move; logo-brand-close/titlecard-lockup/cta-lockup…
  - approach: R2 docs
- `doodle-shots-motion:2.55` — neon-triple-marquee [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): perspective-marquee component (3D tilted marquee via --hf-marquee-x; hand-driven, HF only) with neon via text-shadow; missing: three counter-moving rows, neon recipe; caption-neon-glow not drivable [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2.64` — sakuga-timing-shift [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.easing('steps(n)') (tools/engine.js), KIT.remap time remap (tools/shots.js), KIT.shot.bulletTime two clocks (tools/shots2.js); missing: stepped-time driver recipe (quantise t on twos/threes); stop-motion-cade…
  - approach: R2 docs
- `doodle-shots-motion:2.71` — gradient-transition [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.transition fadeThrough (c.color wash), lightLeak and custom (p, ctx) types (tools/transitions.js; selfcheck transitions.mjs); missing: feathered gradient-edge wipe; colorama-wipe not drivable (fade-through co…
  - approach: R2 docs
- `doodle-shots-motion:2.75` — print-texture-transitions [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.transition('brush') ragged-bristle ink wipe (tools/transitions.js; selfcheck transitions.mjs, projects/motion-hf), halftone-field block as texture; missing: halftone-dot dissolve, torn-paper edge, ink bleed (…
  - approach: R2 docs
- `doodle-shots-motion:2.77` — tear-streak-transitions [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.transition('glitch'), KIT.shader chromatic-split/glitch (tools/transitions.js, tools/shaders.js; selfcheck transitions.mjs), chromatic-aberration-wipe component (hand-driven, HF only), sfx cue 'glitch'; missi…
  - approach: R2 docs
- `doodle-shots-motion:2.88` — gradient-word-sweep [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): shimmer-sweep component sweeps a gradient band through text (--shimmer-pos/width/color; hand-driven, HF only); per-word timing from KIT.align and K.subtitles karaoke (tools/engine.js); missing: no self-check prov…
  - approach: R2 docs
- `doodle-shots-motion:2.91` — outline-word-fill [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.doodle2.drawSVG draws outlines then washes fills in (tools/doodle2.js; selfcheck doodle2.mjs, projects/doodle2-hf), doodle2.letters pen lettering; missing: live-text outline-to-fill recipe; stitched-text-draw…
  - approach: R2 docs
- `doodle-shots-motion:2.93` — pill-chip-slot-cycle-handled [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): slot-machine-roll component (vertical reel via --hf-slot-y; hand-driven, HF only) inside a CSS pill; missing: multi-chip rail with a settled state; state-chip-rail not drivable [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2.94` — pill-slot-cycle [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): slot-machine-roll component is the pill slot cycle (vertical reel, direction/size/tone vars, --hf-slot-y; hand-driven, HF only); missing: no self-check proves the component (the 136 vendored blocks are verified b…
  - approach: R2 docs
- `doodle-shots-motion:2.99` — type-rhythm-sync (font-weight-pump, karaoke-fill-sync) [2 shots] — PARTIAL — partial, rest planned (open)
  - says: (10z): karaoke fill via K.subtitles (.said/.now; tools/engine.js) + weight-wave block (wght/slnt travelling crest; KIT.mount); missing: beat-synced font-weight pump; variable-font-flex/caption-weight-shift not drivable…
  - approach: R2 docs (font-weight-pump)
- `doodle-shots-motion:2.101` — vertical-word-roll-blur-cycle [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): slot-machine-roll component (vertical reel; hand-driven, HF only) covers the roll; missing: word-level roll with blur and a multi-option cycle; kinetic-type-swap not drivable [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2.104` — avatar-bracket-carousel [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): catalog avatar-cloud and avatar-group-hover install with `reelwright add` (vendor/hyperframes/registry/components/); missing: no bracket-carousel recipe or doc mapping the shot to them [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2.106` — card-stack [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): catalog spring-stack-shuffle installs with `reelwright add`; KIT.layout.bento (tools/layouts.js, projects/layouts-hf) is a grid not a stack; missing: card-stack recipe/doc [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2.108` — cloner-depth-echo [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): catalog echo-trail, echo-smear and camera-rig-depth-stack install with `reelwright add`; KIT.shot.planes (tools/shots2.js, shuffled-seek fixture) gives depth; missing: cloner-echo-on-depth recipe/doc [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2.113` — integration-hub-map [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): catalog constellation-hub installs with `reelwright add` (nodes light in narration order, connectors draw from a hub); missing: integration-map recipe/doc (logo tiles, labels) [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2.116` — neon-frame-forerun [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): catalog caption-neon-glow and svg-stroke-trace install with `reelwright add`, and block lt-neon-border (reelwright add, hf films) is a neon frame; missing: forerun recipe/doc [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2.117` — neon-frame-orbit-drop [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): catalog caption-neon-glow and svg-stroke-trace install with `reelwright add`, block lt-neon-border is a neon frame, KIT.path.draw/follow (tools/path.js) can orbit a dot; missing: orbit-drop recipe/doc [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2.118` — page-waterfall-wall [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): catalog scroll-feed and parallax-device-dive install with `reelwright add`; missing: multi-column waterfall wall (several offset scroll-feeds) recipe/doc [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2.119` — product-card-progressive-assemble [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.layout.bento (tools/layouts.js, used in projects/layouts-hf) and catalog grid-card-assemble (reelwright add) cover the assemble; missing: progressive card-fill (skeleton to filled) recipe/doc [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2.120` — radial-wave [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): catalog radial-surround and press-ripple install with `reelwright add`; missing: radial-wave recipe/doc (staggered ring of chips from a centre ripple) [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2.121` — research-card-stack-scroll [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): catalog scroll-feed and spring-stack-shuffle install with `reelwright add`; missing: card-stack-into-scroll recipe/doc [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2.123` — value-stagger-gradient [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): K.stagger and K.count (tools/engine.js), KIT.layout.stat (tools/layouts.js), catalog count-up and number-wheel; missing: value-driven gradient colour ramp recipe/doc [10z: build]
  - approach: R2 docs
- `doodle-shots-motion:2b.7` — Ink Press: complete 36 s validated promo template (10 shots, replace screenshots/copy/logo) — PARTIAL — partial, rest planned (open)
  - says: (10z): docs/recipes/film is one 8-scene HF film built from the 8 recipes (docs/recipes/*.md, stills); projects/example, teaser, website, dashboard; `from-url`; missing: a validated 10-shot promo template (`new --templat…
  - approach: docs: 'promo-energy-arc' project template (`reelwright new --template promo`) assembled from KIT.recipe.* (M). Do not copy template screenshots
- `doodle-shots-motion:2b.9` — Energy-arc sequence: low open -> single hero -> feature climb with breath cards -> peak group-photo outro; budget hold frames first — PARTIAL — partial, rest planned (open)
  - says: (10z): PLAYBOOK 'Story before pixels' gives the hook → grind → reveal → features → payoff → end-card order; missing: energy-arc table and a `beats` arc validator (WARN if the close is not the loudest) [10z: build]
  - approach: docs section + `reelwright beats` arc validator (WARN if closing is not the loudest) S
- `doodle-shots-motion:2b.11` — Final independent review checklist (P/F/V/A/... items, clean-context reviewer) — PARTIAL — partial, rest planned (open)
  - says: (10z): docs/playbook/claude-workflow.md loop (stills, taste WARNs, qa FAIL/WARN) + AGENTS.md step 3; missing: an itemised final-review checklist and a clean-context reviewer step [10z: build]
  - approach: docs: PLAYBOOK 'Review' checklist
- `doodle-shots-motion:3.1` — Pre-animation 8-step checklist, three pillars, three motion layers (primary / secondary / ambient) — PARTIAL — partial, rest planned (open)
  - says: PLAYBOOK Motion rules (ease in/out, 1/3-screen, morph not fade, dim to 0.25, stagger budget); missing: pre-animation checklist and the primary/secondary/ambient layer model [10z: build]
  - approach: docs: 1 paragraph + checklist in PLAYBOOK
- `doodle-shots-motion:3.4` — Material easing (rigid 1.2x/0%, elastic 0.8x/15-25%, fluid 1.5x/5%, paper 1.0x/3-5%, gas 2.0x, glass 0.9x) — MISSING — planned (Phase 11)
  - says: 10z: no material easing table or KIT.material in tools/engine.js or docs [10z: build]
  - approach: docs table + `KIT.material(name)` returning {durScale, ease} S
- `doodle-shots-motion:3.5` — Spring parameter palette (very stiff 400+/25-30 ... very bouncy 100-200/5-10) — PARTIAL — partial, rest planned (open)
  - says: KIT.spring({mass,damping,stiffness}) closed form + KIT.springDur (tools/engine.js, PLAYBOOK Motion); missing: named presets (stiff/standard/bouncy) and the palette table [10z: build]
  - approach: docs: named presets `KIT.springs.{stiff,standard,bouncy}`
- `doodle-shots-motion:3.6` — Duration by element type, distance scaling (50 px=0.8x ... full screen 1.8-2x), exit = 65-75% of entrance — PARTIAL — partial, rest planned (open)
  - says: KIT.dur tempo token, theme archetype settle/stagger (PLAYBOOK Motion); missing: duration-by-element table, distance scaling (KIT.distDur) and exit = 65-75% of entrance [10z: build]
  - approach: docs + `KIT.distDur(px)` helper (formula derived from table; UNVERIFIED fit)
- `doodle-shots-motion:3.9` — Disney principles for UI, emotion-to-motion map, path as emotional language, narrative 4-act structure — MISSING — planned (Phase 11)
  - says: 10z: no Disney-principles / emotion-to-motion section in PLAYBOOK or docs/playbook; docs-only, one compact section [10z: build]
  - approach: docs only (one compact section; film-relevant lines)
- `doodle-shots-motion:3.10` — Entrance / exit strategies (direct, emergent, reveal, assembled; dissolve, collapse, transfer) + continuity — PARTIAL — partial, rest planned (open)
  - says: (10z): layouts enter/exit with theme motion; KIT.transition 18 types incl. fade, iris, zoom, push (tools/transitions.js); catalog exits (blur-out-up …); missing: entrance/exit strategy table mapped to KIT calls [10z: bu…
  - approach: docs table mapped to KIT calls
- `doodle-shots-motion:3.12` — State & feedback (button press, hover, toggle, success, error shake, inline validation) — PARTIAL — partial, rest planned (open)
  - says: (10z): blocks press-ripple, settings-toggle-flow, success-check, input-feedback, toggle-flip; KIT.indicate.wiggle/indicate/blink (tools/motion.js) for error shake and feedback; missing: a UI-state docs section [10z: bui…
  - approach: docs only (UI states are shown inside recordings)
- `doodle-shots-motion:3.14` — Quality checklist + severity tiers + troubleshooting — PARTIAL — partial, rest planned (open)
  - says: (10z): qa FAIL gates + WARNs (tools/qa.py, qa_page.mjs), taste WARNs (tools/checks/taste.page.mjs), hf-lint (docs/playbook/qa-lint.md); missing: one quality checklist table with severity tiers and troubleshooting [10z:…
  - approach: docs one table

#### Recipe or KIT helper to add (R-tier) (55)

- `doodle-shots-motion:2.3` — cursor-flyover [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): camera is KIT.shot.tour (tools/shots2.js), proved by tools/selfcheck/motion/shots2.mjs and projects/motion-hf; missing: the cursor overlay at scale(1/s) has no helper, recipe or demo (catalog cursor-zoom-follow i…
  - approach: R3 shot.tour + cursor drawn at scale(1/s)
- `doodle-shots-motion:2.9` — tension-camera-moves (bullet-time-freeze-orbit, pull-back-isolation) [2 shots] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.shot.bulletTime two clocks (tools/shots2.js, fixture tools/selfcheck/motion/shots2.mjs, docs/playbook/motion.md); missing: pull-back-isolation (S.pullBack plus sibling dim) not built; catalog focus-swap dims…
  - approach: R3 K.timeRemap two-clock helper + isolation recipe
- `doodle-shots-motion:2.10` — terminal-3d [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.shot.tour (tools/shots2.js, fixture) and KIT.typewriter (tools/motion.js, projects/motion-hf) both shipped; catalog code-terminal-run installs; missing: no recipe/demo combining a 3D terminal tour with typing…
  - approach: R3 shot.tour + typing after arrival
- `doodle-shots-motion:2.12` — chart-live-moves (oscilloscope-stream, unit-dot-swarm-regroup, axis-rescale-shock) [3 shots] — PARTIAL — partial, rest planned (open)
  - says: (10z): block oscilloscope-trace (reelwright add, used in projects/blocks-hf) covers oscilloscope-stream; KIT.math.axes/plot (tools/math.js) and catalog chart-story exist; missing: unit-dot-swarm-regroup and axis-rescale…
  - approach: R1 oscilloscope-stream, unit-dot-swarm-regroup, axis-rescale-shock over math.js
- `doodle-shots-motion:2.13` — gauge-readout-moves (needle-sweep-selftest, tape-scroll-fixed-pointer) [2 shots] — PARTIAL — partial, rest planned (open)
  - says: (10z): K.count (tools/engine.js), catalog conic-progress-ring and number-wheel install with `reelwright add`; missing: needle sweep with self-test overshoot and tape scroll under a fixed pointer [10z: build]
  - approach: R1 needle sweep + tape scroll
- `doodle-shots-motion:2.14` — scroll-brake-moves (changelog-scroll-brake, brake-reticle-lock) [2 shots] — MISSING — planned (Phase 11)
  - says: cat: scroll-feed (scroll only, no brake/reticle); 10z: not built; everything needed exists (K.keys, K.easing in tools/engine.js), only the decel curve and reticle snap recipe is absent [10z: build]
  - approach: R1 recipe (K.keys + brake ease)
- `doodle-shots-motion:2.15` — timeline-travel [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): K.camAt (tools/engine.js) and KIT.math.numberLine (tools/math.js) both shipped; missing: no timeline-travel recipe/demo composing them [10z: build]
  - approach: R1 recipe
- `doodle-shots-motion:2.16` — assemble-then-type-flyin [1 shot] — MISSING — planned (Phase 11)
  - says: cat: grid-card-assemble (skeleton only); 10z: not built; smallest: recipe using grid-card-assemble then K.stagger per-char transforms (K.cam3, tools/shots.js) after the skeleton lands [10z: build]
  - approach: R1 skeleton fly-in then per-char 3D text
- `doodle-shots-motion:2.18` — brand-frame-snap [1 shot] — MISSING — exception (owner-approved 2026-11-12)
  - says: 10z: film-local: a K.snap-timed CSS colour step on the frame; too small for a kit helper (AGENTS.md: single-film tricks go in film.js) [10z: except]
  - approach: R1 colour flip on frame edge
- `doodle-shots-motion:2.20` — glow-flyline-moves (glow-orb-ambient, flyline-arc, orb-flyline-relay) [3 shots] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.path.draw/follow replace GSAP MotionPath (tools/path.js, fixture tools/selfcheck/motion/path.mjs, projects/motion-hf rides a path); missing: glow-orb ambient and orb-flyline relay recipe [10z: build]
  - approach: R1 fly-line + glow orb on MotionPath-style travel (own path walker or GSAP MotionPath)
- `doodle-shots-motion:2.22` — impact-feedback (hit-counter, anime-impact) [2 shots] — PARTIAL — partial, rest planned (open)
  - says: (10z): K.shake and K.cue impact (tools/shots.js, tools/engine.js), catalog camera-shake, shutter-slam, rubber-band-bumper, number-pop-in; missing: hit-counter and anime-impact overlays [10z: build]
  - approach: R1 hit-counter, anime-impact overlays
- `doodle-shots-motion:2.24` — radial-ripple-phone-chips [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): K.phone (tools/engine.js), catalog radial-surround and press-ripple install with `reelwright add`; missing: chips-radiating-from-phone-ripple recipe/doc [10z: build]
  - approach: R1 recipe
- `doodle-shots-motion:2.25` — riso-print-hits [1 shot] — MISSING — planned (Phase 11)
  - says: 10z: not built; smallest: recipe of 2-3 stacked copies with mix-blend-mode multiply and seeded per-hit offsets [10z: build]
  - approach: R1 mix-blend-mode multiply offset layers (misregistration-hit)
- `doodle-shots-motion:2.28` — scanline-assemble-flyin [1 shot] — MISSING — planned (Phase 11)
  - says: 10z: not built; smallest: recipe sweeping a seeded scanline with K.stagger fly-in of elements it passes [10z: build]
  - approach: R1 recipe
- `doodle-shots-motion:2.30` — spotlight-sweep-moves (glow-wake-sleep-panel, slide-spotlight-pan, corner-spotlight-reveal) [3 shots] — PARTIAL — partial, rest planned (open)
  - says: (10z): catalog spotlight-card and light-sweep-pass install with `reelwright add`; missing: glow-wake-sleep-panel, slide-spotlight-pan and corner-spotlight-reveal recipes [10z: build]
  - approach: R1 glow-wake-sleep-panel, slide-spotlight-pan, corner-spotlight-reveal
- `doodle-shots-motion:2.31` — autolayout-gap-dial [1 shot] — MISSING — exception (owner-approved 2026-11-12)
  - says: 10z: film-local: CSS gap driven by K.keys plus a dial drawn in the film; niche Figma UI mock, not worth a kit helper [10z: except]
  - approach: R1 recipe
- `doodle-shots-motion:2.32` — canvas-materialize-moves (panel-to-canvas, diagram-cascade) [2 shots] — MISSING — planned (Phase 11)
  - says: 10z: not built; smallest: recipe on modal-morph then KIT.stagger cascading diagram nodes with KIT.path.draw edges [10z: build]
  - approach: R1 panel-to-canvas, diagram-cascade
- `doodle-shots-motion:2.33` — chip-grid-single-select-blackout [1 shot] — MISSING — exception (owner-approved 2026-11-12)
  - says: 10z: film-local selection state machine over K.keys; niche UI mock [10z: except]
  - approach: R1 recipe
- `doodle-shots-motion:2.36` — hashtag-to-pill-materialize [1 shot] — MISSING — exception (owner-approved 2026-11-12)
  - says: 10z: film-local text-to-pill morph (CSS radius/padding from K.keys); too small for a kit helper [10z: except]
  - approach: R1 recipe
- `doodle-shots-motion:2.39` — theme-switch-moves (theme-sweep-toggle, palette-theme-ripple) [2 shots] — MISSING — planned (Phase 11)
  - says: themes are CSS tokens (tools/theme.mjs) but no runtime ripple; 10z: not built; smallest: two stacked scene copies, the top with --kit-* overrides, revealed by KIT.transition iris or clockWipe (tools/transitions.js) from…
  - approach: R1 clip-path ripple that swaps --kit-* vars (theme-sweep-toggle, palette-theme-ripple)
- `doodle-shots-motion:2.40` — type-and-filter [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.typewriter (tools/motion.js, fixture tools/selfcheck/motion/motion.mjs, projects/motion-hf) and catalog typed-prompt, typing-indicator exist; missing: filtered-list recipe (rows hide per typed char) [10z: bui…
  - approach: R1 filtered list recipe
- `doodle-shots-motion:2.41` — voice-waveform-live [1 shot] — MISSING — planned (Phase 11)
  - says: beatgrid.py finds onsets only, no continuous energy curve; 10z: not built; smallest: dump a 30 fps RMS array (music or vo mp3 via ffmpeg and numpy, as beatgrid.py does) to a JSON the film reads, plus a bars recipe [10z:…
  - approach: R3 audio envelope in kit-data (Remotion-audio-reactive idea, ffmpeg astats/numpy) + recipe
- `doodle-shots-motion:2.43` — crane-rise-reveal [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): S.craneRise camera (tools/shots.js) is equal; missing: rowPulse option (rows pulse as the camera crosses them), no pulse code in tools/shots.js [10z: build]
  - approach: R1 add rowPulse option
- `doodle-shots-motion:2.44` — dataviz-landscape-open [1 shot] — MISSING — planned (Phase 11)
  - says: 10z: not built; smallest: recipe on math3d.scene surface with camera.orient opening move and bars from KIT.stagger [10z: build]
  - approach: R1 recipe over math.js
- `doodle-shots-motion:2.45` — fracture [1 shot] — MISSING — planned (Phase 11)
  - says: 10z: not built; smallest: a function-type transition (the API accepts one) with seeded triangle clip-path polygons drifting apart; the shader block transitions-destruction is a different look [10z: build]
  - approach: R1 clip-path shard split recipe
- `doodle-shots-motion:2.48` — magician-card-flourish [1 shot] — MISSING — exception (owner-approved 2026-11-12)
  - says: 10z: Niche opening gimmick (cards fanned and flipped by a magician flourish); nothing in the repo does it, but it is plain CSS 3D plus KIT.spring/KIT.stagger, so no kit gap and no reusable primitive. Propose as an excep…
  - approach: R1 recipe
- `doodle-shots-motion:2.50` — spotlight-hero-card [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.shot.tour/pushIn/orbit/crashZoom (tools/shots.js, shots2.js) can fly z 0.78 to 2.6 with ry 34 via tour poses, but no heroPush preset or recipe; missing: S.heroPush (or a documented 2-pose tour) [10z: build]
  - approach: R1 S.heroPush on cam3
- `doodle-shots-motion:2.56` — outro-group-photo-launch [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): avatar-cloud, radial-surround, locked-nucleus-orbit and logo-brand-close components (vendor/hyperframes/registry/components) converge items round a wordmark; missing: the group-photo launch flight recipe [10z: bu…
  - approach: R1 recipe: representatives converge round the wordmark
- `doodle-shots-motion:2.57` — ui-strip-away-outro [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): skeleton-reveal, filmed-screen, physical-exit, paper-collage-reveal and logo-brand-close components cover the pieces; missing: a strip-the-UI-away-to-the-logo recipe (staggered exits then lockup) [10z: build]
  - approach: R1 recipe
- `doodle-shots-motion:2.58` — ui-to-brand-morph (icon-flip-bloom, input-morph-assemble) [2 shots] — PARTIAL — partial, rest planned (open)
  - says: (10z): morph-swap, modal-morph, menu-morph, icon-morph-beat components and KIT.path.morph/KIT.math.morphShapes (tools/path.js, math2.js); missing: icon-flip-bloom and input-morph-assemble recipes [10z: build]
  - approach: R1 icon-flip-bloom, input-morph-assemble
- `doodle-shots-motion:2.60` — beat-step-list-theme-cycle [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): list stepping on spoken words/beats (docs/recipes/feature-stagger.md, K.snap/K.beat), beat-timeline and state-chip-rail components; missing: per-step theme/accent cycling on each beat [10z: build]
  - approach: R1 recipe
- `doodle-shots-motion:2.61` — panel-grid-moves [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): comparison-split, split-tilt-cards components, KIT.layout.split/bento (tools/layouts.js), KIT.transition barnDoor/blinds and transitions-grid block; missing: comic-panel-split (multi-panel gutters revealed in tur…
  - approach: R1 comic-panel-split
- `doodle-shots-motion:2.62` — quad-split-parallel-scenes [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.mount/KIT.block (tools/compose.js, docs/playbook/nested-compositions.md) host independently timed sub-scenes that can be placed and scaled; missing: a four-up quad-split recipe or demo [10z: build]
  - approach: R1 four sub-stages recipe
- `doodle-shots-motion:2.63` — rhythm-interrupt-moves [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.shot.track (hard cuts between camera shots, PLAYBOOK), K.remap, micro-transitions component; missing: a documented jump-cut punch-in on the beat recipe [10z: build]
  - approach: R1 jump-cut-punch-in
- `doodle-shots-motion:2.66` — trailer-grammar-moves [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): headline-slam, titlecard-calm/lockup, logo-sting, beat-accent components and KIT.transition fadeThrough/flash cover the parts; missing: the assembled bumper/title-card trailer-grammar recipe [10z: build]
  - approach: R1 bumper/title-card grammar recipe
- `doodle-shots-motion:2.69` — card-flock-tumble [1 shot] — MISSING — planned (Phase 11)
  - says: 10z: No file makes many cards tumble into a word (char-slam-explode moves glyphs, not cards). Build a recipe: N cards from seeded scatter to glyph-box targets with KIT.stagger and KIT.sim for the tumble. [10z: build]
  - approach: R1 recipe (many cards tumble into a word)
- `doodle-shots-motion:2.74` — page-turn-transitions [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): barnDoor, flip, cube via KIT.transition (tools/transitions.js, fixture selfcheck/motion/transitions.mjs); missing: a page-turn type (hinged rotateY with fold shading) [10z: build]
  - approach: R1 page-turn + barn-door-split
- `doodle-shots-motion:2.78` — transition-hidden-cut (invisible-cut, versus-slam, light-leak-burn) [3 shots] — PARTIAL — partial, rest planned (open)
  - says: (10z): light-leak burn = KIT.transition(lightLeak) plus light-leak blocks; hidden cut = whip-pan-cut component, whip-pan block, S.whipPan; missing: versus-slam (two halves slam together) transition [10z: build]
  - approach: R3 KIT.transition + light-leak overlay (additive radial gradients, triangle opacity)
- `doodle-shots-motion:2.79` — transition-travel [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): zoom-through-transition and parallax-zoom components, KIT.transition(zoom), S.crashZoom/S.tour onto a point; missing: letterform-zoom (zoom into a glyph to the next scene) recipe [10z: build]
  - approach: R1 letterform-zoom
- `doodle-shots-motion:2.84` — countdown-arc-scatter [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): conic-progress-ring, count-up, number-wheel components, K.count (counts down with from>to), KIT.math arcs; missing: the countdown arc with a scatter exit recipe [10z: build]
  - approach: R1 recipe
- `doodle-shots-motion:2.86` — flying-words [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.shot.planes + S.tour (tools/shots2.js, depth parallax from one camera) can fly words past the camera; missing: a word-tunnel recipe or helper (words along z, depth fade) [10z: build]
  - approach: R1 word tunnel in cam3 perspective
- `doodle-shots-motion:2.89` — lead-word-zoom-assemble [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.layout.kinetic words landing in turn (tools/layouts.js), S.crashZoom/pushIn onto a word; missing: lead-word zoom then assemble recipe [10z: build]
  - approach: R1 recipe
- `doodle-shots-motion:2.95` — text-column-converge [1 shot] — MISSING — planned (Phase 11)
  - says: 10z: line-by-line-slide and kinetic-center-build slide text in from one side only; nothing converges columns from both sides. Build a recipe: columns slide toward centre with KIT.stagger and KIT.ease. [10z: build]
  - approach: R1 recipe
- `doodle-shots-motion:2.96` — title-demote-to-label [1 shot] — MISSING — planned (Phase 11)
  - says: K.keys/K.lerp only; 10z: No title-to-label demote exists (text-match-cut swaps lines, card-resize resizes cards). Build a recipe: measure both boxes once, interpolate translate/scale/colour with K.lerp (A and B variants…
  - approach: R1 recipe (A and B variants)
- `doodle-shots-motion:2.97` — type-assembly-moves (split-text-stagger, drift-assembly, text-on-path) [3 shots] — PARTIAL — partial, rest planned (open)
  - says: (10z): split-text-stagger = K.words, text-stagger, per-word-rise; drift-assembly = char-slam-explode; text-on-path = hw-path-text block (handwriting only) and KIT.path.follow; missing: a general-font textOnPath helper […
  - approach: R3 textOnPath (SVG textPath + startOffset keyed) / GSAP MotionPath
- `doodle-shots-motion:2.98` — type-entrance-moves [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): bottom-up-letters, top-down-letters, char-slam-explode components, K.spring and KIT.sim (bouncing, tools/motion.js); missing: letter-drop with bounce recipe [10z: build]
  - approach: R1 letter-drop-physics (closed-form bounce)
- `doodle-shots-motion:2.102` — word-relay-filmstrip [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): rail with fast throw and snap via velocity-throw-snap, swipe-rail components and text-match-cut; missing: word-relay filmstrip recipe (words handed along a strip) [10z: build]
  - approach: R1 recipe
- `doodle-shots-motion:2.103` — word-relay-geometry [1 shot] — MISSING — exception (owner-approved 2026-11-12)
  - says: 10z: Niche word handoff through geometry shapes; no primitive missing (KIT.math.morphShapes plus text-match-cut cover the ingredients). Propose as an exception (niche). [10z: except]
  - approach: R1 recipe
- `doodle-shots-motion:2.105` — bezier-source-converge-merge [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.path.follow/fromPoints (tools/path.js, selfcheck/motion/path.mjs) and offset-path-traveler component move items along bezier paths; missing: multi-source converge-and-merge recipe [10z: build]
  - approach: R1 recipe (or GSAP MotionPath)
- `doodle-shots-motion:2.109` — deck-deal-flyin [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): spring-stack-shuffle, notification-pileup (accelerating arrivals), multi-device-splay components; missing: deck deal-in from a pile with orbit-open recipe [10z: build]
  - approach: R1 recipe (accelerating deal, pile-orbit-open)
- `doodle-shots-motion:2.110` — doc-park-left-pill-deal [1 shot] — MISSING — exception (owner-approved 2026-11-12)
  - says: 10z: Niche layout choreography (document parks left, pills deal out); composable from KIT.layout.split, grid-card-assemble and KIT.stagger with no kit gap. Propose as an exception (niche). [10z: except]
  - approach: R1 recipe
- `doodle-shots-motion:2.112` — element-body-moves [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): body moves pendulum-swing, physical-exit, spring-pop components and KIT.sim; missing: contact-shadow-lift (shadow grows as the element lifts) recipe [10z: build]
  - approach: R1 contact-shadow-lift recipe
- `doodle-shots-motion:2.115` — list-stack-press [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): press-ripple, gesture-tap, touch-indicator, notification-stack, spring-stack-shuffle components; missing: list-stack press (rows compress under a press) recipe [10z: build]
  - approach: R1 recipe
- `doodle-shots-motion:2.122` — row-embed [1 shot] — PARTIAL — partial, rest planned (open)
  - says: (10z): card-resize, panel-reveal and modal-morph components expand a row or card in place; missing: row-embed recipe (a list row growing to embed a card) [10z: build]
  - approach: R1 recipe
- `doodle-shots-motion:2.124` — wall-reveal-moves (bento-light-up, wireframe-draw-on) [2 shots] — PARTIAL — partial, rest planned (open)
  - says: (10z): KIT.layout.bento, stagger-lattice, mk-placeholder-grid block, skeleton-reveal, KIT.path.draw/KIT.doodle drawOn; missing: bento-light-up and wireframe-draw-on recipes [10z: build]
  - approach: R1 bento-light-up, wireframe-draw-on

#### Native code to add in tools/ (or a flag/command) (23)

- `doodle-shots-motion:1.12` — Callout: dot lands, leader line drawn, label written; anchor follows camera — PARTIAL — partial, rest planned (open)
  - says: catalog vox-annotate, cursor-annotate, hw-box-label, hw-arrow (docs/playbook/blocks.md lists none as camera-anchored); missing: `D.callout` with dot landing, drawn leader, written label and an anchor that follows the ca…
  - approach: native `D.callout({anchor:(t)=>[x,y], label, in})` (S)
- `doodle-shots-motion:1.13` — Drawing score: parts, ids, dependencies, removable layers, teaching phases; one score yields still, timelapse, step sheet — PARTIAL — open
  - says: (10g): `D.score` in tools/doodle2.js: ordered marks with ids, deps (cycle/unknown-dep errors), `layers` filter, cost timing, last frame = still; proof: tools/selfcheck/doodle2.mjs (ran, passes); missing: step sheet (one…
  - approach: native `D.score` (ordered marks with ids/deps/layers) built from SVG groups; `drawSVG(svgEl)` auto-orders strokes by DOM order
- `doodle-shots-motion:1.21` — Shape handoff: one outline travels, stretches, becomes the target; coverShape grows to fill — PARTIAL — partial, rest planned (open)
  - says: (10e): `KIT.path` / `P.morph` / `P.morphMany` (flubber, tools/path.js; proof: tools/selfcheck/motion/path.mjs); missing: `handoff` (one outline travels, stretches and lands exactly on the target) and `coverShape` growth…
  - approach: native `KIT.morph.handoff({from,to,t0,t1})` (travel + stretch + land exactly) S
- `doodle-shots-motion:1.24` — Camera: keys with per-segment ease, log2 zoom, monoZoom, authored path fn — PARTIAL — partial, rest planned (open)
  - says: (10e): `S.tour` (poses with per-pose ease, exact at each pose, tools/shots2.js) and any `t => state` function is an authored path; `K.camAt` still lerps z linearly with one inOut ease; missing: log2 zoom interpolation,…
  - approach: native: interpolate z in log2 inside cam3/keys option `log:true`; `KIT.shot.path(fn)` already is t=>state
- `doodle-shots-motion:1.26` — Lens zoom vs dolly vs dolly-zoom (solved per frame) — PARTIAL — partial, rest planned (open)
  - says: (10e): `S.crashZoom` = lens zoom, `S.dollyZoom` = the fake (bg scales, tools/shots.js), `S.planes` gives real depth (tools/shots2.js); missing: a real dolly-zoom solved per frame on top of `S.planes` (no `dollyZoomReal`…
  - approach: native `dollyZoomReal` needs >=2 planes; builds on `shot.planes`
- `doodle-shots-motion:1.27` — Shake as gradient noise, attack ramp, squared decay, rot about centre — PARTIAL — partial, rest planned (open)
  - says: (10e): `K.shake` (exponential-decay sinusoids at ~9/11 Hz) and `K.handheld` (sines), tools/shots.js; missing: gradient-noise shake (`D.noise` exists in tools/doodle2.js but is not wired in), attack ramp, rotation about…
  - approach: native: swap sines for seeded D.noise option `noise:true`
- `doodle-shots-motion:1.28` — Time remap: speed keys, smoothstep ramps, freeze with keepsMoving, filmFrameOf for cues — PARTIAL — partial, rest planned (open)
  - says: (10e): `K.remap` piecewise-linear points and `S.bulletTime` (world clock that ramps to a freeze and back; tools/shots.js, shots2.js); missing: smoothstep speed ramps, inverse `filmOf(sceneT)` for cues, the speed<0.01 `k…
  - approach: native `KIT.timeRemap(keys)` -> {at(t), filmOf(sceneT), freezes}; refuse speed<0.01 without keepsMoving (their dead-air rule)
- `doodle-shots-motion:1.32` — Reading-time rule: readS = max(0.7 s, 0.3 s/word); chatHold; paced() — PARTIAL — partial, rest planned (open)
  - says: (10d): qa WARN `wordy` and taste `pacing` (VO faster than 6.5 words/s, over 4 s with nothing moving; tools/checks/taste.page.mjs); missing: the readS = max(0.7 s, 0.3 s/word) 'up long enough to read' check on each text,…
  - approach: native QA WARN `readtime` in qa_page.mjs (visible window of each text vs readS)
- `doodle-shots-motion:1.33` — Subtitles: 2-6 word phrases landing on the first spoken word; caption rule checks — PARTIAL — partial, rest planned (open)
  - says: `K.captionCues(max=42)` splits by 42 characters and `K.subtitles` does karaoke highlight (tools/engine.js); missing: a 2-6 word phrase splitter landing on the first spoken word, and the TOO TIGHT caption check in tools/…
  - approach: native: phrase splitter min/max words + TOO TIGHT check in sched.py
- `doodle-shots-motion:1.37` — Mechanism explainers: exploded axonometric machine, free-angle camera, depth-sorted parts, drafted lettering, figure card — MISSING — exception (owner-approved 2026-11-12)
  - says: pieces only: `S.explode` (layers separate in z while the stack turns axonometric, tools/shots2.js) and `KIT.math3d` (Three.js scenes, tools/math3d.js). Not built (10z audit): no `KIT.axo` projection with depth-sorted pa…
  - approach: native only as docs + `KIT.axo` SVG projection helper (project mm coords with azimuth/elevation, depth-sort) or three.js for real 3D; L, defer
- `doodle-shots-motion:1.49` — Determinism gate: hash frames forward vs reverse, cold vs cached; dead-air gate (something changes every second) — PARTIAL — partial, rest planned (open)
  - says: (10d): `verify` (hash re-render) and the qa `seekable` gate (tools/qa.py), taste `pacing` flags over 4 s with nothing moving (tools/checks/taste.page.mjs); missing: a forward-vs-reverse / cold-vs-cached frame-hash gate…
  - approach: native qa WARN `dead-air`: per-second frame diff in qa_page.mjs (S)
- `doodle-shots-motion:1.50` — Ship checks on the delivered file: framecheck (text whole, up long enough, 9:16 phone zones), A/V sync, true peak, motionscan (slide cuts,… — PARTIAL — partial, rest planned (open)
  - says: (10d): qa gates loudness incl. true peak, captions in safe area, flash, illustrative, seekable; WARNs overlap, tiny-text, wordy, dark, ai-label, taste (motion, balance, empty, contrast, pacing; proof: tools/selfcheck/ta…
  - approach: native: WARN `safe-zone` (9:16 UI overlap zones), `facts` (numbers need a Source: credit; partly exists in README 'Source:' credit)
- `doodle-shots-motion:1.51` — Formats: 1x1, 9x16, 16x9, 4x5 or any WxH; 30 or 60 fps; GIF / WebM-alpha / APNG / MP4 / one self-contained HTML player — PARTIAL — open
  - says: (10a, 10d): `--formats` 16x9, 9x16, 1x1, 4x5 (1080x1350), 16x10 (SIZES in bin/reelwright.mjs), fps from project.json (default 60), mp4 / webm / mov / gif / apng / png / hls via `output` or `encode --as` (docs/playbook/o…
  - approach: add 4x5 to SIZES + K.fmt; GIF/WebM/APNG via ffmpeg flags; HTML player = the embeddable-player work (other audit)
- `doodle-shots-motion:2b.1` — Camera layer: layout-scale `zoom` instead of scale so text stays sharp under 3D; native-size texture rasterised then scaled (Q2) — PARTIAL — partial, rest planned (open)
  - says: KIT.camCSS/shoot still use transform scale() (tools/shots.js); shots2 planes set --kit-line for stroke weight only; missing: `sharp:true` layout-zoom option and a 9x16 stills check [10z: build]
  - approach: native: camCSS option `sharp:true` (CSS zoom on the filmed layer; same Chromium in both renderers) + docs; verify with stills at 9x16
- `doodle-shots-motion:2b.3` — Velocity helpers: velocityAt, lagged, dampedSettle (state-free) — PARTIAL — partial, rest planned (open)
  - says: (10z): K.speedBlur central-difference velocity (tools/shots.js), steepTilt `ghosts` trailing copies (tools/shots2.js), KIT.sim seekable physics (tools/motion.js); missing: velocityAt / lagged / dampedSettle helpers [10z…
  - approach: native 10 lines in shots.js
- `doodle-shots-motion:2b.10` — Aesthetic rules as lints: R1 hold >=1 s on wordmark, R4 <=3 whole-frame beat hits, Q11 caption >=5% frame height / secondary 3%, Q3 no hand… — PARTIAL — partial, rest planned (open)
  - says: (10z): qa WARN tiny-text (24 px × KIT.u, tools/qa_page.mjs), taste WARNs motion/balance/empty/contrast/pacing (tools/checks/taste.page.mjs), mix.py WARN on >1 riser/subdrop; missing: wordmark-hold, 5%/3% caption height,…
  - approach: native qa WARN set: min-text-height 5%/3%, wordmark-hold, big-slam budget (count K.shake/crashZoom), sfx-repeat
- `doodle-shots-motion:2b.17` — Gallery of 150 looping previews + library.json API + llms.txt — MISSING — exception (owner-approved 2026-11-12)
  - says: stills/sheet.jpg contact sheet only; 10z: no per-shot looping preview gallery: tools/theme-gallery.mjs renders themes, `blocks.mjs render` renders block stills, docs/recipes has stills; a 150-clip gallery + llms.txt is…
  - approach: native `reelwright shots --gallery`: renders each KIT.recipe/shot as a looping mp4/webp sheet into docs/ (also the proof medium for these rows)
- `doodle-shots-motion:2b.18` — Beat-synced cutting methodology: librosa grid fit, kick/snare/hat onset classes, grid validation by transient coverage, post-render cut err… — PARTIAL — partial, rest planned (open)
  - says: tools/beatgrid.py fits tempo/phase from two onset bands (kick <120 Hz, transients 2-10 kHz) + drop; tools/music.py beds have a known grid; KIT.snap / KIT.pulse; missing: post-render cut-on-beat error report, snare/hat c…
  - approach: native qa WARN `cut-on-beat`: extract audio from mp4 and measure cut-to-beat error (S); onset classes (low/mid/high band) S
- `doodle-shots-motion:2b.19` — Output-audio offset compensation: AAC priming (~1.28 f) and per-file SFX peak lag (brush-write 2 f, paper-slide 10 f) — PARTIAL — partial, rest planned (open)
  - says: (10g): per-kind PEAK table in tools/mix.py (cue start = t − peak), proved ±10 ms by tools/selfcheck/sound.mjs; missing: AAC priming measurement / `verify-av` cross-correlation on the rendered mp4 [10z: build]
  - approach: native: per-kind PEAK table in mix.py for synthesised SFX (known by construction) + `verify-av` cross-correlation check on the rendered mp4 (S)
- `doodle-shots-motion:3.3` — Easing standards as cubic-beziers (MD3 standard/emphasized/accelerate/decelerate, Apple HIG, gentle float, bounce, elastic snap) — PARTIAL — partial, rest planned (open)
  - says: K.E premium, corporate, emphasized, accel, settle + any KIT.bezier(x1,y1,x2,y2) (tools/engine.js); GSAP CustomEase bundled (10b); missing names: MD3 decelerate (0,0,0,1), Apple HIG (.25,.1,.25,1), elastic snap (.68,-.55…
  - approach: native: 3 more K.bezier names (S)
- `doodle-shots-motion:3.7` — Stagger recipes by element class (list, grid, nav, dashboard), total < 500 ms, overlap % — PARTIAL — partial, rest planned (open)
  - says: (10b): K.stagger linear + --kit-stagger + PLAYBOOK budget; GSAP and anime.js stagger from 'center' verified seekable via KIT.gsap / KIT.anime (tools/selfcheck/runtimes.mjs); missing: native K.stagger {from, grid, ease}…
  - approach: native: K.stagger options {from:'center'/'edges', grid, ease} (also GSAP stagger parity); docs recipes
- `doodle-shots-motion:3.8` — Choreography rules: lead with hero, spatial origin consistency, counter-motion 20-30%, 1/3-distance and 1/3-simultaneous rules — PARTIAL — partial, rest planned (open)
  - says: (10z): PLAYBOOK 1/3-screen + stagger budget rules; taste `motion` WARN flags hard starts/stops at speed (tools/checks/taste.page.mjs); missing: lints for linear spatial moves, stagger total >0.5 s, >1/3 of elements movi…
  - approach: native qa WARN lints: spatial move with linear ease, stagger total >0.5 s, >1/3 of 3+ elements moving at once (needs film introspection, M)
- `doodle-shots-motion:3.11` — Ambient loops: breathing, float (layered durations), gradient shift, parallax, continuous rotation, shimmer, particle ambient (counts/speed… — PARTIAL — partial, rest planned (open)
  - says: (10z): blocks aurora-drift, grain-field, drift-hold, shimmer-sweep, confetti, beat-pulse-background; KIT.pulse (beat pump), KIT.sim (seekable particles), math3d camera.ambient; missing: KIT.loop(t, period, shape) helper…
  - approach: native `KIT.loop(t, period, shape)` (sine/saw, seeded phase per id) + docs; no particles lib (seeded D.rng)

#### Other (read the approach text) (17)

- `doodle-shots-motion:1.17` — Illustrated kinetic type: every word drawn stroke by stroke in a medium, letters pop on landing — PARTIAL — partial, rest planned (open)
  - says: (10g): `D.letters` (pen-written lettering, tools/doodle2.js) and `KIT.layout.kinetic` (font words landing on spoken words, tools/layouts.js) both exist; missing: `layout.kinetic({style:'drawn'})` joining them (no `style…
  - approach: after lettering lands: `layout.kinetic({style:'drawn'})`
- `doodle-shots-motion:1.29` — Motion blur: sub-frame render averaged in linear light (`--blur auto`, shutter 180) — PARTIAL — open
  - says: (10a): project.json `motionBlur` (shutter 180, 8 samples), pvk averages sub-frames with ffmpeg `tmix` on the encoded frames, hyperframes uses the producer's blur (tools/renderers/pvk.mjs, hyperframes.mjs; docs/playbook/…
  - approach: optional renderer flag `--motion-blur N`: render N sub-frames per frame in tools/renderers/pvk.mjs and average with ffmpeg tmix/numpy; opt-in, multiplies render time
- `doodle-shots-motion:1.34` — Product UI from data: before/after states, items spring to slots, matched by id — MISSING — exception (owner-approved 2026-11-12)
  - says: Reelwright films a real recorded UI instead. Not built (10z audit): no id-keyed before/after list morph; docs/recipes/before-after.md is a static two-pane split. Suggest: accept as exception (low priority, the Approach…
  - approach: optional: `KIT.layout.compare`/ list-morph keyed by id (FLIP-style). Low priority
- `doodle-shots-motion:1.35` — People placement by head size; pop-out on a disc — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): niche (people placement by head size), the Approach says not needed. Suggest: accept as exception.
  - approach: not needed (niche); docs note
- `doodle-shots-motion:1.47` — Narration: multiple providers (say, kokoro local; cloud gemini/openai/elevenlabs), takes cached by hash, `check` hears every word back (WER… — PARTIAL — partial, rest planned (open)
  - says: tools/vo.py edge-tts (free, word timings), takes cached by sha1 of voice+rate+pitch+text, per-language voices; missing: a local provider (kokoro/piper) and the ASR round-trip check (nothing in tools/ or bin/ mentions wh…
  - approach: optional: local kokoro/piper provider + ASR round-trip check (whisper.cpp) as opt-in setup extras; keep edge-tts default
- `doodle-shots-motion:1.53` — Interactive web art: <ani-doodle> mascots that follow the cursor, scroll-drawn hero, form companion — MISSING — exception (owner-approved 2026-11-12)
  - says: Not built (10z audit): not video, belongs to the embeddable-player / studio work (tools/commands/embed.mjs and the studio exist, neither is cursor-reactive web art). Suggest: accept as exception.
  - approach: out of scope (not a video; belongs to the embeddable-player/studio work)
- `doodle-shots-motion:2b.6` — Caption info-strip, DigitRoll odometer, FlashCut, VerticalTicker, ClipCard (video as card hero) — PARTIAL — partial, rest planned (open)
  - says: (10z): K.subtitles, K.count (count-up), K.clip; KIT.transition('flash') (tools/transitions.js) covers FlashCut; blocks number-wheel, slot-machine-roll, news-ticker, ticker-takeover (`reelwright add`); missing: KIT.count…
  - approach: KIT.count({roll:true}) S; ClipCard = K.clip inside a card (docs); flash via KIT.transition.flash
- `doodle-shots-motion:2b.13` — Page capture trio: 2x full-page PNG, per-element transparent cutouts, layout.json bbox table — PARTIAL — partial, rest planned (open)
  - says: tools/capture_site.mjs saves 2x sections, full page, images, hero + per-heading shots and site.json (text, colours, fonts, heading y); missing: per-element transparent cutouts and a layout.json bbox table [10z: build]
  - approach: extend capture_site: element cutouts (omitBackground) + layout.json boxes; needed for 3D 'floating chip' recipes
- `doodle-shots-motion:2b.14` — Motion Workbench: CapCut-style browser editor (tracks, retime, swap shots, schema inspector, parity check, export) — PARTIAL — exception (owner-approved 2026-11-12)
  - says: (10k): `reelwright studio` local editor (tools/studio, docs/playbook/studio.md): player, timeline of scenes/VO/beats/SFX cues, inspector for lines/gaps/style, stills/taste/embed jobs; missing: shot/transition/SFX track…
  - approach: belongs to the studio-editor audit; Remotion-Player-based, so not reusable. Reuse only the manifest idea (`workbench.ts`: shots/transitions/captions/sfx tracks)
- `doodle-shots-motion:2b.24` — Shot-polish tooling: contact sheets, compare pages, decisions.json for 216 demos — MISSING — exception (owner-approved 2026-11-12)
  - says: tools/sheet.py; 10z: internal polish tooling of the source repo; tools/sheet.py contact sheets + stills already cover Reelwright's own review [10z: except]
  - approach: internal tooling; skip
- `doodle-shots-motion:4.17` — Flip: record layout state, animate to new layout — MISSING — exception (owner-approved 2026-11-12)
  - says: 10z: Flip reads live layout and gave a zero-duration tween in the seek test; not bundled, seek behaviour unverified (docs/playbook/runtimes.md 'Not bundled') [10z: except]
  - approach: UNVERIFIED: my test added no usable tween (duration 0). Not recommended for render(t) (reads live layout); skip unless a film needs it
- `doodle-shots-motion:4.18` — CSSRulePlugin (animate pseudo-elements / stylesheet rules) — MISSING — exception (owner-approved 2026-11-12)
  - says: 10z: CSSRulePlugin not bundled, seek behaviour unverified (docs/playbook/runtimes.md 'Not bundled'); pseudo-elements can be animated with CSS vars from render(t) [10z: except]
  - approach: bundle optional; UNVERIFIED seek behaviour
- `doodle-shots-motion:5.3` — HTML renderer — PARTIAL — partial, rest planned (open)
  - says: (10b): vendor/lottie/lottie.min.js is the full 5.13.0 player incl. the html renderer and KIT.lottie passes `renderer` through (tools/runtimes.js); missing: only svg and canvas are verified (tools/selfcheck/runtimes.mjs)…
  - approach: UNVERIFIED; do not bundle
- `doodle-shots-motion:5.5` — Expressions (AE JS expressions evaluated by lottie-web) — PARTIAL — partial, rest planned (open)
  - says: (10b): full lottie-web player (expressions engine included) seeked by KIT.lottie; missing: determinism test and the qa scan that warns on expression strings / rejects random, seedRandom, wiggle (seekable-runtimes.py has…
  - approach: UNVERIFIED determinism (wiggle/random/time). Add a JSON scan in qa: warn on animations containing `"x":"var $bm_rt` expression strings; reject `random`/`seedRandom` until tested
- `doodle-shots-motion:5.6` — Text layers and fonts in Lottie — PARTIAL — partial, rest planned (open)
  - says: (10b): KIT.lottie loads any JSON; renders wait for document.fonts.ready before the first frame; missing: a Lottie text-layer seek test (playbook lists text as not tested) [10z: build]
  - approach: UNVERIFIED; require document.fonts.ready before first seek
- `doodle-shots-motion:5.7` — Image assets, masks, mattes, gradients, trim paths, repeaters, effects — PARTIAL — partial, rest planned (open)
  - says: (10b): shape layers (group, rounded rect, fill, stroke; position/rotation/opacity/scale) verified in both renderers (tools/selfcheck/runtimes.mjs, projects/runtimes-hf); missing: seek tests for images, masks, mattes, gr…
  - approach: run the seek test per bundled sample; list supported features in docs
- `doodle-shots-motion:5.8` — dotLottie (.lottie zip, multiple animations, themes, state machines) — MISSING — planned (Phase 11)
  - says: HF runtime adapter already handles DotLottie objects (setFrame / seek percent); 10z: no dotLottie player or .lottie unzip; only the vendored HF runtime adapter knows DotLottie objects; playbook says not tested. Smallest…
  - approach: optional: `reelwright add-lottie x.lottie` unzips to JSON for lottie-web at add time (S, no WASM). Full dotlottie-web only if state machines/themes are asked for
