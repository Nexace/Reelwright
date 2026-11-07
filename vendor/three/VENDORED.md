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

Left out: `three.cjs` (it now only re-exports the ESM via `require`), the webgpu and tsl builds, `examples/` and addons, `src/`.

## What we changed

Nothing. If you change a file, put this at its top: `/* Changed from upstream three.js (MIT): <what and why> */`
and list the change here.

## How it is loaded

- No script tag. `KIT.three` imports `three.module.js` with a dynamic `import()` on first use.
- pvk films: this works because the renderer launches Chromium with `--allow-file-access-from-files`.
- HyperFrames films and `preview`: the folder is copied to `hf/kit/three/` and the module is imported over http from `kit/three/three.module.js`.

## Updating

`npm pack three@<version>` in a scratch folder, copy `build/three.module.js`, `build/three.core.js` and `LICENSE` over these,
update the version, integrity and sizes above, run `node tools/selfcheck/runtimes.mjs`. If a release ships a different
file layout, check what `three.module.js` imports before copying.

`kit.json` is ours, not upstream: it marks this folder for copying into `hf/kit/three/` (tools/kit_files.mjs). Keep it when updating.
