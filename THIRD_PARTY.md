# Third-party software and assets

Reelwright's own code is [MIT](LICENSE). This page lists what comes from elsewhere, one row per library. [NOTICE](NOTICE) is the short form.
Every vendored folder keeps its licence file and a `VENDORED.md` (version, integrity hash, what we took, what we changed).

## Shipped in this repository

| What | Where | Licence | Copyright | Used for | Details |
|---|---|---|---|---|---|
| HyperFrames render packages (`producer`, `engine`, `core`, `parsers`, `lint`, `studio-server`) 0.9.19 | `vendor/hyperframes/` | Apache 2.0, [LICENSE](vendor/hyperframes/LICENSE) | Copyright 2026 HeyGen, Inc. | the HyperFrames renderer chain | [VENDORED.md](vendor/hyperframes/VENDORED.md) (upstream commit, what we took, the one small change); upstream's attributions: [CREDITS.md](vendor/hyperframes/CREDITS.md). Upstream has no `NOTICE` file. |
| HyperFrames catalog components and converted blocks | `vendor/hyperframes/registry/components/`, `registry/blocks/`; copies in `projects/*/hf/blocks/` | Apache 2.0 (per-asset licences noted in each `registry-item.json` / upstream CREDITS.md) | HeyGen, Inc. | `reelwright add` | Blocks are rewritten by `tools/blocks.mjs` and start with a "Changed from upstream" header; unsupported blocks are listed in `registry/blocks/UNSUPPORTED.md`. |
| HyperFrames player (`@hyperframes/player`) 0.9.19 | `vendor/hf-player/` | Apache 2.0, [LICENSE](vendor/hf-player/LICENSE) | Copyright 2026 HeyGen, Inc. | `<hyperframes-player>` in the preview page `reelwright embed` writes | [VENDORED.md](vendor/hf-player/VENDORED.md). Unchanged. |
| Files ported from HyperFrames: themes and frame presets, shader-transition GLSL, speed-ramp maths | `tools/` and theme files | Apache 2.0 | HeyGen, Inc. | themes, shader transitions, video speed ramps | Each ported file says so in its header ([themes](docs/playbook/themes.md), [shader transitions](docs/playbook/shader-transitions.md)). |
| **GSAP 3.15.1** (`gsap.min.js` and ten plugins: CustomEase, CustomWiggle, CustomBounce, EasePack, SplitText, DrawSVGPlugin, MorphSVGPlugin, TextPlugin, Physics2DPlugin, PhysicsPropsPlugin) | `vendor/gsap/dist/` | **GSAP "Standard No Charge" licence (Webflow). Not MIT and not OSI open source.** [LICENSE-GSAP.md](vendor/gsap/LICENSE-GSAP.md) | Copyright 2026 GreenSock (GSAP is owned by Webflow, Inc.) | `KIT.gsap` (tools/runtimes.js) | [VENDORED.md](vendor/gsap/VENDORED.md). Unchanged, banners kept (the licence forbids removing them). Reelwright's MIT licence does not cover `vendor/gsap/`; it is free to use under Webflow's terms, which have conditions (read them), and is never exposed in a no-code editor. |
| three.js 0.187.0 (`three.module.js`, `three.core.js`, 7 `addons/`) | `vendor/three/` | MIT, [LICENSE](vendor/three/LICENSE) | Copyright 2010-2026 three.js authors | `KIT.three`, HyperFrames blocks | [VENDORED.md](vendor/three/VENDORED.md). Unchanged. |
| three.js 0.147.0 (`three.min.js` and 8 `examples/js` files) | `vendor/three-r147/` | MIT, [LICENSE](vendor/three-r147/LICENSE) | Copyright 2010-2022 three.js authors | converted HyperFrames blocks written for r147 | [VENDORED.md](vendor/three-r147/VENDORED.md). Unchanged. |
| lottie-web 5.13.0 | `vendor/lottie/` | MIT, [LICENSE.md](vendor/lottie/LICENSE.md) | Copyright (c) 2015 Bodymovin | `KIT.lottie` | [VENDORED.md](vendor/lottie/VENDORED.md). Unchanged. |
| Anime.js 4.5.0 | `vendor/anime/` | MIT, [LICENSE.md](vendor/anime/LICENSE.md) | Copyright (c) 2025 Julian Garnier | `KIT.anime` | [VENDORED.md](vendor/anime/VENDORED.md). Unchanged. |
| MathJax 3.2.2 (`es5/tex-svg-full.js`) | `vendor/mathjax/` | Apache 2.0, [LICENSE](vendor/mathjax/LICENSE) | The MathJax Consortium (the licence file carries only the template copyright line) | `KIT.tex` (TeX to SVG glyph paths) | [VENDORED.md](vendor/mathjax/VENDORED.md). Unchanged; `config.js` and `kit.json` are ours. Upstream has no `NOTICE` file. |
| KaTeX 0.19.1 (`katex.min.js`, `katex.min.css`, 20 `.woff2` fonts) | `vendor/katex/` | MIT, [LICENSE](vendor/katex/LICENSE) | Copyright (c) 2013-2020 Khan Academy and other contributors | `KIT.math.equation` | [VENDORED.md](vendor/katex/VENDORED.md). Unchanged. |
| flubber 0.4.2 | `vendor/flubber/` | MIT, [LICENSE](vendor/flubber/LICENSE) | Copyright (c) 2017 Noah Veltman | shape morphing for `KIT.tex` and `KIT.math` | [VENDORED.md](vendor/flubber/VENDORED.md). Unchanged. Its build bundles d3-array and d3-polygon (BSD-3-Clause, Mike Bostock), earcut (ISC, Mapbox), svg-path-properties (ISC, Roger Veciana i Rovira), svgpath (MIT, Vitaly Puzrin) and topojson-client (ISC, Mike Bostock); see its [THIRD_PARTY.md](vendor/flubber/THIRD_PARTY.md). |
| @remotion/paths 4.0.541 (`paths.js`) | `vendor/paths/` | MIT, [LICENSE.md](vendor/paths/LICENSE.md) | Copyright (c) 2023 JonnyBurger | `KIT.path` (length, tangent, cut, morph, draw-on) | [VENDORED.md](vendor/paths/VENDORED.md). Changed from upstream (classic-script wrapper, two small shims). This one package is MIT; Remotion itself is not (see below). |
| D3 7.9.2 (`d3.min.js`) | `vendor/d3/` | ISC, [LICENSE](vendor/d3/LICENSE) | Copyright 2010-2026 Mike Bostock | converted map blocks | [VENDORED.md](vendor/d3/VENDORED.md). Unchanged. |
| topojson-client 3.1.0 | `vendor/topojson-client/` | ISC, [LICENSE](vendor/topojson-client/LICENSE) | Copyright 2012-2019 Michael Bostock | converted map blocks | [VENDORED.md](vendor/topojson-client/VENDORED.md). Unchanged. |
| us-atlas 3.0.1 (`states-10m.json`) | `vendor/us-atlas/` | ISC, [LICENSE](vendor/us-atlas/LICENSE) | Copyright 2013-2019 Michael Bostock (data derived from US Census Bureau boundary files) | `us-map` blocks | [VENDORED.md](vendor/us-atlas/VENDORED.md). Unchanged. |
| world-atlas 2.0.2 (`countries-110m.json`) | `vendor/world-atlas/` | ISC, [LICENSE](vendor/world-atlas/LICENSE) | Copyright 2013-2019 Michael Bostock (data derived from Natural Earth 4.1.0) | `world-map` block | [VENDORED.md](vendor/world-atlas/VENDORED.md). Unchanged. |
| ui-ux-pro-max-skill data (4 CSVs, commit 4f2dbb6) | `vendor/ui-ux-pro-max/` | MIT, [LICENSE](vendor/ui-ux-pro-max/LICENSE) | Copyright (c) 2024 Next Level Builder | palettes, font pairings and moods for `reelwright theme-brief` | [VENDORED.md](vendor/ui-ux-pro-max/VENDORED.md). Unchanged; data only. |
| 30 font families (Playfair Display, Source Serif 4, Archivo Black, Space Mono, Quicksand, Nunito, Space Grotesk, JetBrains Mono, Fredoka, Shrikhand, Work Sans, Inter Tight, Inter, Cormorant Garamond, Montserrat, Manrope, Syne, Caveat, Patrick Hand, Archivo, Instrument Serif, Libre Baskerville, Barlow, IBM Plex Mono, Bodoni Moda, DM Mono, Hanken Grotesk, Newsreader, EB Garamond, Bebas Neue) | `fonts/<family>/` | SIL OFL 1.1, `OFL.txt` in each folder | per family | text in films | Copyright holders and sources: [fonts/LICENSES.md](fonts/LICENSES.md). |
| Original product-video-kit code | throughout | MIT | Arnavxy and contributors | the base toolkit | Notice kept in [LICENSE](LICENSE). |

