# Jump-cut punch-in

Hard cuts between framings on the beat: no travel, a small punch that settles. The cut is the move.

Card: video-shotcraft `rhythm-interrupt-moves` (1 shot), parity row `doodle-shots-motion:2.63`. Helper: `KIT.shotcards.jumpCut` in `tools/shotcards/rhythm.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs rhythm`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const cut = KIT.shotcards.jumpCut({ beats: [6.2, 6.7, 7.1].map((t) => KIT.snap(t)), zooms: [1, 1.25, 1.12], xs: [0, -0.14, 0.14], punch: 0.06 });
function render(t) { KIT.shoot(layer, cut(t)); }   // cut(t) is a KIT.shot-style state function: also usable in KIT.shot.track
```

## Numbers (ours; the source card gives none)

- Before the first beat: `zooms[0]`. At beat k it jumps to `zooms[k % n]` about `xs[k % n] x W`, punched `punch` deeper and settling over `decay` (0.25 s, power2.out).
- Pair every cut with a hit sound on the same beat (`KIT.cue`).

## Common mistakes

- Easing between the framings: that makes it a camera move, not a jump cut.
- More than three cuts a second: it stops reading as rhythm.

[Back to the shotcards index](README.md)
