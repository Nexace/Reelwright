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
- Not the same as `audio <project>`, which rebuilds a project's voice, schedule and mix.
- Rules: read AGENTS.md. Never run a paid or install step (`gen`, `manim install`, `browser ensure --install`) without the user's yes.
