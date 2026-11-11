# Vendored: D3

- Upstream: https://github.com/d3/d3
- Version: **7.9.2**, the published npm tarball `d3-7.9.2.tgz` (`npm pack d3@7.9.2`, integrity `sha512-ZKb/mONPVKzaO5UlcWcwN8bS4ezvQaYu+bsou+XgNABdGC800kwH651ADTbbTxMPHW13UlvbQafdmJQDk1w7Mg==`)
- License: ISC; see [LICENSE](LICENSE) (Copyright 2010-2026 Mike Bostock). Checked in the tarball's own `LICENSE` and `package.json` (and README for data sources).

## What we took

From the tarball, byte for byte — the UMD bundle (`window.d3`) the map blocks (us-map, world-map, …) load:

- `d3.min.js` ← `dist/d3.min.js` (280,622 bytes, sha256 `912111098ea99503a6f4967361d2bbdc9dbf58cf9c678c8e27e5b02d1a07f0c1`)
- `LICENSE` (731 bytes, sha256 `2a6d2d5f32ba0b755ddbc1c833f766e30cdbe6ebe9a6d4e3e24427721f0b63d3`)

Left out: everything else in the tarball.

## What we changed

Nothing. If you change a file, put this at its top: `/* Changed from upstream D3 (ISC): <what and why> */` and list it here.

## How it is loaded

- HyperFrames films only: loaded by `__rwLib` in a converted block from `kit/d3/`. The renderer (and `preview`) copies this folder to `hf/kit/d3/` (tools/kit_files.mjs).


## Updating

`npm pack d3@<version>` in a scratch folder, copy the files above and `LICENSE` over these, update the version, integrity
and sizes, then `node tools/blocks.mjs import <upstream registry/blocks>` (it re-verifies every block).

`kit.json` is ours, not upstream: it marks this folder for copying into `hf/kit/d3/`. Keep it when updating.
