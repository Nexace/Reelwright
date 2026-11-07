---
name: product-video
description: Make, edit, rebuild or render product videos and motion-graphics films with Reelwright (scripted screen recordings, voiceover, beat-synced edits, a live preview page to show in the chat, a taste check, mp4 output). Use when the user asks for an app walkthrough, launch film, explainer, promo video, or wants to rebuild or re-render a film in this repo.
---

# Reelwright

Build films with the `pvk` wrapper (`bin/pvk`). It runs `video.sh` from any folder and puts Homebrew's ffmpeg on PATH. If `pvk` is not on PATH, run `bin/pvk` from the repo root.

## Commands

`pvk <command> [name]` is the same as `./video.sh` (or `node bin/reelwright.mjs` on Windows). The default project is `projects/example`; `pvk` with no command prints every command (README → Every command).

- `pvk new <name>` (pvk renderer, screen recordings) or `pvk new <name> --renderer hyperframes` (motion graphics). README → Renderers says which.
- `pvk from-url <url> <name>`: draft a HyperFrames film from a site you own; `pvk theme-from <url|image> <name>`: draft a theme.
- `pvk beats <name> import <file.csv|timeline.json>` / `export [file.csv]`: beat-sheet round trip with `project.json` (`--replace` to overwrite).
- `pvk gen <name> --provider higgsfield "<prompt>" --out assets/<file>`: optional, paid AI media. See Rules.
- `pvk themes`, then `"style"` in `project.json`; `pvk remix <name>` shows other themes and formats on one sheet.
- `pvk audio <name>`: after script or voice changes. `pvk film <name>`: after edit changes.
- `pvk all <name>`: everything from recording to mp4, ending with `qa`. Renders take minutes, so run it in the background.
- `pvk stills <name> [t,t,...]`: preview frames. `pvk preview <name>`: live scrubber for the user.
- `pvk embed <name>`: one self-contained preview page, `projects/<name>/out/embed.html` (film + mix in the HyperFrames player, no network). Show it in the chat; `#12.5` opens it on a moment.
- `node tools/checks/taste.page.mjs projects/<name>`: taste check before rendering (motion jerk, balance, empty space, contrast, pacing). WARN only.
- `pvk qa <name>`: blank frames, jumps and the gates (loudness, captions, flash, illustrative, seekable). A FAIL exits 1.
- `pvk verify <name>`: inputs and frames still match the manifest.
- `pvk clean <name>`: delete frames, stills and the frame cache (gigabytes), keeping the mp4.
- Options: `--style <name>`, `--formats 16x9,9x16,1x1`, `--lang <code>`, `--no-cache`.

## Workflow: brief → script → stills → taste → preview → render

1. **Brief.** Ask for the audience, length, voice or music-only, the one thing to remember, and what must be shown. Put it in `project.json` as `"brief"`.
2. **Script.** Write the VO lines into `projects/<name>/project.json` and show them to the user before building. A spreadsheet script: `pvk beats <name> import sheet.csv`.
3. **Build the scenes.** `pvk new <name>` (with `--renderer hyperframes` for motion graphics), then adapt `record.mjs` (the take) and `film/film.js` (or `hf/film.js`). Start each scene from a recipe in `docs/recipes/` (proven patterns, each with a still) and pick a theme. After `new`, set `title` and `out` in `project.json` and drop the copied `langs` block. For a HyperFrames film, start `hf/index.html` from `docs/recipes/film/hf/index.html` and paste the "Shared setup" from `docs/recipes/README.md` into `hf/film.js`, replacing the template's scenes.
4. **Stills.** `pvk audio <name>` first (the voiceover needs internet; stills need its timings), then `pvk stills <name>` (after a script edit: `pvk audio` again; after a film.js edit: `pvk sched`); read `stills/sheet.jpg` yourself before showing anything.
5. **Taste.** `node tools/checks/taste.page.mjs projects/<name>`. Fix every line (or say why the shot wants it): a `motion` jump or dead stop means missing easing, `balance`/`empty` mean recompose, `contrast` means recolour, `pacing` means re-time or trim the line.
6. **Preview in the chat.** `pvk embed <name>`, then show `projects/<name>/out/embed.html` to the user: in the desktop app send it as a file with `display: "render"` (side panel), or publish it as a private artifact (≤ 16 MB); with neither, give the user the path to open in a browser. `embed` prints only problems (WARN lines); silence means it played with no network. Iterate 3-6 until they're happy; re-run `embed` after each change.
7. **Render.** `pvk all <name>` in the background. Fix every FAIL gate and look at frames around every time QA flags; WARN lines (taste, overlap, tiny-text, wordy, dark) are worth fixing: `overlap` during a crossfade means the scenes overlap too long (shorten the crossfade or fade one out first); `variety` means another film here has the same look (pick another with `pvk remix <name>`, or say why it stays).
8. Report the mp4 path from `project.json` → `out`. Then `pvk clean <name>`.

## Rules (from AGENTS.md)

- Every timing in `film.js` (pvk or `hf/`) comes from `W()`, `V()`, `clip.filmAt()`, recorder marks, or `KIT.snap()`. Never hard-code seconds.
- `render(t)` must be a pure function of `t`. See `docs/PLAYBOOK.md`.
- Never let a recording perform a real write (publish, pay, send). Mock it.
- Label fake numbers "Illustrative data" unless the user says otherwise.
- Put `KIT.aiLabel(el)` on every AI-generated still or clip. `pvk gen` is optional and paid (`docs/CONNECTORS.md`): use it only when the owner asks for generated media, show them the estimate it prints, and never pass `--yes` or make a paid call without asking first. No build step calls it.
- Never edit `vendor/hyperframes/` for a film. Don't change `tools/` for a single film. Put film-specific work in that project's `film.js`.

Craft beyond the layouts is in `docs/PLAYBOOK.md`: `KIT.shot.*` camera moves, `KIT.doodle.*` hand-drawn marks (theme `doodle`), `KIT.math.*` charts, curves and equations, and `KIT.easing` / `KIT.spring` / `KIT.keys` for motion.

Read `README.md` and `docs/PLAYBOOK.md` before a real film.
