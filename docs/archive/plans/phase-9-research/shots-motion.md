# Phase 9 research: shots + motion (3 repos)

Method: shallow clones in scratch/phase9/src/ (dirs `skillx_-skill`, `motion-designx_motion-design`,
`claude-skill-motion-graphicsx_claude-skill-motion-graphics`), read by file. Nothing built, run, installed or called.
Card text is Chinese; I translated it. Frame numbers are at 30 fps (`s = f/30`). Demo code was read, not rendered.
Anything marked UNVERIFIED I did not check.

---------------------------------------------------------------------------------------------------------------
## 1. sfgdfgd/-skill  ("video-shotcraft")

Existence: `gh api repos/sfgdfgd/-skill` works. It is a GitHub FORK of `Vincentwei1021/video-shotcraft`
(API `fork: true`, parent verified; last push 2026-08-09). Skill name in SKILL.md: `video-shotcraft`. Use the upstream
name in credits. Content is identical to what I read; I did not diff against upstream.

License: SPDX Apache-2.0 (API + `LICENSE` file at root; no NOTICE file; no per-folder LICENSE; no per-file headers
found). Carve-outs that are NOT Apache: `assets/audio/` (Mixkit licences, per assets/audio/ATTRIBUTION.md; six files say
"cannot trace, confirm before commercial use", `pop.mp3` source unknown) and bundled demo screenshots/textures.
Code is Remotion TSX (Remotion has its own licence, README says so). Never vendor the audio or textures.

