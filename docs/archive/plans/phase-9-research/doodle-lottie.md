# Phase 9 research: anidoodle + motion-design-skill

Researched 2026-11-02 from shallow clones in scratch/phase9/src/anidoodle and scratch/phase9/src/motion-design-skill.
Everything below was read in those files unless marked UNVERIFIED. Nothing outside scratch/phase9/ was edited.

---

## 1. alexgreensh/anidoodle

**License (verified, `gh api .../license` and LICENSE/NOTICE files): Apache-2.0.** Copyright 2026 Alex Greenshpun. NOTICE
lists third-party material: an optional, separately downloaded sound pack (CC0 samples + CC BY 4.0 room impulse
responses; not in the repo). Vendored three.js 0.170.0 is MIT (engine/vendor/three/, hash-pinned). One non-code image:
a public-domain Van Gogh JPG (engine/assets/refs/, provenance in PROVENANCE.json). Last commit 2026-10-31.

**What it is.** A skill (plus Claude/Codex plugin packaging) that draws pictures and films entirely in code on an HTML
Canvas 2D context, in 32 "styles" (pencil, watercolour, rubber hose, woodcut, ...). Engine is TypeScript under
`skills/anidoodle/engine/src/canvas-core/` (the `plugins/anidoodle/...` tree is a byte-for-byte packaging copy).
~1840 files, most of them vendored three.js type files, 32 style plates, 53 music modules, 112 host pages. It is NOT SVG:
there is no SVG stroke-dasharray anywhere. The repo's determinism doctrine (references/determinism-and-contract.md):
`renderFrame(frame, env)` is pure, randomness only from `rng(seed)`, never `Math.random`/`Date`, no `ctx.filter`, no
assets except three named exceptions. That is the same rule as Reelwright's `render(t)`.

### 1.1 Feature list, with files, marked against Reelwright

