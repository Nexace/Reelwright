// hit-sync.js: land a moment on the hit you hear, and time a beat by a name instead of a number. Load after engine.js.
//   KIT.hit(t, { band = 'kick', tol = 1/60 })   t moved to the nearest onset of that band when one is within tol s, else t
//       unchanged. The onsets are measured on the rendered film's own audio by tools/beatsync.py --write → music/onsets.json,
//       baked by tools/sched.py into window.MUSIC.onsets = { kick: [...], snare: [...], hat: [...] } (film time, sorted). No
//       onsets (a music-less film, or none written yet) → t, so nothing breaks. ±1 frame at 60 fps (16.7 ms) is inside every
//       published audio/video sync window (ITU-R BT.1359-1: 45 ms lead, 125 ms lag), so a snapped landing is invisible and
//       reads as on the hit. Never an AnalyserNode/FFT at render time: that is frame-rate dependent.
//   KIT.mark(name)       the absolute time of a named marker (project.json "marks" → tools/marks.py → marks.json → sched)
//   KIT.until(name, t)   marks[name].t - t: count down to it in render(t) (Motion Canvas's waitUntil, as a pure value)
//   KIT.dur(name)        the marker's length in seconds (useDuration)
// Pure functions of t: no clock, no state, no audio graph.
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('hit-sync.js: load tools/engine.js first');
  const MU = K.MUSIC || {};
  const mark = (name) => {
    const m = MU.marks && MU.marks[name];
    if (!m) throw new Error(`no mark "${name}": add it to project.json "marks" and run reelwright marks <project>`);
    return m;
  };
  K.hit = (t, { band = 'kick', tol = 1 / 60 } = {}) => {
    const on = (MU.onsets && MU.onsets[band]) || [];
    if (!on.length) return t;                              // no onsets: the moment stays where the caller put it
    let lo = 0, hi = on.length - 1;                        // first onset >= t (the baked list is sorted)
    while (lo < hi) { const m = (lo + hi) >> 1; if (on[m] < t) lo = m + 1; else hi = m; }
    const a = on[Math.max(0, lo - 1)], b = on[lo], near = Math.abs(a - t) <= Math.abs(b - t) ? a : b;
    return Math.abs(near - t) <= tol ? near : t;
  };
  K.mark = (name) => mark(name).t;
  K.until = (name, t) => {
    if (!Number.isFinite(t)) throw new Error('until: give t (the frame time in render(t))');
    return mark(name).t - t;
  };
  K.dur = (name) => mark(name).dur || 0;
})();
