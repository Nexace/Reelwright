// Animation runtimes driven by render(t): KIT.gsap, KIT.lottie, KIT.anime, KIT.three and KIT.animations (CSS / WAAPI).
// Loaded after engine.js; gsap/lottie/anime need their vendor/<lib>/ script before this file (three is imported on use):
//   gsap(build)                       → { tl, set(t) }  build(tl, gsap) adds tweens to a paused timeline at absolute times
//   lottie(el, data, { t0, speed, loop, renderer }) → { anim, dur, set(t) }  data = Lottie JSON object (or a path)
//   anime(build)                      → { items, set(t) }  build(anime) returns animate()/createTimeline() results
//   three(el, build, { renderer })    → { set(t) }  build(THREE, renderer, { w, h }) returns { scene, camera, update(t) }
//   animations(t)                     seeks every CSS @keyframes animation and element.animate() animation on the page to t
// Each set(t) / animations(t) is called from the film's render(t) and is a pure function of t: libraries are paused at load
// and only ever seeked, never played. Loading (fonts for SplitText, Lottie DOM, the three module) finishes before the first
// frame: KIT.start's READY waits for it, and HyperFrames waits through window.__hfTimelinesBuilding + "hf-timelines-built".
// HyperFrames' own adapters (lottie, css, waapi, animejs) also seek what they find; its root timeline (render(t)) seeks
// last, so these helpers decide the frame. Banned for determinism (tools/checks/seekable-runtimes.*): docs/playbook/runtimes.md.
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.start) throw new Error('tools/runtimes.js: load tools/engine.js first');
  const base = document.currentScript.src;

  // ── load waits ──────────────────────────────────────────────────────────
  const waits = [];
  // HyperFrames' GSAP stub also writes __hfTimelinesBuilding (false when its own queue drains): keep both writers' state,
  // so it can't clear the flag while a load here is pending
  let building = 0, stub = !!window.__hfTimelinesBuilding;
  Object.defineProperty(window, '__hfTimelinesBuilding', { configurable: true, get: () => building > 0 || stub, set: (v) => { stub = !!v; } });
  const wait = (p) => {
    building++;
    // a failed load stays "building": HyperFrames never starts capturing (loud), pvk's READY rejects
    const q = Promise.resolve(p).then(() => {
      if (--building || stub) return;
      window.dispatchEvent(new Event('hf-timelines-built'));
    }, (e) => { console.error('tools/runtimes.js: a runtime failed to load:', e); throw e; });
    waits.push(q); return q;
  };
  K.wait = wait;   // other kit modules (tools/dotlottie.js) hold the first frame back through the same READY gate
  let css = false;
  const seekCss = (t) => {
    for (const a of document.getAnimations()) seen.add(a);
    for (const a of seen) {
      if (a.playState === 'idle') { seen.delete(a); continue; }   // a CSS animation the style dropped (a new one replaces it)
      a.pause(); a.currentTime = Math.max(0, t) * 1000;
    }
    // currentTime writes nothing to the DOM: stamp the progress so pvk's frame cache (a DOM fingerprint) sees it move
    document.documentElement.dataset.kitAnimations = [...seen].map((a) => a.effect ? a.effect.getComputedTiming().progress : '').join(',');
  };
  const seen = new Set();
  const start = K.start;
  K.start = (o) => {
    start(o);
    const ready = window.READY, render = window.render;
    // engine.js re-rasters by hiding <body> for a moment, which restarts CSS animations: seek them again after it
    window.render = async (t) => { await render(t); if (css) seekCss(t); };
    // engine.js rendered #12.5 (a preview moment) before the libraries were built: render it again now
    const h = location.hash.slice(1), t0 = h && h !== 'play' && Number.isFinite(Number(h)) ? Number(h) : 0;
    window.READY = ready.then(async (ok) => { while (waits.length) await waits.shift(); await window.render(t0); return ok; });
  };

  // ── CSS @keyframes and WAAPI ────────────────────────────────────────────
  // Animations keep their own delay and duration: currentTime = t s is what the page would show t s after load.
  K.animations = (t) => { css = true; seekCss(t); };

  // ── GSAP ────────────────────────────────────────────────────────────────
  const PLUGINS = ['CustomEase', 'CustomWiggle', 'CustomBounce', 'SplitText', 'DrawSVGPlugin', 'MorphSVGPlugin', 'TextPlugin',
    'Physics2DPlugin', 'PhysicsPropsPlugin', 'ExpoScaleEase', 'SlowMo'];
  K.gsap = (build) => {
    const g = window.gsap;
    if (!g) throw new Error('KIT.gsap: load vendor/gsap/dist/gsap.min.js (and any plugins) before tools/runtimes.js');
    const h = { tl: null, set: (t) => { if (h.tl) h.tl.totalTime(Math.max(0, t)); } };
    wait(document.fonts.ready.then(() => {   // SplitText measures lines: split with the real fonts
      g.ticker.lagSmoothing(0); g.config({ nullTargetWarn: false });
      g.registerPlugin(...PLUGINS.map((n) => window[n]).filter(Boolean));
      // HyperFrames' producer wraps gsap.timeline() in a proxy that queues tweens and flushes them later: use the real one
      const tp = g.timeline({ paused: true, defaults: { ease: K.ease } }), tl = tp.__hfReal || tp;
      build(tl, g);
      tl.totalTime(tl.totalDuration()); tl.totalTime(0);   // .from() and relative values read their start once, here
      h.tl = tl;
    }));
    return h;
  };

  // ── Lottie ──────────────────────────────────────────────────────────────
  K.lottie = (el, data, { t0 = 0, speed = 1, loop = false, renderer = 'svg', rendererSettings = {} } = {}) => {
    const L = window.lottie;
    if (!L) throw new Error('KIT.lottie: load vendor/lottie/lottie.min.js before tools/runtimes.js');
    const anim = L.loadAnimation({ container: el, renderer, loop: false, autoplay: false,
      ...(typeof data === 'string' ? { path: data } : { animationData: data }),
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet', ...rendererSettings } });
    const h = { anim, dur: 0, set: (t) => {
      const n = anim.totalFrames;
      if (!anim.isLoaded || !n) return;
      const f = (t - t0) * speed * anim.frameRate;
      anim.goToAndStop(loop ? ((f % n) + n) % n : K.clamp(f, 0, n - 1), true);   // subframes on: no stepping at 60 fps
    } };
    wait(new Promise((res, rej) => {
      const done = () => { h.dur = anim.totalFrames / anim.frameRate; res(); };
      if (anim.isLoaded) done();
      else { anim.addEventListener('DOMLoaded', done); anim.addEventListener('data_failed', () => rej(new Error('KIT.lottie: data failed to load'))); }
    }));
    return h;
  };

  // ── anime.js (v4) ───────────────────────────────────────────────────────
  K.anime = (build) => {
    const A = window.anime;
    if (!A) throw new Error('KIT.anime: load vendor/anime/anime.umd.min.js before tools/runtimes.js');
    if (A.engine) A.engine.useDefaultMainLoop = false;   // no requestAnimationFrame loop: only seek() moves anything
    const items = [].concat(build(A) || []);
    // prime like KIT.gsap: a child that starts later otherwise shows its from-state only after a later time was visited
    for (const a of items) { a.pause(); a.seek(a.duration, true); a.seek(0, true); }
    return { items, set: (t) => { for (const a of items) a.seek(Math.max(0, t) * 1000, true); } };
  };

  // ── Three.js ────────────────────────────────────────────────────────────
  // three is ES modules only: imported here on first use (pvk pages run with --allow-file-access-from-files)
  const THREE_URL = new URL(/\/tools\/runtimes\.js(\?|$)/.test(base) ? '../vendor/three/three.module.js' : 'three/three.module.js', base).href;
  K.three = (el, build, { renderer: ro = {} } = {}) => {
    const h = { set: () => {} };
    wait(import(THREE_URL).then((THREE) => {
      const w = el.clientWidth || K.W_, ht = el.clientHeight || K.H_;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, ...ro });
      renderer.setPixelRatio(1); renderer.setSize(w, ht);
      el.appendChild(renderer.domElement);
      const { scene, camera, update } = build(THREE, renderer, { w, h: ht });
      Object.assign(h, { THREE, renderer, scene, camera, set: (t) => { if (update) update(t); renderer.render(scene, camera); } });
    }));
    return h;
  };
})();
