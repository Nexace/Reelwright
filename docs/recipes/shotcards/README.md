# Shotcards A: camera, opening, outro, transition, rhythm

31 shot cards from video-shotcraft as pure-function helpers, `KIT.shotcards.*`, each with a recipe page. Every helper builds its DOM once and writes styles from `t` in `set(t)`; nothing reads a clock, `Math.random` or the previous frame, so scrubbing, shuffled seeks and `--formats` give the same frames (`node tools/selfcheck/shotcards-a.mjs`, both renderers).

## Loading

Each module attaches itself to `KIT.shotcards` when loaded; load it after the modules it needs, before `film.js`:

| Module | Load after |
|---|---|
| `tools/shotcards/camera.js` | engine.js, shots.js, shots2.js, motion.js (terminal3d only) |
| `tools/shotcards/opening.js` | engine.js, shots.js, shots2.js |
| `tools/shotcards/outro.js` | engine.js, shots.js |
| `tools/shotcards/rhythm.js` | engine.js, shots.js (KIT.shake) |
| `tools/shotcards/transition.js` | engine.js, transitions.js; motion.js for cardFlock |
| `tools/shotcards/dissolve.js` | engine.js, transitions.js |

- HyperFrames: `<script src="kit/shotcards/camera.js"></script>` (the renderer copies `tools/` into `kit/`; `tools/shotcards/` needs the one-line `kit_files.mjs` change listed in the Phase 11 P2 report to be copied too).
- pvk: `<script src="../../../tools/shotcards/camera.js"></script>`.
- In `film.js`: `const SC = KIT.shotcards;`, build helpers once at load (after fonts and layout, because some measure the DOM at their first call), call `.set(t)` from `render(t)`.
- The transition-type modules (`transition.js`, `dissolve.js`) register `SC.types.<name>`; `SC.transition(name, opts)` is `KIT.transition(SC.types[name], opts)` and takes the same options (`from`, `to`, `at`, `dur`, `dir`, `x`, `y`, `seed`, `color`, `cue`).

## Cards

