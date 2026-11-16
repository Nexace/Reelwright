# Vendored: polygon-clipping

- Upstream: https://github.com/mfogel/polygon-clipping
- Version: **0.15.7**, the published npm tarball `polygon-clipping-0.15.7.tgz` (`npm pack polygon-clipping@0.15.7`,
  integrity `sha512-nhfdr83ECBg6xtqOAJab1tbksbBAOMUltN60bU+llHVOL0e5Onm1WpAXXWXVB39L8AJFssoIhEVuy/S90MmotA==`)
- License: MIT, see [LICENSE](LICENSE) (the tarball's `LICENSE.md`: Copyright (c) 2018 Mike Fogel, and (c) 2016 Alexander Milevski for the parts from martinez).
- Owner ruling 2026-11-13 (Phase 11, row `manim:m6.5`): vendor it for `KIT.math.bool` (Union, Difference, Intersection, Exclusion).

## What we took

From the tarball, byte for byte: `dist/polygon-clipping.umd.min.js` (29 KB; sets `window.polygonClipping`) and `LICENSE.md` (as `LICENSE`).

Left out: the cjs/esm/unminified UMD builds, the `.d.ts`, the source map, the README.

## What we changed

Nothing. If you change a file, put `/* Changed from upstream polygon-clipping (MIT): <what and why> */` at its top and list it here.

## How it is loaded

- pvk films: `<script src="../../../vendor/polygon-clipping/polygon-clipping.umd.min.js">` before `tools/manim-grid.js`.
- HyperFrames films: the renderer copies this folder to `hf/kit/polygon-clipping/`, so the page loads `kit/polygon-clipping/polygon-clipping.umd.min.js`.
- Deterministic (no randomness, no clocks): `KIT.math.bool` runs it once at load on sampled outlines; frames only read the result.

## Updating

`npm pack polygon-clipping@<version>` in a scratch folder, copy `dist/polygon-clipping.umd.min.js` and `LICENSE.md` over these,
update the version, integrity and size above, run `node tools/selfcheck/p4-bool.mjs` and `node tools/selfcheck/motion.mjs p4-grid`.

`kit.json` is ours, not upstream (it marks this folder for `hf/kit/` copying). Keep it when updating.