| Feature | Where | Mark |
|---|---|---|
| Seeded PRNG `rng(seed)` (mulberry32-style) and tileable gradient-noise `fractal()` | canvas-core/core.ts L42-72 | GAP (Reelwright has no seeded noise helper; film.js is forbidden Math.random by the `seekable` gate in tools/qa.py) |
| Hand-wobble of a polyline (`jitter`, `displace`, `wob`) | core.ts L73, L112; rubberHoseKit.ts L30 | GAP |
| Pen stroke with pressure profile, taper, "retrace", partial draw (`Gfx.pen`, `upTo`, `ribbon`) | core.ts L193-215 | GAP |
| Draw-on by dash (`setLineDash([L*p, L+1])`) | mechanismKit.ts `rawStroke` L89-92 | GAP (no stroke draw-on helper in tools/engine.js, confirmed: grep for dasharray/dashoffset/pathLength in tools/ themes/ docs/ bin/ finds nothing) |
| Centreline cut draw-on for filled ribbons | drawingMarks.ts `stroke`, `cut` | GAP |
| Pen-written lettering ("anidoodle" as authored centrelines, pressure from downstroke share) | lettering.ts, banner.ts `walk`/`outlineOf` | GAP, but only worth borrowing the idea |
| Drawing score: ordered marks with ids, parts, dependency order, time budget by ink length, steps on a 15-frame beat grid | drawingScore.ts (`ScoreBuilder`, `schedule`, `progressAt`) | PARTLY COVERED: Reelwright already snaps to a music/VO grid (KIT.snap, W/V). The cost-weighted stroke scheduler is a GAP. |
| Paper texture (procedural tiles: `pencilTooth`, `paper`, `coldpress`, `washGran`...), multiply over the frame | core.ts `TILES`, `tile()`, `Gfx.paper` | GAP, but trivially replaceable by a CSS/SVG feTurbulence or a pre-baked PNG (see 1.4) |
| 32 styles, music composer, SFX (14 seeded effects), narration baking, 3D (three.js), 3 hosts | many | OUT OF SCOPE: Canvas-only engine, Remotion/Playwright hosts, own audio synth; Reelwright has its own pipeline (edge-tts, mix.py, cue SFX) |
| Determinism gate (hash frames forward vs reverse, cold vs cached) | tools/ (gate.mjs) | COVERED in spirit: tools/qa.py `seekable` lint + `verify` reproducibility |
| Brand kit / launch-film template | launchTemplate.ts, brandKit.ts | COVERED: themes/*.css + brand.json + layouts.js |

### 1.2 How anidoodle does hand-drawn animation (exact mechanics)

All code is in `canvas-core/core.ts`, class `Gfx`, method `pen(pts, o)` (L193). Defaults:
`w=3.4, wobble=1.1, boil=0.55, taper=1, opacity=0.96, retrace=true, progress=1`. Medium constants (L147-149):
`PENCIL = {nib:1.45, taper:1, pressure:1, retrace:true, wobble:1, rough:1.15}`,
`RISOLINE = {nib:1.7, taper:0.5, pressure:0.5, retrace:false, wobble:1.6, rough:0.9}`.

**Pipeline for one stroke (control points `pts`):**
1. **Static wobble (the hand's signature, never changes):** `basePts = jitter(ctrl, wobble*M.wobble, seed)`. `jitter` =
   `rng(seed)`; each control point moves by `(r()-0.5)*2*amt` in x and y. So +/-1.1 px (x medium 1.0) per control point.
2. **Boil (re-drawn each time bucket):** `b = Math.floor(frame / 4)`; second jitter
   `jitter(basePts, boil, seed*911 + b)`: +/-0.55 px, new seed every 4 frames. Their film is 30 fps
   (banner.ts meta fps 30), so the line re-wobbles at 7.5 Hz. Between buckets the line is frozen ("boil on threes/fours").
3. **Smooth:** `sample(pts, closed, per=10)` = Catmull-Rom (tension 0.5) with 10 samples per segment.
4. **Draw-on by cutting the centreline:** `upTo(s, progress)`: `n=(len-1)*progress; i=floor(n); f=n-i;` keep points 0..i
   and append the lerp between point i and i+1 at fraction f. Equal-index parameterisation, not arc length. Done before
   building the ribbon so the moving tip keeps its taper (a lifting nib).
5. **Ribbon outline** `ribbon(centre, width, seed, taper, pressure, rough)` (L112-127):
   - densify to ~1.5 px spacing if rough>0;
   - `t = i/(N-1)`; `ends = min(1, t/0.14, (1-t)/0.2)`; `tp = 1 - taper + taper*max(0.04, ends)^0.7`
     (fast 14% attack, 20% release);
   - pressure `pr = max(0.14, 1 - 0.26*pressure + pressure*(0.3*sin(5.5t + a) + 0.14*sin(17t + b)))`, with
     `a=(seed%17)*0.37`, `b=(seed%11)*0.53` (so each stroke has its own phase);
   - half-width `w = width*tp*pr/2`; each edge pushed along the normal by `w + (r()-0.5)*rough` using `rng(seed*31+7)`
     (this is the "pencil bite", rough 1.15 px);
   - polygon = left edge + reversed right edge, filled.
6. **Retrace:** a second thinner ribbon (`width*0.5`, opacity x0.4) from a third jitter
   `boil + 1.3*M.wobble` with seed `seed*577 + b`. Gives the double-line sketch look.
7. **Grain:** the layer is composited with a `destination-in` pattern of `pencilTooth` (graphite skips paper valleys).
   Tile: `fractal(seed 8, fx=1.3, oct=1)` mapped to alpha by `clamp(k*v + o)`, k=-2.0, o=2.05, 512 px tile, periodic.

**Alternative lighter draw-on** (`mechanismKit.ts` L89-92, ruled technical lines): `lineCap round`, then
`setLineDash([L*progress, L+1])` where L = polyline length (+ closing segment if closed). This IS the stroke-dasharray
technique, in canvas form. In SVG it is `stroke-dasharray: P 1; stroke-dashoffset: 1-p` with `pathLength="1"`.

**Timing of strokes (drawingScore.ts, lesson.ts):**
- Each stroke has `cost = length_px + 9` (a lift costs 9 px of time); erase cost `len*0.35 + 20`.
- A step's duration: `dur = clamp(round(sumCost / rate), minStep, maxStep)` frames, then each stroke gets a slice
  proportional to its cost: `s_i = markStart + (acc/C)*dur`. Long strokes are fast per pixel, short strokes slow. One
  stroke active at a time.
- Default `lessonTiming`: `intro 75, captionLead 20, pause 25, hold 75, rate 38 (cost units/frame), minStep 90,
  maxStep 330, grid 15` (frames, at their film fps). Steps end on `ceil((markEnd+pause)/grid)*grid`.
  The effective pen speed is therefore about 38 px per frame of cost; rest between passes up to half a second.
- Progress helper: `p = frame>=e ? 1 : frame<=s ? 0 : (frame-s)/(e-s)` (linear in time; the stroke's own pressure
  profile gives the feel). Their rule: any progress helper must return exactly 1 at/after the end or the still differs.
- Pen-written word (banner.ts `walk(u)`): total path = sum of stroke lengths plus pen-lift legs; `u in [0,1]` is
  linear in px, so the nib moves at constant speed across the whole word; `outlineOf(stroke, laidPx)` fills the first
  `laidPx` of each stroke. Lettering width rule (lettering.ts `inkStroke`): width = hair + (shade-hair)*v where v is the
  smoothed, `^1.7`-sharpened share of the direction pointing DOWN (flexible pointed-nib model), tapered 0.35..1 over the
  first 3% and last 8%+tail of the stroke.
- Rubber-hose "line boil on twos": a new `boil` index per drawing, `wob(pts, amp=2.2, seed=boil*31+k)`. `wob` displaces
  each point by seeded 2-octave gradient noise (`fractal(1930, x+ox, y+oy, 0.035, 0.035, 2) - 0.5) * amp`) so neighbours
  move together (smooth wobble, not per-point static). Film print adds per-frame grain offset, lamp flicker, dust,
  gate weave +/-1.7 px, all drawn from `rng(7000 + seed*13)` with `seed` = the frame bucket.

### 1.3 Fonts and textures it bundles (licenses)

- **Hand-drawn font: none.** Its doctrine is "No images, no fonts, no audio files in the repository. Lettering is pen
  strokes; texture is seeded noise." Script is authored centrelines (lettering.ts), not a typeface.
- Bundled TTFs (engine/assets/fonts/PROVENANCE.md): Poppins Bold (OFL 1.1, Poppins Project Authors 2020), Lora Bold
  (OFL 1.1, Reserved Font Name "Lora"), Instrument Sans Regular/Bold (OFL 1.1). All OFL texts present as `*-OFL.txt`.
  None are handwriting faces. Reelwright already bundles OFL families (fonts/LICENSES.md); these would add nothing.
- Textures: all procedural (`TILES` in core.ts), no image files. Only image is the public-domain Van Gogh JPG, which is a
  reference for the "adapt a style" demo; do not copy it.
- Sound pack: not in repo; CC0 + CC BY 4.0; irrelevant for Reelwright.

### 1.4 Native Reelwright "doodle" theme: how to build it, all pure in t

Reelwright is DOM/CSS (pvk) or HyperFrames HTML, so use **SVG**, not canvas. Nothing here needs a dependency.

New helper module `tools/doodle.js` (loaded by engine like layouts.js), exposed as `KIT.doodle`. Everything below is a
function of `t` and a string/number seed.

1. **Seeded RNG:** copy anidoodle's `rng(seed)` (6 lines, mulberry32). Seed from `hash(string id)` (FNV-1a) so a stroke's
   look depends on its id, not its position in the DOM. This replaces Math.random, which the `seekable` gate forbids.
2. **Static wobble:** at build time (t-independent, so cache it), take the SVG path's sampled points
   (`path.getPointAtLength(i*step)`, step ~ 8 px) and displace each by `(rng()-0.5)*2*wobble`, wobble 1.0-1.5 px at 1080p
   (scale by `KIT.safe`/frame height / 1080). Rebuild `d` with a Catmull-Rom to Bezier conversion.
3. **Boil as a pure function of t:** `k = Math.floor(t * BOIL_HZ)`, `BOIL_HZ = 8` (anidoodle: 7.5 Hz). New displacement
   seed = `hash(id) * 911 + k`, amplitude 0.5-0.8 px. Re-generating `d` only when `k` changes keeps cost low, and since
   `k` is a function of t only, scrubbing backwards gives the same drawing. Use `Math.floor(t*BOIL_HZ + 1e-6)` to avoid
   float flicker at bucket edges. Make `BOIL_HZ` a theme token (`--kit-boil: 8`, 0 = still) so other themes can opt in.
   Do NOT key on frame number: pvk and HyperFrames can render at different fps and `--formats` must look the same.
4. **Draw-on:** give the `<path>` `pathLength="1"` (or measure `getTotalLength()`), set
   `stroke-dasharray: 1 1; stroke-dashoffset: (1 - p)` with `p = KIT.ease(KIT.seg(t, t0, t1))` (the theme's ease). For
   several strokes of one drawing, use anidoodle's cost scheduling: `cost = len + 9`, slice a window `[w0,w1]` across
   strokes in proportion to cost, `p_i = clamp((t - s_i)/(e_i - s_i))`, `s_i,e_i` from KIT.snap-ped window. Pass
   `stroke-linecap: round`. Set `p_i` to exactly 1 when `t >= e_i` (anidoodle's float-error rule).
   Taper (a filled-ribbon look) is optional: needs the ribbon polygon as above; a plain constant-width stroke with
   round caps is the cheap default and works in both renderers.
5. **Duration:** pen speed ~ 600-900 px/s at 1080p for long strokes (anidoodle: rate 38 cost/frame at 30 fps =
   ~1140 cost-px/s, UNVERIFIED as equivalent because their canvas is a different logical size per film). Make
   `dur_i = (len_i + 9) / SPEED` (the +9 is anidoodle's per-lift cost), with `SPEED` a theme token, and a 0.08-0.15 s rest between strokes. Snap the
   start of each group to `KIT.snap` so it lands on the beat; the VO words drive group starts via `W()`/`V()`.
6. **Paper texture:** either an inline SVG filter `feTurbulence type=fractalNoise baseFrequency=0.75 numOctaves=3 seed=21`
   (anidoodle's `paper` tile uses fx 0.75, oct 3, seed 21) as a multiply overlay at 5% opacity (`paperGrain` default
   opacity 0.05), or a pre-baked 512x512 seamless PNG generated once by a script from the same noise (no runtime
   randomness; also immune to filter differences between Chromium builds). Static, so trivially pure in t. Grain
   "swim" like film: shift the pattern by `floor(t*BOIL_HZ)` bucket via the seeded rng (as in `filmPrint`).
7. **Font:** none from anidoodle. Candidate OFL handwriting families from Google Fonts (Caveat, Patrick Hand, Kalam,
   Gloria Hallelujah, Architects Daughter) are UNVERIFIED for license/glyph coverage: I did not read them; they are
   commonly OFL but the plan must fetch the family with `fonts/fetch.mjs` and read each OFL.txt before bundling.
   Existing fonts/ has Fredoka and Shrikhand, which could stand in.
8. **Both renderers:** SVG attributes and DOM text are renderer-neutral, so one `doodle.js` works in pvk and
   hyperframes. Do not use `filter: url(#rough)` displacement for roughness: feDisplacementMap output depends on
   the Chromium raster path and hits the "Safari has no ctx.filter" class of issue; displace the geometry as above.
9. **Test:** `node -e` hash of the SVG `d` for t=2.5 computed twice, and at t=2.5 after rendering t=7 first; QA's
   `seekable` gate must pass (no Math.random, Date.now, timers, CSS transitions in the film code).

**Recommended scope for the theme checkpoint:** `themes/doodle.css` (paper bg, graphite ink, marker accent, handwriting
font, `--kit-ease: out`, `--kit-tempo: 1.0`, `--kit-boil: 8`) + `tools/doodle.js` with 4 functions: `rng/hash`,
`wobblePath(id, d, amp)`, `boilPath(id, d, t, amp, hz)`, `drawOn(el, p)`. Plus 2 or 3 layouts reuse (stat, quote, kinetic)
with a hand-drawn underline and circle-the-number mark. Effort **M**.

### 1.5 License decision per file

Apache-2.0 allows copying with the license text and NOTICE. But the code is TypeScript Canvas-coupled and written as
dense one-liners; what is useful is ~25 lines of algorithm. Decision:
- `core.ts` `rng`, `jitter`, Catmull-Rom `sample`, `upTo`/`cut`, `ribbon` formulas: **REWRITE** in plain JS for SVG
  (algorithm facts and a 6-line PRNG are not worth a vendored TS tree). Credit anidoodle in docs/PLAYBOOK.md and
  THIRD_PARTY.md as inspiration; no NOTICE obligation if no code is copied. If the mulberry32 body is copied verbatim,
  add an Apache-2.0 attribution comment (mulberry32 itself is public domain, so prefer to write it from the algorithm).
- `drawingScore.ts` `schedule`/`progressAt`: **REWRITE** (30 lines, depends on its Score type and frame ints).
- Everything else (styles, music, 3D, hosts, three.js): **NOT USED**.
- Nothing is a VENDOR candidate; no VENDORED.md entry.

**Effort:** S for `tools/doodle.js` helpers, M including theme, font fetch, paper tile, sample film, PLAYBOOK section.

---

## 2. LottieFiles/motion-design-skill

**License (verified): MIT**, Copyright (c) 2025 LottieFiles. Only a root LICENSE (no per-file headers; SKILL.md
frontmatter says `license: MIT`). Repo is 20 files, all Markdown, 1628 lines. No code, no JSON, no Lottie files, no
scripts. It is a prompt-style skill ("Universal motion design principles, implementation-agnostic"). The only mentions of
Lottie are in the description line (`Works with CSS, Framer Motion, GSAP, Lottie, Spring`), a README header image, and
author metadata. **There is no Lottie-specific workflow in the repo** (grep for lottie/bodymovin/dotlottie/.json finds only
those mentions).

### 2.1 Contents, with files, marked against Reelwright

| Content | File | Mark |
|---|---|---|
| 8-step pre-animation checklist; Three Pillars (emotion, narrative, craft); 3 motion layers (primary/secondary/ambient) | SKILL.md, director/core-philosophy.md | ADOPT AS DOCS: fits PLAYBOOK. Not code. |
| 4 personality archetypes (Playful, Premium, Corporate, Energetic) with duration, easing, overshoot, paths, squash | SKILL.md, director/motion-personality.md | **TRANSFERS** to per-theme presets (see 2.2) |
| Duration table by element type (tooltip 80-120 ms ... dramatic reveal 600-1200 ms), distance scaling, enter 100% / exit 65-75% | reference/timing-easing-tables.md | PARTLY: UI scale; film scale is longer. Use as ratios only. |
| Easing standards as cubic-beziers (MD3 (0.2,0,0,1), emphasized (0.05,0.7,0.1,1), accelerate (0.3,0,1,1), Apple (0.25,0.1,0.25,1), gentle float (0.4,0,0.2,1), bounce settle (0.175,0.885,0.32,1.275), elastic (0.68,-0.55,0.265,1.55)) | same | GAP: engine has 5 hand-coded easings only |
| Material easing: duration scale + overshoot (rigid 1.2x/0%, elastic 0.8x/15-25%, fluid 1.5x/5%, paper 1.0x/3-5%, gas 2.0x/0%, glass 0.9x/0%) | same | GAP, cheap to add as a table |
| Spring params (very stiff 400+/25-30 ... very bouncy 100-200/5-10), overshoot budget by context | same | GAP (no spring easing); can be a closed-form damped-oscillator easing = still pure in t |
| Stagger recipes (micro 20-40 ms, standard 50-100, dramatic 100-200, wave 30-60; total < 500 ms), 1/3 rules, overlap %, counter-motion table | SKILL.md, director/choreography.md, patterns/multi-element.md | PARTLY COVERED: stagger exists ad hoc in films; no helper. GAP for a `KIT.stagger`. |
| 12 Disney principles for UI, emotion-to-motion map, narrative structure | director/*.md | DOCS only |
| Entrance/exit, state feedback, ambient loops | patterns/*.md | DOCS only; mostly UI-state oriented (button press, error shake): OUT OF SCOPE for product films |
| Accessibility/performance/context adaptation (reduced motion, platform) | director/context-adaptation.md | OUT OF SCOPE (video, no interactivity) |
| Quality checklist, troubleshooting | reference/*.md | DOCS; the film-relevant lines are "never linear for spatial movement", "never exceed 1/3 screen without an intermediate keyframe" |

### 2.2 What maps onto "easing and timing presets per theme"

Current state (verified): themes carry `--kit-ease` (one of inOut, out, outExpo, in, outBack) and `--kit-tempo`:
clean out/1.0, dark-tech outExpo/0.9, editorial inOut/1.25, brutalist outExpo/0.7, neon outExpo/0.85,
playful outBack/0.95, luxury inOut/1.4, pastel inOut/1.15, swiss out/0.85, retro inOut/1.1. `KIT.ease` is that easing and
`KIT.dur(s)` multiplies by tempo. `engine.js` L13-19 defines the five easings (cubic in/out/inOut, expo out, back out c=1.6).

The archetype tables give a principled value for each token, and they agree with the current choices:

| Reelwright theme | Archetype | Easing to add as exact curve | Overshoot | Stagger |
|---|---|---|---|---|
| playful | Playful | `bounce (0.175,0.885,0.32,1.275)` or existing outBack | 10-20% | 60 ms |
| luxury, editorial, pastel, retro | Premium | `(0.4, 0, 0.2, 1)` | 0% | 80 ms |
| clean, swiss | Corporate | `(0.2, 0, 0, 1)` | 0-3% | 50 ms |
| brutalist, neon, dark-tech | Energetic | outExpo (existing) | 15-30% (only neon/brutalist) | 30 ms |

Proposed implementation (all pure in t):
- Add `K.bezier(x1,y1,x2,y2)` returning an easing `p -> y`, solved by a fixed 8-iteration Newton/bisection on x (no
  state, deterministic). Then `K.E.premium = K.bezier(.4,0,.2,1)`, `K.E.corporate = K.bezier(.2,0,0,1)`,
  `K.E.emphasized = K.bezier(.05,.7,.1,1)`, `K.E.accel = K.bezier(.3,0,1,1)`. Add `K.E.spring(stiffness, damping)` as the
  analytic damped cosine (`1 - e^{-zeta*w*t}(cos(wd t) + (zeta w/wd) sin(wd t))`, normalised to the settle time) for the
  "playful" overshoot; closed form, so scrub-safe.
- New tokens in themes: `--kit-ease-in` (exits), `--kit-stagger` (seconds), `--kit-settle` (duration of a settle),
  `--kit-overshoot`. `KIT.easeIn`, `KIT.stagger(i)`, using the "exit = 65-75% of entrance" ratio.
- Duration palette: take the Quick/Standard/Slow ratios (Playful 150/250/400, Premium 350/500/800, Corporate 200/300/450,
  Energetic 100/180/300 ms) as ratios of Standard: quick = 0.6x, slow = 1.6x (playful), 0.7x/1.6x (premium), 0.67x/1.5x
  (corporate), 0.56x/1.67x (energetic). Reelwright's existing `--kit-tempo` already encodes the Standard scale for a
  film (0.7 to 1.4); keep tempo as the single scalar and add only the quick/slow ratios.
- Caution: the absolute millisecond values are for UI micro-interactions. For video, durations of 0.2-0.5 s per element
  are right for cuts but a hero reveal wants 0.8-1.2 s. Use the tables for ratios and easing shape, not absolutes.
- Distance scaling (50px=0.8x ... full screen 1.8-2.0x) is useful for `camAt` moves: `dur = base * (0.8 + 0.0025*px)` capped
  at 2.0 for px > 400; UNVERIFIED as a good fit (derived from the table; the table does not give a formula).
- Quality checks that could become QA gates in tools/qa.py (WARN level): spatial move using linear easing; total stagger
  over 0.5 s; more than 1/3 of 3+ elements moving at once. These need film.js introspection and are optional (M).

### 2.3 Lottie playback in Reelwright?

The repo gives no Lottie content, so this is an independent assessment, from the lottie-web README only
(`gh api repos/airbnb/lottie-web/readme`):
- **lottie-web license: MIT** (verified by `gh api .../license`); last push 2025-09-01, not archived.
  dotlottie-web (LottieFiles' own player) is also MIT (verified).
- **Seekable:** README documents `goToAndStop(value, isFrame)` (frame number or time), `setSubframe(useSubFrames)` (false
  = respects the original AE fps), renderers `svg | canvas | html`, and `loadAnimation({container, renderer, loop:false,
  autoplay:false, animationData})`. So the intended render(t) mapping is
  `anim.goToAndStop(Math.round(t*fps_lottie), true)` with `autoplay:false`, subframe off. That fits a pure-function-of-t
  contract in principle.
- **UNVERIFIED (not run):** that repeated seeks (forward, backward, skipping) give byte-identical frames in Chromium;
  that Lottie expressions (which lottie-web evaluates with JS, can use `Math.random`/`time`) are deterministic; that
  text layers/fonts load synchronously; image-asset loading latency before first seek. Real animations from LottieFiles
  often use expressions, trim paths, mattes and gradient effects where players differ.
- Cost: a ~250 KB (lottie.min.js) runtime dependency (size UNVERIFIED, I did not download it), plus the "Lottie files are
  an asset class" problem: where do they come from? The community library has mixed per-file licenses (UNVERIFIED), so
  bundling sample files needs a per-file license read.
- A tiny Reelwright integration would be: `KIT.lottie(el, url, t0, t1)` that loads once, then `set(t)` calls
  `goToAndStop`. It would need the vendor/HyperFrames path to ship lottie.min.js (HyperFrames' registry is GSAP-based and
  deliberately left out; check whether its catalog already offers a Lottie block: UNVERIFIED, not looked at).

### 2.4 Recommendation on Lottie

**Out of scope for Phase 9 core.** Reasons: (1) the motion-design-skill repo has no Lottie tooling or format knowledge to
reverse-engineer; (2) Reelwright's brief is product videos made from code, with themes that supply their own motion; a
Lottie asset brings its own timing, colours and fonts that fight the theme system; (3) determinism has to be proven per
animation (expressions). If the owner later wants it, make it an **optional, S-sized, off-by-default `KIT.lottie` block**
in a later phase with: lottie-web vendored (MIT, VENDORED.md entry, NOTICE), `autoplay:false`, `goToAndStop(frame,true)`,
the `seekable` lint extended to ban Lottie expressions (scan `"x":` expression keys in the JSON), and a determinism
test (seek 1, 50, 10, 50 and compare hashes). Until then, say "Lottie not supported; export as MP4/PNG sequence
and drop in as a clip" in docs.

### 2.5 License decision per file

All files MIT. This is Markdown prose; copying it wholesale would add 1600 lines of generic UI advice to the agent's
context for little film value. Decision:
- `reference/timing-easing-tables.md` (106 lines): **REWRITE** as a compact "Motion presets" section in docs/PLAYBOOK.md
  and as data in themes (token values); facts such as cubic-bezier numbers are not copyrightable, but credit the source.
- `director/motion-personality.md`, `director/choreography.md`, `patterns/multi-element.md`: **REWRITE** the archetype /
  stagger tables as theme tokens; one paragraph of credit in THIRD_PARTY.md. No VENDOR (the MIT notice is only needed if
  prose is copied; if any paragraph is copied verbatim, add the LottieFiles MIT notice to THIRD_PARTY.md).
- `director/disney-principles.md`, `emotion-mapping.md`, `narrative-structure.md`, `context-adaptation.md`,
  `patterns/{entrance-exit,state-feedback,ambient-continuous}.md`, `reference/{property-selection,quality-checklist,
  troubleshooting}.md`: **NOT USED** (UI-state oriented, no rendering difference for a film). The film-relevant rules
  (no linear spatial motion, 1/3 screen, 1/3 simultaneous elements, hero first, counter-motion 20-30%) fit in 6 lines of
  PLAYBOOK.

**Effort:** S for tokens + `K.bezier` + docs; M if spring easing, `KIT.stagger`, and the QA lints are included.

---

## Recommendation

1. **Doodle theme (anidoodle): do it, native rewrite, effort M.** `themes/doodle.css` + `tools/doodle.js`: seeded rng
   keyed by element id, static wobble, boil keyed on `floor(t * 8)` (not frame number), SVG draw-on via
   `pathLength=1` and `stroke-dashoffset = 1 - p`, cost-weighted stroke scheduling snapped to the beat grid, procedural
   or pre-baked paper grain. Works in both renderers as plain SVG/DOM. No code vendored; Apache-2.0 means attribution
   is a courtesy but add a line in THIRD_PARTY.md. A handwriting font must be fetched and its OFL checked separately
   (anidoodle bundles none).
2. **Easing/timing presets (motion-design-skill): do it, rewrite as tokens, effort S-M.** Add `K.bezier`, exact curves
   for premium `(0.4,0,0.2,1)`, corporate `(0.2,0,0,1)`, emphasized `(0.05,0.7,0.1,1)`, an analytic spring, plus
   `--kit-stagger`, `--kit-ease-in` tokens; map the ten themes to the four archetypes as in the table in 2.2. Use the
   UI millisecond values as ratios only. Optional QA lints: linear spatial move, stagger total > 0.5 s.
3. **Lottie: out of scope.** The repo has no Lottie content; lottie-web (MIT) is seekable via `goToAndStop(frame, true)`
   per its README but its determinism is UNVERIFIED and expressions are a risk. Document "export to MP4/PNG sequence".
   Revisit only on owner request, as an opt-in block.
4. **Do not import** anidoodle's styles, music, 3D, or canvas engine (OUT OF SCOPE: Canvas/Remotion host, own audio
   synth; Reelwright has its own pipeline).

Not verified: fonts other than the three OFL TTFs anidoodle ships; Lottie runtime size and determinism; HyperFrames'
Lottie support; real-world draw-speed numbers for doodle (anidoodle's `rate: 38` is in its own canvas units).
