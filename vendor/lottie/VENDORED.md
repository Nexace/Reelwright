# Vendored: lottie-web

- Upstream: https://github.com/airbnb/lottie-web
- Version: **5.13.0**, the published npm tarball `lottie-web-5.13.0.tgz` (`npm pack lottie-web@5.13.0`,
  integrity `sha512-+gfBXl6sxXMPe8tKQm7qzLnUy5DUPJPKIyRHwtpCpyUEYjHYRJC/5gjUvdkuO2c3JllrPtHXH5UJJK8LRYl5yQ==`)
- License: MIT, see [LICENSE.md](LICENSE.md) (Copyright Bodymovin).

## What we took

From the tarball, byte for byte:

- `lottie.min.js` (305,704 bytes, sha256 `2eb762973aec914d981f426123040bfac9d26217239605e225ddc7cee17618ac`): from `build/player/`, the full player with the svg, canvas and html renderers; used by `KIT.lottie` (tools/runtimes.js)
- `LICENSE.md` (1,075 bytes, sha256 `9d8d4d8b4bb99572ee8b51025a30b8493d949798cac465c6c15b1b29420bcb06`)

Left out: the split builds (`lottie_svg`, `lottie_canvas`, `lottie_html`, light and `_worker` variants), the worker builds,
and the sources.

## What we changed

Nothing. If you change a file, put this at its top: `/* Changed from upstream lottie-web (MIT): <what and why> */`
and list the change here.

## How it is loaded

- pvk films: `<script src="../../../vendor/lottie/lottie.min.js">` before `tools/runtimes.js`, which loads after `tools/engine.js`.
- HyperFrames films: the renderer (and `preview`) copies this folder to `hf/kit/lottie/`, so the page loads `kit/lottie/lottie.min.js`.

## Updating

`npm pack lottie-web@<version>` in a scratch folder, copy `build/player/lottie.min.js` and `LICENSE.md` over these, update
the version, integrity and sizes above, run `node tools/selfcheck/runtimes.mjs`.

`kit.json` is ours, not upstream: it marks this folder for copying into `hf/kit/lottie/` (tools/kit_files.mjs). Keep it when updating.
