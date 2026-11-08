// shaders.js — HyperFrames' 14 WebGL shader transitions between two scenes, on both renderers. Opt in after the engine:
//   hf:  <script src="kit/shaders.js"></script>      pvk: <script src="../../../tools/shaders.js"></script>
// KIT.shader(fromEl, toEl, { shader, t, dur = 0.7, ease = 'power2.inOut', accent = '#rrggbb' })
//   t / dur in seconds from W(), V(), KIT.snap(). During [t, t + dur) this module owns both scenes' opacity: the page
//   (preview, stills, the renderer's own pass) shows a crossfade, then tools/renderers/shader_pass.mjs captures each
//   side alone (window.__kitIsolate = { i, side }) and replaces those frames with the shader's composite.
// Shader names from HyperFrames packages/shader-transitions/src/shaders/registry.ts, v0.9.19 (Apache-2.0, Copyright HeyGen)
// (docs/playbook/shader-transitions.md)
'use strict';
(() => {
  const K = window.KIT;
  const NAMES = ['domain-warp', 'ridged-burn', 'whip-pan', 'sdf-iris', 'ripple-waves', 'gravitational-lens', 'cinematic-zoom',
    'chromatic-split', 'glitch', 'swirl-vortex', 'thermal-distortion', 'flash-through-white', 'cross-warp-morph', 'light-leak'];
  const M = window.KIT_MEDIA = window.KIT_MEDIA || {};
  const list = M.transitions = M.transitions || [];
  const own = [];   // [{ from, to, ease }] alongside KIT_MEDIA.transitions (which stays plain data for the renderer)
  let n = 0;
  K.shader = (fromEl, toEl, { shader, t, dur = 0.7, ease = 'power2.inOut', accent } = {}) => {
    if (!NAMES.includes(shader)) throw new Error(`KIT.shader: unknown shader "${shader}" — one of: ${NAMES.join(', ')}`);
    if (!Number.isFinite(t) || !(dur > 0)) throw new Error('KIT.shader: give t and dur in seconds (from W(), V(), KIT.snap())');
    if (!fromEl || !toEl || fromEl === toEl) throw new Error('KIT.shader: needs two different scene elements');
    for (const e of [fromEl, toEl]) e.id = e.id || 'kit-shader-' + ++n;
    list.push({ from: '#' + fromEl.id, to: '#' + toEl.id, t, dur, shader, ease: typeof ease === 'string' ? ease : 'custom', ...(accent && { accent }) });
    own.push({ from: fromEl, to: toEl, ease: typeof ease === 'function' ? ease : K.easing(ease) });
  };
  // eased progress of transition i at t (0 before, 1 after); the renderer's pass reads it from here
  K.shaderProgress = (i, t) => own[i].ease(K.clamp((t - list[i].t) / list[i].dur, 0, 1));
  const post = (t) => {
    const iso = window.__kitIsolate;
    own.forEach((o, i) => {
      if (iso && iso.i === i) { K.show(o.from, iso.side === 'from' ? 1 : 0); K.show(o.to, iso.side === 'to' ? 1 : 0); return; }
      if (t < list[i].t || t >= list[i].t + list[i].dur) return;
      const p = K.shaderProgress(i, t);
      K.show(o.from, 1 - p); K.show(o.to, p);
    });
  };
  const s = K.start;
  K.start = (o) => s({ ...o, render: (t) => { o.render(t); post(t); } });
})();
