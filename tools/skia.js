// KIT.skia: Skia drawing (CanvasKit WASM, vendor/canvaskit/) driven by render(t). A CanvasKit surface is made over a
// <canvas> once; each set(t) clears it and calls your draw(canvas, CanvasKit, t), then flushes. There is no player and no
// clock: the frame is whatever draw() paints for t, so render(t) stays pure.
// Load after tools/engine.js and tools/runtimes.js (its READY gate).
//   skia(host, draw)                                     → { canvas, CK, surface, set(t) }
//     host    a <canvas>, or any element (a canvas that fills it is created inside)
//     draw    (canvas, CanvasKit, t) => void: paint the frame for film time t on the CanvasKit canvas. Use the usual
//             CanvasKit API: CK.Paint, CK.Path, canvas.drawRect/drawPath/drawTextBlob, save/restore, clip, matrices...
//             Text needs a typeface: `CK.Typeface.MakeFreeTypeFaceFromData(bytes)` of a TTF/OTF (a woff2 will not parse).
// The software (CPU) surface is used on purpose: it rasters the same on every machine, which is what a deterministic
// frame needs. The wasm is read from vendor/canvaskit/ and handed to CanvasKitInit as a blob: URL, so it never reaches
// for a CDN and a film renders offline.
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.start || !K.wait) throw new Error('tools/skia.js: load tools/engine.js and tools/runtimes.js first');
  const base = document.currentScript.src, inTools = /\/tools\/skia\.js(\?|$)/.test(base);
  const DIR = (f) => new URL((inTools ? '../vendor/canvaskit/' : 'canvaskit/') + f, base).href;

  const read = (url) => new Promise((res, rej) => {   // XHR, not fetch: file:// pages (pvk) can read local files this way only
    const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer';
    x.onload = () => (x.status === 200 || (x.status === 0 && x.response && x.response.byteLength) ? res(x.response) : rej(new Error('KIT.skia: could not read ' + url + ' (' + x.status + ')')));
    x.onerror = () => rej(new Error('KIT.skia: could not read ' + url));
    x.send();
  });
  const script = (url) => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = () => rej(new Error('KIT.skia: could not load ' + url));
    document.head.appendChild(s);
  });
  let lib = null;
  const load = () => lib || (lib = (async () => {
    const [, wasm] = await Promise.all([script(DIR('canvaskit.js')), read(DIR('canvaskit.wasm'))]);
    const url = URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' }));
    return window.CanvasKitInit({ locateFile: (f) => (/\.wasm$/.test(f) ? url : f) });   // nothing may reach for the network
  })());

  K.skia = (host, draw) => {
    const canvas = host.tagName === 'CANVAS' ? host : K.el('canvas', '', host);
    if (host !== canvas) { canvas.width = host.clientWidth || K.W_; canvas.height = host.clientHeight || K.H_; canvas.style.width = '100%'; canvas.style.height = '100%'; }
    const h = { canvas, CK: null, surface: null, set: () => {} };
    K.wait((async () => {
      const CK = await load();
      const surface = CK.MakeSWCanvasSurface(canvas);
      if (!surface) throw new Error('KIT.skia: CanvasKit could not make a surface for the canvas');
      h.CK = CK; h.surface = surface;
      h.set = (t) => {
        const c = surface.getCanvas();
        c.clear(CK.TRANSPARENT);
        c.save();
        draw(c, CK, t);
        c.restore();
        surface.flush();
      };
    })());
    return h;
  };
})();
