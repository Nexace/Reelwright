# Reelwright — instructions for Claude Code

This repo makes product videos from code. Read README.md (pipeline, commands) and docs/PLAYBOOK.md (craft
rules) before starting a film.

## Workflow for a new film
1. Ask who the audience is, the length, voice or music-only, and what must be shown — then write the VO
   lines into `projects/<name>/project.json` and show them to the user before building.
2. Pick the renderer (README → Renderers): a product recording → `./video.sh new <name>`, then adapt
   `record.mjs` (the take) and `film/film.js` (the edit); a motion-graphics film → `./video.sh new <name>
   --renderer hyperframes` and edit `hf/film.js`. Pick a theme (`./video.sh themes`, `"style"` in
   project.json); `./video.sh remix <name>` shows alternatives. From a site: `./video.sh from-url <url> <name>`.
3. Iterate with `./video.sh sched <name>` + `./video.sh stills <name>`; read `stills/sheet.jpg` yourself
   before showing anything. (`./video.sh preview <name>` is a live scrubber for the user.)
4. `./video.sh all <name>` (or `audio` / `film` for partial rebuilds). Run in the background — renders take
   minutes. `all` ends with `qa`: fix every FAIL gate, and look at frames around every time it flags.
   Other formats or languages: `--formats 9x16,1x1`, `--lang es` (README → Every command).
5. Report the mp4 path. Then `./video.sh clean <name>`.

## Rules
- Every timing in film.js (pvk or hf/) comes from `W()`, `V()`, `clip.filmAt()`, recorder marks, or `KIT.snap()` —
  never hard-coded seconds that will drift when the script changes.
- `render(t)` must be a pure function of t (see the engine rules in PLAYBOOK.md).
- Never let a recording perform a real write (publish, pay, send). Mock it.
- Fake numbers get an "Illustrative data" label unless the user says otherwise.
- Never edit `vendor/hyperframes/` for a film; changes there need a "changed from upstream" header and a
  `VENDORED.md` entry.
- Don't change files in `tools/` for a single film — if a project needs something special, do it in that
  project's film.js. Improve `tools/` only for changes every film benefits from.
