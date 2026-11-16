# Third-party notices: shiki bundle

`shiki.min.mjs` is one esbuild bundle. Every component below is MIT; the licence texts are in [LICENSE](LICENSE) and [licenses/](licenses/).

| Component | Version | Notice |
|---|---|---|
| shiki / @shikijs/core / @shikijs/engine-javascript / @shikijs/types | 3.23.0 | Copyright (c) 2021 Pine Wu, (c) 2023 Anthony Fu. https://github.com/shikijs/shiki |
| @shikijs/vscode-textmate | 10.1.0 | Copyright (c) Microsoft Corporation. https://github.com/shikijs/vscode-textmate |
| oniguruma-to-es | 4.3.6 | Copyright (c) 2024-2026 Steven Levithan. https://github.com/slevithan/oniguruma-to-es |
| oniguruma-parser | 0.12.2 | Copyright (c) 2025-2026 Steven Levithan. https://github.com/slevithan/oniguruma-parser |
| regex, regex-recursion, regex-utilities | 6.1.0, 6.0.2, 2.3.0 | Copyright (c) Steven Levithan. https://github.com/slevithan/regex |
| hast-util-to-html, hast-util-whitespace, property-information, stringify-entities, character-entities-html4, character-entities-legacy, comma-separated-tokens, space-separated-tokens, html-void-elements, zwitch, ccount | as resolved by `shiki@3.23.0` | MIT, unified collective / Titus Wormer. Pulled in by `@shikijs/core`; texts for the two largest in `licenses/`. |
| `@shikijs/langs` grammars (javascript, typescript, python, json, shellscript/bash, html, css) | 3.23.0 | TextMate grammars converted to JSON by the shiki project from https://github.com/shikijs/textmate-grammars-themes, where each grammar's upstream licence is listed (the JS/TS grammars come from microsoft/TypeScript-TmLanguage, Python from MagicStack/MagicPython, json/shell/html/css from microsoft/vscode; all MIT). |
| `@shikijs/themes` `github-light`, `github-dark` | 3.23.0 | From primer/github-vscode-theme (MIT), Copyright (c) 2018 GitHub Inc. |

The row "grammars" lists upstream licences from the shiki project's own table; re-check that table when the bundle is updated.
