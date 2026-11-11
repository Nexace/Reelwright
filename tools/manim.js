// KIT.manim: a pre-rendered Manim scene (tools/manim.mjs, `reelwright manim <p> render`) as a layer of the film.
// Load after engine.js (and after runtimes.js when the page has both), with the scene list before it:
//   pvk:         <script src="../.cache/manim/data.js"></script> <script src="../../../tools/manim.js"></script>
//   hyperframes: <script src="kit/manim/data.js"></script>      <script src="kit/manim.js"></script>
//   const mn = KIT.manim('proof', { parent, fit: 'contain'|'cover'|'fill', box: { x, y, w, h } })
//     → { el, set(t), markAt(name), frameAt(t), t0, end }   mn.set(t) from render(t); hidden outside [t0, end].
// t0 is the anchor VO line's start − pre, read from window.MANIM and checked against window.VO, so no seconds are typed.
// pvk: an <img> swapped per frame through KIT.img, whose decode render(t) awaits. HyperFrames seeks render(t) without
// awaiting decodes, so there every frame is fetched at load (HyperFrames holds capture through __hfTimelinesBuilding
// until they are) and set(t) draws the frame on a <canvas> with drawImage, which decodes synchronously.
// shortcut: HyperFrames keeps every frame's PNG bytes in memory (~0.3–3 MB each at 1080p); keep a scene ≤ 1800 frames
// (30 s at 60 fps) there, or split it. A scene that drew made-up numbers (rw.label_illustrative()) gets "Illustrative data".
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.start) throw new Error('tools/manim.js: load tools/engine.js first');
  const MAX_HF_FRAMES = 1800;

  // ── HyperFrames load wait (same contract as tools/runtimes.js: keep any other writer's state) ──
  const waits = [];
  let building = 0, hooked = false;
  const hook = () => {
    if (hooked) return; hooked = true;
    const prev = Object.getOwnPropertyDescriptor(window, '__hfTimelinesBuilding');
    let val = !!(prev && 'value' in prev && prev.value);
    const other = () => (prev && prev.get ? prev.get() : val);
    Object.defineProperty(window, '__hfTimelinesBuilding', { configurable: true, get: () => building > 0 || other(),
      set: (v) => { if (prev && prev.set) prev.set(v); else val = !!v; } });
  };
  const wait = (p) => {
    hook(); building++;
    const q = p.then(() => { if (--building || window.__hfTimelinesBuilding) return; window.dispatchEvent(new Event('hf-timelines-built')); },
      (e) => { console.error('KIT.manim: frames failed to load:', e); throw e; });   // stays "building": HF never captures (loud)
    waits.push(q); return q;
  };
  const start = K.start;
  K.start = (o) => {
    start(o);
    if (!waits.length) return;
    const ready = window.READY, h = location.hash.slice(1), t0 = h && h !== 'play' && Number.isFinite(Number(h)) ? Number(h) : 0;
    window.READY = ready.then(async (ok) => { while (waits.length) await waits.shift(); await window.render(t0); return ok; });
  };

  K.manim = (id, { parent = K.stage, fit = 'contain', box } = {}) => {
    const M = window.MANIM, run = '`reelwright manim <project> render`';
    if (!M || !M.scenes) throw new Error(`KIT.manim('${id}'): window.MANIM missing — run ${run} and load its data.js before tools/manim.js`);
    const S = M.scenes[id];
    if (!S) throw new Error(`KIT.manim('${id}'): no such scene in window.MANIM (have: ${Object.keys(M.scenes).join(', ') || 'none'}) — run ${run}`);
    const P = window.PROJECT || {}, want = K.V(S.anchor).start - S.pre;
    const stale = [Math.abs(S.t0 - want) > 1e-3 && `starts at ${S.t0}, VO line ${S.anchor} says ${want.toFixed(3)}`,
      !S.fixedFps && P.fps && S.fps !== P.fps && `${S.fps} fps, film is ${P.fps}`,
      (S.width !== K.W_ || S.height !== K.H_) && `${S.width}x${S.height}, film is ${K.W_}x${K.H_}`].filter(Boolean);
    if (stale.length) throw new Error(`KIT.manim('${id}') stale (${stale.join('; ')}): re-run ${run}`);
    const hfMode = M.renderer === 'hyperframes';
    if (hfMode && S.frames > MAX_HF_FRAMES) console.warn(`KIT.manim('${id}'): ${S.frames} frames are all held in memory under HyperFrames; keep ≤ ${MAX_HF_FRAMES}`);

    const el = K.el('div', 'kit-manim', parent);
    K.css(el, { position: 'absolute', overflow: 'hidden', visibility: 'hidden', opacity: 0 });
    K.css(el, box ? { left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' } : { left: 0, top: 0, width: '100%', height: '100%' });
    const src = (f) => S.dir + String(f).padStart(5, '0') + '.png';
    const frameAt = (t) => K.clamp(Math.floor((t - S.t0) * S.fps + 1e-6), 0, S.frames - 1);
    let draw;
    if (hfMode) {
      const cv = K.el('canvas', '', el); cv.width = S.width; cv.height = S.height;
      K.css(cv, { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: fit });
      const g = cv.getContext('2d'), imgs = [];
      for (let f = 0; f < S.frames; f++) { const im = new Image(); im.src = src(f); imgs.push(im); }
      wait(Promise.all(imgs.map((im) => new Promise((res, rej) => {
        if (im.complete && im.naturalWidth) return res();
        im.onload = res; im.onerror = () => rej(new Error('missing frame ' + im.src));
      }))));
      let cur = -1;
      draw = (f) => { if (f === cur || !imgs[f].complete) return; cur = f; g.clearRect(0, 0, cv.width, cv.height); g.drawImage(imgs[f], 0, 0); };
    } else {
      const im = K.el('img', '', el); im.alt = '';
      K.css(im, { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: fit });
      draw = (f) => K.img(im, src(f));
    }
    if (S.illustrative) K.aiLabel(el, 'Illustrative data');
    const end = S.t0 + S.dur;
    return {
      el, t0: S.t0, end, frameAt,
      set(t) {
        const on = t >= S.t0 && t <= end;
        K.show(el, on ? 1 : 0);
        if (on) draw(frameAt(t));
      },
      markAt(name) {
        if (!S.marks || !(name in S.marks)) throw new Error(`KIT.manim('${id}'): no mark "${name}" (have: ${Object.keys(S.marks || {}).join(', ') || 'none'})`);
        return S.marks[name];
      },
    };
  };
})();
