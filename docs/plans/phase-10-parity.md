# Phase 10 plan: all-in-one — equal or better than HyperFrames and the nine repos

Status: **plan approved by the owner 2026-11-05.** 10.0 merged 2026-11-06; Wave 1 next.

## Goal (owner, 2026-11-05)

Reelwright is how Claude makes **proper, smooth, good-looking animations** — in Claude Code / the desktop app (running
locally through the skill), with a **live playable preview in the chat** while iterating. To get there it must do every
feature of HyperFrames (first priority) and of the nine Phase 9 repos at least as well as they do. Proof is a
per-feature checklist (no rebuilt demo films). Order of importance: looks good by default → smooth → Claude workflow →
breadth.

Owner decisions:
- Bundle (vendored, licence + NOTICE + VENDORED.md): MIT/Apache libraries (lottie-web, anime.js, Three.js, MathJax,
  flubber, @remotion/paths), GSAP + plugins (Webflow "Standard No Charge" licence, not open source).
- Optional renderers (opt-in installs, never bundled): Remotion, Manim CE, ManimGL.
- Add a studio editor and an embeddable web player. No AWS/GCP cloud rendering (Colab stays).
- Core stays free, local and offline; paid services only via optional connectors.

## Where we stand (audits, 2026-11-05)

Full checklists: [phase-10-research/](phase-10-research/) (one file per source; each row has where it lives upstream,
Reelwright 0.2 status, approach, licence and effort).

| Source | Rows | Equal/Better today | Partial | Missing | Notes |
|---|---|---|---|---|---|
| HyperFrames (v0.9.13 vs vendored 0.8.217) | 111 | 15 | 43 | 47 | many "missing" are already in the vendored engine, just not exposed (motion blur, grading/effects, `<video>`, shader transitions, nested compositions, alpha/ProRes/WebM/HDR); 210 blocks (174 GSAP, 37 WebGPU); 13 frame presets + 3 theme packs; 143 lint rules; player vendorable (Apache-2.0, 555 KB); Studio should be native (upstream edits a different film model, 167k lines, telemetry) |
| Remotion + its skills | ~110 | 23 | 31 | 38 | optional renderer fits Reelwright's renderer contract with no core change (tested: byte-identical frames); licence free only for individuals, non-profits and companies ≤ 3 people; @remotion/paths (MIT) vendorable; transitions/effects packages are UNLICENSED (rewrite) |
| Manim CE + ManimGL + manim skills | 91 | 32 | 31 | 24 | CE 0.22 needs Python ≥ 3.11, encodes via PyAV; Typst equations remove the LaTeX need; ManimGL: pin 1.7.2 (moderngl, headless `-w`), wgpu master as preview; frame-count trap documented |
| anidoodle, video-shotcraft (upstream: 124 cards / 150 shots), motion-design-skill, GSAP + plugins, Lottie | 252 | 25 | 140 | 83 | GSAP seek test: 9 plugins deterministic; ScrambleText and MotionPath not (lint-ban / replace with native `KIT.path`); shotcraft audio (Mixkit/untraceable) can't be bundled — synthesise replacements |
| cth9191 + docusphere (Higgsfield workflows) | 33 | 12 | 11 | 8 | `gen` sends only a prompt: add references, image-to-video, motion transfer, duration/aspect; TTS/music over REST unverified — edge-tts + synth bed stay |

## How the work runs in parallel

Each checkpoint is one branch, one worktree, one session, and **owns its files**. Checkpoint 10.0 first adds
"parallel rails" so later checkpoints never edit the same lines:

1. **Kit files by glob.** The hyperframes renderer and preview copy every `tools/*.js` + `kit.css` and every
   `vendor/<lib>/` that has a `kit.json` manifest — a new module or library is a new file, not an edit to a list.
2. **Commands as plug-ins.** `bin/reelwright.mjs` loads `tools/commands/<name>.mjs` (help text from each file's
   header). New commands are new files.
3. **QA checks as plug-ins.** `qa.py` runs `tools/checks/*.py` and `tools/qa_page.mjs` loads `tools/checks/*.page.mjs`;
   each check is a file, WARN or gate declared inside it.
4. **CI by glob.** CI runs every `tools/selfcheck/*.mjs` and builds every project whose `project.json` has `"ci": true`.
5. **Docs by file.** During Phase 10 each checkpoint writes `docs/playbook/<topic>.md`, `docs/parity/<source>.md` rows
   it flips, and `vendor/<lib>/THIRD_PARTY.md`; README/PLAYBOOK/THIRD_PARTY are stitched once in 10z.
6. **engine.js is frozen** after 10.0 (new behaviour goes in new modules); `tools/renderers/*` belong to 10a except
   new renderer files (10i, 10j).

Merge order: 10.0 first; then any order within a wave (each merges `main` in before its own merge — conflicts should be
none or trivial); 10z last. Recommended **max 4 sessions at once** (renders are CPU-heavy).

## Checkpoints

