# Reelwright plan: bring in HyperFrames and make it better than both source repos

Repo: `~/projects/reelwright` (private: Nexace/reelwright). Phases 1–3 done; later phases not started. This is the streamlined version: **8 phases**, each one milestone. A phase with marked checkpoints (a, b) can span two chats if it runs long, but still counts as one phase.

## Progress

| # | Phase | Status |
|---|---|---|
| 1 | Foundation: HyperFrames spike, swappable renderer, cross-platform command line and CI | ☑ Done |
| 2 | HyperFrames inside: vendored engine, example film, catalog blocks | ☑ Done |
| 3 | Look and feel: tokens, themes, fonts, layouts, multi-format | ☑ Done |
| 4 | Captions, audio and quality: word captions, QA gates, other languages, music drops | ☑ Done |
| 5 | Preview, speed and repeatability: scrubber, incremental rendering, remix, reproducible builds | ☐ Not started |
| 6 | Film from a URL and style from a reference | ☐ Not started |
| 7 | Free cloud rendering (Colab + Drive) | ☐ Not started |
| 8 | Docs, licensing, release | ☐ Not started |

Mark a phase ☑ Done in this table (and in `docs/plans/STATUS.md`) when its exit test passes. Do the phases in order unless a phase says otherwise.

## Rules for the whole project

- **Standalone toolkit only.** No MCP server, no Claude plugin. Every feature is a command-line command that works without Claude. The only Claude hook-in is the optional project skill and `CLAUDE.md` for sessions opened in this folder.
- **macOS and Windows natively, no WSL**, and still Linux (CI, Colab). New tooling is Node (`.mjs`), not bash. Python tools stay but avoid Unix-only paths and commands. I can't test on a real Windows machine here, so CI runners and your own runs are the check.
- **Everything free and local.** No paid services or API keys.
- **Keep it tidy.** Put test and scratch files in a folder that git ignores (e.g. `scratch/`), never in the repo's real folders, so the Phase 8 cleanup is a deletion and not a hunt.
- **HyperFrames code is vendored into this repo** (not an npm dependency), under its Apache 2.0 license: keep its `LICENSE` and notices, mark every file we change, carry over any `NOTICE`. Our own code stays MIT, and the original product-video-kit notice stays in `LICENSE`.

## The two source repos

