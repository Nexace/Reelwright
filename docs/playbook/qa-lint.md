# QA lint for HyperFrames films

`reelwright qa` runs the vendored [`@hyperframes/lint`](../../vendor/hyperframes/lint) on every film whose
`project.json` has `"renderer": "hyperframes"` (nothing runs for the pvk renderer). It reads `hf/index.html` and the
files it references, statically: no browser, no network, no rendered frames, about 5–30 ms per film.

| Plug-in | Kind | What it reports |
|---|---|---|
| `tools/checks/hf-lint.page.mjs` | gate (FAIL) | upstream **errors**: broken HTML/CSS, missing local assets, non-deterministic code (`Math.random`, `requestAnimationFrame`), GSAP misuse, SVG, textures |
| `tools/checks/hf-lint-warn.page.mjs` | WARN | upstream warnings and info, plus the errors in `DOWNGRADE` |

Each line is `<code>: <message> (fix: <hint>)`, cut to 200 characters. `tools/checks/hf-lint.mjs` holds the shared run and
both lists below. The fixture `projects/qa-broken-lint` trips 6 gate and 6 warn codes on purpose;
`node tools/selfcheck/hf-lint.mjs` checks it and that every committed hyperframes film passes the gate.

Findings in Reelwright's own kit (`hf/kit/`, e.g. the preview-only loop in `engine.js`) are dropped, and so are
`non_deterministic_code` / `requestanimationframe_in_composition` findings in the film's own `hf/film.js`: the built-in
`seekable` gate already fails those, so one mistake would fail twice.

## Rules not run (`SKIP`)
Reelwright builds the page in `film.js` and `render(t)` is the only clock, so a rule is skipped when its premise is
HyperFrames' own model. The one-line reason for each is next to it in `SKIP`. By group:

- **Timeline registration and duration**: `KIT.start` (and `KIT.gsap`) register `window.__timelines.main` and its
  duration at runtime, which static lint can't see (`missing_timeline_registry`, `root_composition_missing_duration_source`, …).
- **Declarative clips**: `data-start` / `data-duration` / track and clip-class rules, linked clips, caption tracks.
  Reelwright shows elements from `render(t)`.
- **Hand-driven media**: `KIT.video` seeks and `KIT.img` swaps `src` from `render(t)` on purpose
  (`imperative_media_control`, `media_runtime_src_mutation`).
- **Audio**: the mp4's sound is the ffmpeg mix of voiceover and music, not elements in the page (audio groups, lanes,
  `audio_file_without_element`).
- **Studio and CLI tools**: editability, Studio preview paths, inspection viewport cap.
- **Size and performance advice**, and rules that can't fire locally (`system_font_will_alias` is distributed-render only).

Rules that run but only as WARN: `gsap_non_transform_motion`, `media_crossorigin_breaks_preview`,
`deprecated_data_layer`, `deprecated_data_end`, `font_family_without_font_face` (`DOWNGRADE`, each with its reason; the last because
five themes end their font stack in the system fallback Impact, which has no `@font-face`). If you think another rule is wrong
for a film, move it there or into `SKIP` in `tools/checks/hf-lint.mjs`, with the reason.

## Silencing
In `project.json`:

```json
"qa": { "hf-lint": false }                              // both plug-ins, this film
"qa": { "hf-lint-warn": false }                         // only the WARN lines
"qa": { "hf-lint-skip": ["css_transition_used", "…"] }  // single rules, by code
```

Fix the cause first: `css_transition_used`, `non_deterministic_code` and the GSAP rules point at frames that would
differ between a preview and a render.

## Native lint, drift and HDR (`reelwright lint`, opt-in in `qa`)
`reelwright lint <project>` runs the vendored lint (every finding that applies) plus `tools/checks/native-lint.mjs`: native versions of
nine of the 44 skipped rules, written for `hf/film.js` + `render(t)`, and two new audits. All are WARN. In `qa` they are off unless
`"qa": {"native-lint": true}` in project.json (plug-in `native-lint.page.mjs`), so existing films' output is unchanged.

| Rule (upstream id) | Native check |
|---|---|
| `missing_timeline_registry` | film.js never calls `KIT.start` |
| `root_composition_missing_duration_source` | `window.FILM.DUR` is not a positive number |
| `composition_file_too_large` | hf/index.html or hf/film.js over 300 lines (upstream's limit) |
| `composition_heavy_overlay_count_high` | 25+ elements with blur / radial-gradient / clip-path on stage at once |
| `duplicate_audio_track` | two `KIT.audio` of one file overlapping in time |
| `audio_file_without_element` | an audio file in assets/, hf/ or clips/ that no film code or project.json mentions |
| `imperative_media_control` | film code calls `.play()` / `.pause()` or sets `.currentTime` |
| `multiple_caption_tracks` | more than one caption row on stage |
| `hevc_preview_codec` | a `KIT.video` source is HEVC (info) |
| `coordinate_drift` (new) | a box differs after seeking away and back: `render(t)` is not pure |
| `hdr_check` (new) | `output.hdr` without an HDR source, an HDR source with `output.hdr` off, HDR with alpha / non-mp4 / pvk, an mp4 that is not PQ/HLG |

The other 35 skipped rules stay skipped; each reason is in `SKIP` (hf-lint.mjs): their premise is HyperFrames' own clip model
(`data-start` clips, tracks, audio groups and lanes, linked clips, caption tracks as timeline rows, Studio editing, inspection
limits, `system_font_will_alias`, which only reports on distributed renders), and Reelwright has no such element to check.
`reelwright lint --components [name… | --all]` lints catalog components (the installed `hf/blocks/*.html`, or the named / all vendored ones)
one by one as fragments, leaving out the four rules only a host page can satisfy. Check: `node tools/selfcheck/p13-lint.mjs`.

## `new` options
`new <name> --example <name|list>` starts from `projects/<name>`; `--agents` writes `AGENTS.md` (project guide + the repo's rules) and
`CLAUDE.md` (`@AGENTS.md`) into the new project; `--skills` copies the repo's project skills into `.claude/skills/`; `--tailwind` is
accepted and skipped (it needs an npm install, which `new` never runs). Check: `node tools/selfcheck/p13-new.mjs`.
