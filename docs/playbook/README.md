# Playbook pages

Every page in this folder is a topic of [docs/PLAYBOOK.md](../PLAYBOOK.md), the document to read. A new topic is written here first, as
`docs/playbook/<topic>.md` (one file per topic, so parallel work never edits the same lines), then listed below and in the PLAYBOOK
index. If you change a fact in a topic file, change it in the PLAYBOOK section too. `reelwright docs <topic>` prints a page from
the terminal; `node tools/selfcheck/docs-index.mjs` fails when a page here is missing from this list.

## Story, process and review

- [make](make.md): `reelwright make "<brief>"`: a guided, offline start that picks the template and theme, drafts the lines and prints the plan
- [claude-workflow](claude-workflow.md): the agent loop: brief, script, stills, taste, preview, render
- [final-review](final-review.md): the last step before reporting an mp4: an itemised checklist and `reelwright review` for a reviewer with a clean context
- [prompting-data-maps](prompting-data-maps.md): ready-to-paste prompts for charts, numbers, tables and maps
- [prompting-recreate-reference](prompting-recreate-reference.md): prompts for "make mine look like that" from a site, a screenshot or a film
- [prompting-editing-existing](prompting-editing-existing.md): prompts for footage you already have: trim, captions, lower thirds, recut to a track
- [skill-references](skill-references.md): the product-video skill split by topic, with the CLI and registry skills in short form
- [skill-patch](skill-patch.md): the text appended to the shared skill file for the 0.3 commands

## Look: themes, grading, effects, formats

- [themes](themes.md): the 27 themes: tokens, motion archetypes, caption skins, `theme-check` and `theme-gallery`
- [theme-brief](theme-brief.md): `reelwright theme-brief`: a theme drafted offline from a one-line brief
- [grading-effects](grading-effects.md): `KIT.grade` and `KIT.vfx`: grade presets, vignette, grain, LUTs, per-pixel effects
- [effects](effects.md): `KIT.fx.*` and the doodle highlights: colour, blur, lighting, distortion, patterns, reveals
- [motion-blur](motion-blur.md): `"motionBlur"` in `project.json`, and `--blur` on `frames`
- [output-formats](output-formats.md): `--as`, `--formats`, alpha, HDR and 4:5

## Motion, camera and shot cards

- [motion](motion.md): paths, transitions, camera shots and rate functions: `KIT.path`, `KIT.transition`, `KIT.shot.*`
- [motion-rules](motion-rules.md): `KIT.motionRules`: duration and distance scaling, state-feedback patterns, and the checks that warn when a film breaks them
- [camera-time](camera-time.md): camera keys, `KIT.timeRemap`, `KIT.world`, `KIT.morph.handoff`, callouts and steps
- [motion-deck](motion-deck.md): `reelwright deck`: 46 named moves, each with its KIT call
- [shotcraft-lints](shotcraft-lints.md): sharp camera layer, velocity helpers, `reelwright arc`, aesthetic lints, `beatsync`, `verify-av`, `capture-trio`
- [shader-transitions](shader-transitions.md): `KIT.shader`: 14 WebGL transitions
- [kit-components](kit-components.md): `KIT.components`: info strip, odometer, flash cut, ticker, clip card

## Text, media and time

- [text-media](text-media.md): reading time, phrase cutting, perceptual scale and `KIT.animatedImage` (`reelwright animimg`)
- [text-rules](text-rules.md): text size and safe-area rules in `KIT.u` units
- [timing](timing.md): `KIT.interpolate`, `KIT.random`, colour, noise, shapes, text fitting and `KIT.player`
- [video-audio](video-audio.md): `KIT.video` and `KIT.audio`: clips, speed ramps and extra sounds over the soundtrack

## Sound

- [sound](sound.md): synthesised SFX kinds and the `house` and `hiphop` music beds
- [audio-fx](audio-fx.md): `reelwright audiofx`: the 17-effect rack, presets and the `fx` key

## Drawing, math and runtimes

- [doodle](doodle.md): `KIT.doodle` depth: pen strokes, score, letters, depth seams
- [math2](math2.md): `KIT.tex`, shapes, plots, vector fields and `KIT.math3d`
- [d3](d3.md): d3 scales, shapes and delaunay as pure functions of t
- [manim](manim.md): optional Manim scenes (`reelwright manim`, `KIT.manim`)
- [manim-native](manim-native.md): 18 Manim features as plain KIT calls, with `manim-lint`
- [runtimes](runtimes.md): GSAP, Lottie, anime.js, Three.js and CSS/WAAPI driven by seeking
- [lottie](lottie.md): Lottie rules and dotLottie: `KIT.lottie`, `KIT.dotLottie`, `add-lottie` (and `--inline`)
- [blocks](blocks.md): HyperFrames blocks: `reelwright add`, `KIT.mount`, `KIT.block`
- [nested-compositions](nested-compositions.md): `KIT.mount`: a HyperFrames composition as one timed layer
- [remotion](remotion.md): the optional Remotion renderer

## Variables, delivery, QA and the studio

- [variables](variables.md): composition variables, `batch`, `stills2` (zoom, compare) and `compare`
- [codecs](codecs.md): `transcode`, `range`, `audio-clip`, `spectrum` and per-run `props`
- [delivery](delivery.md): gates, `ship` checks, narration providers, `brand`, blur and formats
- [qa-lint](qa-lint.md): the HyperFrames lint inside `qa`
- [studio](studio.md): `reelwright studio`: timeline, panels and render queue
## Recipes

[docs/recipes/README.md](../recipes/README.md) indexes every recipe: the eight scene recipes, the film recipes and the shot cards
([Shotcards A](../recipes/shotcards/README.md), [Shotcards B](../recipes/shotcards/b-index.md)).
