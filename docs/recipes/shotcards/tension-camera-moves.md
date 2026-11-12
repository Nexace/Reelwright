# Tension camera moves: bullet-time freeze orbit and pull-back isolation

Two moves that hold a beat. Bullet time freezes the world while the camera keeps orbiting (`KIT.shot.bulletTime`, two clocks). Pull-back isolation starts on the subject, pulls back to the whole frame and dims everything else, leaving the subject alone.

Card: video-shotcraft `tension-camera-moves` (2 shots), parity row `doodle-shots-motion:2.9`. Helper: `KIT.shotcards.pullBackIsolation (+ KIT.shot.bulletTime)` in `tools/shotcards/camera.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs camera`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const SC = KIT.shotcards;
// shot 1, bullet-time-freeze-orbit: world(t) freezes inside the window, cam(t) keeps orbiting
const bt = KIT.shot.bulletTime({ t0: V('freeze').start, t1: V('freeze').end });
// in render(t): KIT.shoot(layer, bt.cam(t)); animate the scene with bt.world(t) instead of t

// shot 2, pull-back-isolation: the siblings' opacity is the helper's
const iso = SC.pullBackIsolation({ layer, focus: { x: card.offsetLeft + card.offsetWidth / 2, y: card.offsetTop + card.offsetHeight / 2 },
  siblings: [...layer.querySelectorAll('.card:not(.key)')], t0: V('lonely').start, t1: V('lonely').end + 0.3 });
function render(t) { iso.set(t); }
```

## Numbers (ours; the source card gives none)

- Starts `from` = 1.35 zoomed on `focus` (layer px) and pulls back to identity (power2.out; the focal point recentres, so it ends with no offset).
- Siblings ease to `dim` = 0.2 over the window from 15 % in (sine.inOut).

## Common mistakes

- Zooming a focus near the edge: the start frame then crops the layer; give the layer a bleed floor (recipes/push-in.md).
- Dimming siblings with your own code as well: the helper owns their `opacity`.

[Back to the shotcards index](README.md)
