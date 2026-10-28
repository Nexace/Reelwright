# Reelwright plan: bring in HyperFrames and make it better than both source repos

Repo: `~/projects/reelwright` (private: Nexace/reelwright). Plan only, **nothing implemented yet**. This is the streamlined version: 13 phases, one chat each. Phases 1–6 build the core; Phases 7–12 add the extra features; Phase 13 finishes it.

## Progress

| # | Phase | Status |
|---|---|---|
| 1 | Spike: verify HyperFrames and map what to copy | ☐ Not started |
| 2 | Cross-platform core: swappable renderer, Node CLI, macOS + Windows + Linux CI | ☐ Not started |
| 3 | HyperFrames inside: vendored engine, example film, catalog blocks | ☐ Not started |
| 4 | Look and feel: design tokens, themes, fonts, layouts, multi-format | ☐ Not started |
| 5 | Captions and quality: word-accurate captions, subtitle files, QA gates | ☐ Not started |
| 6 | Preview and speed: live scrubber, incremental rendering, remix | ☐ Not started |
| 7 | Film from a URL | ☐ Not started |
| 8 | Style from a reference | ☐ Not started |
| 9 | Re-voice in other languages | ☐ Not started |
| 10 | Reproducible builds | ☐ Not started |
| 11 | Automatic music drop detection | ☐ Not started |
| 12 | Free cloud rendering (Colab + Drive) | ☐ Not started |
| 13 | Docs, licensing, release | ☐ Not started |

Mark a phase ☑ Done in this table (and in `docs/plans/STATUS.md`) when its exit test passes. Do the phases in order; each needs the one before it.

## Rules for the whole project

- **Standalone toolkit only.** No MCP server, no Claude plugin. Every feature is a command-line command that works without Claude. The only Claude hook-in is the optional project skill and `CLAUDE.md` for sessions opened in this folder.
- **macOS and Windows natively, no WSL**, and still Linux (CI, Colab). New tooling is Node (`.mjs`), not bash. Python tools stay but avoid Unix-only paths and commands. I can't test on a real Windows machine here, so CI runners and your own runs are the check.
- **Everything free and local.** No paid services or API keys.
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

## Phase 1: Spike (verify HyperFrames, map what to copy) ☐

**Branch:** none (throwaway folder outside the repo) · **Needs:** nothing

**Goal:** answer four questions and decide go or no-go. A: can it render video-only or a frame sequence? B: at 60 fps? C: are two renders identical? D: does it run next to Playwright's Chromium?

**Steps**
1. Clone heygen-com/hyperframes into a temp folder with `GIT_LFS_SKIP_SMUDGE=1` (note the commit). Read its `LICENSE`, any `NOTICE`, `CREDITS.md`, and its package list.
2. Build the vendoring map: for each package, its size, dependencies, whether we need it, and any third-party code or per-block license inside it. Pick the smallest set to copy.
3. Build and run it: render a 3-second GSAP hello composition at 30 and 60 fps; compare two renders frame by frame; read the render source for output flags.
4. Write `docs/plans/spike-findings.md` (the only file that lands in the repo) and create `docs/plans/STATUS.md`. Delete the temp folder.

