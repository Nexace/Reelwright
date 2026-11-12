# Vendored: HyperFrames

- Upstream: https://github.com/heygen-com/hyperframes
- Version: **0.9.19**, commit `b4cc674f7f312e77ded32e0b53006cc0bad6723b` (tag `v0.9.19`, 2026-11-06). Updated from 0.8.217 in
  Phase 10a; example-hf rendered byte-identical frames before and after (macOS).
- License: Apache 2.0, see [LICENSE](LICENSE). Upstream has no `NOTICE` file. [CREDITS.md](CREDITS.md) is upstream's attribution list, kept as is.

## What we took

| Folder | From | Why |
|---|---|---|
| `producer/`, `engine/`, `core/`, `parsers/`, `lint/`, `studio-server/` | the published npm tarballs `@hyperframes/<name>@0.9.19` (`npm pack`), which are upstream's own unminified esbuild output of `packages/<name>/src` at the commit above | the render chain `tools/renderers/hyperframes.mjs` calls (`createRenderRequest` → `executeRenderJob`) |
| `registry/components/` | `registry/components/` at the commit above: each component's `registry-item.json` and its one `.html` file, plus `CATALOG.md` | `reelwright add <component>` copies one into a project |
| `registry/blocks/` | `registry/blocks/` at the commit above, **converted** by `node tools/blocks.mjs import` (see Blocks below): each supported block's rewritten `<name>.html`, its `registry-item.json` unchanged, and the asset files it uses that have a known licence; `index.json`, `CATALOG.md`, `UNSUPPORTED.md` are generated | `reelwright add <block>` copies one into `hf/compositions/` for `KIT.mount` |

Why the published builds and not `src/`: upstream builds with Bun and runtime-bundling scripts we don't run. The published `dist/` files are readable JavaScript and need no build step. To edit one, edit the `dist/` file and add a header (below).

