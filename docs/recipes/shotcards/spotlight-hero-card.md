# Spotlight hero card

A hero card flies in on a two-pose tour (z 0.78 to 2.6) while a spotlight dims everything but a disc round the card.

Card: video-shotcraft `spotlight-hero-card` (1 shot), parity row `doodle-shots-motion:2.50`. Helper: `KIT.shotcards.heroPush / spotlightHero` in `tools/shotcards/opening.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs opening`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const hero = KIT.shotcards.spotlightHero({ parent: scene.parentNode, layer: scene, hero: { r: 0.12 * KIT.H_ },
  t0: V('hero').start, t1: V('hero').end, x: card.offsetLeft + card.offsetWidth / 2, y: card.offsetTop + card.offsetHeight / 2 });
function render(t) { hero.set(t); }   // or only the camera: KIT.shoot(scene, KIT.shotcards.heroPush({ t0, t1, x, y })(t))
```

## Numbers (ours; the source card gives none)

- `heroPush`: `KIT.shot.tour` over two poses, z 0.78 to 2.6 (expo.out), ry 34 to 0 (our choice: the card turns frontal as it lands), persp 1100.
- The spotlight is a radial gradient at the screen centre with radius `hero.r x z x 1.05`, so (x, y) must be the hero's centre; it fades in over the first half.

## Common mistakes

- A hero off the focal point: the spotlight stays at the screen centre, so the disc would miss the card.
- Going past z 2.6 on bitmap art: it softens.

[Back to the shotcards index](README.md)
