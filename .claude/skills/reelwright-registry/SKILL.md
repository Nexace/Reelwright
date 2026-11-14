---
name: reelwright-registry
description: Find and install HyperFrames catalog components and blocks in a Reelwright film (catalog, add, caption styles, lower thirds, transitions, map and chart blocks). Use when a scene could come from the catalog instead of being hand-built, or when the user wants captions in a particular style.
---

# Reelwright registry

The vendored HyperFrames registry has 238 components (single HTML files, used with `KIT.block`) and 210 blocks (136 supported here, used with `KIT.mount`, hyperframes films only).

- `reelwright catalog [words] [--type block|component] [--tag <tag>] [--all] [--json]`: search. `--tags` lists tags with counts (`caption-style`, `lower-third`, `transition`, `map`, `chart`). `--all` also lists items this repo cannot run, with the reason.
- `reelwright add <project> <name>`: installs one and prints its variables and the usage line. Components go to `hf/blocks/<name>.html` (`KIT.block('<name>')`), blocks to `hf/compositions/<name>.html` (`KIT.mount('<name>', { start, dur, vars })`). Use `add --list [tag]` for the short list.
- Captions: `reelwright captions <project> caption-pill-karaoke` writes `transcript.json` from the film's VO words (needs `timeline.json`: run `info` first) and installs the component with those words. 13 of the 15 caption styles take a transcript this way; `caption-camera-follow` and `caption-editorial-emphasis` are pinned to their sample text.
- Components that need image or font assets (caption-texture, hw-*, texture-mask-text) are refused by `add`: their assets are not vendored.
- Read the printed variables, set them in `KIT.mount`, then `stills` and read the sheet. Licences: `vendor/hyperframes/LICENSE` (Apache-2.0) and `vendor/hyperframes/CREDITS.md`.