Effort S/M/L. "Needs" = must be merged first.

### 10.0 — Parallel rails (S) · needs: nothing · do first
Files: bin/reelwright.mjs, tools/qa.py, tools/qa_page.mjs, tools/renderers/hyperframes.mjs, tools/preview.mjs,
.github/workflows/ci.yml, docs/parity/*.md (seeded from the audits), docs/playbook/ (empty).
Exit: existing commands/checks/CI unchanged in behaviour (pvk example byte-identical, all films' QA unchanged); a dummy
command, check, kit module and self-check added as files are picked up without editing shared files (then removed).

### Wave 1 — looks, smoothness, Claude workflow (start together)

**10a — HyperFrames engine upgrade and exposure (L)** · needs 10.0
Update vendored HyperFrames 0.8.217 → current release (re-apply our changes, VENDORED.md). Expose what the engine
already has: **motion blur** (and sub-frame supersampling in pvk), colour grading/effects/`data-vfx-chain`, `<video>`
clips with speed ramps, shader transitions, nested compositions, audio-in-composition, output formats (alpha WebM/ProRes,
GIF/APNG, HDR, 4:5). Owns: vendor/hyperframes/, tools/renderers/{hyperframes,pvk}.mjs, encode options.
Exit: parity rows for these flip to EQUAL/BETTER; example films unchanged except where they opt in; CI green.

**10b — Animation runtimes (M)** · needs 10.0
Vendor GSAP 3.15.x + plugins, lottie-web, anime.js, Three.js (each with kit.json, licence, NOTICE row). `KIT.gsap`,
`KIT.lottie`, `KIT.anime`, `KIT.three`, CSS/WAAPI paused-at-t helper — all driven from `render(t)`. Seekable QA check:
ban `Math.random` paths (ScrambleText, `stagger from:"random"`, RoughEase, CustomWiggle random, utils.random/shuffle),
MotionPath (use `KIT.path` from 10e). Owns: vendor/{gsap,lottie,anime,three}/, tools/runtimes.js,
tools/checks/seekable-runtimes.*.
Exit: determinism self-check (shuffled seeks, two pages) passes for each runtime in both renderers; demo project with
`"ci": true`.

**10c — Looks: themes and presets (M)** · needs 10.0
Port HyperFrames' 3 theme packs and 13 frame presets (Apache-2.0; credit) as Reelwright themes with caption skins,
mapped to `--kit-*` tokens and motion archetypes; add any missing tokens via new token file (not engine.js). Theme
gallery stills. Owns: themes/*.css (new files), tools/theme-*.mjs (new), fonts additions.
Exit: 27 themes total, each renders example-hf and layouts-hf cleanly; contrast/tiny-text WARNs clean.

**10d — Claude workflow: live preview, skill, recipes, taste check (M)** · needs 10.0
Vendor HyperFrames' player; `reelwright embed <name>` writes a self-contained preview page; Claude shows it in the side
panel/chat while iterating (artifact or local page). Upgrade the skill (brief → script → stills → taste check → render),
a **recipe library** (proven scene patterns with stills) and a **taste check** (composition balance, empty space,
contrast, pacing, motion jerk/velocity spikes) as WARN checks. Owns: vendor/hf-player/, tools/commands/embed.mjs,
tools/checks/taste.*, docs/recipes/, .claude/skills/, the three user skill files.
Exit: a film previews live in the chat; taste check flags a deliberately bad film; skill drives a fresh film end to end.

### Wave 2 — depth (start when Wave 1 has free slots)

**10e — Motion, transitions and camera (L)** · needs 10.0
`KIT.transition` family (cut, crossfade, wipes, iris, brush, flash, light leak, glitch, push/slide), remaining shotcraft
shots (tours, overhead/tabletop/drone/exploded, bullet-time two-clock, rack focus, parallax, graze, steep tilt),
`KIT.path` (vendor @remotion/paths, MIT: morph, draw-on, motion along a path), missing rate functions, indication
animations, typewriter, fixed-step `KIT.sim`. Owns: tools/transitions.js, tools/shots2.js, tools/path.js, vendor/paths/.

**10f — HyperFrames blocks (L)** · needs 10a, 10b
`reelwright add <block>`: import the ~102 offline-capable blocks (rewrite CDN refs to vendored libs, nested-composition
mount, `KIT.block` timing); report the rest (WebGPU/hardware) as unsupported with reasons. Owns: tools/commands/add.mjs
(replaces), tools/blocks.mjs.

**10g — Doodle and sound depth (M)** · needs 10.0
Pressure/taper ribbons, retrace, pencil grain, pen lettering, drawing score, depth parallax, seams; more doodle styles.
Synthesised SFX replacements and `house`/`hiphop` beds (no Mixkit). Owns: tools/doodle2.js, tools/mix.py SFX section,
tools/music.py beds.

**10h — Math depth (L)** · needs 10.0; 3D part needs 10b
Build-time MathJax or Typst glyph paths → real `write()` and TransformMatchingTex; flubber multi-path morph; shapes/
arrows/braces; polar/complex/parametric/implicit plots, calculus helpers, grid warp, vector fields; Three.js 3D scenes.
Owns: tools/math2.js, vendor/{mathjax,flubber}/, tools/commands/tex.mjs.

**10l — Higgsfield connector depth (M)** · ~~needs 10.0~~ **Dropped by the owner 2026-11-09** (the 0.2 connector stays as it is; its parity rows are exceptions)
`gen --ref/--opt` (upload via presigned URL, image-to-video, motion transfer, duration/aspect), locked style block,
version-on-overwrite, `--resume`/`--redo` with retry cap, spend cap for batches, `review` command. Mocked tests only;
no paid call without asking. Owns: tools/gen*, tools/gen/, docs/CONNECTORS.md.

**10m — QA parity with HyperFrames lint (M)** · needs 10.0
Port the relevant subset of HyperFrames' 143 lint rules as checks (WARN or gate, each with a broken fixture in
qa-broken-*). Owns: tools/checks/hf-*.

### Wave 3 — optional renderers and studio

**10i — Optional Manim renderers: CE and ManimGL (L)** · needs 10.0; HF clip route needs 10a
`"manim"` project block → scenes rendered to cached alpha clips played by `KIT.manim(id)`; Python package
`reelwright_manim` (CE + GL adapters, `rw.at/word/beat/mark` timing from kit data); uv venv install per OS; Typst for
equations, TinyTeX optional; frame-count assertions; `manim doctor`; cache by input hash; `verify` integration.
Owns: tools/manim.mjs, python/reelwright_manim/, tools/commands/manim.mjs.

**10j — Optional Remotion renderer (M)** · needs 10.0
`"renderer": "remotion"` → tools/renderers/remotion.mjs; per-project install behind a yes prompt (~0.7 GB); kit data
passed as props; PNG sequence + Reelwright mix/encode/QA/verify; player host page for page-based QA; licence notice
(free only for individuals/≤3-person companies/non-profits). Owns: tools/renderers/remotion.mjs, templates/remotion/.

**10k — Studio editor (L)** · needs 10d
Reelwright-native local editor on top of the player: timeline of VO lines/beats/scenes, edit project.json and theme,
scrub, re-render stills; no GSAP authoring exposed (GSAP licence). Owns: tools/studio/, tools/commands/studio.mjs.

### 10z — Release 0.3 (M) · needs everything merged
Stitch docs (README, PLAYBOOK from docs/playbook/, THIRD_PARTY/NOTICE from vendor rows), compile docs/PARITY.md from
docs/parity/ (every row EQUAL/BETTER or an explicit, owner-approved exception), update the three user skills, version
0.3.0, tag, release; cleanup list waits for the owner's OK.

## Known exceptions (cannot be "equal" — owner to confirm)

- AWS/GCP cloud render (excluded by owner; Colab stays).
- AI-generated footage, bespoke AI music and cloned voices: only through the paid Higgsfield connector.
- HyperFrames blocks needing WebGPU hardware (37) — supported only where the machine has it; flagged otherwise.
- HyperFrames cloud/HeyGen-account items and the closed-source desktop app (6 rows).
- shotcraft's JianYing export, Upload-Post publishing and Freesound tool (skipped: social publishing/third-party tools).
- Remotion features that need its own Chrome build or are UNLICENSED (shader presentations, @remotion/effects): native
  rewrites instead.

## Risks

- **Licences:** GSAP is not open source and is silent on redistribution inside another project; keep its notices, list
  it as non-MIT, never expose GSAP authoring in the studio. Remotion is a paid licence for companies > 3 people —
  opt-in only, clear notice. remotion-dev/skills, manim-craft, cth9191, docusphere: no licence — rewrite only.
- **Determinism:** WebGL/Three.js and ManimGL depend on GPU/software GL; every runtime gets a shuffled-seek self-check;
  ManimGL is best-effort.
- **Repo size:** vendored libs (GSAP ~1 MB with plugins, Three.js ~1 MB min, MathJax tens of MB unless built at build
  time only) — vendor only what renders; MathJax runs at build time.
- **Parallel merges:** rails (10.0) make conflicts rare; each checkpoint merges `main` before its own merge.
- **CI minutes:** each `"ci": true` demo adds build time on three OSes; keep demos short.

## Start prompt (per checkpoint; replace `<X>`)

> Read `AGENTS.md`, `docs/plans/phase-10-parity.md` (checkpoint 10<X> and "How the work runs in parallel"),
> `docs/parity/` and `docs/plans/phase-10-research/`. Run checkpoint 10<X> only, on branch `phase-10<X>-<slug>` in your
> own worktree, touching only the files it owns. Use subagent-driven development with explicit model and effort per
> subagent. Ask before vendoring anything not listed, adding a dependency, deleting files or any paid call. Exit test
> passes → merge `main` in, push, report CI; the owner decides the merge.
