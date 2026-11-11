// Page shims for the film page the studio plays in the vendored <hyperframes-player>. COPIED from tools/commands/embed.mjs
// (SHIM's last block and CLOCK; embed.mjs is not edited, keep the two in step by hand). Preview only: renders never load these.

// In <head>, before the film's scripts. The player's probe starts on the iframe's first (about:blank) load; if it sees
// __timelines after 5 polls (1 s, a big page still parsing) it injects its runtime from jsdelivr. So main stays hidden
// from Object.keys until this page's load, which restarts the probe: it then finds main on its first poll.
// (embed.mjs also maps local files to data: URIs there; over http the studio serves them as they are.)
export const HIDE = `<script>/* reelwright studio: hide __timelines.main until load (tools/commands/embed.mjs SHIM) */
(() => { let m; const TL = window.__timelines = {};
  Object.defineProperty(TL, "main", { get: () => m, set: (v) => { m = v; }, enumerable: false, configurable: true });
  addEventListener("load", () => Object.defineProperty(TL, "main", { value: m, writable: true, enumerable: true, configurable: true }));
})();
</script>`;

// Before </body>: engine.js's __timelines.main only seeks (renders don't play); the player wants play()/pause() to run a
// clock, so give it one.
export const CLOCK = `<script>/* reelwright studio: real-time play() for the player (tools/commands/embed.mjs CLOCK) */
(() => { const wrap = () => { const T = window.__timelines && window.__timelines.main; if (!T || T.__rw) return; T.__rw = 1;
  const S = T.seek; let raf = 0, t0 = 0, w0 = 0;
  const tick = () => { const t = Math.min(T.duration(), w0 + (performance.now() - t0) / 1000); S(t); raf = t < T.duration() ? requestAnimationFrame(tick) : 0; };
  T.seek = (t) => { w0 = t; t0 = performance.now(); S(t); };
  T.play = () => { cancelAnimationFrame(raf); w0 = T.time(); t0 = performance.now(); raf = requestAnimationFrame(tick); };
  T.pause = () => { cancelAnimationFrame(raf); raf = 0; }; };
  wrap(); addEventListener("load", wrap); })();
</script>`;

// What the HyperFrames producer compiles into the page it renders (as tools/preview.mjs does): text metrics and glyph
// edges follow it, so the studio's player gets it too (renderer "hyperframes" only).
export const TEXT_RULE = "<style data-hyperframes-text-rendering>html,body,*{text-rendering:geometricPrecision}</style>";
