# The motion deck

46 named moves in 8 groups, each with the KIT call that makes it and the numbers that make it that move. This is Reelwright's own deck, built from what the kit ships
(`tools/shots.js`, `shots2.js`, `transitions.js`, `layouts.js`, `doodle*.js`, `motion.js` and the `p5-*.js` modules). `tools/selfcheck/p5-tools.mjs` resolves every
`KIT.<path>` below in a real page with the modules loaded, so a rename that breaks the deck fails CI.

```
reelwright deck                      # the list
reelwright deck find <words>         # every word must be in the name, call or numbers:  deck find dolly zoom
reelwright deck deal [--seed S] [--cats open,cam]   # one move per group from a seeded hash: the same seed, the same hand
```

How to use it: deal a hand to start an edit, then replace the moves that do not suit the product. Times always come from `W()`, `V()`, `clip.filmAt()` or `KIT.snap()`
(AGENTS.md); the calls below show the shape, not the times. The hand is a place to start, not a rule: the PLAYBOOK's taste notes still apply.

## Open: how a film or a scene begins

| # | Move | Call | Numbers | Load after engine.js |
|--:|---|---|---|---|
| 1 | words-land | `KIT.layout.kinetic({ line, accent: [..], in })` | each word lands on its spoken start - 0.06 s, 0.35 s ease, rises 0.25 em from 90 % | layouts.js |
| 2 | big-number | `KIT.layout.stat({ value, label, in, at })` | KIT.count outExpo count-up from `at` (put it on the spoken number) | layouts.js |
| 3 | one-line-fill | `KIT.layout.fullBleed({ text, accent, in })` | one display line as large as the safe box fits, words rise in turn | layouts.js |
| 4 | pen-wordmark | `D.letters(svg, 'NAME', { size, in })` | nib at 700 px/s, shade width 0.09 em, hair 0.25 of it | doodle2.js |
| 5 | crane-rise | `KIT.shot.craneRise({ t0, dur })` | starts 0.3 H low, z 1.6, tilt 6 deg, rises to level, power2.out over 100 f | shots.js |
| 6 | one-world | `KIT.world({ regions }).tour([{ at, region }])` | every beat a box on one canvas; the camera fits each (0.9), log2 zoom | p5-time.js + p5-camera.js |

## Seam: how one scene hands over to the next

| # | Move | Call | Numbers | Load after engine.js |
|--:|---|---|---|---|
| 7 | brush-wipe | `KIT.transition('brush', { from, to, at, dur })` | 6 seeded bristle strokes, 0.6 s | transitions.js |
| 8 | iris | `KIT.transition('iris', { from, to, at, x, y })` | circle opens from (x, y), 0.6 s | transitions.js |
| 9 | flash-cut | `KIT.transition('flash', { from, to, at, color })` | colour flash hides the cut, 0.6 s | transitions.js |
| 10 | wipe | `KIT.transition('wipe', { from, to, at, dir })` | clip-path inset edge, 0.6 s | transitions.js |
| 11 | push | `KIT.transition('push', { from, to, at, dir })` | both layers travel one frame, 0.6 s | transitions.js |
| 12 | matched-move | `D.matchedMove({ dir, exitDist, exitDur })` | exit dist*u^3, entry -dist*(1-u)^3: both leave the cut at 3*dist/dur px/s | doodle2.js |
| 13 | shape-handoff | `KIT.morph.handoff({ from, to, t0, t1 })` | one outline travels, stretches up to 1.35x along its path, lands exactly on the target | p5-morph.js |
| 14 | colour-flood | `KIT.morph.coverShape({ from, t0, t1, shape })` | a rect or circle grows from a box to cover the frame exactly | p5-morph.js |

## Cam: moves of the one camera

| # | Move | Call | Numbers | Load after engine.js |
|--:|---|---|---|---|
| 15 | push-in | `KIT.shot.pushIn({ t0, dur })` | 1.00 to 1.14, power2.in, 120 f | shots.js |
| 16 | pull-back | `KIT.shot.pullBack({ t0, dur })` | 1.14 to 1.00, power2.out, 110 f | shots.js |
| 17 | crash-zoom | `KIT.shot.crashZoom({ at, x, y, variant })` | 1 to 2.6 in 6 f, then a 14 px shake (tau 1.8 f) or a 2.45 rebound | shots.js |
| 18 | whip-pan | `KIT.shot.whipPan({ at, dir })` | 1.5 frame widths in 8 f, speed blur to 24 px; 'brake' keeps 30 % for a 48 f tail | shots.js |
| 19 | dolly-zoom | `KIT.shot.dollyZoom({ t0, dur }) -> { bg, hero }` | background 1 to 2.25 and blur to 3.5 px, hero untouched, 95 f (the layer fake) | shots.js |
| 20 | dolly-zoom-real | `KIT.shot.dollyZoomReal(planes, { t0, t1, dolly })` | camera dollies by q while the lens zooms (1 - q): the subject plane holds its size, far planes end at (1-q)/(1-q/d) | p5-camera.js |
| 21 | orbit | `KIT.shot.orbit({ t0, dur })` | rotateY -18 to +18 deg, perspective 1100, z 1.1, power2.out, 34 f | shots.js |
| 22 | dutch-roll | `KIT.shot.dutchRoll({ at })` | -10 deg to +1.2 then 0, z 1.15 to 1.08, 14 f + 10 f | shots.js |
| 23 | flight | `KIT.shot.tour([{ t, state, ease }])` | poses at absolute times, each flight eased per field | shots2.js |
| 24 | authored-keys | `KIT.shot.keys([{ t, z, x, y, ease }], { log, mono })` | per-segment ease, zoom interpolated in log2, mono clamps overshoot | p5-camera.js |

