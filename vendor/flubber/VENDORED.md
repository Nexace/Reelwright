# Vendored: flubber

- Upstream: https://github.com/veltman/flubber
- Version: **0.4.2**, the published npm tarball `flubber-0.4.2.tgz` (`npm pack flubber@0.4.2`,
  integrity `sha512-79RkJe3rA4nvRCVc2uXjj7U/BAUq84TS3KHn6c0Hr9K64vhj83ZNLUziNx4pJoBumSPhOl5VjH+Z0uhi+eE8Uw==`)
- License: MIT, see [LICENSE](LICENSE) (Copyright (c) 2017 Noah Veltman). Upstream has no `NOTICE` file.

## What we took

From the tarball, byte for byte:

- `build/flubber.min.js` (53,509 bytes, sha256 `5f04395eabfef5048e3e779da3624834fa873c4ccee3b5b5f6134298ba675ae4`): the UMD
  build, `window.flubber` (`interpolate`, `separate`, `combine`, `interpolateAll`, `splitPathString`, …), used by `KIT.tex`
  glyph morphs (tools/tex.js) and the KIT.math morphs (tools/math2.js)
- `LICENSE` (1,069 bytes, sha256 `3eb888ef31044c40757fe52030e381d2b7ec6ef5e90379920ea18b98ac32d187`)

The build bundles flubber's dependencies (their licences are in [THIRD_PARTY.md](THIRD_PARTY.md)): d3-array 1.x and d3-polygon 1.x
(BSD-3-Clause), earcut 2.x (ISC), svg-path-properties 0.2.x (ISC), svgpath 2.x (MIT), topojson-client 3.x (ISC).

Left out: `build/flubber.js` (the same, unminified), `index.js`, `src/`, the demos.

## What we changed

Nothing. If you change a file, put this at its top: `/* Changed from upstream flubber (MIT): <what and why> */`
and list the change here.

## How it is loaded

- pvk films: `<script src="../../../vendor/flubber/flubber.min.js">` before `tools/tex.js` (or `tools/math2.js`).
- HyperFrames films: the renderer (and `preview`) copies this folder to `hf/kit/flubber/`, so the page loads `kit/flubber/flubber.min.js`.
- flubber is deterministic (no randomness, no clocks): the interpolators are built once at load and called with p in render(t).

## Updating

`npm pack flubber@<version>` in a scratch folder, copy `build/flubber.min.js` and `LICENSE` over these, update the version,
integrity and sizes above, check the bundled dependency list against its `package.json`, run `node tools/selfcheck/motion.mjs`.

`kit.json` is ours, not upstream: it marks this folder for copying into `hf/kit/flubber/` (tools/kit_files.mjs). Keep it when updating.
