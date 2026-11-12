# Tear streak

A torn edge sweeps through while the old scene is pushed on and tilted, with light streaks trailing the tear. (`KIT.transition('glitch')` is the digital twin.)

Card: video-shotcraft `tear-streak-transitions` (1 shot), parity row `doodle-shots-motion:2.77`. Helper: `KIT.shotcards.types.tearStreak` in `tools/shotcards/dissolve.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs dissolve`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const tear = KIT.shotcards.transition('tearStreak', { from: a, to: b, at: V('cut').start, dur: KIT.dur(0.7), dir: 'down', seed: 3, color: '#fff' });
function render(t) { tear.set(t); }
```

## Numbers (ours; the source card gives none)

- The ragged edge is `tornEdge`'s; `from` slides 6 % of the frame in the motion direction and tilts to 1.2 degrees; five seeded streaks (2 - 4 px x u thick, 15 - 40 % of the frame long) trail the tear on the overlay (screen blend).

## Common mistakes

- Colour streaks on a white scene: invisible. Use a dark `from` or a coloured `color`.
- Adding `KIT.cue(at, 'glitch')` is not automatic: pass `cue: 'whoosh'` to `KIT.transition` if you want a sound.

[Back to the shotcards index](README.md)
