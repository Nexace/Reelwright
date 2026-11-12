# Vendored: topojson-client

- Upstream: https://github.com/topojson/topojson-client
- Version: **3.1.0**, the published npm tarball `topojson-client-3.1.0.tgz` (`npm pack topojson-client@3.1.0`, integrity `sha512-605uxS6bcYxGXw9qi62XyrV6Q3xwbndjachmNxu8HWTtVPxZfEJN9fd/SZS1Q54Sn2y0TMyMxFj/cJINqGHrKw==`)
- License: ISC; see [LICENSE](LICENSE) (Copyright 2012-2019 Michael Bostock). Checked in the tarball's own `LICENSE` and `package.json` (and README for data sources).

## What we took

From the tarball, byte for byte — the UMD bundle (`window.topojson`) the map blocks load:

- `topojson-client.min.js` ← `dist/topojson-client.min.js` (7,169 bytes, sha256 `25cd02ae486cc5063e0215a4e4cfb15de83700c87ac48bac4d57dc6aaf3ebb89`)
- `LICENSE` (734 bytes, sha256 `4c4d15b635e04e691825a76db7d33f7f2033b55669a7430011694f31e6c65999`)

Left out: everything else in the tarball.

## What we changed

Nothing. If you change a file, put this at its top: `/* Changed from upstream topojson-client (ISC): <what and why> */` and list it here.

## How it is loaded

- HyperFrames films only: loaded by `__rwLib` in a converted block from `kit/topojson-client/`. The renderer (and `preview`) copies this folder to `hf/kit/topojson-client/` (tools/kit_files.mjs).


## Updating

`npm pack topojson-client@<version>` in a scratch folder, copy the files above and `LICENSE` over these, update the version, integrity
and sizes, then `node tools/blocks.mjs import <upstream registry/blocks>` (it re-verifies every block).

`kit.json` is ours, not upstream: it marks this folder for copying into `hf/kit/topojson-client/`. Keep it when updating.
