# P8 shared-file patches

Apply from the repo root, in one commit: `git apply docs/plans/p8-patches/mix.patch docs/plans/p8-patches/render-opts.patch docs/plans/p8-patches/add-tag.patch`.
Each patch is exercised by a self-check that applies it to a COPY of the files and runs the result (`tools/selfcheck/p8-mix-wiring.mjs`, `p8-render-wiring.mjs`,
`p8-add-tag.mjs`); once a patch is applied to the real files the self-check detects that and keeps passing.

| Patch | Edits | Rows it completes |
|---|---|---|
| mix.patch | tools/mix.py: project.json `automation` (music, voice, sfx lanes: gain dB, cutoff Hz, fades), per-cue `fadeIn`/`fadeOut`, `limiter` (true-peak, 4x oversample) | D3, D8 |
| render-opts.patch | tools/renderers/pvk.mjs (quality presets, bitrate and keyframe flags, `--resolution`, auto workers), tools/renderers/hyperframes.mjs (auto workers, `outputResolution`), bin/reelwright.mjs (flags `--quality --crf --video-bitrate --max-bitrate --buffer-size --keyframe-interval --vp9-cpu-used --resolution --workers --low-memory`) | I4, I5, I8 |
| add-tag.patch | tools/commands/add.mjs: `add <tag>` installs a single match, lists several, `--all` installs them | E6, G2 |

Not patches, to do by hand:

- docs/playbook/skill-patch.md: the block to append to `.claude/skills/product-video/SKILL.md` (L1), and three rows for the recipe index docs/recipes/README.md (pr-to-video, lyric-video, faceless-explainer).
- Optional: `git mv tools/checks/layout.audit.mjs tools/checks/layout.page.mjs` makes `qa` run the layout and occlusion audit as a WARN on every film (not done here: it changes qa output on existing films). `reelwright check` works without it.
- Optional, for the studio rows not done here: none.

Notes for the docs table (docs/parity, docs/PARITY.md): new commands are `catalog`, `captions`, `check`, `doctor`, `browser`, `compositions`, `docs`, `audio-report`, `json`, `lottie`, `qa-strict`, `preflight`. A plug-in command named `audio` would have replaced the built-in `audio` step, so the report command is `audio-report`.
