# Trailer bumper grammar

The assembled title-card grammar: calm cards, a slammed headline with an impact flash and shake, a flash cut and dead air, back to back on black.

Card: video-shotcraft `trailer-grammar-moves` (1 shot), parity row `doodle-shots-motion:2.66`. Helper: `KIT.shotcards.trailerBumper` in `tools/shotcards/rhythm.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs rhythm`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const bumper = KIT.shotcards.trailerBumper({ at: V('bumper').start, steps: [
  { kind: 'card',  text: 'COMING SOON', dur: 0.9 },
  { kind: 'slam',  text: 'ONE FILM', sub: 'one script', dur: 0.7 },
  { kind: 'flash', dur: 0.2 }, { kind: 'black', dur: 0.3 },
  { kind: 'card',  text: 'REELWRIGHT', dur: 0.9 }] });
function render(t) { bumper.set(t); }   // bumper.end, bumper.starts[i] for cues
```

## Numbers (ours; the source card gives none)

- Card: fade in 0.3 s, a slow 4 % push, fade out 0.2 s. Slam: 1.7 to 1 on `outExpo` in 0.14 s, a white flash of 0.7 fading over 0.12 s, `KIT.shake` of 10 px x u. Flash: white, peak at the middle. Black: dead air.
- The black bed shows from `at` to `end`.

## Common mistakes

- More than one slam in a bumper: the second one is a repeat, not an escalation.
- Text sizes are set for 16:9; override per step with CSS on `.kit-bumper-text` for 9:16.

[Back to the shotcards index](README.md)
