# Phase 9 research: remotion-dev/skills and greensock/gsap-skills (plus GSAP itself)

Research only. Cloned (shallow) into scratch/phase9/src/skills (remotion-dev/skills @ c7cb2fd, 2026-11-02) and
scratch/phase9/src/gsap-skills (greensock/gsap-skills @ aed9cfd, 2026-04-21). For numeric checks I also unpacked
`npm pack gsap@3.15.0` into scratch/phase9/src/gsap-npm (not installed anywhere, no dependency added). Test scripts
were run from /tmp and are not in the repo. Everything marked UNVERIFIED was not checked.

---------------------------------------------------------------------------------------------------------------

## 1. remotion-dev/skills

### 1.1 What it is and its license

- The repo is a mirror of `packages/skills` from the Remotion monorepo (its package.json: `@remotion/skills`,
  `private: true`, `repository: .../remotion-dev/remotion/tree/main/packages/skills`, version 4.0.540).
  Content: one router `skills/remotion-best-practices/SKILL.md` plus sub-skills `remotion-create`, `-markup`,
  `-captions`, `-maps`, `-multimedia`, `-render`, `-saas`, `-studio`, `-interactivity`, `-docs`, `-license`. About 40
  guidance .md files, a few .tsx/.mjs example assets, and sample data (a 333 KB country-meta.json).
- License of the skills repo itself: NONE. `gh api repos/remotion-dev/skills/license` returns 404, the tree has no
  LICENSE/COPYING file (searched the whole tree), the README and package.json state no license. No per-file headers.
  Under default copyright that is "all rights reserved".
