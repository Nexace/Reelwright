// shaders.js — HyperFrames' 14 WebGL shader transitions between two scenes, on both renderers. Opt in after the engine:
//   hf:  <script src="kit/shaders.js"></script>      pvk: <script src="../../../tools/shaders.js"></script>
// KIT.shader(fromEl, toEl, { shader, t, dur = 0.7, ease = 'power2.inOut', accent = '#rrggbb', ...options })
//   t / dur in seconds from W(), V(), KIT.snap(). During [t, t + dur) this module owns both scenes' opacity: the page
//   (preview, stills, the renderer's own pass) shows a crossfade, then tools/renderers/shader_pass.mjs captures each
//   side alone (window.__kitIsolate = { i, side }) and replaces those frames with the shader's composite.
// Shader names from HyperFrames packages/shader-transitions/src/shaders/registry.ts, v0.9.19 (Apache-2.0, Copyright HeyGen), plus the 12
// Remotion HTML-in-canvas presentations (tools/renderers/shader_glsl2.mjs; camelCase names work too, 'bookFlip' = 'book-flip') with their options:
//   blur-slide { direction = 'from-left', blur = 0.5 }   book-flip { direction = 'from-right' }   cross-zoom { strength = 0.4 }   crosswarp
//   dissolve { lineWidth = 0.1, spreadColor = '#ff0000', hotColor = '#e6e633', pow = 5, intensity = 1 }   dreamy-zoom { rotation = 6 (deg), scale = 1.2 }
//   film-burn { seed = 2.31 }   linear-blur { intensity = 0.1 }   ripple { amplitude = 100, speed = 50 }   swap { reflection = 0.4, perspective = 0.2,
//   depth = 3 }   zoom-blur { rotation = π/6 (rad) }   zoom-in-out        direction: from-left | from-right | from-top | from-bottom
// (docs/playbook/shader-transitions.md)
'use strict';
(() => {
  const K = window.KIT;
  const NAMES = ['domain-warp', 'ridged-burn', 'whip-pan', 'sdf-iris', 'ripple-waves', 'gravitational-lens', 'cinematic-zoom',
    'chromatic-split', 'glitch', 'swirl-vortex', 'thermal-distortion', 'flash-through-white', 'cross-warp-morph', 'light-leak'];
  const OPTS = { 'blur-slide': { direction: 'from-left', blur: 0.5 }, 'book-flip': { direction: 'from-right' }, 'cross-zoom': { strength: 0.4 }, crosswarp: {},
    dissolve: { lineWidth: 0.1, spreadColor: '#ff0000', hotColor: '#e6e633', pow: 5, intensity: 1 }, 'dreamy-zoom': { rotation: 6, scale: 1.2 },
    'film-burn': { seed: 2.31 }, 'linear-blur': { intensity: 0.1 }, ripple: { amplitude: 100, speed: 50 }, swap: { reflection: 0.4, perspective: 0.2, depth: 3 },
    'zoom-blur': { rotation: Math.PI / 6 }, 'zoom-in-out': {} };
  NAMES.push(...Object.keys(OPTS));
  const kebab = (s) => String(s).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  const SIDES = ['from-right', 'from-left', 'from-bottom', 'from-top'], SLIDE = { 'from-left': [1, 0], 'from-right': [-1, 0], 'from-top': [0, -1], 'from-bottom': [0, 1] };
  const hex = (c) => { if (!/^#[0-9a-f]{6}$/i.test(c)) throw new Error(`KIT.shader: colours are '#rrggbb' (got ${c})`); return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255); };
  // a shader's options → uniforms u_<name> (shader_pass.mjs sets them)
  const uniforms = (shader, o) => {
    const d = OPTS[shader]; if (!d) return null;
    const bad = Object.keys(o).filter((k) => !(k in d)); if (bad.length) throw new Error(`KIT.shader ${shader}: unknown option ${bad.join(', ')} (has: ${Object.keys(d).join(', ') || 'none'})`);
    const u = {};
    for (const [k, v] of Object.entries({ ...d, ...o })) {
      if (k === 'direction') { if (!SLIDE[v]) throw new Error(`KIT.shader ${shader}: direction is one of ${SIDES.join(', ')}`); if (shader === 'book-flip') u.u_dirk = SIDES.indexOf(v); else u.u_dir = SLIDE[v]; }
      else if (typeof v === 'string') u['u_' + k] = hex(v);
      else if (Number.isFinite(v)) u['u_' + k] = v;
      else throw new Error(`KIT.shader ${shader}: ${k} must be a number`);
    }
    return u;
  };
  const M = window.KIT_MEDIA = window.KIT_MEDIA || {};
  const list = M.transitions = M.transitions || [];
  const own = [];   // [{ from, to, ease }] alongside KIT_MEDIA.transitions (which stays plain data for the renderer)
  let n = 0;
  K.shader = (fromEl, toEl, { shader, t, dur = 0.7, ease = 'power2.inOut', accent, ...opts } = {}) => {
    shader = kebab(shader);
    if (!NAMES.includes(shader)) throw new Error(`KIT.shader: unknown shader "${shader}" — one of: ${NAMES.join(', ')}`);
    if (!Number.isFinite(t) || !(dur > 0)) throw new Error('KIT.shader: give t and dur in seconds (from W(), V(), KIT.snap())');
    if (!fromEl || !toEl || fromEl === toEl) throw new Error('KIT.shader: needs two different scene elements');
    const u = uniforms(shader, opts);
    if (!u && Object.keys(opts).length) throw new Error(`KIT.shader ${shader}: takes no options besides t, dur, ease, accent`);
    for (const e of [fromEl, toEl]) e.id = e.id || 'kit-shader-' + ++n;
    list.push({ from: '#' + fromEl.id, to: '#' + toEl.id, t, dur, shader, ease: typeof ease === 'string' ? ease : 'custom', ...(accent && { accent }), ...(u && { u }) });
    own.push({ from: fromEl, to: toEl, ease: typeof ease === 'function' ? ease : K.easing(ease) });
  };
  // eased progress of transition i at t (0 before, 1 after); the renderer's pass reads it from here
  K.shader.names = NAMES;
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
