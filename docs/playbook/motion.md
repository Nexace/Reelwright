# Motion, transitions and camera (checkpoint 10e)

Four kit modules, each a pure function of t (build the DOM once, write styles from t, no clocks, no `Math.random`, no state
between calls). Their headers are the full API reference; this page is when to reach for each and the rules the tests found.

| Module | Load (HyperFrames `kit/…`; pvk `../../../tools/…`) | Gives |
|---|---|---|
| `tools/path.js` | after `paths/paths.js` (vendor/paths, @remotion/paths MIT) | `KIT.path(d)` → `{ len, at(p), slice }`, `.draw`, `.morph`, `.morphMany`, `.follow`, `.fromPoints` |
| `tools/transitions.js` | after engine.js | `KIT.transition(type, { from, to, at, dur, dir, x, y, seed, color, cue })` → `{ set(t) }`, 18 types |
| `tools/shots2.js` | after shots.js | `KIT.shot.tour`, `planes`, `parallax`, `tiltReveal`, `tabletopDrop`, `droneDive`, `graze`, `steepTilt` (+ghosts), `explode`, `bulletTime`, `rackFocus`, `dof` |
| `tools/motion.js` | after engine.js | `KIT.rate.*` (Manim rate functions), `KIT.indicate.*`, `KIT.typewriter`, `KIT.sim` |

`projects/motion-hf` (`"ci": true`) is the worked example: a path drawn and ridden, an iris, a typewriter with a mistake and a
circumscribe, a light leak, three cards on depth planes flown by a tour, a brush wipe, and balls from `KIT.sim`.

## Paths — `KIT.path`

- Motion along a path is `KIT.path.follow(el, path, p)`: it replaces GSAP MotionPath, which the `seekable-runtimes` gate bans
  (it differed under shuffled seeks). `fromPoints(pts, { curviness })` replaces MotionPath's "path from points".
- `draw(pathEl, p)` is the draw-on; `morph(a, b, p)` morphs two paths of any shape (exact at p = 0 and 1); `morphMany` runs
  through several. `KIT.path.lib` is the whole @remotion/paths API (`warpPath`, `getSubpaths`, …).
- `follow` measures the element once: create it at its final size. It does not size SVG children.

## Transitions — `KIT.transition`

Scenes are full-stage layers (`.scene`); a transition owns their `transform`, `clip-path`, `mask`, `filter`, `opacity`,
`z-index` and `visibility`, so style the scene's children, not the layer. Window `[at, at + dur]`: before it `from` shows,
after it `to` shows. Chains work (a layer can be the `to` of one and the `from` of the next). Call every `set(t)` in `render(t)`.

Types: `cut` (`none`), `fade`, `fadeThrough`, `slide`, `push`, `wipe`, `barnDoor`, `blinds`, `clockWipe`, `iris`, `flip`, `cube`,
`zoom`, `pushCut`, `flash`, `lightLeak`, `brush`, `glitch`, or a function `(p, ctx) => void` of your own. `cue: 'whoosh'` adds
the sound at `at`. Seeded looks (`brush`, `glitch`, `lightLeak`) change with `seed`, never between frames.
`brush` uses a `clip-path: path()` of seeded bristles (an SVG mask would need an async decode); `glitch` swaps seeded bands
between the two layers (it cannot shift one band of a single layer); `clockWipe` always turns clockwise from 12.

## Camera — `KIT.shot` (shots2)

- `tour(poses)` flies through `[{ t, state }]` and lands exactly on each pose. Feed it to `KIT.shoot` or to `planes`.
- `planes([{ el, z }], cam)`: true parallax from one camera (z = 1 focal plane, bigger = farther). Each plane gets
  `--kit-line` = S^0.35 / S: multiply stroke widths inside a plane by it so lines thicken as S^0.35, not S.
- `bulletTime(o)` returns two clocks: `world(t)` freezes inside the window while `cam(t)` keeps orbiting — feed `world(t)`
  to the scene's own animation. `rackFocus(near, far)` moves the blur; `dof(o)` returns CSS for a tilted-page focus band.
- Timings and angles of tiltReveal, tabletopDrop, droneDive, graze and explode are our choices (the source cards give none);
  steepTilt's −60° and bezier(.3,.12,.72,.9) and the 0.35 / 0.7 / 1.4 parallax coefficients come from video-shotcraft.

## Motion — rates, indications, typewriter, sim

- `KIT.rate.*` are Manim CE's rate functions (and ManimGL's `overshoot`). `KIT.rate.smooth` is Manim's sigmoid; the cubic
  is `KIT.rate.smoothstep` (= `KIT.math.ease.smooth`).
- `KIT.indicate.indicate / flash / focusOn / circumscribe / wiggle / blink / applyWave / showPassingFlash(el, { at, dur })`
  measure `el` once at creation: create them after layout and fonts. Two effects writing the same property on one element fight.
- `KIT.typewriter(el, text, { at, cps, mistakes: [{ index, wrong }] })` types, mistypes, backspaces and retypes; `end` is
  when the text is complete.
- `KIT.sim(step, state0, { dt, dur })` runs a fixed-step simulation once at load and interpolates samples: physics you can
  seek (bouncing, springs, particles). Never integrate from the previous frame in `render(t)`.

## Verified (`node tools/selfcheck/motion.mjs`, CI on macOS, Windows, Ubuntu)

One fixture per module (`tools/selfcheck/motion/*.mjs`), each in both renderers: 12 seeks forward on one page, the same
times shuffled on a fresh browser. pvk frames are byte-identical; HyperFrames frames match within its software-raster noise
(≤ 64 px off by more than 2/255, the `.github/framediff.py` rule). Each fixture's `check()` also asserts the module's pure
parts (path endpoints and lengths, transition windows and resets, preset holds before/after their windows and exact tour
poses, rate-function endpoints, typewriter text, sim samples in shuffled order).

**Rotation in HyperFrames.** A rotated element (e.g. `KIT.indicate.wiggle`) re-rasters differently depending on what the page
drew before. Measured on macOS at 640×360: 59 px off at the sampled frame (same over 3 runs), 120–165 px with other wiggle
angles and sizes. The motion fixture states a 200 px limit for frames inside its wiggle window (`hfNoise`) and keeps 64 px
elsewhere; pvk stays byte-identical, so the module is pure. Expect the same noise in any HyperFrames film that rotates.

Not checked by eye beyond the demo's stills: the look of `explode`, the `dof` band and every transition type at 9:16.
