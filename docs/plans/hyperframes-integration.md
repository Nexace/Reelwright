# Plan: integrate HyperFrames into Reelwright (phased, one chat per phase)

Status: **plan only, nothing implemented.** Repo: `~/projects/reelwright` (private: Nexace/reelwright). Updated after mapping the project with graphify.

## Goal

Reelwright keeps its voice, music, mix, recording and QA stages, and gains HyperFrames (HeyGen, Apache 2.0) as a second way to author and render the visuals. A `renderer` setting in `project.json` picks which one; the default stays the current engine, so no existing film changes.

## How to use this plan

Each phase below is sized for **one fresh chat**. For every phase:

1. Start a new chat in `~/projects/reelwright`.
2. Paste that phase's **Start prompt**.
3. Work on branch `phase-N-<name>`. At the end: tests pass, commit, merge to `main` (or open a PR), update `docs/plans/STATUS.md`, run `/graphify --update`.
4. Close the chat. The next phase reads `STATUS.md`, so it needs no memory of this one.

Every phase starts with: read `docs/plans/STATUS.md`, then `graphify-out/GRAPH_REPORT.md`, then only the files listed under "Read first".

## What exists today (from the graph)

| Area | Where | Role |
|---|---|---|
| Entry point | `video.sh` | Dispatches `new`, `record`, `vo`, `beatgrid`, `sched`, `info`, `music`, `mix`, `stills`, `frames`, `encode`, `qa`, `clean`, `all`, `audio`, `film` |
| Renderer | `tools/render.mjs` (93 lines) | Playwright pages call `window.render(t)`; modes `info`, `stills`, `frames`, `encode` |
| Engine contract | `tools/engine.js` | `render(t)` must be a pure function of `t`; exposes `window.FILM`, `window.READY`, `window.MUSIC` |
| Timing | `tools/sched.py` | Writes `film/data.js` (VO times, music grid) |
| Audio | `tools/vo.py`, `music.py`, `beatgrid.py`, `mix.py` | Voice, music bed, beat grid, mix to `mix.wav` |
| QA | `tools/qa.py` | Checks `frames/` for blips and blank frames |
| Config | `projects/<name>/project.json` | `fps`, `voice`, `music`, `lines`, `out` |
| CI | `.github/workflows/ci.yml` | Syntax checks, then builds the example end to end |

Only `info`, `stills`, `frames`, `encode` (and the frame input to `qa`) depend on the renderer. Everything else is shared.

## HyperFrames facts this plan relies on

From its README (not yet verified by running it): compositions are HTML with `data-start` / `data-duration` / `data-track-index`; animations are registered on `window.__timelines`; supports GSAP, CSS, Lottie, Three.js, Anime.js, WAAPI; CLI `init`, `preview`, `render`, `add`, `catalog`, `skills`; needs Node 22+ and FFmpeg; Apache 2.0. **Phase 0 exists to verify the assumptions below.**

Assumptions to verify:
- A. `hyperframes render` can produce **video-only** output (or a frame sequence).
- B. It can render at **60 fps** to match the kit.
- C. Two renders of the same composition give **identical frames**.
- D. It runs next to Playwright's Chromium without conflict.

---

## Phase 0 — Feasibility spike

**Chat title:** `P0 HyperFrames spike`
**Branch:** none (throwaway folder outside the repo, e.g. a temp dir)
**Goal:** answer A–D, decide go/no-go.

**Read first:** this plan; `tools/render.mjs`.

**Steps**
1. In a temp folder, `npm i hyperframes` (note the exact version). Scaffold with `hyperframes init`.
2. Render a 3-second hello composition (a GSAP-animated title) at 30 fps, then 60 fps.
3. Check each assumption A–D. For C, compare two renders frame by frame.
4. Read the HyperFrames CLI help and `render` source for output flags (video-only, frames, audio).
5. Write the findings into the repo as `docs/plans/spike-findings.md` (the only file that lands in the repo). Delete the temp folder.

