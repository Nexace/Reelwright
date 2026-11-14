# One world

**What it is:** every beat is a box on one big canvas and one camera travels between them. No slide cuts: what lies between two boxes is on screen while the
camera passes, which is what makes it read as a film and not a deck.

**Load** (after engine.js and shots.js): `p5-camera.js`, `p5-time.js`. HyperFrames copies both into `hf/kit/`.

```js
const world = KIT.world({ regions: {
  hook:    { x: 0,    y: 0,   w: 1920, h: 1080, cls: 'scene', html: '<h1>Ship it</h1>' },
  feature: { x: 2400, y: 300, w: 1200, h: 700,  cls: 'scene', html: '...' },
  proof:   { x: 600,  y: 1500, w: 1600, h: 900, cls: 'scene', html: '...' },
} });
const tour = world.tour([
  { at: 0,                          region: 'hook' },
  { at: W('line2', 'feature'),      region: 'feature', ease: 'power2.inOut' },   // lands on the spoken word
  { at: W('line3', 'proof'),        region: 'proof',   ease: 'power2.inOut' },
]);
KIT.start({ dur, render: (t) => world.shoot(t, tour) });
```

- Region times come from `W()` / `V()` / `KIT.snap()`, never numbers; the camera arrives ON the word.
- `world.frame('feature', { fit: 0.9 })` is the camera state that fits a box (90 % of the frame on its tight axis); `KIT.project(state, [x, y])` says where a world point lands.
- Keep the boxes far enough apart that the move reads as travel (about one frame width), and not so far that the middle is empty for more than a beat.
- Under the camera, use `KIT.shot.planes` for depth and `KIT.shakeNoise` for an impact; callouts (`D.callout({ anchor, cam })`) follow the camera.
- Do not put the callout overlays above a `KIT.shoot` layer without reading the finding at the end of `docs/playbook/p5-motion.md`.

Proof: `tools/selfcheck/p5/world.mjs` (the tour stops centred on each box, fills 90 %, holds its ends; shuffled-seek identical in both renderers).
