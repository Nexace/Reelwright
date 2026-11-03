# Vendored: KaTeX

- Upstream: https://github.com/KaTeX/KaTeX
- Version: **0.19.1**, the published npm tarball `katex-0.19.1.tgz` (`npm pack katex@0.19.1`,
  integrity `sha512-jG8uKntjSEcm2EpQOh0XturpPuuC9r3Sq5HLHdsFdWZT27E672SF19QEi+of0/YeOy15lDgRhKvr5614uRrEfA==`)
- License: MIT, see [LICENSE](LICENSE) (Copyright Khan Academy and other contributors). Upstream has no `NOTICE` file.

## What we took

From the tarball's `dist/`, byte for byte:

- `katex.min.js` (273,081 bytes, sha256 `fa140498…a74bc`): `katex.renderToString`, used by `KIT.math.equation` (tools/math.js)
- `katex.min.css` (24,793 bytes, sha256 `00e0b094…f4dcf`): layout and the `@font-face` rules
- `fonts/*.woff2`: the 20 KaTeX font faces (about 296 KB together)

Left out: the `.woff` and `.ttf` fonts, `katex.js`/`katex.mjs`/`katex.css`, `contrib/`, `src/`, the CLI and types.
`katex.min.css` still lists `.woff` and `.ttf` after each `.woff2` in its `src:`; Chromium uses the first format it
supports (woff2), so the missing files are never requested and the CSS needs no change.

## What we changed

Nothing. If you change a file, put this at its top: `/* Changed from upstream KaTeX (MIT): <what and why> */`
and list the change here.

## How it is loaded

- pvk films: `<link rel="stylesheet" href="../../../vendor/katex/katex.min.css">` in `<head>` and
  `<script src="../../../vendor/katex/katex.min.js">` before `tools/math.js`.
- HyperFrames films: the renderer (and `preview`) copies this folder to `hf/kit/katex/`, so the page loads
  `kit/katex/katex.min.css` and `kit/katex/katex.min.js`; the CSS's relative `fonts/…` URLs resolve beside it.
- The engine loads every declared font face at start-up, so `document.fonts.ready` (which renders wait on) covers KaTeX's.

## Updating

`npm pack katex@<version>` in a scratch folder, copy `dist/katex.min.js`, `dist/katex.min.css`, `dist/fonts/*.woff2`
and `LICENSE` over these, update the version, integrity and sizes above, run `node tools/motion-check.mjs` and a film
that uses `KIT.math.equation`.
