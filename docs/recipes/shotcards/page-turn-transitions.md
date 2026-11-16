# Page turn

A page hinged on the side opposite the motion swings over like a book page, with fold shading. (The barn-door split of this card is `KIT.transition('barnDoor')`.)

Card: video-shotcraft `page-turn-transitions` (1 shot), parity row `doodle-shots-motion:2.74`. Helper: `KIT.shotcards.types.pageTurn` in `tools/shotcards/transition.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs transition`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const turn = KIT.shotcards.transition('pageTurn', { from: pageA, to: pageB, at: V('next').start, dur: KIT.dur(0.9), dir: 'left' });
function render(t) { turn.set(t); }   // dir: left | right | up | down
```

## Numbers (ours; the source card gives none)

- `from` is on top, rotated about the hinge edge (a translate pair inside `perspective()`, so no transform-origin is left behind), back face hidden, darkening to 0.7 brightness at the half-turn; a shadow band follows the free edge across `to`.
- The perspective is 2 x the longer frame side.

## Common mistakes

- Expecting two-sided paper: past 90 degrees the back face is hidden, not drawn.
- A `from` with its own 3D transform: the transition owns it.

[Back to the shotcards index](README.md)
