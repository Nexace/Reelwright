# Vendored: three.js

- Upstream: https://github.com/mrdoob/three.js
- Version: **0.147.0**, the published npm tarball `three-0.147.0.tgz` (`npm pack three@0.147.0`, integrity `sha512-LPTOslYQXFkmvceQjFTNnVVli2LaVF6C99Pv34fJypp8NbQLbTlu3KinZ0zURghS5zEehK+VQyvWuPZ/Sm8fzw==`)
- License: MIT; see [LICENSE](LICENSE) (Copyright © 2010-2022 three.js authors). Checked in the tarball's own `LICENSE` and `package.json` (and README for data sources).

## What we took

From the tarball, byte for byte — the classic global build (`window.THREE`) that HyperFrames blocks written for r147 load with `<script src>`; the ES-module three (vendor/three/, r187) can't stand in for it:

- `three.min.js` ← `build/three.min.js` (607,784 bytes, sha256 `f34446bf875b5fb0dcd93819ffe1d9e182d46634ee855f5d904c6c4ac7cdbc95`)
- `examples/js/postprocessing/EffectComposer.js` ← `examples/js/postprocessing/EffectComposer.js` (6,241 bytes, sha256 `6c8bf2f6b06778fdadf7cfd09ef4c17d881428d1cdee953e3348b3f54df4bc75`)
- `examples/js/postprocessing/RenderPass.js` ← `examples/js/postprocessing/RenderPass.js` (1,741 bytes, sha256 `3c1a07df004b36c1fac6af2a443953ef589f88fb024dd0f01d5f9f6252dfc371`)
- `examples/js/postprocessing/ShaderPass.js` ← `examples/js/postprocessing/ShaderPass.js` (1,485 bytes, sha256 `f0d8d767e089c99ad04f6714cd4fac29363d6b0207543cd4335922ea143856a6`)
- `examples/js/postprocessing/UnrealBloomPass.js` ← `examples/js/postprocessing/UnrealBloomPass.js` (12,675 bytes, sha256 `1a5b8476addc578c179200bed5a0da54bb176c1b41ef89d2174ff76b0a4410e7`)
- `examples/js/postprocessing/MaskPass.js` ← `examples/js/postprocessing/MaskPass.js` (2,202 bytes, sha256 `07734485ca2a1b57aa059a45f52af6994948230864ca686ffc42dbb3351fa61a`)
- `examples/js/postprocessing/Pass.js` ← `examples/js/postprocessing/Pass.js` (1,514 bytes, sha256 `56d47570c58858823bb644da48c4f49fa0eb9681e72674790dafb142fef7f056`)
- `examples/js/shaders/CopyShader.js` ← `examples/js/shaders/CopyShader.js` (597 bytes, sha256 `249592106188290488cb9419fc6231b701983cdc23c25c7805536cf06800ff48`)
- `examples/js/shaders/LuminosityHighPassShader.js` ← `examples/js/shaders/LuminosityHighPassShader.js` (1,218 bytes, sha256 `3c8552bb514a01009c07eb17e576f14db43cff64ce8cfab01667ab8db2e85afe`)
- `LICENSE` (1,081 bytes, sha256 `fbf3943930dacbf56aabb8dc5d816440bd16aa6f4cc78ddbdf12106ee1807832`)

Left out: everything else in the tarball.

## What we changed

Nothing. If you change a file, put this at its top: `/* Changed from upstream three.js (MIT): <what and why> */` and list it here.

## How it is loaded

- HyperFrames films only: the r147 global build, loaded by `__rwLib` in a converted block (tools/blocks.mjs) from `kit/three-r147/`; `examples/js/` are the classic (global `THREE.*`) addons blocks load beside it. The renderer (and `preview`) copies this folder to `hf/kit/three-r147/` (tools/kit_files.mjs).
- Don't mix r147 blocks in one film with another global three: the last one loaded owns `window.THREE`.

## Updating

`npm pack three@<version>` in a scratch folder, copy the files above and `LICENSE` over these, update the version, integrity
and sizes, then `node tools/blocks.mjs import <upstream registry/blocks>` (it re-verifies every block).

`kit.json` is ours, not upstream: it marks this folder for copying into `hf/kit/three-r147/`. Keep it when updating.
