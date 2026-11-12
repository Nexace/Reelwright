# Phase 10z cleanup list for release 0.3 — prepared, NOT RUN

Status: **list only. Nothing in this document has been executed.** Prepared 2026-11-12 (task 10z-E) for the plan's Final step ("push and clean up every useless file", docs/plans/phase-10-parity.md). Every command below needs the owner's yes. Facts were read from the live checkouts with read-only commands (`du -sk`, `git status --ignored`, `git worktree list`, `git merge-base --is-ancestor`, `git grep`, `lsof`). origin/main = `fa923a7` as of the last fetch (2026-11-12 09:32 UTC); the release branch `phase-10z-release` is ahead of it and unpushed.

Scope rule (from the plan and the Phase 8 / 9e cleanups in docs/archive/plans/STATUS.md): remove only what can be rebuilt or is no longer used. Never touched: `.venv-manim` (owner's Manim install), anything tracked and used, git history, any worktree or branch with unmerged or uncommitted work. Branches are listed only. Sizes are `du -sk` (KiB, block-rounded) of the exact path; live worktrees can drift by a few KiB.

## Summary

| § | What | Items | KiB | MiB |
| --- | --- | --- | --- | --- |
| 1 now | generated film output: primary + keen-ritchie | 55 paths | 324,672 | 317.1 |
| 1 later | generated film output: worktrees 10b, 10c and 10d (live sessions) | 110 paths | 536,248 | 523.7 |
| 2 | `scratch/phase10` in the primary | 29 entries | 1,701,888 | 1662.0 |
| 3 now | 2 merged, clean, idle agent worktrees (whole directories) | 2 worktrees | 454,024 | 443.4 |
| 3 later | 1 merged-today worktrees that a live session is using on a new 10z branch (whole directories; remove after those branches merge) | 1 worktrees | 728,072 | 711.0 |
| 4 | branches | list only | 0 | 0.0 |
| 5 | vendored files proven unused | 27 files | 224 | 0.2 |
| 6 | other tracked files | none proven | 0 | 0.0 |
| 7 | node_modules, .venv-manim, graphify-out, .git | keep | 0 | 0.0 |
| **now** | **freed by the commands that can run today** (§1 primary + keen-ritchie, §2, §3 now, §5) |  | **2,480,808** | **2422.7** (2.37 GiB) |
| **later** | **freed after the live 10z sessions close** (§1 10b + 10c + 10d, §3 later) |  | **1,264,320** | **1234.7** |
| **all** | **grand total that would be freed** |  | **3,745,128** | **3657.4** (3.57 GiB) |

Read before saying yes:

- **Four live Claude Code sessions are working in worktrees right now** (10a, 10b, 10c, 10d; `lsof -d cwd`; the primary has one too). While this list was being prepared, 10a, 10b and 10c were switched from their Phase 10 branches to new `phase-10z-parity-*` branches (at origin/main, no commits yet). So 10a, clean and merged today, is **"later"** (removable once its new branch is merged and the session is closed); 10c shows uncommitted changes and 10b holds the Manim venv, so both are KEEP. The generated output of 10b, 10c and 10d is a separate later tier so no running build loses its frames. Re-check before running; the state moves.
- **Phase 10 demo-film deliverables exist only in worktrees.** `blocks-hf` and `engine-hf` (10a, removable later) and `doodle2-hf` (10c, kept) have an mp4 in a worktree with no copy in the primary; the release plan builds them in the fresh-clone step before cleanup, or copy them first (exact files in section 3). `manim-hf`, `math2-hf`, `motion-hf`, `runtimes-hf` live in 10b, which stays.
- **`.venv-manim/` (344 MB) lives inside worktree 10b**, so that worktree stays even though its Phase 10 branch is merged. If the owner wants 10b gone later, move the venv to the primary checkout first (`tools/manim.mjs` resolves `<checkout>/.venv-manim`, or set `REELWRIGHT_MANIM_VENV`); not part of this list.
- `vo/` rebuilds need the internet (edge-tts) and a regenerated voice may not be byte-identical to the one in the kept mp4.
- Section 5 removes *tracked* files (27 files, ~157 KiB apparent): that is a commit, not a disk-only cleanup; history keeps them.

## 1. Generated film output

Generated output is exactly what `.gitignore` lists (`projects/*/frames/`, `frames-*/`, `stills/`, `stills-*/`, `.cache/`, `clips/`, `vo/`, `out/`, `mix.wav`, `timeline.json`, `music/bed.wav`, `music/grid.json`, `film/data.js`, `film/clip.js`, `film/theme.css`, `hf/kit/`, `hf/kit-data.js`, `hf/theme.css`, `assets/`, plus `docs/recipes/.gitignore` for `docs/recipes/film/`). Each path below was taken from `git status --ignored --short` in that checkout, so none of it is tracked. In `out/` the `*.mp4`, `*.srt`, `*.vtt`, `*.manifest.json` (and the one `*.webm`) stay; only `out/embed.html` is listed. `projects/skill-e2e/` (untracked leftover) is not listed. `music/grid.json`, `assets/`, `film/site.js`, `*.mp3` did not occur in any checkout.

Why it is safe: every item is rebuilt from tracked sources (project.json, film.js / hf/, record.mjs, tools/) by the command in the last column; none holds the only copy of anything the release ships (the mp4/srt/vtt/manifest stay). Checkouts that section 3 removes whole are shown compactly and **not counted twice**.

### (primary) . (main) — counted

| Exact path(s) | KiB | MiB | What it is / why safe | Rebuilt by |
| --- | --- | --- | --- | --- |
| `projects/example/frames/` | 96,892 | 94.6 | Rendered frame sequence (JPEG/PNG) | `./video.sh film <p>` (re-renders frames and re-encodes the mp4); `all` does the whole chain |
| `projects/example/.cache/` | 63,800 | 62.3 | Frame/clip render cache | re-created by the next `film` / `all` (first render is slower) |
| `projects/example/clips/` | 14,288 | 14.0 | Screen take recorded by record.mjs (pvk films) | `./video.sh record <p>` (re-runs the project's record.mjs against its demo app) |
| `projects/example/vo/` | 116 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/example/film/clip.js`, `projects/example/film/data.js`, `projects/example/film/theme.css`, `projects/example/timeline.json` (8 + 4 + 4 + 8 KiB) | 24 | 0.0 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/example/mix.wav`, `projects/example/music/bed.wav` (4,304 + 4,304 KiB) | 8,608 | 8.4 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `projects/example-hf/frames/` | 12,404 | 12.1 | Rendered frame sequence (JPEG/PNG) | `./video.sh film <p>` (re-renders frames and re-encodes the mp4); `all` does the whole chain |
| `projects/example-hf/vo/` | 56 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/example-hf/hf/kit/` | 688 | 0.7 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/example-hf/hf/kit-data.js`, `projects/example-hf/hf/theme.css`, `projects/example-hf/timeline.json` (4 + 96 + 4 KiB) | 104 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/example-hf/mix.wav`, `projects/example-hf/music/bed.wav` (2,108 + 2,108 KiB) | 4,216 | 4.1 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `projects/layouts-hf/frames/` | 30,088 | 29.4 | Rendered frame sequence (JPEG/PNG) | `./video.sh film <p>` (re-renders frames and re-encodes the mp4); `all` does the whole chain |
| `projects/layouts-hf/vo/` | 76 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/layouts-hf/hf/kit/` | 688 | 0.7 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/layouts-hf/hf/kit-data.js`, `projects/layouts-hf/hf/theme.css`, `projects/layouts-hf/timeline.json` (4 + 88 + 4 KiB) | 96 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/layouts-hf/mix.wav`, `projects/layouts-hf/music/bed.wav` (3,072 + 3,072 KiB) | 6,144 | 6.0 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `projects/math-hf/frames/` | 8,756 | 8.6 | Rendered frame sequence (JPEG/PNG) | `./video.sh film <p>` (re-renders frames and re-encodes the mp4); `all` does the whole chain |
| `projects/math-hf/vo/` | 56 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/math-hf/hf/kit/` | 688 | 0.7 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/math-hf/hf/kit-data.js`, `projects/math-hf/hf/theme.css`, `projects/math-hf/timeline.json` (4 + 124 + 4 KiB) | 132 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/math-hf/mix.wav`, `projects/math-hf/music/bed.wav` (2,384 + 2,384 KiB) | 4,768 | 4.7 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `projects/qa-broken/frames/` | 40,244 | 39.3 | Rendered frame sequence (JPEG/PNG) | `./video.sh film <p>` (re-renders frames and re-encodes the mp4); `all` does the whole chain |
| `projects/qa-broken/vo/` | 124 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/qa-broken/hf/kit/` | 688 | 0.7 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/qa-broken/hf/kit-data.js`, `projects/qa-broken/hf/theme.css`, `projects/qa-broken/timeline.json` (4 + 4 + 8 KiB) | 16 | 0.0 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/qa-broken/mix.wav`, `projects/qa-broken/music/bed.wav` (4,304 + 4,304 KiB) | 8,608 | 8.4 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `projects/shots-hf/frames/` | 16,056 | 15.7 | Rendered frame sequence (JPEG/PNG) | `./video.sh film <p>` (re-renders frames and re-encodes the mp4); `all` does the whole chain |
| `projects/shots-hf/vo/` | 64 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/shots-hf/hf/kit/` | 688 | 0.7 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/shots-hf/hf/kit-data.js`, `projects/shots-hf/hf/theme.css`, `projects/shots-hf/timeline.json` (4 + 96 + 4 KiB) | 104 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/shots-hf/mix.wav`, `projects/shots-hf/music/bed.wav` (2,304 + 2,304 KiB) | 4,608 | 4.5 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| **total** | **323,888** | **316.3** |  |  |

Stays in this checkout: 28 files in `projects/*/out/` (mp4/srt/vtt/manifest/webm), 17,700 KiB.

### SCRATCHPAD:…/3e51ce39-9d02-43ba-bb2f-985ccfdab43c/scratchpad/base (detached) — subsumed by section 3 (not counted)

| Path (generated output inside) | KiB | MiB |
| --- | --- | --- |
| `projects/example/` (frames, cache, clips, vo, small, audio) | 183,736 | 179.4 |
| `projects/example-hf/` (frames, vo, kit, small, audio) | 23,080 | 22.5 |
| **total** | **206,816** | **202.0** |

### .claude/worktrees/gifted-margulis-9da150 (phase-9d-connectors) — subsumed by section 3 (not counted)

| Path (generated output inside) | KiB | MiB |
| --- | --- | --- |
| `projects/example-hf/` (vo, kit, small) | 844 | 0.8 |
| `projects/qa-broken/` (vo, kit, small) | 824 | 0.8 |
| **total** | **1,668** | **1.6** |

### .claude/worktrees/keen-ritchie-d252b5 (claude/keen-ritchie-d252b5) — counted

| Exact path(s) | KiB | MiB | What it is / why safe | Rebuilt by |
| --- | --- | --- | --- | --- |
| `projects/claude-ad/vo/` | 4 | 0.0 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/claude-ad/hf/kit/` | 684 | 0.7 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/claude-ad/hf/kit-data.js`, `projects/claude-ad/hf/theme.css`, `projects/claude-ad/timeline.json` (4 + 88 + 4 KiB) | 96 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| **total** | **784** | **0.8** |  |  |

Stays in this checkout: 0 files in `projects/*/out/` (mp4/srt/vtt/manifest/webm), 0 KiB.

### .claude/worktrees/phase-10a-hf-engine-c16edb (phase-10z-parity-hf) — subsumed by the later removal in section 3 (not counted)

| Path (generated output inside) | KiB | MiB |
| --- | --- | --- |
| `projects/blocks-hf/` (frames, stills, vo, kit, small, audio) | 68,576 | 67.0 |
| `projects/engine-hf/` (frames, cache, vo, kit, small, audio) | 179,248 | 175.0 |
| `projects/example/` (frames, cache, clips, vo, small, audio) | 247,648 | 241.8 |
| `projects/example-hf/` (frames, vo, kit, small, audio) | 24,564 | 24.0 |
| **total** | **520,036** | **507.8** |

### .claude/worktrees/phase-10b-runtimes-265269 (phase-10z-parity-manim-motion) — counted, **later tier**: a live 10z session works here, run after it closes

| Exact path(s) | KiB | MiB | What it is / why safe | Rebuilt by |
| --- | --- | --- | --- | --- |
| `projects/manim-hf/frames/` | 8,316 | 8.1 | Rendered frame sequence (JPEG/PNG) | `./video.sh film <p>` (re-renders frames and re-encodes the mp4); `all` does the whole chain |
| `projects/manim-hf/stills/` | 1,344 | 1.3 | Preview stills and contact sheet | `./video.sh stills <p>` |
| `projects/manim-hf/.cache/` | 4 | 0.0 | Frame/clip render cache | re-created by the next `film` / `all` (first render is slower) |
| `projects/manim-hf/vo/` | 40 | 0.0 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/manim-hf/hf/kit/` | 14,816 | 14.5 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/manim-hf/hf/kit-data.js`, `projects/manim-hf/hf/theme.css`, `projects/manim-hf/timeline.json` (4 + 96 + 4 KiB) | 104 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/manim-hf/mix.wav`, `projects/manim-hf/music/bed.wav` (1,292 + 1,292 KiB) | 2,584 | 2.5 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `projects/math2-hf/frames/` | 26,788 | 26.2 | Rendered frame sequence (JPEG/PNG) | `./video.sh film <p>` (re-renders frames and re-encodes the mp4); `all` does the whole chain |
| `projects/math2-hf/stills/` | 1,616 | 1.6 | Preview stills and contact sheet | `./video.sh stills <p>` |
| `projects/math2-hf/vo/` | 48 | 0.0 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/math2-hf/hf/kit/` | 6,040 | 5.9 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/math2-hf/hf/kit-data.js`, `projects/math2-hf/hf/theme.css`, `projects/math2-hf/timeline.json` (4 + 76 + 4 KiB) | 84 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/math2-hf/mix.wav`, `projects/math2-hf/music/bed.wav` (1,716 + 1,716 KiB) | 3,432 | 3.4 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `projects/motion-hf/frames/` | 12,352 | 12.1 | Rendered frame sequence (JPEG/PNG) | `./video.sh film <p>` (re-renders frames and re-encodes the mp4); `all` does the whole chain |
| `projects/motion-hf/stills/` | 660 | 0.6 | Preview stills and contact sheet | `./video.sh stills <p>` |
| `projects/motion-hf/vo/` | 52 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/motion-hf/hf/kit/` | 3,632 | 3.5 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/motion-hf/hf/kit-data.js`, `projects/motion-hf/hf/theme.css`, `projects/motion-hf/timeline.json` (4 + 88 + 4 KiB) | 96 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/motion-hf/mix.wav`, `projects/motion-hf/music/bed.wav` (1,812 + 1,812 KiB) | 3,624 | 3.5 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `projects/runtimes-hf/frames/` | 166,416 | 162.5 | Rendered frame sequence (JPEG/PNG) | `./video.sh film <p>` (re-renders frames and re-encodes the mp4); `all` does the whole chain |
| `projects/runtimes-hf/stills/` | 976 | 1.0 | Preview stills and contact sheet | `./video.sh stills <p>` |
| `projects/runtimes-hf/vo/` | 48 | 0.0 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/runtimes-hf/hf/kit/` | 3,428 | 3.3 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/runtimes-hf/hf/kit-data.js`, `projects/runtimes-hf/hf/theme.css`, `projects/runtimes-hf/timeline.json` (4 + 76 + 4 KiB) | 84 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/runtimes-hf/mix.wav`, `projects/runtimes-hf/music/bed.wav` (1,608 + 1,608 KiB) | 3,216 | 3.1 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| **total** | **259,800** | **253.7** |  |  |

Stays in this checkout: 16 files in `projects/*/out/` (mp4/srt/vtt/manifest/webm), 4,596 KiB.

### .claude/worktrees/phase-10c-themes-3b354d (phase-10z-parity-rm-doodle) — counted, **later tier**: a live 10z session works here, run after it closes

| Exact path(s) | KiB | MiB | What it is / why safe | Rebuilt by |
| --- | --- | --- | --- | --- |
| `projects/doodle2-hf/vo/` | 40 | 0.0 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/doodle2-hf/hf/kit/` | 3,460 | 3.4 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/doodle2-hf/hf/kit-data.js`, `projects/doodle2-hf/hf/theme.css`, `projects/doodle2-hf/timeline.json` (4 + 152 + 4 KiB) | 160 | 0.2 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/example/frames/` | 96,888 | 94.6 | Rendered frame sequence (JPEG/PNG) | `./video.sh film <p>` (re-renders frames and re-encodes the mp4); `all` does the whole chain |
| `projects/example/.cache/` | 64,016 | 62.5 | Frame/clip render cache | re-created by the next `film` / `all` (first render is slower) |
| `projects/example/clips/` | 13,188 | 12.9 | Screen take recorded by record.mjs (pvk films) | `./video.sh record <p>` (re-runs the project's record.mjs against its demo app) |
| `projects/example/vo/` | 116 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/example/film/clip.js`, `projects/example/film/data.js`, `projects/example/film/theme.css`, `projects/example/timeline.json` (4 + 4 + 4 + 8 KiB) | 20 | 0.0 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/example/mix.wav`, `projects/example/music/bed.wav` (4,304 + 4,304 KiB) | 8,608 | 8.4 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `projects/example-hf/vo/` | 56 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/example-hf/hf/kit/` | 688 | 0.7 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/example-hf/hf/kit-data.js`, `projects/example-hf/hf/theme.css`, `projects/example-hf/timeline.json` (4 + 96 + 4 KiB) | 104 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/example-hf/mix.wav`, `projects/example-hf/music/bed.wav` (2,108 + 2,108 KiB) | 4,216 | 4.1 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `projects/layouts-hf/stills/` | 1,048 | 1.0 | Preview stills and contact sheet | `./video.sh stills <p>` |
| `projects/layouts-hf/vo/` | 76 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/layouts-hf/hf/kit/` | 688 | 0.7 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/layouts-hf/hf/kit-data.js`, `projects/layouts-hf/hf/theme.css`, `projects/layouts-hf/timeline.json` (4 + 88 + 4 KiB) | 96 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/layouts-hf/mix.wav`, `projects/layouts-hf/music/bed.wav` (3,072 + 3,072 KiB) | 6,144 | 6.0 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| **total** | **199,612** | **194.9** |  |  |

Stays in this checkout: 8 files in `projects/*/out/` (mp4/srt/vtt/manifest/webm), 6,788 KiB.

### .claude/worktrees/phase-10d-workflow-cf40d2 (phase-10z-release) — counted, **later tier**: a live 10z session works here, run after it closes

| Exact path(s) | KiB | MiB | What it is / why safe | Rebuilt by |
| --- | --- | --- | --- | --- |
| `docs/recipes/film/stills/` | 1,036 | 1.0 | Preview stills and contact sheet | `./video.sh stills <p>` |
| `docs/recipes/film/vo/` | 136 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `docs/recipes/film/hf/kit/` | 688 | 0.7 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `docs/recipes/film/hf/kit-data.js`, `docs/recipes/film/hf/theme.css`, `docs/recipes/film/timeline.json` (4 + 96 + 8 KiB) | 108 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `docs/recipes/film/mix.wav`, `docs/recipes/film/music/bed.wav` (5,136 + 5,136 KiB) | 10,272 | 10.0 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `docs/recipes/film/out/embed.html` | 884 | 0.9 | `out/embed.html` self-contained preview page | `./video.sh embed <p>` |
| `projects/example/clips/` | 14,288 | 14.0 | Screen take recorded by record.mjs (pvk films) | `./video.sh record <p>` (re-runs the project's record.mjs against its demo app) |
| `projects/example/vo/` | 116 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/example/film/clip.js`, `projects/example/film/data.js`, `projects/example/film/theme.css`, `projects/example/timeline.json` (8 + 4 + 4 + 8 KiB) | 24 | 0.0 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/example/mix.wav`, `projects/example/music/bed.wav` (4,304 + 4,304 KiB) | 8,608 | 8.4 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `projects/example/out/embed.html` | 5,036 | 4.9 | `out/embed.html` self-contained preview page | `./video.sh embed <p>` |
| `projects/example-hf/frames/` | 12,632 | 12.3 | Rendered frame sequence (JPEG/PNG) | `./video.sh film <p>` (re-renders frames and re-encodes the mp4); `all` does the whole chain |
| `projects/example-hf/vo/` | 56 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/example-hf/hf/kit/` | 3,640 | 3.6 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/example-hf/hf/kit-data.js`, `projects/example-hf/hf/theme.css`, `projects/example-hf/timeline.json` (4 + 96 + 4 KiB) | 104 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/example-hf/mix.wav`, `projects/example-hf/music/bed.wav` (2,108 + 2,108 KiB) | 4,216 | 4.1 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `projects/example-hf/out/embed.html` | 508 | 0.5 | `out/embed.html` self-contained preview page | `./video.sh embed <p>` |
| `projects/layouts-hf/vo/` | 76 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/layouts-hf/hf/kit/` | 688 | 0.7 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/layouts-hf/hf/kit-data.js`, `projects/layouts-hf/hf/theme.css`, `projects/layouts-hf/timeline.json` (4 + 88 + 4 KiB) | 96 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/layouts-hf/mix.wav`, `projects/layouts-hf/music/bed.wav` (3,072 + 3,072 KiB) | 6,144 | 6.0 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `projects/layouts-hf/out/embed.html` | 604 | 0.6 | `out/embed.html` self-contained preview page | `./video.sh embed <p>` |
| `projects/math-hf/vo/` | 56 | 0.1 | Voiceover mp3 per line | `./video.sh audio <p>`; **needs internet** (edge-tts), and a new take may differ slightly from the one in the kept mp4 |
| `projects/math-hf/hf/kit/` | 688 | 0.7 | Copy of tools/*.js + kit.json vendor libs made for a HyperFrames film (`hf/kit/`) | copied again by the next `film` / `all` / `preview` / `embed` (tools/kit_files.mjs `copyKit`) |
| `projects/math-hf/hf/kit-data.js`, `projects/math-hf/hf/theme.css`, `projects/math-hf/timeline.json` (4 + 124 + 4 KiB) | 132 | 0.1 | Generated glue: kit-data.js, theme.css, film/data.js, clip.js, timeline.json | `./video.sh sched <p>` (also run by `film` / `all`) |
| `projects/math-hf/mix.wav`, `projects/math-hf/music/bed.wav` (2,384 + 2,384 KiB) | 4,768 | 4.7 | mix.wav and music/bed.wav (the synthesized bed and the final mix) | `./video.sh audio <p>` |
| `projects/math-hf/out/embed.html` | 1,232 | 1.2 | `out/embed.html` self-contained preview page | `./video.sh embed <p>` |
| **total** | **76,836** | **75.0** |  |  |

Stays in this checkout: 4 files in `projects/*/out/` (mp4/srt/vtt/manifest/webm), 860 KiB.

**Section 1 counted total: 860,920 KiB (840.7 MiB)**, of which 324,672 KiB (317.1 MiB) can go now and 536,248 KiB (523.7 MiB) sits in worktrees with a live 10z session (later tier). By category (counted checkouts): frames 515.5 MiB, stills 6.5 MiB, cache 124.8 MiB, clips 40.8 MiB, vo 1.4 MiB, kit 41.6 MiB, small 1.7 MiB, audio 100.4 MiB, embed 8.1 MiB.

If the owner wants to stay offline-safe, drop the `vo/` rows from the commands: they are the only items whose rebuild needs the network.

## 2. scratch/

Evidence that no open work needs the research copies: `git grep -n "scratch/" -- . ':!docs/archive' ':!vendor'` finds only (a) `.gitignore`, (b) `tools/theme-gallery.mjs` (a default *output* folder, created when run), (c) this plan's Final step, (d) provenance text in docs/plans/phase-10-research/*.md and docs/parity/doodle-shots-motion.md. No tool reads `scratch/`. All Phase 10 checkpoints (10.0, 10a–10k, 10m) are merged into origin/main (section 4); the only unmerged branches are `phase-10z-release` (this release) and `claude/keen-ritchie-d252b5` (one commit adding projects/claude-ad), and neither references scratch/. STATUS.md row 8 removed `scratch/` the same way (approved 2026-11-01).

#### Primary checkout: `scratch/phase10/` (the only content of `scratch/`)

| Exact path | KiB | MiB | Needed by open work? | Verdict / why safe | Rebuilt by |
| --- | --- | --- | --- | --- | --- |
| `scratch/phase10/BRIEF.md` | 4 | 0.0 | no | **removable** — tracked copy exists: docs/plans/phase-10-research/BRIEF.md (differs only in the local path on one line) | tracked copy / not needed |
| `scratch/phase10/doodle-shots-motion.md` | 84 | 0.1 | no | **removable** — byte-identical to tracked docs/plans/phase-10-research/doodle-shots-motion.md | tracked copy / not needed |
| `scratch/phase10/gen` | 76 | 0.1 | no | **removable** — one-off generators (build.py, rows_a.py, rows_b.py, cards.txt) of the docs/parity card tables; the tables are tracked, nothing runs these | tracked copy / not needed |
| `scratch/phase10/gsaptest` | 1,032 | 1.0 | no | **removable** — GSAP seek-test fixtures cited only as provenance in docs/parity/doodle-shots-motion.md; the plugin files are vendored in vendor/gsap/dist/ | tracked copy / not needed |
| `scratch/phase10/higgsfield-workflows.md` | 28 | 0.0 | no | **removable** — byte-identical to tracked docs/plans/phase-10-research/higgsfield-workflows.md | tracked copy / not needed |
| `scratch/phase10/hyperframes.md` | 52 | 0.1 | no | **removable** — byte-identical to tracked docs/plans/phase-10-research/hyperframes.md | tracked copy / not needed |
| `scratch/phase10/manim.md` | 48 | 0.0 | no | **removable** — byte-identical to tracked docs/plans/phase-10-research/manim.md | tracked copy / not needed |
| `scratch/phase10/remotion.md` | 56 | 0.1 | no | **removable** — byte-identical to tracked docs/plans/phase-10-research/remotion.md | tracked copy / not needed |
| `scratch/phase10/src/anidoodle` | 96,024 | 93.8 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/claude-skill-motion-graphics` | 148 | 0.1 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/gsap-npm` | 47,736 | 46.6 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/gsap-skills` | 444 | 0.4 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/hyperframes` | 413,608 | 403.9 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/manim_skill` | 1,792 | 1.8 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/manim-ce-wheel` | 3,088 | 3.0 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/manim-craft` | 10,168 | 9.9 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/manim.whl` | 688 | 0.7 | no | **removable** — upstream research copy (pip wheel) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/manimgl` | 3,688 | 3.6 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/manimgl-172` | 1,060 | 1.0 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/manimgl172.whl` | 228 | 0.2 | no | **removable** — upstream research copy (pip wheel) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/motion-design` | 4,688 | 4.6 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/motion-design-skill` | 244 | 0.2 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/mv-wheel` | 192 | 0.2 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/mv.whl` | 44 | 0.0 | no | **removable** — upstream research copy (pip wheel) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/npmpacks` | 20 | 0.0 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/remotion` | 75,232 | 73.5 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/remotion-try` | 939,760 | 917.7 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/skills` | 3,476 | 3.4 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| `scratch/phase10/src/video-shotcraft` | 98,180 | 95.9 | no | **removable** — upstream research copy (repo checkout / npm pack / install) used for the Phase 10 audits; the findings are in the tracked docs/plans/phase-10-research/*.md and what was adopted lives in tools/ or vendor/ (VENDORED.md names the upstream commits and npm versions) | re-clone / `npm pack` / `pip download` of the upstream named in VENDORED.md (only needed for a future vendor update) |
| **total scratch/phase10 (primary)** | **1,701,888** | **1662.0** |  |  |  |

The primary `scratch/` also holds nothing else (`ls scratch` → `phase10` only), so the command removes `scratch/`'s content, not the ignored folder itself (`rm -rf scratch/phase10`).

#### Worktree phase-10c-themes-3b354d: `scratch/` (117,184 KiB) — **keep for now**, not counted

This worktree now has a live session on `phase-10z-parity-rm-doodle` with uncommitted changes, and its scratch/ holds files of that session (10z-*, exceptions-list.md, rm-rows.txt, dd-rows.txt) next to leftovers of the merged 10c/10g/10j checkpoints. Nothing here is removed by this list; all of it leaves with the worktree later, once that branch is merged and the session is closed (the leftovers are rebuildable or logs, notes below).

| Exact path | KiB | Needed by open work? | Verdict |
| --- | --- | --- | --- |
| `scratch/10c-brief.md` | 8 | no | keep for now; later with the worktree: task brief for a merged checkpoint |
| `scratch/10g-brief-doodle.md` | 8 | no | keep for now; later with the worktree: task brief for a merged checkpoint |
| `scratch/10g-brief-sound.md` | 8 | no | keep for now; later with the worktree: task brief for a merged checkpoint |
| `scratch/10j-brief.md` | 8 | no | keep for now; later with the worktree: task brief for a merged checkpoint |
| `scratch/10z-audit-brief.md` | 4 | no | keep for now; later with the worktree: task brief for a merged checkpoint |
| `scratch/10z-doodle-summary.json` | 8 | no | keep for now; later with the worktree: log / scratch note from a merged checkpoint |
| `scratch/ci-10g.txt` | 4 | no | keep for now; later with the worktree: log / scratch note from a merged checkpoint |
| `scratch/d2film.log` | 8 | no | keep for now; later with the worktree: log / scratch note from a merged checkpoint |
| `scratch/dd-rows.txt` | 4 | no | keep for now; later with the worktree: log / scratch note from a merged checkpoint |
| `scratch/ex-all.log` | 4 | no | keep for now; later with the worktree: log / scratch note from a merged checkpoint |
| `scratch/exceptions-list.md` | 112 | no | keep for now; later with the worktree: log / scratch note from a merged checkpoint |
| `scratch/orig` | 40 | no | keep for now; later with the worktree: copies of three pre-change files kept for a diff in 10c; 10c merged |
| `scratch/qa-after.txt` | 4 | no | keep for now; later with the worktree: log / scratch note from a merged checkpoint |
| `scratch/qa-before.txt` | 4 | no | keep for now; later with the worktree: log / scratch note from a merged checkpoint |
| `scratch/qa-new.py` | 12 | no | keep for now; later with the worktree: log / scratch note from a merged checkpoint |
| `scratch/rm-demo` | 92,376 | no | keep for now; later with the worktree: Remotion demo film output from the 10j run; 10j merged; rebuild: `./video.sh new` + build |
| `scratch/rm-rows.txt` | 8 | no | keep for now; later with the worktree: log / scratch note from a merged checkpoint |
| `scratch/sc.log` | 4 | no | keep for now; later with the worktree: log / scratch note from a merged checkpoint |
| `scratch/tg-all.log` | 4 | no | keep for now; later with the worktree: theme-gallery research renders; the kept sheet is docs/playbook/theme-gallery.jpg; rebuild: `node tools/theme-gallery.mjs` |
| `scratch/tg-*/` (9 folders) | 24,556 | no | keep for now; later with the worktree: theme-gallery research renders; the kept sheet is docs/playbook/theme-gallery.jpg; rebuild: `node tools/theme-gallery.mjs` |

#### Worktree phase-10d-workflow-cf40d2 (this release worktree): `scratch/` (172 KiB) — **keep**

Logs and helper files of the 10z agents running right now (`scratch/audio-example.log`, `scratch/audio-layouts-hf.log`, `scratch/audio-math-hf.log`, `scratch/film.log`, `scratch/fresh-build.out`, `scratch/fresh-build.sh`, `scratch/lint.mjs`, `scratch/player.js`, `scratch/prev.log`, `scratch/qa.log`, `scratch/sc.log`, `scratch/st.log`, `scratch/studio.log`, `scratch/t.html`). Open work (10z) uses them; revisit after 10z reports done (then removable, 172 KiB). Not counted.

Other worktrees with a `scratch/`: none (checked every checkout).

## 3. Agent worktrees

Rule: removable only if the branch is merged into origin/main (`git merge-base --is-ancestor <head> origin/main`; origin/main = fa923a7, last fetch 2026-11-12 09:32 UTC) **and** `git status --short` is empty. `git worktree remove` refuses a dirty tree, so the command is also its own safety net. No worktree is locked or prunable. `git stash list` is empty.

| Worktree path | Branch | HEAD / last commit | Merged into origin/main | Uncommitted | Live Claude session in it | KiB (du -sk) | MiB | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `(primary) .` | `main` | fa923a7 2026-11-12 Merge Phase 10f: HyperFrames blocks | yes | no | **yes** | 4,347,088 | 4245.2 | **PRIMARY** — primary checkout (branch main); never removed |
| `SCRATCHPAD:…/3e51ce39-9d02-43ba-bb2f-985ccfdab43c/scratchpad/base` | detached | 97f4287 2026-11-12 Phase 10 plan: 10z ends with push + cleanup of all usel | yes | no | no | 403,176 | 393.7 | **REMOVE** — branch merged into origin/main and the worktree is clean |
| `.claude/worktrees/gifted-margulis-9da150` | `phase-9d-connectors` | b6b354d 2026-11-03 Merge remote-tracking branch 'origin/main' into phase-9 | yes | no | no | 50,848 | 49.7 | **REMOVE** — branch merged into origin/main and the worktree is clean |
| `.claude/worktrees/keen-ritchie-d252b5` | `claude/keen-ritchie-d252b5` | fd7fa23 2026-11-04 Add claude-ad: 10 s music-only Claude ad, 1280x720 H.26 | **no** (1 ahead) | no | no | 48,248 | 47.1 | **KEEP** — branch claude/keen-ritchie-d252b5 has 1 commit(s) not in origin/main (unmerged work) |
| `.claude/worktrees/phase-10a-hf-engine-c16edb` | `phase-10z-parity-hf` | fa923a7 2026-11-12 Merge Phase 10f: HyperFrames blocks | yes | no | **yes** | 728,072 | 711.0 | **LATER** — merged and clean *right now*, but a live Claude session is working on the new branch `phase-10z-parity-hf` here (the worktree was switched from its Phase 10 branch to a 10z branch while this list was being prepared). Removable only after that branch is merged into origin/main and the session is closed |
| `.claude/worktrees/phase-10b-runtimes-265269` | `phase-10z-parity-manim-motion` | fa923a7 2026-11-12 Merge Phase 10f: HyperFrames blocks | yes | yes (1) | **yes** | 673,348 | 657.6 | **KEEP** — contains `.venv-manim/` (344 MB), the owner's Manim install (resolved as `<checkout>/.venv-manim` by tools/manim.mjs); removing the worktree would delete it |
| `.claude/worktrees/phase-10c-themes-3b354d` | `phase-10z-parity-rm-doodle` | fa923a7 2026-11-12 Merge Phase 10f: HyperFrames blocks | yes | yes (1) | **yes** | 388,044 | 378.9 | **KEEP** — uncommitted changes |
| `.claude/worktrees/phase-10d-workflow-cf40d2` | `phase-10z-release` | 681f973 2026-11-12 parity: owner ruling 2026-11-12 — groups 1-9 are approv | **no** (10 ahead) | no; untracked: ?? docs/plans/phase-10z-cleanup-list.md ?? projects/skill-e2e/ | **yes** | 167,040 | 163.1 | **KEEP** — the worktree this release work runs in (branch phase-10z-release, not merged into origin/main yet) |
| **total removable now** |  |  |  |  |  | **454,024** | **443.4** | 2 worktrees |
| **total removable later** |  |  |  |  |  | **728,072** | **711.0** | 1 worktrees (LATER) |

Live sessions (found with `lsof -d cwd`): `(primary) .`, `.claude/worktrees/phase-10a-hf-engine-c16edb`, `.claude/worktrees/phase-10b-runtimes-265269`, `.claude/worktrees/phase-10c-themes-3b354d`, `.claude/worktrees/phase-10d-workflow-cf40d2`. A LATER worktree is removed only after its session is closed, otherwise that session is left in a deleted folder. Things that exist **only** inside a worktree to be removed (now or later) and disappear with it:

- `SCRATCHPAD:…/3e51ce39-9d02-43ba-bb2f-985ccfdab43c/scratchpad/base`: no out/ deliverable that lacks a copy in the primary.
- `.claude/worktrees/gifted-margulis-9da150`: no out/ deliverable that lacks a copy in the primary; ignored `.superpowers/` working files (20 KiB, e.g. the Phase 9d working plan, which is done and merged).
- `.claude/worktrees/phase-10a-hf-engine-c16edb`: deliverables in out/ with no copy in the primary checkout: `projects/blocks-hf/out/blocks-hf.manifest.json`, `projects/blocks-hf/out/blocks-hf.mp4`, `projects/blocks-hf/out/blocks-hf.srt`, `projects/blocks-hf/out/blocks-hf.vtt`, `projects/engine-hf/out/engine-hf.manifest.json`, `projects/engine-hf/out/engine-hf.mp4`, `projects/engine-hf/out/engine-hf.srt`, `projects/engine-hf/out/engine-hf.vtt`, `projects/engine-hf/out/engine-hf.webm` (3,704 KiB; rebuilt by the release's fresh-clone build of the Phase 10 demo films, or copy them first).

`git worktree remove` does not delete the branches; they are listed in section 4. The detached worktree under /private/tmp/claude-501/…/scratchpad/base belongs to an earlier agent session's scratchpad (HEAD 97f4287 is an ancestor of origin/main); it is listed because `git worktree list` shows it and it is 403 MB, mostly a second node_modules (136 MB) and two built films.

## 4. Branches (list only)

Listing only. Deleting any branch needs a separate owner "yes" (local `git branch -d`, remote `git push origin --delete`); nothing in this document deletes a branch. Merged = tip is an ancestor of origin/main. 38 local, 29 remote (excluding origin/main and origin/HEAD) branches.

#### Local branches

| Branch | Tip | Date | Merged into origin/main | Upstream (ahead of it) | Checked out in | Note |
| --- | --- | --- | --- | --- | --- | --- |
| `claude/gifted-margulis-9da150` | ca0ecc4 | 2026-11-03 | yes | none |  | no upstream (local only) |
| `claude/keen-ritchie-d252b5` | fd7fa23 | 2026-11-04 | **no** (1 ahead of origin/main) | none | `.claude/worktrees/keen-ritchie-d252b5` | no upstream (local only) |
| `claude/phase-10b-runtimes-265269` | c8b0470 | 2026-11-06 | yes | none |  | no upstream (local only) |
| `claude/phase-10c-themes-3b354d` | 001fcf2 | 2026-11-08 | yes | `origin/phase-10c-themes` |  |  |
| `claude/phase-10d-workflow-cf40d2` | c8b0470 | 2026-11-06 | yes | none |  | no upstream (local only) |
| `main` | fa923a7 | 2026-11-12 | yes | `origin/main` | `(primary) .` | keep |
| `phase-1-foundation` | 5352fc9 | 2026-10-30 | yes | `origin/phase-1-foundation` |  |  |
| `phase-10-plan` | 8b088d0 | 2026-11-05 | yes | `origin/phase-10-plan` (+1) |  | 1 commit(s) not on origin/phase-10-plan |
| `phase-10-theme-brief` | 97835ab | 2026-11-09 | yes | `origin/phase-10-theme-brief` |  |  |
| `phase-10.0-rails` | b94403e | 2026-11-06 | yes | `origin/phase-10.0-rails` |  |  |
| `phase-10a-hf-engine` | aae3b9b | 2026-11-09 | yes | `origin/phase-10a-hf-engine` |  |  |
| `phase-10b-runtimes` | 10ee52e | 2026-11-08 | yes | `origin/phase-10b-runtimes` |  |  |
| `phase-10d-workflow` | f00e970 | 2026-11-08 | yes | `origin/phase-10d-workflow` |  |  |
| `phase-10e-motion` | baf95d6 | 2026-11-09 | yes | `origin/phase-10e-motion` |  |  |
| `phase-10f-blocks` | a97a3de | 2026-11-12 | yes | `origin/phase-10f-blocks` |  |  |
| `phase-10g-doodle-sound` | 287e560 | 2026-11-10 | yes | `origin/phase-10g-doodle-sound` |  |  |
| `phase-10h-math` | 0b191b9 | 2026-11-10 | yes | `origin/phase-10h-math` |  |  |
| `phase-10i-manim` | 818e1ac | 2026-11-12 | yes | `origin/phase-10i-manim` |  |  |
| `phase-10j-remotion` | 0b7d3d2 | 2026-11-12 | yes | `origin/phase-10j-remotion` |  |  |
| `phase-10k-studio` | d84d847 | 2026-11-12 | yes | `origin/phase-10k-studio` |  |  |
| `phase-10m-lint` | 81ceda1 | 2026-11-09 | yes | `origin/phase-10m-lint` |  |  |
| `phase-10z-parity-hf` | fa923a7 | 2026-11-12 | yes | `origin/main` | `.claude/worktrees/phase-10a-hf-engine-c16edb` | live 10z session branch;  |
| `phase-10z-parity-manim-motion` | fa923a7 | 2026-11-12 | yes | `origin/main` | `.claude/worktrees/phase-10b-runtimes-265269` | live 10z session branch;  |
| `phase-10z-parity-rm-doodle` | fa923a7 | 2026-11-12 | yes | `origin/main` | `.claude/worktrees/phase-10c-themes-3b354d` | live 10z session branch;  |
| `phase-10z-release` | 681f973 | 2026-11-12 | **no** (10 ahead of origin/main) | `origin/main` (+10) | `.claude/worktrees/phase-10d-workflow-cf40d2` | 10 commit(s) not on origin/main |
| `phase-2-hyperframes` | 83bb612 | 2026-10-31 | yes | `origin/phase-2-hyperframes` |  |  |
| `phase-3-design` | 25e54c6 | 2026-10-31 | yes | `origin/phase-3-design` |  |  |
| `phase-4-captions-audio-qa` | 95956d7 | 2026-11-01 | yes | `origin/phase-4-captions-audio-qa` |  |  |
| `phase-5-preview-speed` | 69aead9 | 2026-11-01 | yes | `origin/phase-5-preview-speed` |  |  |
| `phase-6-url-reference` | 0306512 | 2026-11-01 | yes | `origin/phase-6-url-reference` |  |  |
| `phase-7-cloud` | d0468aa | 2026-11-01 | yes | `origin/phase-7-cloud` |  |  |
| `phase-8-release` | 69dc945 | 2026-11-01 | yes | `origin/phase-8-release` |  |  |
| `phase-9-plan` | 3f43335 | 2026-11-02 | yes | none |  | no upstream (local only) |
| `phase-9a-motion` | 3a276c4 | 2026-11-03 | yes | `origin/phase-9a-motion` |  |  |
| `phase-9b-shots-doodle` | 8b34d82 | 2026-11-03 | yes | `origin/phase-9b-shots-doodle` |  |  |
| `phase-9c-math-beats` | b1099b0 | 2026-11-03 | yes | `origin/phase-9c-math-beats` |  |  |
| `phase-9d-connectors` | b6b354d | 2026-11-03 | yes | `origin/phase-9d-connectors` | `.claude/worktrees/gifted-margulis-9da150` |  |
| `phase-9e-release` | a8ebd59 | 2026-11-03 | yes | `origin/phase-9e-release` |  |  |

#### Remote branches (origin)

| Branch | Tip | Date | Merged into origin/main | Local twin |
| --- | --- | --- | --- | --- |
| `origin/main` | fa923a7 | 2026-11-12 | yes | `main` |
| `origin/phase-1-foundation` | 5352fc9 | 2026-10-30 | yes | `phase-1-foundation` |
| `origin/phase-10-plan` | adec977 | 2026-11-05 | yes | `phase-10-plan` |
| `origin/phase-10-theme-brief` | 97835ab | 2026-11-09 | yes | `phase-10-theme-brief` |
| `origin/phase-10.0-rails` | b94403e | 2026-11-06 | yes | `phase-10.0-rails` |
| `origin/phase-10a-hf-engine` | aae3b9b | 2026-11-09 | yes | `phase-10a-hf-engine` |
| `origin/phase-10b-runtimes` | 10ee52e | 2026-11-08 | yes | `phase-10b-runtimes` |
| `origin/phase-10c-themes` | 001fcf2 | 2026-11-08 | yes | `claude/phase-10c-themes-3b354d` |
| `origin/phase-10d-workflow` | f00e970 | 2026-11-08 | yes | `phase-10d-workflow` |
| `origin/phase-10e-motion` | baf95d6 | 2026-11-09 | yes | `phase-10e-motion` |
| `origin/phase-10f-blocks` | a97a3de | 2026-11-12 | yes | `phase-10f-blocks` |
| `origin/phase-10g-doodle-sound` | 287e560 | 2026-11-10 | yes | `phase-10g-doodle-sound` |
| `origin/phase-10h-math` | 0b191b9 | 2026-11-10 | yes | `phase-10h-math` |
| `origin/phase-10i-manim` | 818e1ac | 2026-11-12 | yes | `phase-10i-manim` |
| `origin/phase-10j-remotion` | 0b7d3d2 | 2026-11-12 | yes | `phase-10j-remotion` |
| `origin/phase-10k-studio` | d84d847 | 2026-11-12 | yes | `phase-10k-studio` |
| `origin/phase-10m-lint` | 81ceda1 | 2026-11-09 | yes | `phase-10m-lint` |
| `origin/phase-2-hyperframes` | 83bb612 | 2026-10-31 | yes | `phase-2-hyperframes` |
| `origin/phase-3-design` | 25e54c6 | 2026-10-31 | yes | `phase-3-design` |
| `origin/phase-4-captions-audio-qa` | 95956d7 | 2026-11-01 | yes | `phase-4-captions-audio-qa` |
| `origin/phase-5-preview-speed` | 69aead9 | 2026-11-01 | yes | `phase-5-preview-speed` |
| `origin/phase-6-url-reference` | 0306512 | 2026-11-01 | yes | `phase-6-url-reference` |
| `origin/phase-7-cloud` | d0468aa | 2026-11-01 | yes | `phase-7-cloud` |
| `origin/phase-8-release` | 69dc945 | 2026-11-01 | yes | `phase-8-release` |
| `origin/phase-9a-motion` | 3a276c4 | 2026-11-03 | yes | `phase-9a-motion` |
| `origin/phase-9b-shots-doodle` | 8b34d82 | 2026-11-03 | yes | `phase-9b-shots-doodle` |
| `origin/phase-9c-math-beats` | b1099b0 | 2026-11-03 | yes | `phase-9c-math-beats` |
| `origin/phase-9d-connectors` | b6b354d | 2026-11-03 | yes | `phase-9d-connectors` |
| `origin/phase-9e-release` | a8ebd59 | 2026-11-03 | yes | `phase-9e-release` |

Unmerged: local `claude/keen-ritchie-d252b5`, `phase-10z-release`; remote none. Merged but with a commit its remote lacks: `phase-10-plan` (+1, already in origin/main). Unmerged and unpushed: `phase-10z-release` (+10 ahead of `origin/main`). `phase-10z-parity-*` are the live 10z session branches (at origin/main, no commits yet when read). Local-only merged branches: `claude/gifted-margulis-9da150`, `claude/phase-10b-runtimes-265269`, `claude/phase-10d-workflow-cf40d2`, `phase-9-plan`.

## 5. Vendored files nothing imports and nothing reads

**Method.** The script (Appendix A, `node vendor-trace.mjs <repo root>`, read-only; 1308 tracked files under vendor/) decides, for every file, USED with the rule that proves it or UNUSED because no rule reaches it. Rules, first hit wins:

| Rule | Proves "used" because |
|---|---|
| R0 | licence/provenance text (LICENSE*, NOTICE*, THIRD_PARTY.md, VENDORED.md, CREDITS.md, OFL*): kept by licence terms and the CI `licenses` job (ci.yml checks vendor/hyperframes/LICENSE, VENDORED.md, CREDITS.md) |
| R1 | the lib has `vendor/<lib>/kit.json`: `tools/kit_files.mjs` `copyKit` does `fs.cpSync(vendor/<lib>, hf/kit/<lib>, {recursive})`, so the whole folder is copied into every HyperFrames film (anime, d3, flubber, gsap, katex, lottie, mathjax, paths, three, three-r147, topojson-client, us-atlas, world-atlas) |
| R2 | directory reads: `registry/components/**` (tools/commands/add.mjs `readdirSync(components)` then `registry-item.json` and its `files[0]`), `registry/blocks/<name>/**` of every block that `index.json` marks supported (tools/blocks.mjs `installBlock` copies `walk(src)`, the whole folder), `CATALOG.md`/`UNSUPPORTED.md`/`index.json` (written and read by blocks.mjs) |
| R3 | the six `file:` packages in package.json (`@hyperframes/core engine lint parsers producer studio-server`): static import graph from each package's `main`/`module`/`bin`/`exports` targets (wildcards expanded) and from every non-vendor tracked file naming `@hyperframes/<pkg>[/sub]` or `vendor/hyperframes/<pkg>/<path>`; follows `from`, `import()`, `require()`, `new URL(…, import.meta.url)`, any `"./x"`/`"../x"` string, and any string literal that names an existing file of the same package (sibling `readFileSync`) |
| R4 | path or non-generic basename of the file appears in a **code** file outside vendor/ (tools/ bin/ python/ templates/ projects/ cloud/ .github/ .claude/ setup.\* video.sh package.json): hf-player's player script (embed.mjs, studio.html), producer's `hyperframe.runtime.iife.js` (embed.mjs), the four ui-ux-pro-max csv files (theme-brief.mjs) |
| R5 | mentioned only in docs (\*.md, docs/): reported "unprovable", never removed. (No file landed here.) |
| DYN | an unreached file below a directory that reached code enumerates relative to `__dirname`/`import.meta.url` (`readdir`, `glob`, non-literal `import()`/`require()`): "unprovable", never removed. The scan found 0 such sites: every `readdirSync` in the packages reads a user project, frame, cache or temp dir; producer locates only the named siblings (`hyperframe.manifest.json`, `shaderTransitionWorker.js`, `healthWorkerThread.js`, `hyperframe.runtime.iife.js`) and its own package.json. |

Result of the run (1308 files, 26,216,522 bytes):

| Outcome | Files | Bytes |
| --- | --- | --- |
| R0 | 60 | 191,004 |
| R1 | 74 | 7,026,253 |
| R2 | 775 | 9,135,821 |
| R3 file name named in a string literal of a reached file | 201 | 1,916,199 |
| R3 package entry / exports map | 164 | 6,765,266 |
| R3 path/import from outside vendor/ | 1 | 33,861 |
| R4 | 6 | 986,877 |
| UNUSED | 27 | 161,241 |

Honesty notes on the evidence: R3's "file name named in a string literal" tier is deliberately generous (e.g. `core/README.md` stays only because `audioFxCopy.js` contains the text "README.md"), so it can keep a file that is really dead but never removes a live one. The trace is static: it cannot see a path built at run time out of pieces, which is why nothing is removed on a "probably". For comparison, STATUS.md row 8 left "144 files, 4.3 MB" of vendored JS "never imported by a render" in place because some are read as text; the trace shows why: almost all of that is read (kit.json folders copied wholesale, registry folders read by directory, package entry points) and only the 27 files below are provably dead.

#### Removable: proven unused (27 files, 161,241 bytes apparent, 224 KiB by `du -sk`)

| Exact path (tracked) | Files | Bytes | KiB (du -sk) | Why unused (what was checked) | Rebuilt by |
| --- | --- | --- | --- | --- | --- |
| `vendor/hyperframes/core/dist/audio/audioFxAutomation.js` | 1 | 9,434 | 12 | no importer anywhere (neither the exports map nor index.js reaches it) | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/core/dist/audio/audioFxGraph.js` | 1 | 28,796 | 32 | no importer anywhere (only audioFxWorklets, itself unreached) | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/core/dist/audio/audioFxWorklets.js` | 1 | 16,235 | 16 | imported only by audioFxGraph.js, which is unreached | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/core/dist/fonts/sfntFixture.js` | 1 | 3,806 | 4 | test fixture, no importer | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/core/dist/htmlInCanvasDefects.js` | 1 | 10,062 | 12 | no importer anywhere | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/core/dist/inline-scripts/pickerApi.js` | 1 | 11 | 4 | 11-byte stub (`export {};`), no importer | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/core/dist/runtime/clock.js` | 1 | 8,910 | 12 | no importer; the in-browser runtime ships pre-bundled as hyperframe.runtime.iife.js | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/core/dist/vfx/refs` | 5 | 11,029 | 20 | reference JS implementations of the shader effects; vfx.js imports the sibling `*.frag.js` files, nothing imports `refs/` | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/core/docs` | 6 | 53,788 | 64 | upstream package docs (core's package.json `files` lists `docs`); no code, tool or doc reads or names them (`quickstart-template`, `common-mistakes`, `core_notes` appear nowhere else in the tree) | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/engine/README.md` | 1 | 2,909 | 4 | upstream package README; not read, not linked from this repo | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/engine/dist/services/__fixtures__` | 2 | 1,928 | 8 | test fixtures (jpeg, loopback), no importer | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/engine/dist/services/audioMixer.types.js` | 1 | 11 | 4 | 11-byte types stub, no importer | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/engine/dist/services/chunkEncoder.types.js` | 1 | 11 | 4 | 11-byte types stub, no importer | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/engine/dist/services/webglRelease.js` | 1 | 1,661 | 4 | no importer anywhere | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/engine/dist/types.js` | 1 | 11 | 4 | 11-byte types stub, no importer | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/engine/dist/utils/parityContract.js` | 1 | 88 | 4 | no importer (index.js re-exports core's own inline-scripts/parityContract.js, a different file) | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| `vendor/hyperframes/producer/README.md` | 1 | 12,551 | 16 | upstream package README; not read, not linked from this repo | restored from git history or by re-unpacking the upstream npm tarball (VENDORED.md → Updating) |
| **total** | 27 | 161,241 | **224** |  |  |

These are **tracked** files: removing them is a normal commit (`git rm` equivalent), not a disk-only cleanup, and VENDORED.md ("What we took" / "Left out") needs one line saying they were dropped. History keeps them, so `.git` does not shrink. The fresh clone gets ~157 KiB smaller.

#### Keep: cannot be proven unused (and why)

| What | Files | Kept by rule |
| --- | --- | --- |
| every file of the 13 kit.json libs (three 2.3 MB, mathjax 2.2 MB, three-r147, katex, lottie, d3, gsap, anime, us-atlas, world-atlas, paths, flubber, topojson-client) | 74 | R1: copied wholesale into every HyperFrames film's hf/kit/. Some files inside may never be loaded by a given film, but the copy is by folder, so none can be proven dead |
| vendor/hyperframes/registry/components/** and registry/blocks/** (238 components, supported blocks + their assets) | 775 | R2: read by directory / walked whole by `add`; `reelwright add --list` and `add <name>` can reach any of them |
| vendor/hyperframes/{core,engine,lint,parsers,producer,studio-server}: files reached by the import graph | 366 | R3: package entry points, exports map, static imports, sibling-file strings |
| hf-player player script; producer `hyperframe.runtime.iife.js`; ui-ux-pro-max `*.csv` | 6 | R4: named in tools/commands/embed.mjs, tools/studio/studio.html, tools/commands/theme-brief.mjs |
| LICENSE / NOTICE / THIRD_PARTY.md / VENDORED.md / CREDITS.md / OFL texts | 60 | R0: licence terms (Apache-2.0 §4, MIT, OFL) and the CI `licenses` job |
| `vendor/hyperframes/core/dist/hyperframe.runtime.iife.js` and `producer/dist/hyperframe.runtime.iife.js` (identical 627,303-byte duplicates) | 2 | both are reached (core exports map; producer reads its sibling); HyperFrames verifies a runtime checksum, so neither is dropped |


## 6. Stale root copies and other tracked files

Method: Appendix B (`unref-tracked.mjs`) lists every tracked file outside vendor/, fonts/, projects/, docs/samples and docs/recipes whose path or non-generic basename appears in no other tracked text file. It returns 29 files; each was then checked by hand. **None is proven unused**, so nothing is listed as removable.

| Candidate (zero textual references) | Bytes | Verdict | Proof it is used (or why it is kept) |
| --- | --- | --- | --- |
| `themes/clean.css`, `coral.css`, `neon.css`, `retro.css`, `swiss.css` | 6,259 | keep | themes are discovered by directory (`tools/theme.mjs` line 22 `themes = () => fs.readdirSync(THEMES)…`, used by `./video.sh themes` and the `--style` check) and selected by name from project.json `"style"`; no string names them |
| `tools/selfcheck/motion/{math2,path,plot2}.mjs`, `tools/selfcheck/rails.mjs`, `tools/selfcheck/taste/{bad,good}/index.html` | 29,111 | keep | fixtures read by directory: tools/selfcheck/motion.mjs `FIX = tools/selfcheck/motion`, taste self-check; rails.mjs is a self-check run by CI's glob `for f in tools/selfcheck/*.mjs` (.github/workflows/ci.yml, step "Self-checks") |
| `tools/from_url/index.html` | 1,268 | keep | `tools/from_url.mjs` line 102 copies `["index.html","film.js"]` from `tools/from_url/` (built with a variable, so the full path never appears) |
| `templates/remotion/{README.md,package.json,src/index.js}` | 3,029 | keep | `bin/reelwright.mjs` line 109 `cpSync(path.join("templates","remotion"), …/rm)` copies the folder for `new --renderer remotion` |
| `docs/index.html`, `docs/.nojekyll` | 4,099 | keep | GitHub Pages sample gallery (README links https://nexace.github.io/reelwright/); served, not referenced |
| `.graphifyignore` | 8 | keep | read by graphify (the owner's standing code map), not by repo code |
| `docs/parity/doodle-shots-motion.md`, `higgsfield-workflows.md`; `docs/plans/phase-10-research/BRIEF.md`; `docs/playbook/README.md`, `claude-workflow.md` | 95,583 | keep | Phase 10 parity/research documents and playbook pages: documentation deliverables of this release (no code reads them, none is duplicated elsewhere), so they are kept |
| `docs/archive/plans/phase-9-research/*`, `phase-9-start-prompt.md` | 39,710 | keep | docs/archive is kept unless clearly duplicated; the Phase 9 files have no duplicate in the tree (`scratch/` has none of them either) |

Other checks, all negative: no stale root copy exists (root holds only AGENTS.md, CLAUDE.md, CONTRIBUTING.md, LICENSE, NOTICE, README.md, THIRD_PARTY.md, package.json, requirements.txt, setup.mjs/.sh, video.sh, .puppeteerrc.cjs and dotfiles, each referenced: setup.\* from README, requirements.txt by setup, .puppeteerrc.cjs by vendor/hyperframes/VENDORED.md). A blob-hash scan of all tracked files over 20 KB finds only duplicates that are used: the two runtime iife files (above), identical Inter/JetBrains Mono woff2 files shipped inside block folders and `projects/blocks-hf/hf/compositions/*/fonts/` (copies made by `reelwright add` and read by that project), and `registry/blocks/chatgpt-exchange` vs `claude-exchange` font files (each block folder is installed on its own, so both must stay complete). docs/archive items: keep.

## 7. Kept on purpose

| Path | KiB | MiB | Verdict |
| --- | --- | --- | --- |
| `(primary) ./node_modules/` | 135,224 | 132.1 | keep (rebuilt by `npm install` / `./setup.sh`); not in the list |
| `SCRATCHPAD:…/3e51ce39-9d02-43ba-bb2f-985ccfdab43c/scratchpad/base/node_modules/` | 136,440 | 133.2 | keep as an item (rebuilt by `npm install`); it leaves only with its worktree (§3), already inside that figure |
| `.claude/worktrees/phase-10a-hf-engine-c16edb/node_modules/` | 136,180 | 133.0 | keep as an item (rebuilt by `npm install`); it leaves only with its worktree (§3), already inside that figure |

**Other ignored items that are deliberately not listed:**

| Path | KiB | Verdict |
| --- | --- | --- |
| `.claude/worktrees/phase-10b-runtimes-265269/.venv-manim/` | 344,496 | **keep — owner's Manim install** (never listed as removable) |
| `graphify-out/` (primary) | 4,016 | keep — the owner's standing graphify map (global CLAUDE.md); rebuilt by `/graphify --update` |
| `package-lock.json` (primary and worktrees) | 76 each | keep — ignored by design, produced by `npm install` |
| `.superpowers/` (primary 56, gifted 20, 10d 28) | 104 | primary's holds Phase 9e task files, 10d's holds the live 10z reports; subagent working files, tiny; not listed |
| `.git/` of the primary | 44,192 | git history — never touched (pack 39.7 MiB) |
| `projects/skill-e2e/` in 10d | 24,248 | untracked leftover, told to ignore; never committed or listed |

## 8. Grand total and the commands that WOULD run

| § | What | Items | KiB | MiB |
| --- | --- | --- | --- | --- |
| 1 now | generated film output: primary + keen-ritchie | 55 paths | 324,672 | 317.1 |
| 1 later | generated film output: worktrees 10b, 10c and 10d (live sessions) | 110 paths | 536,248 | 523.7 |
| 2 | `scratch/phase10` in the primary | 29 entries | 1,701,888 | 1662.0 |
| 3 now | 2 merged, clean, idle agent worktrees (whole directories) | 2 worktrees | 454,024 | 443.4 |
| 3 later | 1 merged-today worktrees that a live session is using on a new 10z branch (whole directories; remove after those branches merge) | 1 worktrees | 728,072 | 711.0 |
| 4 | branches | list only | 0 | 0.0 |
| 5 | vendored files proven unused | 27 files | 224 | 0.2 |
| 6 | other tracked files | none proven | 0 | 0.0 |
| 7 | node_modules, .venv-manim, graphify-out, .git | keep | 0 | 0.0 |
| **now** | **freed by the commands that can run today** (§1 primary + keen-ritchie, §2, §3 now, §5) |  | **2,480,808** | **2422.7** (2.37 GiB) |
| **later** | **freed after the live 10z sessions close** (§1 10b + 10c + 10d, §3 later) |  | **1,264,320** | **1234.7** |
| **all** | **grand total that would be freed** |  | **3,745,128** | **3657.4** (3.57 GiB) |


**NOT RUN — needs the owner's yes.**

```sh
# NOT RUN — needs the owner's yes. Every path was read from the checkouts above; nothing here has been executed.
P="/Users/amogh_khairate/Documents/Default Project/reelwright"
W="$P/.claude/worktrees"

# --- before anything: re-run the checks of section 3 (git worktree list; git -C <wt> status --short; lsof -d cwd | grep claude): the live 10z sessions change these.

# --- step 1 (section 3, now): remove merged, clean, idle worktrees. Refuses a dirty tree; does not delete the branches.
git -C "$P" worktree remove "/private/tmp/claude-501/-Users-amogh-khairate-Documents-Default-Project-reelwright--claude-worktrees-phase-10a-hf-engine-c16edb/3e51ce39-9d02-43ba-bb2f-985ccfdab43c/scratchpad/base"
git -C "$P" worktree remove "$W/gifted-margulis-9da150"
git -C "$P" worktree list    # expect: primary, 10a, 10b, 10c, 10d, keen-ritchie

# --- step 2 (section 2): research copies
rm -rf "$P/scratch/phase10"

# --- step 3, primary checkout (section 1): 50 generated paths, 323,888 KiB; the mp4/srt/vtt/manifest in out/ are not in this list
rm -rf \
  "$P/projects/example-hf/frames/" \
  "$P/projects/example-hf/hf/kit-data.js" \
  "$P/projects/example-hf/hf/kit/" \
  "$P/projects/example-hf/hf/theme.css" \
  "$P/projects/example-hf/mix.wav" \
  "$P/projects/example-hf/music/bed.wav" \
  "$P/projects/example-hf/timeline.json" \
  "$P/projects/example-hf/vo/" \
  "$P/projects/example/.cache/" \
  "$P/projects/example/clips/" \
  "$P/projects/example/film/clip.js" \
  "$P/projects/example/film/data.js" \
  "$P/projects/example/film/theme.css" \
  "$P/projects/example/frames/" \
  "$P/projects/example/mix.wav" \
  "$P/projects/example/music/bed.wav" \
  "$P/projects/example/timeline.json" \
  "$P/projects/example/vo/" \
  "$P/projects/layouts-hf/frames/" \
  "$P/projects/layouts-hf/hf/kit-data.js" \
  "$P/projects/layouts-hf/hf/kit/" \
  "$P/projects/layouts-hf/hf/theme.css" \
  "$P/projects/layouts-hf/mix.wav" \
  "$P/projects/layouts-hf/music/bed.wav" \
  "$P/projects/layouts-hf/timeline.json" \
  "$P/projects/layouts-hf/vo/" \
  "$P/projects/math-hf/frames/" \
  "$P/projects/math-hf/hf/kit-data.js" \
  "$P/projects/math-hf/hf/kit/" \
  "$P/projects/math-hf/hf/theme.css" \
  "$P/projects/math-hf/mix.wav" \
  "$P/projects/math-hf/music/bed.wav" \
  "$P/projects/math-hf/timeline.json" \
  "$P/projects/math-hf/vo/" \
  "$P/projects/qa-broken/frames/" \
  "$P/projects/qa-broken/hf/kit-data.js" \
  "$P/projects/qa-broken/hf/kit/" \
  "$P/projects/qa-broken/hf/theme.css" \
  "$P/projects/qa-broken/mix.wav" \
  "$P/projects/qa-broken/music/bed.wav" \
  "$P/projects/qa-broken/timeline.json" \
  "$P/projects/qa-broken/vo/" \
  "$P/projects/shots-hf/frames/" \
  "$P/projects/shots-hf/hf/kit-data.js" \
  "$P/projects/shots-hf/hf/kit/" \
  "$P/projects/shots-hf/hf/theme.css" \
  "$P/projects/shots-hf/mix.wav" \
  "$P/projects/shots-hf/music/bed.wav" \
  "$P/projects/shots-hf/timeline.json" \
  "$P/projects/shots-hf/vo/"

# --- step 4, worktree keen-ritchie-d252b5 (section 1): 5 generated paths, 784 KiB; the mp4/srt/vtt/manifest in out/ are not in this list
rm -rf \
  "$W/keen-ritchie-d252b5/projects/claude-ad/hf/kit-data.js" \
  "$W/keen-ritchie-d252b5/projects/claude-ad/hf/kit/" \
  "$W/keen-ritchie-d252b5/projects/claude-ad/hf/theme.css" \
  "$W/keen-ritchie-d252b5/projects/claude-ad/timeline.json" \
  "$W/keen-ritchie-d252b5/projects/claude-ad/vo/"

# --- step 5 (section 5): tracked vendored files proven unused; then commit them (a normal commit, not a disk-only cleanup) and add the line to vendor/hyperframes/VENDORED.md
cd "$P"   # run in the checkout the release is cut from, after the 0.3.0 tag, on a branch you will push
rm -rf \
  "vendor/hyperframes/core/dist/audio/audioFxAutomation.js" \
  "vendor/hyperframes/core/dist/audio/audioFxGraph.js" \
  "vendor/hyperframes/core/dist/audio/audioFxWorklets.js" \
  "vendor/hyperframes/core/dist/fonts/sfntFixture.js" \
  "vendor/hyperframes/core/dist/htmlInCanvasDefects.js" \
  "vendor/hyperframes/core/dist/inline-scripts/pickerApi.js" \
  "vendor/hyperframes/core/dist/runtime/clock.js" \
  "vendor/hyperframes/core/dist/vfx/refs" \
  "vendor/hyperframes/core/docs" \
  "vendor/hyperframes/engine/README.md" \
  "vendor/hyperframes/engine/dist/services/__fixtures__" \
  "vendor/hyperframes/engine/dist/services/audioMixer.types.js" \
  "vendor/hyperframes/engine/dist/services/chunkEncoder.types.js" \
  "vendor/hyperframes/engine/dist/services/webglRelease.js" \
  "vendor/hyperframes/engine/dist/types.js" \
  "vendor/hyperframes/engine/dist/utils/parityContract.js" \
  "vendor/hyperframes/producer/README.md"
git add -A vendor/hyperframes && git commit -m "vendor: drop 27 files nothing imports or reads (trace in docs/plans/phase-10z-cleanup-list.md)"

# =====================  LATER TIER  =====================
# Only after the live 10z sessions are closed and their branches (phase-10z-*) are merged into origin/main. Re-check first:
#   lsof -d cwd | grep claude ;  git -C <wt> status --short ;  git merge-base --is-ancestor <branch> origin/main

# --- step 6 (section 3, later): worktrees whose branch is merged today but which are in use
git -C "$P" worktree remove "$W/phase-10a-hf-engine-c16edb"

# --- step 7, worktree phase-10b-runtimes-265269 (.venv-manim is NOT touched) (section 1): 37 generated paths, 259,800 KiB; the mp4/srt/vtt/manifest in out/ are not in this list
rm -rf \
  "$W/phase-10b-runtimes-265269/projects/manim-hf/.cache/" \
  "$W/phase-10b-runtimes-265269/projects/manim-hf/frames/" \
  "$W/phase-10b-runtimes-265269/projects/manim-hf/hf/kit-data.js" \
  "$W/phase-10b-runtimes-265269/projects/manim-hf/hf/kit/" \
  "$W/phase-10b-runtimes-265269/projects/manim-hf/hf/theme.css" \
  "$W/phase-10b-runtimes-265269/projects/manim-hf/mix.wav" \
  "$W/phase-10b-runtimes-265269/projects/manim-hf/music/bed.wav" \
  "$W/phase-10b-runtimes-265269/projects/manim-hf/stills/" \
  "$W/phase-10b-runtimes-265269/projects/manim-hf/timeline.json" \
  "$W/phase-10b-runtimes-265269/projects/manim-hf/vo/" \
  "$W/phase-10b-runtimes-265269/projects/math2-hf/frames/" \
  "$W/phase-10b-runtimes-265269/projects/math2-hf/hf/kit-data.js" \
  "$W/phase-10b-runtimes-265269/projects/math2-hf/hf/kit/" \
  "$W/phase-10b-runtimes-265269/projects/math2-hf/hf/theme.css" \
  "$W/phase-10b-runtimes-265269/projects/math2-hf/mix.wav" \
  "$W/phase-10b-runtimes-265269/projects/math2-hf/music/bed.wav" \
  "$W/phase-10b-runtimes-265269/projects/math2-hf/stills/" \
  "$W/phase-10b-runtimes-265269/projects/math2-hf/timeline.json" \
  "$W/phase-10b-runtimes-265269/projects/math2-hf/vo/" \
  "$W/phase-10b-runtimes-265269/projects/motion-hf/frames/" \
  "$W/phase-10b-runtimes-265269/projects/motion-hf/hf/kit-data.js" \
  "$W/phase-10b-runtimes-265269/projects/motion-hf/hf/kit/" \
  "$W/phase-10b-runtimes-265269/projects/motion-hf/hf/theme.css" \
  "$W/phase-10b-runtimes-265269/projects/motion-hf/mix.wav" \
  "$W/phase-10b-runtimes-265269/projects/motion-hf/music/bed.wav" \
  "$W/phase-10b-runtimes-265269/projects/motion-hf/stills/" \
  "$W/phase-10b-runtimes-265269/projects/motion-hf/timeline.json" \
  "$W/phase-10b-runtimes-265269/projects/motion-hf/vo/" \
  "$W/phase-10b-runtimes-265269/projects/runtimes-hf/frames/" \
  "$W/phase-10b-runtimes-265269/projects/runtimes-hf/hf/kit-data.js" \
  "$W/phase-10b-runtimes-265269/projects/runtimes-hf/hf/kit/" \
  "$W/phase-10b-runtimes-265269/projects/runtimes-hf/hf/theme.css" \
  "$W/phase-10b-runtimes-265269/projects/runtimes-hf/mix.wav" \
  "$W/phase-10b-runtimes-265269/projects/runtimes-hf/music/bed.wav" \
  "$W/phase-10b-runtimes-265269/projects/runtimes-hf/stills/" \
  "$W/phase-10b-runtimes-265269/projects/runtimes-hf/timeline.json" \
  "$W/phase-10b-runtimes-265269/projects/runtimes-hf/vo/"

# --- step 8, worktree phase-10c-themes-3b354d (its scratch/ is not in this list) (section 1): 30 generated paths, 199,612 KiB; the mp4/srt/vtt/manifest in out/ are not in this list
rm -rf \
  "$W/phase-10c-themes-3b354d/projects/doodle2-hf/hf/kit-data.js" \
  "$W/phase-10c-themes-3b354d/projects/doodle2-hf/hf/kit/" \
  "$W/phase-10c-themes-3b354d/projects/doodle2-hf/hf/theme.css" \
  "$W/phase-10c-themes-3b354d/projects/doodle2-hf/timeline.json" \
  "$W/phase-10c-themes-3b354d/projects/doodle2-hf/vo/" \
  "$W/phase-10c-themes-3b354d/projects/example-hf/hf/kit-data.js" \
  "$W/phase-10c-themes-3b354d/projects/example-hf/hf/kit/" \
  "$W/phase-10c-themes-3b354d/projects/example-hf/hf/theme.css" \
  "$W/phase-10c-themes-3b354d/projects/example-hf/mix.wav" \
  "$W/phase-10c-themes-3b354d/projects/example-hf/music/bed.wav" \
  "$W/phase-10c-themes-3b354d/projects/example-hf/timeline.json" \
  "$W/phase-10c-themes-3b354d/projects/example-hf/vo/" \
  "$W/phase-10c-themes-3b354d/projects/example/.cache/" \
  "$W/phase-10c-themes-3b354d/projects/example/clips/" \
  "$W/phase-10c-themes-3b354d/projects/example/film/clip.js" \
  "$W/phase-10c-themes-3b354d/projects/example/film/data.js" \
  "$W/phase-10c-themes-3b354d/projects/example/film/theme.css" \
  "$W/phase-10c-themes-3b354d/projects/example/frames/" \
  "$W/phase-10c-themes-3b354d/projects/example/mix.wav" \
  "$W/phase-10c-themes-3b354d/projects/example/music/bed.wav" \
  "$W/phase-10c-themes-3b354d/projects/example/timeline.json" \
  "$W/phase-10c-themes-3b354d/projects/example/vo/" \
  "$W/phase-10c-themes-3b354d/projects/layouts-hf/hf/kit-data.js" \
  "$W/phase-10c-themes-3b354d/projects/layouts-hf/hf/kit/" \
  "$W/phase-10c-themes-3b354d/projects/layouts-hf/hf/theme.css" \
  "$W/phase-10c-themes-3b354d/projects/layouts-hf/mix.wav" \
  "$W/phase-10c-themes-3b354d/projects/layouts-hf/music/bed.wav" \
  "$W/phase-10c-themes-3b354d/projects/layouts-hf/stills/" \
  "$W/phase-10c-themes-3b354d/projects/layouts-hf/timeline.json" \
  "$W/phase-10c-themes-3b354d/projects/layouts-hf/vo/"

# --- step 9, the release worktree phase-10d-workflow-cf40d2, LAST (the 10z agents build films here) (section 1): 43 generated paths, 76,836 KiB; the mp4/srt/vtt/manifest in out/ are not in this list
rm -rf \
  "$W/phase-10d-workflow-cf40d2/docs/recipes/film/hf/kit-data.js" \
  "$W/phase-10d-workflow-cf40d2/docs/recipes/film/hf/kit/" \
  "$W/phase-10d-workflow-cf40d2/docs/recipes/film/hf/theme.css" \
  "$W/phase-10d-workflow-cf40d2/docs/recipes/film/mix.wav" \
  "$W/phase-10d-workflow-cf40d2/docs/recipes/film/music/bed.wav" \
  "$W/phase-10d-workflow-cf40d2/docs/recipes/film/out/embed.html" \
  "$W/phase-10d-workflow-cf40d2/docs/recipes/film/stills/" \
  "$W/phase-10d-workflow-cf40d2/docs/recipes/film/timeline.json" \
  "$W/phase-10d-workflow-cf40d2/docs/recipes/film/vo/" \
  "$W/phase-10d-workflow-cf40d2/projects/example-hf/frames/" \
  "$W/phase-10d-workflow-cf40d2/projects/example-hf/hf/kit-data.js" \
  "$W/phase-10d-workflow-cf40d2/projects/example-hf/hf/kit/" \
  "$W/phase-10d-workflow-cf40d2/projects/example-hf/hf/theme.css" \
  "$W/phase-10d-workflow-cf40d2/projects/example-hf/mix.wav" \
  "$W/phase-10d-workflow-cf40d2/projects/example-hf/music/bed.wav" \
  "$W/phase-10d-workflow-cf40d2/projects/example-hf/out/embed.html" \
  "$W/phase-10d-workflow-cf40d2/projects/example-hf/timeline.json" \
  "$W/phase-10d-workflow-cf40d2/projects/example-hf/vo/" \
  "$W/phase-10d-workflow-cf40d2/projects/example/clips/" \
  "$W/phase-10d-workflow-cf40d2/projects/example/film/clip.js" \
  "$W/phase-10d-workflow-cf40d2/projects/example/film/data.js" \
  "$W/phase-10d-workflow-cf40d2/projects/example/film/theme.css" \
  "$W/phase-10d-workflow-cf40d2/projects/example/mix.wav" \
  "$W/phase-10d-workflow-cf40d2/projects/example/music/bed.wav" \
  "$W/phase-10d-workflow-cf40d2/projects/example/out/embed.html" \
  "$W/phase-10d-workflow-cf40d2/projects/example/timeline.json" \
  "$W/phase-10d-workflow-cf40d2/projects/example/vo/" \
  "$W/phase-10d-workflow-cf40d2/projects/layouts-hf/hf/kit-data.js" \
  "$W/phase-10d-workflow-cf40d2/projects/layouts-hf/hf/kit/" \
  "$W/phase-10d-workflow-cf40d2/projects/layouts-hf/hf/theme.css" \
  "$W/phase-10d-workflow-cf40d2/projects/layouts-hf/mix.wav" \
  "$W/phase-10d-workflow-cf40d2/projects/layouts-hf/music/bed.wav" \
  "$W/phase-10d-workflow-cf40d2/projects/layouts-hf/out/embed.html" \
  "$W/phase-10d-workflow-cf40d2/projects/layouts-hf/timeline.json" \
  "$W/phase-10d-workflow-cf40d2/projects/layouts-hf/vo/" \
  "$W/phase-10d-workflow-cf40d2/projects/math-hf/hf/kit-data.js" \
  "$W/phase-10d-workflow-cf40d2/projects/math-hf/hf/kit/" \
  "$W/phase-10d-workflow-cf40d2/projects/math-hf/hf/theme.css" \
  "$W/phase-10d-workflow-cf40d2/projects/math-hf/mix.wav" \
  "$W/phase-10d-workflow-cf40d2/projects/math-hf/music/bed.wav" \
  "$W/phase-10d-workflow-cf40d2/projects/math-hf/out/embed.html" \
  "$W/phase-10d-workflow-cf40d2/projects/math-hf/timeline.json" \
  "$W/phase-10d-workflow-cf40d2/projects/math-hf/vo/"

# Branches (section 4) are NOT in this block: deleting them needs a separate yes.
```

After the owner's yes, re-measure with `du -sk "$P"` (today 4245.2 MiB, a figure that includes the worktrees nested inside it); the whole list frees about 3657 MiB.

## Appendix A — the vendor import trace (`vendor-trace.mjs`, read-only)

Run: `node vendor-trace.mjs <repo root> --json out.json`. Output of the run recorded above. Source:

```js
// READ-ONLY import trace for vendor/. usage: node vendor-trace.mjs <repo root> [--json out.json]
// For every tracked file under vendor/ it decides USED (with the rule that proves it) or UNUSED (no rule reaches it).
// Anything not provably unused is reported as used or "unprovable"; only UNUSED items are candidates for removal.
//
// Rules, in order (first hit wins):
//  R0  licence/provenance text (LICENSE*, NOTICE*, THIRD_PARTY.md, VENDORED.md, CREDITS.md, OFL*): kept by licence terms / CI `licenses` job
//  R1  the lib has vendor/<lib>/kit.json: tools/kit_files.mjs copies the whole folder into every hyperframes film's hf/kit/ -> USED
//  R2  directory read: registry/components/** (tools/commands/add.mjs readdirSync + registry-item.json), registry/blocks/<name>/** of a
//      block that index.json lists as "supported" (tools/blocks.mjs installBlock walks the whole folder), registry/blocks index/CATALOG/UNSUPPORTED
//  R3  file: dependency packages (package.json "file:vendor/..."): static import graph from the package entry points
//      (main/module/bin/exports) and from every non-vendor tracked file that names @hyperframes/<pkg>[/sub] or vendor/hyperframes/<pkg>/<path>;
//      follows import/export-from/import()/require() literals, new URL("./x", import.meta.url), any "./x" or "../x" string literal,
//      and any string literal naming an existing file's basename in the same package (fs reads of siblings)
//  R4  path or basename mentioned by a CODE file outside the lib (tools/ bin/ python/ templates/ projects/ cloud/ .github/ .claude/ setup.* video.sh package.json)
//  R5  path or basename mentioned only in DOC files (*.md, docs/): reported as "unprovable" (kept), not USED and not UNUSED
// UNUSED = none of R0..R5 hit AND no dynamic read site (non-literal import/require, readdir/glob) in a reached file of the same package
//          sits in the file's directory or an ancestor of it (those make it "unprovable").
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2]);
const jsonOut = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
const git = (...a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8", maxBuffer: 1 << 29 });
const all = git("ls-files", "-z").split("\0").filter(Boolean);
const vend = all.filter((f) => f.startsWith("vendor/"));
const outside = all.filter((f) => !f.startsWith("vendor/"));
const vset = new Set(vend);
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const TEXTISH = /\.(m?js|cjs|json|html?|css|md|py|sh|ya?ml|txt|csv|mjs|cjs|ts|svg)$|^[^.]*$/i;
const isCode = (f) => !/\.md$/i.test(f) && /^(tools|bin|python|templates|projects|cloud|\.github|\.claude)\/|^(setup\.(mjs|sh)|video\.sh|package\.json|requirements\.txt|\.puppeteerrc\.cjs)$/.test(f);

const outText = new Map();
for (const f of outside) {
  if (!TEXTISH.test(f)) continue;
  try { if (fs.statSync(path.join(ROOT, f)).size > 3e6) continue; outText.set(f, read(f)); } catch {}
}
const codeText = [...outText].filter(([f]) => isCode(f));
const docText = [...outText].filter(([f]) => !isCode(f));
const libOf = (f) => f.split("/")[1];
const result = new Map(); // file -> {status, rule, note}
const mark = (f, status, rule, note = "") => { if (!result.has(f)) result.set(f, { status, rule, note }); };

// R0
const LICENCE = /(^|\/)(LICENSE[^/]*|LICENCE[^/]*|NOTICE[^/]*|THIRD_PARTY\.md|VENDORED\.md|CREDITS\.md|OFL[^/]*|[^/]*-LICENSE[^/]*|[^/]*LICENSE\.txt|LICENSE-[^/]*)$/i;
for (const f of vend) if (LICENCE.test(f)) mark(f, "used", "R0", "licence/provenance text");

// R1
const kitLibs = new Set(vend.filter((f) => /^vendor\/[^/]+\/kit\.json$/.test(f)).map(libOf));
for (const f of vend) if (kitLibs.has(libOf(f))) mark(f, "used", "R1", "vendor/" + libOf(f) + "/kit.json: copied wholesale by tools/kit_files.mjs");

// R2 registry
const REG = "vendor/hyperframes/registry/";
const addCode = outText.get("tools/commands/add.mjs") || "";
const blocksCode = outText.get("tools/blocks.mjs") || "";
const readsComponents = /readdirSync\(\s*comps\s*\)/.test(addCode) && /registry["']\s*\)/.test(addCode);
const installWalks = /function installBlock[\s\S]{0,600}walk\(src\)/.test(blocksCode);
let blockIndex = {};
try { blockIndex = JSON.parse(read(REG + "blocks/index.json")).blocks; } catch {}
for (const f of vend.filter((f) => f.startsWith(REG))) {
  const rel = f.slice(REG.length).split("/");
  if (rel[0] === "components") {
    if (!readsComponents) continue;
    if (rel.length === 2) { mark(f, "used", "R2", "components/CATALOG.md written/read by the catalogue"); continue; }
    const name = rel[1], base = rel.slice(2).join("/");
    let item = null; try { item = JSON.parse(read(REG + "components/" + name + "/registry-item.json")); } catch {}
    const listed = new Set((item?.files || []).map((x) => x.path));
    if (base === "registry-item.json" || listed.has(base)) mark(f, "used", "R2", "read by tools/commands/add.mjs (readdirSync(components) -> registry-item.json -> files[0])");
  } else if (rel[0] === "blocks") {
    if (rel.length === 2) { mark(f, "used", "R2", "tools/blocks.mjs reads/writes " + rel[1]); continue; }
    const b = blockIndex[rel[1]];
    if (installWalks && b && b.status === "supported") mark(f, "used", "R2", "installBlock() walks the whole folder of supported block " + rel[1]);
  }
}

// R3 packages
const pkgJson = JSON.parse(read("package.json"));
const filePkgs = {}; // name -> dir
for (const [n, v] of Object.entries(pkgJson.dependencies || {})) if (String(v).startsWith("file:")) filePkgs[n] = v.slice(5).replace(/\/$/, "");
const pkgOfFile = (f) => Object.entries(filePkgs).find(([, d]) => f.startsWith(d + "/"))?.[0];
const jsFiles = new Set(vend.filter((f) => /\.(m?js|cjs)$/.test(f)));
const baseIndex = new Map(); // pkg -> basename -> [files]
for (const f of vend) { const p = pkgOfFile(f); if (!p) continue; const b = path.posix.basename(f); const m = baseIndex.get(p) || new Map(); m.set(b, [...(m.get(b) || []), f]); baseIndex.set(p, m); }
const reached = new Set(), queue = [];
const why = new Map();
const reach = (f, from) => { if (!vset.has(f) || reached.has(f)) return; reached.add(f); why.set(f, from); queue.push(f); };
const resolveRel = (fromFile, spec) => {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
  for (const c of [base, base + ".js", base + ".mjs", base + ".cjs", base + ".json", base + "/index.js", base + "/index.mjs"]) if (vset.has(c)) return c;
  return null;
};
const globToRe = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*") + "$");
const exportTargets = (v, acc = []) => { if (typeof v === "string") acc.push(v); else if (v && typeof v === "object") for (const x of Object.values(v)) exportTargets(x, acc); return acc; };
const entryOf = (name, sub) => { // @hyperframes/<pkg>[/sub] -> file(s) in vendor
  const dir = filePkgs[name]; if (!dir) return [];
  const pj = JSON.parse(read(dir + "/package.json"));
  const rel = sub ? "." + sub : ".";
  const out = [];
  const ex = pj.exports;
  if (ex && typeof ex === "object") {
    const cands = Object.entries(ex).filter(([k]) => k === rel || (k.includes("*") && globToRe(k).test(rel)));
    for (const [k, v] of cands) for (const t of exportTargets(v)) {
      if (t.includes("*") && k.includes("*")) { const star = rel.slice(k.indexOf("*")); out.push(path.posix.join(dir, t.replace("*", star))); } else out.push(path.posix.join(dir, t));
    }
  }
  if (!out.length && rel === "." ) { for (const k of [pj.main, pj.module]) if (k) out.push(path.posix.join(dir, k)); }
  if (!out.length && sub) out.push(path.posix.join(dir, sub));
  return out.filter((x) => vset.has(x));
};
for (const [name, dir] of Object.entries(filePkgs)) {
  const pj = JSON.parse(read(dir + "/package.json"));
  const roots = [pj.main, pj.module, ...(typeof pj.bin === "string" ? [pj.bin] : Object.values(pj.bin || {}))].filter(Boolean).map((x) => path.posix.join(dir, x));
  for (const t of exportTargets(pj.exports)) {
    if (!t.includes("*")) roots.push(path.posix.join(dir, t));
    else { const re = globToRe(path.posix.join(dir, t)); for (const f of vend) if (re.test(f)) roots.push(f); }
  }
  for (const r of roots) reach(r, "package.json entry of " + name);
}
// imports from the rest of the repo (code and docs-as-code): @hyperframes/<pkg>[/sub] and literal vendor/hyperframes/<pkg>/... paths
const outsideRefs = [];
for (const [f, s] of outText) {
  if (!isCode(f)) continue;
  for (const m of s.matchAll(/@hyperframes\/([\w-]+)((?:\/[\w./*-]+)?)/g)) {
    const name = "@hyperframes/" + m[1]; for (const t of entryOf(name, m[2] || "")) { reach(t, "imported by " + f + " as " + m[0]); outsideRefs.push([f, m[0]]); }
  }
  for (const m of s.matchAll(/vendor\/hyperframes\/(\w[\w-]*)\/([\w./-]+)/g)) {
    const p = "vendor/hyperframes/" + m[1] + "/" + m[2]; if (vset.has(p)) reach(p, "path in " + f);
  }
  for (const m of s.matchAll(/["']\.\.?\/(?:\.\.\/)*vendor\/hyperframes\/([\w-]+)\/([\w./-]+)["']/g)) { const p = "vendor/hyperframes/" + m[1] + "/" + m[2]; if (vset.has(p)) reach(p, "relative import in " + f); }
}
const dynamicSites = []; // {file, dir, kind, snippet}
const STRLIT = /(["'`])((?:\\.|(?!\1)[^\\\n]){1,240})\1/g;
const NAMEISH = /[\w.@-]+\.(?:m?js|cjs|json|html|css|wasm|txt|md|svg|ttf|woff2?|png|jpe?g|mp3|wav)\b/g;
while (queue.length) {
  const f = queue.shift();
  if (!jsFiles.has(f)) continue;
  const src = read(f);
  const pkg = pkgOfFile(f);
  const specs = new Set();
  for (const re of [/\bfrom\s*["']([^"']+)["']/g, /\bimport\s*["']([^"']+)["']/g, /\bimport\s*\(\s*["']([^"']+)["']/g, /\brequire\s*\(\s*["']([^"']+)["']/g, /new URL\(\s*["']([^"']+)["']/g]) for (const m of src.matchAll(re)) specs.add(m[1]);
  for (const m of src.matchAll(STRLIT)) {
    const lit = m[2];
    if (/^\.{1,2}\//.test(lit)) specs.add(lit.split(/[?#]/)[0]);
    for (const n of lit.matchAll(NAMEISH)) { // sibling-file names used by fs reads
      const bn = n[0]; const hits = baseIndex.get(pkg)?.get(bn) || []; for (const h of hits) reach(h, "basename '" + bn + "' in string literal of " + f);
    }
  }
  for (const s of specs) {
    if (/^\.{1,2}\//.test(s)) { const t = resolveRel(f, s); if (t) reach(t, "imported by " + f); }
    else if (s.startsWith("@hyperframes/")) { const m = /^(@hyperframes\/[\w-]+)(\/.*)?$/.exec(s); if (m) for (const t of entryOf(m[1], m[2] || "")) reach(t, "imported by " + f); }
  }
  for (const m of src.matchAll(/\b(?:import|require)\s*\(\s*(?!["'])([^)]{0,60})/g)) dynamicSites.push({ file: f, dir: path.posix.dirname(f), kind: "dynamic import/require", snippet: m[0].slice(0, 70) });
  // a directory read counts only when the surrounding 600 chars locate the package itself (__dirname / import.meta.url); reads of
  // user project dirs, frame dirs, caches and temp dirs cannot enumerate vendored files
  for (const m of src.matchAll(/\b(readdir(?:Sync)?|opendir(?:Sync)?|globSync|glob)\s*\(([^)]{0,80})/g)) {
    const around = src.slice(Math.max(0, m.index - 600), m.index + 200);
    if (/__dirname|import\.meta\.(url|dirname)|fileURLToPath/.test(around)) dynamicSites.push({ file: f, dir: path.posix.dirname(f), kind: m[1], snippet: m[0].slice(0, 90) });
  }
}
for (const f of reached) mark(f, "used", "R3", why.get(f));

// R4 / R5 references
const baseGeneric = new Set(["index.js", "index.mjs", "index.cjs", "package.json", "README.md", "types.js", "utils.js", "constants.js", "index.d.ts"]);
const refIn = (list, f) => {
  const rel = f.slice("vendor/".length), base = path.posix.basename(f);
  for (const [g, s] of list) {
    if (s.includes(f) || s.includes(rel)) return g;
    if (!baseGeneric.has(base) && base.length > 6 && s.includes(base)) return g;
  }
  return null;
};
for (const f of vend) {
  if (result.has(f)) continue;
  const c = refIn(codeText, f); if (c) { mark(f, "used", "R4", "path/basename in code file " + c); continue; }
  const d = refIn(docText, f); if (d) { mark(f, "unprovable", "R5", "mentioned only in doc " + d); continue; }
}
// dynamic read sites of reached files: make unreached files below the site's dir unprovable
for (const f of vend) {
  if (result.has(f)) continue;
  const p = pkgOfFile(f); if (!p) { continue; }
  const site = dynamicSites.find((s) => pkgOfFile(s.file) === p && (path.posix.dirname(f) + "/").startsWith(s.dir + "/"));
  if (site) mark(f, "unprovable", "DYN", `dynamic site ${site.kind} in ${site.file}: ${site.snippet}`);
}
// cross-file basename in OTHER vendored files of the same package (strings in reached code already handled); anything left is UNUSED
for (const f of vend) if (!result.has(f)) mark(f, "unused", "-", "no rule reaches it");

const size = (f) => fs.statSync(path.join(ROOT, f)).size;
const tally = {};
for (const f of vend) { const r = result.get(f); const k = r.status + " " + r.rule; tally[k] = tally[k] || { n: 0, bytes: 0 }; tally[k].n++; tally[k].bytes += size(f); }
console.log("vendor files:", vend.length, "bytes:", vend.reduce((a, f) => a + size(f), 0));
for (const [k, v] of Object.entries(tally).sort()) console.log(k.padEnd(14), String(v.n).padStart(5), "files", String(v.bytes).padStart(10), "bytes");
console.log("dynamic sites in reached files:", dynamicSites.length);
const out = { files: Object.fromEntries(vend.map((f) => [f, { ...result.get(f), bytes: size(f) }])), dynamicSites, filePkgs, kitLibs: [...kitLibs] };
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 1));
```

## Appendix B — references scan for other tracked files (`unref-tracked.mjs`, read-only)

```js
// READ-ONLY. For every tracked file outside vendor/ and fonts/: does any OTHER tracked text file mention its path or (non-generic) basename?
// usage: node unref-tracked.mjs <repo root>   -> prints files with zero references (candidates for section 6, judged by hand)
import { execFileSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path";
const ROOT = process.argv[2];
const files = execFileSync("git", ["-C", ROOT, "ls-files", "-z"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\0").filter(Boolean);
const BIN = /\.(png|jpe?g|gif|webp|mp3|wav|mp4|woff2?|ttf|otf|ico|pdf|zip|wasm)$/i;
const text = new Map();
for (const f of files) { if (BIN.test(f)) continue; try { const s = fs.statSync(path.join(ROOT, f)); if (s.size > 3e6) continue; text.set(f, fs.readFileSync(path.join(ROOT, f), "utf8")); } catch {} }
const GENERIC = new Set(["index.html", "index.js", "package.json", "README.md", "LICENSE", "film.js", "project.json", "record.mjs", "film.html"]);
const out = [];
for (const f of files) {
  if (f.startsWith("vendor/") || f.startsWith("fonts/") || /^projects\/[^/]+\//.test(f) || f.startsWith("docs/samples/") || f.startsWith("docs/recipes/")) continue;
  const base = path.basename(f), stem = base.replace(/\.[^.]+$/, "");
  const refs = [];
  for (const [g, s] of text) {
    if (g === f) continue;
    if (s.includes(f) || (!GENERIC.has(base) && s.includes(base)) || (stem.length > 5 && s.includes(stem) && !GENERIC.has(base))) { refs.push(g); if (refs.length > 2) break; }
  }
  if (!refs.length) out.push(f);
}
const sz = (f) => { try { return fs.statSync(path.join(ROOT, f)).size; } catch { return 0; } };
for (const f of out) console.log(sz(f) + "\t" + f);
```
