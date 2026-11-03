# Phase 9b task plan — named shot library and the doodle theme

Spec: docs/plans/phase-9-motion-skills.md, section "9b" (approved 2026-11-02). Research: scratch/phase9/shots-motion.md
§1.2 (every shot with parameters) and §1.4 (native plan), scratch/phase9/doodle-lottie.md §1.2 and §1.4 (doodle
mechanics), scratch/phase9/verify-sizes-fonts.md (Caveat, Patrick Hand: OFL 1.1). Upstream for shots is
Vincentwei1021/video-shotcraft (Apache-2.0); the fork sfgdfgd/-skill is 37 commits behind — read upstream if a card
is unclear (`gh api repos/Vincentwei1021/video-shotcraft/contents/...`). REWRITE only; copy no code, audio or textures.

## Global Constraints

- Repo <local path> Project/reelwright, branch `phase-9b-shots-doodle`. Read AGENTS.md and
  docs/PLAYBOOK.md "Engine rules" and "Motion".
- `render(t)` stays a pure function of t. Every shot, noise and boil is closed-form in t or seeded by a string id and
  `floor(t × rate)` — never frame index, Math.random, Date.now, rAF, CSS transitions/animations.
- No hard-coded film seconds: presets take start/end times from the caller (W/V/KIT.snap); internal shape constants
  (e.g. crash zoom over "6 frames") are expressed as seconds-at-30fps ratios scaled by KIT.dur, documented in a comment.
- Works in both renderers (pvk and hyperframes) and all formats (16x9, 9x16, 1x1).
- Existing films must not change: no edits to engine.js behaviour, layouts.js or existing themes. pvk `projects/example`
  stills stay byte-identical to main.
- New helper files load like tools/layouts.js: add them to the copy list in tools/renderers/hyperframes.mjs and
  tools/preview.mjs (both have `["engine.js", "kit.css", "layouts.js"]`), and films include
  `<script src="kit/<file>.js">` (hf) or `../../../tools/<file>.js` (pvk) after engine.js.
- No new npm dependencies. Fonts come only through `node fonts/fetch.mjs` (add the families to its list) with each OFL
  recorded in fonts/LICENSES.md.
- Existing engine API to build on: KIT.easing(name), KIT.bezier, KIT.E.* (incl. premium, corporate, accel, settle),
  KIT.ease, KIT.easeIn, KIT.dur, KIT.seg, KIT.lerp, KIT.clamp, KIT.snap, KIT.W/V, KIT.safe, KIT.fmt, KIT.u, KIT.camAt,
  KIT.stage, KIT.W_/H_, KIT.token. tools/motion-check.mjs loads engine.js in a Node vm with DOM stubs.

## Task 1: Shot library (tools/shots.js)

Files: new tools/shots.js; tools/renderers/hyperframes.mjs and tools/preview.mjs (copy list); tools/motion-check.mjs
(load shots.js after engine.js and add a shots group); .github/workflows/ci.yml (node --check tools/shots.js).

1. `KIT.cam3(state)` model: a camera state `{ z, x, y, rx, ry, rz, persp, blur }` (z = zoom factor; x,y = focal point
   in frame px; rotations in degrees). `KIT.camCSS(state)` → `{ transform, transformOrigin, filter }` strings for the
   element being filmed (translate → rotateY → rotateX → rotateZ → scale about the focal point; perspective in the
   transform). `KIT.shoot(el, state)` applies them (style writes only).
2. Presets, each `KIT.shot.<name>(opts)` → function `t → state`, all opts with defaults, times from opts (`t0`, `t1`
   or `at`, `dur`): `pushIn` (1.00→1.14 over [t0,t1], accelerating ease `power2.in`), `pullBack` (inverse, `power2.out`),
   `crashZoom` (1 → 2.6 over 6/30 s × KIT.dur, then decaying shake 14 px, variant 'rebound'|'stop'), `whipPan`
   (horizontal travel of 1.5 × frame width over 8/30 s, speed blur, variant 'basic'|'brake'), `dollyZoom` (layer
   preset: returns `{ bg: state, hero: state }` — hero pinned, background scale opposite), `orbit` (rotateY sweep with
   perspective, default ±18°), `craneRise` (y lift + slight tilt-down to level), `dutchRoll` (rz −10° → +1.2° → 0).
   Use the exact parameters from shots-motion.md §1.2 where given; where §1.2 lacks one, pick a value and note it.
3. Helpers: `KIT.handheld(t, amp, seed)` (sum of sines at 9.3, 24.9, 14.1, 33.9 rad/s with seeded phases — pure),
   `KIT.shake(t, t0, amp, tau)` (decaying), `KIT.remap(t, [[tOut, tSrc], ...])` (piecewise-linear speed ramp/freeze),
   `KIT.speedBlur(fn, t, px)` (central difference of a state fn → blur px, capped).
4. `KIT.shot.track([{ at, shot }, ...])` → `t → state`: picks the latest shot whose `at ≤ t`, holds its end state
   (stillness after a move); before the first, identity.
5. `KIT.shot.names` list.
6. motion-check group: for each preset, state(t) is identical when evaluated in two different orders (forward vs
   shuffled 50 times); identity state at t before t0; end state reached at t1 (pushIn z=1.14 within 1e-9, dutchRoll
   rz=0, crashZoom z=2.6 after shake decays); handheld finite and bounded by amp; remap endpoints. camCSS strings
   contain no NaN.

