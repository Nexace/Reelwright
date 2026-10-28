# Plan: integrate HyperFrames into Product Video Kit

Status: **plan only, nothing implemented.** The integration shape below is my recommendation. You have not confirmed it yet (see "Open decisions").

## Goal

One complete package: the kit keeps its voice, music, mix, recording and QA stages, and gains HyperFrames as a second way to author and render the visuals (HTML/CSS compositions with GSAP, Lottie, Three.js, WAAPI).

## What I found

| | Product Video Kit | HyperFrames (heygen-com/hyperframes) |
|---|---|---|
| Authoring | `film/film.js` with a pure `render(t)` (engine rule: no state between frames) | HTML with `data-start` / `data-duration` / `data-track-index`; animations registered on `window.__timelines` |
| Render | Playwright pages render frames in parallel to JPGs; `tools/render.mjs` modes `info`, `stills`, `frames`, `encode` | Puppeteer + FFmpeg; CLI `init`, `preview`, `render`, `add`, `catalog`, `skills` |
| Audio | edge-tts voice, synth/real music, ducking, SFX, loudness mix (`mix.py`) | Timed `<audio>` tracks with `data-volume`; no voice, music or ducking |
| Extras | Screen recording, beat grid, sched, QA | Studio editor, player, shader transitions, Lambda rendering |
| License | MIT | Apache 2.0 |
| Needs | Node, Python, ffmpeg, Playwright | Node 22+, FFmpeg |

Both render frames in headless Chrome and encode with FFmpeg, so they fit together at the render stage.

## Recommended design: `renderer` switch

Add `"renderer": "pvk" | "hyperframes"` to `project.json`. Default is `pvk`, so every existing film builds exactly as before.

Only these stages depend on the renderer: `info`, `stills`, `frames`, `encode`. Everything upstream (`record`, `vo`, `beatgrid`, `sched`, `music`, `mix`) and `qa` stay shared.

```
record → vo → beatgrid → sched → music → mix ─┐
                                              ├→ info → stills/frames → encode → qa
renderer = pvk | hyperframes  ────────────────┘
```

How the hyperframes path plugs in:

1. **Timing data.** `sched.py` already writes `film/data.js` (VO times, music grid). For HyperFrames projects it also writes `hf/kit-data.js` with the same values, so a composition can read `window.MUSIC` and the VO cue times instead of hard-coded seconds. This keeps the kit's "no hard-coded timings" rule.
2. **`info`.** For hyperframes projects, derive duration from the composition root's `data-duration` plus the kit data, and write the same `timeline.json` that `mix.py` already reads.
3. **Audio.** Render video only with HyperFrames, then let the kit's existing `encode` mux `mix.wav`. That keeps loudness, ducking and SFX in one place. (To confirm in the spike: can `hyperframes render` output video-only at 60 fps?)
4. **QA.** `qa.py` works on `frames/`. If HyperFrames only gives an mp4, extract frames with ffmpeg first, or run QA on the mp4.
5. **Dependency.** Install `hyperframes` as a pinned npm dependency. No HyperFrames code is copied into the repo.

## Phases

### Phase 0 — Prerequisites (before any code)
- The kit currently lives in an old scratch workspace that is deleted with its session. Move or copy it to a permanent folder first, and make it a git repo with a clean working tree.
- Read the HyperFrames source for the exact CLI flags and the render output format.

### Phase 1 — Spike (throwaway, answers feasibility)
- `npm i hyperframes`, render a hello composition at 60 fps.
- Answer: video-only output? frame sequence output? deterministic across two runs? Node 22 and Chrome co-existing with Playwright's Chromium?
- Output: a short findings note and a go/no-go. Spike code is deleted.

### Phase 2 — Renderer switch
- `project.json`: add `renderer` (default `pvk`).
- `video.sh`: dispatch `info`, `stills`, `frames`, `encode` by renderer. Add `./video.sh new <name> --renderer hyperframes`.
- `tools/hf_render.mjs`: thin wrapper that calls the hyperframes CLI and writes frames or an mp4 in the layout `encode` expects.
- `sched.py`: also emit `hf/kit-data.js` when the renderer is `hyperframes`.
- Unit-level checks: syntax checks for the new files in the existing CI step.

### Phase 3 — Example film and template
- `projects/example-hf/`: a small composition (title, captions timed to VO lines, a beat-pulsing element) built from kit data.
- Template for `new --renderer hyperframes` copies it.

### Phase 4 — Docs and CI
- README: renderer section and when to choose which.
- `docs/PLAYBOOK.md`: HyperFrames craft rules (seekable animations only, timings from kit data).
- `CLAUDE.md`: workflow for hyperframes films; keep the "no hard-coded seconds" rule.
- CI: build `example-hf` in a second job. Node 22 is already set up.
- `THIRD_PARTY.md`: note that HyperFrames is an Apache-2.0 dependency.

### Phase 5 — Optional, decide after Phase 2 ships
Port selected ideas into `tools/engine.js` so pvk films can use them without a dependency: Lottie, Three.js and WAAPI adapters, a composition linter, shader-style transitions. Each is its own small spec.

## Verification
- `./video.sh all` on the existing example still passes CI unchanged (pvk path untouched).
- `./video.sh all example-hf` builds an mp4 whose duration matches `mix.wav` within one frame.
- Two renders of `example-hf` produce identical frames (determinism check).
- `./video.sh qa example-hf` passes.

## Risks
- **Version drift.** HyperFrames is young and changing fast. Pin an exact version and upgrade deliberately.
- **Two Chrome stacks.** Playwright (kit) and Puppeteer (HyperFrames) double the browser download. Acceptable, but note it in `setup.sh`.
- **Timing sync.** Declarative `data-start` values must come from kit data, not literals, or they drift when the script changes.
- **Parallelism.** The kit renders frames across `PAGES` browser pages. HyperFrames' own parallelism may differ, so render time may not match.
- **Unverified claims.** Sources disagree on HyperFrames' release date and star count. Everything about its CLI and audio behaviour here comes from the README summary, not from running it.

## Open decisions (need your call)
1. **Integration shape.** This plan assumes the renderer switch plus optional later ports. Alternatives: port features only (no dependency), or both at once.
2. **Audio.** Kit muxes `mix.wav` over a video-only render (recommended) versus HyperFrames mixing the audio itself.
3. **Where the kit should live** permanently (see Phase 0).