What it is (SKILL.md, README.md): an agent skill for Remotion product promos: 152 "shot recipe cards"
(references/shots/<category>/*.md, 10 categories: camera, data, effects, interaction, opening, outro, rhythm,
transition, typography, ui-entrance), 209 gallery previews, a full 36 s "Ink Press" template, 149 SFX, pipeline +
aesthetic-rules + sound-design + music-beat-sync docs, reusable Remotion components in assets/lib/ (PageCam, FlashCut,
Caption, DigitRoll, helpers/shake.ts, motion.ts, camera.tsx).

### 1.1 Reality check on the "named shot library"
There is no card called push-in / pull-out / orbit / rack-focus / crane as such. The names exist, but are spread over
cards (several cards bundle 2-4 variants "式"). Mapping of the names you listed to what actually exists:

| Name | Where it really lives | Verified? |
|---|---|---|
| push-in (slow) | camera/tension-camera-moves.md "C slow-push-in"; demo SlowPushIn.tsx | yes, params + code |
| push-in (hero) | opening/spotlight-hero-card.md (zoom 0.78 to 2.6 in 16 f, rotY 34 deg) | yes |
| pull-out | camera/tension-camera-moves "D pull-back-isolation"; demo PullBackIsolation.tsx | yes |
| crane | opening/crane-rise-reveal.md; demo opening/crane-rise-reveal/CraneRiseReveal.tsx | card yes, demo not opened |
| dolly zoom | camera/depth-layer-moves.md "pseudo dolly-zoom"; DollyZoomReal.tsx | yes (it is a fake: subject pinned, background scales) |
| orbit | tension "A bullet-time-freeze-orbit"; ui-entrance/deck-deal-flyin.md "pile-orbit-open" (rotX/Y/Z keys) | yes |
| whip pan | transition/shot-transitions.md "E whip-pan" (basic + brake); WhipPanReal.tsx, WhipBrakeReal.tsx | yes |
| rack focus | shot-transitions.md "C focus relay" (text only, "no in-library implementation") | card only |
| crash zoom | camera/crash-zoom-punch.md; CrashZoomReal.tsx, CrashImpactReal.tsx | yes |
| dutch roll | tension "B dutch-roll-to-level"; DutchRollToLevel.tsx | yes |

### 1.2 Every camera / named shot, with definition and parameters
Convention in source: stage 1920x1080, `zoom` = scale about a focal page point (cx, cy). All eases are Remotion
`Easing.*`; cubic-bezier values given where the source gives them. "Reelwright ease" = what exists in KIT.E today
(inOut, out, outExpo, in, outBack); `in(quad)` and `bezier()` are NEW (see 1.5).

| # | Shot (source card) | Definition | Parameters (frames @30, seconds in brackets) | Easing | Pure fn of t? |
|---|---|---|---|---|---|
| 1 | **slow-push-in** (tension C) | Accelerating push toward subject, builds tension; ends in a HARD CUT to a bright scene | scale 1.00 to 1.14 over 120 f (4 s); vignette alpha 0 to 0.5 same curve; cut frame = 120, zero transition; follow with 30 f still | `Easing.in(quad)` (accelerating) | yes |
| 2 | **hero push-in** (spotlight-hero-card) | Static wide, then fast push to oblique close-up on one card | hold zoom 0.78 for f82-114; push 16 f (0.53 s) to zoom 2.6; rotY 34 deg dominant, rotX only 8 deg, persp 1200; focus = card centre shifted 30 px left; after landing lock cx/cy/zoom/rot for >=15 f (no tail drift) | out-ish | yes |
| 3 | **crash-zoom** (crash-zoom-punch) | One-beat slam from wide to target close-up, then either overshoot-rebound or hard-stop shake | hold 40 f, push 6 f (4-8 ok) zoom 1 to 2.6 (range 2.4-2.8; target card fills 60-75 %); cx/cy converge with `in(quad)`; zoom easing `bezier(.55,0,.7,1)`. Rebound variant: 2.6 to 2.45 over 5 f (3-6 %). Hard-stop variant: shake amp 14 px * exp(-t/1.8 f), settles in 6 f, no rebound. Hold >=45 f after. Motion blur: only the 6 f push, shutterAngle 200, samples 20. Max 2 per film | in | yes |
| 4 | **pull-back-isolation** (tension D) | Pull away from a glowing hero card; siblings go dark in distance order; hero left floating in black | scale 2.2 to 0.62 over 110 f, `out(cubic)`, origin locked on hero centre; siblings sorted by hypot distance, first goes out at f30 then one per 8 f, each 16 f opacity to 0 and brightness to 0.3; background sinks to #141414 over f60-110; hero double white box-shadow glow fades in f60-100; end hold >=40 f | out cubic | yes |
| 5 | **crane-rise** (crane-rise-reveal) | Start on one data row (scale 3.2), rise and pull back until the whole dashboard fills the frame | origin top-left; translate = screenCentre - target*scale; target moves from bottom-row centre to page centre with scale 3.2 to 1.0 on ONE shared progress; 20 f hold, 100 f rise, 30 f still; `out(quad)`; row pulse when camera top edge `visTop = fy - 540/s` crosses a row (alpha 0 to .22 to 0 over 22 f, dark overlay on white pages); blur only on first half | out quad | yes |
| 6 | **dolly-zoom (fake)** (depth-layer-moves) | Hero pinned in place, background scales up and blurs: "world presses in" | t over f15-110 `bezier(.4,0,.3,1)`; bgScale = 1 + 1.25 t (so 2.25), bgBlur = 3.5 t px, bg saturate 0.9, opacity <=0.6 at end; hero drop shadow offset 12 to 28 px; hero NOT transformed. Max 1 per film | bezier | yes |
| 7 | **multiplane parallax slide** (depth-layer-moves) | Lateral slide, 3 layers at different speeds | one drive x per-layer coefficient 0.35 (bg, blur 2 px, sat .92, opacity .85) / 0.7 (mid, sharp, reading layer) / 1.4 (fg, blur 3 px); gap >=2x between layers, <=4 layers | any | yes |
| 8 | **whip-pan, basic** (shot-transitions E) | Camera slings sideways across 1.5 screens; blur hides the cut | hold >=20 f each side; swing 8 f (0.27 s) over 2880 px (1.5 x 1920), peak speed target >=300 px/f (demo ~540); `bezier(.6,0,.4,1)`; both scenes on the same y line; blur only on the swing: shutterAngle 200, samples 8 (demo uses 20) | bezier | yes |
| 9 | **whip-pan, brake** (E) | Same, but arrives with a long reading tail | first 70 % of distance in 30 % of the time, last 30 % over ~48 f ease-out; tail <60 f | piecewise | yes |
| 10 | **orbit around stack** (deck-deal-flyin, pile-orbit-open) | Side-tilted camera circles a stack, then pulls back | keys f0 to f34: rotX 46, rotY -30, rotZ 9, zoom 1.95 TO rotX 42, rotY 26, rotZ -7, zoom 1.85; persp 1100; needs dark brushed-metal backdrop and visible stack height (aesthetic-rules Q7) | out | yes |
| 11 | **bullet-time freeze orbit** (tension A) | Content freezes mid-animation, camera circles the frozen UI plane, time resumes | TWO CLOCKS: `effFrame = f<F1 ? f : f<F2 ? F1 : F1+(f-F2)` drives content; real f drives camera; persp 1600; rotY 0 to 55 deg (f45-72, inOut cubic), hold ~10 f, back to 0 (f82-105); scale 1 to 1.12 to 1; >70 deg goes paper-thin | inOut cubic | yes (clock remap) |
| 12 | **dutch-roll-to-level** (tension B) | Tilted frame (pain) snaps level (fix) | start rot -10 deg + +-0.8 deg slow sine drift + 2 px vertical drift; at ROLL: 14 f `out(cubic)` to +1.2 deg overshoot, then 10 f `inOut(quad)` to 0; scale 1.15 to 1.08 (hides corners); drift fades over 6 f | out cubic + inOut quad | yes |
| 13 | **tilt-reveal** (overhead A) | Page lying flat, camera "lifts head" until it is square on | rotX keys [-80, 2.6, -0.9, 0] at f25/68/72/76, origin 50% 0%; perspective 600 to 1200, perspective-origin y 5% to 40%; scale 3.2 to 1, translateY 200 to 0; same out-cubic; ends f76 then still to f145 | out cubic | yes |
| 14 | **tabletop drop** (overhead B) | Cards flat like a table; camera slides across, dives into one | rotX 62 deg; pan f0-55 translateX +700 to -650 (inOut cubic), angle LOCKED; drop f55-85: rotX 62 to -1.8 to .6 to 0, scale 1 to 2.04 to 2.0, translateX -650 to 0 all together; cards 996x560; grid floor needed or pan is unreadable | out cubic | yes |
| 15 | **drone-dive** (space C) | Near-vertical top-down hover, dive, soft brake into hero close-up | one progress p: rotX 72 to 0, scale .42 to 1.35, translate converge; dive 25 f `in(cubic)` takes 82 % of travel; brake 20 f `out(poly 5)` the last 18 %; origin pinned on hero; motion blur shutter 220, samples 9; floor shadow dries up on landing | in then out | yes |
| 16 | **exploded view** (space A) | Panel splits into layers along Z, hovers, closes with a thud | persp 1600, scale .76, rotX 18, rotY -12, preserve-3d; parts translateZ 60-320 px, stagger 3 f, 14 f `outBack(1.7)`; reverse order close 12 f `in`, then 2 f shake amp 13 px decaying; depth cues: shadow lower and softer, base dim 22 %, far parts brightness -28 % | outBack | yes |
| 17 | **impress.js 3D tour** (basic-3d-scene) | Cards placed in 3D; camera = inverse of each card pose | `camera = scale(1/s) rotateZ(-rz) rotateY(-ry) rotateX(-rx) translate3d(-x,-y,-z)`; flights at 0.22/0.48/0.76 of the clip, each 0.16 long (~0.96 s), inOut cubic, chained lerp; off-focus cards opacity floor .28, blur up to 3.5 px; overview s=3.1; persp 1000 | inOut cubic | yes |
| 18 | **terminal 3D tour** (terminal-3d) | Same inverse-pose camera across 3 windows with a breathing pull-back mid-flight | `translateZ(300-pull) rotateY(-ry) translate3d(-x,-y,-z)`; pull = sin(pi p) * 210 px; flights [0.30,0.44] and [0.64,0.78]; focus falloff /420 px; typing only after arrival | inOut cubic | yes |
| 19 | **cursor flyover** (cursor-flyover) | Overhead then 4 corner close-ups; cursor shares the camera table | CAM[0] scale .8, corners scale 1.72; transform `translate(50-tx*s%, 50-ty*s%) scale(s)`; windows [.20,.32][.40,.52][.60,.72][.79,.91] (transit .12, dwell .08); cursor drawn with `scale(1/s)`; click ripple 26 px ring .3 to 1.9 x | inOut cubic | yes |
| 20 | **graze-face tour** (graze-face-tour) | Low-grazing camera over UI "terrain"; text floats 120-180 px above and lands, shadow shrinks | big rotX/rotY, perspective; hover height 120-180 px; landing order follows camera direction 0.2 to 0.85, overlapping not serial; shadow blur/offset/opacity linear in height; crossfade >=8 f between segments | fall (accel) | yes |
| 21 | **steep-tilt glide** (steep-tilt-glide) | Camera fixed, page stands at 60 deg and slides past; speed ghosting | persp 1100, origin 30% 58%, rotateY(-60) rotateZ(-2), all constant; page translateX +60 to -4100 on `bezier(.3,.12,.72,.9)`; ghosts = same position at f-2.5 and f-5, alpha proportional to speed; 55-65 deg only | bezier | yes |
| 22 | **rack-focus relay** (shot-transitions C) | Foreground blurs out while background sharpens, focus is the cut | blur 0 to 8 px (out) and 8 to 0 px (in), overlap 10-16 f, in-layer starts 2-4 f later; shallow DoF must exist before the cut | any | yes |
| 23 | **handheld** (helpers/shake.ts) | Deterministic hand-held drift | `amp*(sin(0.31 f) + 0.6 sin(0.83 f + 1.7))`, y: `sin(0.47 f + 0.9) + 0.5 sin(1.13 f + 3.1)` (f in frames; times 30 for rad/s) | n/a | yes |
| 24 | **impact shake** (several) | Exponential decaying shake | `A exp(-t/tau)`, A 10-14 px, tau 1.8-2.5 f, force 0 after ~14 f | n/a | yes |
| 25 | **speed ramp / freeze** (speed-ramp-freeze) | Time remap | `src = interpolate(f,[0,40,85,135],[0,88,97,207])`; slow window slope .2 vs fast >=2 (>=10x contrast), blur ONLY on fast part; freeze = slope 0, snap in, no ease | piecewise | yes |

Common rules repeated across cards (worth encoding as lint/docs): hold 30-45 f of true stillness after any big move
(their "R1"), no tail drift (zoom 2.6 to 2.58 forbidden); one camera mover per segment; <=2 big camera moves per film;
motion blur only on the fast part of the move; fonts must stay sharp (use layout zoom, not scale, see 1.4).

### 1.3 Other things in the repo (COVERED / GAP / OUT OF SCOPE)

| Feature | File | Verdict |
|---|---|---|
| 152 shot cards (typography, transitions, UI entrances, data, effects) | references/shots/** | Mostly GAP as ideas; only the 25 camera/time items above plus 5 below are planned. The rest are a later backlog. |
| Camera moves over a screen recording: pan/zoom keys | PageCam.tsx | COVERED in part: `KIT.camAt` (tools/engine.js:206) does z/fx/fy with inOut. Everything with rotation, perspective, per-segment ease is GAP. |
| Gradient depth-of-field band on a tilted page | PageCam.tsx `dof` (backdropFilter blur + mask) | GAP, S |
| Layout-scale zoom (CSS `zoom` instead of `scale` so text re-rasterizes sharp under 3D) | PageCam.tsx comments | GAP, important, S. Same Chromium in both renderers. |
| Deterministic velocity / lag helpers (`velocityAt`, `lagged`, `dampedSettle`) | helpers/motion.ts | GAP, S (10 lines). Gives speed-driven blur, ghost trails, settle tails with no state. |
| Scroll/shake/ripple/overshoot easings | many | partly COVERED (outBack); add `inQuad`, `outQuint`, `bezier`, `outBack(c)` |
| Beat-synced cut methodology | references/music-beat-sync.md | COVERED (tools/beatgrid.py, KIT.snap) |
| Sound design with pinned SFX frames | references/sound-design.md + assets/audio | COVERED (KIT.cue). Audio files: OUT OF SCOPE (unclear Mixkit licences). |
| 36 s Ink Press template + screenshot capture scripts | template/, assets/scripts/ | OUT OF SCOPE (Remotion, product screenshots; Reelwright records real UIs instead) |
| Aesthetic QA rules (Q1-Q11 e.g. min text height 5 % of frame for captions, 3 % secondary) | references/aesthetic-rules.md | GAP as docs; Reelwright qa.py already checks caption overflow/contrast. A min-text-height gate is a possible small add (S). UNVERIFIED whether qa.py has one: not checked. |
| `CameraMotionBlur` (Remotion sub-frame accumulation) | demos | needs a renderer feature, see 1.4 |

### 1.4 Native Reelwright plan (named shot library as camera presets)

Design: a new `tools/shots.js` (loaded by engine.js, so `KIT.shot` is available in both renderers; pure functions only).

```
KIT.cam3(keys,t)                  // generalises camAt: keys carry t,z,fx,fy,rx,ry,rz,persp,blur,ease
KIT.shot.pushIn({t0,t1,from,to})  // each preset returns a function t -> camera state
KIT.shot.track([ {at:t0, shot:...}, {at:t1, shot:...} ])   // picks by time, holds last state (stillness)
KIT.camCSS(state, W, H)           // -> {transform, perspective, zoom, filter}  applied to the stage element
KIT.shot.names                    // list for `./video.sh shots` and the playbook
```
Presets (all 25 rows above reduce to ~12 camera functions + 4 helpers):
- Camera-state presets: `pushIn` (accel curve, optional vignette value), `heroPush`, `crashZoom{variant:'rebound'|'stop'}`,
  `pullBack`, `craneRise`, `dutchRollToLevel`, `tiltReveal`, `tabletopDrop`, `droneDive`, `orbit`, `steepTilt`,
  `whipPan{variant:'basic'|'brake'}`, `tour(posesTable)` (impress.js inverse-pose; also covers terminal/cursor tours).
- Layer-level presets (act on elements, not on the camera): `dollyZoom(bgEl, heroEl)`, `parallax([{el,coef}])`,
  `rackFocus(fromEl,toEl,t0,dur)`, `floatLand(els, order)`.
- Time presets: `KIT.remap(t, [[tOut,tSrc],...])` for speed-ramp / freeze, bullet-time double clock
  (`effT = remap(t)` drives content, real `t` drives camera).
- Noise helpers: `KIT.handheld(t, amp)` (convert the frame constants to rad/s: 0.31*30=9.3, 0.83*30=24.9, 0.47*30=14.1,
  1.13*30=33.9), `KIT.shake(t, t0, amp, tau)`.
- Easings to add to KIT.E: `inQuad`, `outQuart/outQuint(poly 5)`, `inOutQuad`, `bezier(x1,y1,x2,y2)` factory, `outBack(c)`.
  Without these, most of the cards' feel (accelerating pushes, brake) cannot be reproduced. Keep `KIT.ease` (theme) as the
  default and let presets name their own.

Time units: all durations in seconds, ALWAYS derived from beats/VO (`K.W`, `K.V`, `K.beat`), never the source's frame
counts. The card values are shapes (ratios and counts: 6 f push, 8 f swing, 82/18 split) kept as `fps`-scaled
constants `f(6)` = 6/30 s. This respects the "no hard-coded seconds" rule: presets take a start time and a scale factor,
the numbers inside are durations relative to a base, e.g. `crashZoom({t0, push: 0.2})`.

Pure-function / renderer notes:
- Every preset is closed-form in t (ease + lerp + sin). No state. hyperframes and pvk both run a Chromium page, so the same
  CSS (`transform`, `perspective`, `zoom`, `filter`) works in both. Check the HF seekable-animation lint: do not use CSS
  transitions, only set styles from `render(t)`.
- Use CSS `zoom` (layout scale) instead of `transform: scale()` for camera zoom on text/UI; it is what keeps glyphs
  sharp. Transform order matters: `translate -> rotateY -> rotateX -> rotateZ` with transform-origin at the focal point.
- Motion blur: the source uses Remotion sub-frame accumulation. Reelwright options, cheapest first:
  (a) directional CSS blur driven by central-difference speed `|cam(t+dt) - cam(t-dt)|` (cheap, pure, S);
  (b) N sub-frame renders at `t + (k/N - 0.5) * shutter/fps`, averaged (renderer change in tools/renderers/pvk.mjs, M, only
  pays on the 6-8 f whip/crash segments; make it opt-in per shot). Recommend (a) first, (b) later.
- Dutch roll/tour/orbit need scene content wide enough to avoid exposed corners: presets expose `bleed` (scale margin) and
  QA already flags blank frames.

Docs: new section "Camera shots" in docs/PLAYBOOK.md with the table in 1.2 (name, when to use, energy, budget: <=2 big moves,
stillness after every move, one mover per segment), plus `./video.sh shots` printing the names. Put in the
`.claude/skills/product-video/SKILL.md` list so agents pick shots by name. Shot-to-VO mapping: shot in project.json
as `"shot": "crash-zoom"` on a line, resolved in film.js through `KIT.shot[...]({t0: W(id)...})` (optional, M).

Effort: presets + easings + camCSS + docs = M. Add tour(), tiltReveal/tabletopDrop/droneDive 3D (perspective, checks for
Chromium raster sharpness and exposed edges in 9x16/1x1) = M. Motion blur supersampling = M. Total about L if all of it,
M for the 8 most useful (push-in, pull-back, crash-zoom, whip-pan, dolly-zoom, orbit, crane, dutch-roll).

### 1.5 License decision (Apache-2.0)
- Cards (*.md): REWRITE. They are Chinese prose; I only extract numbers/shape descriptions. Facts and parameter values are not
  copyrightable expression, but a translated card would be a derivative work. Mention "ideas and tuned parameters studied
  from Vincentwei1021/video-shotcraft (Apache-2.0)" in THIRD_PARTY.md. Cheap and polite.
- TSX demos / PageCam / helpers: REWRITE as plain JS. Reasons: Remotion/React/TypeScript do not fit the engine; vendoring them
  would pull in Remotion's non-OSI licence terms for companies; the code is small closed-form math. If you do copy even
  `shake.ts` (6 lines) verbatim you must keep Apache header + NOTICE-style attribution and a VENDORED.md entry; not worth it.
- Audio, textures, template screenshots: do NOT take (third-party Mixkit licences, product captures).
- Their own caveat to inherit: parameters came from grey placeholder content and are "starting points, not final"; our
  presets must be validated on real recordings (render stills, read `stills/sheet.jpg`).

---------------------------------------------------------------------------------------------------------------
## 2. cth9191/motion-design  (Higgsfield workflow)

Existence: yes. License: NONE (API 404 for license; no LICENSE file anywhere; ATTRIBUTION.md states "No repository-wide
license has been applied to the combined package" and "Attribution does not establish a license for third-party
material"). The 10 source prompts + preview videos belong to Higgsfield's article authors
(adilinthewildtempo blog on higgsfield.ai, captured 2026-09-03). So effectively all-rights-reserved: REWRITE from
documented behaviour only. Do not copy any prompt text, template text, wordmark, or image.

### 2.1 What is in it (files)
- skills/motion-design/SKILL.md - modes: browse, supplied video, prompt/review, images, production, original concept.
- assets/presets.json - catalogue (version 4) of 10 presets; assets/gallery.html + scripts/build_gallery.py (python builder).
- references/preset-index.md, presets/<id>.md (short card), templates/<id>.md (adaptation guide), source-prompts/<id>.txt
  (verbatim third-party prompts, hash-checked), creative-brief.md, template-adaptation.md, quality-review.md,
  production.md, tool-routing.md, video-reference.md, preset-workflow.md.
- docs/setup.md (Higgsfield MCP connection), ROADMAP.md (says outcomes are not validated: "No paid trials were run").

### 2.2 FREE parts (no generation service; could feed Reelwright)

A) Style/preset catalogue = candidate themes + film recipes. 10 presets (id: use case; mechanic):
kinetic-typography (announcements; fixed-frame headline builds, image cards collapse into an icon bridge, scrolling
list, held end), glass-ui-launch (SaaS; 7 shots, glass slabs, dark mid-passage, two macro inserts, final freeze),
product-hyper-motion (food/product assembly), tropical-product (beverage, ingredient relay), exploded-product (hardware
component reveal, 9:16), blueprint-to-building (architecture, un-plots at end), hybrid-2d-3d (flat characters on 3D),
flat-vector-explainer (apps/how-it-works, pure 2D), editorial-collage (paper collage, educational shorts),
footage-overlays (graphics over supplied footage). Only some map to Reelwright:
- COVERED/near: kinetic-typography (layouts.js `kinetic`, themes brutalist/neon), flat-vector-explainer (theme `playful`/`pastel`),
  editorial-collage (theme `editorial`), glass-ui-launch (theme `dark-tech` + tiltedDevice).
- GAP as *theme/palette ideas*: "optical glass" (cool white + cobalt, pearl surfaces, bevel highlight), "tropical", "blueprint".
  A theme = tokens only (colors, radii, shadows, easing, tempo); no generation needed. Effort S each, but only if you want
  more than the 10 existing themes. I recommend at most 2: `glass` and `blueprint`. Write them from the *descriptions in
  presets.json* (palette words), not from the prompts.
- OUT OF SCOPE: the generated 3D CG look (depth-separated CG objects, photographic macro) cannot be built in HTML/CSS
  deterministically. Footage-overlays needs supplied footage; Reelwright already has screen-recording `clip`.

B) Beat-sheet / shot-list FORMAT. This repo has NO CSV. The structured format is the preset record in assets/presets.json
(verified fields): `id, title, category, tagline, description, best_for, aliases[], color, required[], optional[],
ending ("hold"|...), strategy, mechanic, preserve[], source{url,section,preview_url,observed_on,prompt_model_label,
prompt_sha256,prompt_chars,prompt_path}, defaults{duration_s:15, aspect_ratio:"16:9", fps:30,
audio:"music_and_effects_no_narration", generation:"one_full_film_request"}, recipe, template, template_version,
structure, timeline[{start_s,end_s,label}]`. Example timeline (kinetic typography): 0-3 headline + orbiting labels,
3-6 six image cards, 6-8.25 collapse and bridge, 8.25-11.25 inline icon and replacement, 11.25-15 scrolling list and
conclusion. The source prompts themselves use a free-text layout: one-paragraph brief, `design world:` block,
`motion rules:` block, then `[Shot N]` paragraphs with camera + copy + landing state. Importable into Reelwright:
`timeline[]` to beat/section markers (start_s/end_s/label) is a trivial mapping to a "sections" list in project.json. S.

C) Prompt-writing guidance (free, genuinely useful), from template-adaptation.md and quality-review.md (my paraphrase):
state the viewer takeaway first; each beat must reveal something; meaning test "with the headline hidden, what connects
this shot to THIS product?"; keep benchmark label+value+unit+condition together; do not invent chart bars (use honest
data or non-quantitative visuals) - this matches Reelwright's "Illustrative data" rule; keep an exact-copy list per shot;
give each beat time for action AND reading before moving on; record deliberate departures; judge communication and
motion separately; verify duration/aspect/fps of the delivered file. Review table: requirement+time / planned asset / observed
result+timestamp / status (pass, fail, not inspected). Reelwright can adopt this as a "self-review" checklist in
docs/PLAYBOOK.md ("truthfulness" + "process" sections). S, docs only.

D) Their gallery.html / build_gallery.py (browse + copy request). Not needed; Reelwright has `remix` and `preview`.

### 2.3 PAID / generation-dependent parts (state plainly)
Everything that makes a film requires a connected Higgsfield MCP account with model access and credits ("Generation
requires model access and credits or an applicable allowance", README). Specifically:
- Complete-film generation through Higgsfield MCP (Seedance preferred), references through `gpt_image_2` (Claude Code),
  supplied-video "recreation" (video-reference conditioning), targeted video edits, audio finishing via Higgsfield media tools.
- Prompt drafting and the gallery work without a connection ("Browsing and prompt drafting work before you connect").
- I did not verify any price or plan limit (UNVERIFIED; none stated in this repo, only "may incur Higgsfield charges").
These features must stay out of Reelwright core (rule: core free, local, offline). If ever offered, only as an optional,
separately documented extension that exports a prompt text the user pastes elsewhere - no network calls from our code.

### 2.4 Verdict + effort
COVERED: kinetic/explainer/editorial looks via themes + layouts. GAP (worth it): 2 optional themes (S each); section/timeline
import (S); self-review checklist (S). OUT OF SCOPE: all generation, the CG looks, hosting previews on a CDN. Licence: none, so
REWRITE; the facts here (names, field names, durations) are descriptions of a data format, I would not copy any text.

---------------------------------------------------------------------------------------------------------------
## 3. docusphere/claude-skill-motion-graphics  ("ai-motion-graphics")

Existence: yes, 2 files only (README.md, SKILL.md; last commit "Update AUDIO to SFX and match actual CSV column structure").
License: README says "MIT" but there is no LICENSE file and the API reports none (UNCLEAR). Treat as unlicensed for
copying: REWRITE from documented behaviour. Not a fork (API `fork: false`).
Note: README's CSV column list is STALE; SKILL.md is the newer source (see below).

### 3.1 FREE parts

A) Beat-sheet CSV format (exact, from SKILL.md Phase 0 step 1, newest version). One row per scene, header row:

```
Scene,Beat Label,VO Script,VO Length,Clip Duration,SHOT,MOTION,TEXT ON SCREEN,SFX,IMG PROMPT,VID PROMPT
```
Column meanings (SKILL.md): Scene = 1,2,3...; Beat Label = short name ("The Deal"); VO Script = narration line; VO Length =
target seconds (~140-155 words/min); Clip Duration = seconds, must be >= VO Length and from the model's allowed set (4/6/8 s
for the named video model); SHOT = subject, environment, composition, depth layers, camera move; MOTION = what moves, entrances,
exits, landing state; TEXT ON SCREEN = few words, bold caps; SFX = sound design only (not music/VO); IMG PROMPT and VID PROMPT =
auto-assembled (`IMG = STYLE_IMAGE + SHOT + TEXT`, `VID = STYLE_VIDEO + ACTION + TEXT + SFX + AVOID`).
The older README lists: `Scene, Beat Label, VO Script, VO Length, Clip Duration, SHOT, MOTION, TEXT ON SCREEN, AUDIO, Source (GENERATE|REUSE), Status`.
Exported from Google Sheets to `docs/beats.csv`. Scaffolds `scenes/scene-NN-slug/` per row (slug = lowercase hyphenated Beat Label).

Reelwright import plan (`tools/beats.mjs`, `./video.sh import-beats <name> beats.csv`): parse CSV (no dependency; quoted fields) and
write `projects/<name>/project.json`: `lines[i] = {id: "s"+Scene, text: VO Script, gap: 0.0..}`; Beat Label to line `label`
and the slug to section; VO Length is only a TARGET (ignore after TTS: real timing comes from vo.py, check and warn when the
measured line is longer than `Clip Duration`); TEXT ON SCREEN to a `title` field read by layouts (`kinetic`, `stat`); SFX to
`cue` hints (`whoosh/pop/impact...` keyword map, else ignored); SHOT/MOTION to a comment block or stub in film.js; IMG/VID PROMPT
columns ignored (they only exist for generation) - accept and drop them. Accept both header variants (SFX or AUDIO, optional
Source/Status). Also export: `./video.sh export-beats` writing the same CSV for a spreadsheet round trip. Effort S-M. It would
let a user plan in a sheet and still use the free pipeline.

B) Style-locking pattern ("STYLE once, ACTION per clip"): three locked text blocks stored in `config/style.json`:
`STYLE_IMAGE, STYLE_VIDEO, AVOID` (+ `voice{voice_id,voice_type,variant}`, `models{image,video,video_fallback,tts,music}`);
only SHOT/MOTION/SFX change per scene. Reelwright equivalent already exists: a theme (`themes/*.css`) + brand.json lock the look
across scenes. Nothing to take, but the idea "negative list that guards against style drift" could become a theme `avoid`
list shown by `remix`/linting (a handful of sentences in docs). Skip.

C) Prompt-writing guidance (free): short wording fixes for AI clips. Only meaningful for generation, e.g. "no morphing", "one
direction only - forward push, no zoom-out" (camera-reversal fix), "name every element by position", "always repeat STYLE in the
video prompt", "longer clip + simpler movement = cleanest; wilder movement + shorter clip = acceptable". The camera lines are
mildly interesting: they confirm the same named-shot vocabulary as section 1 (flies between layers, orbits, dives, whips, racks
focus). The built-in Vox style text lists "springs with overshoot, staggered entrances, ticking counters", all already in KIT.
VO pacing rules (periods = hard pause, ellipses = breath, avoid em dashes, single-word sentences cause long pauses, ~140-155
wpm) are worth copying as one paragraph into docs/PLAYBOOK.md for edge-tts text (check against edge-tts first: UNVERIFIED). S.

D) Remotion assembly rules: no transitions between AI clips, one 0.5 s fade at start/end, music continuous at 0.25 volume,
clips' baked SFX at 0.3: COVERED by tools/mix.py ducking. Nothing to take.

### 3.2 PAID / generation-dependent parts (state plainly)
Higgsfield CLI (`@higgsfield/cli`, `npx higgsfield auth login`) and, per the README, a Higgsfield "Pro plan" is required
(repo's own statement; I did not verify the plan or price). Paid steps: style-sheet still (`nano_banana_pro`), per-scene stills,
per-scene clips (`gemini_omni`, fallback `seedance_2_0`), TTS (`text2speech_v2`, ElevenLabs voices), music (`sonilo_music`),
batches of 3 because of the Pro concurrency limit. Generated clips are the entire visual content, so without the paid connector
the skill produces nothing. Rendering via Remotion Studio is free but useless without the clips. OUT OF SCOPE for Reelwright.

### 3.3 Verdict
Only the CSV beat sheet (+ the VO punctuation tips) is reusable. Licence unclear so REWRITE; a column list is a data format, I
would not copy any prose. Effort S-M.

---------------------------------------------------------------------------------------------------------------
## Recommendation

1. Do the named camera-shot library (section 1.4). It is the one clear win across the three repos: all 25 items are closed-form
   functions of t, work in both renderers, and fill the stated gap "no named camera-shot presets beyond camAt keyframes". Start
   with M-sized slice: new easings (`inQuad`, `outQuint`, `bezier`), `cam3` + `camCSS` (CSS `zoom` for sharp text), and
   `pushIn`, `pullBack`, `crashZoom`, `whipPan` (basic+brake), `dollyZoom`, `orbit`, `craneRise`, `dutchRollToLevel`, plus
   `remap` (speed ramp/freeze) and `handheld/shake`. Then 3D set (tiltReveal, tabletopDrop, droneDive, tour) as a second step.
   Motion blur: start with speed-driven CSS blur; sub-frame supersampling later.
2. Document the camera grammar in docs/PLAYBOOK.md (table from 1.2, stillness after moves, <=2 big moves per film, one mover per
   segment, blur only during fast part). Record credit to Vincentwei1021/video-shotcraft (Apache-2.0) in THIRD_PARTY.md. REWRITE
   everything; take no audio or textures.
3. Add a CSV beat-sheet importer/exporter (section 3.1 A), accepting the docusphere header (both variants). S-M, free, offline.
4. Optional S items: `timeline[]` to sections mapping; two new themes (glass, blueprint) drafted from palette words only; a short
   self-review checklist and VO punctuation tips in the playbook.
5. Do NOT build anything that calls Higgsfield or any generation service. cth9191/motion-design has no licence and its prompts are
   third-party text; docusphere has no licence file. Both are idea sources only.

UNVERIFIED: any rendering of the demos or gallery videos (I did not play any preview); upstream diff of the fork; Higgsfield
plan/prices; whether qa.py already has a minimum text height gate; the crane-rise and several other demo files were read as
cards only; I did not check edge-tts behaviour for the punctuation tips.
