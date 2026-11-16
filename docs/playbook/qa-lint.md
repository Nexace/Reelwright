# QA lint for HyperFrames films

`reelwright qa` runs the vendored [`@hyperframes/lint`](../../vendor/hyperframes/lint) on every film whose
`project.json` has `"renderer": "hyperframes"` (nothing runs for the pvk renderer). It reads `hf/index.html` and the
files it references, statically: no browser, no network, no rendered frames, about 5–30 ms per film.

| Plug-in | Kind | What it reports |
|---|---|---|
| `tools/checks/hf-lint.page.mjs` | gate (FAIL) | upstream **errors**: broken HTML/CSS, missing local assets, non-deterministic code (`Math.random`, `requestAnimationFrame`), GSAP misuse, SVG, textures |
| `tools/checks/hf-lint-warn.page.mjs` | WARN | upstream warnings and info, plus the errors in `DOWNGRADE` |

## Craft lints and the delivered-file quality gate

These are built into `tools/qa.py` (no plug-in), so they run on every film:

| Gate | Kind | What it reports |
|---|---|---|
| `hero-ease` | gate (FAIL) | an element marked `data-hero` animated with a generic easing keyword (`ease`, `linear`, `ease-in-out`): name the intent instead — `enter`, `exit`, `ambient` or `impact` |
| `scale-zero` | WARN | an entrance that starts at `scale: 0`: start at `0.93` (scale-from-zero is the most common cheap tell) |
| `shot-shutter` | gate (FAIL) | `KIT.shot.shutter(deg)` outside 0–360, or on a film with motion blur off (a shutter with no sub-frames to spread) |
| `cambi` | gate (FAIL) | banding in the delivered mp4: the mean CAMBI score per scene must stay under 6 |
| `vmaf` | gate (FAIL) | only when `project.json` has `"output": {"master": "<file>"}`: the mp4's VMAF against that master, per scene, mean ≥ 93 |

`cambi` and `vmaf` read the delivered mp4 with ffmpeg's `libvmaf` (`feature=name=cambi`, and the VMAF model), print the
score per scene (not just PASS/FAIL) and are **skipped, never failed**, when the local ffmpeg has no `libvmaf` — the
pipeline stays offline-safe and works on any platform. `vmaf` is also skipped when there is no master. Each is
skippable like any gate (`"qa": {"cambi": false}`), and `scale-zero` like any WARN.

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
31 of the 44 skipped rules (nine below, then 22 more), written for `hf/film.js` + `render(t)`, and two new audits. All are WARN. In `qa` they are off unless
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

Every one of the other 35 skipped rules was checked against what a Reelwright film has (`hf/film.js` and `render(t)`, `KIT.*` calls, `hf/blocks` and
`hf/compositions`, `KIT_MEDIA`, `project.json` lines, `vo/lines.json`, the `fx` buses, the Studio). 22 have a counterpart and are ported in
`tools/checks/native-lint2.mjs`; 13 do not, and `NO_COUNTERPART` in that file holds the reason for each. All are WARN, and run with the same
opt-in as the rest (`reelwright lint`, or `"qa": {"native-lint": true}`).

