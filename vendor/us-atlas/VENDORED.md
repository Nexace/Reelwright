# Vendored: us-atlas

- Upstream: https://github.com/topojson/us-atlas
- Version: **3.0.1**, the published npm tarball `us-atlas-3.0.1.tgz` (`npm pack us-atlas@3.0.1`, integrity `sha512-wEIZCq0ImPvGblTd8gZMqNNCPkQshugMUG/8nkSWXb02+XqNFREg9atHOKP9w6prLZTpqcLhSvdBW81MkV3/0Q==`)
- License: ISC; see [LICENSE](LICENSE) (Copyright 2013-2019 Michael Bostock). Checked in the tarball's own `LICENSE` and `package.json` (and README for data sources).

## What we took

From the tarball, byte for byte — US state boundaries (TopoJSON) the us-map blocks fetch; derived from the US Census Bureau's 2017 cartographic boundary files (README):

- `states-10m.json` ← `states-10m.json` (114,554 bytes, sha256 `d76b391ccfa8bff601d51e3e3da5d43a89fa46cd5caca72ce731b383be5596d0`)
- `LICENSE` (734 bytes, sha256 `8048290dfdb6e83fbed17e8985c8cfc4ce9da9b842642f3d3e497280790cfa31`)

Left out: everything else in the tarball.

## What we changed

Nothing. If you change a file, put this at its top: `/* Changed from upstream us-atlas (ISC): <what and why> */` and list it here.

## How it is loaded

- HyperFrames films only: fetched by converted blocks from `kit/us-atlas/` (tools/blocks.mjs rewrites the jsDelivr URL). The renderer (and `preview`) copies this folder to `hf/kit/us-atlas/` (tools/kit_files.mjs).


## Updating

`npm pack us-atlas@<version>` in a scratch folder, copy the files above and `LICENSE` over these, update the version, integrity
and sizes, then `node tools/blocks.mjs import <upstream registry/blocks>` (it re-verifies every block).

`kit.json` is ours, not upstream: it marks this folder for copying into `hf/kit/us-atlas/`. Keep it when updating.
