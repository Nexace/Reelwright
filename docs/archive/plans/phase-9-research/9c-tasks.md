# Phase 9c task plan — math primitives, beat-sheet import, new QA checks

Spec: docs/plans/phase-9-motion-skills.md, section "9c" (approved 2026-11-02). Owner approved vendoring KaTeX
(2026-11-03). Research: scratch/phase9/manim.md §1 (manim-craft QA ideas) and §3 option (a) (math primitives, KaTeX),
scratch/phase9/shots-motion.md §3.1 A (beat-sheet CSV) and §2.2 (cth9191 `timeline[]`).

## Global Constraints

- Repo <local path> Project/reelwright, branch `phase-9c-math-beats`. Read AGENTS.md and
  docs/PLAYBOOK.md (Engine rules, HyperFrames films, Motion, Camera shots).
- `render(t)` stays a pure function of t (no Math.random, Date.now, rAF, CSS transitions). Build DOM once at load.
- No hard-coded film seconds; times from W/V/KIT.snap/KIT.dur. Fake numbers get "Illustrative data".
- Existing films must not change: engine.js behaviour, layouts.js, shots.js, doodle.js and existing themes untouched
  (new modules only). pvk projects/example stills stay byte-identical to main.
- New helper files load like tools/layouts.js: add them to the copy lists in tools/renderers/hyperframes.mjs and
  tools/preview.mjs, to the CI node --check loop, and to tools/motion-check.mjs's vm where they have pure parts.
- No new npm dependencies. KaTeX is vendored (owner-approved): vendor/katex/ with upstream LICENSE, a VENDORED.md
  (upstream, version, exact files taken, what we changed — nothing), a THIRD_PARTY.md row and a NOTICE line if NOTICE
  lists shipped third-party code (it does: check). Only what renders needs: katex.min.js, katex.min.css, woff2 fonts.
- New QA checks are WARN lines (never FAIL) so existing films keep passing; qa-broken must trip each.
- Scratch files only under scratch/ (git-ignored); never commit generated files.

## Task 1: Math primitives and KaTeX (tools/math.js, vendor/katex/)

