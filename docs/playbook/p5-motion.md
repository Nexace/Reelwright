# Camera keys, time remap, one world, handoffs, callouts, steps (Phase 11, P5)

Six new kit modules. Each is a pure function of t (DOM built once, styles written from t, no clock, no `Math.random`, no state kept between
calls). Their headers are the API reference; this page is when to use each. The shuffled-seek proof, in pvk (byte for byte) and in
HyperFrames (within its raster noise), is `node tools/selfcheck/p5-motion.mjs`, fixtures in `tools/selfcheck/p5/`.

| Module | Load after | Gives |
|---|---|---|
| `tools/p5-camera.js` | engine.js, shots.js | `KIT.shot.keys`, `monoZoom`, `lens`, `dollyZoomReal`, `withShake`, `KIT.shakeNoise`, `KIT.project` |
| `tools/p5-time.js` | engine.js, shots.js (+ p5-camera.js for `tour`) | `KIT.timeRemap`, `KIT.world` |
| `tools/p5-morph.js` | engine.js | `KIT.morph.handoff`, `KIT.morph.coverShape` |
| `tools/p5-doodle.js` | doodle.js, doodle2.js, layouts.js, p5-camera.js | `D.callout`, `D.steps`, `KIT.layout.kinetic({ style: 'drawn' })` |

## Camera keys, log2 zoom, mono zoom

`KIT.shot.keys([{ t, z, x, y, rz, ease }, ...], { log = true, mono = false })` is a camera you author as keys. The ease on a key shapes the move that
arrives at it. A field a key does not name carries over from the key before. Zoom is interpolated in log2, so a 1 to 4 push runs at one steady rate (2 is
the middle, not 2.5); `{ log: false }` is the old linear zoom. `mono: true` keeps z between the two keys of the segment, so a `back.out` ease cannot zoom past
a key. `KIT.shot.monoZoom(z0, z1, p)` is the same log blend for your own curves. Anything `t => state` is already an authored path: `KIT.shot.path(fn)` wraps it.

## A real dolly-zoom, solved per frame

`KIT.shot.dollyZoom` (shots.js) is the layer fake: the background scales, nothing has depth. `KIT.shot.dollyZoomReal(planes, { t0, t1, dolly })` takes at
least two depth planes `[{ el, z }]` (z = 1 is the subject, bigger is farther): the camera dollies by q while the lens zooms by (1 - q), so the subject plane
keeps its size (checked to 1e-12 for every t) and a plane at depth d ends at `(1 - q) / (1 - q / d)`: far planes shrink, near planes grow. One plane throws:
there is nothing to move against. `KIT.shot.lens` is the other half, a pure lens zoom with no depth change.

## Shake as gradient noise

`KIT.shakeNoise(t, t0, { amp, dur, attack, hz, rot, seed })` is smooth noise (seeded Perlin, no `Math.random`), a 0.04 s smoothstep attack, then a squared
decay `(1 - u)^2`, with a rotation about the centre on the same envelope. It is exactly zero outside `[t0, t0 + dur]`. `KIT.shot.withShake(shot, t0, opts)` adds it
to any shot. `K.shake` (exponential sines) is still the right crash-zoom stop; use the noise one for a hand-held hit or an explosion.

## Time remap with speed keys

`KIT.timeRemap([{ at: 0, speed: 1 }, { at: 2, speed: 0.25, ramp: 0.4 }, { at: 4, speed: 0, keepsMoving: true }])` gives `at(t)`, the source time
shown at output time t. Speed changes along a smoothstep over `ramp` seconds that starts at the key (the integral is closed form: no sampling, any t in any
order). `filmOf(srcT)` is the inverse: the output time at which source time srcT is on screen, which is how you place a cue on a remapped take. `freezes` lists
the output windows where the speed is under 0.01. **Dead-air rule:** a speed under 0.01 throws unless that key says `keepsMoving: true`, which you say only
when something else on screen keeps moving during the freeze (a camera drift, a particle, a pulse).

## One world

An anti slide-deck recipe, `docs/recipes/one-world.md`: `KIT.world({ regions })` puts every beat on one canvas as a box in world px; `world.tour([{ at, region }])`
is a camera through them (log2 zoom, per-leg ease); `world.shoot(t, tour)` applies it. What lies between two boxes is on screen while the camera passes, so there is
no cut to hide.

## Shape handoff

`KIT.morph.handoff({ from, to, t0, t1 })`: one outline leaves the box `from`, stretches up to 1.35x along its path (area kept), and lands exactly on `to`
(the stretch is 0 at both ends), so the real target drawn there takes over with no seam. `KIT.morph.coverShape({ from, t0, t1, shape })` grows a rect or a circle
from a box until it covers every pixel of the frame, which is the colour the next scene sits on. Both hold their ends before t0 and after t1.

## Callout

`D.callout({ anchor, cam, label, in })`: a dot lands (0.22 s), a hand-bent leader line is drawn (0.35 s), the label is written in pen lettering. Give `cam` (a
shot, tour or `keys` function) and the callout follows the point: `KIT.project(state, [x, y])` is where a world point lands on screen under a camera state (z, x,
y and rz; the 3D tilts are ignored), checked against the real `KIT.shoot` in the self-check.

## One score: still, timelapse, step sheet

`D.steps(marks, t0, t1, { parent })` wraps `D.score`: `score.set(t)` is the timelapse, `still()` the finished picture, `phases` the teaching phases (give marks a `phase`,
or they split evenly over block-in, outline, detail, finish), `steps` `[{ n, phase, ids, t }]`, and `sheet(parent, { cols, cell })` a contact sheet with one cell per step, each
showing the picture exactly as it stands when that phase is done, captioned `STEP n: PHASE`. The sheet draws its own copies: the film's marks are untouched.

## Drawn kinetic type

`KIT.layout.kinetic({ style: 'drawn', line, accent, in, out })` writes every word of the VO line with the pen (`D.letters`) on its spoken start; the word pops 1 to
1.08 to 1 as the last stroke lands. Words are wrapped to the safe box at the largest size that fits; characters the pen font lacks (it has A to Z, 0 to 9 and `. , ! ? - ' : -`)
are dropped, so a `$` or `%` does not draw. Without `style: 'drawn'` the layouts.js layout runs unchanged.

## A finding: overlays above a `KIT.shoot` layer

`KIT.camCSS` always writes `rotateY(0deg) rotateX(0deg)`, which Chromium treats as a 3D transform, so the shot layer is composited. With several overlays (SVG callouts, a step sheet,
drawn type) stacked over that layer, the pixels of the overlays depended on which frames had been drawn before in the same page (found by the doodle fixture: one frame of twelve
differed between a forward and a shuffled pass, DOM identical). Moving the same scene with a plain 2D `translate scale` made every frame identical. Until `camCSS` leaves the zero
rotations out when `rx` and `ry` are 0 (a patch to `tools/shots.js`, in the P5 report: it changes no pixels on its own but is a shared file), keep overlays inside the shot layer
or move the scene with a 2D transform when you also stack overlays above it. The fixtures say so where they do.
