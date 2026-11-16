# Timing, colour, noise, shapes, text and a player (Phase 11, P9)

Pure browser modules (no clock, no React): the same `t` gives the same answer in any order. Each file's header comment is the API reference.
Proof: `node tools/selfcheck/remotion-kit.mjs time shapes text player props` (shuffled seeks in pvk and HyperFrames, plus assertions on the pure parts),
`node tools/selfcheck/rand-lint.mjs`. All of them are copied into the HyperFrames kit automatically (`tools/*.js`).

| Remotion | Reelwright | File |
|---|---|---|
| `interpolate()` with `extrapolateLeft/Right` (`extend`, `clamp`, `identity`, `wrap`) | `KIT.interpolate(t, input, output, { left, right, easing })` | `tools/timing.js` |
| `interpolateColors()` (rgb, hsl, oklab) | `KIT.color.interpolate(t, input, colors, { space })`, `KIT.color.mix(a, b, p, { space })` | `tools/timing.js` |
| `random(seed)` | `KIT.random(seed)` (string or number; same seed, same number). `reelwright rand-lint` flags `Math.random`, clocks and timers in a film's scripts (opt-in, not in `qa`) | `tools/timing.js`, `tools/commands/rand-lint.mjs` |
| `<Sequence from trimBefore durationInFrames playbackRate loop freeze>`, `<Loop>`, `<Freeze>` | `KIT.seq({ from, dur, trim, rate, loop, freeze })`: `s(t)` is the local time or `null` | `tools/timing.js` |
| `linearTiming`, `springTiming`, custom timing | `KIT.timing.linear / spring / custom` → `{ dur, at(p) }` (spring `dur` = settle time) | `tools/timing.js` |
| `<TransitionSeries>` (+ `Overlay`, `offset`) | `KIT.tseries([{ seq }, { transition }, { seq }, { overlay }, …])` → starts, `total = sum − overlaps`, `transitions[i].progress(t)` | `tools/timing.js` |
| `@remotion/noise` `noise2D/3D/4D` | `KIT.noise2/3/4(seed, x, y, z, w)` in [-1, 1] (simplex, seeded through Alea) | `tools/timing.js` |
| `@remotion/shapes` `makeRect … makeHeart, makeArrow, makeCallout, makeSpark` | `KIT.shape.rect / circle / ellipse / triangle / star / polygon / pie / heart / arrow / callout / spark` → `{ path, width, height, transformOrigin }`; `KIT.shape.svg(parent, shape)` | `tools/shapes.js` |
| `@remotion/layout-utils` `measureText`, `fitText`, `fitTextOnNLines`, `fillTextBox`, `measureDomNodes` | `KIT.measureText`, `KIT.fitText`, `KIT.fitTextOnNLines`, `KIT.fillTextBox`, `KIT.measureDom` | `tools/text-measure.js` |
| `<Player>` / `PlayerRef` / events / `inFrame` `outFrame` / `Thumbnail` | `KIT.player({ render, fps, dur, loop, inFrame, outFrame, audio, … })` → `play pause seekTo getCurrentFrame setVolume setPlaybackRate on(event) thumbnail`; `KIT.player.controls(ref)` | `tools/player.js` |
| `getInputProps()` / `defaultProps` | `KIT.props()` (variables + `window.PROPS`, frozen) | `tools/props.js` |

## Notes that bite

- `interpolate` with `left`/`right: 'extend'` keeps going along the first or last segment; a custom easing *function* is called with the raw
  progress (as Remotion does), a `KIT.easing` *name* clamps inside the segment and carries on linearly outside it.
- `KIT.seq` works in seconds on the film clock. `dur` is the slot's length on the film clock; `rate` scales content time; `loop: { every, times }`
  wraps content time (`every` in content seconds); `freeze` holds one local time. `s.info(t)` also gives the loop iteration.
- `KIT.tseries` refuses a transition longer than a neighbouring scene (Remotion does too). An overlay is centred on the cut and never shortens.
- Noise: the algorithm is simplex-noise 4.0.1's, seeded the way `@remotion/noise` does (Alea). It was not compared number for number with
  `@remotion/noise` (Remotion is not installed here): the self-check proves range, smoothness, determinism and seed separation.
- The player only calls `render(t)`; put it in the film page (`<script src="kit/player.js">`) and mount `KIT.player.controls(ref)`, or drive it from any
  page that has `window.render`. It is not a React component: wrap it yourself if an app needs one.
- `rand-lint` ignores comments and strings and skips `kit-*.js` / `data.js`; it is a lint, not a parser.
