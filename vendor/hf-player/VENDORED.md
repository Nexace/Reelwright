# Vendored: HyperFrames player

- Upstream: https://github.com/heygen-com/hyperframes (`packages/player`)
- Version: **0.9.19**, the published npm tarball `hyperframes-player-0.9.19.tgz` (`npm pack @hyperframes/player@0.9.19`,
  integrity `sha512-oHbUvaAqUc/DEyeLoHg3Z1RxiuYICLqlamXvShrNnYNPig1/ZWxVEZ66dFiKu/jl4+UdSDLE45+FIFIXQ39o8w==`)
- License: Apache 2.0, see [LICENSE](LICENSE) (Copyright 2026 HeyGen, Inc.). Upstream has no `NOTICE` file.

## What we took

From the tarball's `dist/`, byte for byte:

- `hyperframes-player.global.js` (117,318 bytes, sha256 `faa8cd344b306de1351e3bf4ab9a32b713464b68656b4a23ce8bd359a9dc222d`):
  the `<hyperframes-player>` web component as a classic script (registers the element, `window.HyperframesPlayer`).

Left out (the package is 555 KB unpacked): the ESM/CJS builds, `.d.ts` files, `slideshow/`, `README.md`. The player's
one dependency, `@hyperframes/core`, is not vendored: the player only loads its runtime (from jsdelivr) for a page that
has `window.__timelines` but never becomes ready through it. Reelwright films become ready on the first poll through
the player's direct-timeline path (`__timelines.main` with `duration/time/seek/play/pause`, set by `KIT.start`), so the
runtime is never fetched; `tools/commands/embed.mjs` checks that the page it writes makes no network request.

## What we changed

Nothing. If you change the file, put this at its top, keeping upstream's copyright:
`// Changed from upstream HyperFrames (Apache-2.0, Copyright HeyGen): <what and why>` and list the change here.

## How it is used

`reelwright embed <project>` (tools/commands/embed.mjs) inlines this file into `<project>/out/embed.html`, next to the
film page (as the player's `srcdoc`) and the mix. `engine.js`'s `__timelines.main.play()` is a no-op (renders only
seek), so the film page gets a small real-time clock for `play()`/`pause()` there, not in this file.

## Updating

`npm pack @hyperframes/player@<version>` in a scratch folder, copy `dist/hyperframes-player.global.js` and `LICENSE`
over these, update the version, integrity, size and hash above, then `node tools/selfcheck/embed.mjs` (it builds
an embed of a fixture film and plays it).
