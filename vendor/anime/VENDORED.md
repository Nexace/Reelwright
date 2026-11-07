# Vendored: Anime.js

- Upstream: https://github.com/juliangarnier/anime
- Version: **4.5.0**, the published npm tarball `animejs-4.5.0.tgz` (`npm pack animejs@4.5.0`,
  integrity `sha512-NQimYX+lz8WaXonGS9zVVoviCIAjONeJayxacUditaivYLqyXgGjFKjuyl0aUUhFKm5MriX9ty1TGovNzoJQWA==`)
- License: MIT, see [LICENSE.md](LICENSE.md) (Copyright Julian Garnier).

## What we took

From the tarball, byte for byte:

- `anime.umd.min.js` (118,043 bytes, sha256 `8d5b3a58a1f64023a04a4cedeef135a2263b18da04b35177ac13438a0bad033b`): from `dist/bundles/`, the classic-script (UMD) build; used by `KIT.anime` (tools/runtimes.js)
- `LICENSE.md` (1,075 bytes, sha256 `3f3e835a9952cfc2a6ca836fb95b3257c981f24fa3ef51249055acb09931897b`)

Left out: the ESM bundle and the `modules/` builds, types and sources.

## What we changed

Nothing. If you change a file, put this at its top: `/* Changed from upstream Anime.js (MIT): <what and why> */`
and list the change here.

## How it is loaded

- pvk films: `<script src="../../../vendor/anime/anime.umd.min.js">` before `tools/runtimes.js`, which loads after `tools/engine.js`.
- HyperFrames films: the renderer (and `preview`) copies this folder to `hf/kit/anime/`, so the page loads `kit/anime/anime.umd.min.js`.

## Updating

`npm pack animejs@<version>` in a scratch folder, copy `dist/bundles/anime.umd.min.js` and `LICENSE.md` over these, update
the version, integrity and sizes above, run `node tools/selfcheck/runtimes.mjs`.

`kit.json` is ours, not upstream: it marks this folder for copying into `hf/kit/anime/` (tools/kit_files.mjs). Keep it when updating.
