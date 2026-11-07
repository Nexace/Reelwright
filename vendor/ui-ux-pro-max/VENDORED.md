# ui-ux-pro-max (data only)

From [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), commit 4f2dbb6
(2026-11-08), MIT (see LICENSE). Copied unchanged from `cli/assets/data/`: `colors.csv` (192 palettes, one per product
type), `products.csv` (keywords and style per product type, same rows), `ui-reasoning.csv` (mood and anti-patterns, same
rows), `typography.csv` (74 font pairings). The skill itself, its scripts and its web-UI guidance are not vendored.

Used by `reelwright theme-brief` (tools/commands/theme-brief.mjs). Not copied into films: there is no kit.json.
Fonts are never loaded from the Google Fonts URLs in typography.csv; families map to the bundled OFL fonts in fonts/.

Updating: copy the four CSVs and LICENSE from a newer commit, update the commit above, run `node tools/selfcheck/theme-brief.mjs`.
