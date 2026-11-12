# Vendored: three.js

- Upstream: https://github.com/mrdoob/three.js
- Version: **0.187.0**, the published npm tarball `three-0.187.0.tgz` (`npm pack three@0.187.0`,
  integrity `sha512-Qiu7R+Cmh8CstZsY1uJOSWnVlfo7ZtNLV7mF8Jltk3LB3AtDu9cRZlcnRKkAk8Y4z6KKw35z7Y7Urd7jWY8etA==`)
- License: MIT, see [LICENSE](LICENSE) (Copyright three.js authors).

## What we took

From the tarball's `build/`, byte for byte:

- `three.module.js` (658,900 bytes, sha256 `104f56145899722094556490d787aae0617cc2fc3382f31df02d724ea1aee341`): the WebGL build, used by `KIT.three` (tools/runtimes.js)
- `three.core.js` (1,474,799 bytes, sha256 `613e370f76638fdef83926642bf256dc9615684922de1ce1f63a8583e5d78578`): imported by `three.module.js`
- `LICENSE` (1,081 bytes, sha256 `8b378ebe60e2fe500158cb0ac71cb5e8b7d92953c2abcc63a0eb90499653b5bc`)

Both JS files are unminified: 0.187 ships no minified or classic-script build, it is ESM only.

From the tarball's `examples/jsm/`, byte for byte, into `addons/` (same sub-paths): the addons the vendored HyperFrames
blocks import (`three/addons/…`, mapped to `kit/three/addons/` by the block's import map, tools/blocks.mjs), and what
those import. Same MIT LICENSE; each file's own header names its authors.

- `addons/environments/RoomEnvironment.js` ← `examples/jsm/environments/RoomEnvironment.js` (4960 bytes, sha256 `55f466192cc84298755a424c5e040345006b2ee1455589b3b54126c2ea4123f4`)
- `addons/geometries/RoundedBoxGeometry.js` ← `examples/jsm/geometries/RoundedBoxGeometry.js` (6470 bytes, sha256 `c5feab96123858ed8823c889b238dc8734adab7e760e3cfd21e7f3f2f3e348e3`)
- `addons/geometries/TextGeometry.js` ← `examples/jsm/geometries/TextGeometry.js` (3312 bytes, sha256 `edf69c1cd6087c84d020156d1adbb29b40b098e4cbe8da4c0c36bbadc58dceac`)
- `addons/loaders/FontLoader.js` ← `examples/jsm/loaders/FontLoader.js` (5364 bytes, sha256 `cf9ecc7c4615763cf6ca473736b2055291b663103c7790e745f917dd2bdcb1bc`)
- `addons/loaders/GLTFLoader.js` ← `examples/jsm/loaders/GLTFLoader.js` (119861 bytes, sha256 `532ac726e120039acbcd6cf54328c57acbf7b438176afaa6951257126d11bff1`)
- `addons/utils/BufferGeometryUtils.js` ← `examples/jsm/utils/BufferGeometryUtils.js` (39153 bytes, sha256 `7bda2a8ba836b2bcf67cb938d4b9e1bb5d1b1bc616817103ed858c0b58296ce7`)
- `addons/utils/SkeletonUtils.js` ← `examples/jsm/utils/SkeletonUtils.js` (11535 bytes, sha256 `b1632a703206c3d830de9fcbe515696770d04b71a15ee6b50afa6d2c3298c86f`)

Left out: `three.cjs` (it now only re-exports the ESM via `require`), the webgpu and tsl builds, every other `examples/` file, `src/`.

## What we changed

Nothing. If you change a file, put this at its top: `/* Changed from upstream three.js (MIT): <what and why> */`
and list the change here.

## How it is loaded

- No script tag. `KIT.three` imports `three.module.js` with a dynamic `import()` on first use.
- pvk films: this works because the renderer launches Chromium with `--allow-file-access-from-files`.
- HyperFrames films and `preview`: the folder is copied to `hf/kit/three/` and the module is imported over http from `kit/three/three.module.js`.

## Updating

`npm pack three@<version>` in a scratch folder, copy `build/three.module.js`, `build/three.core.js`, `LICENSE` and the
`addons/` files (from `examples/jsm/`) over these,
update the version, integrity and sizes above, run `node tools/selfcheck/runtimes.mjs`. If a release ships a different
file layout, check what `three.module.js` imports before copying.

`kit.json` is ours, not upstream: it marks this folder for copying into `hf/kit/three/` (tools/kit_files.mjs). Keep it when updating.
