# Card flock tumble

Many cards tumble in from a seeded scatter above the frame and land as a block-letter mosaic of a word, which then cross-dissolves to the real text.

Card: video-shotcraft `card-flock-tumble` (1 shot), parity row `doodle-shots-motion:2.69`. Helper: `KIT.shotcards.cardFlock` in `tools/shotcards/transition.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs transition`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const flock = KIT.shotcards.cardFlock({ text: 'FLOCK', word: wordEl, x: KIT.W_ / 2, y: KIT.H_ / 2, fontSize: 0.28 * KIT.H_,
  per: 6, t0: V('word').start, t1: V('word').start + KIT.dur(1.2), seed: 4 });
function render(t) { flock.set(t); }   // needs tools/motion.js (KIT.sim)
```

## Numbers (ours; the source card gives none)

- `per` cards per letter in a 2-wide grid inside a 0.62 x 0.8 glyph box. `KIT.sim` (120 steps/s, run once) moves each card on an underdamped spring to its slot (k 90, damping ratio 0.55) with a rotation spring (k 60, 0.35), released over the first 30 % of the window; the last 0.25 s blends onto the exact slots so the end is exact.
- The word cross-dissolves in over `t1 - 0.05 .. t1 + 0.25` while the cards fade.

## Common mistakes

- Calling `cardFlock` per frame: the sim is built at creation; build it once.
- A `t1 - t0` under about 0.8 s: the cards do not settle before the blend.

[Back to the shotcards index](README.md)