**Exit criteria:** findings file lists the exact version, the exact render command that works, and a go/no-go for Phases 1–3. If A or B fails, the file says what the fallback is (for example extracting frames and keeping the kit's `encode`).

**Start prompt:**
> Read `docs/plans/hyperframes-integration.md` and `graphify-out/GRAPH_REPORT.md`. Run Phase 0 (the HyperFrames feasibility spike) only. Use a throwaway folder outside the repo. Write `docs/plans/spike-findings.md` and create `docs/plans/STATUS.md` marking Phase 0 done. Don't touch `tools/`.

---

## Phase 1 — Renderer abstraction (no behavior change)

**Chat title:** `P1 renderer abstraction`
**Branch:** `phase-1-renderer-abstraction`
**Goal:** make the renderer swappable while the existing renderer behaves exactly as before.

**Read first:** `STATUS.md`, `spike-findings.md`, `video.sh`, `tools/render.mjs`, `projects/example/project.json`.

**Steps**
1. Add `"renderer": "pvk"` (optional, defaults to `pvk`) to `project.json` handling. Document it in the example's `project.json`.
2. Move the current `tools/render.mjs` logic into `tools/renderers/pvk.mjs`. Keep `tools/render.mjs` as a thin dispatcher that reads `renderer` and calls the matching module with the same four modes.
3. Define the renderer contract in a short comment at the top of the dispatcher: each renderer implements `info`, `stills`, `frames`, `encode` and writes the same files (`timeline.json`, `stills/`, `frames/`, the mp4).
4. Keep `video.sh` commands unchanged.

**Exit criteria:** `PAGES=2 ./video.sh all` builds the example; output mp4 has the same duration and frame count as before the change; CI syntax checks pass (add the new files to the loop); no change to any film.

**Start prompt:**
> Read `docs/plans/STATUS.md`, `docs/plans/hyperframes-integration.md` and `graphify-out/GRAPH_REPORT.md`. Run Phase 1 only (renderer abstraction, no behavior change). Work on branch `phase-1-renderer-abstraction`. Verify by rebuilding the example film and comparing duration and frame count to a build from `main`. Update `STATUS.md` and run `/graphify --update` at the end.

---

## Phase 2 — HyperFrames renderer

**Chat title:** `P2 hyperframes renderer`
**Branch:** `phase-2-hyperframes-renderer`
**Goal:** a project with `"renderer": "hyperframes"` builds end to end.

**Read first:** `STATUS.md`, `spike-findings.md`, `tools/renderers/pvk.mjs`, `tools/sched.py`, `tools/mix.py`, `tools/qa.py`.

**Steps**
1. `npm i hyperframes` at the exact version from the spike; add to `package.json`.
2. `tools/sched.py`: when the renderer is `hyperframes`, also write `hf/kit-data.js` with the same VO times and music grid that `film/data.js` carries.
3. `tools/renderers/hyperframes.mjs`:
   - `info`: read the composition root's `data-duration` plus kit data; write `timeline.json` in the format `mix.py` already reads.
   - `stills`: render single frames at the requested times.
   - `frames`: render a frame sequence (or an mp4, per the spike's finding) into `frames/`.
   - `encode`: mux the kit's `mix.wav` over the video with the kit's existing loudness settings.
4. `tools/qa.py`: accept the hyperframes output (extract frames from the mp4 if needed).
5. `setup.sh`: check Node 22+.

**Exit criteria:** a minimal hyperframes composition builds via `./video.sh all <name>`; output duration equals `mix.wav` within one frame; `qa` passes; pvk films still build.

**Start prompt:**
> Read `docs/plans/STATUS.md`, `docs/plans/spike-findings.md`, `docs/plans/hyperframes-integration.md` and `graphify-out/GRAPH_REPORT.md`. Run Phase 2 only (the HyperFrames renderer) on branch `phase-2-hyperframes-renderer`. Use the exact version and render command from the spike. Verify with a minimal composition and a pvk regression build. Update `STATUS.md` and run `/graphify --update`.

---

## Phase 3 — Example film and template

**Chat title:** `P3 hyperframes example`
**Branch:** `phase-3-hf-example`
**Goal:** a real sample film and a one-command way to start a HyperFrames film.

**Read first:** `STATUS.md`, `projects/example/` (script, film), `docs/PLAYBOOK.md`.

**Steps**
1. `projects/example-hf/`: a short composition with a title card, captions timed to the VO lines from kit data (no hard-coded seconds), and an element that pulses on the beat.
2. `./video.sh new <name> --renderer hyperframes` copies that example.
3. Build it twice and compare frames (determinism check from assumption C, now on a real film).

**Exit criteria:** `./video.sh all example-hf` builds; two builds match; the film respects the "timings come from kit data" rule.

**Start prompt:**
> Read `docs/plans/STATUS.md` and `graphify-out/GRAPH_REPORT.md`. Run Phase 3 only (example-hf film and the `--renderer hyperframes` template) on branch `phase-3-hf-example`. Update `STATUS.md` and run `/graphify --update`.

---

## Phase 4 — Docs, CI, licensing

**Chat title:** `P4 docs and ci`
**Branch:** `phase-4-docs-ci`
**Goal:** the integration is documented, tested in CI, and license-clean.

**Steps**
1. README: a "Renderers" section (when to pick which).
2. `docs/PLAYBOOK.md`: HyperFrames rules (seekable animations only, timings from kit data).
3. `CLAUDE.md` and `.claude/skills/product-video/SKILL.md`: workflow for hyperframes films.
4. CI: second job builds `example-hf`; add the new files to the syntax-check loop.
5. `THIRD_PARTY.md`: HyperFrames is an Apache-2.0 dependency (not copied). Keep the original MIT notice in `LICENSE`.

**Exit criteria:** CI green on both example films; docs mention both renderers.

**Start prompt:**
> Read `docs/plans/STATUS.md` and `graphify-out/GRAPH_REPORT.md`. Run Phase 4 only (docs, CI, licensing) on branch `phase-4-docs-ci`. Update `STATUS.md` and run `/graphify --update`.

---

## Phase 5 — Optional ports (decide after Phase 4)

**Chat title:** `P5 port features` — one chat per feature, each with its own short spec.
Candidates for `tools/engine.js`: Lottie / Three.js / WAAPI adapters, a composition linter, shader-style transitions. Skip entirely if HyperFrames covers the need.

---

## Risks

- **Version drift:** HyperFrames is young; pin the exact version, upgrade deliberately.
- **Two Chrome stacks:** Playwright (kit) and Puppeteer (HyperFrames) double the browser download.
- **Timing sync:** declarative `data-start` values must come from kit data or they drift when the script changes.
- **Parallelism:** the kit renders across `PAGES` browser pages; HyperFrames' own parallelism may differ, so render times may not match.
- **Unverified claims:** everything about HyperFrames above comes from its README and web summaries until Phase 0 runs it.

## License notes

Reelwright is MIT (original notice from Arnavxy and product-video-kit contributors kept, plus Amogh Khairate). HyperFrames is Apache 2.0, used as an npm dependency with no code copied. If code is ever copied or ported from it, keep its license and notices.
