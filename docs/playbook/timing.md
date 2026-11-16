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
branches on it: `if (PROJECT.composition === 'square') …`. A still is a composition with a short film: `reelwright sched <project> --composition cover` first
(`stills` takes the composition's size but does not re-schedule; `film` and `all` run `sched` themselves), then `reelwright stills <project> 1.5 --composition cover`.

Not a second engine entry: `tools/engine.js` still starts one film per page, so every composition shares one `film.js` and one set of recordings.
`project.json` is rewritten for the run and put back byte for byte when the process exits (a kill leaves `project.json.composition-bak`, which the next
`--composition` run restores; a command that writes `project.json` itself, like `beats import`, keeps its write). Do not run two compositions of the same
project at the same time; use `--formats` for the same film in several sizes.

## Timeline extras — custom eases, reverse segments, path motion, retiming

Load `tools/easing-extra.js` after `engine.js` (and `tools/transitions.js` for `KIT.cut`). All of it is opt-in and a pure
function of `t`; nothing changes without these calls. Proof: `node tools/selfcheck/timeline.mjs` (assertions on the pure
parts, then shuffled seeks in pvk and HyperFrames).

| API | What it does |
|---|---|
| `KIT.easing.svg('M0,0 C…')` | an ease from an SVG path of cubic `C` (or line `L`) segments: x is progress, y the value, x resolved by binary search. The x controls must not go backwards. GSAP's `CustomEase.create` model. Returns 0 at p ≤ 0 and 1 at p ≥ 1; between them the path's own curve (overshoot allowed). |
| `KIT.keys(t, pts, eases, { easeReverse: true \| 'outExpo' })` | on a segment whose value falls, `true` mirrors that segment's ease (`1 − e(1 − s)`, so a ping-pong repeats the forward pass at the mirrored time) and a name uses that ease as the reverse. Ascending segments keep their ease. |
| `KIT.path(d \| [[x, y], …], { alignOrigin, autoRotate, start = 0, end = 1, curviness })` | motion along a path. `at(p)` → `{ x, y, angle }` at the `start`..`end` fraction (tangent by finite difference; `autoRotate: true` or a number of degrees); `place(el, p)` puts `alignOrigin` of the element on the point and rotates it there. A points array is smoothed by `curviness` (0 = straight). `KIT.path(d)` without options is unchanged. |
| `KIT.range(a, b).retime('reverse' \| 'mirror' \| rate)` | a pure `t → t'` remap: `'reverse'` and `'mirror'` give `a + b − t` (mirror is the ping-pong name), a number is a playback rate (`0.5` = half speed). Feed the result to `KIT.keys`; there is no new sampler. |

```js
const ease = KIT.easing.svg('M0,0 C0.2,0 0.3,1 1,1');
const arc = KIT.path('M80 320 C 200 40 480 340 600 80', { autoRotate: true, start: 0.05, end: 0.95 });
const ping = KIT.range(2, 4).retime('mirror');
render(t) {
  arc.place(dot, ease(KIT.seg(t, 2, 4)));
  dot.style.opacity = KIT.keys(ping(t), [[2, 0], [3, 1], [4, 0]], [null, null], { easeReverse: true });
}
```

The path form measures a hidden `SVGPathElement` with `getTotalLength` / `getPointAtLength` (deterministic in headless
Chrome) and caches one element per `d`; build it at load, not per frame. Cut-centred transition windows are
`KIT.cut` / `KIT.progress` — see [shader-transitions](shader-transitions.md#cut-centred-windows--kitcut-kitprogress).

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
