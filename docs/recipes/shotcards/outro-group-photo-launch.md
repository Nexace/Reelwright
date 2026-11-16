# Group photo launch

Representatives (avatars, logos) fly in from outside the frame and ring the wordmark, landing with overshoot, then bob.

Card: video-shotcraft `outro-group-photo-launch` (1 shot), parity row `doodle-shots-motion:2.56`. Helper: `KIT.shotcards.groupLaunch` in `tools/shotcards/outro.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs outro`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const group = KIT.shotcards.groupLaunch({ wordmark: wordEl, reps: [...avatars], cx: KIT.W_ / 2, cy: KIT.H_ / 2, rx: 0.34 * KIT.W_, ry: 0.3 * KIT.H_,
  t0: V('end').start, t1: V('end').end, seed: 2, flight: KIT.dur(0.7) });
function render(t) { group.set(t); }
```

## Numbers (ours; the source card gives none)

- Seeded start points on a circle of 0.75 of the diagonal, a seeded order (`KIT.stagger`), `back.out(1.4)` landing, seeded spin-out, scale 0.35 to 1; after landing each bobs 4 px x K.u. The wordmark pops with `back.out(2)` at 25 % of the window.
- Targets are evenly spaced on the ellipse, starting at 12 o'clock.

## Common mistakes

- More than about 12 reps on a 16:9 frame: they overlap; use two rings (two helper calls).
- Using real user avatars: they are the user's media; do not fetch them at render time.

[Back to the shotcards index](README.md)
