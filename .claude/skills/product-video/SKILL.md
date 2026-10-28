---
name: product-video
description: Make, edit, rebuild or render product videos with the reelwright (scripted screen recordings, voiceover, beat-synced edits, mp4 output). Use when the user asks for an app walkthrough, launch film, explainer, promo video, or wants to rebuild or re-render a film in this repo.
---

# Reelwright

Build films with the `pvk` wrapper in the repo root. It runs `video.sh` from any folder and puts Homebrew's ffmpeg on PATH. If `pvk` is not on PATH, run `./pvk` from the repo root.

## Commands

- `pvk new <name>`: copy the example into `projects/<name>` to start a film.
- `pvk audio <name>`: after script or voice changes (`vo` → `sched` → `info` → `music` → `mix`).
- `pvk film <name>`: after `film/film.js` changes (`sched` → `info` → `mix` → `frames` → `encode`).
- `pvk all <name>`: everything from recording to mp4. Renders take minutes, so run it in the background.
- `pvk stills <name> [t,t,...]`: preview frames, for example `pvk stills my-film 3.2,7.8,15`.
- `pvk qa <name>`: check for blank frames and jumpy cuts.
- `pvk clean <name>`: delete frames and stills (gigabytes), keeping the mp4.

The default project is `projects/example`.

## Workflow

1. Ask for the audience, length, voice or music-only, and what must be shown. Write the VO lines into `projects/<name>/project.json` and show them to the user before building.
2. `pvk new <name>`, then adapt `record.mjs` (the take) and `film/film.js` (the edit).
3. Iterate with `pvk stills <name>` and read `stills/sheet.jpg` before showing anything.
4. `pvk all <name>`, then `pvk qa <name>`. Look at frames around every time QA flags.
5. Report the mp4 path from `project.json` → `out`. Then `pvk clean <name>`.

## Rules (from CLAUDE.md)

- Every timing in `film.js` comes from `W()`, `V()`, `clip.filmAt()`, recorder marks, or `KIT.snap()`. Never hard-code seconds.
- `render(t)` must be a pure function of `t`. See `docs/PLAYBOOK.md`.
- Never let a recording perform a real write (publish, pay, send). Mock it.
- Label fake numbers "Illustrative data" unless the user says otherwise.
- Don't change `tools/` for a single film. Put film-specific work in that project's `film.js`.

Read `README.md` and `docs/PLAYBOOK.md` before a real film.
