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
