---
name: reelwright-registry
description: Find and install HyperFrames catalog components and blocks in a Reelwright film (catalog, add, caption styles, lower thirds, transitions, map and chart blocks). Use when a scene could come from the catalog instead of being hand-built, or when the user wants captions in a particular style.
---

# Reelwright registry

The vendored HyperFrames registry has 238 components (single HTML files, used with `KIT.block`) and 210 blocks (136 supported here, used with `KIT.mount`, hyperframes films only).

- `reelwright catalog [words] [--type block|component] [--tag <tag>] [--all] [--json]`: search. `--tags` lists tags with counts (`caption-style`, `lower-third`, `transition`, `map`, `chart`). `--all` also lists items this repo cannot run, with the reason.
- `reelwright add <project> <name>`: installs one and prints its variables and the usage line. Components go to `hf/blocks/<name>.html` (`KIT.block('<name>')`), blocks to `hf/compositions/<name>.html` (`KIT.mount('<name>', { start, dur, vars })`). Use `add --list [tag]` for the short list.
- Captions: `reelwright captions <project> caption-pill-karaoke` writes `transcript.json` from the film's VO words (needs `timeline.json`: run `info` first) and installs the component with those words. 13 of the 15 caption styles take a transcript this way; `caption-camera-follow` and `caption-editorial-emphasis` are pinned to their sample text.
- Dot-Lottie animations are not catalog items: `reelwright add-lottie <project> x.lottie` unpacks one for the dotLottie player or `KIT.lottie` (docs/playbook/lottie.md). Five small pieces need no catalog (info strip, odometer, flash cut, ticker, clip card): docs/playbook/kit-components.md.
- Components that bring assets (caption-texture, the hw-* set, texture-mask-text) are installed with them: Caveat comes from the repo's fonts, the textures are generated stand-ins (not the upstream photos; `--all-textures` generates all of texture-mask-text's textures, not just its 9 base masks), and a font the repo does not bundle (Geist, Permanent Marker, Courier Prime) is `--font-dir <folder>` or the install is refused. Check the licence of a font you supply.
- Read the printed variables, set them in `KIT.mount`, then `stills` and read the sheet. Licences: `vendor/hyperframes/LICENSE` (Apache-2.0) and `vendor/hyperframes/CREDITS.md`.
