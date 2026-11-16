# UI to brand morph: icon flip bloom and input morph assemble

Two ways to turn an interface element into the brand mark. Icon flip bloom: the icon turns edge-on, the logo turns up behind it, a ring blooms out. Input morph assemble: an input field shrinks into the brand disc while its text fades and the mark's pieces assemble.

Card: video-shotcraft `ui-to-brand-morph` (2 shots), parity row `doodle-shots-motion:2.58`. Helper: `KIT.shotcards.iconFlipBloom / inputMorphAssemble` in `tools/shotcards/outro.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs outro`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
// shot 1, icon-flip-bloom
const flip = KIT.shotcards.iconFlipBloom({ icon: iconEl, logo: logoEl, x: KIT.W_ / 2, y: KIT.H_ / 2, r: 0.22 * KIT.H_, bloom: 'var(--kit-accent)', t0, t1 });
// shot 2, input-morph-assemble
const morph = KIT.shotcards.inputMorphAssemble({ box: inputEl, text: inputText, logo: logoEl, parts: [...markParts],
  x: KIT.W_ / 2, y: KIT.H_ / 2, from: { w: 720, h: 112, r: 24 }, to: { w: 240, h: 240, r: 120 }, t0, t1, seed: 3 });
function render(t) { flip.set(t); /* or morph.set(t) */ }
```

## Numbers (ours; the source card gives none)

- Flip: power2.inOut over 60 % of the window; the icon rotates Y 0 to 90, the logo -90 to 0 with a pop; the ring is `bloom` coloured, scale 0.3 to 1, fading as it goes.
- Morph: the box goes from `from` to `to` in 55 % (power3.inOut), the text fades in the first 45 % of that, the logo pops (`back.out(1.7)`), parts assemble from seeded offsets, staggered.

## Common mistakes

- A logo with no `parts` and no `logo`: the morph ends on an empty disc; pass at least one.
- Doing both on one element: they own the same transforms.

[Back to the shotcards index](README.md)
