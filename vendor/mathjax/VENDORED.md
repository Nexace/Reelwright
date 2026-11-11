# Vendored: MathJax

- Upstream: https://github.com/mathjax/MathJax
- Version: **3.2.2**, the published npm tarball `mathjax-3.2.2.tgz` (`npm pack mathjax@3.2.2`,
  integrity `sha512-Bt+SSVU8eBG27zChVewOicYs7Xsdt40qm4+UpHyX7k0/O9NliPc+x77k1/FEsPsjKPZGJvtRZM1vO+geW0OhGw==`)
- License: Apache-2.0, see [LICENSE](LICENSE). Upstream has no `NOTICE` file.

## What we took

From the tarball, byte for byte:

- `es5/tex-svg-full.js` (2,275,113 bytes, sha256 `a4354ff94fd868aea0cc6eaaa79a57fda0588646fc46ee3700a349ee0a11cbe6`): the TeX input and
  SVG output component with every TeX extension bundled; `MathJax.tex2svg`, used by `KIT.tex` (tools/tex.js)
- `LICENSE` (11,358 bytes, sha256 `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`)

Why `tex-svg-full.js`, not `tex-svg.js`: `tex-svg.js` autoloads extensions such as `color` and `cancel` from its own folder the
first time a formula uses them, a fetch at run time that fails offline and makes the first frame differ from the rest. The full
build has them all inside, so nothing is fetched (tools/selfcheck/tex-offline.mjs checks this with the network blocked).

Why 3.2.2, not 4.x: MathJax 4 loads its font data in pieces on demand, so a render would fetch files at run time (the same
offline risk). 3.2.2 has its fonts inside the component.

Left out: everything else in the 24 MB package (the other `es5/` components, `es5/input/` and `es5/output/` pieces, the a11y,
menu and sre parts, fonts for CHTML output).

## What we changed

Nothing. If you change a file, put this at its top: `/* Changed from upstream MathJax (Apache-2.0): <what and why> */`
and list the change here (Apache-2.0 section 4b asks that changed files say so).

## How it is loaded

- `config.js` is ours, not upstream: it sets `window.MathJax` (no page typesetting, no menu or assistive parts, glyphs as inline
  `<path>`s with `fontCache: 'none'`) and must load before `tex-svg-full.js`.
- pvk films: `<script src="../../../vendor/mathjax/config.js">`, then `…/tex-svg-full.js`, then `vendor/flubber/flubber.min.js`
  and `tools/tex.js`.
- HyperFrames films: the renderer (and `preview`) copies this folder to `hf/kit/mathjax/`, so the page loads
  `kit/mathjax/config.js` and `kit/mathjax/tex-svg-full.js`.

## Updating

`npm pack mathjax@<3.x version>` in a scratch folder, copy `es5/tex-svg-full.js` and `LICENSE` over these, update the version,
integrity and sizes above, run `node tools/selfcheck/motion.mjs tex` and `node tools/selfcheck/tex-offline.mjs`.

`kit.json` is ours, not upstream: it marks this folder for copying into `hf/kit/mathjax/` (tools/kit_files.mjs). Keep it when updating.