| Upstream rule | Native check (what it looks at) |
|---|---|
| `missing_data_no_timeline` | an `hf/blocks` file with a `data-composition-id`, no registered timeline and no `data-no-timeline` |
| `gsap_timeline_not_registered` | `gsap.timeline()` that neither `KIT.gsap` nor `window.__timelines` ever receives: `render(t)` never seeks it |
| `gsap_animates_clip_element` | a GSAP tween of `visibility` / `display` / `autoAlpha` on a `KIT.video` element (the producer shows it by its `data-start` window) |
| `media_runtime_src_mutation` | `.src =` / `setAttribute('src')` on a `KIT.video` element |
| `speed_ramp_on_non_media` | `ramp` on `KIT.audio` (a sound is retimed with `rate`); any other option `KIT.video` / `KIT.audio` ignores is `media_option_ignored` (new) |
| `audio_volume_tween_overrides_gain` | a tween or assignment on `volume`: the mp4's sound is the ffmpeg mix and never reads the page element |
| `root_path_missing_in_preview` | `url(/x)`, `fetch('/x')`, `src="/x"`: a film is a `file://` page, so `/` is the disk's root |
| `caption_transcript_not_inline` | a caption block that `fetch`es the transcript instead of holding `var TRANSCRIPT\|WORDS\|W = [...]`, the array `captions` re-feeds |
| `media_missing_data_start`, `media_missing_id`, `nested_media_start_basis_ambiguous`, `video_nested_in_timed_element`, `video_missing_muted` | the `<video>` / `<audio>` elements of the loaded page (hand-written markup or a block; `KIT.video` makes correct ones) |
| `video_muted_with_declared_audio` | a page `<audio>`, or `data-has-audio`: sound the mix never takes (the mix is `vo/`, music, `KIT.audio`, `KIT.video` with `audio: true`) |
| `clip_ends_past_root_duration` | a `KIT.video`, `KIT.audio` (with an `out` or `dur`) or voiceover line that ends after `window.FILM.DUR` |
| `nested_clip_never_visible` | a `KIT.video` parented in a `KIT.mount` host that is hidden for the clip's whole window (the page is seeked and the host watched) |
| `system_font_will_alias` | the first font of a text element is an OS-only family (Arial, Helvetica, Georgia, Impact, …) with no `@font-face`: Colab, CI or a teammate's machine substitutes another |
| `studio_missing_editable_id` | a `project.json` line with no usable id, or a duplicate (the Studio edits a line by its id; it names the files in `vo/`) |
| `linked_clip_orphan` | a line and its voiced clip (`vo/lines.json`) are the linked pair: a voiced clip with no line, or a line with no clip |
| `linked_clips_out_of_sync` | a line whose text differs from the text it was voiced from |
| `audio_group_no_members` | `fx.<bus>` that is not `vo` / `music` / `sfx` / `lines`, or `fx.lines.<id>` naming no line: `mix.py` drops it |
| `composition_exceeds_inspection_viewport_cap` | `width` / `height` over 8192: `--formats` and the Studio's save refuse it |

No counterpart (the premise is HyperFrames' own model; each reason is `NO_COUNTERPART[code]`):

| Upstream rule | Why a port would mean nothing here |
|---|---|
| `root_composition_duration_derived` | the duration is always `KIT.start`'s explicit `dur` (`root_composition_missing_duration_source` checks it); nothing is inferred from clips |
| `timed_element_missing_clip_class` | `class="clip"` is a HyperFrames Studio convention; the only `data-start` element Reelwright makes is `KIT.video`'s `<video>`, which upstream exempts |
| `timeline_element_missing_timing` | `KIT.mount`, `KIT.video` and `KIT.seq` throw at load without `start` and `dur`, so `qa` stops at the page error; no element can sit untimed |
| `nested_structure_needs_subcomposition` | there is no timeline row per element: `render(t)` draws everything |
| `timeline_track_too_dense` | there are no timeline tracks; a big file is `composition_file_too_large` |
| `caption_track_kind_missing` | captions are drawn by `KIT.subs` or a caption block fed by `captions`, never a timeline track that needs a `data-track-kind` |
| `gsap_timeline_registered_before_async_build` | `KIT.gsap` builds after fonts load and registers once; `KIT.mount` keeps the registered timeline object, so tweens added later still play |
| `audio_volume_double_automation` | a `vol` curve, fades and `gain` multiply in one ffmpeg chain (`tools/media-ffmpeg.mjs`); no control overrides another |
| `audio_carve_ungrouped_sources`, `audio_group_carve_attr` | there is no carve: music ducks under the voiceover automatically (`mix.py`), and `KIT.audio` is never ducked |
| `audio_group_timing_attrs`, `audio_group_holds_elements` | buses are `project.json` keys (`fx.vo`, `fx.music`, `fx.sfx`), not elements: no timing attributes, nothing nests in them |
| `audio_reactive_single_tween_per_group` | audio-reactive data (`tools/audio-viz.js`) is read inside `render(t)` every frame, so one tween per caption group cannot be written; no catalog component has it |

Check: `node tools/selfcheck/lint-ports.mjs` (a film broken on purpose trips each of the 22; the earlier 9, these 22 and the 13 are exactly the 44 rules in `SKIP`).
`reelwright lint --components [name… | --all]` lints catalog components (the installed `hf/blocks/*.html`, or the named / all vendored ones)
one by one as fragments, leaving out the four rules only a host page can satisfy. Check: `node tools/selfcheck/native-lint.mjs`.

## `new` options
`new <name> --example <name|list>` starts from `projects/<name>`; `--agents` writes `AGENTS.md` (project guide + the repo's rules) and
`CLAUDE.md` (`@AGENTS.md`) into the new project; `--skills` copies the repo's project skills into `.claude/skills/`; `--tailwind` is
accepted and skipped (it needs an npm install, which `new` never runs). Check: `node tools/selfcheck/new-flags.mjs`.
