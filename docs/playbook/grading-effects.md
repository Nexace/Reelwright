# Colour grading and per-pixel effects — `KIT.grade`, `KIT.vfx`

Grade a screenshot, a recording or a generated still so it sits with the theme (a mono pass under a headline, a
warm lift on a product shot), or give one layer a look a CSS filter can't do (scanlines, halftone, a wave warp,
generated noise). Use it sparingly: one graded layer per scene, and only where it says something.

```html
<script src="kit/compose.js"></script>            <!-- hf, after kit/engine.js -->
<script src="../../../tools/compose.js"></script> <!-- pvk, after tools/engine.js -->
```

```js
const shot = el('img'); shot.src = 'shot.png';
const g = KIT.grade(shot, { preset: 'mono-clean', effects: { scanlines: 0.8 } });   // → set(path, value)
const card = el('div', 'card', undefined, 'Shipped');
const fx = KIT.vfx(card, [{ type: 'wave-warp', id: 'w', params: { height: 20, width: 80 } }]);   // → set(id, key, value)
KIT.start({ dur, render(t) {
  g('intensity', seg(t, V('look').start, W('look', 'clean')));   // grade fades in on the word
  fx('w', 'phase', t * 90);                                      // --vfx-w-phase
} });
```

## `KIT.grade(el, opts)`

- `el` must be an `<img>`, `<video>` or `<canvas>`. For text or a card, wrap it — grading applies to media only,
  same as HyperFrames. Wrong tags, presets, top-level keys, `adjust` / `details` / `effects` names throw at load.
- `opts` is HyperFrames' `data-color-grading` object: `preset` (grade: neutral, warm-daylight, clean-studio,
  skin-soft, food-pop, night-lift, muted-editorial, vintage-wash, mono-clean, mono-fade, soft-boost, bright-pop,
  deep-contrast; effect: creator-camcorder, vhs-playback, home-movie-8mm, editorial-halftone, two-ink-print),
  `intensity` 0–1, `adjust` {exposure, contrast, saturation, temperature, …}, `details` {vignette, grain, …},
  `effects` {scanlines, halftone, pixelate, bloom, …}, `lut` {src, intensity}.
- Animate from `render(t)` with the returned `set(path, v)`. Animatable paths: `intensity`, `lut.intensity`,
  `adjust.exposure`, `effects.blur`, `effects.bloom`, `effects.kuwahara`, `effects.pixelate`, `effects.ascii`,
  `effects.dither`. On hf, `set` writes the `--hf-color-grading-*` CSS variable, and the runtime reads it again
  each time it draws the frame. Verified: an intensity ramp renders as a ramp. Other values are static. Rewriting the
  `data-color-grading` attribute per frame is picked up by a MutationObserver that may run one frame late. Not verified, don't rely on it.

## `KIT.vfx(host, nodes)`

Builds the `data-vfx-chain` host the HyperFrames runtime paints: `nodes` = `[{ type, id, params }]`, kernels
`fractal-noise` (generated, replaces the host's look), `wave-warp`, `displacement-map`, `luma-matte` (these read
the host's own pixels: its children move into a `<canvas layoutsubtree>` with an explicit pixel box, so size the
host before calling). Static values go in `params`; animated ones through the setter (`--vfx-<id>-<key>`). The
host's own background stays outside the capture, so only its content warps. A chain adds render time, so put one
only on a layer that needs it.

## Per renderer

| | hf | pvk |
|---|---|---|
| grade presets + `adjust` | WebGL grade by the HF runtime | CSS filter: exposure, contrast, saturation, temperature (rough), × intensity |
| `details`, `effects`, effect presets, `lut`, curves, wheels | yes | skipped, one `console.warn` each ("needs renderer hyperframes") |
| animated `intensity` / `adjust.exposure` | yes | yes (refilters) |
| other animated paths | yes | no |
| `KIT.vfx` | yes: `fractal-noise` and `wave-warp` rendered and animated in the headless shell | no-op (host left as is) and one warning |
