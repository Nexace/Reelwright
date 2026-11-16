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

## Style, crop, caption and composition helpers

Clean-room implementations of what Remotion documents publicly (no Remotion code). Proof: `node tools/selfcheck/remotion-helpers.mjs` (exact numbers, pixels, shuffled seeks in pvk and HyperFrames).

| Remotion | Reelwright | File |
|---|---|---|
| `posterize` (stepped look) | `KIT.posterize(t, fps)` → `floor(t · fps) / fps`; `KIT.interpolate(t, in, out, { posterize: fps })` | `tools/timing.js` |
| `interpolate` string outputs (`"20deg"`, `"0px 0px"`, `"50% 50%"`, transform-origin, `"400"` font-weight) and colours | `KIT.interpolate(t, [0, 1], ['0deg', '90deg'])` → `'45deg'`; the outputs share their text, the numbers are interpolated one by one (easing, extrapolation and `posterize` as for numbers); `"#f00"`, `rgb()`, `hsl()` and named colours go through `KIT.color` | `tools/timing.js` |
| `<Series>`, `<Series.Sequence offset>` | `KIT.series([{ dur, offset }])` → `{ scenes: [{ start, end, dur, seq }], total, active(t) }`; a scene starts where the last ended plus its `offset` (negative = overlap); `seq` options pass through | `tools/timing.js` |
| `interpolateStyles`, `makeTransform` | `KIT.interpolateStyles(t, [0, 1], [styleA, styleB], opts)` → a style object for `KIT.css(el, …)`; `KIT.makeTransform([{ rotate: 45 }, { translateX: 10 }, { scale: 1.5 }])` → `'rotate(45deg) translateX(10px) scale(1.5)'` | `tools/styles.js` |
| `cropLeft / cropRight / cropTop / cropBottom` | `KIT.crop(el, { left, right, top, bottom })` (ratios 0..1, a `clip-path: inset(…)`); animate it by calling it from `render(t)` | `tools/styles.js` |
| `@remotion/rounded-text-box` | `KIT.roundedTextBox(el, { radius, pad, color })` measures each line of the text and puts one rounded outline (an `<svg>` path) behind it; call it at load, after fonts are ready, before the element is animated. `KIT.roundedTextBox.outline(lines, { radius, pad })` is the pure geometry | `tools/text-box.js` |
| `Caption` JSON (`{ text, startMs, endMs, timestampMs, confidence, pageBreakAfter }`) | `toCaptions(words)` / `fromCaptions(json)` in `tools/captions.mjs`; `reelwright captions <project> --format remotion` writes `captions.json`, `--from file.json` reads one | `tools/captions.mjs` |
| `<Composition id>` / `<Still>`, several per project | `"compositions": [{ "id": "square", "width": 1080, "height": 1080 }]` in `project.json` and `--composition <id>` (below) | `tools/compositions.mjs` |

Load `tools/styles.js` after `timing.js`; `tools/text-box.js` after `engine.js`.

### Compositions: several films or stills in one project

`project.json` takes `"compositions": [{ "id": "square", "width": 1080, "height": 1080, "out": "out/square.mp4", "lines": [...] }, …]`. Any command with
`--composition <id>` (`film`, `stills`, `all`, `frames`, `encode`, …) runs the project with that entry's keys laid over `project.json`: a shallow merge, so a
`lines` array replaces the whole script, and `out` defaults to `<out>-<id>.mp4`. The film sees the id as `PROJECT.composition`, so `film.js` (or `hf/film.js`)
branches on it: `if (PROJECT.composition === 'square') …`. A still is a composition with a short film and `reelwright stills <project> 1.5 --composition cover`.

Not a second engine entry: `tools/engine.js` still starts one film per page, so every composition shares one `film.js` and one set of recordings.
`project.json` is rewritten for the run and put back byte for byte when the process exits (a kill leaves `project.json.composition-bak`, which the next
`--composition` run restores). Do not run two compositions of the same project at the same time; use `--formats` for the same film in several sizes.

## Notes that bite

- `interpolate` string outputs read numbers with an optional sign and decimals (no exponents, no `calc()`); every output must have the same text between its
  numbers (`'10px'` to `'20%'` is refused). `translate3d(...)`-style names work because their digit is the same in every output.
- `KIT.crop` cuts with `clip-path`, so the element keeps its layout box; Remotion's crop on media also rescales the visible part, which you do with `KIT.fit` or CSS.
- `KIT.roundedTextBox` reads the layout once. Text that reflows later (a font loading late, a changed width) needs another call; remove the old `svg` first.

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
