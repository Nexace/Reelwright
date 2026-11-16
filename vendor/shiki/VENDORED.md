# Vendored: shiki (trimmed)

- Upstream: https://github.com/shikijs/shiki
- Version: **3.23.0** (`shiki`, `@shikijs/core`, `@shikijs/engine-javascript`, `@shikijs/langs`, `@shikijs/themes` all 3.23.0, installed with
  `npm install shiki@3` in a scratch folder; `shiki` tarball integrity `sha512-55Dj73uq9ZXL5zyeRPzHQsK7Nbyt6Y10k5s7OjuFZGMhpp4r/rsLBH0o/0fstIzX1Lep9VxefWljK/SKCzygIA==`).
- License: MIT, see [LICENSE](LICENSE) (Copyright (c) 2021 Pine Wu, (c) 2023 Anthony Fu). Dependencies' licence texts: [licenses/](licenses/).
- Owner ruling 2026-11-13 (Phase 11, row `manim:m7.7`): vendor shiki, trimmed to what is needed, for syntax-highlighted `Code`.

## What we took

One file, `shiki.min.mjs` (about 750 KB), built with esbuild from [entry.src.js](entry.src.js) (our code, 20 lines): `@shikijs/core`
(`createHighlighterCoreSync`) + the pure-JS regex engine `@shikijs/engine-javascript` (no WASM, no Oniguruma binary) + 7 grammars
(javascript, typescript, python, json, bash, html, css; html also embeds css and javascript) + 2 themes (`github-light`, `github-dark`).
`esbuild entry.src.js --bundle --minify --format=esm --platform=neutral --legal-comments=none --outfile=shiki.min.mjs`.
Everything else in the shiki packages (the other ~200 grammars, ~60 themes, the Oniguruma WASM engine, the transformers, the
HTML renderer entry points) is left out. Grammars are the bulk (about 575 KB of the 750 KB): drop a language from the entry to shrink it.

Its only export is `highlight(code, lang, theme)` -> `{ bg, fg, lines: [[{ content, color, fontStyle }]] }`, plus `LANGS` and `THEMES`.
`lang` also takes `js ts py sh shell zsh`. It is used at build time, in Node, by `tools/manim/code.mjs` (`reelwright code <project> ...`); it is
not copied into `hf/kit/` (there is no `kit.json` here on purpose) and the browser never runs it: `KIT.math.code` (tools/manim-grid.js) reads the tokens.

## What we changed

Nothing in upstream code. `shiki.min.mjs` is a bundle: its inputs are listed in [THIRD_PARTY.md](THIRD_PARTY.md).

## Updating

`npm install shiki@<version>` in a scratch folder, copy [entry.src.js](entry.src.js) beside it, rebuild with the esbuild line above,
copy the LICENSE files over `LICENSE` and `licenses/`, update the versions here and in THIRD_PARTY.md, run `node tools/selfcheck/p4-code.mjs`.
Highlighting is deterministic (no randomness, no clock, no network): the same code, language and theme give the same tokens.