Files: new tools/math.js; new vendor/katex/ (LICENSE, VENDORED.md, katex.min.js, katex.min.css, fonts/*.woff2);
tools/renderers/hyperframes.mjs and tools/preview.mjs (copy math.js and the katex files into hf/kit/ — keep the
katex.min.css relative font URLs working); THIRD_PARTY.md, NOTICE; tools/motion-check.mjs; .github/workflows/ci.yml.

1. Get KaTeX without adding a dependency: `npm pack katex@0.19.1` in a scratch folder (if 0.19.1 doesn't exist, use
   the latest 0.16+/0.19 release and record it), copy dist/katex.min.js, dist/katex.min.css and dist/fonts/*.woff2.
   Strip the other font formats' @font-face src entries only if needed for offline loading (record any change in
   VENDORED.md with a "changed from upstream" header in the edited file).
2. `KIT.math.axes({ x: [min, max, step], y: [min, max, step], box: {x, y, w, h} = KIT.safe-based default, grid,
   labels })` → `{ el, c2p(x, y), set(t, p?) }`: SVG lines, ticks and labels in theme tokens (`--kit-ink`,
   `--kit-muted`, `--kit-font-text`); draws on (KIT.ease) in [in, in+draw].
3. `KIT.math.numberLine({ range: [min, max, step], ... })` → same shape.
4. `KIT.math.plot(axes, f, { x: [x0, x1], samples = 200, in, draw, out, color })` → `{ el, set(t), pointAt(p) }`:
   samples once at load into a path; draw-on via pathLength=1 dashoffset; `pointAt` follows the drawn tip.
5. `KIT.math.morph(pathA, pathB, { in, dur, n = 120 })` → `{ el, set(t) }`: resample both to n points
   (getPointAtLength at load), rotate B's start index to minimise squared distance, lerp with KIT.ease. Single
   closed or open subpath only (document it).
6. `KIT.math.equation(tex, { in, step, out, size })` → `{ el, set(t) }`: KaTeX renderToString once at load (throwOnError
   true so a bad formula fails the build loudly), then a per-glyph reveal (opacity + small rise) staggered by `step`
   (default `KIT.staggerStep`).
7. `KIT.math.ease.smooth(p)` (smoothstep 3p²−2p³) and `KIT.math.ease.thereAndBack(p)` (smooth(2p) for p<.5, mirrored).
8. motion-check: the two eases (endpoints, symmetry), axes c2p mapping (pure maths part) via a small exported helper,
   morph index alignment on two synthetic point lists (pure part). DOM-only parts are covered by the film in Task 4.

Done when: motion-check passes; node --check on math.js; a scratch hf page (or `stills` on a scratch project under
scratch/) shows axes, a drawn plot, a morph mid-way and one equation (read the image and describe it); pvk example
byte-identical.

## Task 2: Beat-sheet import and export (tools/beats.mjs, `beats` command)

Files: new tools/beats.mjs; bin/reelwright.mjs (`beats import <csv>` and `beats export [file]` for a project, help
text); README.md command table row; tools/motion-check.mjs or a tiny self-check inside beats.mjs run in CI
(`node tools/beats.mjs --self-check`) — pick one and wire it into CI.

1. CSV parser without a dependency: RFC 4180 (quoted fields, doubled quotes, newlines inside quotes, CRLF), header row.
2. Accept both docusphere headers: `Scene,Beat Label,VO Script,VO Length,Clip Duration,SHOT,MOTION,TEXT ON SCREEN,
   SFX,IMG PROMPT,VID PROMPT` and the older `Scene,Beat Label,VO Script,VO Length,Clip Duration,SHOT,MOTION,TEXT ON
   SCREEN,AUDIO,Source,Status`. Unknown extra columns are kept for export, never sent anywhere.
3. Import into an existing project's project.json: `lines[i] = { id, text, gap }` with id = slug of Beat Label (unique;
   fall back to `s<Scene>`), text = VO Script; keep the other columns in a `beats` array in project.json (label, shot,
   motion, onScreen, sfx, target seconds, and the raw prompt columns untouched) so export can round-trip. Refuse to
   overwrite existing `lines` unless `--replace` is given. Print what changed.
4. `timeline[]` import: a JSON file shaped `{ "timeline": [{ "start_s", "end_s", "label" }] }` (cth9191 presets.json)
   maps to `beats` sections (label + target duration); same command with a .json argument.
5. Export writes the same header the project was imported with (or the newest header by default) from `lines` +
   `beats`, quoting as needed.
6. After `vo`, warn (in `beats import` output or a `beats check` subcommand — pick the simpler) when a measured line is
   longer than its Clip Duration target. Optional; skip if it needs vo internals.

Done when: round trip `beats import` then `beats export` on a sample CSV with quotes, commas and newlines gives the same
content (diff); both header variants import; the self-check runs in CI; README lists the command.

## Task 3: New QA checks (WARN lines)

Files: tools/qa_page.mjs (page checks), tools/qa.py (print them as WARN lines, never FAIL; skippable via project.json
"qa": {"<check>": false} like gates), projects/qa-broken (add content that trips each new check), README/PLAYBOOK QA
lines if they list gates.

1. `overlap`: visible text elements (outside captions) whose boxes overlap each other by more than a small margin, sampled
   every 0.5 s.
2. `tiny-text`: visible text whose rendered font size is below a minimum per format (24 px at 1080 short side, scaled
   by KIT.u).
3. `wordy`: on-screen text (outside captions) with more than 6 words that mostly repeats the current VO line's words
   (labels, not narration).
4. `dark`: stretches longer than 2 s where the frame is near-black and no VO is playing (from frames/ luminance in
   qa.py, which already computes per-frame luminance).
Each prints `WARN <check>: <time> <detail>`.

Done when: `node bin/reelwright.mjs qa qa-broken` shows each new WARN (it may need `all qa-broken` first — the gates
still FAIL there by design); `qa example-hf`, `qa layouts-hf`, `qa shots-hf` show no new WARNs or only justified ones
(report them); exit codes unchanged.

## Task 4: math-hf film, PLAYBOOK, credits

Files: new projects/math-hf/ (project.json, hf/index.html, hf/film.js — structure of projects/layouts-hf, no generated
files); docs/PLAYBOOK.md ("Math" section; "Beat sheets" paragraph; VO punctuation paragraph from research §3.1 C only
if verified against edge-tts, else skip); THIRD_PARTY.md reference credits (manim-craft: rules rewritten, no license —
no text copied; manim_skill MIT CE part as primitive list; cth9191/motion-design and docusphere: formats only, no
license — rewritten).

1. math-hf: `"renderer": "hyperframes"`, `"style": "swiss"`, fps 30, voice/music as layouts-hf,
   `"out": "out/math-hf.mp4"`. VO lines exactly:
   axes: "Every chart starts with an axis." · plot: "Plot the curve as you say it." ·
   morph: "Shapes morph instead of fading." · equation: "And the maths writes itself."
   Scenes: axes draw on; a plot drawn as "curve" is spoken with a dot on the tip; a morph between two shapes; one
   KaTeX equation revealed per glyph. Any numbers that look like data get "Illustrative data". Times from W/V/snap.
2. Build `node bin/reelwright.mjs all math-hf` (background), QA passes (gates), look at stills and frames, `verify
   math-hf` passes, `stills math-hf --formats 9x16` composes.
3. PLAYBOOK "Math": API table, when to use, rules from manim-craft rewritten (morph over fade, dim others to ~0.25,
   labels not narration), equation tips (KaTeX subset, throwOnError).

Done when: math-hf builds, passes QA gates and verify; PLAYBOOK names match the code; credits added; pvk example
byte-identical.
