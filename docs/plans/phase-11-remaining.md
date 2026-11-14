# Phase 11 plan: build the remaining rows (one session, parallel subagents)

Status: **draft, owner starts it in a new session after 0.3.0 is released. Phase 11 is the LAST phase (owner, 2026-11-12): when it ends nothing is left to build.** Goal: turn the open rows of `docs/PARITY.md` into EQUAL or BETTER, each flip proved by
a file or self-check, and release the final version. At 0.3.0 the open rows are 221: 27 Planned, 168 Partial (some shipped, the rest
planned) and 26 with no tag, plus 4 proposed exceptions for the owner. Package sizes below are estimates; the orchestrator
recounts from `docs/PARITY.md` and the `[10z: build]` tags first. Excluded by the owner: Figma, Firefly and Premiere Pro work, Higgsfield depth.

## Exit criterion: nothing open, nothing deferred

Phase 11 does not end until `docs/PARITY.md` has **0 Planned, 0 Partial, 0 Proposed and 0 Open (no tag)** rows. Every one
of the 601 rows is EQUAL or BETTER (proved by a file or self-check), or an exception the owner approved. There is no
"Phase 12": a row that cannot be built is not parked, it is put to the owner once, with the reason, to accept as an
exception or to keep working on. Accepted exceptions are final.

- `node tools/parity_compile.mjs --check` exits 1 while any row is Planned, Partial, Proposed or Open; the orchestrator
  adds it to CI in Wave 4, so the claim cannot regress.
- The release at the end is the finished product (suggest `1.0.0`; the owner names it).

## How it runs: one session, subagents only

One orchestrator session does everything. It **never starts another session** (no `start_session`, no `SendMessage` to
other sessions). Parallel work is Agent-tool subagents, dispatched with `superpowers:dispatching-parallel-agents` and
`superpowers:subagent-driven-development`, each with an explicit `model` and `effort` by difficulty (CLAUDE.md:
Sonnet for well-specified work, Haiku for mechanical edits and re-checks, Opus only for hard design).

- **One integration branch** `phase-11-build` from `main`. Each package runs in a subagent with `isolation: "worktree"`
  (its own worktree and branch `p11-<package>`; a worktree is not a session). The orchestrator merges a package into
  `phase-11-build` only after verifying it itself.
- **No shared-file edits by subagents.** A package owns new files only (new `tools/*.js` modules, `tools/commands/*.mjs`,
  `tools/checks/*`, `tools/selfcheck/*.mjs`, `docs/playbook/<topic>.md`, `docs/recipes/*`, its demo project). It must NOT
  edit `docs/parity/*.md`, `bin/reelwright.mjs`, `tools/engine.js` (frozen), `tools/qa.py`, `tools/manifest.mjs`,
  `.github/`, `package.json`. If it needs a shared edit, it returns the exact patch as a request; the orchestrator
  applies all of them in one commit per wave.
- **Parity rows are updated once per wave by the orchestrator**, from each subagent's returned row table (row id,
  new status, proving file). This avoids many writers on the same table.
- **At most 4 subagents at a time** (renders are CPU heavy). Waves below are ordered by dependency.
- **Commit after every merged package and push after every wave**, so a usage-limit stop loses nothing. The orchestrator
  keeps the progress table at the bottom of this file current.
- Every package ends with: its self-check passes; `render(t)` is a pure function of t (shuffled-seek check) in both
  renderers where it applies; the pvk `example` frames and `example-hf` frames stay identical to `main`; QA output
  unchanged on existing films. CI (about 35 min on three OSes) runs on `phase-11-build` after each wave, not per package.

## Subagent brief (every package; replace the <>)

> Package <name> of Phase 11. Read `AGENTS.md`, `docs/plans/phase-11-remaining.md` and your rows in `docs/PARITY.md`
> (Planned) and in `docs/parity/<source>.md`. Work only in your worktree, only in the files your package owns.
> Build each row, with a self-check in `tools/selfcheck/<name>.mjs` (CI runs every file there; no network, no paid
> call, nothing installed). Do not edit shared files or parity tables; return (1) a table `row id | new status |
> proving file or command`, (2) any shared-file patch you need, (3) anything you could not do and why. Never claim a
> row EQUAL without a file that proves it. Ask nothing; if blocked by an owner decision, skip the row and say so.

## Owner decisions needed before the rows that depend on them

Rows below are skipped until the owner rules; the orchestrator asks at the start of the session.
1. dotLottie player (`@lottiefiles/dotlottie-web`, about 230 KB): vendor or accept as an exception.
2. Path boolean operations library: vendor one, or build a small native version.
3. Syntax highlighting library for code shots.
4. Remotion speech-to-text (model size): build as an opt-in download, or accept as an exception.
5. The about 4 "proposed" rows left by 10z.

## Waves and packages

Row ids come from the Planned list in `docs/PARITY.md`; each package takes the rows whose source and category match.

