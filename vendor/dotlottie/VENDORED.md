# Vendored: @lottiefiles/dotlottie-web

- Upstream: https://github.com/LottieFiles/dotlottie-web (`packages/web`)
- Version: **0.83.2**, the published npm tarball `lottiefiles-dotlottie-web-0.83.2.tgz` (`npm pack @lottiefiles/dotlottie-web@0.83.2`,
  sha256 `18e0c6c5e13e576dc3ff3d719b71b159150d535fb927cd0bd5d2fa3561762382`,
  integrity `sha512-MMI4RVcFtB5Vjv9mwbP8oWsSqy4N7GO2P+jwHVLo4GjbYAdR4Z7seK3rR7YefpcfayWrsQogaORMBzv6YFWntQ==`)
- License: MIT, see [LICENSE](LICENSE) (Copyright (c) 2023 LottieFiles.com). Owner ruling 2026-11-13: vendored.

## What we took

From the tarball, byte for byte:

- `dotlottie-web.js` (161,008 bytes, sha256 `3c2e97589baa386ff4e5cb4d879c92cd06db5a01f19c038ab9a2442497be85d8`): `dist/index.js`, the ES
  module (the package ships ES and CommonJS builds, no UMD); renamed from `index.js`. Its last line is a
  `sourceMappingURL` comment for a map we left out (DevTools only).
- `dotlottie-player.wasm` (1,225,695 bytes, sha256 `70c460be2e3723737823562727526eda36d4f115b947d0c24a11715951d752f8`): `dist/dotlottie-player.wasm`,
  the Rust (dotlottie-rs, ThorVG software renderer) engine
- `LICENSE` (1,072 bytes, sha256 `779cec663b3c6590082566f2a000170d7a4d1a4bfc6f954e61efa4adddc652a8`)

Left out: the CommonJS build, the worker build (`dotlottie.worker.js`, `DotLottieWorker`: Reelwright draws on the main thread),
the WebGL and WebGPU builds and their wasm files (about 2.7 MB; software drawing is what a deterministic frame needs), the source
maps and the type declarations.

## What we changed

Nothing in the files. `tools/dotlottie.js` (ours) loads the module with `import()`, reads the wasm with `XMLHttpRequest` (works from
`file://`) and gives the player a `blob:` URL through `DotLottie.setWasmUrl`, so the library's CDN fallback (jsdelivr, unpkg) is never
reached: a film renders offline. If you change a file, put `/* Changed from upstream @lottiefiles/dotlottie-web (MIT): <what and why> */`
at its top and list it here.

## How it is loaded

- pvk films: `<script src="../../../tools/runtimes.js">` then `<script src="../../../tools/dotlottie.js">`; the module and wasm are
  found at `../vendor/dotlottie/` relative to `tools/dotlottie.js`.
- HyperFrames films: the renderer (and `preview`) copies this folder to `hf/kit/dotlottie/` (`kit.json`, tools/kit_files.mjs); the page loads
  `kit/runtimes.js` and `kit/dotlottie.js`.

## Updating

`npm pack @lottiefiles/dotlottie-web@<version>` in a scratch folder, copy `dist/index.js` (as `dotlottie-web.js`),
`dist/dotlottie-player.wasm` and `LICENSE` over these, update the version, hashes and sizes above, run
`node tools/selfcheck/p6-dotlottie.mjs`. `kit.json` is ours, not upstream: keep it.
