# Cursor flyover

A 3D camera tour over a UI layer with a cursor that clicks its way from pose to pose. The cursor is drawn at scale(1/z) inside the layer, so it stays the same size on screen however far the camera is in.

Card: video-shotcraft `cursor-flyover` (1 shot), parity row `doodle-shots-motion:2.3`. Helper: `KIT.shotcards.cursorFlyover` in `tools/shotcards/camera.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs camera`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const SC = KIT.shotcards;
const fly = SC.cursorFlyover({ layer: scene, size: 28 * KIT.u, poses: [
  { t: 0,               state: {},                                cursor: { x: 640,  y: 360 } },
  { t: V('open').start, state: { z: 1.8, x: 420, y: 300 },        cursor: { x: 420,  y: 300 }, click: true },
  { t: V('save').start, state: { z: 1.4, x: 1300, y: 700, ry: 8 }, cursor: { x: 1300, y: 700 }, click: true, ease: 'power2.inOut' }] });
function render(t) { fly.set(t); }   // shoots `scene` and moves the cursor; fly.cam(t) is the camera alone
```

## Numbers (ours; the source card gives none)

- Poses are `KIT.shot.tour` poses: each flight eases every field (the arriving pose's `ease`, else the theme's) and lands exactly on the pose.
- The cursor follows its own tour with the same times and eases, in layer px. `click: true` dips it to 85 % for 0.18 s from the pose's time.
- Cursor size on screen = `size` (default 26 x `KIT.u`) at every z: `at(t).scale * at(t).z = 1` outside a click.

## Common mistakes

- Taking pose times from fixed seconds: use `V()`, `W()` or `KIT.snap()` so the flyover follows the script.
- Putting the cursor outside the filmed layer: it is a child of `layer`, in layer px, and tilts with it.
- Tilting past about 15 degrees on a text-heavy layer: the text goes soft (see the camera notes in the PLAYBOOK).

[Back to the shotcards index](README.md)
