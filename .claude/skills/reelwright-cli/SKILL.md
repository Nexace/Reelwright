---
name: reelwright-cli
description: Run Reelwright commands from an agent and read their results: the JSON envelope, exit codes, doctor, browser, check, audio-report, docs. Use when scripting Reelwright, parsing its output, diagnosing a missing tool, or auditing a film before a render. For making a film, use the product-video skill.
---

# Reelwright CLI

`./video.sh <command> [project] [args]` (Windows or anywhere: `node bin/reelwright.mjs ...`). `node bin/reelwright.mjs` with no command prints every command.

- Machine-readable: `reelwright json <command> [project] [args]` prints one JSON object: `{ ok, command, args, exit, stdout, stderr, data?, error?, did_you_mean?, _meta }`. `data` is the command's own JSON when it prints one (`catalog --json`, `doctor --json`, `compositions --json`, `check --json`). Exit codes: 0 ok, 1 the command failed (a FAIL gate, an error), 2 usage (unknown command; `did_you_mean` lists close names).
- `doctor [--json]`: node, ffmpeg and its encoders, python libs, the headless browser, disk, cores. Run it first when anything fails to start. `browser path | ensure [--install] | clear [--yes]`: the browser the kit renders with (`--install` downloads Chromium, so only with the user's go-ahead).
- `check [project] [--at t,t] [--range a b] [--at-transitions] [--caption-zone] [--frame-check]`: layout and occlusion audit of a built film page, before rendering. Exit 1 if it finds problems.
- `compositions [project] [--all]`: the HyperFrames compositions in a project (id, start, duration, size).
- `audio-report <file> [--at t] [--range a b] [--place-at t] [--json]`: onsets, loudness sections, tempo of any audio or video file.
- `docs [topic]`: list or print a page from docs/playbook, docs/recipes or PLAYBOOK.
- Read-only, no render: `preflight [project] [--json]` (disk the frames need), `gate [project]` (determinism and dead air, exit 1), `audit [project] [--contrast] [--motion]`, `rand-lint [project]` (exit 1 on clocks or `Math.random`), `arc [project]`, `brand [project] check`, `props <project> check|schema|merge`, `qa-strict [project]` (qa, exit 1 on any WARN), `review [project]` (the final-review brief), `deck`. After a render: `ship [project]`, `verify-av`, `beatsync`, `diff <ref.mp4> <out.mp4>`.
- Variants: `batch <project> rows.csv [--concurrency N] [--fail-fast]` writes `out/batch/batch.json`; any command takes `--props '{...}'` or `--variables '{...}'`; `compare`, `grade-compare`, `stills <project> --zoom <selector>` (runs `stills2`).
- Files in, files out (offline, ffmpeg): `measure <video> probe|cuts|frames`, `transcode`, `range`, `reverse`, `face`, `audiofx`, `audio-clip`, `spectrum`, `animimg`, `add-lottie` (`lottie` is its deprecated alias), `capture-trio`. `capture <url>` and `narrate speak --yes` reach the network or a paid provider: only with the user's yes.
- A new command is any `tools/commands/<name>.mjs`: its header comment is its help, and `json` finds it by name.
- Not the same as `audio <project>`, which rebuilds a project's voice, schedule and mix.
- Rules: read AGENTS.md. Never run a paid or install step (`gen`, `manim install`, `browser ensure --install`) without the user's yes.
