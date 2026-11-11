# rm/ — this film's Remotion project

Built with Remotion, see remotion.pro/license.

**Remotion is not open source.** It is free for individuals, for-profit companies with up to 3 people, and
non-profits; every other company needs a paid Company License (remotion.pro/license). Using
`"renderer": "remotion"` makes you a Remotion user. Reelwright is not affiliated with Remotion and does not grant a
Remotion licence. Check remotion.dev/docs/license. Reelwright itself never bundles Remotion: it is installed here, in
`rm/node_modules`, only after you type yes to this notice.

## Install and run

- The first `reelwright all <name>` (or `stills` / `film`) asks before installing about 250 MB of npm packages,
  pinned in `package.json`. Remotion's own Chrome is not downloaded: renders use Playwright's headless shell.
- Not in a terminal, or you said no: `cd projects/<name>/rm && npm install`, then build as usual.
- `reelwright stills <name>`, `reelwright all <name>`, `reelwright qa <name>` work as for any film.

## Files

- `src/Film.jsx` — the edit (React). `t = frame / fps`; take every moment from `src/film.mjs`.
- `src/film.mjs` — `DUR` and the SFX `cues`, plain ESM so Reelwright can read them in Node.
- `src/kit.js` — the timing core: `V`, `W`, `WE`, `words`, `snap`, `beat`, `pulse`, `seg`, `win`, `keys`,
  `easing`, `spring`, `u`, `safe`, from the kit data in `kit-data.json` (written on every build from the script).
- `src/Root.jsx` — one composition, `Film`; length, size and fps come from the kit data.
- `public/kit.css`, `public/theme.css` — copied in on every build (the project's `style` and `brand.json`).

Rules: no `Date.now`, `Math.random` (use `random('seed')`), timers, CSS transitions or animations, or `useFrame`.
Audio comes from Reelwright's mix (Remotion renders muted), so `<Audio>` in the film is not heard.