| Recipe | Row | Module | Helper |
|---|---|---|---|
| [3D terminal](terminal-3d.md) | `doodle-shots-motion:2.10` | `camera.js` | `KIT.shotcards.terminal3d` |
| [Cursor flyover](cursor-flyover.md) | `doodle-shots-motion:2.3` | `camera.js` | `KIT.shotcards.cursorFlyover` |
| [Tension camera moves: bullet-time freeze orbit and pull-back isolation](tension-camera-moves.md) | `doodle-shots-motion:2.9` | `camera.js` | `KIT.shotcards.pullBackIsolation (+ KIT.shot.bulletTime)` |
| [Grain and halftone dissolves](grain-dissolve.md) | `doodle-shots-motion:2.53` | `dissolve.js` | `KIT.shotcards.types.grain / types.halftone` |
| [Gradient wipe](gradient-transition.md) | `doodle-shots-motion:2.71` | `dissolve.js` | `KIT.shotcards.types.gradientWipe / gradientWipe(opts)` |
| [Print texture transitions](print-texture-transitions.md) | `doodle-shots-motion:2.75` | `dissolve.js` | `KIT.shotcards.types.halftone / tornEdge / inkBleed` |
| [Tear streak](tear-streak-transitions.md) | `doodle-shots-motion:2.77` | `dissolve.js` | `KIT.shotcards.types.tearStreak` |
| [Brand ink open](brand-ink-open.md) | `doodle-shots-motion:2.42` | `opening.js` | `KIT.shotcards.inkBloom` |
| [Crane rise with row pulse](crane-rise-reveal.md) | `doodle-shots-motion:2.43` | `opening.js` | `KIT.shotcards.craneRise` |
| [Dataviz landscape open](dataviz-landscape-open.md) | `doodle-shots-motion:2.44` | `opening.js` | `KIT.shotcards.datavizLandscapeOpen` |
| [Fracture](fracture.md) | `doodle-shots-motion:2.45` | `opening.js` | `KIT.shotcards.fracture` |
| [Icon field colorize](icon-field-colorize.md) | `doodle-shots-motion:2.46` | `opening.js` | `KIT.shotcards.iconField` |
| [Letterspace materialize](letterspace-materialize.md) | `doodle-shots-motion:2.47` | `opening.js` | `KIT.shotcards.letterspace` |
| [Orbit ring title open](orbit-ring-title-open.md) | `doodle-shots-motion:2.49` | `opening.js` | `KIT.shotcards.orbitRingTitle` |
| [Spotlight hero card](spotlight-hero-card.md) | `doodle-shots-motion:2.50` | `opening.js` | `KIT.shotcards.heroPush / spotlightHero` |
| [Text as mask](text-as-mask.md) | `doodle-shots-motion:2.52` | `opening.js` | `KIT.shotcards.textMask` |
| [Logo shrink into wordmark lockup](logo-shrink-wordmark-lockup.md) | `doodle-shots-motion:2.54` | `outro.js` | `KIT.shotcards.logoLockup` |
| [Neon triple marquee](neon-triple-marquee.md) | `doodle-shots-motion:2.55` | `outro.js` | `KIT.shotcards.neonMarquee` |
| [Group photo launch](outro-group-photo-launch.md) | `doodle-shots-motion:2.56` | `outro.js` | `KIT.shotcards.groupLaunch` |
| [UI strip-away outro](ui-strip-away-outro.md) | `doodle-shots-motion:2.57` | `outro.js` | `KIT.shotcards.uiStripAway` |
| [UI to brand morph: icon flip bloom and input morph assemble](ui-to-brand-morph.md) | `doodle-shots-motion:2.58` | `outro.js` | `KIT.shotcards.iconFlipBloom / inputMorphAssemble` |
| [Beat step list with theme cycle](beat-step-list-theme-cycle.md) | `doodle-shots-motion:2.60` | `rhythm.js` | `KIT.shotcards.stepList` |
| [Comic panel split](panel-grid-moves.md) | `doodle-shots-motion:2.61` | `rhythm.js` | `KIT.shotcards.comicPanels` |
| [Quad split of parallel scenes](quad-split-parallel-scenes.md) | `doodle-shots-motion:2.62` | `rhythm.js` | `KIT.shotcards.quadSplit` |
| [Jump-cut punch-in](rhythm-interrupt-moves.md) | `doodle-shots-motion:2.63` | `rhythm.js` | `KIT.shotcards.jumpCut` |
| [Sakuga timing shift](sakuga-timing-shift.md) | `doodle-shots-motion:2.64` | `rhythm.js` | `KIT.shotcards.steppedTime / sakugaTime` |
| [Trailer bumper grammar](trailer-grammar-moves.md) | `doodle-shots-motion:2.66` | `rhythm.js` | `KIT.shotcards.trailerBumper` |
| [Card flock tumble](card-flock-tumble.md) | `doodle-shots-motion:2.69` | `transition.js` | `KIT.shotcards.cardFlock` |
| [Page turn](page-turn-transitions.md) | `doodle-shots-motion:2.74` | `transition.js` | `KIT.shotcards.types.pageTurn` |
| [Hidden cut: invisible cut, versus slam, light-leak burn](transition-hidden-cut.md) | `doodle-shots-motion:2.78` | `transition.js` | `KIT.shotcards.types.invisibleCut / versusSlam / lightLeakBurn` |
| [Letterform zoom](transition-travel.md) | `doodle-shots-motion:2.79` | `transition.js` | `KIT.shotcards.letterformZoom` |

Timings and shapes are our choices where the source card gives none. Cards and their Remotion demos are Apache-2.0 and Chinese-language: nothing here is a copy; the ideas and the shapes of the moves are rewritten.

[Back to the recipes index](../README.md)
