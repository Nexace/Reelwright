# Phase 10z: proposed exceptions (owner to rule)

Generated 2026-11-12 by tools/parity_compile.mjs from docs/parity/*.md. Do not hand-edit. **Nothing here is an exception until the owner approves it.** This is every row whose status is not EQUAL, BETTER or EQUAL/BETTER, grouped by the reason the row's own text (or the plan's Known exceptions) gives. The last group, "Not done, no stated reason", is the to-do list.

Total rows 601; EQUAL + BETTER + EQUAL/BETTER 199; not 402 (grand total of the groups below: 402).

| # | Group | Rows |
|--:|---|--:|
| 1 | Excluded by owner decision or repo rule | 7 |
| 2 | Needs WebGPU / specific hardware | 3 |
| 3 | Licence-blocked or non-OSI (and what was done instead) | 3 |
| 4 | Not seekable / not deterministic, so kept out by the seekable gate | 4 |
| 5 | Optional renderer / install not bundled (Remotion, Manim CE, ManimGL) | 13 |
| 6 | shotcraft audio, social publishing, JianYing and third-party tools skipped | 4 |
| 7 | Paid-connector-only (Higgsfield) | 16 |
| 8 | The audit's own approach column says skip / defer / not needed | 21 |
| 9 | Not applicable by design (N/A, UNVERIFIED, DIFFERENT) | 9 |
| 10 | Not done, no stated reason | 322 |
| | **Grand total** | **402** |

Row format: `source:id — feature — status`, then what the row says (status text) and, for open items, its approach column. IDs: HyperFrames and Higgsfield use the source ids; the other sources use `<section>.<n>` (Manim `m<group>.<n>`), numbering the data rows of that section in file order.

How rows are grouped: a row goes to the first group whose keyword rule matches what the row itself says (feature, status text, and for some groups the approach or licence cell); anything unmatched is in the last group. The rules are in `REASONS` in tools/parity_compile.mjs. The grouping is a reading aid, not a ruling: read the quoted text. A row with `(mixed)` was written EQUAL or BETTER but its own text also names a MISSING or PARTIAL piece, so it is counted PARTIAL. Rows the audit marked `same row` inherit the status of the row above.

## 1. Excluded by owner decision or repo rule (7)

Rows marked OUT (no cloud render, with Colab staying; no HeyGen accounts, paid or closed-source desktop app; no MCP/plugin packaging), and rows whose status text cites the owner decision or the repo rule.

By source: hyperframes 6, remotion 1

### HyperFrames (6)

- `hyperframes:G14` — `skills` / `update` / `upgrade` / `figma` / `events` / `templates` / `usage` / `telemetry` / `feedback` — OUT
  - says: for `auth billing cloud lambda cloudrun publish open catch-up usage telemetry feedback templates` (HeyGen accounts, hosted, paid, or tracking). `skills` see M1
  - approach: none
- `hyperframes:G17` — `catch-up`, `open` (desktop app) — OUT
  - says: (desktop app is closed source, needs a HeyGen sign-in)
- `hyperframes:H6` — WebMCP tools (`studio_look/select/inspect/set_style/frame`) for an in-browser agent — OUT
  - says: (repo rule: no MCP; browser origin trial only)
- `hyperframes:H7` — Studio desktop app (agent beside preview, Make-something box, brand kits, reference video, share) — OUT
  - says: (closed source, HeyGen sign-in, not in this repo)
- `hyperframes:I14` — Distributed render plan/assemble (Lambda, Cloud Run, k8s jobs) — OUT
  - says: (owner: no cloud). Colab render (`cloud/`) stays
- `hyperframes:L3` — Claude/Codex/Cursor plugin packaging and marketplace — OUT
  - says: (repo rule: standalone, no plugin/MCP)

### Remotion + its skills (1)

- `remotion:2.7.15` — Cloud: Lambda, Cloud Run, Vercel Sandbox, Azure, Cloudflare, `@remotion/lambda`, distributed render, client-side `@remotion/web-renderer` (… — N/A
  - says: (owner: no cloud render to AWS/GCP; Colab/Actions exist)
  - approach: out of scope, do not wrap

## 2. Needs WebGPU / specific hardware (3)

Plan "Known exceptions": WebGPU blocks are supported only where the machine has WebGPU, flagged otherwise. Rows whose feature or status text names WebGPU or a hardware adapter.

By source: hyperframes 3

### HyperFrames (3)

- `hyperframes:B7` — TypeGPU / raw WebGPU (`__hfTypegpuTime`, `data-requires-webgpu`, hardware adapter required unless SwiftShader device) — MISSING
  - says: (eng). 37 blocks need it; not byte-reproducible across GPUs
  - approach: defer as opt-in "needs a GPU" extra; do not vendor
- `hyperframes:B10` — Video textures into WebGL/WebGPU in render mode (`video-texture-compat`) — MISSING
  - says: (needs A7)
  - approach: follow A7
- `hyperframes:E3` — 210 blocks (`hyperframes:block`, full 5-30 s scenes, mounted as sub-compositions at `compositions/<name>.html`). Needs: HF nested-compositi… — PARTIAL
  - says: (10f). 136 of 210 vendored, converted to `KIT.mount` templates by `tools/blocks.mjs import` and each verified under the HyperFrames runtime (two shuffled seek orders, second mount 7 s later, same pixels, no network): `v…
  - approach: clipper-lib, d3-delaunay (not approved); media re-timing in KIT.mount; licences for the 19 blocks' assets

## 3. Licence-blocked or non-OSI (and what was done instead) (3)

Rows whose status text or licence cell says the upstream is UNLICENSED, has no licence, is all-rights-reserved, not open source, or a paid licence. The row text says what was done instead (native rewrite, skip).

By source: hyperframes 1, remotion 1, higgsfield-workflows 1

### HyperFrames (1)

- `hyperframes:E7` — Data/map blocks: `us-map`, `us-map-bubble`, `us-map-flow`, `us-map-hex`, `world-map`, `spain-map`, `nyc-paris-flight`, `north-korea-locked-… — PARTIAL
  - says: (10f): `world-map`, `us-map-bubble` supported (d3 7.9.2, topojson-client 3.1.0, us-atlas 3.0.1, world-atlas 2.0.2 vendored); `us-map`, `us-map-flow`, `spain-map` (es-atlas data not vendored: its blocks failed the seek-o…
  - approach: make the 3 failing maps seekable

### Remotion + its skills (1)

- `remotion:2.3.1` — `@remotion/effects`: ~91 effect docs (list in skills `SKILL.md` and `docs/effects/`); `effects={[...]}` on Img/CanvasImage/AnimatedImage/So… — MISSING
  - says: (no effects stack; CSS filters only via themes)
  - approach: [R] free (needs `--gl=angle`, Remotion Chrome). [N] cherry-pick CSS/SVG-filter ones below

### Higgsfield workflows (docusphere, cth9191) (1)

- `higgsfield-workflows:33` — Gallery preview videos and wordmark/screenshots — N/A
  - says: third-party media, all rights reserved; do not vendor
  - approach: -

## 4. Not seekable / not deterministic, so kept out by the seekable gate (4)

Rows whose status text says the upstream feature is interactive, wall-clock or random, and is banned or excluded because Reelwright films must be pure functions of t.

By source: remotion 1, doodle-shots-motion 3

### Remotion + its skills (1)

- `remotion:2.4.3` — `<Html5Video>`, `<Html5Audio>` — N/A
  - says: (non-seekable, qa forbids)
  - approach: none

### anidoodle, video-shotcraft, motion-design-skill, GSAP, Lottie (3)

- `doodle-shots-motion:4.15` — ScrambleText: scramble then reveal — PARTIAL (mixed)
  - says: BY-EXCLUSION (10b): not bundled and banned by the `seekable-runtimes` gate (Math.random every render); seeded scramble still MISSING
  - approach: DO NOT use: calls Math.random on every render (L102, L169, L246); two fresh pages gave 666 differing px at the same t. Native seeded `KIT.scramble(t, ...)` or catalog block
- `doodle-shots-motion:4.19` — gsap.utils: interpolate, mapRange, snap, wrap, clamp, normalize, pipe, distribute, shuffle/random(non-det.) — PARTIAL
  - says: (10b): bundled with gsap.min.js; `utils.random/shuffle` banned by the seekable-runtimes gate; the rest untested
  - approach: bundle; lint random/shuffle
- `doodle-shots-motion:4.22` — ScrollTrigger, ScrollSmoother, ScrollTo, Observer, Draggable, Inertia, matchMedia, ticker/delayedCall/quickSetter, React/Vue hooks — N/A
  - says: interactive or wall-clock features, not seekable
  - approach: exclude from the bundle (about 130 KB saved); lint `ScrollTrigger`, `.play(`, `repeat:-1`, global `gsap.to(` outside a paused timeline

## 5. Optional renderer / install not bundled (Remotion, Manim CE, ManimGL) (13)

Plan: Remotion, Manim CE and ManimGL are opt-in installs, never bundled. Rows whose status text puts the gap in the optional renderer or says it was not built there.

By source: remotion 9, manim 4

### Remotion + its skills (9)

- `remotion:2.1.14` — `<Track>` non-overlapping named timeline lanes; editable timeline groups — MISSING
  - says: (Studio-only concept)
  - approach: [R] only; for [N] a "scene list" in project.json is enough
- `remotion:2.2.6` — HTML-in-canvas shader presentations: `blurSlide, bookFlip, crossZoom, crosswarp, dissolve, dreamyZoom, filmBurn, linearBlur, ripple, swap,… — MISSING
  - approach: [R] only (needs Remotion's Chrome build; Chrome 149+ flag in preview). Native alternative later via WebGL, L. 12 more look ideas, not a must
- `remotion:2.3.7` — Edges and 3D: outline, roughenEdges, shrinkwrap, tear, bevelAlpha, cylinder, sphere, pageTurn (WebGPU), shatter — MISSING
  - approach: [R] only (WebGPU); skip natively
- `remotion:2.3.9` — `createEffect()` custom effect API (2d/webgl2/webgpu backends) — N/A
  - approach: [R] only
- `remotion:2.3.10` — `<HtmlInCanvas>` (DOM drawn into canvas, `onPaint`, WebGL/WebGPU; Chrome 149+ flag; nesting needs Chrome 157; Remotion ships its own Chrome… — MISSING
  - approach: [R] only. Not portable to our Playwright pages (flag/version: UNVERIFIED there)
- `remotion:2.6.2` — `@remotion/three` `<ThreeCanvas width height>`, drive by `useCurrentFrame` (no `useFrame`), `<Sequence layout="none">` inside, `useVideoTex… — PARTIAL
  - says: →EQUAL for a WebGL scene (10b): Three.js bundled, `KIT.three(el, build)` with preserveDrawingBuffer; no React Three Fiber, video textures untested; `tools/runtimes.js`, `tools/selfcheck/runtimes.mjs` (shuffled seeks, pv…
  - approach: owner: bundle Three.js (MIT): [N] `KIT.three(canvas, sceneFn)` that renders one frame per `render(t)` with `preserveDrawingBuffer`; [R] free, but React-only
- `remotion:2.6.3` — `@remotion/skia` (`SkiaCanvas`, `enableSkia`; Shopify react-native-skia CanvasKit WASM) — MISSING
  - approach: [R] only; native = skip (CanvasKit is large). Canvas 2D covers most
- `remotion:2.6.4` — `@remotion/rive` `<RemotionRiveCanvas>` — MISSING
  - approach: [R] only; skip
- `remotion:2.8.2` — Interactivity: `Interactive.Div/Svg/Path...`, `Interactive.create()` + `InteractivitySchema` (number, boolean, color, enum, array, asset, f… — MISSING
  - approach: [R] only; the idea to copy for our studio: edit values inline in `film.js` with codemods (their `@remotion/codemods`). Do not copy skills text

### Manim CE + ManimGL + manim skills (4)

- `manim:m4.2` — GL-only: `CircleIndicate`, `FlashAround`, `FlashUnder`, `ShowCreationThenDestruction(Around)`, `ShowCreationThenFadeOut/Around`, `WiggleOut… — PARTIAL
  - says: same helpers cover most
  - approach: native: same module
- `manim:m12.11` — GL-only API renames: `ShowCreation`=CE `Create`, `Tex`=`MathTex`, `TexText`=`Tex`, `Text` same, `self.frame`=`self.camera.frame`, `-w` writ… — N/A
  - approach: `reelwright_manim.names` alias module (S) so shared helpers work on both
- `manim:m13.1` — Scene block in project.json rendered to a cached clip, played by `KIT.manim()` — PARTIAL
  - says: (10i): `"manim"` block, `reelwright manim <p> install|doctor|render|verify`, clips cached by input hash, played by `KIT.manim(id)` (`tools/manim.js`, `tools/manim.mjs`, `python/reelwright_manim/`); pvk + hyperframes pla…
  - approach: optional renderer (CE + GL)
- `manim:m13.2` — `"renderer": "manim"` whole-film mode (`tools/renderers/manim.mjs`, same contract as pvk/hyperframes) — MISSING
  - says: (not built in 10i: scenes are layers in a normal film)
  - approach: optional renderer, second step

## 6. shotcraft audio, social publishing, JianYing and third-party tools skipped (4)

Plan "Known exceptions": JianYing export, Upload-Post publishing, Freesound tool and the Mixkit/untraceable shotcraft audio.

By source: doodle-shots-motion 4

### anidoodle, video-shotcraft, motion-design-skill, GSAP, Lottie (4)

- `doodle-shots-motion:1.43` — Original score composed in code: 21 genre vocabularies, instruments, form fits length; novelty gate — PARTIAL
  - says: (10g: 4 numpy beds — chill, drive, house, hiphop; no genre engine by design)
  - approach: do not port the TS engine. Add 3-4 numpy beds (house 124, hiphop 90, lofi, ambient) = replacement for shotcraft Mixkit BGM too
- `doodle-shots-motion:2b.15` — JianYing (CapCut CN) draft export: per-shot clips, caption tracks, SFX/BGM tracks (mac tested, win untested) — MISSING
  - approach: skip; if an interchange export is wanted use OpenTimelineIO / FCPXML (documented formats) over timeline.json - separate decision
- `doodle-shots-motion:2b.16` — Social publishing via Upload-Post API (TikTok, IG, YouTube, LinkedIn, X) — MISSING
  - approach: do not build: network, accounts, third-party service; conflicts with offline core. Document manual upload
- `doodle-shots-motion:2b.21` — Freesound SFX search/download tool (CC0 default, manifest + credits, no API key) — MISSING
  - approach: do NOT ship; the no-key page scraping may breach Freesound terms (UNVERIFIED). Offer instead: manual `assets/sfx/` folder + `sfx-credits.json` checked by qa when a CC BY file is mixed in

## 7. Paid-connector-only (Higgsfield) (16)

Rows from the Higgsfield audit whose status or approach says the capability (generated media, AI music, cloned voices) needs the paid Higgsfield connector (docs/CONNECTORS.md). Core stays free, local and offline.

By source: higgsfield-workflows 16

### Higgsfield workflows (docusphere, cth9191) (16)

- `higgsfield-workflows:1` — Style locking: three fixed text blocks (image style, video style, avoid-list) reused verbatim for every scene; "style once, action per clip" — PARTIAL (mixed)
  - says: for free output (theme CSS + brand.json lock the look: tools/look.mjs, themes/*.css). MISSING for generated media: no stored style block feeding `gen`
  - approach: Add optional `gen` block in project.json (`style`, `avoid`, per-kind) that `gen` prepends/appends to every prompt and includes in the cache key. Local: themes already do it. Paid need: nothing extra…
- `higgsfield-workflows:2` — Style reference sheet: generate one master board image, get approval, attach to EVERY later generation as the visual source of truth — MISSING
  - says: (gen takes a prompt only: tools/gen.mjs, gen/higgsfield.mjs `bodyOf` = prompt + opts)
  - approach: Needs reference-image input on image and video calls (row 8). Higgsfield: image call with reference; model ids in the repo (`nano_banana_pro`, `gpt_image_2`) come from CLI/MCP, NOT from docs.higgsfie…
- `higgsfield-workflows:4` — Assembled prompt columns (IMG = style + shot + text; VID = style + action + text + sfx + avoid) — PARTIAL
  - says: columns survive in `raw` but are not used or assembled (tools/beats.mjs header comment)
  - approach: Optional `beats export --prompts` / `gen --beats` that fills IMG/VID PROMPT from the locked style (row 1) + `beats[].shot/motion/onScreen/sfx`. Pure text, free
- `higgsfield-workflows:5` — Clip Duration must be >= VO Length and in the model's allowed set (4/6/8 s) — PARTIAL
  - says: `beats` stores `target`/`clip`; no check against measured TTS length (tools/beats.mjs; vo.py measures real length). Allowed-set differs per model: Higgsfield Seedance 2.0 reference-to-video accepts 4-15 s integer, Kling…
  - approach: Add a `sched`/`beats` WARN when a measured VO line exceeds its `clip` (free). Allowed-set table is connector-only knowledge, keep it out of core
- `higgsfield-workflows:8` — Image generation per scene, with reference image(s) — PARTIAL
  - says: text-to-image only (`gen --kind image`, default `higgsfield-ai/soul/standard`; tools/gen/higgsfield.mjs). No reference upload
  - approach: Higgsfield REST needs: `POST /files/generate-upload-url` (content_type jpeg/png/webp/gif, wav, mp4) -> PUT presigned URL (no credentials to the storage host) -> pass `public_url` as `image_url`/`imag…
- `higgsfield-workflows:9` — Image-to-video (animate each still; camera move + action, duration, resolution, optional baked audio) — PARTIAL
  - says: text-to-video only; default `kling-video/v2.5-turbo/pro/text-to-video` (tools/gen/higgsfield.mjs)
  - approach: Docs-verified endpoints: `kling-video/v2.5-turbo/{pro,standard}/image-to-video` (`image_url`, `duration` 5|10, `cfg_scale`, `negative_prompt`); `bytedance/seedance-2.0/reference-to-video` (`prompt`,…
- `higgsfield-workflows:10` — Motion transfer / video-reference recreation: reuse a supplied clip's choreography with a new subject or copy — MISSING
  - says: as generation. The *process* (map + compare) is docs-only
  - approach: Higgsfield endpoints (docs-verified): `POST /higgsfield/genjutsu/motion-transfer/v1.0` (`video_url` >= 4 s, trimmed to 30 s; `image_urls` 1-8; `prompt` <= 10000; `resolution` 480p/720p/1080p; output…
- `higgsfield-workflows:15` — Prompt-fix recipes: no morphing, one-direction camera, name elements by position, always repeat style in video prompt, longer clip + simple… — MISSING
  - says: as docs; only meaningful with generation
  - approach: Short "when a generated clip misbehaves" paragraph in docs/CONNECTORS.md (own words). Free, no code
- `higgsfield-workflows:19` — Generation orchestration: batches of 3 (plan concurrency), `--wait`, timeouts — PARTIAL
  - says: one request at a time, poll 2 s x1.5 to 10 s, 15 min timeout, 429 Retry-After, cache, estimate then confirm (tools/gen.mjs, gen/higgsfield.mjs). No batch/queue
  - approach: `gen --batch beats.csv` running N at a time after one total estimate and ONE confirmation. Docs: concurrency number is per account in the console, not published (verify-higgsfield.md) so default 1-2…
- `higgsfield-workflows:21` — Asset management: scene folders, backups `still-v1`, manifest of prompts/models/job ids, "save exact submitted prompt/settings/job record,… — PARTIAL
  - says: /BETTER: `assets/gen.json` (file, provider, model, kind, prompt, date, sha256, host), cache keyed by provider+model+kind+prompt, `verify` hashes assets (docs/CONNECTORS.md). MISSING: version history on regenerate (new p…
  - approach: Keep prior file as `<name>-v1` on overwrite; store `requestId`/`estimateUsd` in manifest; `gen --resume <request_id>` polling an existing job (status endpoint is documented and free to poll)
- `higgsfield-workflows:24` — Re-generation loop: inspect, fix SHOT/MOTION only (style stays locked), regenerate, keep first result for comparison; cth9191: ONE correcti… — PARTIAL
  - says: changing the prompt -> new cache key -> pays again, old cached file kept in `.gen` (tools/gen.mjs) so comparison is possible; no retry bound / counter, no per-beat redo command
  - approach: `gen --redo <beat>`: re-runs one beat's prompt with versioned output (row 21); optional `gen.maxAttempts` per asset in project.json (default 2) that refuses a 3rd paid call without `--yes`. Aligns wi…
- `higgsfield-workflows:26` — One-complete-film request: all timed shots in a single video prompt with design-world, motion-rules, contiguous shots, soundscape, non-dieg… — MISSING
  - says: as generation (gen has no multi-shot prompt builder). The same *structure* is Reelwright's own beats + film.js
  - approach: Optional `beats export --film-prompt` producing the one-request prompt text from `beats` (timed shots from `W()`/schedule + exact-copy list + audio block), for pasting or `gen --kind video`. Seedance…
- `higgsfield-workflows:27` — Reference roles: identity vs style vs start/end frame vs motion; storyboard sheet only as general reference, never as literal first frame — MISSING
  - approach: Part of the reference upload work (row 8): `refs: [{file, role}]` in a gen request mapped to `image_urls`/`video_urls`/`audio_urls`. Seedance docs: reference arrays cannot be combined with `image_url…
- `higgsfield-workflows:28` — Media upload handoff: local path is not a remote attachment; upload, record returned ids — MISSING
  - approach: `files/generate-upload-url` flow (row 8), never send Higgsfield credentials to the presigned storage URL (docs). Our existing rule already keeps creds off the CDN download (tools/gen.mjs)
- `higgsfield-workflows:31` — Targeted video edit / audio finishing via Higgsfield media tools — MISSING
  - approach: Not documented on the docs.higgsfield.ai pages read (no edit endpoint found): UNVERIFIED. Local: ffmpeg trim/conform already used by encode; replacement of a bad region = regenerate that beat
- `higgsfield-workflows:32` — Setup / connection (CLI login `higgsfield auth login`, Pro plan; MCP connection) — DIFFERENT
  - says: intentionally: REST key via env or git-ignored file, plain fetch, no SDK (docs/CONNECTORS.md). CLI needs a paid plan and browser login (providers.md) so unsuitable for headless
  - approach: docs only; keep REST. MCP: a Claude Code MCP is outside the repo

## 8. The audit's own approach column says skip / defer / not needed (21)

PARTIAL / MISSING rows whose approach column starts with skip, defer, n/a or none, or says "skip" for the hard part. The audit itself proposes not doing these; the reason is in the approach text.

By source: hyperframes 6, remotion 9, doodle-shots-motion 6

### HyperFrames (6)

- `hyperframes:A15` — HTML-in-canvas (`drawElementImage`, Chrome experimental flag) as WebGL/Three texture; draw-element fast capture — MISSING
  - says: (eng; flag logic vendored). Browser-version fragile
  - approach: defer; opt-in later. UNVERIFIED on Playwright's headless shell
- `hyperframes:A21` — Interactive slideshow (manifest, fragments, branches, hotspots, presenter view, deck audio), `present`/`play` — MISSING
  - says: Output is a live deck, not an MP4
  - approach: defer: out of the video scope; record as "not planned" unless owner wants decks
- `hyperframes:B9` — Map readiness: Leaflet, MapLibre, Mapbox GL, Google Maps (wait for load/tiles) — MISSING
  - says: Tiles need network, Mapbox/Google need keys: conflicts with offline core
  - approach: skip live maps; the 7 d3/topojson map blocks (us-map*, world-map...) cover offline data maps (E7)
- `hyperframes:K4` — `SDK` (`openComposition`, `find`, text/style/timing/asset/variable/animation edits, JSON patches, undo/redo, memory/fs/headless adapters, o… — MISSING
  - says: only useful for HF-native HTML
  - approach: skip unless H4 is done
- `hyperframes:K5` — `parsers`: HTML parse/serialise, GSAP AST read/write (acorn, recast), `hf-id` stamping, spring-ease generator — PARTIAL
  - says: (vendored, unused). Reelwright has its own `KIT.spring`
  - approach: n/a
- `hyperframes:K6` — `inspector` package (source maps, CSS/JS scope analysis for the studio picker) — MISSING
  - says: not needed without H2
  - approach: skip

### Remotion + its skills (9)

- `remotion:2.1.15` — Premounting (`premountFor`), `SequenceActivityBudget` — N/A
  - says: (pure `render(t)` has no mount cost)
  - approach: none
- `remotion:2.1.20` — `<Folder>`, `<Still>`, many `<Composition>` per project, `id` selection — PARTIAL
  - says: one film per project folder
  - approach: none (project folders are our unit)
- `remotion:2.3.12` — Greenscreen via `colorKey()`; video matting (`@remotion/video-matting`, local WebGPU model) — MISSING
  - approach: [N] ffmpeg `chromakey`/`colorkey` in a footage pre-pass (S); AI matting = skip (model download, GPU)
- `remotion:2.4.10` — `@remotion/media-parser`, `@remotion/webcodecs` (convert/crop/resize/transcribe in browser), Remotion Convert — N/A
  - says: (ffmpeg does this)
  - approach: none
- `remotion:2.5.8` — `@remotion/animated-emoji` (Noto animated emoji) — MISSING
  - approach: skip (CC BY 4.0 needs attribution; Lottie covers it if wanted)
- `remotion:2.5.9` — `@remotion/mac-cursors` (macOS cursor set) — PARTIAL
  - says: drawn `K.cursor`
  - approach: skip (Remotion Licence)
- `remotion:2.7.11` — Env/config: `remotion.config.ts` (`Config.set*`), `--env-file`, `--log`, `--timeout`, `--bundle-cache`, `--public-dir`, `--port` — N/A
  - approach: none
- `remotion:2.7.13` — Media cache sizes: `--media-cache-size-in-bytes`, `--offthreadvideo-cache-size-in-bytes`, `--offthreadvideo-video-threads` — N/A
  - approach: none
- `remotion:2.8.5` — Studio export to OpenTimelineIO; Editor Starter ($600) and Timeline (paid) editors; Recorder template; Elements catalog (copy-in components) — N/A
  - approach: skip; paid or product-specific

### anidoodle, video-shotcraft, motion-design-skill, GSAP, Lottie (6)

- `doodle-shots-motion:1.18` — 32 art styles (pencil, watercolour, woodcut, rubber hose, sumi-e, toy brick, ...) — PARTIAL
  - says: (10g: 6 pen styles in `D.styles`: pencil, riso, marker, ballpoint, chalk, blueprint; full style plates not ported by design)
  - approach: do not port 32 (each is hundreds of canvas lines). Port the cheap ones as theme+filter variants over D.ribbon: pencil, marker, chalkboard, blueprint, ballpoint (L for 5). Others: docs 'bring your own…
- `doodle-shots-motion:1.38` — Isometric / low-poly / halftone / stipple render styles — MISSING
  - approach: skip (style plates); halftone/dither exist as HF catalog ordered-dither-pass, halftone-dissolve
- `doodle-shots-motion:1.39` — Photo -> marks (tone + direction fields from a user photo) — MISSING
  - approach: skip: needs per-style mark engines
- `doodle-shots-motion:1.42` — Character consistency across shots/styles — MISSING
  - approach: skip (needs character rigs)
- `doodle-shots-motion:1.44` — Optional recorded-instrument sound pack (piano, harp, marimba... 373 MB, hash-pinned download) — MISSING
  - approach: do NOT bundle; at most an opt-in `reelwright setup --sound-pack` fetcher. NOTICE says CC0 samples + CC BY 4.0 impulse responses (attribution required)
- `doodle-shots-motion:3.15` — Accessibility / reduced motion / performance / context adaptation — N/A
  - says: mp4 output; photosensitivity flash gate exists (qa.py)
  - approach: none needed

## 9. Not applicable by design (N/A, UNVERIFIED, DIFFERENT) (9)

Rows the audit marks n/a, UNVERIFIED or DIFFERENT. Not a gap in the usual sense; the owner confirms they can be dropped from the checklist (or, for UNVERIFIED, tested).

By source: remotion 5, manim 2, doodle-shots-motion 2

### Remotion + its skills (5)

- `remotion:2.4.16` — Arabic/RTL text rules (direction, animate by word, keep letters joined) — UNVERIFIED
  - says: (not tested in Reelwright)
  - approach: [D] PLAYBOOK note + add an Arabic/Hebrew test film frame
- `remotion:2.6.10` — Canvas capture, `@remotion/svg-3d-engine`, `@remotion/preload`, `@remotion/enable-scss`, `@remotion/tailwind(-v4)`, `@remotion/babel-loader… — N/A
  - approach: Tailwind: `animate-*`/`transition-*` forbidden (skills `tailwind.md`), same as our seekable lint
- `remotion:2.7.16` — `@remotion/renderer` Node API (`renderMedia`, `renderFrames`, `renderStill`, `selectComposition`, `getCompositions`, `stitchFramesToVideo`,… — N/A
  - approach: [R] bridge can call the CLI (simplest) or the API; API (`renderFrames` + own ffmpeg) is what Remotion calls "custom workflow": it sends no telemetry automatically
- `remotion:2.7.17` — Bundler / site: `npx remotion bundle`, `serveUrl` reuse across renders — N/A
  - approach: [R] bundle once, reuse for stills and frames
- `remotion:2.8.7` — `npx create-video`, `npx remotion add <pkg>` (installs the exact matching version), `npx remotion upgrade`, `versions` — N/A
  - approach: [R] scaffold pins every `@remotion/*` to one exact version (a mismatch errors)

### Manim CE + ManimGL + manim skills (2)

- `manim:m1.7` — `Wait` with `stop_condition`, `wait_until` — N/A
  - says: by design (data-driven timing; stop conditions are time-dependent state)
  - approach: docs: use `W()`/`V()`
- `manim:m11.4` — Landmines: LaTeX probe (binary present != pipeline works), stale segment cache, HUD vanishes on push-in — N/A
  - approach: optional renderer `doctor` runs a 1-frame MathTex probe; own media dir per input hash with caching disabled

### anidoodle, video-shotcraft, motion-design-skill, GSAP, Lottie (2)

- `doodle-shots-motion:4.21` — MotionPathHelper (in-browser path editor) — N/A
  - approach: authoring aid for a human in a browser; do not bundle (and it is a visual animation-building tool: see Risks)
- `doodle-shots-motion:4.23` — EaselPlugin / PixiPlugin (canvas libraries) — N/A
  - approach: exclude

## 10. Not done, no stated reason (322)

PARTIAL / MISSING rows whose own text gives none of the reasons above.

**These 322 rows are the honest to-do list: not done, and the row gives no reason.** They are not proposed as exceptions; they are open work.

By source: hyperframes 62, remotion 50, manim 41, doodle-shots-motion 165, higgsfield-workflows 4

### HyperFrames (62)

#### Docs / PLAYBOOK note only (5)

- `hyperframes:A1` — Root contract: `data-composition-id`, `data-width/height/duration/fps`, `window.__timelines[id]` registry, `data-no-timeline` — PARTIAL
  - says: (eng). `hf/index.html` uses it; `tools/engine.js:435` registers one `main` shim whose `seek(t)` calls `render(t)`
  - approach: docs: say HF-native roots are allowed beside the KIT shim
- `hyperframes:A20` — Tailwind browser runtime `init --tailwind` (`__tailwindReady`) — MISSING
  - says: Uses a CDN script; breaks offline rule
  - approach: docs only: "compile Tailwind to CSS"
- `hyperframes:L1` — 9 agent skills (`hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use` core; `figma slideshow remotion-to-hyperframes revers… — PARTIAL
  - says: One skill `.claude/skills/product-video/SKILL.md` + AGENTS.md + PLAYBOOK
  - approach: docs: split the product-video skill into references; add registry/CLI skills when the new commands land
- `hyperframes:L2` — Workflow guides: product launch, faceless explainer, PR to video, music/lyric video, captions and recuts, avatar presenter (HeyGen: OUT), p… — PARTIAL
  - says: PLAYBOOK + `from-url`; no PR-to-video or lyric-video recipe
  - approach: docs: add 3 recipes (PR to video via `gh api`, lyric video, faceless explainer)
- `hyperframes:L4` — `prompting/` cookbook (color grading, data and maps, design systems, motion, recreating references, editing existing videos) — PARTIAL
  - approach: docs only

#### Native code to add in tools/ (or a flag/command) (41)

- `hyperframes:A2` — Timed clips: `data-start`, `data-duration`, `data-track-index`, `class="clip"`; visibility keyed off `data-start`; tracks are display only,… — PARTIAL
  - says: (eng). Reelwright draws everything from `render(t)`; PLAYBOOK "HyperFrames films" forbids times in `data-start`
  - approach: native: `KIT.clip(el,{start,end})` that stamps `data-start/duration` from `W()/V()/snap()` at load, so HF tooling and blocks see real attributes
- `hyperframes:A5` — Composition variables: `data-composition-variables` (string number color boolean enum font image), `getVariables()`, `data-var-text/src`, C… — MISSING
  - says: (eng). No parameterised films; `--lang/--style` only
  - approach: native: `project.json "variables"` read by `KIT.vars`; `--variables`/`--variables-file` flags
- `hyperframes:A6` — Batch render: one output per variables row (`--batch rows.json`, `--batch-concurrency`, `--batch-fail-fast`, JSON result) — MISSING
  - says: `beats import` already parses CSV
  - approach: native: `reelwright batch <project> rows.csv` loops `film` per row with variables A5
- `hyperframes:A19` — Text-fit helpers `__hyperframes.fitTextFontSize`, `pretext` measure (no reflow) — MISSING
  - says: Layouts size by `--kit-u`; QA flags caption overflow
  - approach: native `KIT.fit(text,{font,maxWidth})` using canvas `measureText`
- `hyperframes:D1` — Audio FX rack per clip: 16 effects (highpass lowpass peaking lowshelf highshelf gain compressor limiter truepeak gate saturate bitcrush del… — MISSING
  - says: (eng). `tools/mix.py` has gain/duck/loudnorm only
  - approach: native: map each effect to an ffmpeg filter (highpass, lowpass, equalizer, bass/treble, volume, acompressor, alimiter, agate, asoftclip, acrusher, aecho, chorus, aphaser, rubberband) in `mix.py` / pr…
- `hyperframes:D2` — 22 presets (voice-clean, voice-broadcast, voice-warm, rumble-cut, room-gate, boom-tame, harsh-tame, telephone, radio-am, megaphone, lofi-ta… — MISSING
  - approach: native presets table on D1
- `hyperframes:D3` — Automation lanes (`data-automation`: volume, FX params, sample-accurate), clip fades, volume above 1 — PARTIAL
  - says: Ducking envelope only
  - approach: native on D1/A8
- `hyperframes:D4` — Voiceover carve (`data-fx-carve`): EQ-notch the music under named voice tracks — PARTIAL
  - says: Reelwright ducks (gain) rather than carving; both reach the goal
  - approach: native: ffmpeg `sidechaincompress` + speech-band `equalizer` on the bed
- `hyperframes:D5` — Groups, mute, master bus FX on the root (`data-audio-group`) — MISSING
  - approach: native `buses` in project.json
- `hyperframes:D6` — Beat detection `beats` (writes `.hyperframes/beats`, BPM, beat times) and `audio` analysis (onsets, sections, rhythm, `--place-at`, `--at`,… — PARTIAL (mixed)
  - says: for beats. `tools/beatgrid.py` measures real tempo, bars and finds the drop, `KIT.snap`; PARTIAL for onset/section reports
  - approach: native: `reelwright audio <file>` printing onsets/sections from the same numpy code
- `hyperframes:D7` — `normalize-audio` (EBU R128 match to a reference clip) — PARTIAL (mixed)
  - says: for the film (loudnorm to -14 LUFS in `mix.py`); MISSING per-clip match
  - approach: native flag on A8 clips
- `hyperframes:D8` — True-peak limiter (4x oversample, lookahead) — PARTIAL
  - says: (loudnorm has `tp=`)
  - approach: ffmpeg `alimiter` after loudnorm
- `hyperframes:D9` — Local TTS `tts` (Kokoro-82M ONNX, 9 language groups, speed) — PARTIAL
  - says: `tools/vo.py` uses edge-tts (online, MS voices, gives word times). Kokoro would make the core fully offline but gives no word times
  - approach: native: `vo` provider `kokoro` (model downloaded once, opt-in), word times from D10 alignment
- `hyperframes:D11` — `media-use resolve`: asset resolver with reuse cache (`.media/`, `~/.media`), types bgm sfx image icon logo voice video brand grade lut; Op… — PARTIAL
  - says: Synthesised SFX/music (`mix.py`, `music.py`), `gen` connector (paid, Higgsfield)
  - approach: native `reelwright asset` with a content-hash cache; offline SFX = keep synth; Openverse as opt-in HTTP; skip HeyGen types (OUT)
- `hyperframes:E2` — Asset-bearing components (9) — PARTIAL
  - says: `add` refuses them (VENDORED.md)
  - approach: copy `assets/` too; licences per CREDITS.md
- `hyperframes:E5` — 8 `examples` registry items (decision-tree, kinetic-type, nyt-graph, play-mode, product-promo, swiss-grid, vignelli, warm-grain) + `init --… — PARTIAL
  - says: Themes part BETTER since 10c: the 3 upstream packs are `themes/hf-{bold,editorial,neutral}.css` (27 themes in all, see E10); still no full multi-scene sample projects of these styles
  - approach: port the 8 as `reelwright new --example` starters
- `hyperframes:E6` — `catalog` listing / search by `--type`, `--tag`, `--json`; picker; `add` by tag (`add captions`) — PARTIAL
  - says: `add <component>` only; CATALOG.md read by hand
  - approach: native: `reelwright catalog [--tag]` over registry.json; `add` accepts tags
- `hyperframes:E9` — Registry item schema (`registry-item.json`: params, variables, controls, preview, license, stability), `registry.json` — PARTIAL
  - says: (reads `registry-item.json` in `add`)
  - approach: validate with the schema in CI
- `hyperframes:F2` — Caption lint: overflow, container-relative position, fit-text scale, shadow on group, hard-kill exit, transcript not inline — PARTIAL
  - says: `qa.py` caption overflow + contrast gates; the six caption rules that can fire on a Reelwright page (not the Studio-only `caption_transcript_not_inline`) run in `hf-lint` ([qa-lint](../playbook/qa-lint.md)), but only on…
  - approach: port as WARN checks
- `hyperframes:F3` — Caption editing in Studio (click a word, restyle, retime) — MISSING
  - approach: native studio panel (see H)
- `hyperframes:G1` — `init` (examples, `--resolution` presets, `--video/--audio` with auto-transcribe + H.264 conversion, `--tailwind`, writes AGENTS.md/CLAUDE.… — PARTIAL
  - says: `new <name> [--renderer]`
  - approach: add `new --video/--audio` once A7/D10 exist
- `hyperframes:G3` — `capture <url>`: scroll screenshots (default 21, full-page plate), HTML/CSS, visible text, design tokens, fonts downloaded to `assets/fonts… — PARTIAL
  - says: `tools/capture_site.mjs`, `from-url`, `theme-from`: sections, full page, images, text, headings, colours, fonts; read-only
  - approach: native: add font download, SVG, animation metadata, loopback `--local-file`, SSRF policy (reject private IPs)
- `hyperframes:G4` — `lint`, `check`, `validate`/`inspect`/`layout` (deprecated): 143 documented lint rules (structure 6, composition contract 27, CSS/scripts 2… — PARTIAL
  - says: 10m: `tools/checks/hf-lint*.page.mjs` run the vendored `@hyperframes/lint` on every hyperframes film (96 of its 140 rule codes; 44 skipped because they contradict Reelwright's model, 5 errors kept as warnings; fixture `…
  - approach: ~~wire `lintProject()` into `qa` for hf projects (S)~~ done in 10m; vendor the four in-page audit scripts for layout/occlusion/contrast into `qa_page.mjs` (M)
- `hyperframes:G5` — `snapshot` (frames at `--at`, `--frames N`, `--zoom selector`, `--against ref.mp4`, held video frames) — PARTIAL (mixed)
  - says: (`stills`, contact sheet). PARTIAL for `--zoom`/`--against`
  - approach: native `stills --zoom` crop; `--against` = G9 diff
- `hyperframes:G6` — `keyframes` (list detected GSAP/CSS/anime keyframes; onion-skin PNG of one element) — MISSING
  - says: (no tween introspection in `render(t)`)
  - approach: native onion skin: render N frames of one selector with ghosting; low value
- `hyperframes:G7` — `compare` N variants into one labelled PNG; `grade-compare` — PARTIAL
  - says: `remix` (3 themes x 3 formats sheet)
  - approach: native `compare <dirA> <dirB> --at`
- `hyperframes:G8` — `timeline` (list tracks/clips; move/trim/split/delete/set/duplicate/apply with `--plan` diff, receipts, `undo`) and `history` (who/label/fi… — MISSING
  - says: Source of truth is `project.json` + `film.js`; git gives history
  - approach: native: `reelwright lines/beats` edit verbs with `--plan`, undo from a receipt; studio panel (H)
- `hyperframes:G9` — `reverse` / `measure` (probe, cuts, frames, face) / `diff` (SSIM per frame vs original video, missed/extra cuts, audio offset, non-zero exi… — MISSING
  - says: `verify` compares Reelwright's own frames only. `reverse start` is HeyGen-session based (OUT)
  - approach: native `measure cuts/probe` (ffmpeg scene detect + ffprobe) and `diff` (ffmpeg `ssim`), S each
- `hyperframes:G10` — `render` (see section I) and `benchmark` (tries fps/quality/workers, reports time and size) — PARTIAL
  - says: / MISSING
  - approach: native `benchmark` loops `frames` for a sample range
- `hyperframes:G13` — `doctor` (Node, FFmpeg, Chrome, Docker, GPU, cache dir, version), `browser ensure/path/clear`, `clean`, `info`, `compositions`, `docs <topi… — PARTIAL
  - says: `setup`, `clean`, `info`; PLAYBOOK for docs
  - approach: native `reelwright doctor` that prints the same checks plus codecs available
- `hyperframes:G15` — `--json` envelope on every command, `_meta` version/update notice, exit codes 0/1/2, "did you mean" — PARTIAL
  - says: (no global `--json`)
  - approach: native: `--json` for `stills`, `qa`, `info`, `sched` first
- `hyperframes:G16` — `figma asset/tokens/component` (REST: SVG/PNG/JPG/PDF assets frozen under `.media/`, variables to brand tokens, frame to editable HTML) + F… — PARTIAL
  - says: `tools/figma_export.py` exports section frames as PNG only
  - approach: native: SVG/PDF export + variables to `brand.json`; component-to-HTML is a large step (L)
- `hyperframes:H2` — Edits source-backed DOM: click element in preview, Design panel (Text, Layout, Style, Media, Motion, Effects, Grade, 3D transform), canvas… — MISSING
  - says: (10k covers the data Reelwright stores, not the DOM: no click-to-edit in the frame)
  - approach: native editor edits what Reelwright actually stores (script lines, gaps, theme, layout, format)
- `hyperframes:H3` — Timeline: tracks, move/trim/split/ripple/linked selection/snapping/beat markers/range select; waveform and meters; nested-composition drill… — PARTIAL
  - says: (10k). Timeline of scenes, VO lines, beat/bar grid with drop and SFX cues read from the film's `FILM`; click/drag seek, space/arrows/shift keys; edit a line's text and gap in the inspector (saved, `sched` re-run, page r…
  - approach: native timeline of VO lines, SFX cues, music grid, drop, captions (read from `timeline.json`), drag a gap to edit `project.json`
- `hyperframes:H5` — Right-panel tools: Audio FX rack with presets, Blur (motion blur) tab, Variables, Slideshow, Renders panel (format/resolution/fps/quality/G… — PARTIAL
  - says: (10k). Inspector (text, gap, style, title, fps), raw project.json and brand.json editors, stills at the playhead and contact sheet, taste and embed buttons, job log. No renders queue, lint panel, assets, undo
  - approach: native panels, in priority order: renders queue, QA/lint, script/VO lines, stills sheet
- `hyperframes:I4` — Quality: `draft`, `looks` (CRF 16), `standard`, `high`/`delivery`; `--crf`, `--video-bitrate`, `--max-bitrate`, `--buffer-size`, `--keyfram… — PARTIAL
  - says: Fixed x264 slow profile; `output.crf` (mp4/webm) since 10a; no bitrate/keyframe flags
  - approach: native flags mapping to ffmpeg args
- `hyperframes:I5` — Resolution presets and 4K supersampling (`--resolution 4k/portrait-4k/square-4k` via `deviceScaleFactor`, aspect must match) — PARTIAL
  - says: width/height from project.json or `--formats` (re-layout, not supersample)
  - approach: native: `--scale 2` sets Playwright `deviceScaleFactor` (pvk) / `resolution` option (hf)
- `hyperframes:I8` — Workers `--workers` 1-24 (auto by cores/memory/frames), `--low-memory-mode`, Chrome per worker ~256 MB — PARTIAL
  - says: `PAGES=N` (default 4), no auto-tuning
  - approach: native: default = min(cores/2, RAM/512 MB)
- `hyperframes:I10` — Streaming encode (no raw frames on disk), segmented capture + `--resume`, partial `--start/--end` render — PARTIAL
  - says: Frames on disk with a frame cache (pvk re-renders only changed frames: BETTER for iteration); hf always re-renders everything
  - approach: native: let hf reuse `.cache/frames` by content hash; `frames <from>-<to>`
- `hyperframes:I13` — Timeouts and safety: browser/player-ready/protocol timeouts, `--strict`, `--best-effort`, render lock queue, preflight disk estimate — PARTIAL
  - says: (hf path inherits producer defaults)
  - approach: expose `--strict` = fail on lint/QA warnings
- `hyperframes:K2` — `init --video` converts non-web codecs to H.264, preview proxies for HEVC/ProRes — MISSING
  - says: (needs A7)
  - approach: ffmpeg transcode on import

#### Vendor a library (2)

- `hyperframes:B5` — Lottie / dotLottie (`window.__hfLottie`, `goToAndStop`) — PARTIAL
  - says: →EQUAL for shapes (10b): lottie-web 5.13.0 bundled in vendor/lottie/, `KIT.lottie(el, json, {t0, speed, loop, renderer})`, SVG + canvas verified; masks, mattes, gradients, text, images, expressions and dotLottie still u…
  - approach: vendor lib: `lottie-web` (+ `@lottiefiles/dotlottie-web`) bundled; seek test for masks/text/images; `K.lottie(anim)`
- `hyperframes:B8` — d3 transitions readiness (`__hfD3`) — MISSING
  - approach: vendor lib `d3` (ISC) + `d3-delaunay`; call `.tick`/pure scales from `render(t)`, no transitions

#### Points at another row (7)

- `hyperframes:C2` — Transition catalog: 14 `transitions-*` showcase blocks (3d, blur, cover, destruction, dissolve, distortion, grid, light, mechanical, push,… — PARTIAL
  - says: Components `directional-wipe`, `colorama-wipe`, `iris-reveal`, `curtain-reveal`, `zoom-through-transition`, `whip-pan-cut`... are in the vendored 238
  - approach: E-row import of the blocks after CDN rewrite
- `hyperframes:E4` — Block categories to cover: transitions (33 tagged), overlays (31), backgrounds (30), carousels (26 `carousel-*`), 3D (20), lower thirds (13… — PARTIAL
  - says: (10f): every category has supported blocks (maps: 3 of 8, E7); see CATALOG.md tags
  - approach: follows E3
- `hyperframes:E8` — Caption-style components (16, tag `caption-style`) + 1 caption block; fed by a transcript — PARTIAL
  - says: In the vendored set but need `transcript.json` (D10); Reelwright has its own karaoke captions from VO words
  - approach: link to D10; add a `captions` adapter that writes `transcript.json` from `timeline.json` words
- `hyperframes:F4` — `caption-zone` and `frame-check` gates — PARTIAL
  - says: (safe-area via `KIT.safe`)
  - approach: see G4
- `hyperframes:G2` — `add`, `catalog` — PARTIAL
  - approach: see E6
- `hyperframes:G11` — `preview` (hot reload, background/foreground/status/list, port) — PARTIAL
  - says: `preview` scrubber on :4173 with SSE reload (`tools/preview.mjs`)
  - approach: see H
- `hyperframes:H1` — What it is: `npx hyperframes preview` serves the React 19 app `@hyperframes/studio` (167k lines TS/TSX, 977 files, Vite + Bun build) on the… — PARTIAL
  - says: (10k). `reelwright studio` (`tools/studio/`, `tools/commands/studio.mjs`): a plain-JS local server on 127.0.0.1 (Host and Origin checked, writes only project.json/brand.json) with the vendored player; no React/Vite buil…
  - approach: see H-verdict below

#### Other (read the approach text) (7)

- `hyperframes:D10` — `transcribe`: Whisper.cpp (tiny..large-v3) or Parakeet TDT 0.6B v3 (sherpa-onnx, 25 langs); imports whisper JSON, OpenAI JSON, SRT, VTT; ex… — MISSING
  - says: Word times only from edge-tts for its own lines
  - approach: opt-in download: python `faster-whisper` (MIT, CTranslate2) or `whisper.cpp`; Parakeet model is CC-BY-4.0 (needs attribution), runtime Apache-2.0
- `hyperframes:H4` — Keyframe animation panel (auto-record manual edits as keyframes, GSAP AST read/write via `@hyperframes/parsers`) — MISSING
  - says: (10k edits project.json and brand.json only; no GSAP/keyframe authoring by design: GSAP licence)
  - approach: only for hf-native comps (A2); not for `render(t)` films
- `hyperframes:I3` — fps: 1-240 or rational (`30000/1001`); root `data-fps` — PARTIAL
  - says: `FPS` env / project fps, integers, default 60
  - approach: accept rational, add `--fps` flag
- `hyperframes:I9` — GPU: `--gpu` hardware ffmpeg (NVENC, VideoToolbox, AMF, VAAPI, QSV), `--browser-gpu` — MISSING
  - says: Reelwright forces software GL for identical frames (BETTER for repeatability)
  - approach: opt-in `--gpu` encode flag only
- `hyperframes:I11` — Docker deterministic render (`--docker`) — MISSING
  - says: Determinism via software GL + `verify`; `docs/REPRODUCIBLE.md`
  - approach: optional `Dockerfile` for CI only
- `hyperframes:K1` — `remove-background`: `u2net_human_seg` ONNX (~168 MB, CoreML/CUDA/CPU), outputs webm-alpha / ProRes 4444 / PNG, `--background-output` plate… — MISSING
  - approach: opt-in download (model + `onnxruntime`), needs I2 for alpha output
- `hyperframes:K3` — Local generation: mflux images, LTX video (opt-in) — PARTIAL
  - says: (`gen` is paid Higgsfield, off by default)
  - approach: out of scope; keep `gen`

### Remotion + its skills (50)

#### Docs / PLAYBOOK note only (4)

- `remotion:2.6.5` — Spline/Figma/After Effects import — PARTIAL
  - says: `tools/figma_export.py` exports PNG
  - approach: [D] mention SVG paste for Figma
- `remotion:2.6.11` — Text rules in skills `video-layout.md`: 1080-wide minimums 84 px headline, 44 px supporting; safe area 80 px sides, 100 px top/bottom — PARTIAL
  - says: `KIT.safe`, qa tiny-text WARN
  - approach: [D] cite in PLAYBOOK as defaults (rewrite wording)
- `remotion:2.8.3` — Connected compositions / pre-compose a scene with its own timeline — MISSING
  - approach: [D] n/a
- `remotion:2.8.6` — AI helpers: Remotion Skills (this repo), plugins for Claude Code/Codex/Cursor/Copilot/Kimi, MCP, WebMCP, `remotion-docs` Algolia search — PARTIAL
  - says: `.claude/skills/product-video`, AGENTS.md
  - approach: [D] keep ours; the `.md` suffix trick for docs pages is handy for agents; note the docs skill embeds an Algolia key (data, not used)

#### Native code to add in tools/ (or a flag/command) (40)

- `remotion:2.1.2` — Extrapolation modes `extend`, `clamp`, `identity`, `wrap` (default `extend`) — PARTIAL
  - says: clamps only
  - approach: [N] add `{left,right}` modes to `K.keys`
- `remotion:2.1.3` — `output:'perceptual-scale'` — MISSING
  - says: (no grep hit)
  - approach: [N] area-space lerp, 1 line (Phase 9 item 3)
- `remotion:2.1.4` — `posterize` N (stepped look) — MISSING
  - approach: [N] `K.keys` option: sample every Nth frame (needs fps)
- `remotion:2.1.5` — `outputType` string outputs (`"20deg"`, `"0px 0px"`, transform-origin, font-weight) — MISSING
  - approach: [N] small `K.lerpStr` for CSS values with units; low priority
- `remotion:2.1.6` — `interpolateColors()` (rgb, hsl, oklab, easing option) — MISSING
  - says: (no colour lerp in engine.js)
  - approach: [N] oklab/rgb lerp helper (also needed by theme tokens)
- `remotion:2.1.9` — `random(seed)` deterministic PRNG (mulberry32 over string hash) — PARTIAL
  - says: doodle uses a seeded PRNG internally; no public `K.random`
  - approach: [N] expose `K.random(seed)` (seeded) and lint hint
- `remotion:2.1.10` — `<Sequence from trimBefore durationInFrames playbackRate loop freeze premountFor postmountFor layout name>` — PARTIAL
  - says: `K.local(t,from,dur,rate)` only
  - approach: [N] add `K.seq({from,trim,dur,rate,loop,freeze})` returning local time or null (Phase 9 item 4); [R] gives components
- `remotion:2.1.11` — `<Series>` / `Series.Sequence offset` — MISSING
  - approach: [N] `K.series([{dur,offset}])` returns start times; sums scene lengths
- `remotion:2.1.12` — `<Loop times durationInFrames>` / `useLoop()`; `loop` prop — PARTIAL
  - says: modulo by hand; no helper
  - approach: [N] `K.seq` `loop` covers it
- `remotion:2.1.13` — `<Freeze frame>` / `<Sequence freeze>` — PARTIAL
  - says: `K.keys` clamp holds a value; no whole-scene freeze
  - approach: [N] `K.seq` `freeze` (local time held)
- `remotion:2.1.21` — `@remotion/animation-utils` `interpolateStyles`, `makeTransform` — MISSING
  - approach: [N] `K.styles(t, keys)`: lerp whole style objects (needs unit parsing, see row above)
- `remotion:2.2.1` — `<TransitionSeries>` Sequence + Transition + Overlay; total = sum - overlaps; overlays do not shorten; `offset` — PARTIAL
  - says: (10e): `KIT.transition` with chains; scenes overlap by the transition window (no TransitionSeries length arithmetic) (`tools/transitions.js`); shuffled-seek fixture in `tools/selfcheck/motion/`, docs/playbook/motion.md
  - approach: [N] `K.transition(t, cut, dur, kind, dir)` -> `{enter, exit}` + overlap arithmetic in sched/film total; [R] free
- `remotion:2.2.2` — Timings `linearTiming`, `springTiming` (duration from spring settle; `getDurationInFrames({fps})`), custom timing — PARTIAL
  - says: `K.springDur` gives settle time
  - approach: [N] part of K.transition
- `remotion:2.2.10` — Starburst / `filmBurn` / `starburst()` effect, `@remotion/starburst` — MISSING
  - approach: [N] optional CSS conic burst; low value
- `remotion:2.3.2` — Colour and tone: brightness, contrast, saturation, hue, grayscale, invert, tint, duotone, vibrance, exposure, whiteBalance, shadowsHighligh… — MISSING
  - approach: [N] ffmpeg `curves`/`lut3d`/`eq` for footage in encode; CSS `filter` for DOM layers (Phase 9 item 11). [R] free GPU path
- `remotion:2.3.3` — Blur family: blur, lightTrail, linearProgressiveBlur, radialProgressiveBlur, regionBlur, zoomBlur, lensBlur — MISSING
  - approach: [N] CSS `filter: blur` + masks for the simple ones; rest [R]
- `remotion:2.3.4` — Lighting: dropShadow, longShadows, glow, shine, vignette — PARTIAL
  - says: (themes have shadows; no vignette/glow helper)
  - approach: [N] `KIT.fx.vignette/glow` as CSS
- `remotion:2.3.11` — Motion blur: `<HtmlInCanvasMotionBlur shutterAngle=180 samples=8>`; `<CameraMotionBlur samples=10>`; `<Trail layers lagInFrames trailOpacit… — MISSING
  - approach: [N] shutter model (verified from `CameraMotionBlur.tsx`: samples k=1..n at offsets `shutterAngle/360 * k/n` frames behind, each at opacity 1/n, additively blended): render N sub-frame times and avera…
- `remotion:2.4.1` — `<Video>` (@remotion/media; Mediabunny/WebCodecs; frame-perfect; trimBefore, durationInFrames, playbackRate, loop, volume curve, muted, obj… — PARTIAL
  - says: /EQUAL for screen takes: `K.clip` anchors (re-time recording to words, 0.4x-2.5x guard); no general footage layer API
  - approach: [N] `K.video(src, {trim, dur, rate})` for imported mp4s: pre-extract frames with ffmpeg (deterministic), seek by `<img>` index (same idea as OffthreadVideo); [R] free
- `remotion:2.4.4` — `<Audio>` trim (`trimBefore`, `durationInFrames`), delay (`from`), `volume` static or per-frame curve, `muted` toggle, `playbackRate` (no r… — PARTIAL
  - says: mix.py does voice + ducked music + SFX; `music.start` trims; no per-clip volume curves/pitch in film code
  - approach: [N] `K.audio(src,{from,trim,dur,vol:[[t,v]...],rate,loop})` -> mix.py layer with an envelope; pitch via ffmpeg `asetrate/atempo` or `rubberband` if present. In [R] mode Reelwright still mixes (render…
- `remotion:2.4.7` — Audio visualisation: `useWindowedAudioData`, `visualizeAudio` (FFT bins, numberOfSamples power of 2, bass = left), `visualizeAudioWaveform`… — PARTIAL
  - says: `KIT.pulse`/beats only (beatgrid.py); no continuous spectrum
  - approach: [N] build-time numpy FFT -> per-frame `bands` array in kit data, `K.level(t)`, `K.spectrum(t,n)` (Phase 9 item 7). Pure lookup
- `remotion:2.4.9` — Silence detection recipe (loudnorm `input_thresh` -> `silencedetect noise=..:d=0.5`; merge gaps <0.2 s); `getSilentParts()` in renderer — MISSING
  - approach: [N] `tools/silence.py` or in mix.py to trim VO/takes (Phase 9 item 8)
- `remotion:2.4.13` — Animated images `<AnimatedImage>` (GIF/APNG/WebP/AVIF, `playbackRate`, `loopBehavior` loop/pause-after-finish/clear-after-finish, fit) and… — MISSING
  - says: (no GIF layer)
  - approach: [N] decode GIF/APNG to PNG frames with ffmpeg at build, show frame by index from `render(t)`; honour loop behaviours. [R] free
- `remotion:2.4.14` — Cropping `cropLeft/Right/Top/Bottom` ratios on any layer — PARTIAL
  - says: (CSS clip-path by hand)
  - approach: [N] `K.crop(el,{l,r,t,b})`
- `remotion:2.4.17` — `@remotion/layout-utils`: `measureText`, `fitText`, `fitTextOnNLines`, `fillTextBox` (overflow check); `measureDomNodes` — PARTIAL
  - says: qa gates caption fit/contrast and overlap/tiny-text WARNs, no authoring-time `fitText`
  - approach: [N] `K.fit(el, {w,h,maxLines})` binary search on font-size using DOM measure
- `remotion:2.4.18` — `@remotion/rounded-text-box` (rounded highlight box behind multi-line text) — MISSING
  - approach: [N] optional SVG path builder; low value
- `remotion:2.5.1` — `Caption` JSON type `{text, startMs, endMs, timestampMs, confidence, pageBreakAfter?}`; whitespace-sensitive (leading space per word) — PARTIAL
  - says: our VO words `{w,t,d}` in seconds
  - approach: [N] export/import adapter `toCaptions()/fromCaptions()` so tools can share data
- `remotion:2.5.5` — Transcribe: `@remotion/whisper-webgpu` (WebGPU, Node/browser, Transformers.js), `whisper-web`, `install-whisper-cpp` (whisper.cpp), `openai… — MISSING
  - says: (we only have TTS word times; no speech-to-text for supplied audio/video)
  - approach: [N] optional `reelwright transcribe <audio>` via whisper.cpp or faster-whisper (local, offline after model download, opt-in); needs maintainers' call on model size
- `remotion:2.5.7` — Text highlights `@remotion/rough-notation` (Highlight, Circle, Underline, StrikeThrough, CrossedOff, Box, Bracket; `progress` prop; roughjs) — PARTIAL
  - says: doodle underline/circle/drawOn (tools/doodle.js); no highlight/strike/crossed-off/box/bracket
  - approach: [N] extend `KIT.doodle` with highlight, strike, crossed, box, bracket (Phase 9 item 9)
- `remotion:2.6.6` — `@remotion/shapes`: components (Rect, Circle, Ellipse, Triangle, Star, Polygon, Pie, Heart, Arrow, Callout, Spark) + `makeX()` returning `{… — MISSING
  - says: (math.js draws axes/plots only)
  - approach: [N] port the `make*` functions into `tools/shapes.js` (`KIT.shape.*`); [R] free
- `remotion:2.6.8` — `@remotion/noise` `noise2D/3D/4D(seed,x,y,z,w)` (simplex-noise 4.0.1 + seed) — MISSING
  - says: (only music.py uses numpy noise)
  - approach: [N] add `KIT.noise2/3` by depending on `simplex-noise` (MIT, npm) or a 30-line seeded simplex
- `remotion:2.7.1` — Codecs `h264` (default), `h265`, `vp8`, `vp9`, `av1`, `prores` (profiles proxy..4444 XQ), `gif`, audio-only `mp3/aac/wav`, image sequence `… — PARTIAL
  - says: encode = H.264 + AAC mp4 only
  - approach: [N] `--codec h265/vp9/av1/prores/gif` presets in `encode()` (ffmpeg flags; no Remotion needed) and `project.json` `"codec"`
- `remotion:2.7.2` — Quality knobs: `--crf`, `--video-bitrate`, `--max-rate`, `--buffer-size`, `--x264-preset`, `--gop`, `--jpeg-quality`, `--pixel-format`, `--… — PARTIAL
  - says: fixed ffmpeg args
  - approach: [N] expose crf/preset/bitrate/pix_fmt/colorspace in project.json -> `encode()`
- `remotion:2.7.3` — Hardware-accelerated encode (`--hardware-acceleration`, VideoToolbox / NVENC) — MISSING
  - approach: [N] optional `"hwaccel": true` -> `h264_videotoolbox`/`h264_nvenc` with fallback
- `remotion:2.7.4` — Transparent video: ProRes 4444 (`--image-format=png --pixel-format=yuva444p10le --codec=prores --prores-profile=4444`, .mov) and VP9/VP8 We… — MISSING
  - approach: [N] pvk/HF screenshots with `omit_background`/transparent page background -> PNG -> `encode()` with alpha codec. Needs HF/pvk transparent screenshot (UNVERIFIED for HF)
- `remotion:2.7.5` — Frame range `--frames 0-9`, `100-`, single, comma list (tested: `0,30,60` gives `element-00/30/60`); `--every-nth-frame`; `--duration` — PARTIAL
  - says: `stills t,t,...` and `frames [from] [to]`
  - approach: [N] nothing; pvk already has ranges; [R] used by stills
- `remotion:2.7.8` — Animated GIF render (`--codec=gif`, `--number-of-gif-loops`, `--every-nth-frame`) — PARTIAL
  - says: README samples are GIFs made outside the CLI
  - approach: [N] `reelwright gif` -> ffmpeg palettegen/paletteuse from frames
- `remotion:2.7.10` — Parameterised renders: `--props file.json|'{...}'` -> `getInputProps()`/component props; `defaultProps`; Zod `schema` (all Zod types, `zCol… — PARTIAL
  - says: `project.json` + `--lang/--style/--formats` only; no per-run props
  - approach: [N] `reelwright all --props data.json` -> merged into kit data `window.PROPS` and `KIT.props`; `batch <csv>` loops builds (S); schema validation = JSON Schema file `props.schema.json`. [R] free (Zod)
- `remotion:2.7.14` — HDR (not supported: headless Chrome), Rspack, `--repro` bundle, `--metadata key=value` into the mp4, `--license-key`, `--is-production` — PARTIAL
  - says: manifest.json has hashes, no mp4 metadata tags
  - approach: [N] write title/comment metadata via ffmpeg `-metadata` in encode (S). HDR = not supported (document)
- `remotion:2.8.4` — `<Player>` (`@remotion/player`): controls, loop, autoPlay, inFrame/outFrame, playbackRate, fullscreen, volume, poster, `renderCustomControl… — MISSING
  - says: (owner wants embeddable web player)
  - approach: [N] our own tiny player over `render(t)` (no Remotion): timeline slider + audio element (mix.wav) + pure render; Remotion's Player needs a React app and, for companies, makes you an "Automator" (Term…

#### Optional renderer path ([R]) (3)

- `remotion:2.3.5` — Distortion: barrelDistortion, chromaticAberration, cornerPin, fisheye, mirror, noiseDisplacement, wave, tile, skew, scale, translate, turbu… — PARTIAL
  - says: glitch RGB split exists in teaser; no general lib
  - approach: [R]; [N] chromatic aberration + wave as SVG filters
- `remotion:2.3.6` — Textures/patterns: burlap, checkerboard, contourLines, dotGrid, emboss, flannel, gridlines, halftone, lines, liquidContours, noise, fractal… — MISSING
  - approach: [R]; [N] scanlines, grain, dotGrid, halftone, paper as CSS/SVG layers (theme-friendly)
- `remotion:2.3.8` — Weather/reveal: snowFall, rainFall, irisWipe, radialWipe, evolve, pixelate, pixelDissolve, progressive pixelate, venetianBlinds — MISSING
  - approach: [R]; [N] wipes/pixel dissolve through `K.transition` masks

#### Other (read the approach text) (3)

- `remotion:2.4.2` — `<OffthreadVideo>` (Rust+FFmpeg exact frame as `<Img>`; `transparent`) — PARTIAL
  - says: same as 2.4.1
  - approach: same
- `remotion:2.6.9` — Maps: static map as image; Mapbox GL, MapLibre GL, MapTiler SDK + Turf, CesiumJS flyovers (Google 3D tiles needs billing key); render-stabi… — MISSING
  - approach: static map: [D] `<img>` already works. MapLibre route animation: optional [N] later (MapLibre BSD-3, but tiles need network/key: breaks offline-core, keep opt-in). Mapbox/Cesium/MapTiler/Google need…
- `remotion:2.8.1` — Remotion Studio (`npx remotion studio`): timeline, props sidebar (Cmd/Ctrl+J), canvas zoom, quick switcher, shortcuts, render-from-UI, WebM… — PARTIAL
  - says: `preview` scrubber (read-only, whole frames, waveform with VO/SFX/beats marked)
  - approach: owner wants a Reelwright studio editor: [N] build on preview.mjs (scrub + data panel + project.json edits); [R] gives Remotion Studio for free for `renderer: remotion` projects

### Manim CE + ManimGL + manim skills (41)

#### Docs / PLAYBOOK note only (2)

- `manim:m9.3` — `MultiCamera`, `SplitScreenCamera`, `MappingCamera` — PARTIAL
  - says: `KIT.layout.split` composes panels, no per-panel camera
  - approach: docs + `shoot()` per panel
- `manim:m12.2` — Interactive embed: `-se <line>`, `embed()`, `checkpoint_paste()`, `InteractiveScene` (select/drag mobjects, undo/redo, copy), hot reload `-… — PARTIAL
  - says: `preview` scrubber for the finished film, no live editing of Manim code
  - approach: docs: authors iterate with `-s`/`-n` stills on the GL side; studio editor (Phase 10) covers the native side

#### Native code to add in tools/ (or a flag/command) (31)

- `manim:m1.5` — Updaters (`add_updater`, `dt` form), `always_redraw`, `UpdateFromFunc`, `UpdateFromAlphaFunc`, `MaintainPositionRelativeTo`, GL `.always`/`… — PARTIAL (mixed)
  - says: for closed-form (recompute in `render(t)`); PARTIAL for dt-accumulating state (no stateful sims)
  - approach: native: `KIT.sim(step, state0, dt)` precomputes a fixed-step table at load, `.at(t)` interpolates
- `manim:m1.12` — Output formats mp4/gif/webm/mov/png/png-sequence; GL `-i` gif, `-t` alpha mov — PARTIAL
  - says: mp4 (+ README gif samples); alpha clips from an optional Manim scene via `reelwright manim` (10i, CE verified on macOS arm64)
  - approach: native: `encode --format webm|mov` alpha path from page screenshots (omit background)
- `manim:m3.1` — `Create` / GL `ShowCreation` (stroke draw-on), `Uncreate` — PARTIAL
  - says: `K.doodle.drawOn(el, p)` per path (doodle.js:57); no whole-group sequential draw
  - approach: native: `KIT.math.create(group, {lag})` over sub-paths
- `manim:m3.2` — `DrawBorderThenFill` — MISSING
  - approach: native (stroke draw-on then fill fade, same helper)
- `manim:m3.5` — `AddTextLetterByLetter`, `RemoveTextLetterByLetter`, `AddTextWordByWord`, `TypeWithCursor`, `UntypeWithCursor` — PARTIAL
  - says: `K.words` per VO word, HF catalog `caret-swap`/`bottom-up-letters`
  - approach: native: `KIT.type(el, {cps, cursor})` pure in t
- `manim:m4.3` — `Broadcast` (expanding rings) — MISSING
  - says: (HF catalog has confetti, not rings)
  - approach: native
- `manim:m5.5` — `PhaseFlow`, `MoveAlongPath` — PARTIAL (mixed)
  - says: for MoveAlongPath (`plot.pointAt`, HF `arc-motion-path`); PhaseFlow MISSING
  - approach: native `KIT.sim` + `flow()`
- `manim:m5.8` — `TracedPath`, `AnimatedBoundary`, GL `TracingTail` — PARTIAL
  - says: `plot.pointAt` + manual trail
  - approach: native: `KIT.math.trace(fn, {tail, fade})`
- `manim:m6.1` — `Circle`, `Dot`, `Ellipse`, `Arc`, `ArcBetweenPoints`, `TangentialArc`, `Annulus`, `Sector`, `AnnularSector`, `CubicBezier`, GL `SmallDot` — PARTIAL
  - says: (10h): `KIT.math.shape.*` + `KIT.math.mob`: circle, ellipse, arc, arcBetween, annulus, sector, annularSector, cubic; TangentialArc not built (`tools/math2.js`); shuffled-seek fixture in `tools/selfcheck/motion/`, docs/p…
  - approach: native: `KIT.math.shape.*` returning draw-on-ready SVG with theme tokens
- `manim:m6.3` — `Line`, `DashedLine`, `TangentLine`, `Elbow`, `Arrow`, `Vector`, `DoubleArrow`, `CurvedArrow`, `StrokeArrow`, `Angle`, `RightAngle`, tips (… — PARTIAL
  - says: (10h): line, dashed (`dash`), elbow, arrow tips (triangle/stealth/circle/square), double, curved, vector, angle, rightAngle; TangentLine is `KIT.math.tangent` (plot2.js) (`tools/math2.js`); shuffled-seek fixture in `too…
  - approach: native `shape.arrow/angle/tip`
- `manim:m6.8` — Colours: 130+ named constants (`BLUE_A..E`), `ManimColor`, `interpolate_color`, `color_gradient`, `set_color_by_gradient`, `set_sheen`, fil… — PARTIAL
  - says: theme tokens (`--kit-*`), CSS gradients; no palette constants
  - approach: native: `KIT.color.manim` palette table (facts, no code copied) + lerp; docs
- `manim:m6.9` — `SVGMobject`, `ImageMobject`, GL `VideoMobject`/`Sprite`, `PMobject`, `DotCloud`, `GlowDot(s)`, `TrueDot` — PARTIAL (mixed)
  - says: for SVG/images/video (`K.img`, `K.clip`, doodle.drawOn on inline SVG); point clouds/glow MISSING
  - approach: native: canvas/Three `Points` helper (M); video via K.clip
- `manim:m7.2` — `MathTex`/`Tex` (LaTeX), `substrings_to_isolate`, `tex_to_color_map`, `set_color_by_tex`, GL `Tex(isolate, t2c)`, `TexText` — PARTIAL
  - says: (10h): `KIT.tex` (MathJax) with `color(match, c)` = set_color_by_tex (key-sequence match; misses a substring that renders differently alone); KaTeX `KIT.math.equation` unchanged. No build-time `tools/commands/tex.mjs`:…
  - approach: native: `equation(tex, {colors: {'x': 'accent'}})` via `\htmlClass`/`\textcolor`; mhchem contrib from vendored KaTeX; real LaTeX = optional renderer
- `manim:m7.3` — `Typst`, `MathTypst` (+ `select` labels) — MISSING
  - approach: native option: Typst via `@myriaddreamin/typst-ts-node-compiler` at build time to SVG glyph paths (UNVERIFIED output ids); or inside the Manim renderer
- `manim:m7.5` — `Matrix`, `DecimalMatrix`, `IntegerMatrix`, `MobjectMatrix`, GL `TexMatrix` — PARTIAL
  - says: KaTeX `bmatrix` in `equation()` (PLAYBOOK Math), cell highlight/entry animation missing
  - approach: native: HTML grid + brackets, entry `Indicate`
- `manim:m7.6` — `Table`, `MathTable`, `IntegerTable`, `DecimalTable`, `MobjectTable` — PARTIAL
  - says: HTML tables by hand
  - approach: native `KIT.table`
- `manim:m7.7` — `Code` (syntax highlighting), GL `Code` — PARTIAL
  - says: HF `code-terminal-run`
  - approach: native: build-time highlight (shiki, MIT) to spans, line-by-line reveal
- `manim:m8.1` — `Axes` (ranges, lengths, tips, ticks, `axis_config`, `add_coordinates`, `get_axis_labels`, log `LogBase`/`LinearBase`), GL `Axes` — PARTIAL
  - says: `axes()` linear only, no tips/log/labels API, `c2p` only (math.js:102)
  - approach: native: extend `axes()` (tips, `scale:'log'`, `p2c`, axis labels)
- `manim:m8.2` — `NumberLine` (ticks, numbers, tip, `n2p`, `UnitInterval`, GL `Slider`) — PARTIAL
  - says: `numberLine()` basic (math.js:106)
  - approach: native extend (elongated ticks, labels at values, brackets)
- `manim:m8.7` — `BarChart`, `SampleSpace` — PARTIAL
  - says: HF catalog `animated-bar-chart`, `chart-story`
  - approach: native `KIT.math.bars` + brace/labels
- `manim:m8.8` — `Graph`/`DiGraph` (networkx layouts: spring, circular, tree, partite, kamada_kawai) — MISSING
  - approach: native: own layouts (circular/tree/grid) + vendor d3-force for spring
- `manim:m8.10` — `LinearTransformationScene`, `VectorScene` (basis vectors, matrix applied to grid, `add_vector`, `add_transformable_label`) — PARTIAL
  - says: (10h): `KIT.math.basis` + matrix warp on a plane; no matrix label or add_transformable_label (`tools/plot2.js`); shuffled-seek fixture in `tools/selfcheck/motion/`, docs/playbook/math2.md
  - approach: native: composed from `plane()`, `warp()`, `arrow()`
- `manim:m8.11` — GL fractals `MandelbrotFractal`, `JuliaFractal`, `NewtonFractal`, `MetaNewtonFractal`, `PlaneFractal` — MISSING
  - approach: native WebGL fragment shader (canvas, deterministic per frame) or GL renderer
- `manim:m9.2` — `ZoomedScene` (magnified inset, display frame) — MISSING
  - approach: native: `KIT.zoomInset(srcRect, dstRect)` second transformed copy of the stage layer
- `manim:m9.5` — `add_fixed_in_frame_mobjects`, `add_fixed_orientation_mobjects`, GL `fix_in_frame`, `FullScreenRectangle` — PARTIAL (mixed)
  - says: in 2D (HUD outside the cam layer, MC pin_to_frame covered); 3D MISSING
  - approach: native: DOM overlay above the WebGL canvas
- `manim:m9.8` — `Polyhedron`, `Tetrahedron`, `Octahedron`, `Icosahedron`, `Dodecahedron`, `ConvexHull3D` — PARTIAL
  - says: (10h): tetrahedron, octahedron, icosahedron, dodecahedron; no ConvexHull3D (`tools/math3d.js`); shuffled-seek fixture in `tools/selfcheck/motion/`, docs/playbook/math2.md
  - approach: native: Three.js `PolyhedronGeometry`; hull via three examples (UNVERIFIED path)
- `manim:m9.9` — Lighting (`light_source`), shading, `TexturedSurface`, `ThreeDModel` (.obj via pywavefront/trimesh) — PARTIAL
  - says: (10h): lights + MeshStandardMaterial shading; no textures or OBJ/GLTF models (`tools/math3d.js`); shuffled-seek fixture in `tools/selfcheck/motion/`, docs/playbook/math2.md
  - approach: native: Three.js lights, `TextureLoader`, OBJ/GLTF loader (loaders vendored if wanted)
- `manim:m11.3` — Pace lint (<= 2.5 words/s, gaps, >= 15 % unnarrated), dark-stretch lint — PARTIAL
  - says: real word times make RUSHED impossible; `dark` WARN exists (qa.py); unnarrated-fraction info line MISSING
  - approach: native: info line in qa.py
- `manim:m12.4` — `CameraFrame` as a Mobject (`.shift/.scale/.rotate`, `reorient`, `to_default_state`, `focus_on`), `ContinuousRotation` updaters — PARTIAL
  - says: (10h): 3D camera via `KIT.math3d` orient/ambient; 2D CameraFrame verbs stay `KIT.shot` (`tools/math3d.js`); shuffled-seek fixture in `tools/selfcheck/motion/`, docs/playbook/math2.md
  - approach: native: Three.js camera rig with the same verbs
- `manim:m12.7` — GL drawings: `Checkmark`, `Exmark`, `Lightbulb`, `Speedometer`, `Laptop`, `VideoIcon`, `Clock`/`ClockPassesTime`, `Bubble`/`SpeechBubble`/`… — PARTIAL
  - says: SVG icons by hand; `Checkmark/Exmark/SpeechBubble/Clock` trivial
  - approach: native: small icon set under KIT.math.icons (optional)
- `manim:m12.8` — GL `DotCloud`, `GlowDots`, `TrueDot` (shader points) and `Surface` shading/`Sphere` as shader surfaces — PARTIAL
  - says: (10h): `points` (additive glow sprites) = GlowDots/DotCloud; no TrueDot shader (`tools/math3d.js`); shuffled-seek fixture in `tools/selfcheck/motion/`, docs/playbook/math2.md
  - approach: native: Three `Points` + additive blending

#### Vendor a library (2)

- `manim:m5.1` — `Transform`, `ReplacementTransform`, `TransformFromCopy`, `ClockwiseTransform`/`CounterclockwiseTransform` (path_arc) — PARTIAL
  - says: (10h): glyph morphs (flubber) and path_arc in `KIT.tex.transform`; multi-path `KIT.math.morphShapes` (math2.js); arc moves the glyph centre without rotating it (`tools/tex.js`); shuffled-seek fixture in `tools/selfcheck…
  - approach: vendor flubber for multi-subpath + hole handling; native colour/width lerp; `path_arc` as arc interpolation of points
- `manim:m6.5` — Boolean ops `Union`, `Difference`, `Intersection`, `Exclusion` — MISSING
  - approach: vendor polygon-clipping (polygons) or own for convex; path-level via flubber sampling

#### Other (read the approach text) (6)

- `manim:m10.2` — TTS back-ends: Azure, ElevenLabs, gTTS, OpenAI, pyttsx3, Gemini, recorder, Whisper alignment, DeepL translate — PARTIAL
  - says: edge-tts only (vo.py); other TTS via docs/CONNECTORS.md style opt-in
  - approach: connector pattern (separate Phase 10 row); not Manim's job
- `manim:m11.2` — Layout lint OFF-FRAME / TEXT-OVERLAP / TINY-TEXT — PARTIAL (mixed)
  - says: for DOM; MISSING for Manim frames: `rw.label_illustrative()` marks scenes, `texts.json` lint not built (10i)
  - approach: optional renderer: scene exports `texts.json` (bbox, px size) and qa lints it (rewrite, MC has no licence)
- `manim:m12.1` — OpenGL/wgpu GPU renderer (shader-drawn strokes/fills, bundled draws) — MISSING
  - says: by nature (we are DOM/SVG); output quality comparable for 2D
  - approach: optional renderer (GL)
- `manim:m12.3` — Interactive controls `Slider`, `Button`, `Checkbox`, `ControlPanel`, `Textbox`, `MotionMobject`, `LinearNumberSlider` — MISSING
  - says: (not meaningful in a rendered film)
  - approach: out of scope; studio editor may expose params as sliders
- `manim:m12.5` — `Tex` pipeline: `latex` (or `xelatex`) -> DVI/XDV -> `dvisvgm` -> SVG, templates in tex_templates.yml (default, ctex, ~40 font presets), `d… — PARTIAL
  - says: (KaTeX, no packages)
  - approach: optional renderer (GL) needs real LaTeX + dvisvgm (TinyTeX list below)
- `manim:m13.4` — `verify` / manifest / `clean` / `qa` integration — PARTIAL
  - says: (10i): `reelwright manim <p> verify` checks clip hashes, frame counts and data.js; `all`/`verify`/manifest do not run Manim (shared files untouched); `clean` removes the rendered clips (.cache/) but not the shared insta…
  - approach: own code

### anidoodle, video-shotcraft, motion-design-skill, GSAP, Lottie (165)

#### Docs / PLAYBOOK note only (62)

- `doodle-shots-motion:1.15` — Lessons: step sheet + captioned timelapse, drawn-stroke captions — MISSING
  - approach: docs recipe on top of D.score + captions; low priority (teaching niche)
- `doodle-shots-motion:1.19` — Motion deck: 46 named moves with numbers (open/seam/cam/reveal/type/act/emph/close) + deal/find tool — PARTIAL
  - says: PLAYBOOK Motion + Camera grammar cover ~10 of them
  - approach: docs: 'Motion deck' table of the 46 names mapped to KIT calls; `reelwright shots` prints names (bin/reelwright.mjs has no `shots` command today)
- `doodle-shots-motion:1.30` — World: every beat a region on one canvas, one camera travels (anti slide-deck) — PARTIAL
  - says: cam3 over a frame-sized layer + shot.track
  - approach: docs 'One world' recipe + `KIT.world(regions)` placing regions in world coords (S)
- `doodle-shots-motion:1.41` — Brand import (Figma sheet, logos, inventory, check) — PARTIAL
  - says: brand.json, tools/figma_export.py, theme-from
  - approach: docs; S additions: logo inventory check
- `doodle-shots-motion:2.11` — before-after-slider-scrub [1 shot] — PARTIAL
  - says: cat: before-after-wipe, comparison-split
  - approach: R2 docs + recipe wrapper
- `doodle-shots-motion:2.17` — aurora-bloom-bg-flip [1 shot] — PARTIAL
  - says: cat: aurora-drift, mesh-gradient-bg
  - approach: R2 docs + bg flip recipe
- `doodle-shots-motion:2.19` — fui-hud-moves [1 shot] — PARTIAL
  - says: cat: telemetry-hud, camera-scan-gate
  - approach: R2 docs; reticle-lock-on recipe
- `doodle-shots-motion:2.21` — icon-performance-moves [1 shot] — PARTIAL
  - says: K.spring; cat: icon-morph-beat, spring-pop, badge-pop
  - approach: R2 docs recipe attention-bounce
- `doodle-shots-motion:2.23` — light-play-moves (spotlight-sweep, sheen-sweep) [2 shots] — PARTIAL
  - says: cat: light-sweep-pass, gloss-sweep, shimmer-sweep, spotlight-card
  - approach: R2 docs (spotlight-sweep, sheen-sweep)
- `doodle-shots-motion:2.26` — scan-bracket-sweep [1 shot] — PARTIAL
  - says: cat: scan-band, camera-scan-gate
  - approach: R2 docs
- `doodle-shots-motion:2.27` — scanline-annotate-focus [1 shot] — PARTIAL
  - says: cat: vox-annotate, cursor-annotate
  - approach: R2 docs
- `doodle-shots-motion:2.29` — slam-entrance-moves (kanada-perspective-snap, score-slam, impact-burst-kit) [3 shots] — PARTIAL
  - says: cat: headline-slam, caption-kinetic-slam, char-slam-explode, shutter-slam; K.shake
  - approach: R2 docs (kanada-perspective-snap, score-slam, impact-burst-kit missing)
- `doodle-shots-motion:2.34` — collab-cursor-moves [1 shot] — PARTIAL
  - says: cat: multiplayer-cursors, cursor-glyph-trail
  - approach: R2 docs (cast-ensemble)
- `doodle-shots-motion:2.35` — glass-pill-dictation-typing [1 shot] — PARTIAL
  - says: cat: typed-prompt, streaming-text
  - approach: R2 docs
- `doodle-shots-motion:2.37` — picker-carousel-feature-cycle [1 shot] — PARTIAL
  - says: cat: screen-flow-carousel, tabs-slide-indicator
  - approach: R2 docs
- `doodle-shots-motion:2.38` — segmented-thumb-hero [1 shot] — PARTIAL
  - says: cat: tabs-slide-indicator, settings-toggle-flow
  - approach: R2 docs
- `doodle-shots-motion:2.42` — brand-ink-open [1 shot] — PARTIAL
  - says: cat: ink-bleed-reveal, whiteboard-ink, logo-sting; KIT.doodle
  - approach: R2 docs
- `doodle-shots-motion:2.46` — icon-field-colorize [1 shot] — PARTIAL
  - says: cat: avatar-cloud, logo-wall
  - approach: R2 docs
- `doodle-shots-motion:2.47` — letterspace-materialize [1 shot] — PARTIAL
  - says: cat: tracking-in
  - approach: R2 docs
- `doodle-shots-motion:2.49` — orbit-ring-title-open [1 shot] — PARTIAL
  - says: cat: locked-nucleus-orbit, three-orbiting-cards
  - approach: R2 docs
- `doodle-shots-motion:2.51` — stroke-segment-build [1 shot] — PARTIAL
  - says: KIT.doodle.drawOn/schedule; cat: svg-stroke-trace, outline-draw
  - approach: R2 docs
- `doodle-shots-motion:2.52` — text-as-mask [1 shot] — PARTIAL
  - says: cat: texture-mask-text, svg-mask-reveal
  - approach: R2 docs
- `doodle-shots-motion:2.53` — grain-dissolve [1 shot] — PARTIAL
  - says: cat: grain-overlay, halftone-dissolve
  - approach: R2 docs
- `doodle-shots-motion:2.54` — logo-shrink-wordmark-lockup [1 shot] — PARTIAL
  - says: cat: logo-brand-close, titlecard-lockup, cta-lockup
  - approach: R2 docs
- `doodle-shots-motion:2.55` — neon-triple-marquee [1 shot] — PARTIAL
  - says: cat: perspective-marquee, caption-neon-glow
  - approach: R2 docs
- `doodle-shots-motion:2.64` — sakuga-timing-shift [1 shot] — PARTIAL
  - says: easing('steps(n)') and K.remap exist; cat: stop-motion-cadence
  - approach: R2 docs
- `doodle-shots-motion:2.68` — card-flip-reveal [1 shot] — PARTIAL
  - says: cat: toggle-flip, tilt-card
  - approach: R2 docs
- `doodle-shots-motion:2.71` — gradient-transition [1 shot] — PARTIAL
  - says: cat: colorama-wipe, fade-through
  - approach: R2 docs
- `doodle-shots-motion:2.72` — line-carry-transition [1 shot] — PARTIAL
  - says: cat: cut-the-curve, outline-draw
  - approach: R2 docs
- `doodle-shots-motion:2.73` — mosaic-reframe [1 shot] — PARTIAL
  - says: cat: grid-pixelate-wipe
  - approach: R2 docs
- `doodle-shots-motion:2.75` — print-texture-transitions [1 shot] — PARTIAL
  - says: cat: ink-bleed-reveal, torn-paper-rip, halftone-dissolve
  - approach: R2 docs
- `doodle-shots-motion:2.77` — tear-streak-transitions [1 shot] — PARTIAL
  - says: cat: rgb-glitch-text, chromatic-aberration-wipe, torn-paper-rip
  - approach: R2 docs
- `doodle-shots-motion:2.87` — glitch-cycle [1 shot] — PARTIAL
  - says: cat: rgb-glitch-text, caption-glitch-rgb
  - approach: R2 docs
- `doodle-shots-motion:2.88` — gradient-word-sweep [1 shot] — PARTIAL
  - says: cat: caption-gradient-fill, text-shimmer
  - approach: R2 docs
- `doodle-shots-motion:2.91` — outline-word-fill [1 shot] — PARTIAL
  - says: cat: stitched-text-draw, outline-draw
  - approach: R2 docs
- `doodle-shots-motion:2.92` — paper-title-card [1 shot] — PARTIAL
  - says: KIT.layout.fullBleed; cat: titlecard-calm
  - approach: R2 docs
- `doodle-shots-motion:2.93` — pill-chip-slot-cycle-handled [1 shot] — PARTIAL
  - says: cat: slot-machine-roll, state-chip-rail
  - approach: R2 docs
- `doodle-shots-motion:2.94` — pill-slot-cycle [1 shot] — PARTIAL
  - says: cat: slot-machine-roll
  - approach: R2 docs
- `doodle-shots-motion:2.99` — type-rhythm-sync (font-weight-pump, karaoke-fill-sync) [2 shots] — PARTIAL
  - says: K.subtitles karaoke; cat: caption-weight-shift, variable-font-flex, caption-pill-karaoke
  - approach: R2 docs (font-weight-pump)
- `doodle-shots-motion:2.101` — vertical-word-roll-blur-cycle [1 shot] — PARTIAL
  - says: cat: slot-machine-roll, kinetic-type-swap
  - approach: R2 docs
- `doodle-shots-motion:2.104` — avatar-bracket-carousel [1 shot] — PARTIAL
  - says: cat: avatar-cloud, avatar-group-hover
  - approach: R2 docs
- `doodle-shots-motion:2.106` — card-stack [1 shot] — PARTIAL
  - says: cat: spring-stack-shuffle; KIT.layout.bento
  - approach: R2 docs
- `doodle-shots-motion:2.108` — cloner-depth-echo [1 shot] — PARTIAL
  - says: cat: echo-trail, echo-smear, camera-rig-depth-stack
  - approach: R2 docs
- `doodle-shots-motion:2.113` — integration-hub-map [1 shot] — PARTIAL
  - says: cat: constellation-hub
  - approach: R2 docs
- `doodle-shots-motion:2.116` — neon-frame-forerun [1 shot] — PARTIAL
  - says: cat: caption-neon-glow, svg-stroke-trace
  - approach: R2 docs
- `doodle-shots-motion:2.117` — neon-frame-orbit-drop [1 shot] — PARTIAL
  - says: cat: caption-neon-glow, svg-stroke-trace
  - approach: R2 docs
- `doodle-shots-motion:2.118` — page-waterfall-wall [1 shot] — PARTIAL
  - says: cat: scroll-feed, parallax-device-dive
  - approach: R2 docs
- `doodle-shots-motion:2.119` — product-card-progressive-assemble [1 shot] — PARTIAL
  - says: KIT.layout.bento; cat: grid-card-assemble
  - approach: R2 docs
- `doodle-shots-motion:2.120` — radial-wave [1 shot] — PARTIAL
  - says: cat: radial-surround, press-ripple
  - approach: R2 docs
- `doodle-shots-motion:2.121` — research-card-stack-scroll [1 shot] — PARTIAL
  - says: cat: scroll-feed, spring-stack-shuffle
  - approach: R2 docs
- `doodle-shots-motion:2.123` — value-stagger-gradient [1 shot] — PARTIAL
  - says: K.stagger + K.count
  - approach: R2 docs
- `doodle-shots-motion:2b.7` — Ink Press: complete 36 s validated promo template (10 shots, replace screenshots/copy/logo) — PARTIAL
  - says: projects/example, teaser, website, dashboard samples; `from-url`
  - approach: docs: 'promo-energy-arc' project template (`reelwright new --template promo`) assembled from KIT.recipe.* (M). Do not copy template screenshots
- `doodle-shots-motion:2b.9` — Energy-arc sequence: low open -> single hero -> feature climb with breath cards -> peak group-photo outro; budget hold frames first — PARTIAL
  - says: PLAYBOOK Process has structure advice but no arc table
  - approach: docs section + `reelwright beats` arc validator (WARN if closing is not the loudest) S
- `doodle-shots-motion:2b.11` — Final independent review checklist (P/F/V/A/... items, clean-context reviewer) — PARTIAL
  - says: AGENTS.md step 3 'read stills/sheet.jpg yourself'
  - approach: docs: PLAYBOOK 'Review' checklist
- `doodle-shots-motion:3.1` — Pre-animation 8-step checklist, three pillars, three motion layers (primary / secondary / ambient) — PARTIAL
  - says: PLAYBOOK Motion rules (6 lines)
  - approach: docs: 1 paragraph + checklist in PLAYBOOK
- `doodle-shots-motion:3.4` — Material easing (rigid 1.2x/0%, elastic 0.8x/15-25%, fluid 1.5x/5%, paper 1.0x/3-5%, gas 2.0x, glass 0.9x) — MISSING
  - approach: docs table + `KIT.material(name)` returning {durScale, ease} S
- `doodle-shots-motion:3.5` — Spring parameter palette (very stiff 400+/25-30 ... very bouncy 100-200/5-10) — PARTIAL
  - says: K.spring({mass,damping,stiffness}) closed form
  - approach: docs: named presets `KIT.springs.{stiff,standard,bouncy}`
- `doodle-shots-motion:3.6` — Duration by element type, distance scaling (50 px=0.8x ... full screen 1.8-2x), exit = 65-75% of entrance — PARTIAL
  - says: KIT.dur tempo; PLAYBOOK says leave with easeIn but no exit ratio or distance scaling
  - approach: docs + `KIT.distDur(px)` helper (formula derived from table; UNVERIFIED fit)
- `doodle-shots-motion:3.9` — Disney principles for UI, emotion-to-motion map, path as emotional language, narrative 4-act structure — MISSING
  - approach: docs only (one compact section; film-relevant lines)
- `doodle-shots-motion:3.10` — Entrance / exit strategies (direct, emergent, reveal, assembled; dissolve, collapse, transfer) + continuity — PARTIAL
  - says: layouts enter/exit with theme motion; catalog has exits
  - approach: docs table mapped to KIT calls
- `doodle-shots-motion:3.12` — State & feedback (button press, hover, toggle, success, error shake, inline validation) — PARTIAL
  - says: catalog press-ripple, settings-toggle-flow, success-check, input-feedback, toggle-flip
  - approach: docs only (UI states are shown inside recordings)
- `doodle-shots-motion:3.14` — Quality checklist + severity tiers + troubleshooting — PARTIAL
  - says: qa gates cover technical items
  - approach: docs one table

#### Recipe or KIT helper to add (R-tier) (59)

- `doodle-shots-motion:2.3` — cursor-flyover [1 shot] — PARTIAL
  - says: (10e): camera via `KIT.shot.tour`; cursor drawn by the film (`tools/shots2.js`); shuffled-seek fixture in `tools/selfcheck/motion/`, docs/playbook/motion.md
  - approach: R3 shot.tour + cursor drawn at scale(1/s)
- `doodle-shots-motion:2.9` — tension-camera-moves (bullet-time-freeze-orbit, pull-back-isolation) [2 shots] — PARTIAL
  - says: (10e): `KIT.shot.bulletTime` two clocks; pull-back-isolation (sibling dim) not built (`tools/shots2.js`); shuffled-seek fixture in `tools/selfcheck/motion/`, docs/playbook/motion.md
  - approach: R3 K.timeRemap two-clock helper + isolation recipe
- `doodle-shots-motion:2.10` — terminal-3d [1 shot] — PARTIAL
  - says: (10e): camera via `KIT.shot.tour`; typing via `KIT.typewriter` (`tools/shots2.js`); shuffled-seek fixture in `tools/selfcheck/motion/`, docs/playbook/motion.md
  - approach: R3 shot.tour + typing after arrival
- `doodle-shots-motion:2.12` — chart-live-moves (oscilloscope-stream, unit-dot-swarm-regroup, axis-rescale-shock) [3 shots] — PARTIAL
  - says: KIT.math.axes/plot (tools/math.js); cat: animated-bar-chart, chart-story, decline-chart
  - approach: R1 oscilloscope-stream, unit-dot-swarm-regroup, axis-rescale-shock over math.js
- `doodle-shots-motion:2.13` — gauge-readout-moves (needle-sweep-selftest, tape-scroll-fixed-pointer) [2 shots] — PARTIAL
  - says: K.count; cat: conic-progress-ring, number-wheel
  - approach: R1 needle sweep + tape scroll
- `doodle-shots-motion:2.14` — scroll-brake-moves (changelog-scroll-brake, brake-reticle-lock) [2 shots] — MISSING
  - says: cat: scroll-feed (scroll only, no brake/reticle)
  - approach: R1 recipe (K.keys + brake ease)
- `doodle-shots-motion:2.15` — timeline-travel [1 shot] — PARTIAL
  - says: K.camAt + math.numberLine
  - approach: R1 recipe
- `doodle-shots-motion:2.16` — assemble-then-type-flyin [1 shot] — MISSING
  - says: cat: grid-card-assemble (skeleton only)
  - approach: R1 skeleton fly-in then per-char 3D text
- `doodle-shots-motion:2.18` — brand-frame-snap [1 shot] — MISSING
  - approach: R1 colour flip on frame edge
- `doodle-shots-motion:2.20` — glow-flyline-moves (glow-orb-ambient, flyline-arc, orb-flyline-relay) [3 shots] — MISSING
  - says: cat: arc-motion-path, offset-path-traveler (path travel only)
  - approach: R1 fly-line + glow orb on MotionPath-style travel (own path walker or GSAP MotionPath)
- `doodle-shots-motion:2.22` — impact-feedback (hit-counter, anime-impact) [2 shots] — PARTIAL
  - says: K.shake + K.cue impact; cat: rubber-band-bumper
  - approach: R1 hit-counter, anime-impact overlays
- `doodle-shots-motion:2.24` — radial-ripple-phone-chips [1 shot] — PARTIAL
  - says: K.phone; cat: press-ripple, radial-surround
  - approach: R1 recipe
- `doodle-shots-motion:2.25` — riso-print-hits [1 shot] — MISSING
  - approach: R1 mix-blend-mode multiply offset layers (misregistration-hit)
- `doodle-shots-motion:2.28` — scanline-assemble-flyin [1 shot] — MISSING
  - approach: R1 recipe
- `doodle-shots-motion:2.30` — spotlight-sweep-moves (glow-wake-sleep-panel, slide-spotlight-pan, corner-spotlight-reveal) [3 shots] — PARTIAL
  - says: cat: spotlight-card, light-sweep-pass
  - approach: R1 glow-wake-sleep-panel, slide-spotlight-pan, corner-spotlight-reveal
- `doodle-shots-motion:2.31` — autolayout-gap-dial [1 shot] — MISSING
  - approach: R1 recipe
- `doodle-shots-motion:2.32` — canvas-materialize-moves (panel-to-canvas, diagram-cascade) [2 shots] — MISSING
  - approach: R1 panel-to-canvas, diagram-cascade
- `doodle-shots-motion:2.33` — chip-grid-single-select-blackout [1 shot] — MISSING
  - approach: R1 recipe
- `doodle-shots-motion:2.36` — hashtag-to-pill-materialize [1 shot] — MISSING
  - approach: R1 recipe
- `doodle-shots-motion:2.39` — theme-switch-moves (theme-sweep-toggle, palette-theme-ripple) [2 shots] — MISSING
  - says: themes are CSS tokens (tools/theme.mjs) but no runtime ripple
  - approach: R1 clip-path ripple that swaps --kit-* vars (theme-sweep-toggle, palette-theme-ripple)
- `doodle-shots-motion:2.40` — type-and-filter [1 shot] — PARTIAL
  - says: cat: typed-prompt, typing-indicator
  - approach: R1 filtered list recipe
- `doodle-shots-motion:2.41` — voice-waveform-live [1 shot] — MISSING
  - says: beatgrid.py finds onsets only, no continuous energy curve
  - approach: R3 audio envelope in kit-data (Remotion-audio-reactive idea, ffmpeg astats/numpy) + recipe
- `doodle-shots-motion:2.43` — crane-rise-reveal [1 shot] — PARTIAL
  - says: S.craneRise camera is equal; row-pulse as camera crosses rows absent
  - approach: R1 add rowPulse option
- `doodle-shots-motion:2.44` — dataviz-landscape-open [1 shot] — MISSING
  - approach: R1 recipe over math.js
- `doodle-shots-motion:2.45` — fracture [1 shot] — MISSING
  - approach: R1 clip-path shard split recipe
- `doodle-shots-motion:2.48` — magician-card-flourish [1 shot] — MISSING
  - approach: R1 recipe
- `doodle-shots-motion:2.50` — spotlight-hero-card [1 shot] — PARTIAL
  - says: S.pushIn/orbit/crashZoom combine; hero push 0.78 to 2.6 with rotY 34 not a preset
  - approach: R1 S.heroPush on cam3
- `doodle-shots-motion:2.56` — outro-group-photo-launch [1 shot] — MISSING
  - says: K.stagger + K.keys primitives only
  - approach: R1 recipe: representatives converge round the wordmark
- `doodle-shots-motion:2.57` — ui-strip-away-outro [1 shot] — PARTIAL
  - says: cat: skeleton-reveal, filmed-screen
  - approach: R1 recipe
- `doodle-shots-motion:2.58` — ui-to-brand-morph (icon-flip-bloom, input-morph-assemble) [2 shots] — PARTIAL
  - says: cat: modal-morph, menu-morph, morph-swap; KIT.math.morph
  - approach: R1 icon-flip-bloom, input-morph-assemble
- `doodle-shots-motion:2.59` — beat-cut-moves [1 shot] — PARTIAL
  - says: K.snap, K.pulse, K.cue; cat: beat-accent, beat-pulse-background, shutter-slam
  - approach: R1 paparazzi-flash recipe
- `doodle-shots-motion:2.60` — beat-step-list-theme-cycle [1 shot] — MISSING
  - approach: R1 recipe
- `doodle-shots-motion:2.61` — panel-grid-moves [1 shot] — PARTIAL
  - says: cat: comparison-split, split-tilt-cards
  - approach: R1 comic-panel-split
- `doodle-shots-motion:2.62` — quad-split-parallel-scenes [1 shot] — MISSING
  - approach: R1 four sub-stages recipe
- `doodle-shots-motion:2.63` — rhythm-interrupt-moves [1 shot] — PARTIAL
  - says: K.remap + shot.track; cat: micro-transitions
  - approach: R1 jump-cut-punch-in
- `doodle-shots-motion:2.65` — speed-ramp-freeze [1 shot] — PARTIAL
  - says: K.remap (freeze = slope 0) + K.speedBlur exist; freeze-annotate absent
  - approach: R3 K.timeRemap (ramped speed keys, filmOf) + annotate
- `doodle-shots-motion:2.66` — trailer-grammar-moves [1 shot] — MISSING
  - approach: R1 bumper/title-card grammar recipe
- `doodle-shots-motion:2.69` — card-flock-tumble [1 shot] — MISSING
  - approach: R1 recipe (many cards tumble into a word)
- `doodle-shots-motion:2.74` — page-turn-transitions [1 shot] — PARTIAL
  - says: (10e): barn-door via `KIT.transition('barnDoor')`; page turn not built (`tools/transitions.js`); shuffled-seek fixture in `tools/selfcheck/motion/`, docs/playbook/motion.md
  - approach: R1 page-turn + barn-door-split
- `doodle-shots-motion:2.78` — transition-hidden-cut (invisible-cut, versus-slam, light-leak-burn) [3 shots] — PARTIAL
  - says: (10e): light-leak burn via `KIT.transition('lightLeak')`; versus-slam and invisible cut not built (`tools/transitions.js`); shuffled-seek fixture in `tools/selfcheck/motion/`, docs/playbook/motion.md
  - approach: R3 KIT.transition + light-leak overlay (additive radial gradients, triangle opacity)
- `doodle-shots-motion:2.79` — transition-travel [1 shot] — PARTIAL
  - says: cat: zoom-through-transition, parallax-zoom
  - approach: R1 letterform-zoom
- `doodle-shots-motion:2.83` — brace-expand [1 shot] — MISSING
  - approach: R1 SVG brace + text recipe
- `doodle-shots-motion:2.84` — countdown-arc-scatter [1 shot] — PARTIAL
  - says: cat: conic-progress-ring, count-up
  - approach: R1 recipe
- `doodle-shots-motion:2.86` — flying-words [1 shot] — MISSING
  - approach: R1 word tunnel in cam3 perspective
- `doodle-shots-motion:2.89` — lead-word-zoom-assemble [1 shot] — MISSING
  - approach: R1 recipe
- `doodle-shots-motion:2.95` — text-column-converge [1 shot] — MISSING
  - approach: R1 recipe
- `doodle-shots-motion:2.96` — title-demote-to-label [1 shot] — MISSING
  - says: K.keys/K.lerp only
  - approach: R1 recipe (A and B variants)
- `doodle-shots-motion:2.97` — type-assembly-moves (split-text-stagger, drift-assembly, text-on-path) [3 shots] — PARTIAL
  - says: K.words; cat: text-stagger, per-word-rise; text-on-path absent
  - approach: R3 textOnPath (SVG textPath + startOffset keyed) / GSAP MotionPath
- `doodle-shots-motion:2.98` — type-entrance-moves [1 shot] — PARTIAL
  - says: cat: bottom-up-letters, top-down-letters, char-slam-explode; K.spring
  - approach: R1 letter-drop-physics (closed-form bounce)
- `doodle-shots-motion:2.102` — word-relay-filmstrip [1 shot] — MISSING
  - approach: R1 recipe
- `doodle-shots-motion:2.103` — word-relay-geometry [1 shot] — MISSING
  - approach: R1 recipe
- `doodle-shots-motion:2.105` — bezier-source-converge-merge [1 shot] — PARTIAL
  - says: cat: arc-motion-path, offset-path-traveler
  - approach: R1 recipe (or GSAP MotionPath)
- `doodle-shots-motion:2.107` — carousel-3d [1 shot] — PARTIAL
  - says: cat: three-orbiting-cards, screen-flow-carousel
  - approach: R1 recipe (preserve-3d ring)
- `doodle-shots-motion:2.109` — deck-deal-flyin [1 shot] — MISSING
  - says: K.stagger + K.keys primitives only
  - approach: R1 recipe (accelerating deal, pile-orbit-open)
- `doodle-shots-motion:2.110` — doc-park-left-pill-deal [1 shot] — MISSING
  - approach: R1 recipe
- `doodle-shots-motion:2.112` — element-body-moves [1 shot] — MISSING
  - approach: R1 contact-shadow-lift recipe
- `doodle-shots-motion:2.115` — list-stack-press [1 shot] — MISSING
  - approach: R1 recipe
- `doodle-shots-motion:2.122` — row-embed [1 shot] — MISSING
  - approach: R1 recipe
- `doodle-shots-motion:2.124` — wall-reveal-moves (bento-light-up, wireframe-draw-on) [2 shots] — PARTIAL
  - says: KIT.layout.bento; cat: skeleton-reveal
  - approach: R1 bento-light-up, wireframe-draw-on

#### Native code to add in tools/ (or a flag/command) (23)

- `doodle-shots-motion:1.12` — Callout: dot lands, leader line drawn, label written; anchor follows camera — PARTIAL
  - says: catalog vox-annotate, cursor-annotate, hw-box-label, hw-arrow; no anchor-follows-camera leader
  - approach: native `D.callout({anchor:(t)=>[x,y], label, in})` (S)
- `doodle-shots-motion:1.13` — Drawing score: parts, ids, dependencies, removable layers, teaching phases; one score yields still, timelapse, step sheet — PARTIAL
  - says: (10g: `D.score` ordered marks with ids/deps/layers, cost timing, last frame = still; no step sheet or teaching phases)
  - approach: native `D.score` (ordered marks with ids/deps/layers) built from SVG groups; `drawSVG(svgEl)` auto-orders strokes by DOM order
- `doodle-shots-motion:1.21` — Shape handoff: one outline travels, stretches, becomes the target; coverShape grows to fill — PARTIAL
  - says: `KIT.math.morph(pathA,pathB)` reshapes one path
  - approach: native `KIT.morph.handoff({from,to,t0,t1})` (travel + stretch + land exactly) S
- `doodle-shots-motion:1.24` — Camera: keys with per-segment ease, log2 zoom, monoZoom, authored path fn — PARTIAL
  - says: K.camAt (2D inOut keys), KIT.cam3 + shots (linear lerp of z)
  - approach: native: interpolate z in log2 inside cam3/keys option `log:true`; `KIT.shot.path(fn)` already is t=>state
- `doodle-shots-motion:1.26` — Lens zoom vs dolly vs dolly-zoom (solved per frame) — PARTIAL
  - says: crashZoom = lens; S.dollyZoom is the fake (bg scales)
  - approach: native `dollyZoomReal` needs >=2 planes; builds on `shot.planes`
- `doodle-shots-motion:1.27` — Shake as gradient noise, attack ramp, squared decay, rot about centre — PARTIAL
  - says: `KIT.shake` exponential decay sinusoids; `KIT.handheld` sines
  - approach: native: swap sines for seeded D.noise option `noise:true`
- `doodle-shots-motion:1.28` — Time remap: speed keys, smoothstep ramps, freeze with keepsMoving, filmFrameOf for cues — PARTIAL
  - says: `KIT.remap` piecewise-linear points; no ramps, no inverse for cues
  - approach: native `KIT.timeRemap(keys)` -> {at(t), filmOf(sceneT), freezes}; refuse speed<0.01 without keepsMoving (their dead-air rule)
- `doodle-shots-motion:1.32` — Reading-time rule: readS = max(0.7 s, 0.3 s/word); chatHold; paced() — PARTIAL
  - says: qa.py WARN checks: overlap, tiny-text, wordy; no 'up long enough to read'
  - approach: native QA WARN `readtime` in qa_page.mjs (visible window of each text vs readS)
- `doodle-shots-motion:1.33` — Subtitles: 2-6 word phrases landing on the first spoken word; caption rule checks — PARTIAL
  - says: K.captionCues(max=42), K.subtitles, karaoke
  - approach: native: phrase splitter min/max words + TOO TIGHT check in sched.py
- `doodle-shots-motion:1.37` — Mechanism explainers: exploded axonometric machine, free-angle camera, depth-sorted parts, drafted lettering, figure card — MISSING
  - approach: native only as docs + `KIT.axo` SVG projection helper (project mm coords with azimuth/elevation, depth-sort) or three.js for real 3D; L, defer
- `doodle-shots-motion:1.49` — Determinism gate: hash frames forward vs reverse, cold vs cached; dead-air gate (something changes every second) — PARTIAL
  - says: `verify` (hash re-render) + qa `seekable` lint; no dead-air gate
  - approach: native qa WARN `dead-air`: per-second frame diff in qa_page.mjs (S)
- `doodle-shots-motion:1.50` — Ship checks on the delivered file: framecheck (text whole, up long enough, 9:16 phone zones), A/V sync, true peak, motionscan (slide cuts,… — PARTIAL
  - says: qa.py gates: loudness, caption fit/contrast, flashing, Illustrative-data label, seekable; WARN: overlap, tiny, wordy, dark, ai-label; K.safe has bottom inset
  - approach: native: WARN `safe-zone` (9:16 UI overlap zones), `facts` (numbers need a Source: credit; partly exists in README 'Source:' credit)
- `doodle-shots-motion:1.51` — Formats: 1x1, 9x16, 16x9, 4x5 or any WxH; 30 or 60 fps; GIF / WebM-alpha / APNG / MP4 / one self-contained HTML player — PARTIAL
  - says: 16x9, 9x16, 1x1 only (bin/reelwright.mjs SIZES); mp4 out
  - approach: add 4x5 to SIZES + K.fmt; GIF/WebM/APNG via ffmpeg flags; HTML player = the embeddable-player work (other audit)
- `doodle-shots-motion:2b.1` — Camera layer: layout-scale `zoom` instead of scale so text stays sharp under 3D; native-size texture rasterised then scaled (Q2) — PARTIAL
  - says: KIT.camCSS uses transform scale()
  - approach: native: camCSS option `sharp:true` (CSS zoom on the filmed layer; same Chromium in both renderers) + docs; verify with stills at 9x16
- `doodle-shots-motion:2b.3` — Velocity helpers: velocityAt, lagged, dampedSettle (state-free) — PARTIAL
  - says: K.speedBlur does central difference; no lagged/dampedSettle
  - approach: native 10 lines in shots.js
- `doodle-shots-motion:2b.10` — Aesthetic rules as lints: R1 hold >=1 s on wordmark, R4 <=3 whole-frame beat hits, Q11 caption >=5% frame height / secondary 3%, Q3 no hand… — PARTIAL
  - says: qa WARN tiny-text exists; others absent
  - approach: native qa WARN set: min-text-height 5%/3%, wordmark-hold, big-slam budget (count K.shake/crashZoom), sfx-repeat
- `doodle-shots-motion:2b.17` — Gallery of 150 looping previews + library.json API + llms.txt — MISSING
  - says: stills/sheet.jpg contact sheet only
  - approach: native `reelwright shots --gallery`: renders each KIT.recipe/shot as a looping mp4/webp sheet into docs/ (also the proof medium for these rows)
- `doodle-shots-motion:2b.18` — Beat-synced cutting methodology: librosa grid fit, kick/snare/hat onset classes, grid validation by transient coverage, post-render cut err… — PARTIAL
  - says: tools/beatgrid.py (tempo fit from drums, drop), KIT.snap, K.beat; no post-render cut-error report
  - approach: native qa WARN `cut-on-beat`: extract audio from mp4 and measure cut-to-beat error (S); onset classes (low/mid/high band) S
- `doodle-shots-motion:2b.19` — Output-audio offset compensation: AAC priming (~1.28 f) and per-file SFX peak lag (brush-write 2 f, paper-slide 10 f) — PARTIAL
  - says: (10g: per-kind PEAK table in mix.py, peaks known by construction; AAC priming not measured)
  - approach: native: per-kind PEAK table in mix.py for synthesised SFX (known by construction) + `verify-av` cross-correlation check on the rendered mp4 (S)
- `doodle-shots-motion:3.3` — Easing standards as cubic-beziers (MD3 standard/emphasized/accelerate/decelerate, Apple HIG, gentle float, bounce, elastic snap) — PARTIAL
  - says: K.E premium, corporate, emphasized, accel, settle; missing: MD3 decelerate (0,0,0,1), Apple HIG (.25,.1,.25,1), elastic snap (.68,-.55,.265,1.55)
  - approach: native: 3 more K.bezier names (S)
- `doodle-shots-motion:3.7` — Stagger recipes by element class (list, grid, nav, dashboard), total < 500 ms, overlap % — PARTIAL
  - says: K.stagger linear; --kit-stagger token; PLAYBOOK budget rule
  - approach: native: K.stagger options {from:'center'/'edges', grid, ease} (also GSAP stagger parity); docs recipes
- `doodle-shots-motion:3.8` — Choreography rules: lead with hero, spatial origin consistency, counter-motion 20-30%, 1/3-distance and 1/3-simultaneous rules — PARTIAL
  - says: PLAYBOOK 'no move across more than a third' and stagger budget
  - approach: native qa WARN lints: spatial move with linear ease, stagger total >0.5 s, >1/3 of 3+ elements moving at once (needs film introspection, M)
- `doodle-shots-motion:3.11` — Ambient loops: breathing, float (layered durations), gradient shift, parallax, continuous rotation, shimmer, particle ambient (counts/speed… — PARTIAL
  - says: catalog aurora-drift, grain-field, drift-hold, shimmer-sweep, confetti; no looping helper
  - approach: native `KIT.loop(t, period, shape)` (sine/saw, seeded phase per id) + docs; no particles lib (seeded D.rng)

#### Other (read the approach text) (21)

- `doodle-shots-motion:1.17` — Illustrated kinetic type: every word drawn stroke by stroke in a medium, letters pop on landing — PARTIAL
  - says: KIT.layout.kinetic = font text landing per spoken word
  - approach: after lettering lands: `layout.kinetic({style:'drawn'})`
- `doodle-shots-motion:1.29` — Motion blur: sub-frame render averaged in linear light (`--blur auto`, shutter 180) — PARTIAL
  - says: KIT.speedBlur (directional CSS blur) only
  - approach: optional renderer flag `--motion-blur N`: render N sub-frames per frame in tools/renderers/pvk.mjs and average with ffmpeg tmix/numpy; opt-in, multiplies render time
- `doodle-shots-motion:1.34` — Product UI from data: before/after states, items spring to slots, matched by id — MISSING
  - says: Reelwright films a real recorded UI instead
  - approach: optional: `KIT.layout.compare`/ list-morph keyed by id (FLIP-style). Low priority
- `doodle-shots-motion:1.35` — People placement by head size; pop-out on a disc — MISSING
  - approach: not needed (niche); docs note
- `doodle-shots-motion:1.40` — Style adaptation from a reference image — PARTIAL
  - says: `theme-from` builds a theme from a URL (tools/theme_from.mjs)
  - approach: extend theme_from to accept an image (palette via k-means, no ML) S
- `doodle-shots-motion:1.47` — Narration: multiple providers (say, kokoro local; cloud gemini/openai/elevenlabs), takes cached by hash, `check` hears every word back (WER… — PARTIAL
  - says: vo.py edge-tts (free, word timings) + cache; no ASR verification; cloud TTS only through opt-in gen connector
  - approach: optional: local kokoro/piper provider + ASR round-trip check (whisper.cpp) as opt-in setup extras; keep edge-tts default
- `doodle-shots-motion:1.53` — Interactive web art: <ani-doodle> mascots that follow the cursor, scroll-drawn hero, form companion — MISSING
  - approach: out of scope (not a video; belongs to the embeddable-player/studio work)
- `doodle-shots-motion:2b.5` — Motion blur for fast moves (shutterAngle 200, 8-20 samples) — PARTIAL
  - says: K.speedBlur (CSS directional blur, capped)
  - approach: same optional `--motion-blur` sub-frame renderer flag as above (M)
- `doodle-shots-motion:2b.6` — Caption info-strip, DigitRoll odometer, FlashCut, VerticalTicker, ClipCard (video as card hero) — PARTIAL
  - says: K.subtitles, K.count (count-up, not roll), K.clip for recordings; cat: number-wheel, slot-machine-roll; no FlashCut/VerticalTicker/ClipCard
  - approach: KIT.count({roll:true}) S; ClipCard = K.clip inside a card (docs); flash via KIT.transition.flash
- `doodle-shots-motion:2b.13` — Page capture trio: 2x full-page PNG, per-element transparent cutouts, layout.json bbox table — PARTIAL
  - says: tools/capture_site.mjs: sections, full page, images, text, colours, fonts (site.json), read-only
  - approach: extend capture_site: element cutouts (omitBackground) + layout.json boxes; needed for 3D 'floating chip' recipes
- `doodle-shots-motion:2b.14` — Motion Workbench: CapCut-style browser editor (tracks, retime, swap shots, schema inspector, parity check, export) — MISSING
  - says: tools/preview.mjs is a live scrubber, not an editor
  - approach: belongs to the studio-editor audit; Remotion-Player-based, so not reusable. Reuse only the manifest idea (`workbench.ts`: shots/transitions/captions/sfx tracks)
- `doodle-shots-motion:2b.24` — Shot-polish tooling: contact sheets, compare pages, decisions.json for 216 demos — MISSING
  - says: tools/sheet.py
  - approach: internal tooling; skip
- `doodle-shots-motion:4.17` — Flip: record layout state, animate to new layout — MISSING
  - approach: UNVERIFIED: my test added no usable tween (duration 0). Not recommended for render(t) (reads live layout); skip unless a film needs it
- `doodle-shots-motion:4.18` — CSSRulePlugin (animate pseudo-elements / stylesheet rules) — MISSING
  - approach: bundle optional; UNVERIFIED seek behaviour
- `doodle-shots-motion:4.24` — gsap-skills agent guidance (8 SKILL.md: core, timeline, plugins, utils, performance, scrolltrigger, react, frameworks) — PARTIAL
  - says: PLAYBOOK GSAP section (own words), THIRD_PARTY credit
  - approach: extend PLAYBOOK GSAP section with plugin table; link, do not copy
- `doodle-shots-motion:5.3` — HTML renderer — MISSING
  - approach: UNVERIFIED; do not bundle
- `doodle-shots-motion:5.5` — Expressions (AE JS expressions evaluated by lottie-web) — MISSING
  - approach: UNVERIFIED determinism (wiggle/random/time). Add a JSON scan in qa: warn on animations containing `"x":"var $bm_rt` expression strings; reject `random`/`seedRandom` until tested
- `doodle-shots-motion:5.6` — Text layers and fonts in Lottie — MISSING
  - approach: UNVERIFIED; require document.fonts.ready before first seek
- `doodle-shots-motion:5.7` — Image assets, masks, mattes, gradients, trim paths, repeaters, effects — MISSING
  - says: Phase 9 tested shapes/ease/rotation/opacity only
  - approach: run the seek test per bundled sample; list supported features in docs
- `doodle-shots-motion:5.8` — dotLottie (.lottie zip, multiple animations, themes, state machines) — MISSING
  - says: HF runtime adapter already handles DotLottie objects (setFrame / seek percent)
  - approach: optional: `reelwright add-lottie x.lottie` unzips to JSON for lottie-web at add time (S, no WASM). Full dotlottie-web only if state machines/themes are asked for
- `doodle-shots-motion:5.9` — Sample Lottie files — MISSING
  - approach: ship none except self-made test animation; user supplies files

### Higgsfield workflows (docusphere, cth9191) (4)

#### Docs / PLAYBOOK note only (2)

- `higgsfield-workflows:13` — Prompt craft rules: viewer takeaway first; each beat reveals something; "headline hidden" meaning test; exact-copy list per shot; reading h… — PARTIAL
  - says: Truthfulness rules + "Illustrative data" QA gate exist (docs/PLAYBOOK.md, tools/qa.py `illustrative`); reading-hold and takeaway checks not written down as a pre-build checklist
  - approach: Docs: add "Brief" and "Self-review" sections to PLAYBOOK (paraphrased). `wordy`/`tiny-text` WARNs already cover copy density
- `higgsfield-workflows:23` — Review checklist: requirement+time / planned asset / observed result+timestamp / pass-fail-not-inspected; judge story and motion separately… — PARTIAL
  - says: automated gates for duration/loudness/captions/flash/seekable/ai-label (tools/qa.py) + `stills` contact sheet and "look at frames around every flag" (AGENTS.md). No written per-requirement review table; no "listen for c…
  - approach: Docs-only template in PLAYBOOK (table with the same four columns, own wording) + optional `reelwright review <name>` that prints the table prefilled from `beats` (label, time, exact on-screen copy) w…

#### Native code to add in tools/ (or a flag/command) (1)

- `higgsfield-workflows:11` — Preset gallery: 10 looks (kinetic typography, glass UI launch, product hyper-motion, tropical product, exploded product, blueprint-to-build… — PARTIAL
  - says: 4 look-alikes via themes/layouts (kinetic -> `kinetic` layout + brutalist/neon; flat-vector -> playful/pastel; editorial -> editorial; glass UI -> dark-tech + tilted device). Gap: "glass" and "blueprint" palettes. 3D/CG…
  - approach: Native themes `glass`, `blueprint` from palette words only (themes/*.css); optional "recipe" docs per look. CG looks: EQUAL impossible without a video model

#### Other (read the approach text) (1)

- `higgsfield-workflows:17` — Audio design: sound effects baked per clip, VO separate, music continuous at ~0.25, clip audio ~0.3 — PARTIAL (mixed)
  - says: for UI sounds: synth SFX at `KIT.cue` times, ducking, -14 LUFS normalise, loudness gate (tools/mix.py, tools/qa.py). MISSING: mixing the *embedded* audio of a generated clip at a set level
  - approach: Small option in mix.py/`clip` for embedded-audio gain (free). Generated-SFX quality: needs the video model's `generate_audio` (Seedance docs: default true)