Sample films, scripts, the demo apps, synthesised music and sound effects are original and MIT.

## Installed by `setup` or on request, not shipped

| What | Licence | Used for |
|---|---|---|
| [Playwright](https://playwright.dev) and its Chromium | Apache 2.0 (Chromium: BSD-3-Clause and others) | recording, rendering |
| npm packages the HyperFrames code imports (puppeteer-core, hono, linkedom, postcss, acorn, ...) | their own, mostly MIT / Apache 2.0 | rendering HyperFrames films; see `node_modules/*/LICENSE` |
| [ffmpeg](https://ffmpeg.org) | LGPL 2.1+ / GPL 2+ depending on the build | decoding, mixing, encoding |
| [edge-tts](https://github.com/rany2/edge-tts) | LGPL 3.0 | voiceover via Microsoft Edge's online TTS; check Microsoft's terms for your use |
| [NumPy](https://numpy.org) | BSD-3-Clause | audio |
| [Pillow](https://python-pillow.org) | MIT-CMU (HPND) | contact sheets, QA |
| [Remotion](https://www.remotion.dev) (`remotion`, `@remotion/cli` 4.0.540) with React and ReactDOM 19.3.1 (MIT) | Remotion License: **custom, not open source**. Free for individuals, for-profit companies of up to 3 people and non-profits; other companies need a paid Company License ([remotion.pro/license](https://www.remotion.pro/license)). Reelwright grants no Remotion licence and is not affiliated with Remotion. | the optional `renderer: remotion`; installed per project (`projects/<name>/rm/`) only after you answer yes. Never bundled. See [docs/playbook/remotion.md](docs/playbook/remotion.md). |
| [Manim Community Edition](https://www.manim.community) (`manim[typst]==0.22.1`) | MIT | the optional `renderer: manim`; installed with `reelwright manim <project> install ce --yes` into `.venv-manim` by [uv](https://github.com/astral-sh/uv) (MIT / Apache 2.0, you install it first). Its dependency pycairo is LGPL/MPL and stays in that venv. |
| [ManimGL](https://github.com/3b1b/manim) (`manimgl==1.7.2`) | MIT | the optional ManimGL adapter; installed into `.venv-manim-gl` the same way. |
| [Typst](https://typst.app) (the `typst` Python package that `manim[typst]` pulls in) | Apache 2.0 | Manim `MathTypst` equations, so no TeX is needed. Installed inside the Manim venv. |

Reelwright does not install TinyTeX or any other TeX distribution; real LaTeX (`MathTex`) needs one you manage yourself. Nothing from Manim, ManimGL or Remotion is vendored.

## Reference material (no code copied)

- [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill) (MIT): motion archetypes, cubic-bezier curves and stagger budgets, rewritten as theme tokens and PLAYBOOK guidance.
- [greensock/gsap-skills](https://github.com/greensock/gsap-skills) (MIT): the GSAP guidance in the PLAYBOOK.
- GSAP ease formulas: re-implemented from their published math (the GSAP library itself is shipped separately, see above).
- [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) (Apache 2.0): camera shot parameters (zoom amounts, frame counts, curves), rewritten as `KIT.shot.*` in tools/shots.js.
- [alexgreensh/anidoodle](https://github.com/alexgreensh/anidoodle) (Apache 2.0): doodle mechanics (seeded wobble, line boil, draw-on), rewritten as `KIT.doodle.*` in tools/doodle.js and the doodle theme.
- [albertobarnabo/manim-craft](https://github.com/albertobarnabo/manim-craft) (no licence): craft ideas (morph instead of fade, dim the rest, labels not narration) and the idea of the QA WARN checks, rewritten in our own words in the PLAYBOOK and tools/qa; no text or code copied.
- [adithya-s-k/manim_skill](https://github.com/adithya-s-k/manim_skill) (MIT, the Manim CE part only): a list of the primitives and easings people expect, built from scratch as `KIT.math.*` in tools/math.js.
- [cth9191/motion-design](https://github.com/cth9191/motion-design) and [docusphere/claude-skill-motion-graphics](https://github.com/docusphere/claude-skill-motion-graphics) (no licence): only their file formats (the beat-sheet CSV headers and the `timeline[]` JSON) for `reelwright beats`; no text, prompts or code copied.
- [Remotion](https://github.com/remotion-dev/skills) (no licence on the skills repo; Remotion custom licence): only the standard damped-spring maths, no code.
- Manim CE and ManimGL source ([ManimCommunity/manim](https://github.com/ManimCommunity/manim), [3b1b/manim](https://github.com/3b1b/manim), MIT): read as the feature reference for [docs/parity/manim.md](docs/parity/manim.md); the adapter is written from scratch.
- The feature audits in [docs/parity/](docs/parity/) (HyperFrames, Remotion, Manim, doodle and motion, Higgsfield workflows) are our own notes; no code or text copied.

## Not included

- Music you add (e.g. from Mixkit) keeps its own licence and is never committed (`.gitignore`).
- HyperFrames blocks that need WebGPU, three r128, the Draco decoder, clipper-lib, d3-delaunay, audio/video, or unlicensed assets, and HyperFrames' AWS / GCP cloud packages, are not vendored (`vendor/hyperframes/registry/blocks/UNSUPPORTED.md`).
- Remotion, Manim CE, ManimGL, Typst: not vendored (see above).