Done when: `node tools/motion-check.mjs` passes; `node --check tools/shots.js`; pvk example stills byte-identical
to main (cmp; swap main's tools files in on projects/example, as before).

## Task 2: Doodle theme (tools/doodle.js, themes/doodle.css, fonts)

Files: new tools/doodle.js; new themes/doodle.css; fonts/fetch.mjs (add "Caveat": [400, 700] and "Patrick Hand":
[400]); fonts/caveat/, fonts/patrick-hand/ (fetched); fonts/LICENSES.md (regenerated by fetch.mjs — check the existing
rows are unchanged); tools/kit.css (only a new `--kit-boil: 0` default token); hyperframes.mjs/preview.mjs copy list;
tools/motion-check.mjs (pure parts); ci.yml (node --check).

1. `KIT.doodle.hash(str)` (FNV-1a 32-bit), `KIT.doodle.rng(seed)` (mulberry32) — deterministic, tested.
2. `KIT.doodle.wobble(id, points, amp)` → points displaced by the seeded rng (static per id); `KIT.doodle.path(points)`
   → SVG `d` via Catmull-Rom → cubic Bézier; `KIT.doodle.boil(id, points, t, amp, hz)` → points re-jittered with seed
   `hash(id) * 911 + floor(t * hz + 1e-6)` (hz from `--kit-boil`, 0 = no boil). Points come from the caller or from
   `KIT.doodle.sample(pathEl, step)` (getPointAtLength, built once at load).
3. `KIT.doodle.drawOn(pathEl, p)` — `pathLength=1`, `stroke-dasharray: 1 1`, `stroke-dashoffset: 1 − p`, p exactly 1
   when ≥ 1. `KIT.doodle.schedule(lengths, t0, t1, rest = 0.1)` → per-stroke [s, e] windows proportional to
   `len + 9`, with rests, inside [t0, t1] (pure).
4. Convenience marks: `KIT.doodle.underline(el, { in, out })` and `KIT.doodle.circle(el, { in, out })` — build an SVG
   overlay once at load around the element's box, return `{ set(t) }` that draws on with the theme ease and boils.
5. themes/doodle.css: paper background (static procedural grain — a tiny inline SVG `feTurbulence` data URI as
   `--kit-bg-image` at low opacity is fine since it is static; no animated filter), graphite ink, marker accent,
   `--kit-font-display: "Caveat"`, `--kit-font-text: "Patrick Hand"`, `--kit-ease`/`--kit-ease-in`/`--kit-stagger`/
   `--kit-settle` (Playful-ish but calm), `--kit-boil: 8`, and the usual token set every theme defines (copy the token
   list from themes/playful.css).
6. motion-check: hash/rng known values; schedule windows ordered, inside [t0,t1], proportional; boil output identical
   for the same (id, t) regardless of call order and changes only when floor(t*hz) changes.

Done when: motion-check passes; `node bin/reelwright.mjs themes` lists doodle; `node bin/reelwright.mjs stills
example-hf --style doodle` renders with the handwriting fonts (look at the sheet; report what you see); fonts/LICENSES.md
lists Caveat and Patrick Hand with OFL; pvk example byte-identical.

## Task 3: shots-hf film, PLAYBOOK camera grammar, credits

Files: new projects/shots-hf/ (project.json, hf/index.html, hf/film.js — copy the structure of projects/layouts-hf,
not its generated files); docs/PLAYBOOK.md ("Camera shots" and "Doodle" sections); THIRD_PARTY.md (reference credits:
Vincentwei1021/video-shotcraft Apache-2.0 — shot parameters rewritten; alexgreensh/anidoodle Apache-2.0 — doodle
mechanics rewritten; add Caveat and Patrick Hand to the shipped fonts row); README only if it lists themes (add doodle).

1. shots-hf: `"renderer": "hyperframes"`, `"style": "dark-tech"`, fps 30, same voice/music settings as layouts-hf,
   `"out": "out/shots-hf.mp4"`. VO lines exactly:
   push: "Push in on what matters." · crash: "Hit the number hard." · whip: "Whip to the next idea." ·
   orbit: "Circle the product." · crane: "Rise to the logo."
   One scene per line using pushIn, crashZoom (on a big number, "Illustrative data" label), whipPan (between two
   cards), orbit (a product card/mock UI from divs), craneRise (to an end logo); a `handheld` drift at low amp in one
   scene; a doodle underline under one word (draw-on). All times from W/V/KIT.snap. ≤ 2 big moves per segment.
2. Build: `node bin/reelwright.mjs all shots-hf` (background; edge-tts needs network). QA must pass; look at
   stills/sheet.jpg and frames around each move.
3. `node bin/reelwright.mjs verify shots-hf` passes (fresh render gives the same frames).
4. PLAYBOOK "Camera shots": table of the presets (name, when to use, energy), the grammar (≤ 2 big moves per film,
   one mover per segment, stillness after a move, blur only in the fast part), a short example. "Doodle": theme,
   draw-on, boil token, underline/circle, determinism note.

Done when: shots-hf builds and passes QA and verify; stills show each shot mid-move; `stills shots-hf --formats 9x16`
composes (no exposed corners in orbit/dutch); PLAYBOOK names match the code; pvk example byte-identical.
