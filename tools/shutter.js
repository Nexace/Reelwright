// Per-shot shutter on KIT.shot.shutter: a fast action shot can use 270–360° (a long smear) and a crisp UI
// shot 90° (a short one), while the rest of the film keeps the project's shutter. The pvk renderer reads
// window.__reelwrightShutter(t) for every frame; with no registration it gets the project default (180°).
// Loaded after engine.js and shots.js.
//   KIT.shot.shutter(deg, from, to)          deg 0–360, film-time window [from, to)
//   KIT.shot.shutter(deg, { from, to })      the same, as an options object
//   KIT.shot.shutterAt(t) → degrees          the shutter in force at t (180 with none registered)
// Register windows at load (top level of film.js), never inside render(t): the renderer reads them for every frame, so a window
// added mid-render would change what an earlier frame already used. The renderer sees null outside every window and keeps the
// project's shutter; shutterAt is the 180-default convenience for film code.
// Motion blur must be on (project.json "motionBlur" or --blur); otherwise a shutter has no frame to spread.
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.shot) throw new Error('shutter.js: load tools/engine.js and tools/shots.js first');
  const S = K.shot, regs = [];
  S.shutter = (deg, from = 0, to = Infinity) => {
    const d = Number(deg);
    if (!(Number.isFinite(d) && d >= 0 && d <= 360)) throw new Error(`KIT.shot.shutter: deg must be 0..360 (got ${deg})`);
    if (from && typeof from === 'object') { to = from.to ?? Infinity; from = from.from ?? 0; }
    if (!(Number.isFinite(from) && from >= 0 && to > from)) throw new Error(`KIT.shot.shutter: window must be 0 ≤ from < to (got ${from}, ${to})`);
    regs.push({ deg: d, from, to });
    return d;
  };
  const inWindow = (t) => { let deg = null; for (const r of regs) if (t >= r.from && t < r.to) deg = r.deg; return deg; };   // a later registration wins an overlap
  S.shutterAt = (t) => inWindow(t) ?? 180;
  window.__reelwrightShutter = inWindow;   // null outside every window, so the renderer keeps the project's own shutter (not 180)
})();
