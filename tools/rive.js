// KIT.rive: a Rive file (.riv) drawn by render(t). Wraps @rive-app/canvas (vendor/rive/: rive.js + rive.wasm), but not its player: the
// high-level `Rive` class has its own requestAnimationFrame clock, so this drives the runtime's low-level API (file, artboard,
// animation and state machine instances, renderer) and never lets a clock run. Every set(t) lands on exactly the frame for film time t.
// Load after tools/engine.js and tools/runtimes.js (its READY gate).
//   rive(host, { src, artboard, animation | stateMachine, start, dur, speed, loop, fit, align, inputs, step })
//                                                                                   → { canvas, runtime, file, artboard, dur, set(t) }
//     host          a <canvas>, or any element (a canvas that fills it is created inside)
//     src           URL of a .riv (read with XMLHttpRequest: works from file://), or an ArrayBuffer / Uint8Array
//     artboard      artboard name (default: the file's default artboard)
//     animation     name of a linear animation: its time is the film time (the frame is applied, nothing is played)
//     stateMachine  name of a state machine. Neither given: the first state machine, else the first animation, else a still.
//     start, dur    film time the clip starts (held on its first frame before) and how many film seconds it runs (held on the
//                   last frame after); dur defaults to the animation's length when `loop` is off, and to open-ended otherwise
//     speed, loop   playback rate; loop wraps a linear animation instead of holding its last frame
//     fit, align    'contain' (default) | 'cover' | 'fill' | 'fitWidth' | 'fitHeight' | 'none' | 'scaleDown'; 'center' (default),
//                   'topLeft' ... 'bottomRight'
//     inputs        [{ at, name, value }] the film-time input schedule of a state machine: from film time `at` on, the number
//                   or boolean input `name` has `value`; { at, name, fire: true } fires a trigger. A state machine runs on a
//                   real-time clock in Rive's own player; here the film decides when each input changes.
//     step          seconds per state machine tick (default 1/60)
// A linear animation is applied at the exact time. A state machine is replayed from its first state in `step` ticks up to t
// (inputs applied when due), so a seek forward continues from where it was and a seek backward starts over: the frame at t is the
// same whatever was drawn before. The wasm is handed to the runtime as bytes and its CDN, fallback, replay worker, script
// networking and asset CDN are switched off, so a film renders offline. Embedded images and fonts work; assets a .riv only
// references by URL do not load.
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.start || !K.wait) throw new Error('tools/rive.js: load tools/engine.js and tools/runtimes.js first');
  const base = document.currentScript.src, inTools = /\/tools\/rive\.js(\?|$)/.test(base);
  const DIR = (f) => new URL((inTools ? '../vendor/rive/' : 'rive/') + f, base).href;

  const read = (url) => new Promise((res, rej) => {   // XHR, not fetch: file:// pages (pvk) can read local files this way only
    const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer';
    x.onload = () => (x.status === 200 || (x.status === 0 && x.response && x.response.byteLength) ? res(x.response) : rej(new Error('KIT.rive: could not read ' + url + ' (' + x.status + ')')));
    x.onerror = () => rej(new Error('KIT.rive: could not read ' + url));
    x.send();
  });
  const script = (url) => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = () => rej(new Error('KIT.rive: could not load ' + url));
    document.head.appendChild(s);
  });
  let lib = null;
  const load = () => lib || (lib = (async () => {
    const [, wasm] = await Promise.all([script(DIR('rive.js')), read(DIR('rive.wasm'))]);
    const L = window.rive.RuntimeLoader;
    L.setWasmBinary(wasm); L.setWasmUrl(URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' })));
    L.setWasmFallbackUrl(null); L.setReplayWorker(false); L.setScriptFetch(false);   // nothing may reach for the network
    return L.awaitInstance();
  })());
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  K.rive = (host, { src, artboard, animation, stateMachine, start = 0, dur, speed = 1, loop = false, fit = 'contain', align = 'center', inputs = [], step = 1 / 60 } = {}) => {
    const canvas = host.tagName === 'CANVAS' ? host : K.el('canvas', '', host);
    if (host !== canvas) { canvas.width = host.clientWidth || K.W_; canvas.height = host.clientHeight || K.H_; canvas.style.width = '100%'; canvas.style.height = '100%'; }
    const h = { canvas, runtime: null, file: null, artboard: null, dur: 0, set: () => {} };
    K.wait((async () => {
      const [R, data] = await Promise.all([load(), typeof src === 'string' ? read(src) : Promise.resolve(src)]);
      const file = await R.load(data instanceof Uint8Array ? data : new Uint8Array(data), undefined, false);   // false: no Rive asset CDN
      const renderer = R.makeRenderer(canvas);
      const frame = { minX: 0, minY: 0, maxX: canvas.width, maxY: canvas.height };
      const F = R.Fit[fit], A = R.Alignment[align];
      if (F === undefined || A === undefined) throw new Error('KIT.rive: unknown fit "' + fit + '" or align "' + align + '"');
      const sched = inputs.slice().sort((a, b) => a.at - b.at);
      let ab = null, anim = null, sm = null, ticks = 0, next = 0, ins = null, len = 0;
      const open = () => {   // a fresh artboard, with its animation or state machine
        for (const o of [anim, sm, ab]) if (o) o.delete();
        ab = artboard ? file.artboardByName(artboard) : file.defaultArtboard();
        if (!ab) throw new Error('KIT.rive: no artboard ' + (artboard || '(default)'));
        anim = sm = null; ticks = next = len = 0;
        const smName = stateMachine ?? (animation === undefined && ab.stateMachineCount() ? ab.stateMachineByIndex(0).name : undefined);
        const anName = animation ?? (smName === undefined && ab.animationCount() ? ab.animationByIndex(0).name : undefined);
        if (smName !== undefined) { sm = new R.StateMachineInstance(ab.stateMachineByName(smName), ab); ins = {}; for (let i = 0; i < sm.inputCount(); i++) { const x = sm.input(i); ins[x.name] = x; } }
        else if (anName !== undefined) { const la = ab.animationByName(anName); len = la.duration / la.fps; anim = new R.LinearAnimationInstance(la, ab); }   // duration is in frames
      };
      open();
      h.runtime = R; h.file = file; h.artboard = ab; h.dur = len;
      const tick = () => {   // one state machine tick: inputs due at this time, then step seconds (the first tick is time 0: step 0)
        const at = ticks * step;
        for (; next < sched.length && (sched[next].at - start) * speed <= at + 1e-9; next++) {
          const e = sched[next], x = ins[e.name];
          if (!x) throw new Error('KIT.rive: the state machine has no input "' + e.name + '"');
          if (e.fire) x.asTrigger().fire(); else if (typeof e.value === 'boolean') x.asBool().value = e.value; else x.asNumber().value = e.value;
        }
        sm.advanceAndApply(ticks ? step : 0); ticks++;
      };
      const end = dur !== undefined ? dur : loop || sm ? Infinity : len / Math.abs(speed || 1);
      h.set = (t) => {
        const lt = (Math.min(Math.max(t, start), start + end) - start) * speed;
        if (sm) {
          const n = Math.round(lt / step) + 1;   // ticks to have run: tick 0 is time 0
          if (n < ticks) open();
          while (ticks < n) tick();
          h.artboard = ab;
        } else if (anim) {
          anim.time = len ? (loop ? ((lt % len) + len) % len : Math.min(lt, len)) : 0;
          anim.apply(1); ab.advance(0);
        } else ab.advance(0);
        renderer.clear(); renderer.save();
        renderer.align(F, A, frame, ab.bounds);
        ab.draw(renderer); renderer.restore(); R.resolveAnimationFrame();   // CanvasKit buffers 2D calls; this runs them now
      };
    })());
    return h;
  };
})();
