# Phase 1a spike: HyperFrames

Run 2026-10-30 on macOS (Apple M5), Node 24, ffmpeg 9.0.2. Throwaway work lived in a temp folder, now deleted.

## Upstream

- Repo: https://github.com/heygen-com/hyperframes, cloned at **`4e2a1c215a42c6d262b8c635df9d5edff80e8830`** (tag `v0.8.217`, 2026-10-29). Clone needs `git -c filter.lfs.smudge= -c filter.lfs.process= -c filter.lfs.required=false clone ...` when `git-lfs` is not installed (`GIT_LFS_SKIP_SMUDGE=1` alone fails without the binary).
- The render test used the published CLI `hyperframes@0.8.216` from npm (tag `v0.8.216`, `6df754fbf3289ee0dc19e123e0628cc69218e518`). Building from source needs Bun 1.4.4, which we don't use.
- License: Apache 2.0 at the repo root. Packages carry no per-package `LICENSE`; the root one covers them. No top-level `NOTICE` file (only test-fixture `NOTICE.md`s under `packages/producer/tests/`, which we don't take). `CREDITS.md` lists third parties; see below.

## Answers

| | Question | Answer |
|---|---|---|
| A | Video-only or a frame sequence? | **Yes.** `--format png-sequence` writes `frame_000001.png ...` (RGBA). mp4/webm/mov also work; an mp4 with no audio in the composition is video-only. |
| B | 60 fps? | **Yes.** `--fps 60` gives 180 frames for 3 s; mp4 reports `r_frame_rate=60/1, nb_frames=180`. Range 1-240, rationals allowed. |
| C | Two renders identical? | **Yes, byte-identical.** Two runs at 30 fps and two at 60 fps hash the same over all PNGs. |
| D | Next to Playwright's Chromium? | **Yes.** `HYPERFRAMES_BROWSER_PATH=<Playwright chromium_headless_shell>` renders, and the frames are byte-identical to its own Puppeteer Chrome (v155 vs Playwright's v156). So one browser download serves both renderers. |

Working render command (from a composition folder holding `index.html`):

```
DO_NOT_TRACK=1 HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_BROWSER_PATH=<chrome-headless-shell> \
  hyperframes render --fps 60 --format png-sequence --quiet -o <out-dir>
```

Composition shape: root `<div data-composition-id="main" data-duration="3" data-width data-height>`, clips with `data-start/data-duration/data-track-index`, and a paused GSAP timeline registered as `window.__timelines["main"]`.

## Things to handle in Phase 2

- **Telemetry is on by default.** Always set `HYPERFRAMES_NO_TELEMETRY=1` and `DO_NOT_TRACK=1` in our renderer (rule: everything local).
- **GSAP is not OSI open source** (GSAP Standard License). The starter loads it from jsDelivr at render time. For offline, reproducible builds vendor `gsap` through npm with its license text, or author with CSS/WAAPI.
- **GPU mode is probed** (`browserGpuMode probe → hardware` on macOS). For identical frames across machines and CI, force software (`PRODUCER_BROWSER_GPU_MODE`) and verify in Phase 2.
- **Static-frame dedup** is on by default; it reuses frames it proves identical. Harmless (C still holds) but worth knowing when debugging.
- Upstream already has `beats`, `audio`, transcription (Parakeet/Whisper, CC-BY-4.0 model) and captions. Useful prior art for Phases 4-5; we don't take them now.

## Vendoring map

Render chain (what `render` needs): `producer -> engine, core, parsers, lint, studio-server`. Non-test source sizes at v0.8.217:

| Package | Src (non-test) | Deps (npm) | Need? |
|---|---|---|---|
| producer | 1.6 MB, 133 files | hono, @hono/node-server, linkedom, postcss, puppeteer, puppeteer-core | yes: orchestrates render |
| engine | 1.3 MB, 79 files | hono, @hono/node-server, linkedom, puppeteer(-core), undici | yes: browser capture + ffmpeg |
| core | 3.4 MB, 287 files | @chenglou/pretext, acorn, linkedom, postcss, wawoff2 | yes: in-page runtime |
| parsers | 0.6 MB, 59 files | @babel/parser, acorn, acorn-walk, entities, linkedom, magic-string, recast | yes (core/producer import it) |
| lint | 0.45 MB, 27 files | acorn, htmlparser2, linkedom, postcss, postcss-selector-parser | yes (producer imports 3 symbols) |
| studio-server | 0.7 MB, 86 files | hono, linkedom, postcss, postcss-selector-parser | partly: producer imports 6 subpaths (encoder options, render scripts) |
| cli | 11 MB | citty, puppeteer-core, esbuild, fontkit, ... | only its `render` command; published bundle is 24 MB (6 MB studio, 4 MB skills) |
| shader-transitions | 0.1 MB | html2canvas | later (Phase 3 transitions), check html2canvas MIT |
| player | 0.26 MB | core | later (Phase 5 preview) |
| studio, sdk, sdk-playground, inspector, aws-lambda, gcp-cloud-run | — | — | no (AWS/GCP are paid cloud; studio is a full React app) |

Catalog blocks live in `registry/` (about 450). Seven 3D blocks bundle three.js (MIT), GSAP (Standard License), three-mesh-bvh and opentype.js (MIT), Clipper (BSL-1.0), d3-delaunay (ISC), fonts under OFL 1.1, and a CC0 HDR; several load from CDNs at run time. Check each block's license before `add` (Phase 2 step 5); avoid CDN-loading blocks or vendor what they load.

Notices to carry over: root `LICENSE` (Apache 2.0) into `vendor/hyperframes/LICENSE`; `CREDITS.md` (attribution of Remotion prior art and the third-party list) into `vendor/hyperframes/CREDITS.md`; per-block license files (`Three-LICENSE.txt`, `GSAP-NOTICE.txt`, font OFL texts) beside any block we copy.

**Smallest set:** the six render-chain packages (about 8 MB of TypeScript). Building them needs a TS build without Bun (esbuild is already in their tree). **Fallback** if that build is not worth it: vendor the published `hyperframes` npm `dist/` minus `studio/` and `skills/` (about 13 MB of bundled JS) and drive it as a CLI. That is unreadable for edits, so it only fits while we change nothing upstream. Phase 2 tries the source build first and falls back if it takes more than a day.

## Verdict

**Go.** All four checks pass. No fallback renderer needed; the pvk renderer stays the default.
