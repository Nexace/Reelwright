# Vendored: es-atlas

- Upstream: https://github.com/martgnz/es-atlas
- Version: **0.6.0**, the published npm tarball `es-atlas-0.6.0.tgz` (`npm pack es-atlas@0.6.0`, integrity `sha512-+sl1xwndSaM1E1EnjBAFBOldyXATld4GbDIJvvSzbgPKgK6lDJ0vVZ1rOdEtucysWLdxChKWhtCZ2SdkzbF/fg==`)
- License: MIT (code); data CC-BY 4.0, © Instituto Geográfico Nacional de España (README "Data license"); see [LICENSE](LICENSE) (Copyright (c) 2016-2018 Martín González). Checked in the tarball's own `LICENSE` and `package.json` (and README for data sources).

## What we took

From the tarball, byte for byte — Spain's autonomous regions (TopoJSON) the spain-map block fetches; data from the IGN's National Reference Geographic Equipment:

- `es/autonomous_regions.json` ← `es/autonomous_regions.json` (37,420 bytes, sha256 `c99ec36ed214619ab680de4dca8c5aefe36753f20cfe3efe10051d4d1e10b6dc`)
- `LICENSE` (1,079 bytes, sha256 `6565750cedfd15784bc83d974db4c38dc592d68c1f4352a6f934ff9fb3d623c9`)

Left out: everything else in the tarball.

## What we changed

Nothing. If you change a file, put this at its top: `/* Changed from upstream es-atlas (MIT): <what and why> */` and list it here.

## How it is loaded

- HyperFrames films only: fetched by converted blocks from `kit/es-atlas/`. The renderer (and `preview`) copies this folder to `hf/kit/es-atlas/` (tools/kit_files.mjs).
- Credit when the map is shown: "Map data © Instituto Geográfico Nacional de España (CC-BY 4.0)".

## Updating

`npm pack es-atlas@<version>` in a scratch folder, copy the files above and `LICENSE` over these, update the version, integrity
and sizes, then `node tools/blocks.mjs import <upstream registry/blocks>` (it re-verifies every block).

`kit.json` is ours, not upstream: it marks this folder for copying into `hf/kit/es-atlas/`. Keep it when updating.
