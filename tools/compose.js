// compose.js — colour grading, per-pixel effects and nested compositions for any film. Opt in after the engine:
//   hf:  <script src="kit/compose.js"></script>      pvk: <script src="../../../tools/compose.js"></script>
// KIT.grade(el, opts)  → set(path, v)   data-color-grading on <img>/<video>/<canvas> (docs/playbook/grading-effects.md)
// KIT.vfx(host, nodes) → set(id, key, v) data-vfx-chain kernels, renderer hyperframes only
// KIT.mount(name, { start, dur, playbackStart, vars, parent }) → host   compositions/<name>.html, seeked from render(t)
//                                                                      (docs/playbook/nested-compositions.md)
// KIT.block(name, { start, dur, vars }) → KIT.mount (a block from `reelwright add`); KIT.block(name) is engine.js's component
// Name lists below ported from HyperFrames core/dist/colorGrading.js + parsers/dist/colorGradingContract.js and
// core/src/vfx.ts, v0.9.19 (Apache-2.0, Copyright HeyGen)
'use strict';
(() => {
  const K = window.KIT;
  const HF = !!document.querySelector('[data-composition-id]');   // an hf/index.html root; pvk pages have none
  const warned = new Set();
  const warn = (what) => { if (!warned.has(what)) { warned.add(what); console.warn(`KIT: ${what} needs renderer hyperframes — skipped on this renderer`); } };

  // ── colour grading ──────────────────────────────────────────────────────
  const GRADE = {   // grade presets → their adjust values (the part the pvk approximation can show)
    neutral: {}, 'warm-daylight': { exposure: 0.06, contrast: 0.07, saturation: 0.08, temperature: 0.18 },
    'clean-studio': { contrast: 0.08, saturation: 0.04, temperature: -0.08 }, 'skin-soft': { exposure: 0.04, contrast: -0.03, saturation: 0.04, temperature: 0.08 },
    'food-pop': { exposure: 0.06, contrast: 0.1, saturation: 0.18, temperature: 0.14 }, 'night-lift': { exposure: 0.08, contrast: 0.08, saturation: 0.04 },
    'muted-editorial': { exposure: -0.02, contrast: 0.08, saturation: -0.12, temperature: -0.03 },
    'vintage-wash': { exposure: 0.03, contrast: -0.12, saturation: -0.08, temperature: 0.13 }, 'mono-clean': { contrast: 0.12, saturation: -1 },
    'mono-fade': { contrast: -0.04, saturation: -1 }, 'soft-boost': { exposure: 0.06, contrast: -0.04, saturation: 0.1 },
    'bright-pop': { exposure: 0.12, contrast: 0.12, saturation: 0.14 }, 'deep-contrast': { exposure: -0.03, contrast: 0.2, saturation: 0.06 },
  };
  const EFFECT_PRESETS = ['creator-camcorder', 'vhs-playback', 'home-movie-8mm', 'editorial-halftone', 'two-ink-print'];
  const TOP = ['enabled', 'preset', 'intensity', 'adjust', 'wheels', 'curves', 'hueCurves', 'secondaries', 'details', 'effects', 'palette', 'lut', 'colorSpace'];
  const ADJUST = ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'temperature', 'tint', 'vibrance', 'saturation'];
  const DETAILS = ['vignette', 'vignetteMidpoint', 'vignetteRoundness', 'vignetteFeather', 'grain', 'grainSize', 'grainRoughness'];
  const EFFECTS = ('blur pixelate chromaBleed tapeDamage tapeTracking tapeNoise tapeSpeed filmArtifacts halftone halftoneSize twoInkPrint ' +
    'twoInkPrintSize ascii asciiSize asciiInvert asciiStyle asciiColor asciiRotation dither ditherSize bloom bloomRadius monoScreen ' +
    'monoScreenSize monoScreenAngle monoScreenSpread monoScreenShape monoScreenInvert scanlines scanlineCount scanlineSoftness ' +
    'chromaticAberration chromaticAngle crtCurvature digitalGlitch digitalGlitchColorSplit digitalGlitchLineTear digitalGlitchPixelate ' +
    'digitalGlitchBlockAmount digitalGlitchBlockDisplacement digitalGlitchBlockOpacity digitalGlitchSpeed engraving engravingSpacing ' +
    'engravingMinThickness engravingMaxThickness engravingAngle engravingContrast engravingSharpness engravingWave engravingWaveFrequency ' +
    'crosshatch crosshatchSpacing crosshatchThickness crosshatchAngle crosshatchContrast crosshatchEdges crosshatchLineWeight crosshatchWave ' +
    'crosshatchWaveFrequency kuwahara kuwaharaRadius kuwaharaSharpness kuwaharaSaturation').split(' ');
  // the values the HF runtime re-reads from CSS custom properties on every draw (HF_COLOR_GRADING_ANIMATABLE_PROPERTIES)
  const ANIM = { intensity: 'intensity', 'lut.intensity': 'lut-intensity', 'adjust.exposure': 'exposure', 'effects.blur': 'blur',
    'effects.bloom': 'bloom', 'effects.kuwahara': 'kuwahara', 'effects.pixelate': 'pixelate', 'effects.ascii': 'ascii', 'effects.dither': 'dither' };
  const unknown = (o, keys, where) => {
    const bad = Object.keys(o || {}).filter((k) => !keys.includes(k));
    if (bad.length) throw new Error(`KIT.grade: unknown ${where} ${bad.join(', ')} — one of: ${keys.join(', ')}`);
  };

  // pvk: a CSS filter for exposure / contrast / saturation / temperature (preset + adjust), times intensity
  const cssGrade = (o) => {
    const a = { ...(GRADE[o.preset] || {}), ...(o.adjust || {}) }, i = o.intensity ?? 1, v = (k) => (a[k] || 0) * i, T = v('temperature');
    return `brightness(${2 ** v('exposure')}) contrast(${1 + v('contrast')}) saturate(${Math.max(0, 1 + v('saturation'))})` +
      (T > 0 ? ` sepia(${0.35 * T})` : T < 0 ? ` hue-rotate(${-25 * T}deg)` : '');   // shortcut: a rough warm/cool, not a white balance
  };

  K.grade = (el, opts = {}) => {
    if (!el || !/^(IMG|VIDEO|CANVAS)$/.test(el.tagName))
      throw new Error(`KIT.grade: ${el && el.tagName ? el.tagName.toLowerCase() : el} is not an <img>, <video> or <canvas> — wrap it: grading applies to media only, same as HyperFrames`);
    unknown(opts, TOP, 'key');
    if (opts.preset && !(opts.preset in GRADE) && !EFFECT_PRESETS.includes(opts.preset))
      throw new Error(`KIT.grade: unknown preset "${opts.preset}" — one of: ${[...Object.keys(GRADE), ...EFFECT_PRESETS].join(', ')}`);
    unknown(opts.adjust, ADJUST, 'adjust');
    unknown(opts.details, DETAILS, 'details');
    unknown(opts.effects, EFFECTS, 'effect');
    const o = JSON.parse(JSON.stringify(opts));
    if (HF) el.setAttribute('data-color-grading', JSON.stringify(o));
    else {
      if (EFFECT_PRESETS.includes(o.preset)) warn(`grade preset "${o.preset}"`);
      for (const k of Object.keys(o.effects || {})) warn(`grade effect "${k}"`);
      for (const k of Object.keys(o.details || {})) warn(`grade details "${k}"`);
      for (const k of ['lut', 'wheels', 'curves', 'hueCurves', 'secondaries', 'palette']) if (o[k]) warn(`grade "${k}"`);
      for (const k of Object.keys(o.adjust || {})) if (!['exposure', 'contrast', 'saturation', 'temperature'].includes(k)) warn(`grade adjust "${k}"`);
      el.style.filter = cssGrade(o);
    }
    // set('intensity', v) from render(t): hf writes the --hf-color-grading-* var the runtime reads per draw
    return (path, value) => {
      if (!(path in ANIM)) throw new Error(`KIT.grade set: "${path}" can't animate — one of: ${Object.keys(ANIM).join(', ')}`);
      if (HF) { el.style.setProperty('--hf-color-grading-' + ANIM[path], value); return; }
      const [a, b] = path.split('.');
      if (b) (o[a] = o[a] || {})[b] = value; else o[a] = value;
      if (path === 'intensity' || path === 'adjust.exposure') el.style.filter = cssGrade(o);
    };
  };

  // ── data-vfx-chain: per-pixel WebGL2 kernels (hf-src docs/guides/vfx-chain.mdx) ──
  const CAPTURE = { 'fractal-noise': 'none', 'wave-warp': 'self', 'displacement-map': 'self', 'luma-matte': 'self' };
  K.vfx = (host, nodes) => {
    for (const n of nodes) {
      if (!(n.type in CAPTURE)) throw new Error(`KIT.vfx: unknown kernel "${n.type}" — one of: ${Object.keys(CAPTURE).join(', ')}`);
      if (!n.id) throw new Error('KIT.vfx: every node needs an id (its CSS vars are --vfx-<id>-<key>)');
    }
    const setVar = (id, key, v) => host.style.setProperty(`--vfx-${id}-${key}`, v);
    if (!HF) { warn('KIT.vfx'); return setVar; }
    if (nodes.some((n) => CAPTURE[n.type] === 'self')) {
      // the layer's own pixels go through a <canvas layoutsubtree>; its one child needs an explicit pixel box
      const src = document.createElement('canvas'); src.setAttribute('layoutsubtree', ''); src.className = 'hf-vfx-src';
      const inner = document.createElement('div'); inner.className = 'hf-vfx-in';
      K.css(inner, { width: host.offsetWidth + 'px', height: host.offsetHeight + 'px', position: 'relative' });
      inner.append(...host.childNodes); src.append(inner); host.append(src);
    }
    const out = document.createElement('canvas'); out.className = 'hf-vfx-out'; host.append(out);
    host.setAttribute('data-vfx-chain', JSON.stringify({ version: 1, nodes: nodes.map((n) => ({ params: {}, ...n })) }));
    return setVar;
  };

  // ── nested compositions: compositions/<name>.html (a HyperFrames <template> file) inlined and seeked by us ──
  // Same code on both renderers. The child's timeline moves out of window.__timelines (HyperFrames would seek it
  // as a scene by its own host lookup) into this module's list, seeked from render(t) after the film's render.
  const mounts = [];
  K.mount = (name, { start, dur, playbackStart = 0, vars = {}, parent = K.stage } = {}) => {
    if (!(dur > 0) || !Number.isFinite(start)) throw new Error(`KIT.mount("${name}"): give start and dur in seconds (from W(), V(), KIT.snap())`);
    const x = new XMLHttpRequest(); x.open('GET', 'compositions/' + name + '.html', false); x.send();
    if (!x.responseText) throw new Error(`KIT.mount: no compositions/${name}.html next to index.html`);
    const box = document.createElement('div'); box.innerHTML = x.responseText;
    const tpl = box.querySelector('template');
    const host = K.el('div', 'kit-mount', parent);
    host.setAttribute('data-variable-values', JSON.stringify(vars));
    host.append(tpl ? tpl.content.cloneNode(true) : box);
    const root = host.querySelector('[data-composition-id]'), id = root && root.getAttribute('data-composition-id');
    if (!id) throw new Error(`KIT.mount: compositions/${name}.html has no [data-composition-id] root`);
    root.setAttribute('data-no-timeline', '');   // its timeline is ours: the producer must not wait for it to register
    K.css(host, { left: '0px', top: '0px', width: (root.getAttribute('data-width') || 1920) + 'px', height: (root.getAttribute('data-height') || 1080) + 'px' });
    // child scripts run now; __hyperframes.getVariables() answers with vars while they do
    window.__timelines = window.__timelines || {};
    const hfApi = window.__hyperframes, prev = window.__timelines[id];
    window.__hyperframes = { ...(hfApi || {}), getVariables: () => ({ ...vars }) };
    try {
      for (const old of host.querySelectorAll('script')) {   // innerHTML scripts don't run; re-create them
        const s = document.createElement('script'); s.textContent = old.textContent; old.replaceWith(s);
      }
    } finally { if (hfApi) window.__hyperframes = hfApi; else delete window.__hyperframes; }
    const tl = window.__timelines[id];
    if (prev === undefined) delete window.__timelines[id]; else window.__timelines[id] = prev;   // e.g. a second mount of it
    if (!tl || tl === prev || typeof tl.seek !== 'function') throw new Error(`KIT.mount: compositions/${name}.html didn't register window.__timelines["${id}"] with seek(t)`);
    if (tl.pause) tl.pause();
    mounts.push((t) => {
      const on = t >= start && t < start + dur;
      host.style.display = on ? '' : 'none';
      if (on) tl.seek(playbackStart + K.local(t, start, dur));
    });
    return host;
  };
  // KIT.block(name, { start, dur, vars }) → KIT.mount for a HyperFrames block; KIT.block(name[, parent]) stays the component call
  const block = K.block;
  K.block = (name, o, ...rest) => o && !(o instanceof Node) && 'dur' in o ? K.mount(name, o) : block(name, o, ...rest);
  const s = K.start;
  K.start = (o) => s({ ...o, render: (t) => { o.render(t); for (const m of mounts) m(t); } });
})();