**Wave 0: triage (orchestrator, no subagents, about an hour)**
- Recount from `docs/PARITY.md`. Give the 26 untagged rows a decision each: build or exception proposal. Put the 4
  proposed exceptions and the five owner decisions to the owner in ONE message. Anything the owner approves as an
  exception is final; everything else becomes a build row in a package below.
- Assign every open row to exactly one package (a table `row id → package`, committed as
  `docs/plans/phase-11-assignments.md`), so no row is left over and none is built twice.

**Wave 1 (4 subagents, independent)**
- **P1 HyperFrames: variables, batch, stills.** Composition variables (A5) first, then batch render (A6, depends on A5),
  then the full `stills` command (zoom, compare, frame ranges; G5). Files: `tools/commands/{batch,stills2}.mjs`,
  `tools/variables.js`.
- **P2 Shotcards A: camera, opening, outro, transition, rhythm.** Recipes and helpers as `tools/shotcards/<category>.js`
  plus `docs/recipes/shotcards/`; about 55 rows.
- **P3 Shotcards B: typography, ui-entrance, data, effects, interaction.** Same layout; about 60 rows.
- **P4 Manim: 18 build rows** (recipes, `Broadcast`, native table, `texts.json` lint for Manim frames, etc.).

**Wave 2 (4 subagents)**
- **P5 Remotion (5 rows) and the doodle section-1 rows (15):** perceptual scale, audio spectrum, animated images,
  `fitText`, per-run props; callout, drawn kinetic type, motion deck, camera keys, dolly zoom, shake, time remap,
  world canvas, reading time, subtitle phrasing, brand import, narration providers, determinism gate, ship checks.
- **P6 Motion rules, Lottie and kit components:** duration and distance scaling, state-feedback patterns, Lottie
  rules (dotLottie only if decision 1 allows), caption info-strip, digit-roll odometer, flash cut, vertical ticker,
  clip card.
- **P7 HyperFrames: the remaining build rows** (the rest of the 26 not in P1), grouped by file ownership.
- **P8 Partly shipped rows, HyperFrames side (15):** finish what each row says is missing.

**Wave 3 (3 subagents)**
- **P9 Partly shipped rows, Remotion (30).**
- **P10 Partly shipped rows, doodle and motion (19 + any left).**
- **P11 Cross-cutting: QA and docs for everything above:** playbook sections, skill updates for new commands, taste-check
  rules for the new shotcards.

**Wave 4: integration and release 0.4.0 (orchestrator, plus Haiku re-checkers)**
0. Close-out: list every row still not EQUAL/BETTER. For each, either a subagent finishes it, or it goes to the owner in
   one batch as an exception request with the reason. Repeat until `parity_compile.mjs --check` passes.
1. Merge any shared-file requests; recompile `docs/PARITY.md` (`tools/parity_compile.mjs`).
2. Independent re-check of every flipped row (Haiku or Sonnet subagents, one per source): open the proving file, run
   the command, confirm. Unproved flips are reverted.
3. Fresh-clone build of the example films and every new demo; all gates pass; CI green on three OSes.
4. Stitch docs, final version number (owner names it), then tag and release **only with the owner's yes**, then the cleanup list (also with a yes).

## Owner instruction (2026-11-13)

After all waves are done: run the final cleanup (the cleanup list), then release Reelwright **1.0.0**. This is the owner's advance yes for the cleanup, the version bump, the tag and the release; deleting anything beyond the cleanup list, installs and paid calls still need a fresh ask.

## Orchestrator rules

- Keep prompts short and file-specific; give each subagent only its rows, not the whole table.
- Verify every package yourself before merging: run its self-check, the full self-check loop, and the frame-identity
  check. A subagent's report is a claim, not proof.
- When a wave's subagent hits the usage limit or fails, re-dispatch only that package; completed packages stay merged.
- Ask the owner before: vendoring a library, adding a dependency, deleting files, any install on the machine, any paid
  call, tagging or publishing.
- Report at the end of each wave: packages merged, rows flipped (count), rows still open, CI link.

## Progress

| Wave | Package | State |
|---|---|---|
| 1 | P1 P2 P3 P4 | merged, verified, 110 rows flipped (332/601) |
| 2 | P5 P6 P7 P8 | P6 P7 P8 merged (rows flipped: 353/601 + P8); P5 running; P8 left D9 E2 E4 E8 G1 G3 G4 H3 H5 I10 I13 G15 I5 open for a follow-up package |
| 3 | P9 P10 P11 | not started |
| 0 | triage and assignments | done: docs/plans/phase-11-assignments.md (221 rows); owner rulings 2026-11-13: vendor dotLottie, polygon-clipping, shiki; Remotion transcribe = exception |
| 4 | close-out, final release | not started |

## Start prompt (paste into a new session in this repo)

> Read `AGENTS.md` and `docs/plans/phase-11-remaining.md`. You are the orchestrator for Phase 11. Do not start other
> sessions; work only through subagents (Agent tool, `isolation: "worktree"`, model and effort set per task by
> difficulty). Begin by asking me the five owner decisions, then run Wave 1 on branch `phase-11-build`.
