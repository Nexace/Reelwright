# Timing, colour, noise, shapes, text and a player (Phase 11, P9)

Pure browser modules (no clock, no React): the same `t` gives the same answer in any order. Each file's header comment is the API reference.
Proof: `node tools/selfcheck/p9-motion.mjs time shapes text player props` (shuffled seeks in pvk and HyperFrames, plus assertions on the pure parts),
`node tools/selfcheck/p9-lint.mjs`. All of them are copied into the HyperFrames kit automatically (`tools/*.js`).

| Remotion | Reelwright | File |
|---|---|---|
| `interpolate()` with `extrapolateLeft/Right` (`extend`, `clamp`, `identity`, `wrap`) | `KIT.interpolate(t, input, output, { left, right, easing })` | `tools/p9-time.js` |
| `interpolateColors()` (rgb, hsl, oklab) | `KIT.color.interpolate(t, input, colors, { space })`, `KIT.color.mix(a, b, p, { space })` | `tools/p9-time.js` |
| `random(seed)` | `KIT.random(seed)` (string or number; same seed, same number). `reelwright rand-lint` flags `Math.random`, clocks and timers in a film's scripts (opt-in, not in `qa`) | `tools/p9-time.js`, `tools/commands/rand-lint.mjs` |
| `<Sequence from trimBefore durationInFrames playbackRate loop freeze>`, `<Loop>`, `<Freeze>` | `KIT.seq({ from, dur, trim, rate, loop, freeze })`: `s(t)` is the local time or `null` | `tools/p9-time.js` |
| `linearTiming`, `springTiming`, custom timing | `KIT.timing.linear / spring / custom` → `{ dur, at(p) }` (spring `dur` = settle time) | `tools/p9-time.js` |
| `<TransitionSeries>` (+ `Overlay`, `offset`) | `KIT.tseries([{ seq }, { transition }, { seq }, { overlay }, …])` → starts, `total = sum − overlaps`, `transitions[i].progress(t)` | `tools/p9-time.js` |
| `@remotion/noise` `noise2D/3D/4D` | `KIT.noise2/3/4(seed, x, y, z, w)` in [-1, 1] (simplex, seeded through Alea) | `tools/p9-time.js` |
| `@remotion/shapes` `makeRect … makeHeart, makeArrow, makeCallout, makeSpark` | `KIT.shape.rect / circle / ellipse / triangle / star / polygon / pie / heart / arrow / callout / spark` → `{ path, width, height, transformOrigin }`; `KIT.shape.svg(parent, shape)` | `tools/p9-shapes.js` |
| `@remotion/layout-utils` `measureText`, `fitText`, `fitTextOnNLines`, `fillTextBox`, `measureDomNodes` | `KIT.measureText`, `KIT.fitText`, `KIT.fitTextOnNLines`, `KIT.fillTextBox`, `KIT.measureDom` | `tools/p9-text.js` |
| `<Player>` / `PlayerRef` / events / `inFrame` `outFrame` / `Thumbnail` | `KIT.player({ render, fps, dur, loop, inFrame, outFrame, audio, … })` → `play pause seekTo getCurrentFrame setVolume setPlaybackRate on(event) thumbnail`; `KIT.player.controls(ref)` | `tools/p9-player.js` |
| `getInputProps()` / `defaultProps` | `KIT.props()` (variables + `window.PROPS`, frozen) | `tools/p9-props.js` |

## Notes that bite

- `interpolate` with `left`/`right: 'extend'` keeps going along the first or last segment; a custom easing *function* is called with the raw
  progress (as Remotion does), a `KIT.easing` *name* clamps inside the segment and carries on linearly outside it.
- `KIT.seq` works in seconds on the film clock. `dur` is the slot's length on the film clock; `rate` scales content time; `loop: { every, times }`
  wraps content time (`every` in content seconds); `freeze` holds one local time. `s.info(t)` also gives the loop iteration.
- `KIT.tseries` refuses a transition longer than a neighbouring scene (Remotion does too). An overlay is centred on the cut and never shortens.
- Noise: the algorithm is simplex-noise 4.0.1's, seeded the way `@remotion/noise` does (Alea). It was not compared number for number with
  `@remotion/noise` (Remotion is not installed here): the self-check proves range, smoothness, determinism and seed separation.
- The player only calls `render(t)`; put it in the film page (`<script src="kit/p9-player.js">`) and mount `KIT.player.controls(ref)`, or drive it from any
  page that has `window.render`. It is not a React component: wrap it yourself if an app needs one.
- `rand-lint` ignores comments and strings and skips `kit-*.js` / `data.js`; it is a lint, not a parser.
