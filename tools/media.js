// media.js — video clips and extra audio for any film. Opt in after the engine:
//   hf:  <script src="kit/media.js"></script>      pvk: <script src="../../../tools/media.js"></script>
// KIT.video(src, { id, start, dur, in, rate, ramp, volume, audio, parent, cls }) → the element that shows the clip
//   hf: a real <video> the producer extracts frames for; pvk: an <img> showing frames the renderer pre-extracts with
//   ffmpeg (Playwright's Chromium can't decode H.264). Position/style it from render(t) like any element.
// KIT.audio(src, { start, in, out, gain, fadeIn, fadeOut }) — a sound mixed over mix.wav at encode (both renderers).
// Both publish on window.KIT_MEDIA (videos / audio); tools/renderers/media.mjs reads it. docs/playbook/video-audio.md
'use strict';
(() => {
  const K = window.KIT;
  const HF = !!document.querySelector('[data-composition-id]');   // an hf/index.html root; pvk pages have none
  const M = window.KIT_MEDIA = window.KIT_MEDIA || {};
  M.videos = M.videos || []; M.audio = M.audio || [];

  // ── speed ramps ─────────────────────────────────────────────────────────
  // Ported from HyperFrames packages/core/src/speedRamp.ts + audioAutomation.ts sampleAutomationLane (Apache-2.0, Copyright HeyGen)
  // shortcut: plain {t, v} points only (no curve / viaX shaping); port shapeProgress if a film needs bent segments
  const MIN_RATE = 0.1, MAX_RATE = 10, CELLS = 48;
  const rateAt = (pts, t) => {   // log-scale interpolation, holds outside the points
    const n = pts.length - 1;
    if (t <= pts[0].t) return pts[0].v;
    if (t >= pts[n].t) return pts[n].v;
    let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].t <= t) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi], span = b.t - a.t;
    if (span <= 0) return b.v;
    return Math.exp(Math.log(a.v) + (Math.log(b.v) - Math.log(a.v)) * (t - a.t) / span);
  };
  const tableOf = (pts) => {   // clip-local times and the source seconds consumed by each (trapezoids)
    const ts = [0], ss = [0];
    const push = (t) => { const p = ts[ts.length - 1]; if (t <= p) return;
      ss.push(ss[ss.length - 1] + (rateAt(pts, p) + rateAt(pts, t)) / 2 * (t - p)); ts.push(t); };
    push(Math.max(0, pts[0].t));
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1].t, b = pts[i].t;
      if (b <= 0) continue;
      for (let k = 1; k <= CELLS; k++) push(Math.max(a, 0) + (b - a) * k / CELLS);
    }
    return { ts, ss, first: pts[0].v, last: pts[pts.length - 1].v };
  };
  const sourceTimeAt = (T, t) => {   // source seconds consumed by clip-local time t
    const n = T.ts.length - 1;
    if (t <= 0) return t * T.first;
    if (t >= T.ts[n]) return T.ss[n] + (t - T.ts[n]) * T.last;
    let lo = 0, hi = n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.ts[m] <= t) lo = m; else hi = m; }
    return T.ss[lo] + (T.ss[hi] - T.ss[lo]) * (t - T.ts[lo]) / (T.ts[hi] - T.ts[lo]);
  };
  const RAMP_SLICE = 0.25, MAX_SLICES = 240;   // HyperFrames audioMixer.js: a ramp's sound as constant-tempo slices

  const num = (v, what) => { if (!Number.isFinite(v)) throw new Error(`${what} must be a number of seconds (from W(), V(), KIT.snap())`); return v; };

  // ── KIT.video ───────────────────────────────────────────────────────────
  const clips = [], frames = {};
  // the pvk renderer calls this on every page after READY: frame i (0-based) of the clip at FPS is url/<i+1, 6 digits>.jpg
  K.__videoFrames = (id, url, count, fps) => { frames[id] = { url, count, fps }; };
  K.video = (src, { id, start, dur, in: mediaIn = 0, rate = 1, ramp, volume = 1, audio = false, parent = K.stage, cls } = {}) => {
    if (!id || typeof id !== 'string') throw new Error(`KIT.video("${src}"): give it an id (the renderer keys frames on it)`);
    if (M.videos.some((v) => v.id === id)) throw new Error(`KIT.video: id "${id}" is used twice`);
    num(start, `KIT.video("${id}") start`); num(mediaIn, `KIT.video("${id}") in`);
    if (!(dur > 0)) throw new Error(`KIT.video("${id}"): dur must be > 0 seconds`);
    if (!(rate >= MIN_RATE && rate <= MAX_RATE)) throw new Error(`KIT.video("${id}"): rate ${rate} is outside ${MIN_RATE}–${MAX_RATE}`);
    let lane = null;
    if (ramp) {
      if (!Array.isArray(ramp) || !ramp.length) throw new Error(`KIT.video("${id}"): ramp is [{ t, v }, ...] (t seconds from the clip start, v speed)`);
      lane = ramp.map((p, i) => {
        const bad = Object.keys(p).filter((k) => k !== 't' && k !== 'v');
        if (bad.length) throw new Error(`KIT.video("${id}"): ramp point keys ${bad.join(', ')} unsupported — only t and v`);
        if (!Number.isFinite(p.t) || i && p.t < ramp[i - 1].t) throw new Error(`KIT.video("${id}"): ramp t must be ascending seconds`);
        return { t: p.t, v: Math.min(MAX_RATE, Math.max(MIN_RATE, Number(p.v))) };
      });
    }
    const T = lane && tableOf(lane);
    const srcAt = (local) => (T ? sourceTimeAt(T, local) : local * rate);   // source seconds after `in`
    M.videos.push({ id, src, start, dur, in: mediaIn, rate, ramp: lane, audio: !!audio, volume });
    if (audio) {
      const a = { src, start, in: mediaIn, out: mediaIn + srcAt(dur), gain: volume, fadeIn: 0, fadeOut: 0, len: dur, video: id };
      if (T) { const n = Math.min(MAX_SLICES, Math.max(1, Math.ceil(dur / RAMP_SLICE))), step = dur / n;
        a.slices = Array.from({ length: n }, (_, i) => [srcAt(i * step), srcAt((i + 1) * step)]); a.step = step; }
      else if (rate !== 1) a.tempo = rate;
      M.audio.push(a);
    }
    if (HF) {   // the producer finds video[data-start] with an id, extracts its frames and draws them in its place
      const v = K.el('video', cls, parent);
      v.id = id; v.muted = true;
      for (const k of ['muted', 'playsinline']) v.setAttribute(k, '');
      v.setAttribute('preload', 'auto');
      v.dataset.start = start; v.dataset.duration = dur; v.dataset.mediaStart = mediaIn; v.dataset.playbackRate = rate;
      if (lane) v.dataset.automation = JSON.stringify({ version: 1, lanes: [{ target: 'rate', points: lane }] });
      v.src = src;
      return v;
    }
    const im = K.el('img', cls, parent);
    im.id = id;
    clips.push({ id, im, start, dur, in: mediaIn, srcAt });
    return im;
  };
  // pvk: show the frame for source time in + ∫rate, inside [start, start + dur); a pure function of t
  const showFrames = (t) => {
    for (const c of clips) {
      const on = t >= c.start && t < c.start + c.dur;
      c.im.style.display = on ? '' : 'none';
      const f = frames[c.id];
      if (!on || !f) continue;
      // HyperFrames getFrameIndexAtTime: floor of the shown time (+1e-5 media lead); past the source end holds the last frame
      const i = Math.min(f.count - 1, Math.max(0, Math.floor((c.in + c.srcAt(t - c.start) + 1e-5) * f.fps)));
      K.img(c.im, f.url + '/' + String(i + 1).padStart(6, '0') + '.jpg');
    }
  };

  // ── KIT.audio ───────────────────────────────────────────────────────────
  K.audio = (src, { start, in: mediaIn = 0, out, gain = 1, fadeIn = 0, fadeOut = 0 } = {}) => {
    num(start, `KIT.audio("${src}") start`); num(mediaIn, `KIT.audio("${src}") in`);
    if (out !== undefined && !(num(out, `KIT.audio("${src}") out`) > mediaIn)) throw new Error(`KIT.audio("${src}"): out must be after in`);
    if (!(gain >= 0) || !(fadeIn >= 0) || !(fadeOut >= 0)) throw new Error(`KIT.audio("${src}"): gain, fadeIn and fadeOut are >= 0`);
    M.audio.push({ src, start, in: mediaIn, ...(out !== undefined && { out, len: out - mediaIn }), gain, fadeIn, fadeOut });
  };

  const s = K.start;
  K.start = (o) => s({ ...o, render: (t) => { o.render(t); showFrames(t); } });
})();
