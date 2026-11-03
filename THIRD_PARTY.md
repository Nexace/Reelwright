# Third-party software and assets

Reelwright's own code is [MIT](LICENSE). This page lists what comes from elsewhere. [NOTICE](NOTICE) is the short form.

## Shipped in this repository

| What | Where | License | Notes |
|---|---|---|---|
| HyperFrames render packages (`producer`, `engine`, `core`, `parsers`, `lint`, `studio-server`) 0.8.217 | `vendor/hyperframes/` | Apache 2.0, [LICENSE](vendor/hyperframes/LICENSE) | Copyright HeyGen. Upstream commit, what we took and what we changed: [VENDORED.md](vendor/hyperframes/VENDORED.md). Upstream's attributions: [CREDITS.md](vendor/hyperframes/CREDITS.md). Upstream has no `NOTICE` file. |
| HyperFrames catalog components | `vendor/hyperframes/registry/components/`; copies in `projects/*/hf/blocks/` | Apache 2.0 | Copies made by `reelwright add` start with a header naming the source; otherwise unchanged. |
| KaTeX 0.19.1 (`katex.min.js`, `katex.min.css`, 20 `.woff2` fonts) | `vendor/katex/` | MIT, [LICENSE](vendor/katex/LICENSE) | Copyright Khan Academy and contributors. Typesets `KIT.math.equation` (tools/math.js). Unchanged; what we took: [VENDORED.md](vendor/katex/VENDORED.md). |
| 19 font families (Playfair Display, Source Serif 4, Archivo Black, Space Mono, Quicksand, Nunito, Space Grotesk, JetBrains Mono, Fredoka, Shrikhand, Work Sans, Inter Tight, Inter, Cormorant Garamond, Montserrat, Manrope, Syne, Caveat, Patrick Hand) | `fonts/<family>/` | SIL OFL 1.1, `OFL.txt` in each folder | Copyright holders and sources: [fonts/LICENSES.md](fonts/LICENSES.md). |
| Original product-video-kit code | throughout | MIT | By Arnavxy and contributors; notice kept in [LICENSE](LICENSE). |

Sample films, scripts, the demo apps, synthesised music and sound effects are original and MIT.

## Installed by `setup`, not shipped

| What | License | Used for |
|---|---|---|
| [Playwright](https://playwright.dev) and its Chromium | Apache 2.0 (Chromium: BSD-3-Clause and others) | recording, rendering |
| npm packages the HyperFrames code imports (puppeteer-core, hono, linkedom, postcss, acorn, …) | their own, mostly MIT / Apache 2.0 | rendering HyperFrames films; see `node_modules/*/LICENSE` |
| [ffmpeg](https://ffmpeg.org) | LGPL 2.1+ / GPL 2+ depending on the build | decoding, mixing, encoding |
| [edge-tts](https://github.com/rany2/edge-tts) | LGPL 3.0 | voiceover via Microsoft Edge's online TTS — check Microsoft's terms for your use |
| [NumPy](https://numpy.org) | BSD-3-Clause | audio |
| [Pillow](https://python-pillow.org) | MIT-CMU (HPND) | contact sheets, QA |

## Reference material (no code copied)

- [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill) (MIT): motion archetypes, cubic-bezier curves and stagger budgets, rewritten as theme tokens and PLAYBOOK guidance.
- [greensock/gsap-skills](https://github.com/greensock/gsap-skills) (MIT): the GSAP guidance in the PLAYBOOK.
- GSAP ease formulas: re-implemented from their published math; GSAP itself is not shipped (Webflow "Standard No Charge" license).
- [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) (Apache 2.0): camera shot parameters (zoom amounts, frame counts, curves), rewritten as `KIT.shot.*` in tools/shots.js.
- [alexgreensh/anidoodle](https://github.com/alexgreensh/anidoodle) (Apache 2.0): doodle mechanics (seeded wobble, line boil, draw-on), rewritten as `KIT.doodle.*` in tools/doodle.js and the doodle theme.
- [Remotion](https://github.com/remotion-dev/skills) (no license on the skills repo; Remotion custom license): only the standard damped-spring maths, no code.

## Not included

- Music you add (e.g. from Mixkit) keeps its own license and is never committed (`.gitignore`).
- HyperFrames catalog *blocks* (they load GSAP, under the non-OSI GSAP Standard License, and fonts from CDNs) and
  HyperFrames' AWS / GCP cloud packages are not vendored.
