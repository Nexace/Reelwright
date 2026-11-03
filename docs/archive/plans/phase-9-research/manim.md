# Phase 9 research: Manim skills (manim-craft, manim_skill) and the math-animation decision

Verified 2026-11-02 by reading clones in scratch/phase9/src/ plus PyPI, npm and GitHub license APIs.
Nothing was installed. Anything not read directly is marked UNVERIFIED.

## 1. albertobarnabo/manim-craft

What it is: a Claude skill that makes Manim CE scenes look and move better. It contains prose rules, three
3b1b scenes ported from manimgl to CE, and Python/shell lint scripts. It is not a renderer. Requirements in its
README: Manim CE ≥ 0.19, ffmpeg/ffprobe, Python 3.11+, with LaTeX optional ("assumes it may be broken").

**License: NONE at the repo root.** `gh api repos/albertobarnabo/manim-craft/license` returns 404, and there is
no LICENSE file in skill/ or scripts/. Only `sources/3b1b/` and `examples/*/original_manimgl.py` are covered
(MIT, © 3Blue1Brown, copy in `sources/3b1b/LICENSE_manim.md`). Everything else is all-rights-reserved by
default, so REWRITE from documented behaviour only. Do not copy text or code.

| Feature | File | Status in Reelwright |
|---|---|---|
| Storyboard → stills → look → animate → contact sheet loop | SKILL.md "The loop" | COVERED: AGENTS.md step 3, `sched` + `stills` → stills/sheet.jpg (tools/sheet.py), `preview` |
| Named "Moves": Morph-Don't-Fade, Grid-Warp, Establish-Push-In, Orbit-Reveal, Collapse-Dimension, Rack-Focus, Ticker, Trace-Build | SKILL.md table | Push-In: COVERED by camAt keyframes (tools/engine.js). Ticker: COVERED by `K.count` (engine.js:305). Rack-Focus (dim the rest to 0.2–0.3 opacity): GAP, docs only. Morph, Trace-Build (draw-on along a path with a moving dot), Grid-Warp: GAP, need math primitives (§3). Orbit-Reveal and Collapse-Dimension (3D surfaces): OUT OF SCOPE for product films, need a 3D engine |
| Hard rule 10: caption bands cut and never crossfade (two texts in one band overlapping during a fade are unreadable) | SKILL.md, references/landmines.md §12, scripts/caption_slot.py | Partly COVERED (karaoke captions are one element). GAP as a PLAYBOOK rule plus a QA check for overlapping text during transitions |
| Hard rule 13: narration is spoken, never printed; on-screen Text over 6 words is flagged `WORDY-TEXT` | SKILL.md, scripts/craft.py (`WORDY_MAX = 6`) | GAP as a lint. PLAYBOOK has story rules but no word-count lint on on-screen text |
| Hard rule 14 / pace_lint: ≤ 2.5 words/s, ≥ 0.35 s gap between cues, ≥ 15 % of the scene unnarrated | scripts/pace_lint.py (`WORDS_PER_SEC=2.5, MIN_GAP=0.35, MIN_SILENCE_FRAC=0.15`) | Mostly COVERED: VO timing comes from real edge-tts word times (vo.py/sched.py), so RUSHED cannot happen. A silence-fraction check is a small GAP for qa.py |
| Layout lint: OFF-FRAME (safe margin), TEXT-OVERLAP of bboxes, TINY-TEXT under an apparent font size of 20 | scripts/craft.py | Partly COVERED: caption overflow/contrast gates (tools/qa.py, qa_page.mjs) and KIT.safe. A general DOM text-overlap and tiny-text check is a GAP worth a qa_page.mjs gate |
| frame_lint: sustained dark stretches (bright luma ≥ 90 on < 0.6 % of pixels plus murk ≥ 6 %, for ≥ 2 s) | scripts/frame_lint.py | Partly COVERED: near-blank stretches in qa.py. The "dark but not blank" heuristic is a small GAP |
| pin_to_frame: HUD holds its screen position during camera moves | scripts/pin_to_frame.py | COVERED by design: Reelwright HUD/captions sit outside the camAt-transformed layer |
| Landmines 1–11, 14 (Transform identity, LaTeX probe, cache staleness, dialect table) | references/landmines.md | OUT OF SCOPE: Manim-specific bugs. #14 (the cache serves stale segments) is worth noting if option (b) is ever chosen |
| Run-01 experiment: craft mechanics moved every metric, but a blind judge saw no quality gain | README, experiment/ | Insight only: the bottleneck is "what to show". This supports PLAYBOOK's story-first rules |

