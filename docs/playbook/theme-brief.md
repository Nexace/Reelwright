# Theme from a brief

`reelwright theme-brief "<what the product is>" [name]` drafts `themes/<name>.css` from a one-line brief, offline.
It matches the brief against 192 product types from the ui-ux-pro-max data (`vendor/ui-ux-pro-max/`, MIT), takes that
type's palette, picks the font pairing whose mood fits the type's typography mood, maps both fonts to the bundled OFL
families (a family we don't bundle becomes the nearest one we do), and prints the type's anti-patterns ("avoid: …").
Words are weighted by rarity, so "budget" or "meditation" decides the match, not "app".

The result is a starting point on the `clean` or `dark-tech` base, like `theme-from`: look at the stills, then edit it.
Use it when none of the bundled themes fits the product. Only 17 of the 74 pairings use two bundled fonts; the rest
get a stand-in, which the printout names. `node tools/selfcheck/theme-brief.mjs` checks it.
