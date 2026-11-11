# The Remotion renderer (optional, checkpoint 10j)

`"renderer": "remotion"` renders a film written in React (`rm/src/Film.jsx`) with Remotion. Reelwright still does the
rest: the script, voiceover, `sched`, the mix, encode, QA and the manifest. Use it when a film needs something from
the Remotion ecosystem; pvk and HyperFrames cover everything else and stay free and MIT.

## Licence: read this first

Remotion is not open source. It is free for individuals, for-profit companies with up to 3 people, and non-profits;
every other company needs a paid Company License (remotion.pro/license; currently $25 per creator per month, or
$0.01 per render with a $100 monthly minimum for automated pipelines). Using `renderer: remotion` makes you a Remotion
user. Reelwright is not affiliated with Remotion and does not grant a Remotion licence. Check
remotion.dev/docs/license. A company of 4 or more people running `reelwright all` with this renderer owns code that calls
`npx remotion render`, so Remotion's Automators plan, not only Creators, is the likely fit (our reading, not legal advice).

Reelwright never bundles Remotion: it is not in the root `package.json`, `vendor/` or CI. Each project installs it
into its own `rm/node_modules`, and only after you type `yes` to that notice. With no terminal (CI, a pipe), the renderer
prints the notice and how to install, then exits 1. It sets no licence key and passes no telemetry flag. The
scaffold's README and source files say "Built with Remotion, see remotion.pro/license".

## Opting in

```
./video.sh new my-film --renderer remotion    # project.json + rm/ (templates/remotion); nothing installed
./video.sh all my-film                         # asks once, then npm installs the pinned versions into rm/
```

Or install it yourself with `cd projects/my-film/rm && npm install`. The pinned versions are remotion 4.0.540,
@remotion/cli 4.0.540, react 19.3.1 and react-dom 19.3.1. Every `@remotion/*` package must share one exact version.
Never add `@remotion/transitions` or `@remotion/effects` (UNLICENSED on npm) or the Remotion-licensed extras.

Cost: about 250 MB of npm packages and roughly 40 s to install, once per project. Remotion's own Chrome (about
460 MB more) is not downloaded: renders use Playwright's headless shell via `--browser-executable`, the same browser
HyperFrames uses. Renders bundle the film first (about 15 s cold, a few seconds after that).

## Writing the film

- `rm/src/film.mjs` is plain ESM (no JSX) holding the moments (`at(k)`), `DUR(k)` and the SFX `cues(k)`. The renderer's
  `info` mode imports it in Node, so it cannot import Remotion or React.
- `rm/src/kit.js` is the timing core. It reads the kit data (`rm/kit-data.json`, rebuilt from `film/data.js` on every
  run) and has `V`, `W`, `WE`, `words`, `snap`, `beat`, `pulse`, `seg`, `win`, `keys`, `easing` (GSAP-style names and
  `cubic-bezier(…)`), `spring`, `u` and `safe`, named as in `KIT`.
- In `Film.jsx`, `t = useCurrentFrame() / fps` and every time comes from `film.mjs`. The root is
  `<AbsoluteFill id="stage">`, so themes paint it. Captions use the `.kit-subrow` / `.said` / `.now` markup from
  tools/kit.css, which keeps the captions gate working.
- The rules are the usual ones: no `Date.now`, `Math.random` (use `random('seed')`), timers, CSS transitions or animations,
  Tailwind `animate-*`, or R3F `useFrame`. The seekable gate scans `rm/src/**`.
- Themes: each build copies `tools/kit.css` and the generated `film/theme.css` (with inlined fonts) into
  `rm/public/`, and `src/index.js` imports both. `--style`, `brand.json` and `--formats` (`--width/--height/--fps`)
  work as for the other renderers.

## What works

| Mode | How |
|---|---|
| `info` | `film.mjs` + `kit.js` in Node → `timeline.json {DUR, FPS, cues, VO, MUSIC}` |
| `stills t,t,…` | one `remotion render --sequence --frames=a,b,…` (jpeg) of just those frames → `stills/t<time>.jpg` |
| `frames [from] [to]` | `--sequence` png, `--concurrency=PAGES`, `--muted` → `frames/frame_%06d.png` (frame 0 = t 0) |
| `encode` | pvk's `encode` (frames + `mix.wav` + subtitles), so loudness and ducking match the other renderers |
| `qa` | frame gates, plus the page gates (captions, illustrative, ai-label, overlap, tiny-text, wordy) |
| `verify` | manifest over `frames/` as usual |

Page QA works because each build writes `film/index.html` as a host for `tools/qa_page.mjs`. That page is the
bundle's own `index.html` with a `<base>` pointing at `.cache/rm-build/`. It drives the composition the way Remotion's
renderer drives its tab (`remotion_setBundleMode`, then `remotion_setFrame` and a wait for `remotion_renderReady`), and it
exposes `READY`, `render(t)`, `FILM`, `VO` and `KIT {u, safe, stage, token}`. A host screenshot at t = 7.2 s matched
Remotion's own frame 216 pixel for pixel. The host is rebuilt on every `stills` or `frames` run, at that run's size.

Determinism: `tools/selfcheck/remotion.mjs` (with `REMOTION_NODE_MODULES=<dir>`) renders 6 frames forward in one tab
and again one at a time in shuffled order, and the PNG hashes must match. Without Remotion installed, it checks the
template, the pins, the licence text, `film.mjs`/`kit.js` in Node and the no-TTY refusal, then prints SKIP.

## What doesn't

- Remotion's own audio (`<Audio>`, `<Video>` sound): renders are muted, and Reelwright's mix is the only soundtrack.
- `preview` (no live scrubber; `npx remotion studio` in `rm/` works by hand), `hdr`, `motionBlur` and `KIT.shader`
  windows, alpha output (not wired), and the frame cache (every `frames` run renders everything you ask for).
- HTML-in-canvas, WebGL effects and shader transitions need Remotion's Chrome build. They are untested on Playwright's
  shell.
- Not run on Windows (the code spawns `npx.cmd`/`npm.cmd` there). Remotion has no Windows arm64 build.
- `--lang` works through the kit data. The cue words in `film.mjs` must exist in the translated line, because the
  base-language fallback (`VO[id].base`) is not in `kit.js`.
