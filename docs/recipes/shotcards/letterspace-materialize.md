# Letterspace materialize

Tracking in: the title starts widely spaced, faint and blurred, and closes up to its resting spacing as it rises into place.

Card: video-shotcraft `letterspace-materialize` (1 shot), parity row `doodle-shots-motion:2.47`. Helper: `KIT.shotcards.letterspace` in `tools/shotcards/opening.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs opening`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const track = KIT.shotcards.letterspace(titleEl, { t0: V('title').start, t1: V('title').start + KIT.dur(0.9), from: 0.5, to: 0.04, rise: 0.25, blur: 6 });
function render(t) { track.set(t); }   // titleEl: centred text, box-sizing: border-box
```

## Numbers (ours; the source card gives none)

- `letter-spacing` goes `from` to `to` em (power3.out); `padding-left` takes the same value so the centred text does not drift (CSS adds the spacing after the last letter too).
- Opacity 0 to 1 over the first half, `translateY` rise em to 0, blur px to 0.

## Common mistakes

- A tween in CSS `transition`: not seekable; this is a function of t.
- Setting `letter-spacing` elsewhere on the element: the helper owns it, with `padding-left`, opacity, transform and filter.

[Back to the shotcards index](README.md)
