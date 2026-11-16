// KIT.dotLottie: a .lottie file (dotLottie: a zip of one or more Lottie animations, themes, images, state machines) driven by
// render(t). Wraps @lottiefiles/dotlottie-web (vendor/dotlottie/: ES module + WASM engine) the way KIT.lottie wraps lottie-web:
// paused at load, only ever seeked (setFrame), never played. Load after tools/engine.js and tools/runtimes.js (its READY gate).
//   dotLottie(host, src, { t0, speed, loop, animation, theme, schedule, fit })  → { player, dur, fps, set(t) }
//     host      a <canvas>, or any element (a canvas that fills it is created inside)
//     src       URL of a .lottie or .json (read with XMLHttpRequest: works from file://), or an ArrayBuffer / Uint8Array
//     animation id of the animation in the archive (default: the first); theme id (default: none)
//     schedule  [{ at, animation?, theme? }]: which animation / theme shows from film time `at` on. This is the film-time
//               stand-in for a state machine: dotLottie's own state machines run on a real-time clock and cannot be seeked,
//               so the film decides when each state shows. Each entry restarts its animation at frame 0 at `at`.
//   `reelwright add-lottie x.lottie` unpacks the archive (animations, themes, images, state machines) next to the project.
// The WASM engine is read from vendor/dotlottie/ through a blob: URL, so the player never reaches for its CDN fallback.
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.start || !K.wait) throw new Error('tools/dotlottie.js: load tools/engine.js and tools/runtimes.js first');
  const base = document.currentScript.src, inTools = /\/tools\/dotlottie\.js(\?|$)/.test(base);
  const DIR = (f) => new URL((inTools ? '../vendor/dotlottie/' : 'dotlottie/') + f, base).href;

  const read = (url) => new Promise((res, rej) => {   // XHR, not fetch: file:// pages (pvk) can read local files this way only
    const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer';
    x.onload = () => (x.status === 200 || (x.status === 0 && x.response && x.response.byteLength) ? res(x.response) : rej(new Error('KIT.dotLottie: could not read ' + url + ' (' + x.status + ')')));
    x.onerror = () => rej(new Error('KIT.dotLottie: could not read ' + url));
    x.send();
  });
  let lib = null;
  const load = () => lib || (lib = (async () => {
    const [mod, wasm] = await Promise.all([import(DIR('dotlottie-web.js')), read(DIR('dotlottie-player.wasm'))]);
    mod.DotLottie.setWasmUrl(URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' })));
    return mod.DotLottie;
  })());

  K.dotLottie = (host, src, { t0 = 0, speed = 1, loop = false, animation, theme, schedule = [], fit = 'contain' } = {}) => {
    const canvas = host.tagName === 'CANVAS' ? host : K.el('canvas', '', host);
    if (host !== canvas) { canvas.width = host.clientWidth || K.W_; canvas.height = host.clientHeight || K.H_; canvas.style.width = '100%'; canvas.style.height = '100%'; }
    const h = { player: null, dur: 0, fps: 30, set: () => {} };
    K.wait((async () => {
      const [DotLottie, data] = await Promise.all([load(), typeof src === 'string' ? read(src) : Promise.resolve(src)]);
      const player = new DotLottie({ canvas, data, autoplay: false, loop: false, animationId: animation, themeId: theme,
        layout: { fit, align: [0.5, 0.5] }, renderConfig: { devicePixelRatio: 1, autoResize: false, freezeOnOffscreen: false } });
      await new Promise((res, rej) => { player.addEventListener('load', res); player.addEventListener('loadError', (e) => rej(new Error('KIT.dotLottie: ' + (e.error && e.error.message || 'load error')))); });
      h.player = player; h.dur = player.duration; h.fps = player.totalFrames / player.duration;
      const first = player.activeAnimationId, sched = schedule.slice().sort((a, b) => a.at - b.at);
      h.set = (t) => {
        let s = null; for (const e of sched) if (t >= e.at) s = e;   // the last entry already reached
        const anim = (s && s.animation) || first, th = s ? (s.theme ?? theme) : theme, from = s ? s.at : t0;
        if (anim !== player.activeAnimationId) player.loadAnimation(anim);
        if ((th || '') !== (player.activeThemeId || '')) player.setTheme(th || '');
        const n = player.totalFrames, f = (t - from) * speed * (n / player.duration);   // each animation has its own frame rate
        player.setFrame(loop ? ((f % n) + n) % n : K.clamp(f, 0, Math.max(0, n - 1)));
      };
    })());
    return h;
  };
})();