- **[Arnavxy/product-video-kit](https://github.com/Arnavxy/product-video-kit)** (MIT): already merged. Reelwright is this code, renamed. Strong at the whole pipeline from script to mp4: neural voiceover, screen recording, beat-synced cuts, ducked music, SFX, loudness mix, QA. Weak at: one authoring model, a small component set, one system font and no design system, bash-only, no live preview.
- **[heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)** (Apache 2.0): to be vendored. Strong at a general HTML-to-video engine: declarative compositions, many animation runtimes (GSAP, CSS, Lottie, Three.js, Anime.js, WAAPI), about 450 catalog blocks, studio, player. Weak at: no script-driven timing, no beat sync, no screen recording, voiceover and music only via a separate skill.

The goal: a script-driven, beat-synced film built from HyperFrames-style compositions and blocks, with real design variety.

**How vendoring works.** Copied code lives in `vendor/hyperframes/` (one folder per upstream package we take), each with the upstream `LICENSE` and a `VENDORED.md` (upstream repo, exact commit, files, what we changed). Every file we edit gets a "changed from upstream" header with the original copyright kept. Take only what we need; clone upstream with `GIT_LFS_SKIP_SMUDGE=1` so its roughly 240 MB of Git LFS test videos never enter this repo. Vendored code's own third-party packages still install through npm. Trade-off: no automatic upstream fixes; updating means re-copying from a newer commit and re-applying our changes.

## What exists today (from the graph)

| Area | Where | Role |
|---|---|---|
| Entry point | `video.sh`, `setup.sh` | Bash commands: `new record vo beatgrid sched info music mix stills frames encode qa clean all audio film` |
| Renderer | `tools/render.mjs` | Playwright pages call `window.render(t)`; modes `info`, `stills`, `frames`, `encode` |
| Engine contract | `tools/engine.js`, `tools/kit.css` | `render(t)` must be a pure function of `t`; kit.css is 38 lines of device frames and subtitles, no tokens |
| Timing and audio | `tools/sched.py`, `vo.py`, `music.py`, `beatgrid.py`, `mix.py` | VO times and music grid into `film/data.js`; mix to `mix.wav` |
| QA | `tools/qa.py` | Checks `frames/` for blips and blank frames |
| Config | `projects/<name>/project.json` | `fps`, `voice`, `music`, `lines`, `out` |

Only `info`, `stills`, `frames`, `encode` (and the frame input to `qa`) depend on the renderer.

## How to run each phase

1. Open a new chat in `~/projects/reelwright` and paste the phase's start prompt.
2. Work on branch `phase-N-<name>`. At the end: exit test passes, commit, merge to `main` (or PR), update `STATUS.md` and the Progress table, run `/graphify --update`.
3. Close the chat. The next one reads `STATUS.md` and `graphify-out/GRAPH_REPORT.md`, so it needs no memory of this one.

Start prompt template (fill in N and the name):
> Read `docs/plans/STATUS.md`, `docs/plans/hyperframes-integration.md` and `graphify-out/GRAPH_REPORT.md`. Run Phase N only (<name>) on branch `phase-N-<slug>`. Write a short spec first and wait for my OK before coding. Update `STATUS.md` and the Progress table and run `/graphify --update` at the end.

---

## Phase 1: Foundation ☑

**Branch:** `phase-1-foundation` · **Needs:** nothing

**Goal:** verify HyperFrames before committing to it, and make the renderer swappable and the toolkit run natively on macOS, Windows and Linux, with no behavior change for existing films.

**Checkpoint 1a: spike (throwaway, outside the repo).** Answer four questions: A, can it render video-only or a frame sequence? B, at 60 fps? C, are two renders identical? D, does it run next to Playwright's Chromium?
1. Clone heygen-com/hyperframes into a temp folder with `GIT_LFS_SKIP_SMUDGE=1` (note the commit). Read its `LICENSE`, any `NOTICE`, `CREDITS.md` and package list.
2. Build the vendoring map: for each package, its size, dependencies, whether we need it, and any third-party code or per-block license inside it. Pick the smallest set to copy.
3. Build and run it: render a 3-second GSAP hello composition at 30 and 60 fps, compare two renders frame by frame, and read the render source for output flags.
4. Write `docs/plans/spike-findings.md` (upstream commit, working render command, vendoring map with every notice to carry over, go or no-go with a fallback if A or B fails) and create `docs/plans/STATUS.md`. Delete the temp folder.

**Checkpoint 1b: cross-platform core.**
5. Add `"renderer": "pvk"` (the default) to `project.json` handling. Move the current `tools/render.mjs` logic into `tools/renderers/pvk.mjs`; keep `tools/render.mjs` as a thin dispatcher with the same four modes (`info`, `stills`, `frames`, `encode`) and a short comment defining the renderer contract.
6. Replace the bash entry point with a Node command line (`reelwright <command>`, same commands); keep `./video.sh` as a thin wrapper on macOS and Linux.
7. Port `setup.sh` to Node (check or install ffmpeg, Node, Python, Chromium; Homebrew hints on macOS, winget or Chocolatey on Windows).
8. Make `clean`, `new` and any `rm`, `rsync` or shell calls cross-platform; fix path handling in `tools/*.py` and `tools/*.mjs`.
9. CI matrix: macOS, Windows and Ubuntu.

**Exit:** the spike findings exist with a go or no-go; the example builds on all three runners with the same duration and frame count as before the change; no film changed.

---

## Phase 2: HyperFrames inside ☑

**Branch:** `phase-2-hyperframes` · **Needs:** Phase 1

**Goal:** a project with `"renderer": "hyperframes"` builds end to end, with a real example film and a few catalog blocks.

**Steps**
1. Vendor the packages from the spike's map into `vendor/hyperframes/` with `LICENSE`, `VENDORED.md` and change headers.
2. `tools/sched.py`: for hyperframes projects also write `hf/kit-data.js` (VO times, music grid) so compositions take timing from kit data, never hard-coded seconds.
3. `tools/renderers/hyperframes.mjs`: `info` (duration from the composition root plus kit data, writing the `timeline.json` that `mix.py` reads), `stills`, `frames`, and `encode` (mux the kit's `mix.wav` over the video with the kit's loudness settings). Adapt `qa.py` to accept the output.
4. `projects/example-hf/`: title card, captions timed to VO lines, a beat-pulsing element. `reelwright new <name> --renderer hyperframes` copies it.
5. Catalog blocks: an `add <block>` helper, and use one transition and one chart block in the example (check each block's license first).

**Exit:** `example-hf` builds on macOS, Windows and Linux CI; two builds give the same frames (byte-identical on macOS; on Linux and Windows within Chromium's software-raster noise, checked by `.github/framediff.py`: at most 64 pixels per frame off by more than 2/255); output duration matches `mix.wav` within one frame; pvk films still build unchanged.

---

## Phase 3: Look and feel ☑

**Branch:** `phase-3-design` · **Needs:** Phase 2

**Goal:** films stop looking alike. Today every film uses one system font stack and `kit.css` has no design tokens.

**Checkpoint 3a: tokens, brand, themes, fonts.**
1. Turn `tools/kit.css` into design tokens (CSS variables for colors, fonts, radius, shadow, spacing). `brand.json` (colors, fonts, logo, tone) overrides them.
2. Style packs: 8 to 10 distinct themes (for example editorial, brutalist, soft pastel, dark tech, playful, retro), each with a palette, motion feel and caption style, picked with `"style": "<theme>"` in `project.json`. Show stills of each theme for your approval before building further.
3. Bundle open-license fonts (Google Fonts) in curated display and text pairings, each license recorded. This also makes output identical on macOS and Windows.

**Checkpoint 3b: layouts and formats.**
4. Scene layout library: split screen, full-bleed text, bento grid, tilted device, big-number stat, quote card, kinetic type; all read theme tokens; add guidance to `docs/PLAYBOOK.md`.
5. One script, many formats: `--formats 16x9,9x16,1x1` with a safe-area helper.

**Exit:** the example builds in at least 3 visibly different themes and all 3 formats with no change to `film.js`; a short film using five layouts passes QA; every bundled font's license is recorded.

---

## Phase 4: Captions, audio and quality ☑

**Branch:** `phase-4-captions-audio-qa` · **Needs:** Phase 2

**Goal:** accurate captions, multilingual voiceover, a sharper music edit, and automatic checks neither source repo has.

**Checkpoint 4a: captions and languages.**
1. Capture word boundaries from the voiceover in `tools/vo.py` (check what edge-tts returns) and write them into the timeline data.
2. A shared karaoke caption component for both renderers, plus `.srt` and `.vtt` export next to the mp4.
3. Re-voice in other languages: per-language `lines` and a free edge-tts voice per language; captions, subtitle files and voiceover follow the language; output named `out/<name>-<lang>.mp4`. Translations are supplied by you; nothing is machine-translated unless you run the command inside Claude Code.

**Checkpoint 4b: QA gates and music drops.**
4. QA gates in `reelwright qa`: loudness (LUFS) against the project target; caption overflow and contrast (including longer languages); flash rate against photosensitivity limits; "Illustrative data" label lint; a non-seekable-animation linter for HyperFrames films. Each reports pass or fail with the frame or time.
5. Automatic music drop detection: extend `tools/beatgrid.py` to find the biggest energy jump after a quieter section, write it into `film/data.js` and `hf/kit-data.js`, expose it as `KIT.drop()` and a HyperFrames helper, allow a manual override in `project.json`, and use it in the teaser.

**Exit:** captions highlight each word on time (checked on stills); `.srt` and `.vtt` open in a player; the example builds in a second language with everything aligned; a deliberately broken test film trips each QA check; the teaser's flash and logo hit land on the detected drop.

---

## Phase 5: Preview, speed and repeatability ☐

**Branch:** `phase-5-preview-speed` · **Needs:** Phase 3 for remix

**Goal:** faster iteration, a way to pick a look, and builds that can be audited.

**Checkpoint 5a: preview and speed.**
1. Live scrubber preview: a local page with a timeline slider, voice waveform from `mix.wav`, beat and VO markers, and reload on file change.
2. Incremental rendering: split the timeline into shots, hash each shot's inputs (film code, data, assets, time range), cache frames by hash, re-render only changed shots.

**Checkpoint 5b: remix and reproducible builds.**
3. `reelwright remix <name>`: three stills of the same script in three themes and layouts as a contact sheet; a variety check that warns when a new film's fonts, palette and layouts are too similar to earlier films.
4. Reproducible builds: a `manifest.json` per film (tool versions including the vendored HyperFrames commit, hashes of every input, the output's duration, frame count and per-frame hashes) and `reelwright verify <name>`, which rebuilds and compares per-frame hashes and duration, not raw mp4 bytes.

**Exit:** scrubbing shows the exact frame the renderer produces; changing one caption re-renders only its shot and the output matches a clean build; remix gives three clearly different options and the check flags two films with the same theme; `verify` passes on repeated runs, and the docs state what can differ across operating systems.

---

## Phase 6: Film from a URL and style from a reference ☐

**Branch:** `phase-6-url-reference` · **Needs:** Phases 3 and 4

**Goal:** start a film or a theme from an existing site or image. Plain command-line commands, not an MCP server or plugin.

**Steps**
1. `reelwright from-url <url>`: extend `tools/capture_site.mjs` to read page text, headings, colors, fonts and screenshots from a public page; draft the voiceover with simple rules and templates (no paid AI) and show it for approval; build the film and run the QA gates; report any failure with the frame and time. Never perform a real write on the site; mock any interaction. Only capture sites you own or have the right to use, and say so in the help text.
2. `reelwright theme-from <url|image>`: extract the dominant colors and font families, map each font to the closest bundled open-license font when the real one isn't free to bundle, and write a draft theme the user can edit and select with `"style"`.

**Exit:** a real public landing page produces an mp4 that passes the QA gates with no manual editing beyond script approval; a draft theme from a real landing page is recognizably related to it and builds the example without errors. Smarter script drafts or a visual review are optional when run inside Claude Code with the project skill.

---

## Phase 7: Free cloud rendering ☐

**Branch:** `phase-7-cloud` · **Needs:** Phase 1

**Goal:** render in the cloud for free, using your Google Drive for storage. Drive only stores files; Colab does the rendering.

**Steps**
1. `cloud/reelwright_colab.ipynb`: mounts Drive, installs ffmpeg, Node, Python deps and headless Chromium, copies the project from a Drive folder, runs the build, and saves the mp4 back to Drive. Include a resume cell so a disconnected session doesn't redo finished stages, and keep the browser and pip caches in Drive.
2. Fallback: a GitHub Actions `workflow_dispatch` workflow that takes a project name and uploads the mp4 as an artifact; document the free-minutes limit.
3. First check that headless Chromium (Playwright, and the vendored HyperFrames engine) actually runs in Colab. Skip HyperFrames' AWS rendering (paid).

**Exit:** the example builds in a free Colab session and the mp4 appears in Drive; the Actions workflow also produces it. Colab sessions disconnect after idle time or a few hours, and Google sets the free limits.

---

## Phase 8: Docs, licensing, release ☐

**Branch:** `phase-8-release` · **Needs:** Phases 1–7

**Steps**
1. README: a "Renderers" section (when to use which), platform support (macOS, Windows, Linux), themes and layouts, and every new command. `docs/PLAYBOOK.md`: HyperFrames rules (seekable animations only, timings from kit data). Update `CLAUDE.md` and `.claude/skills/product-video/SKILL.md`.
2. Licensing: `THIRD_PARTY.md` and a root `NOTICE` for the vendored HyperFrames code and bundled fonts; confirm every changed vendored file has its header; a CI check that fails if `vendor/hyperframes/` loses its `LICENSE` or `VENDORED.md`.
3. CI green on macOS, Windows and Linux for both example films; tag a first release.
4. **Final cleanup, to save storage** (last step, after the release is tagged):
   - List everything that was only used for testing or building and is no longer needed: spike folders and spike notes, throwaway test projects, scratch renders, `frames/`, `stills/`, `out/` and cache folders, leftover `.graphify_*` temp files, Colab test outputs, unused fixtures and samples, vendored HyperFrames files we never import (docs, studio, Git LFS test videos), duplicate copies of the plan.
   - Show me the list with sizes and **wait for my OK before deleting anything**.
   - Never delete: `LICENSE`, `NOTICE`, `THIRD_PARTY.md`, `VENDORED.md`, the example films and their assets, the docs samples the README shows, `docs/plans/` (move to `docs/archive/` instead), or anything a CI job reads.
   - Reorganize the repo into a tidy layout (`tools/`, `vendor/`, `themes/`, `projects/`, `docs/`, `.github/`), remove empty folders, update every path in the README, `CLAUDE.md`, scripts and CI, and make sure `.gitignore` covers generated output.
   - Check: a fresh clone builds both example films, CI is still green, and report the repo size before and after.

**Exit:** CI green everywhere; docs describe both renderers and every command; all licenses and notices present; test and unneeded files removed, files organized, and the before/after size reported.

---

## Risks

- **Upstream divergence:** vendored code stops getting HyperFrames' fixes. Record the commit in `VENDORED.md`, keep our edits small and marked.
- **Repo size and license hygiene:** copy only what we need, never the LFS test videos, keep every notice.
- **Timing sync:** HyperFrames' declarative start times must come from kit data or they drift when the script changes.
- **Two Chrome stacks:** Playwright (kit) and Puppeteer (HyperFrames) double the browser download.
- **Windows is untested locally:** only CI runners and your own runs can confirm it.
- **Unverified HyperFrames claims:** everything about it comes from its README and summaries until Phase 1 runs it.

## License notes

Reelwright is MIT (original notice from Arnavxy and product-video-kit contributors kept, plus Amogh Khairate). HyperFrames is Apache 2.0 and vendored into `vendor/hyperframes/`; Apache 2.0 allows this if we keep its license with the code, keep copyright and attribution notices, mark every changed file and carry over any `NOTICE` file. This is a plain-language summary, not legal advice.