Left out: `.d.ts` and `.map` files, component `demo.html`, `README.md` and `assets/` (textures, fonts), the blocks listed in `registry/blocks/UNSUPPORTED.md` (with the reason each can't run here), and the packages `cli`, `studio`, `player`, `shader-transitions`, `sdk*`, `inspector`, `aws-lambda`, `gcp-cloud-run`. Components that need assets are refused by `add`.

Third-party code inside: none in what we took. Third-party npm packages the vendored code imports (puppeteer, hono, linkedom, postcss, …) install through npm under their own licenses.

### Dropped after 0.3.0 (2026-11-13)

27 files nothing imports or reads were removed (an import trace, `docs/plans/phase-10z-cleanup-list.md` §5): in `core/`
the unused audio-fx modules, `htmlInCanvasDefects.js`, `runtime/clock.js`, `vfx/refs/`, `fonts/sfntFixture.js`, the
`pickerApi.js` stub and `docs/`; in `engine/` the README, test fixtures, type stubs, `webglRelease.js` and
`utils/parityContract.js`; the `producer/README.md`. They are in git history, and a re-unpack of the upstream
tarball (see Updating) restores them. When updating, do not re-add them.

## What we changed

- Every `package.json` under `producer/ engine/ core/ parsers/ lint/ studio-server/`: removed `devDependencies` and `scripts`. npm installs a `file:` package's devDependencies, which pulled in ~750 MB (AWS Lambda, ffprobe-static); the scripts are upstream's Bun build. JSON can't carry a header, so this line is the change note.
- `engine/dist/services/browserManager.js`: `buildChromeArgs` adds `--disable-lcd-text`. Chromium chose LCD (subpixel) or greyscale text antialiasing per compositing layer, and on Linux CI two renders of example-hf drew the same caption differently (about 3,000 px over frames 109–160). Greyscale everywhere makes renders repeatable; macOS headless already drew greyscale, so its frames don't change.
- No other source file is changed. If you change one, put this at its top, keeping upstream's copyright:
  `// Changed from upstream HyperFrames (Apache-2.0, Copyright HeyGen): <what and why>`

## Updating

1. `npm pack @hyperframes/{producer,engine,core,parsers,lint,studio-server}@<version>`, unpack each `package/` over its folder here, delete `*.d.ts`, `*.d.cts` and `*.map`, strip `devDependencies` and `scripts` again.
2. Re-copy `registry/components/*/{registry-item.json,<name>.html}` from the matching upstream tag.
3. Re-import the blocks: `node tools/blocks.mjs import <upstream checkout>/registry/blocks` (converts, verifies, rewrites
   `registry/blocks/`; check UNSUPPORTED.md for blocks that newly fail and why).
4. Update the version and commit above, re-apply any changes listed here, run CI.

## Runtime notes

- The renderer sets `DO_NOT_TRACK=1`, `HYPERFRAMES_NO_TELEMETRY=1` and `PRODUCER_BROWSER_GPU_MODE=software` (identical frames across machines), and points `HYPERFRAMES_BROWSER_PATH` at Playwright's headless shell. `.puppeteerrc.cjs` stops puppeteer downloading a second Chrome.
- The HyperFrames compiler fetches font faces it finds in a composition's CSS (e.g. `Inter`) from Google Fonts once and caches them in `~/.cache/hyperframes/fonts`, to make text deterministic.

## Blocks

`tools/blocks.mjs import` turns each upstream block (a full HTML document) into a `<template>` that `KIT.mount`
(tools/compose.js) inlines into an hf film. Every converted file starts with a `Changed from upstream HyperFrames` header.
What the conversion does, and what makes a block UNSUPPORTED (the reason lands in UNSUPPORTED.md):

- Libraries resolve to the kit only: GSAP 3.14.2 from jsDelivr (or a block's own copy) → `kit/gsap/dist/` (3.15.1, same
  plugin files), lottie-web → `kit/lottie/`, three 0.170–0.185 ES modules (CDN or the block's own copy) and their
  `examples/jsm` addons → `kit/three/` (0.187, `addons/`) through an import map, the three r147 global build and its
  `examples/js` → `kit/three-r147/`, d3 7 and topojson-client 3 → `kit/d3/`, `kit/topojson-client/`, atlas JSON from
  jsDelivr → `kit/us-atlas/`, `kit/world-atlas/` (each its own vendor folder with LICENSE and
  VENDORED.md). The block's own `fetch()` / `d3.json()` of those files is synchronous (built before the first seek).
  Not vendored: WebGPU, three r128 and the Draco decoder (only blocks with unlicensed assets need them), clipper-lib
  and d3-delaunay; blocks needing them are unsupported.
- Fonts: Google Fonts / fontsource links and `@import`s are dropped; each family the block names maps to a bundled
  family in `fonts/` (exact, else nearest; recorded in CATALOG.md notes), copied beside the block by `add`. A block's own
  font files stay when a licence text sits beside them. Host-font keywords (`system-ui`, `-apple-system`, …) → Inter.
  Nothing in a block fetches a font from the network, and the HyperFrames compiler never sees block CSS (it is inlined
  at run time), so it doesn't fetch Google Fonts for blocks either.
- Assets: copied only with a known licence — a `license` in registry-item.json, upstream CREDITS.md (the 3D-motion pieces,
  minus its "origin to be confirmed" files), or a licence text beside the file (`OFL.txt`, `inter-LICENSE.txt`, …). An
  unlicensed or missing sample image behind an image variable becomes a transparent pixel (pass your own via `vars`);
  any other unlicensed file makes the block unsupported. `<audio>`/`<video>` blocks are unsupported (KIT.mount doesn't
  re-time media).
- Paths → `compositions/<name>/…`; CSS scoped to the root with HyperFrames' own `scopeCssToComposition`; `data-start`/
  `data-duration` clips → `data-block-*`, shown and hidden by the wrapper with the block's local time; the block's
  `window.__timelines`, `hf-seek` listeners, `__hfThreeTime` and `__hfLottie` become wrapper locals (its lottie players
  are also hidden from the runtime's lottie adapter), so the HyperFrames runtime never seeks them with film time; module scripts run behind `window.__hf.buildReady`.
- Verify (part of import, and `node tools/blocks.mjs verify`): each block is mounted in a scratch hf page served by the
  producer's own file server (HyperFrames runtime injected, software GL), seeked at 6 times in two shuffled orders on
  two pages, the second mounting it 7 s later in the film (catches anything still seeked with film time); it must load
  with no page error and no network request, draw something, and give the same pixels (≤ 64 px over 2/255). A failure makes it unsupported with the reason. `node tools/blocks.mjs render <out> <names…>` renders
  blocks through the real producer.

