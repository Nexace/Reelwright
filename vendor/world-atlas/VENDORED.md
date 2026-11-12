# Vendored: world-atlas

- Upstream: https://github.com/topojson/world-atlas
- Version: **2.0.2**, the published npm tarball `world-atlas-2.0.2.tgz` (`npm pack world-atlas@2.0.2`, integrity `sha512-IXfV0qwlKXpckz1FhwXVwKRjiIhOnWttOskm5CtxMsjgE/MXAYRHWJqgXOpM8IkcPBoXnyTU5lFHcYa5ChG0LQ==`)
- License: ISC; see [LICENSE](LICENSE) (Copyright 2013-2019 Michael Bostock). Checked in the tarball's own `LICENSE` and `package.json` (and README for data sources).

## What we took

From the tarball, byte for byte — country boundaries (TopoJSON) the world-map block fetches; derived from Natural Earth 4.1.0 (README):

- `countries-110m.json` ← `countries-110m.json` (107,761 bytes, sha256 `2516c915867c7baf18ddec727aec46c315541a07cfb3d79a6559b05d5e94eee8`)
- `LICENSE` (734 bytes, sha256 `8048290dfdb6e83fbed17e8985c8cfc4ce9da9b842642f3d3e497280790cfa31`)

Left out: everything else in the tarball.

## What we changed

Nothing. If you change a file, put this at its top: `/* Changed from upstream world-atlas (ISC): <what and why> */` and list it here.

## How it is loaded

- HyperFrames films only: fetched by converted blocks from `kit/world-atlas/`. The renderer (and `preview`) copies this folder to `hf/kit/world-atlas/` (tools/kit_files.mjs).


## Updating

`npm pack world-atlas@<version>` in a scratch folder, copy the files above and `LICENSE` over these, update the version, integrity
and sizes, then `node tools/blocks.mjs import <upstream registry/blocks>` (it re-verifies every block).

`kit.json` is ours, not upstream: it marks this folder for copying into `hf/kit/world-atlas/`. Keep it when updating.
