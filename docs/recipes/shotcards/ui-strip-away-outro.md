# UI strip-away outro

The interface sheds its pieces one by one, outermost first, sliding outward and fading, until only the logo is left, which lands.

Card: video-shotcraft `ui-strip-away-outro` (1 shot), parity row `doodle-shots-motion:2.57`. Helper: `KIT.shotcards.uiStripAway` in `tools/shotcards/outro.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs outro`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const strip = KIT.shotcards.uiStripAway({ items: [...scene.querySelectorAll('.ui > *')], logo: logoEl, cx: KIT.W_ / 2, cy: KIT.H_ / 2,
  t0: V('end').start, t1: V('end').end });
function render(t) { strip.set(t); }   // items: direct children of the stage's layer, or { el, dx, dy } for a hand-set exit direction
```

## Numbers (ours; the source card gives none)

- Exit direction = from the stage centre to the item's centre (measured once); order outermost first (`KIT.stagger` over 45 % of the window); each slides 0.35 of the frame while scaling to 0.7 and fading (power2.in) over 25 %.
- The logo lands over the last 30 % (`back.out(1.7)`), from 0.6 to 1.

## Common mistakes

- Items nested in transformed parents: `offsetLeft` is then not stage px; pass `{ el, dx, dy }`.
- Running it on the real UI recording: it moves elements, so use it on the mock UI layer.

[Back to the shotcards index](README.md)
