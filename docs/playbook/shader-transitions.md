# Shader transitions — `KIT.shader`

HyperFrames' 14 WebGL transitions between two scenes: `domain-warp`, `ridged-burn`, `whip-pan`, `sdf-iris`,
`ripple-waves`, `gravitational-lens`, `cinematic-zoom`, `chromatic-split`, `glitch`, `swirl-vortex`,
`thermal-distortion`, `flash-through-white`, `cross-warp-morph`, `light-leak`. Both renderers, same pixels on every
machine (the shaders run on SwiftShader). Use one where a scene change is the moment (the reveal, the turn), not
between every scene: a cut or a crossfade is still the default.

```html
<script src="kit/shaders.js"></script>            <!-- hf, after kit/engine.js -->
<script src="../../../tools/shaders.js"></script> <!-- pvk, after tools/engine.js -->
```

```js
const A = el('div', 'scene'), B = el('div', 'scene');   // two full-frame scenes
const CUT = KIT.snap(W('reveal', 'now'));
KIT.shader(A, B, { shader: 'sdf-iris', t: CUT - 0.35, dur: 0.7 });   // ease 'power2.inOut', accent '#rrggbb' optional
KIT.start({ dur, render(t) { show(A, t < CUT ? 1 : 0); show(B, t >= CUT ? 1 : 0); /* … */ } });
```

- `t` and `dur` are seconds from `W()`, `V()`, `KIT.snap()`. `ease` is any `KIT.easing` name (default `power2.inOut`,
  as upstream) or a function. `accent` tints the shaders that glow (`ridged-burn`, `domain-warp`, `sdf-iris`,
  `light-leak`, …); default is upstream's orange.
- During `[t, t + dur)` `KIT.shader` owns both scenes' opacity and visibility: whatever the film does with them there
  is overridden. Cut between them anywhere inside the window (or at `t`) — outside it, the film's own render decides.
- Preview, the live scrubber and the renderer's first pass show a crossfade there. After frames (and stills) are
  written, `tools/renderers/shader_pass.mjs` opens the page in plain Chromium, captures each scene alone at every
  frame in the window and replaces the frame with the shader's composite. A pvk frame-cache hit still gets the pass.
- Everything outside the two scenes (subtitles, a logo bug) is in both captures, so it gets warped too. Keep overlays
  you want steady out of transition windows or accept the effect.

Limits:
- Transition frames are opaque: `output.alpha` keeps transparency everywhere else.
- `motionBlur`: transition frames are sharp (one capture per frame).
- hf: captures come from plain Chromium, not the producer, so runtime-only features (`KIT.grade` / `KIT.vfx` looks,
  producer-injected `<video>` frames) don't show inside a window, and glyph edges can shift by a pixel at the cut in
  and out. `output.hdr` (the producer's own mp4) gets the crossfade, not the shader.
- About 1 s per transition frame to composite (three screenshots); a 0.7 s window at 60 fps is ~40 s.

GLSL ported from HyperFrames `packages/shader-transitions/src/shaders` v0.9.19 (Apache-2.0, Copyright HeyGen) into
`tools/renderers/shader_glsl.mjs`.
