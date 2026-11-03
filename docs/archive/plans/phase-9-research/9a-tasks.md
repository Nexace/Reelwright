# Phase 9a task plan — motion vocabulary

Spec: docs/plans/phase-9-motion-skills.md, section "9a — Motion vocabulary" (approved by the owner 2026-11-02).
Research with exact formulas: scratch/phase9/remotion-gsap.md (§1.3 spring, §2.4 eases + reference values, §2.5
PLAYBOOK guidance) and scratch/phase9/doodle-lottie.md (§2.2 archetype table and bezier curves).
Seek determinism already verified: scratch/phase9/seektest/RESULTS.md.

## Global Constraints

- Repo: <local path> Project/reelwright, branch `phase-9a-motion`. Read AGENTS.md first.
- `render(t)` must stay a pure function of t: every new helper is closed-form or fixed-iteration, stateless; no
  Math.random, Date.now, rAF, caches that change results.
- Keep existing names working with identical output: `KIT.E.inOut`, `out`, `in`, `outExpo`, `outBack`, `KIT.ease`
  (the theme's default easing function), `KIT.dur(s)`. Films with no `"style"` must render byte-identically
  (pvk `projects/example`).
- No new dependencies. Node `.mjs` for tooling. Match engine.js style (short why-comments, compact).
- Ruling (controller): `KIT.ease` stays a function (theme default). Name parsing goes in a NEW `KIT.easing(name)`,
  e.g. `KIT.easing('power3.inOut')`, `KIT.easing('back.out(1.7)')`, `KIT.easing('steps(4)')`; unknown names throw.
  The theme token `--kit-ease` may hold either an old `KIT.E` key or any name `KIT.easing` accepts.
- Ruling (controller): the ease/spring self-check lives in `tools/motion-check.mjs` (committed, run by CI), not in
  scratch/ (git-ignored, CI can't see it).

## Task 1: Engine motion math

Files: tools/engine.js, new tools/motion-check.mjs, .github/workflows/ci.yml (one step), .gitignore (add
`.superpowers/`).

1. GSAP-equivalent ease families, rewritten from the formulas in scratch/phase9/remotion-gsap.md §2.4 (do not copy
   GSAP code): none, power1–4 (aliases quad, cubic, quart, quint per that table), sine, circ, expo (GSAP's blended
   form, exact 1 at p=1), back (overshoot param, default 1.70158), elastic (amplitude default 1, period default 0.3;
   inOut default period 0.45), bounce, steps(n) (jumps at k/(n+1)). One `makeEase(out)` derives in/out/inOut:
   `in(p) = 1 − out(1 − p)`, `inOut(p) = p<.5 ? in(2p)/2 : (out(2p−1)+1)/2` — but use the §2.4 notes where a family
   differs (elastic inOut period).
2. `KIT.easing(name)` parser as in the ruling above. Accept "family.dir" and "family.dir(args)", "none", "steps(n)",
   and the old KIT.E keys.
3. `KIT.bezier(x1, y1, x2, y2)` → easing fn; solve x(s)=p with a fixed number of Newton steps falling back to fixed
   bisection (stateless, deterministic). Named curves on `KIT.E`: `premium` (.4,0,.2,1), `corporate` (.2,0,0,1),
   `emphasized` (.05,.7,.1,1), `accel` (.3,0,1,1), `settle` (.175,.885,.32,1.275).
4. `KIT.spring({ mass = 1, damping = 10, stiffness = 100, from = 0, to = 1 } = {})` → `(tSeconds) => value`, the
   closed-form damped oscillator from §1.3: underdamped / critical / overdamped, and — matching Remotion — damping
   ratio ≥ 1 uses the critical formula. Also `KIT.springDur(opts)`: time until |value − to| and |velocity| stay below
   0.005 (deterministic: fixed step scan, capped at 10 s).
5. `KIT.keys(t, [[t0, v0], [t1, v1], ...], eases?)` → value: piecewise interpolation with n−1 eases (default
   `KIT.ease`), clamped outside the range; numbers only.
6. `KIT.stagger(i, n, total)` → the start offset of item i so n items spread over `total` seconds (i=0 → 0, last →
   total). `KIT.local(t, from, dur, rate = 1)` → local progress time clamped to [0, dur] (sequencing helper).
7. `KIT.ease` resolves the theme token through `KIT.easing` (old keys still work; unknown token → `KIT.E.out`, as now).
8. tools/motion-check.mjs: loads tools/engine.js in a Node `vm` context with a minimal stub of `window`, `document`
   (getElementById → null-safe stub, documentElement/style, fonts, getComputedStyle returning empty tokens) — just
   enough for the engine to load; then asserts: the §2.4 reference sample values (power2.out, back.out(1.7),
   elastic.out(1,.3), bounce.out at p = 0,.1,.25,.5,.75,.9,1) within 1e-4 of the published 4–5 digit values; every
   ease returns 0 at p=0 and 1 at p=1 (steps: per its definition); in/out symmetry; old `KIT.E.*` outputs identical to
   their current formulas at 101 points; bezier(.25,.1,.25,1) monotone and within 1e-6 of a dense bisection reference;
   spring underdamped matches a fine-step RK4 integration of m·x'' + c·x' + k·(x − to) = 0 within 1e-3 over 0–2 s,
   and critical/overdamped likewise; `KIT.easing` throws on an unknown name. Prints one line per group, exits 1 on
   failure.
9. CI: add `node tools/motion-check.mjs` to the "Syntax checks" step (after the node --check loops).

Done when: `node tools/motion-check.mjs` passes; `node --check tools/engine.js` passes; `node bin/reelwright.mjs
stills example 4,12.5` output is byte-identical to the same command on `main` (cmp; build the main copy with
`git stash` or a `git worktree` in scratch/ — do not commit scratch files).

## Task 2: Per-theme motion presets

Files: tools/kit.css (new tokens with neutral defaults), themes/*.css (10 files), tools/engine.js (read the new tokens),
tools/layouts.js only if a layout already staggers or exits by hand (then read the tokens instead of its constants).

1. New tokens in kit.css `:root` with defaults that change nothing for unstyled films: `--kit-ease-in` (exit easing,
   default `in`), `--kit-stagger` (seconds between items, default `0.08`), `--kit-settle` (seconds for a settle,
   default `0.6`). Engine: `KIT.easeIn` (function from `--kit-ease-in` via `KIT.easing`), `KIT.staggerStep` (number
   from `--kit-stagger`, scaled by tempo like `KIT.dur`), `KIT.settle` (seconds from `--kit-settle`, tempo-scaled).
2. Map each theme to an archetype (scratch/phase9/doodle-lottie.md table): playful → Playful (`--kit-ease: settle`,
   stagger 0.06); luxury, editorial, pastel, retro → Premium (`--kit-ease: premium`, stagger 0.08); clean, swiss →
   Corporate (`--kit-ease: corporate`, stagger 0.05); brutalist, neon, dark-tech → Energetic (`--kit-ease: expo.out`,
   stagger 0.03). Each gets a fitting `--kit-ease-in` and `--kit-settle`. Keep each theme's existing `--kit-tempo`.
3. If tools/layouts.js has hard-coded stagger or exit easing, switch it to the tokens (bento's per-tile step, exits).

Done when: `node tools/motion-check.mjs` still passes; pvk `example` stills byte-identical to main; `node
bin/reelwright.mjs stills example-hf --style playful` and `--style luxury` at the same times show visibly different
settle/overshoot (look at both sheets and describe the difference in the report); `node bin/reelwright.mjs stills
layouts-hf` renders without page errors.

## Task 3: PLAYBOOK motion and GSAP sections

Files: docs/PLAYBOOK.md only.

1. "Motion" section: the easing vocabulary (`KIT.easing` names, `KIT.bezier`, `KIT.spring`, `KIT.keys`,
   `KIT.stagger`, `KIT.local`, theme tokens `--kit-ease`, `--kit-ease-in`, `--kit-stagger`, `--kit-settle` and the
   four archetypes), and the rules: never linear for spatial moves; no move over 1/3 of the screen without a keyframe;
   morph over fade; dim the rest to ~0.25 to focus one thing; on-screen text is labels and numbers, not the
   narration; stagger budget (total ≤ ~0.5 s for a group); transition overlap rule (film length = sum of scenes −
   overlaps). Short examples in the engine's style.
2. "GSAP (optional)" section, from scratch/phase9/remotion-gsap.md §2.5–2.6 and seektest RESULTS.md: GSAP is not
   bundled and is under Webflow's "Standard No Charge" license (not MIT): a film that uses it ships a local copy under
   `hf/` (or film/) and keeps its notice; only a paused timeline driven by `tl.totalTime(t)` inside `render(t)`
   (verified byte-identical across shuffled seeks); `gsap.ticker.lagSmoothing(0)`; use `fromTo` (`.from()` and
   relative `"+="` values read start state on first render — not verified); no `repeat: -1`, no `random()`, no
   callbacks that change state; HyperFrames' adapter seeks `window.__timelines`. A 10-line example.
3. "Lottie (optional)" paragraph: lottie-web not bundled; `goToAndStop(t * 1000, false)` from `render(t)`, keep
   `setSubframe(true)`; verified deterministic for shapes; masks/mattes/gradients/effects/expressions not tested.

Done when: sections are written, consistent with the code from Tasks 1–2 (names match exactly), no claims beyond the
research files.