## Reveal: a camera or layer move that uncovers the subject

| # | Move | Call | Numbers | Load after engine.js |
|--:|---|---|---|---|
| 25 | tilt-reveal | `KIT.shot.tiltReveal({ t0, dur })` | 58 deg overhead to frontal, z 1.2, persp 900, power3.out, 50 f | shots2.js |
| 26 | drone-dive | `KIT.shot.droneDive({ t0, dur })` | z 0.45, tilt 50, bank 12, bezier(.5,0,.2,1), 70 f | shots2.js |
| 27 | tabletop-drop | `KIT.shot.tabletopDrop({ t0, dur })` | z 0.6, tilt 35, roll -8, expo.out, 40 f | shots2.js |
| 28 | explode | `KIT.shot.explode(layers, { el, t0, t1 })` | layers separate in z while the stack turns axonometric | shots2.js |
| 29 | rack-focus | `KIT.shot.rackFocus(near, far, { t0, t1 })` | blur hands over from the far plane to the near one | shots2.js |
| 30 | depth-planes | `KIT.shot.planes([{ el, z }], cam)` | one dolly, plane scale 1/(1 - dolly/z), stroke weight z^0.35 | shots2.js |

## Type: words on screen, timed to the voice

| # | Move | Call | Numbers | Load after engine.js |
|--:|---|---|---|---|
| 31 | drawn-words | `KIT.layout.kinetic({ style: 'drawn', line, in })` | each word written by the pen on its spoken start, pops 1 to 1.08 to 1 over 0.18 s | p5-doodle.js |
| 32 | typewriter | `KIT.typewriter(el, text, { at, cps })` | 18 cps, steady caret then blinking, optional mistakes and backspace | motion.js |
| 33 | karaoke | `KIT.subtitles(ids)` | spoken words highlighted as said, the current one marked | engine.js |
| 34 | phrases | `KIT.subtitlePhrases(ids, { min: 2, max: 6 })` | 2 to 6 word phrases landing on the first spoken word | p5-text.js |
| 35 | word-by-word | `KIT.words(parent, id)` | one span per spoken word, rises 22 px as it is said | engine.js |
| 36 | paced-text | `KIT.paced(texts, { t0, to })` | each text up for max(0.7 s, 0.3 s per word), spare time shared by word count | p5-text.js |

## Act: a hand on the product

| # | Move | Call | Numbers | Load after engine.js |
|--:|---|---|---|---|
| 37 | callout | `D.callout({ anchor, cam, label, in })` | dot pops 0.22 s, leader drawn 0.35 s, label written; follows the camera | p5-doodle.js |
| 38 | cursor | `KIT.cursor(parent).set(x, y, down)` | arrow that presses to 0.85 scale | engine.js |
| 39 | magnifier | `KIT.magnifier(parent, size).set(...)` | round lens, springs in with outBack | engine.js |
| 40 | phone-tap | `KIT.phone(opts).set(t, src, cam, taps)` | 0.6 s tap ring, camera clamped to the screen | engine.js |

## Emph: point at one thing

| # | Move | Call | Numbers | Load after engine.js |
|--:|---|---|---|---|
| 41 | indicate | `KIT.indicate.indicate(el, { at })` | scale 1.2 there-and-back with a tint to the accent, 1 s | motion.js |
| 42 | burst | `KIT.indicate.flash(el, { at })` | 12 radial lines from the element | motion.js |
| 43 | impact-shake | `KIT.shakeNoise(t, t0, { amp, dur })` | gradient noise, 0.04 s smoothstep attack, squared decay, +-1.2 deg about the centre | p5-camera.js |
| 44 | circle-it | `D.circle(el, { in })` | one loop of about 1.1 turns drawn on | doodle.js |

## Close: how it ends

| # | Move | Call | Numbers | Load after engine.js |
|--:|---|---|---|---|
| 45 | quote-card | `KIT.layout.quote({ text, author, in })` | card with accent quote mark and author line | layouts.js |
| 46 | fade-through | `KIT.transition('fadeThrough', { from, to, at, color })` | dips to the theme background and back, 0.6 s | transitions.js |

Pvk loads a module as `<script src="../../../tools/<file>">`; HyperFrames copies every `tools/*.js` into `hf/kit/` (`<script src="kit/<file>">`).