**Exit:** findings list the upstream commit, the working render command, the vendoring map with every notice to carry over, and go or no-go for Phases 2–3 (with a fallback if A or B fails, such as extracting frames and keeping the kit's `encode`).

---

## Phase 2: Cross-platform core ☐

**Branch:** `phase-2-core` · **Needs:** Phase 1

**Goal:** the renderer is swappable and the toolkit runs natively on macOS, Windows and Linux, with no behavior change for existing films.

**Steps**
1. Add `"renderer": "pvk"` (the default) to `project.json` handling. Move the current `tools/render.mjs` logic into `tools/renderers/pvk.mjs`; keep `tools/render.mjs` as a thin dispatcher with the same four modes and a short comment defining the renderer contract (each renderer implements `info`, `stills`, `frames`, `encode` and writes the same files).
2. Replace the bash entry point with a Node command line (`reelwright <command>`, same commands); keep `./video.sh` as a thin wrapper on macOS and Linux.
3. Port `setup.sh` to Node (check or install ffmpeg, Node, Python, Chromium; Homebrew hints on macOS, winget or Chocolatey on Windows).
4. Make `clean`, `new` and any `rm`, `rsync` or shell calls cross-platform; fix path handling in `tools/*.py` and `tools/*.mjs`.
5. CI matrix: macOS, Windows and Ubuntu.

**Exit:** the example builds on all three runners with the same duration and frame count as before the change; no film changed.

---

## Phase 3: HyperFrames inside ☐

**Branch:** `phase-3-hyperframes` · **Needs:** Phase 2

**Goal:** a project with `"renderer": "hyperframes"` builds end to end, with a real example film and a few catalog blocks.

**Steps**
1. Vendor the packages from the spike's map into `vendor/hyperframes/` with `LICENSE`, `VENDORED.md`, and change headers.
2. `tools/sched.py`: for hyperframes projects also write `hf/kit-data.js` (VO times, music grid) so compositions take timing from kit data, never hard-coded seconds.
3. `tools/renderers/hyperframes.mjs`: `info` (duration from the composition root plus kit data, writing the `timeline.json` that `mix.py` reads), `stills`, `frames`, and `encode` (mux the kit's `mix.wav` over the video with the kit's loudness settings). Adapt `qa.py` to accept the output.
4. `projects/example-hf/`: title card, captions timed to VO lines, a beat-pulsing element. `reelwright new <name> --renderer hyperframes` copies it.
5. Catalog blocks: an `add <block>` helper, and use one transition and one chart block in the example (check each block's license first).

**Exit:** `example-hf` builds on macOS, Windows and Linux CI; two builds give identical frames; output duration matches `mix.wav` within one frame; pvk films still build unchanged.

---

## Phase 4: Look and feel ☐

**Branch:** `phase-4-design` · **Needs:** Phase 3 · *If it runs long, split into two chats: (a) tokens, brand and themes; (b) layouts and formats.*

**Goal:** films stop looking alike. Today every film uses one system font stack and `kit.css` has no design tokens.

**Steps**
1. Turn `tools/kit.css` into design tokens (CSS variables for colors, fonts, radius, shadow, spacing). `brand.json` (colors, fonts, logo, tone) overrides them.
2. Style packs: 8 to 10 distinct themes (for example editorial, brutalist, soft pastel, dark tech, playful, retro), each with a palette, motion feel and caption style, picked with `"style": "<theme>"` in `project.json`.
3. Bundle open-license fonts (Google Fonts) in curated display and text pairings, with each font's license recorded. This also makes output identical on macOS and Windows.
4. Scene layout library: split screen, full-bleed text, bento grid, tilted device, big-number stat, quote card, kinetic type; all read theme tokens; add guidance to `docs/PLAYBOOK.md`.
5. One script, many formats: `--formats 16x9,9x16,1x1` with a safe-area helper.

**Exit:** the example builds in at least 3 visibly different themes and all 3 formats with no change to `film.js`; a short film using five layouts passes QA; every bundled font's license is recorded.

---

## Phase 5: Captions and quality ☐

**Branch:** `phase-5-captions-qa` · **Needs:** Phase 3

**Goal:** accurate captions and automatic checks neither source repo has.

**Steps**
1. Capture word boundaries from the voiceover in `tools/vo.py` (check what edge-tts returns) and write them into the timeline data.
2. A shared karaoke caption component for both renderers, plus `.srt` and `.vtt` export next to the mp4.
3. QA gates in `./video.sh qa` (and `reelwright qa`): loudness (LUFS) against the project target; caption overflow and contrast; flash rate against photosensitivity limits; "Illustrative data" label lint; a non-seekable-animation linter for HyperFrames films. Each reports pass or fail with the frame or time.

**Exit:** the example's captions highlight each word on time (checked on stills); `.srt` and `.vtt` open in a player; a deliberately broken test film trips each check.

---

## Phase 6: Preview and speed ☐

**Branch:** `phase-6-preview-speed` · **Needs:** Phase 4 for remix, Phase 5 optional

**Goal:** faster iteration and a way to pick a look instead of defaulting to the same one.

**Steps**
1. Live scrubber preview: a local page with a timeline slider, voice waveform from `mix.wav`, beat and VO markers, and reload on file change.
2. Incremental rendering: split the timeline into shots, hash each shot's inputs (film code, data, assets, time range), cache frames by hash, re-render only changed shots.
3. `reelwright remix <name>`: three stills of the same script in three themes and layouts as a contact sheet; a variety check that warns when a new film's fonts, palette and layouts are too similar to earlier films.

**Exit:** scrubbing shows the exact frame the renderer produces; changing one caption re-renders only its shot and the full output matches a clean build; remix gives three clearly different options and the check flags two films using the same theme.

---

## Phase 7: Film from a URL ☐

**Branch:** `phase-7-from-url` · **Needs:** Phase 5

**Goal:** give a URL, get a script to approve, then a finished film that has passed the QA gates. A plain command-line command (`reelwright from-url <url>`), not an MCP server or plugin.

**Steps**
1. Extend `tools/capture_site.mjs` to read page text, headings, colors, fonts and screenshots from a public page.
2. Draft the voiceover script from that text with simple rules and templates (no paid AI service) and show it for approval before building.
3. Build the film, run the QA gates from Phase 5, and report any failure with the frame and time. Never perform a real write on the site (no forms submitted, nothing published); mock any interaction.
4. Only capture sites you own or have the right to use, and say so in the command's help text.

**Exit:** a real public landing page produces an mp4 that passes the QA gates, with no manual editing beyond script approval. Smarter script drafts or a visual review are optional when the command is run inside Claude Code with the project skill.

---

## Phase 8: Style from a reference ☐

**Branch:** `phase-8-reference-style` · **Needs:** Phases 4 and 7

**Goal:** give a site or image and start from its palette and fonts.

**Steps**
1. `reelwright theme-from <url|image>`: extract the dominant colors and the font families in use.
2. Map each font to the closest bundled open-license font when the real one isn't free to bundle.
3. Write a draft theme file the user can edit and select with `"style"` in `project.json`.

**Exit:** a draft theme from a real landing page is recognizably related to it and builds the example film without errors.

---

## Phase 9: Re-voice in other languages ☐

**Branch:** `phase-9-languages` · **Needs:** Phase 5

**Goal:** the same film in another language, with the timeline re-flowing automatically.

**Steps**
1. Per-language `lines` in `project.json` and a voice per language (free edge-tts voices).
2. Captions, subtitle files and voiceover all follow the chosen language; output is named per language (`out/<name>-<lang>.mp4`).
3. Add a QA check for text that overflows its box in longer languages. Translations are supplied by you; nothing is machine-translated unless you run the command inside Claude Code.

**Exit:** the example builds in a second language with cuts, captions and subtitle files all aligned.

---

## Phase 10: Reproducible builds ☐

**Branch:** `phase-10-manifest` · **Needs:** Phase 3

**Goal:** any film can be rebuilt and audited.

**Steps**
1. Write a `manifest.json` per film: tool versions (Node, Python, ffmpeg, Chromium, the vendored HyperFrames commit), hashes of every input (project file, film code, assets, fonts, music, script text), and the output's duration, frame count and per-frame hashes.
2. `reelwright verify <name>`: rebuild and compare against the manifest. Compare per-frame hashes and duration, not raw mp4 bytes, since encoders can differ between machines.

**Exit:** `verify` passes on repeated runs on the same machine, and the docs state what can differ across operating systems.

---

## Phase 11: Automatic music drop detection ☐

**Branch:** `phase-11-drops` · **Needs:** Phase 3

**Goal:** find the big drop in a track and snap the key moment to it.

**Steps**
1. Extend `tools/beatgrid.py` to find the biggest energy jump after a quieter section and write its time into `film/data.js` and `hf/kit-data.js`.
2. Expose it in the engine (`KIT.drop()`) and as a helper for HyperFrames compositions; allow a manual override in `project.json`.
3. Use it in the teaser film for the flash and logo hit.

**Exit:** on the sample track, the flash and logo hit land on the detected drop, and the manual override works.

---

## Phase 12: Free cloud rendering ☐

**Branch:** `phase-12-cloud` · **Needs:** Phase 2

**Goal:** render in the cloud for free, using your Google Drive for storage. Drive only stores files; Colab does the rendering.

**Steps**
1. `cloud/reelwright_colab.ipynb`: mounts Drive, installs ffmpeg, Node, Python deps and headless Chromium, copies the project from a Drive folder, runs the build, and saves the mp4 back to Drive. Include a resume cell so a disconnected session doesn't redo finished stages, and keep the browser and pip caches in Drive.
2. Fallback: a GitHub Actions `workflow_dispatch` workflow that takes a project name and uploads the mp4 as an artifact; document the free-minutes limit.
3. First check that headless Chromium (Playwright, and the vendored HyperFrames engine) actually runs in Colab. Skip HyperFrames' AWS rendering (paid).

**Exit:** the example builds in a free Colab session and the mp4 appears in Drive; the Actions workflow also produces it. Colab sessions disconnect after idle time or a few hours, and Google sets the free limits.

---

## Phase 13: Docs, licensing, release ☐

**Branch:** `phase-13-release` · **Needs:** Phases 1–12

**Steps**
1. README: a "Renderers" section (when to use which), platform support (macOS, Windows, Linux), themes and layouts, and every new command. `docs/PLAYBOOK.md`: HyperFrames rules (seekable animations only, timings from kit data). Update `CLAUDE.md` and `.claude/skills/product-video/SKILL.md`.
2. Licensing: `THIRD_PARTY.md` and a root `NOTICE` for the vendored HyperFrames code and bundled fonts; confirm every changed vendored file has its header; a CI check that fails if `vendor/hyperframes/` loses its `LICENSE` or `VENDORED.md`.
3. CI green on macOS, Windows and Linux for both example films; tag a first release.

**Exit:** CI green everywhere; docs describe both renderers and every command; all licenses and notices present.

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