- License of Remotion proper (`gh api repos/remotion-dev/remotion/license` = `NOASSERTION`, name "Other"; text read
  from the repo's LICENSE.md): a custom two-tier license, not open source. Free for individuals, for-profit
  organizations up to 3 employees, non-profits, and evaluation. Larger for-profits need a paid Company License
  (remotion.pro). Copying or modifying Remotion code to sell/license your own derivative is disallowed.
- Consequence: SPDX = none/NOASSERTION. Nothing from this repo or from Remotion's source can be vendored. Reelwright
  is MIT and must not carry any of it. REWRITE every idea below from documented behavior and standard math only,
  in our own words and code. I read Remotion's `spring-utils.ts`, `spring/index.ts` and `interpolate.ts` on GitHub to
  confirm behavior; the notes below record behavior and physics, not code.

### 1.2 Feature inventory and verdict

| Feature | File in repo | Verdict |
|---|---|---|
| interpolate() with clamp, per-segment easing array, bezier easing | remotion-markup/timing.md | GAP (partly: `K.seg/lerp/E` exist in tools/engine.js, but only one easing family and no n-1 easing keyframes) |
| spring() physics easing | timing.md, transitions.md | GAP (engine.js has no spring; "no spring/physics easing" in reelwright-has.md) |
| `output:'perceptual-scale'` for scale animations | timing.md | GAP |
| `posterize` (sample every Nth frame, stepped look) | timing.md | GAP, tiny |
| Sequencing: from / trimBefore / durationInFrames / playbackRate / loop, order of operations | sequencing.md, timing-props.md | GAP as a small helper; `clip.filmAt()` covers recordings only |
| TransitionSeries: transitions overlap scenes (total = sum - overlaps), overlays do not shorten, `offset` | transitions.md | GAP in pvk (no transition helper in engine.js); HyperFrames has catalog blocks (directional-wipe etc.) |
| Presentations: fade, slide (4 directions), wipe, flip, clockWipe | transitions.md | GAP |
| lightLeak overlay (progress 0..1, reveals in first half, retracts in second) | light-leaks.md | GAP, optional (WebGL in Remotion; we would do CSS gradients) |
| Motion blur (shutterAngle 180 default, 8 samples, average of sub-frame renders) | motion-blur.md | GAP, optional, costly |
| Audio-reactive: bass = mean of lowest 32 of 128 bins, `scale = 1 + bass*0.5` | audio-visualization.md | GAP (beatgrid.py finds onsets/drop; no continuous energy curve) |
| Silence detection: `loudnorm` JSON gives `input_thresh`, feed it to `silencedetect noise=<thresh>dB:d=0.5`; merge gaps < 0.2 s | silence-detection.md | GAP, small (no silencedetect in tools/) |
| Text annotations (highlight, circle, underline, strike, crossed-off, box, bracket) driven by `progress` | text-highlights.md | GAP (no stroke draw-on helper) |
| fitText / measureText / overflow check | measuring-text.md | UNVERIFIED whether layouts.js already fits text; qa.py has caption-overflow gate. Skip. |
| Color correction (exposure, WB, levels, curves, LUT) | color-correction.md | GAP for footage, low priority (ffmpeg `curves`/`lut3d`) |
| Canvas/WebGL effects library (about 70 effects: glow, vignette, chromatic aberration, halftone, scanlines, pixelate...) | effects.md | OUT OF SCOPE as a library (Remotion runtime, WebGL2/WebGPU). A few look ideas can be CSS/SVG filters in themes. |
| Voiceover per scene then composition length from audio duration | voiceover.md, calculate-metadata.md | COVERED (tools/vo.py + sched.py; project.json lines drive timing). ElevenLabs path is paid: OUT. |
| Captions (Caption type with startMs/endMs, SRT import, Whisper transcribe) | remotion-captions/* | COVERED (karaoke captions, captionCues, .srt/.vtt in README) |
| SFX list (remotion.media/*.wav incl. meme sounds) | sfx.md | OUT: network-hosted, license unknown, Reelwright synthesizes its own cues |
| Maps (Mapbox, MapLibre, MapTiler, Cesium, GeoJSON) | remotion-maps/* | OUT: tokens/paid tiles, needs network, heavy |
| Lottie, 3D (three), gifs, rive, html-in-canvas | lottie.md, 3d.md, gifs.md | OUT: Remotion packages / not determinism-friendly; Lottie already flagged absent in reelwright-has.md |
| Studio interactivity, `Interactive.*`, Tracks, connected compositions, render/SaaS/Player | remotion-interactivity/*, remotion-render/*, remotion-saas/* | OUT: Remotion-runtime-specific |
| Rule: CSS transition/animation will not render; drive from frame | remotion-markup/REFERENCE.md | COVERED (PLAYBOOK.md "Engine rules", qa seekable-animation lint) |

### 1.3 Techniques worth taking (verified detail)

**Spring (the main item).** Defaults from the official docs page (remotion.dev/docs/spring.md): `mass 1`,
`damping 10`, `stiffness 100`, `overshootClamping false`; also `from 0`, `to 1`, `delay`, `reverse`,
`durationInFrames` (stretches the natural curve to that length), `durationRestThreshold` (default 0.005 in
`measureSpring`: the spring is "settled" when it stays within 0.5% of the target). Order of operations: stretch to
duration, then reverse, then delay.

The math is the standard damped harmonic oscillator, step from rest at 0 toward 1, v0 = 0:
- `w0 = sqrt(stiffness/mass)`, `zeta = damping / (2*sqrt(stiffness*mass))`.
- Underdamped (zeta < 1), `w1 = w0*sqrt(1-zeta^2)`:
  `x(t) = 1 - exp(-zeta*w0*t) * (cos(w1*t) + (zeta*w0/w1)*sin(w1*t))`
- Critical (zeta = 1): `x(t) = 1 - exp(-w0*t) * (1 + w0*t)`
- Overdamped (zeta > 1), `s = w0*sqrt(zeta^2-1)`, `r1 = -zeta*w0 + s`, `r2 = -zeta*w0 - s`:
  `x(t) = 1 - (r2*exp(r1*t) - r1*exp(r2*t)) / (r2 - r1)`
- `t` in seconds = frame / fps. With overshootClamping, return `min(x, 1)`.

I checked these numerically: my closed form equals Remotion's frame-by-frame stepper to 2e-16 for zeta < 1 and
zeta = 1, and the overdamped form matches a brute-force ODE integration (x(0.1 s) = 0.0465, damping 200).

IMPORTANT quirk found in the source: for any zeta >= 1 Remotion uses the critically damped formula regardless of
damping (it only has an underdamped and a critically damped branch). So `spring({damping:200})`, the recommended
"push with no bounce" in their guide, is really a critically damped curve with w0 = 10 rad/s, not a true overdamped
spring (the exact zeta = 10 curve takes more than 10 s to settle). At 30 fps that quirk curve reads: frame 3 = 0.264,
6 = 0.594, 9 = 0.801, 12 = 0.908, 15 = 0.960, 20 = 0.990. Default config (zeta 0.5): peak 1.163, settles in 28 frames
@30 fps, value at frame 10 = 1.155. `damping:20` (zeta 1): no overshoot, settles in 23 frames. Reelwright should
clamp `zeta` to `>= 1` into the critical branch to match the look people expect, and expose the cleaner knobs
`{ zeta, w0 }` or `{ bounce, settle }` as well as mass/damping/stiffness.

**Perceptual scale.** For `output:'perceptual-scale'` they interpolate in "area" space: `a = sign(v)*v*v`,
`result = sign(r)*sqrt(|r|)` with `r = lerp(a_from, a_to, easedP)`. Reason: a linear 0 to 1 scale looks like it
slows down at the end because perceived size follows area. One-liner for engine.js.

**Easing choices in their guidance (good defaults to quote in the PLAYBOOK):** `bezier(0.16, 1, 0.3, 1)` (a fast
expo-like ease-out) for entrances; `spring damping 200` for a calm push; a fade of about 0.3 s; transitions of
15 to 20 frames at 30 fps (0.5 to 0.67 s); light-leak overlays of 20 to 30 frames centered on the cut; `n-1` easings
for `n` keyframes, with `linear` in the hold.

**Sequencing semantics (worth copying as a tiny pure helper).** An item has `from` (when it appears), `trim`
(start inside its own timeline), `dur` (range selected), `rate`, `loop`. Local time = `trim + (t - from) * rate`;
duration on the parent timeline = `dur / rate`; loop repeats the selected range until the parent ends. All layers of
one shot (footage, captions, overlays) share one boundary so retiming the shot moves them together.

**Transitions (semantics).** Each presentation is a function of `progress` 0..1 for an entering and an exiting
scene. Overlap rule: total length = sum of scene lengths - sum of transition lengths. Overlays never shorten the
timeline and take an `offset` relative to the cut center. Slide directions: from-left, from-right, from-top,
from-bottom. Spring-timed transitions have a duration derived from the settle time.

**Motion blur.** Shutter model: blur window = `shutterAngle/360` of one frame (default 180 = half a frame) sampled at
`samples` sub-frame times (default 8, max 64) and averaged. The exact sample placement is UNVERIFIED (I did not read
that source). With a pure `render(t)` this is natural: render t at sub-frame offsets and average.

**Audio-reactive.** FFT bins to a bass band to `scale = 1 + 0.5*bass`, `opacity = min(0.6, 0.8*bass)`. For us the
analysis runs at build time (numpy in tools/), writes a per-frame energy array, and film.js reads it as a pure
function of t.

**Silence detection (ffmpeg only, offline).** Two passes: `loudnorm=print_format=json` to read `input_thresh`, then
`silencedetect=noise=<input_thresh>dB:d=0.5`. Parse `silence_start/silence_end`; treat silences closer than 0.2 s
as one block; leading silence = block at about 0; trailing = block reaching the end. Useful for trimming edge-tts
output and screen takes.

### 1.4 Native Reelwright plan

All items are plain JS in tools/engine.js (shared by pvk and hyperframes, since both run film.js through KIT) unless
noted; each is a pure function of `t`.

| # | Work | Files | Pure of t? | pvk | HF | Effort |
|---|---|---|---|---|---|---|
| 1 | `K.spring(p_or_t, cfg)` + `K.E.spring(zeta,w0)`: closed form above, `K.springSettle(cfg)` returns settle seconds (bisect on the closed form) so a scene can size itself; presets `snap` (critical, w0=10) and `bouncy` (zeta 0.5) | tools/engine.js | yes (closed form, no frame loop, no cache needed) | yes | yes | S |
| 2 | `K.E.bezier(x1,y1,x2,y2)` (solve x(s)=p with Newton + bisection, return y(s)); named `expoish = (0.16,1,0.3,1)` | tools/engine.js | yes | yes | yes | S |
| 3 | `K.keys(t, times, values, {ease:[...n-1], posterize})` n-keyframe interpolate with per-segment easing; `K.scaleArea(a,b,p)` perceptual scale | tools/engine.js | yes | yes | yes | S |
| 4 | `K.local(t, {from,trim,dur,rate,loop})` returns local time or null outside the window | tools/engine.js | yes | yes | yes | S |
| 5 | `K.transition(t, cut, dur, kind, dir)` returning `{enter, exit}` style objects for fade/slide/wipe(clip-path)/flip/clockWipe(conic mask) + `overlap` arithmetic in `sched.py`/film total | tools/engine.js, docs/PLAYBOOK.md | yes | yes | yes (HF blocks remain an alternative) | M |
| 6 | Light-leak overlay: 2 to 3 blurred radial gradients, additive blend, opacity = triangle(progress) | tools/layouts.js or engine.js | yes | yes | yes | S |
| 7 | Loudness envelope: `tools/beatgrid.py` also writes `env` (bass band RMS at 30 to 60 Hz) to film data; `K.level(t)` reads it | tools/beatgrid.py, tools/engine.js | yes (data lookup) | yes | yes | M |
| 8 | `tools/silence.py` or a function in mix.py: loudnorm JSON then silencedetect, used to trim VO/takes | tools/ | n/a (build step) | yes | yes | S |
| 9 | Stroke draw-on + annotations: `K.draw(pathEl, p)` using `pathLength=1`, `stroke-dasharray`, `stroke-dashoffset = 1-p`; annotation kinds built as SVG paths with a seeded PRNG for hand-drawn wobble | tools/engine.js, new layout | yes (seeded, never Math.random) | yes | yes | M |
| 10 | Optional motion blur: render the film at N x fps offsets in the shutter window and average with ffmpeg `tmix`; flag `--motion-blur`; multiplies render time by N | tools/renderers/*.mjs | yes | yes | yes | L, defer |
| 11 | Footage color pass via ffmpeg `curves`/`lut3d` | tools/ | n/a | yes | yes | S, low priority |

### 1.5 Recommendation for remotion-dev/skills

Take items 1 to 4 now (one small PR, about 60 lines, plus a PLAYBOOK paragraph on defaults and when to use spring vs
`outExpo`), then 5 and 6 (transitions) and 8 (silence). Do 7 and 9 if the film backlog wants audio-reactive visuals or
annotations. Nothing is vendored; every item is rewritten from physics/behavior. Do not copy Remotion text, examples,
or sample assets into the repo. Do not rely on the skills repo license in any way: there is none.

---------------------------------------------------------------------------------------------------------------

## 2. greensock/gsap-skills and GSAP itself

### 2.1 Repo contents and license

- License of the skills repo: MIT, Copyright (c) 2026 GreenSock (LICENSE file read; each SKILL.md also has
  `license: MIT` frontmatter). The GitHub license API did not return a parsed SPDX id for it, but the file text is the
  standard MIT text. SPDX: MIT (read from the file).
- Contents (about 145 KB): `skills/gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`,
  `gsap-performance`, `gsap-react`, `gsap-frameworks` (each a SKILL.md), plus `examples/` (react, vue, nuxt, vanilla)
  and Cursor/Copilot/Claude plugin metadata. Per file: VENDOR is permissible (MIT, keep copyright + license), but
  there is nothing worth vendoring: they teach GSAP's API to an agent, and Reelwright must not tell agents to use
  ScrollTrigger, React hooks, matchMedia or `gsap.ticker`. REWRITE a short section in our own words instead.
- The repo's README says GSAP is "100% free". That is a marketing statement; the binding text is the library license
  in 2.2.

### 2.2 GSAP library license (verified from the official source)

Read directly from https://gsap.com/standard-license (fetched 2026-11-02), plus the npm registry entry and the
banner in the downloaded gsap@3.15.0 build.
- Name: "Standard 'No Charge' GSAP License". Effective April 30, 2025; last modified May 30, 2025; (c) Webflow.
  Incorporated into Webflow's Terms of Service; the GSAP License wins on conflict.
- npm `gsap@3.15.0` `license` field: "Standard 'no charge' license: https://gsap.com/standard-license." The
  gsap.min.js banner: "Copyright 2026, GreenSock. All rights reserved. Subject to the terms at
  https://gsap.com/standard-license." It is NOT an OSI license and NOT MIT. (greensock/GSAP on GitHub has no
  LICENSE file; the license API returns 404.)
- Grant: a non-exclusive, worldwide license to use, reproduce, display and implement GSAP Products (the core library
  AND all plugins, including the former paid ones SplitText, MorphSVG, DrawSVG, ScrollSmoother, Inertia, Physics2D...)
  solely for "Permitted Uses" = implementation or use on any website, web application or digital interface by any
  person or company. The FAQ states commercial use is free for the whole library with no payment.
- Restrictions: no "Prohibited Uses" = using GSAP in tools that let users build visual animations without code, if
  that encourages or materially assists a solution competing with Webflow's visual animation builder; no reverse
  engineering to build Competitive Products; do not remove proprietary notices or branding.
  The FAQ says AI-generated GSAP code is not a Prohibited Use, and that visual tools that do not directly compete
  with Webflow are encouraged (they invite you to contact them when unsure).
- Other terms: IP stays with Webflow; Webflow may terminate if you breach; Webflow may amend the license by posting
  new terms (continued use of newer versions means acceptance; you may stay on older versions under the older
  terms). The old "no fee to end users" plain-English summary is still in the page HTML but commented out; it does not apply.
- Not stated anywhere I read: an explicit right to sublicense or redistribute GSAP inside someone else's repository
  under a different license. "Reproduce" is in the grant, but the text leaves redistribution inside an MIT project
  unaddressed. Treat that as unclear.
- Fit for Reelwright: films are code written by a developer/agent; Reelwright is not a no-code animation builder, so
  Prohibited Uses should not apply. The `preview` scrubber and `remix` are viewers, not animation builders. A
  maintainer should still confirm if Reelwright ever grows a visual keyframe editor. This is my reading, not legal advice.

### 2.3 Can GSAP run deterministically from render(t)? Yes (verified in two ways)

1. Node test (plain objects, no DOM; run from /tmp against the unpacked gsap@3.15.0): a paused timeline with `to`,
   `from` (back.out), snapped numeric tween, and positional offsets (`'<0.5'`). Seeking with `tl.totalTime(t)` in the
   order 0, 1.5, 0.3, 2.9, 1.5, 0, 2.2 returned identical values every time the same t was visited (no MISMATCH), including
   going backwards. e.g. t=1.5 gives x=93.75, y=108.75 on every visit. So the timeline is a pure function of t.
   Not tested here: CSSPlugin DOM writes, and an actual end-to-end render in either renderer (research only).
2. The vendored HyperFrames already treats GSAP as the primary seekable runtime (grep of vendor/hyperframes):
   - `core/dist/adapters/gsap.js` `createGSAPFrameAdapter({fps,timeline})`: `init` pauses the timeline;
     `seekFrame(frame)` does `timeline.pause(); timeline.seek(frame/fps, false)`; duration = `totalDuration()`.
   - Registry: compositions publish `window.__timelines[<composition-id>] = gsap.timeline({paused:true})`
     (producer error text; used by components such as gesture-tap, which "registers one paused timeline").
     The runtime (`core/dist/runtime/timeline.js`, `mediaVolumeEnvelope.js`) reads `window.__timelines` and seeks with
     `totalTime(t, suppressEvents)` (falls back to `seek`), with extra logic to re-render children for stateful tweens.
   - Producer: an early stub batches `gsap.timeline().to/from/fromTo/set/add` calls (HF_EARLY_STUB) and exposes
     `window.__hfTimelinesBuilding`; it rewrites a `<script src=".../gsap/dist/...">` to a CDN or to a mirror set by
     `HYPERFRAMES_GSAP_BASE_URL`, pinned default `GSAP_CDN_VERSION = "3.15.0"`; diagnostics say "GSAP is not loaded ...
     Bundle GSAP locally in your project instead of using a CDN script". Lint (lint/dist/index.js) knows GSAP: flags
     `gsap.utils.random()`, `random(...)` strings, `repeat:-1` unbounded timelines, `requestAnimationFrame`, wall-clock time.
   - What is NOT in vendor/hyperframes: the GSAP library file itself (VENDORED.md: "Third-party code inside: none";
     `registry/blocks/` which load GSAP from CDN were left out). So HF renders of GSAP films need either internet (CDN)
     or a local copy supplied by the project / a mirror.
3. How it would plug into Reelwright's two renderers (no change to the "render(t) is pure" rule):
   - Build ONE paused timeline at film load (`const tl = gsap.timeline({paused:true})`), never call `tl.play()`.
   - In `render(t)` call `tl.totalTime(t)` (suppressEvents default true, so callbacks never fire) and let GSAP write
     the styles; or `tl.seek(t, false)` as HF's adapter does. Prime once by seeking to the end then to 0 so
     function-based values and `from()` start values are resolved before the first frame; render workers run in parallel
     and each initializes independently, which is the reason HF lints random().
   - Times come from `W()/V()/KIT.snap()` as usual and are used as position arguments (absolute numbers or labels),
     never `delay` chains from wall-clock logic.
   - pvk: load a LOCAL gsap.min.js via script tag (offline rule); HF: either the same local file in `hf/` or the CDN rewrite.
   - qa.py's seekable-animation lint currently forbids "GSAP/anime timelines left playing". It should allow a GSAP
     timeline that is paused and seeked from render(t). UNVERIFIED how that lint is written; check tools/qa.py before
     changing it.

### 2.4 Eases Reelwright can re-implement (all verified numerically against gsap@3.15.0)

Definition style used by GSAP: each family is defined once as `out`; `in(p) = 1 - out(1-p)`;
`inOut(p) = p<0.5 ? in(2p)/2 : (out(2p-1)+1)/2`. I implemented all of them from the formulas below and compared with
GSAP at 2001 points per ease: max difference below 3e-16 for every case listed, except where noted.

| GSAP name | out(p) | Notes |
|---|---|---|
| none | p | linear |
| power1 (alias quad) | 1-(1-p)^2 | default tween ease in GSAP is power1.out |
| power2 (cubic) | 1-(1-p)^3 | = Reelwright `K.E.out` |
| power3 (quart) | 1-(1-p)^4 | |
| power4 (quint) | 1-(1-p)^5 | |
| sine | sin(p*pi/2) | |
| circ | sqrt(1-(p-1)^2) | |
| expo | blended: GSAP's `in` is `2^(10(p-1))*p + p^6*(1-p)`, out = 1-in(1-p) | ends exactly at 1 (the plain `1-2^(-10p)` used by `K.E.outExpo` differs by up to 0.0078; `inOut` also derived) |
| back (overshoot s, default 1.70158; `back.out(1.7)` is the common form) | `(p-1)^2*((s+1)*(p-1)+s)+1` | Reelwright `outBack` with c=1.6 is the same formula; make c a parameter |
| elastic (amplitude a>=1 default 1, period default 0.3; inOut default 0.45) | `a*2^(-10p)*sin((p - period/(2pi)*asin(1/a))*2pi/period)+1`; p=1 returns 1; if a<1, period is divided by a | verified for `in`/`out`; `inOut` differs from the 0.3 form by up to 0.17 because its default period is 0.45 |
| bounce | piecewise: n=7.5625,d=2.75: p<1/d: n*p^2; p<2/d: n*(p-1.5/d)^2+0.75; p<2.5/d: n*(p-2.25/d)^2+0.9375; else n*(p-2.625/d)^2+0.984375 | |
| steps(n) | `floor((n+1)*clamp(p,0,1-1e-9)) / n` (jumps at p = k/(n+1), reaches 1 at p = n/(n+1)); with `immediateStart`: `(floor(n*p)+1)/n` | observed: steps(4) jumps to 0.25, 0.5, 0.75, 1 at p = 0.2, 0.4, 0.6, 0.8. NOT the same as CSS steps(n, end) |
| CustomEase | cubic-bezier numbers or SVG path data | covered by plan item `K.E.bezier` in 1.4; path-data form is optional |

Reference sample points (p = 0, .1, .25, .5, .75, .9, 1) to test against: power2.out `0 .271 .57813 .875 .98438 .999 1`;
back.out(1.7) `0 .4087 .81719 1.0875 1.06406 1.0143 1`; elastic.out(1,.3) `0 1.25 .91161 1.01563 1.00552 .99805 1`;
bounce.out `0 .07563 .47266 .76563 .97266 .98812 1`.

Implementation: `K.E` gets `makeEase(outFn)` that derives `in`/`out`/`inOut`, and `K.ease('power3.inOut')`,
`K.ease('back.out(1.7)')` string parsing (so theme `--kit-ease` can name any of them). About 40 lines, pure,
both renderers. Keep the existing `K.E.inOut/out/in/outExpo/outBack` names working.

### 2.5 GSAP guidance worth putting in docs/PLAYBOOK.md (a short "GSAP / timelines" section)

Only things that matter for a seeked, offline video:
- GSAP is optional. The default engine (KIT helpers) is enough for most films; use GSAP when you want label-based
  choreography, staggers across many elements, or SVG/text plugins.
- Always `gsap.timeline({ paused: true })`; nest child timelines with `master.add(child, position)`; drive it only
  with `tl.totalTime(t)` from `render(t)`. Never `play()`, `repeat:-1`, `yoyo` infinite, callbacks that mutate the DOM,
  `gsap.ticker`, `delay`, `onComplete` chains, `ScrollTrigger`, Draggable, Observer, or `gsap.utils.random`.
- Position parameter cheat sheet: `0` absolute, `"+=0.5"` after the previous end, `"<"` start with previous,
  `"<0.2"` 0.2 s after previous start, `">-0.1"` overlap, `"label+=0.3"`; use `defaults:{duration, ease}` on the timeline
  and `addLabel()` per VO line, with the label time computed from `W()/V()`.
- Prefer transform aliases (`x, y, scale, rotation, xPercent`), `autoAlpha` for fades, no layout properties
  (width/height/top/left); GSAP writes inline styles each seek, which matches Reelwright's own rule that `render(t)` sets styles.
- `from()/fromTo()` apply their start values immediately (`immediateRender`); when two `from()` tweens hit the same
  property of the same element set `immediateRender:false` on the later one. Function-based and relative values
  (`"+=20"`) are resolved at first render, so prime the timeline at t=0 and avoid relative values for repeatable results.
- Staggers: `stagger: 0.1`, `{amount: 0.3, from: "center"|"edges"|"end"|index}`, `gsap.utils.distribute({base,amount,from,grid,ease})`
  for grid/ripple delays. A pure re-implementation `K.stagger(i, n, {each|amount, from, ease})` is small (about 15 lines) and removes the need for GSAP for the common case.
- Plugins useful to video (all free under the current license, install from the public npm package):
  DrawSVG (stroke reveal `"0% 100%"`), MotionPath (move along a path, `autoRotate`), SplitText (chars/words/lines for
  kinetic type; `mask:"lines"` for line reveals; split after `document.fonts.ready`), Flip (layout morph), CustomEase,
  CustomBounce, CustomWiggle (wiggle uses no randomness). These are seekable when driven by the paused timeline.
- Accessibility note from their skills: `prefers-reduced-motion` matters for web pages, not for rendered mp4; skip `matchMedia`.
- Performance advice (will-change, quickTo, reduce tweens) is for live pages; irrelevant for frame-by-frame render
  except "don't animate layout properties".

### 2.6 Recommendation for GSAP (answer to the plan's key question)

Choose (i) + (iii), and do NOT do (ii):
- (i) Document how to use GSAP seekably (section 2.5, plus a worked example film under projects/ later). The user
  installs `gsap` into their project (`npm i gsap` in the project folder, or drop `gsap.min.js` into `film/` or
  `hf/`); Reelwright only needs to resolve a local file and allow a paused/seeked timeline in the qa lint. Zero change
  to the dependency list or license posture of the repo.
- (iii) Re-implement the eases listed in 2.4 natively (S effort, about 40 lines) plus `K.stagger`; this gives the
  GSAP "feel" in both renderers with no GSAP file at all. This is MIT-clean because it is public math, and I
  verified it against the real library.
- Not (ii): vendoring gsap.min.js into this MIT repo is not clearly allowed. The license is a proprietary
  "no charge" license owned by Webflow, grants use/reproduce/display/implement but is silent on redistribution under
  another license, requires notices to stay, can be amended by Webflow, and has a competing-visual-builder
  prohibition that would travel with the repo. Free, but not open source. If the maintainer wants a bundled copy anyway, get
  Webflow's written OK, ship it as an optional download step in `setup.sh` (fetched from the npm package at user
  request, like the music/fonts steps) rather than committing it, and add a THIRD_PARTY note. That keeps the repo MIT.
- The GSAP skills repo (MIT) can be linked from the PLAYBOOK for agents that want API detail; do not copy it in.

Effort summary: eases + stagger S; PLAYBOOK GSAP section S; qa lint tweak S (after reading tools/qa.py); example GSAP
project M (optional); optional setup-time download of gsap M.

---------------------------------------------------------------------------------------------------------------

## 3. Overall recommendation

1. Add to tools/engine.js in one change (about 100 lines, S to M): `K.spring` (+ settle time) and `K.E.spring`,
   `K.E.bezier`, `makeEase`/`K.ease('name(args)')` with the full GSAP family (power1-4, sine, circ, expo, back, elastic,
   bounce, steps), `K.keys` (n keyframes, per-segment eases, posterize), `K.scaleArea` (perceptual scale), `K.local`
   (from/trim/dur/rate/loop), `K.stagger`. All pure functions of t, identical in pvk and hyperframes. Write unit
   checks that compare against the sample values in this file.
2. Next: `K.transition` (fade/slide/wipe/flip/clock) with the overlap arithmetic (total = sum - overlaps), a CSS
   light-leak overlay, and a silencedetect helper (S to M).
3. Then, if wanted: continuous audio-energy envelope for beat-reactive visuals; SVG draw-on + annotation layout (M each).
4. GSAP: document seekable use, never vendor, optional setup-time download only with maintainer sign-off on the license.
5. Defer: motion blur (render time x N), WebGL effect library, maps, Lottie/3D (all OUT or L).
6. Licenses: remotion-dev/skills has no license and Remotion proper is not open source: REWRITE only, nothing copied.
   greensock/gsap-skills is MIT (vendorable but pointless). GSAP the library is the Webflow "no charge" license, free
   incl. commercial and all plugins, not redistributable under MIT terms as far as the text says.

Not checked: Remotion's motion-blur sample placement, `transitions` internals (flip/clockWipe math), any QA lint
code in tools/qa.py, an actual HyperFrames render of a GSAP film in this repo, rough-notation's own license.