Native plan (REWRITE, effort S): add to PLAYBOOK "Picture": morph, don't fade, when a thing becomes another thing;
rack-focus by dimming context to 0.25; caption bands cut and never crossfade; on-screen text holds labels, terms
and numbers, never the narration sentence. Add to qa_page.mjs: text-bbox overlap, a tiny-text floor (scaled by
KIT.u) and a WORDY on-screen text warning (> 6 words outside captions). Add to qa.py: an unnarrated-fraction info
line and a dark-stretch warning. All of these are post-hoc checks, so they don't affect render(t) purity and work
for both renderers (qa_page loads the page; qa.py reads frames).

## 2. adithya-s-k/manim_skill

Three agent skills plus pytest smoke tests that render every example (tests/manimce, tests/manimgl).
**License: mixed.** Root `LICENSE` is MIT (© 2026 Adithya S Kolavi), as is
`skills/manimce-best-practices/LICENSE.txt`. **`skills/manimgl-best-practices/LICENSE.txt` is CC BY-NC-SA 4.0**
(3b1b video code plus adaptations). It is non-commercial and must not be copied into MIT Reelwright.
manim-composer has no LICENSE of its own (the root MIT presumably covers it; UNVERIFIED intent).

| Feature | File | Status |
|---|---|---|
| manim-composer: research the topic, ask about audience/length/style, write a scenes.md plan (hook, narrative arc, per-scene spec) | skills/manim-composer/SKILL.md | COVERED: AGENTS.md step 1 (audience, length, VO lines in project.json) and the PLAYBOOK story section |
| manimce-best-practices: 23 rule files (4,687 lines) on scenes, mobjects, Create/Write/DrawBorderThenFill/GrowFrom*, Transform vs ReplacementTransform, LaggedStart/Succession, rate funcs (smooth, there_and_back, ease_*), axes, graphing, LaTeX, 3D, camera | skills/manimce-best-practices/rules/*.md, examples/*.py | API docs for Manim. OUT OF SCOPE as content. Use them as a **spec of what math primitives a user expects** (§3): Axes/NumberPlane/plot, NumberLine, Create (stroke draw-on), Write (stroke-then-fill per glyph), Transform (path morph), LaggedStart (stagger), `there_and_back` easing |
| manimgl-best-practices | skills/manimgl-best-practices/ | OUT OF SCOPE: ManimGL, and CC BY-NC-SA |
| Tests that render every example | tests/ | OUT OF SCOPE |

Native plan: no direct port. The MIT rule files can be cited as a reference list of primitives and easings. Write
our own docs (REWRITE; the content is Manim-API-specific anyway). Effort: none beyond §3.

## 3. Key decision: Manim-style math animation in Reelwright

### Option (a): native math primitives in tools/engine.js (both renderers)
Proposed `KIT.math` (or tools/math.js loaded by the film page), SVG-based, every call `.set(t)` and pure in t:
- `axes({x:[a,b,step], y:[...], grid})` and `numberLine(...)`: SVG lines, ticks and labels in theme fonts, with a
  coordinate map `c2p(x,y)`.
- `plot(axes, f, [x0,x1], samples=200)`: sample f once at build time into an SVG `<path>`. Draw-on is
  `stroke-dasharray=L; stroke-dashoffset=L*(1-p)` with `L = path.getTotalLength()` computed once at build, and
  `p = ease(seg(t,t0,t1))`. Moving dot uses `getPointAtLength(p*L)` (Trace-Build).
- `create(el,t0,t1)`: the same dash draw-on for any SVG shape. `write(el,t0,t1)`: per glyph, stroke draw-on then
  fill fade (needs glyphs as paths, see equations), staggered like LaggedStart with lag ≈ 0.1–0.2 of the duration.
- `morph(pathA, pathB, t0, t1)`: resample both outlines to N points with `getPointAtLength`, align the start
  point by minimising squared distance over rotations, then lerp. That is about 40 lines of own code. flubber
  (MIT, verified) is the vendor alternative if multi-subpath shapes are needed.
- `gridWarp(plane, f, t0,t1)`: resample grid lines and lerp each point p → f(p).
- Easings: add `thereAndBack` and `smooth` (Manim's smoothstep-like default) to K.E.
- Timing: t0/t1 come from `W()`, `V()`, `KIT.snap()` like everything else, so beat sync is free.
- Theme: stroke/fill read `--kit-ink`, `--kit-accent`, `--kit-accent-2` and `--kit-muted`; labels read
  `--kit-font-text`; tempo is `KIT.dur`. Formats: sizes in KIT.u, placement via KIT.safe.
- Renderers: pvk calls render(t) directly. For hyperframes the same functions are used from hf/film.js. Both are
  Chromium pages, so one code path serves both. Seekable by construction (no rAF/CSS transitions), so the
  existing `seekable` QA gate still applies.

Equations, three candidates (all verified via npm/GitHub license APIs):
| Library | License | Size (npm unpacked) | Output | Draw-on? |
|---|---|---|---|---|
| **KaTeX 0.19.1** | MIT | ~4.0 MB (most of it fonts; only woff2 + katex.min.js needed, size UNVERIFIED) | HTML+CSS with its own fonts, or MathML | No stroke paths. Write-like reveal per glyph span (clip/opacity/translate) is possible. Synchronous, so trivially pure |
| MathJax 3 (mathjax-full 3.2.2) | Apache-2.0 | ~34 MB, deps include speech-rule-engine | SVG with glyph `<path>`s (fontCache) | Yes: real stroke-then-fill Write, and morph between equation glyphs |
| Temml 0.14.0 | MIT | ~2.2 MB | MathML only (Chromium renders MathML Core) | No |

Pick: **KaTeX, vendored** (MIT; keep LICENSE + NOTICE + VENDORED.md) in the film page, with fonts loaded before
frame 0 the way the bundled OFL fonts are. If a film needs true glyph draw-on, a later **build-time** step in
Node could run MathJax (Apache-2.0) once to emit static SVG paths into the project, so the 34 MB stays out of the
render page. That is optional and not needed for v1.

### Option (b): Manim CE as an optional third renderer
- **License:** Manim CE is MIT (GitHub API: ManimCommunity/manim → MIT; PyPI manim 0.22.1 license_expression MIT).
  Its deps include pycairo (LGPL-2.1-only OR MPL-1.1) and ManimPango (MIT), and it links Cairo/Pango (LGPL,
  UNVERIFIED exact versions). LaTeX: MacTeX/TeX Live are a mix of free licenses, MiKTeX likewise (UNVERIFIED per
  package). Manim 0.22.1 also has an optional `typst` extra (typst-py) that could replace LaTeX; its license is
  not stated on PyPI (UNVERIFIED).
- **Install, macOS:** official uv docs: `brew install cairo pkg-config` (pycairo 1.29.2 ships **no macOS
  wheels**, verified on PyPI, so it compiles from source), then `uv add manim`. LaTeX is optional, and the docs
  recommend MacTeX (full TeX Live; several GB, size UNVERIFIED because tug.org returned 403). Pango is not listed
  separately for macOS (ManimPango ships macOS wheels).
- **Install, Windows:** `uv python install; uv add manim`. Wheels exist for pycairo/ManimPango win_amd64. The
  docs warn MSVC Build Tools may be needed if a wheel is missing (multi-GB, UNVERIFIED size). LaTeX via MiKTeX
  (on-demand package install, size UNVERIFIED). ffmpeg is not mentioned in the docs; manim depends on PyAV
  (`av>=15`; the win_amd64 wheel is about 28 MB and bundles FFmpeg libraries, UNVERIFIED for macOS).
- **Install weight:** the manim wheel is only 0.7 MB, but the 26 required deps include scipy (20–36 MB wheels),
  av (~28 MB), moderngl, numpy, skia-pathops, networkx and more. Roughly 150–300 MB of site-packages without
  LaTeX (UNVERIFIED estimate), plus brew cairo on macOS, plus LaTeX if Tex/MathTex/DecimalNumber/Matrix are used
  (manim-craft landmine §4: the whole number-display family needs LaTeX).
- **Determinism:** Manim is a sequential, stateful timeline. `construct()` mutates scene state through
  `play()`/`wait()`, and updaters advance by `dt` each frame. The CLI can render whole animations (`-n
  from,to`), the last frame (`-s`) or a fixed fps (`--fps`). There is **no documented way to render the frame at
  an arbitrary time t** (Scene docs, render_options.py read). Getting frame k means fast-forwarding from the
  start. So Reelwright's out-of-order parallel frame rendering can't apply. The renderer would have to be "run
  Manim once per scene and splice the mp4". manim-craft landmine §14 also documents its segment cache serving
  stale video. Beat sync is possible but only by generating `run_time`/`wait()` values from kit data (W/V/snap
  exported to JSON). Timing then lives in Python, outside film.js, which breaks the "every timing from W()/V()"
  rule unless codegen is used.
- **Theme and renderer fit:** theme tokens are CSS. They would have to be translated into Manim colors/fonts
  (Text via Pango can use the bundled TTFs, MathTex uses Computer Modern unless you write custom preambles).
  Output is a separate video layer that can't share DOM layouts, captions, KIT.safe or the 16x9/9x16/1x1
  re-layout. Each format is a separate Manim render with a different frame size. It would be a third pipeline to
  maintain (Python env + Cairo + optional LaTeX) on top of edge-tts/ffmpeg.

### Scores (5 = best for Reelwright)
| Criterion | (a) native JS + KaTeX | (b) Manim CE renderer |
|---|---|---|
| Install size/pain, macOS + Windows native | 5: no new system deps, a few MB vendored | 1–2: Cairo via brew + compile on macOS, possible MSVC on Windows, LaTeX GBs for equations |
| Determinism / render(t) pure, out-of-order frames | 5: pure SVG/DOM set(t) | 1: sequential stateful timeline, no seek-to-t; must splice whole clips |
| Beat-synced timing from kit data | 5: W/V/snap directly | 2: needs codegen of run_time/wait |
| License | 5: MIT (KaTeX), own code | 4: MIT core; LGPL pycairo/Cairo dynamic; LaTeX mixed |
| Theme tokens + both renderers + formats | 5: CSS vars, KIT.u/safe, pvk and HF alike | 2: manual token translation; separate render per format; no shared captions/layouts |
| Fidelity to the Manim look (3D, glyph Write) | 3: 2D only; Write approximated with KaTeX (MathJax SVG optional) | 5 |

### Recommendation
Choose **(a) native math primitives** with **KaTeX (MIT)** vendored for equations. Optionally add a build-time
MathJax (Apache-2.0) SVG export later for true glyph draw-on. It keeps Reelwright local, offline,
cross-platform without WSL and a pure function of t. It inherits themes, formats and QA, and it works in both
renderers because both are Chromium. Manim's strengths that we give up (3D surfaces, orbit cameras) are rare in
product films. Leave a PLAYBOOK note: for a true 3b1b-style 3D math film, render it in Manim yourself and bring
it in as a clip (the `clip` helper already plays recordings).

Work plan:
1. tools/math.js (or engine.js section): axes, numberLine, plot, create, write, morph, gridWarp, plus `thereAndBack`
   and `smooth` easings. Effort **M**.
2. vendor/katex/ + VENDORED.md/NOTICE/THIRD_PARTY.md, and a `KIT.tex(el, src)` wrapper with a per-glyph reveal.
   Effort **S**.
3. A projects/example-math demo for both renderers, and PLAYBOOK "Math" + the manim-craft-derived rules (morph
   don't fade, rack-focus, caption bands cut, no printed narration). Effort **S**.
4. qa_page.mjs/qa.py gates: text overlap, tiny text, wordy on-screen text, dark stretch, unnarrated fraction.
   Effort **S–M**.
Licensing: write everything from manim-craft fresh (it has no license). Copy nothing from manimgl-best-practices
(CC BY-NC-SA). manimce-best-practices (MIT) is reference only. KaTeX is VENDORED. flubber (MIT) would be
VENDORED only if needed.
