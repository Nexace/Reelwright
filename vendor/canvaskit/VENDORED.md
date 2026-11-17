# Vendored: canvaskit-wasm (Skia)

- Upstream: https://github.com/google/skia/tree/main/modules/canvaskit, published as `canvaskit-wasm`
- Version: **0.42.0**, the published npm tarball `canvaskit-wasm-0.42.0.tgz` (`npm pack canvaskit-wasm@0.42.0`,
  sha256 `ba667f46830ac2a70c6d76ab2c1ac790b0d15a2bf6ed2c842ce97231478b1f80`,
  integrity `sha512-N3ikotmzYwDVAcpQKDMptBT2P5pIEWS9ywdmrQA2awwaMF9cxKEFuxZZHv9ay1Em9kDjxDsPtwUzDm1uNj136g==`)
- License: BSD-3-Clause, see [LICENSE](LICENSE) (Copyright (c) 2011 Google Inc.). Owner ruling 2026-11-16: vendored.

## What we took

From the tarball, byte for byte:

- `canvaskit.js` (120,877 bytes, sha256 `443777592179808354031cf411d8d43cac9f6b98d1227123c5c22d401b0fbf7f`):
  `bin/canvaskit.js`, the default build's Emscripten loader (a classic script; it defines `window.CanvasKitInit`).
- `canvaskit.wasm` (7,317,345 bytes, sha256 `25ebed8e60158c5854f8dc807b936daca21354f8bfb6a2231266b0a93812f301`):
  `bin/canvaskit.wasm`. This is the smallest official build with text (paragraph/font manager) and paths: the
  `bin/full/` build is 8,242,911 bytes and adds WebGPU and extra features; `bin/profiling/` is a debugging build.
- `LICENSE` (1,635 bytes, sha256 `d27678cba0d529e77201e2d2a053628143e986aad8f1e77f7039ad4366c8f978`)

Left out: `bin/full/`, `bin/profiling/`, the `.d.ts` types, the examples and the helper modules (`textapi_utils.js`,
`paragraphs.html`, ...).

## What we changed

Nothing in the files. `tools/skia.js` (ours) loads the loader with a `<script>` tag, reads the wasm with
`XMLHttpRequest` (works from `file://`) and passes `locateFile` a `blob:` URL of those bytes, so `CanvasKitInit` never
fetches its wasm from a CDN and a film renders offline. If you change a file, put
`/* Changed from upstream canvaskit-wasm (BSD-3-Clause): <what and why> */` at its top and list it here.

## How it is loaded

- pvk films: `<script src="../../../tools/runtimes.js">` then `<script src="../../../tools/skia.js">`; the loader and
  wasm are found at `../vendor/canvaskit/` relative to `tools/skia.js`.
- HyperFrames films: the renderer (and `preview`) copies this folder to `hf/kit/canvaskit/` (`kit.json`,
  tools/kit_files.mjs); the page loads `kit/runtimes.js` and `kit/skia.js`.

## Updating

`npm pack canvaskit-wasm@<version>` in a scratch folder, copy `bin/canvaskit.js`, `bin/canvaskit.wasm` and `LICENSE`
over these, update the version, hashes and sizes above, run `node tools/selfcheck/skia.mjs`. `kit.json` is ours, not
upstream: keep it.
