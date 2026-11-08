# Vendored: @remotion/paths

- Upstream: https://github.com/remotion-dev/remotion (`packages/paths`)
- Version: **4.0.541**, the published npm tarball `remotion-paths-4.0.541.tgz` (`npm pack @remotion/paths@4.0.541`,
  integrity `sha512-q72s57epi76HhVjgIyDCiLwR/38bxcntc8pCXIfqg4qJpu4glgn1FN6fm9MxmvnZNIGUchrdlK8hevxp1elpUQ==`)
- License: MIT, see [LICENSE.md](LICENSE.md) (Copyright (c) 2023 JonnyBurger).

## What we took

From the tarball:

- `dist/esm/index.mjs` → `paths.js` (107383 bytes, sha256 `668850b758146f68e9bd4624738fed4c72a137d8662c3abdb3757e1b4326252f`, the file as vendored, changes included): `centerPath`,
  `cutPath`, `evolvePath`, `extendViewBox`, `getBoundingBox`, `getInstructionIndexAtLength`, `getLength`, `getPointAtLength`,
  `getSubpaths`, `getTangentAtLength`, `interpolatePath`, `interpolatePaths`, `normalizePath`, `parsePath`, `reduceInstructions`,
  `resetPath`, `reversePath`, `scalePath`, `serializeInstructions`, `translatePath`, `warpPath`; used by `KIT.path` (tools/path.js)
- `LICENSE.md` (LICENSE.md in the tarball)

Left out: the CommonJS build, the type declarations and the sources.

## What we changed

`paths.js` is changed from upstream; its first lines say so (`/* Changed from upstream @remotion/paths … */`):

- Wrapped in an IIFE that sets `window.RemotionPaths` instead of `export { … }`: pvk pages are `file://` and load no ES modules.
- The two imports from `remotion/no-react` are replaced by local shims, because the `remotion` package is under the Remotion
  License, not MIT, so it is not vendored:
  - `NoReactInternals.ENABLE_V5_BREAKING_CHANGES = false` (the current v4 behaviour);
  - `interpolate`, a piecewise-linear version (extrapolate `extend` / `clamp` / `identity`, optional `easing`; output ranges may be numbers or arrays of numbers), used only by `interpolatePaths`.

## How it is loaded

- pvk films: `<script src="../../../vendor/paths/paths.js">`, then `<script src="../../../tools/path.js">`, both after `tools/engine.js`.
- HyperFrames films: the renderer (and `preview`) copies this folder to `hf/kit/paths/`, so the page loads `kit/paths/paths.js`, then `kit/path.js`.

## Updating

`npm pack @remotion/paths@<version>` in a scratch folder, take `dist/esm/index.mjs` and `LICENSE.md`, redo the changes above
(wrapper, the two shims, the header), update the version, integrity, size and sha256 above, run
`node tools/selfcheck/motion.mjs path`.

`kit.json` is ours, not upstream: it marks this folder for copying into `hf/kit/paths/` (tools/kit_files.mjs). Keep it when updating.
