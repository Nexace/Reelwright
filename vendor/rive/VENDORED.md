# Vendored: @rive-app/canvas

- Upstream: https://github.com/rive-app/rive-wasm (`js`), published as `@rive-app/canvas`
- Version: **2.50.0**, the published npm tarball `canvas-2.50.0.tgz` (`npm pack @rive-app/canvas@2.50.0`,
  sha256 `66b59a40ececf7a0bb880e9af8640f65d66c903545125a77243b055159a1c935`,
  integrity `sha512-9D92BeRK3yzIh2Fy/YxTfrjKQxDIdzEoasMuD5nupJ67aW1JFrSt8bW0Bg7EP9Hm7r5D+u3g/Q+kqRQ2rpH8+g==`)
- License: MIT, see [LICENSE](LICENSE) (Copyright (c) 2020-2021 Rive; the tarball has no licence file, this copy is the
  one in the rive-wasm repository). Owner ruling 2026-11-16: vendored.

## What we took

From the tarball, byte for byte:

- `rive.js` (684,104 bytes, sha256 `638731ee19621c369ffd36edf749fc223b942c6c6a626b26ac9aee1fc557fc32`): the UMD build
  (`rive.js` at the package root). It defines `window.rive` and `window.rive.RuntimeLoader`.
- `rive.wasm` (2,264,167 bytes, sha256 `b8e8e80a0d0aa5f702494be2afaa5a4886cbf4bda44476aa13c87b6aca1977b9`): the CanvasKit
  (Skia) renderer build.

Left out: `rive_fallback.wasm` (2.3 MB: only fetched when the main wasm cannot be instantiated), `rive.js.map`, the
`.d.ts` type declarations, `utils/` and `semantics/` (the high-level `Rive` player, which has its own real-time clock;
`tools/rive.js` uses the low-level API instead).

## What we changed

Nothing in the files. `tools/rive.js` (ours) loads the UMD build with a `<script>` tag, reads the wasm with
`XMLHttpRequest` (works from `file://`), hands it to `RuntimeLoader.setWasmBinary` and a `blob:` URL through
`setWasmUrl`, and switches off `setWasmFallbackUrl(null)`, `setReplayWorker(false)` and `setScriptFetch(false)`: the
runtime's CDN fallback, replay worker and script networking are never reached, so a film renders offline. If you change
a file, put `/* Changed from upstream @rive-app/canvas (MIT): <what and why> */` at its top and list it here.

## How it is loaded

- pvk films: `<script src="../../../tools/runtimes.js">` then `<script src="../../../tools/rive.js">`; the script and
  wasm are found at `../vendor/rive/` relative to `tools/rive.js`.
- HyperFrames films: the renderer (and `preview`) copies this folder to `hf/kit/rive/` (`kit.json`, tools/kit_files.mjs);
  the page loads `kit/runtimes.js` and `kit/rive.js`.

## Updating

`npm pack @rive-app/canvas@<version>` in a scratch folder, copy `rive.js`, `rive.wasm` and (from the repository)
`LICENSE` over these, update the version, hashes and sizes above, run `node tools/selfcheck/rive.mjs`. `kit.json` is
ours, not upstream: keep it.
