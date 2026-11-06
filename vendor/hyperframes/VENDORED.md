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

Why the published builds and not `src/`: upstream builds with Bun and runtime-bundling scripts we don't run. The published `dist/` files are readable JavaScript and need no build step. To edit one, edit the `dist/` file and add a header (below).

Left out: `.d.ts` and `.map` files, component `demo.html`, `README.md` and `assets/` (textures, fonts), all `registry/blocks/` (full 15–24 s showcase compositions that load GSAP and Google Fonts from CDNs), and the packages `cli`, `studio`, `player`, `shader-transitions`, `sdk*`, `inspector`, `aws-lambda`, `gcp-cloud-run`. Components that need assets are refused by `add`.

Third-party code inside: none in what we took. Third-party npm packages the vendored code imports (puppeteer, hono, linkedom, postcss, …) install through npm under their own licenses.

## What we changed

- Every `package.json` under `producer/ engine/ core/ parsers/ lint/ studio-server/`: removed `devDependencies` and `scripts`. npm installs a `file:` package's devDependencies, which pulled in ~750 MB (AWS Lambda, ffprobe-static); the scripts are upstream's Bun build. JSON can't carry a header, so this line is the change note.
- `engine/dist/services/browserManager.js`: `buildChromeArgs` adds `--disable-lcd-text`. Chromium chose LCD (subpixel) or greyscale text antialiasing per compositing layer, and on Linux CI two renders of example-hf drew the same caption differently (about 3,000 px over frames 109–160). Greyscale everywhere makes renders repeatable; macOS headless already drew greyscale, so its frames don't change.
- No other source file is changed. If you change one, put this at its top, keeping upstream's copyright:
  `// Changed from upstream HyperFrames (Apache-2.0, Copyright HeyGen): <what and why>`

## Updating

1. `npm pack @hyperframes/{producer,engine,core,parsers,lint,studio-server}@<version>`, unpack each `package/` over its folder here, delete `*.d.ts`, `*.d.cts` and `*.map`, strip `devDependencies` and `scripts` again.
2. Re-copy `registry/components/*/{registry-item.json,<name>.html}` from the matching upstream tag.
3. Update the version and commit above, re-apply any changes listed here, run CI.

## Runtime notes

- The renderer sets `DO_NOT_TRACK=1`, `HYPERFRAMES_NO_TELEMETRY=1` and `PRODUCER_BROWSER_GPU_MODE=software` (identical frames across machines), and points `HYPERFRAMES_BROWSER_PATH` at Playwright's headless shell. `.puppeteerrc.cjs` stops puppeteer downloading a second Chrome.
- The HyperFrames compiler fetches font faces it finds in a composition's CSS (e.g. `Inter`) from Google Fonts once and caches them in `~/.cache/hyperframes/fonts`, to make text deterministic.
