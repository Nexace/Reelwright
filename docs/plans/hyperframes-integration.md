# Plan: integrate HyperFrames into Reelwright (phased, one chat per phase)

Status: **plan only, nothing implemented.** Repo: `~/projects/reelwright` (private: Nexace/reelwright). Updated after mapping the project with graphify.

## Goal

Reelwright keeps its voice, music, mix, recording and QA stages, and gains HyperFrames (HeyGen, Apache 2.0) as a second way to author and render the visuals. A `renderer` setting in `project.json` picks which one; the default stays the current engine, so no existing film changes.

## Platform rule: macOS and Windows, both natively

Everything built from here on must run on **macOS and Windows** (and keep working on Linux, which CI and Colab use), with no WSL. That changes the order of work, because the kit's entry point (`video.sh`, `setup.sh`) is bash, which Windows can't run natively.

- **New tooling is written in Node (`.mjs`), not bash.** Python tools stay, but must avoid hard-coded `/` paths, shell calls and Unix-only commands.
- **Native Windows support (P16) moves up:** do it right after Phase 1, before Phase 2, so the HyperFrames renderer and every later phase are built on the cross-platform command line instead of being ported afterward.
- **Every phase's exit test also passes on a Windows runner and a macOS runner in CI** once P16 lands. Before then, new files must not use bash-only syntax.
- Fonts differ by platform, so bundled fonts (P19) matter more: they are what makes output identical across both.
- Limit: I can't test on a real Windows machine here. CI runners (free for public repos, minute-limited for private) and your own runs are the check.

## The two source repos and how we merge them

