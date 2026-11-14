// p9-audio.js: audio visualisation for any film (Remotion visualizeAudio / visualizeAudioWaveform / createSmoothSvgPath). Load after engine.js and
// the data file `reelwright spectrum` writes (window.AUDIO_BANDS, FFT done at build time). Pure lookups: the same t gives the same answer in any order.
//   KIT.level(t)             loudness 0..1 at t (RMS of the frame; a full-scale sine reads 1), linear between frames
//   KIT.spectrum(t, n = 32)  n amplitudes 0..1, low frequencies first (bass = index 0), n a power of 2 up to the stored bins; groups of bins are
//                            combined by their peak. A full-scale sine reads ~1 in its bin.
//   KIT.waveform(t, n = 64, { window = 0.1 })  n signed samples (-1..1) across [t - window/2, t + window/2] seconds
//   KIT.smoothPath(points, { close = false })  SVG path `d` through [x, y] points as joined quadratic curves (Remotion createSmoothSvgPath)
//   KIT.audioBands           the stored data { fps, bins, sampleRate, nyquist, frames, level, wave }
// Beyond the clip, the answers are 0 (silence), so a film longer than its sound is fine.
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('p9-audio.js: load tools/engine.js first');
  const data = () => {   // read when called, so the data file may load after this script
    if (!window.AUDIO_BANDS) throw new Error('KIT.level/spectrum/waveform: window.AUDIO_BANDS is missing; run `reelwright spectrum` and load its audio-bands.js');
    return window.AUDIO_BANDS;
  };
  Object.defineProperty(K, 'audioBands', { get: data });
  const at = (arr, t, f) => {   // frame f = t * fps, linear between the two neighbours; outside the clip 0
    const B = data(), x = t * B.fps, i = Math.floor(x), w = x - i;
    return [i, i + 1].map((j, k) => (j >= 0 && j < arr.length ? f(arr[j]) * (k ? w : 1 - w) : 0));
  };
  K.level = (t) => at(data().level, t, (v) => v).reduce((a, b) => a + b, 0);
  K.spectrum = (t, n = 32) => {
    const B = data();
    if (n & (n - 1) || n < 1 || n > B.bins) throw new Error(`KIT.spectrum: n is a power of 2 up to ${B.bins} (got ${n})`);
    const g = B.bins / n, out = new Array(n).fill(0);
    const x = t * B.fps, i = Math.floor(x), w = x - i;
    [[i, 1 - w], [i + 1, w]].forEach(([j, wt]) => {
      const row = B.frames[j];
      if (!row) return;
      for (let b = 0; b < n; b++) { let m = 0; for (let k = b * g; k < (b + 1) * g; k++) m = Math.max(m, row[k]); out[b] += m * wt; }
    });
    return out;
  };
  K.waveform = (t, n = 64, { window: win = 0.1 } = {}) => {
    const B = data(), d = B.wave.data, r = B.wave.rate;
    return Array.from({ length: n }, (_, k) => {
      const x = (t - win / 2 + (win * k) / Math.max(1, n - 1)) * r, i = Math.floor(x), w = x - i;
      const v = (j) => (j >= 0 && j < d.length ? d[j] : 0);
      return v(i) * (1 - w) + v(i + 1) * w;
    });
  };
  K.smoothPath = (pts, { close = false } = {}) => {
    if (!Array.isArray(pts) || pts.length < 2) throw new Error('KIT.smoothPath: need at least 2 [x, y] points');
    const f = (v) => +v.toFixed(2), P = pts, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let d = `M${f(P[0][0])} ${f(P[0][1])}`;
    for (let i = 1; i < P.length - 1; i++) { const m = mid(P[i], P[i + 1]); d += ` Q${f(P[i][0])} ${f(P[i][1])} ${f(m[0])} ${f(m[1])}`; }
    const l = P[P.length - 1]; d += ` L${f(l[0])} ${f(l[1])}`;
    return close ? d + ' Z' : d;
  };
})();