- **[Arnavxy/product-video-kit](https://github.com/Arnavxy/product-video-kit)** (MIT): the base of Reelwright. Already merged: Reelwright *is* this code, renamed, with its license notice kept.
- **[heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)** (Apache 2.0): the second source.

| | product-video-kit (Reelwright today) | HyperFrames |
|---|---|---|
| Strongest at | The whole pipeline from script to mp4: neural voiceover, screen recording, beat-synced cuts, ducked music, SFX, loudness mix, QA | A general HTML-to-video engine: declarative compositions, many animation runtimes, ~450-block catalog (transitions, captions, charts, maps, 3D), studio, player, Lambda rendering, agent skills |
| Weak at | Only one authoring model (`render(t)` JS); small component set; bash-only (Windows via WSL); no live preview | No script-driven timing, no beat sync, no screen recording; voiceover and music only through a separate `/media-use` skill; studio and Lambda still maturing |

**Merge options**
1. **Depend on it (recommended):** use HyperFrames as a pinned npm dependency. No code copied, no extra license duties beyond normal use.
2. **Vendor parts of it:** copy selected packages (for example its runtime, frame adapters or linter) into this repo. Allowed under Apache 2.0 if we keep its `LICENSE`, keep copyright and attribution notices, mark files we changed, and carry over any `NOTICE` file. Do this only if we need to fork or patch it.
3. **Re-implement from its docs:** write our own versions of the ideas without copying code. No license duties, but the most work.

Phases 0–4 use option 1. Option 2 or 3 only come up in Phase 5 if we decide to port features.

## How to use this plan

Each phase below is sized for **one fresh chat**. For every phase:

1. Start a new chat in `~/projects/reelwright`.
2. Paste that phase's **Start prompt**.
3. Work on branch `phase-N-<name>`. At the end: tests pass, commit, merge to `main` (or open a PR), update `docs/plans/STATUS.md`, run `/graphify --update`.
4. Close the chat. The next phase reads `STATUS.md`, so it needs no memory of this one.

**Order of work:** Phase 0 → Phase 1 → **P16 (Windows + macOS)** → Phase 2 → Phase 3 → Phase 4 → P6–P10 → **P19–P21 (design variety)** → the rest (P11–P15, P17, P18, P22, Phase 5). Numbers are labels, not the order.

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
5. Setup: check Node 22+ in the cross-platform setup from P16 (not only `setup.sh`). Needs P16 done first.

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

## Phases 6–22 — Making it better than both

Each phase is one chat, same routine as Phases 0–4 (read `STATUS.md` and the graph report first, work on its own branch, update `STATUS.md`, run `/graphify --update`). **Everything stays free and local**: no paid services, no API keys. They can run in any order unless "Needs" says otherwise; the order below is my suggested value-for-effort order. All of them need Phases 0–4 finished first. **Design variety (P19–P22) is placed after P8 in order of work**, even though it is numbered last, because every film looks alike today: all films share one system font stack, `tools/kit.css` is 38 lines with no color or type variables, and the playbook has no palette, type or layout guidance.

Generic start prompt (fill in the name and branch):
> Read `docs/plans/STATUS.md` and `graphify-out/GRAPH_REPORT.md`. Run Phase N only (<name>) on branch `phase-N-<slug>`. Write a short spec first and wait for my OK before coding. Update `STATUS.md` and run `/graphify --update` at the end.

### Easy wins

**P6 — Catalog blocks in Reelwright films** · branch `phase-6-catalog-blocks` · Needs: Phase 2
- Goal: a film can use HyperFrames catalog blocks (shader transitions, captions, charts, overlays) with kit timing injected.
- Steps: list which blocks work with kit data; add a `./video.sh add <block>` helper that installs a block into a project; pass VO times and beat grid into blocks; document the pattern.
- Exit: `example-hf` uses at least one transition and one chart block; builds and passes QA.

**P7 — Word-accurate captions and subtitle files** · branch `phase-7-captions`
- Goal: karaoke captions driven by real word timings from the voiceover, in both renderers, plus `.srt` / `.vtt` export.
- Steps: capture word boundaries in `tools/vo.py` (check what edge-tts returns); write them into the timeline data; a shared caption component for both renderers; export subtitle files next to the mp4.
- Exit: example film's captions highlight each word on time (check against stills); `.srt` / `.vtt` open correctly in a player.

**P8 — `brand.json`** · branch `phase-8-brand`
- Goal: one file for colors, fonts, logo and tone, applied to every film.
- Steps: turn `tools/kit.css` into design tokens (CSS variables for colors, fonts, radius, shadow, spacing); define the `brand.json` schema as an override layer on those tokens (P19 themes sit underneath it); load it in `engine.js` / `kit.css` and in HyperFrames films; `./video.sh new` copies a default brand; fonts load from the project folder.
- Exit: changing `brand.json` recolors and re-fonts the example without touching `film.js`.

**P9 — One script, many formats** · branch `phase-9-formats`
- Goal: build 16:9, 9:16 and 1:1 from the same script and timings with one command.
- Steps: layout presets in the engine; `./video.sh all <name> --formats 16x9,9x16,1x1`; per-format outputs; safe-area helper.
- Exit: the example builds in all three sizes with captions inside the safe area.

**P10 — Stronger QA gates** · branch `phase-10-qa`
- Goal: automatic checks neither repo has.
- Steps: loudness (LUFS) vs `project.json` target; caption overflow and contrast; flash-rate check against photosensitivity limits; "Illustrative data" label lint; non-seekable-animation linter for HyperFrames films. Each check reports a clear pass/fail with the frame or time.
- Exit: `./video.sh qa` runs all checks; a deliberately broken test film trips each one.

### Design variety (do right after P8)

**P19 — Style packs and bundled fonts** · branch `phase-19-themes` · Needs: P8
- Goal: films stop looking alike. A theme bundles fonts, palette, corner radius, shadow style, motion feel (snappy, floaty, mechanical) and caption style.
- Steps: ship 8–10 distinct themes (for example editorial, brutalist, soft pastel, dark tech, playful, retro); bundle open-license fonts (Google Fonts, free) in curated display + text pairings, with each font's license kept in the repo; `project.json` `"style": "<theme>"` picks one; `brand.json` overrides a theme; motion feel changes easing and pacing, not just colors.
- Exit: the example film builds in at least 3 visibly different themes with no change to `film.js`; every bundled font's license is recorded.

**P20 — Scene layout library** · branch `phase-20-layouts` · Needs: P19
- Goal: reusable layouts to mix inside one film instead of rebuilding each from scratch.
- Steps: engine components for split screen, full-bleed text, bento grid, tilted device, big-number stat, quote card and kinetic type; each reads theme tokens; document when to use which in `docs/PLAYBOOK.md`.
- Exit: a short film built from five different layouts, in two themes, passes QA.

**P21 — Remix and variety check** · branch `phase-21-remix` · Needs: P19, P20
- Goal: pick a look from options instead of defaulting to the same one, and catch drift back to sameness.
- Steps: `./video.sh remix <name>` renders three stills of the same script in three different themes and layouts and builds a contact sheet; a variety check compares a new film's fonts, palette and layouts with earlier films in `projects/` and warns when they are too similar.
- Exit: remix produces three clearly different options from one script; the check flags two films made with the same theme.

**P22 — Style from a reference** · branch `phase-22-reference-style` · Needs: P19, P15
- Goal: give a site or image and start from its palette and fonts.
- Steps: extract dominant colors and font families from a URL (reusing the capture from P15) or an image; write a draft theme; fall back to the closest bundled font when the real one isn't free to bundle.
- Exit: a draft theme from a real landing page is recognizably related to it and builds the example without errors.

### Bigger

**P11 — Live scrubber preview** · branch `phase-11-preview`
- Goal: a local page with a timeline scrubber, voice waveform and beat markers that reloads as files change.
- Steps: small local server; load the film in a page with a time slider; draw waveform from `mix.wav`; show beat grid and VO cue markers; file watcher reload.
- Exit: scrub to any time and see the exact frame the renderer would produce; edits show within a couple of seconds.

**P12 — Incremental rendering** · branch `phase-12-incremental`
- Goal: after an edit, re-render only the shots that changed.
- Steps: split the timeline into shots; hash each shot's inputs (film code, data, assets, time range); cache frames by hash; invalidate on change.
- Exit: changing one caption re-renders only its shot; full build output is identical to a clean build.

**P13 — Re-voice in other languages** · branch `phase-13-languages`
- Goal: translate the script, re-run voiceover, and let the timeline re-flow automatically.
- Steps: `lines` get per-language text; language picks the voice; captions use the same words; output named per language.
- Exit: the example builds in a second language with all cuts and captions still aligned.

**P14 — Reproducible builds** · branch `phase-14-manifest`
- Goal: any film can be rebuilt identically and audited.
- Steps: write `manifest.json` per film (tool versions, input hashes, output hash); a `verify` command that rebuilds and compares.
- Exit: `./video.sh verify example` passes on two runs.

### Larger bets

**P15 — Film from a URL** · branch `phase-15-url-to-film` · Needs: P7, P10
- Goal: give a URL, get a script to approve, then a finished video after a self-review loop.
- Steps: extend `tools/capture_site.mjs` to read page text, colors and fonts; draft the script; run the build; render stills, check them with the QA gates, fix problems, then report.
- Exit: a real public landing page produces a reviewed mp4 with no manual editing beyond script approval.

**P16 — Native Windows + macOS support (do right after Phase 1, before Phase 2)** · branch `phase-16-windows`
- Goal: the same commands run directly on Windows and macOS, no WSL. Required by the platform rule above.
- Steps: replace the bash entry point (`video.sh`) with a Node command line (`reelwright <command>`) that keeps the same commands, and keep `./video.sh` as a thin wrapper on macOS/Linux; port `setup.sh` to Node (install or check ffmpeg, Node, Python, Chromium; use `winget` or Chocolatey hints on Windows, Homebrew on macOS); fix path handling and shell calls in `tools/*.py` and `tools/*.mjs`; make the `./video.sh clean` and `new` commands (which use `rm` and `rsync`) cross-platform; CI matrix of macOS, Windows and Ubuntu.
- Exit: the example builds on macOS, Windows and Ubuntu runners in CI with identical frame counts and duration. (I can't test on a real Windows machine; CI and your own run are the check.)

**P17 — Free cloud rendering: Google Colab + Drive (main), GitHub Actions (fallback)** · branch `phase-17-cloud-render`
- Goal: render a film in the cloud for free. Google Drive only stores files; Colab does the rendering.
- Main path, Colab + Drive: a notebook (`cloud/reelwright_colab.ipynb`) that mounts Drive, installs ffmpeg, Node, Python deps and headless Chromium, copies the project from a Drive folder, runs `./video.sh all <name>`, and saves the mp4 back to Drive. Include a "resume" cell so a disconnected session doesn't redo finished stages, and put the browser and pip caches in Drive to speed up reinstalls.
- Fallback, GitHub Actions: a `workflow_dispatch` workflow taking the project name that uploads the mp4 as an artifact; document the free-minutes limit.
- Exit: the example builds in a free Colab session and the mp4 appears in Drive; the Actions workflow also produces it. First check: headless Chromium (Playwright, and later HyperFrames' Puppeteer) actually runs in Colab, since it's untested. Skip HyperFrames' AWS rendering (paid).
- Notes: Colab sessions disconnect after idle time or a few hours, and Google sets the free limits, so keep each render resumable. Drive storage is not a constraint with a 5 TB plan.

**P18 — Automatic music drop detection** · branch `phase-18-drops`
- Goal: find the big drop in a track and snap the key moment to it.
- Steps: extend `tools/beatgrid.py` to find the biggest energy jump; write it into `film/data.js`; expose `KIT.drop()` in the engine; use it in the teaser.
- Exit: on the sample track, the white flash and logo hit land on the detected drop.

## Risks

- **Version drift:** HyperFrames is young; pin the exact version, upgrade deliberately.
- **Two Chrome stacks:** Playwright (kit) and Puppeteer (HyperFrames) double the browser download.
- **Timing sync:** declarative `data-start` values must come from kit data or they drift when the script changes.
- **Parallelism:** the kit renders across `PAGES` browser pages; HyperFrames' own parallelism may differ, so render times may not match.
- **Unverified claims:** everything about HyperFrames above comes from its README and web summaries until Phase 0 runs it.

## License notes

Reelwright is MIT (original notice from Arnavxy and product-video-kit contributors kept, plus Amogh Khairate). HyperFrames is Apache 2.0, used as an npm dependency with no code copied. If code is ever copied or ported from it, keep its license and notices.
