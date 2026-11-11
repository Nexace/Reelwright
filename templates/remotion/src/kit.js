// Reelwright's timing core for a Remotion film: pure functions of kit data (rm/kit-data.json, written by
// tools/renderers/remotion.mjs from tools/sched.py's output) and of t in seconds. No DOM, no clock, no Remotion
// import, so the renderer's `info` mode can import it in Node. Built with Remotion, see remotion.pro/license.
// Names follow KIT in tools/engine.js (seg, lerp, keys, V, W, snap, u, safe…), so a cue reads the same in every renderer.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));           // 0 before a → 1 after b
export const lerp = (a, b, p) => a + (b - a) * p;
export const win = (t, a, b, fi = 0.4, fo = 0.4) => Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b));   // fade in, hold, fade out

// easing: 'linear', '<family>.in|out|inOut' (quad, cubic, quart, quint, sine, expo, circ, back), or 'cubic-bezier(a, b, c, d)'
const OUT = {
  quad: (p) => 1 - (1 - p) ** 2, cubic: (p) => 1 - (1 - p) ** 3, quart: (p) => 1 - (1 - p) ** 4, quint: (p) => 1 - (1 - p) ** 5,
  sine: (p) => Math.sin((p * Math.PI) / 2), expo: (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p)),
  circ: (p) => Math.sqrt(1 - (p - 1) ** 2), back: (p) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2,
};
export const bezier = (x1, y1, x2, y2) => {
  const B = (a, b, s) => 3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s * s * b + s ** 3;
  return (p) => {
    if (p <= 0) return 0; if (p >= 1) return 1;
    let lo = 0, hi = 1, s = p;
    for (let i = 0; i < 40; i++) { s = (lo + hi) / 2; if (B(x1, x2, s) < p) lo = s; else hi = s; }   // fixed bisection: stateless
    return B(y1, y2, s);
  };
};
export const easing = (name = 'cubic.out') => {
  const n = String(name).trim();
  if (n === 'linear' || n === 'none') return (p) => clamp(p);
  const bz = /^cubic-bezier\(([^)]*)\)$/.exec(n);
  if (bz) { const a = bz[1].split(',').map(Number); if (a.length === 4 && !a.some(isNaN)) return bezier(...a); }
  const m = /^(\w+)\.(in|out|inOut)$/.exec(n), o = m && OUT[m[1]];
  if (!o) throw new Error(`unknown easing "${name}"`);
  const out = (p) => o(clamp(p));
  return { out, in: (p) => 1 - out(1 - p), inOut: (p) => (p < 0.5 ? (1 - out(1 - 2 * p)) / 2 : (out(2 * p - 1) + 1) / 2) }[m[2]];
};
// [[t0, v0], [t1, v1], …] with one easing per segment (default cubic.out), held outside
export const keys = (t, pts, eases = []) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    if (t >= pts[i + 1][0]) continue;
    const e = eases[i] || 'cubic.out';
    return lerp(pts[i][1], pts[i + 1][1], (typeof e === 'function' ? e : easing(e))(seg(t, pts[i][0], pts[i + 1][0])));
  }
  return pts[pts.length - 1][1];
};
// damped spring 0 → 1 in seconds since it started (closed form; damping ratio >= 1 uses the critical curve)
export const spring = (t, { mass = 1, damping = 10, stiffness = 100 } = {}) => {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
  if (z >= 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const a = z * w0, w1 = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-a * t) * (Math.cos(w1 * t) + (a / w1) * Math.sin(w1 * t));
};

const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

// props = rm/kit-data.json: {project, vo, music, width, height, fps}
export function makeKit(props = {}) {
  const VO = props.vo || {}, MU = { beat: 0.6, bar: 2.4, t0: 0, ...props.music }, PROJECT = props.project || {};
  const W_ = props.width || PROJECT.width || 1920, H_ = props.height || PROJECT.height || 1080, fps = props.fps || PROJECT.fps || 30;
  const V = (id) => { if (!VO[id]) throw new Error('no VO line ' + id); return VO[id]; };
  const find = (id, word, nth) => { let n = 0; for (const w of V(id).words) if (norm(w.w) === norm(word) && ++n === nth) return w;
    throw new Error(`word "${word}" (#${nth}) not in VO line ${id}: ${V(id).text}`); };
  // the line's display words (text split on spaces) with the start time of each, matched in order to the spoken words
  const words = (id) => {
    const v = V(id), ws = v.words;
    let wi = 0;
    return v.text.split(/\s+/).filter(Boolean).map((text) => {
      const n = norm(text);
      for (let j = wi; n && j < Math.min(ws.length, wi + 4); j++) {
        const m = norm(ws[j].w);
        if (m && (n.includes(m) || m.includes(n))) { wi = j + 1; return { text, t: ws[j].t }; }
      }
      return { text, t: ws[Math.min(wi, ws.length - 1)].t };
    });
  };
  const fmt = W_ > H_ ? '16x9' : W_ < H_ ? '9x16' : '1x1';
  const [mx, top, bottom] = { '16x9': [0.06, 0.08, 0.08], '9x16': [0.08, 0.12, 0.2], '1x1': [0.07, 0.07, 0.07] }[fmt];
  const sx = Math.round(W_ * mx), sy = Math.round(H_ * top);
  return {
    clamp, seg, lerp, win, easing, bezier, keys, spring, VO, MUSIC: MU, PROJECT, fps, W_, H_, fmt,
    u: Math.min(W_, H_) / 1080,                                                  // 1 px at 1080 on the short side
    safe: { x: sx, y: sy, w: W_ - 2 * sx, h: H_ - sy - Math.round(H_ * bottom) },   // title-safe box, as KIT.safe
    V, W: (id, word, nth = 1) => find(id, word, nth).t, WE: (id, word, nth = 1) => { const w = find(id, word, nth); return w.t + w.d; },
    words,
    beat: (k) => MU.t0 + k * MU.beat, bar: (k) => MU.t0 + k * MU.bar,
    snap: (t, unit = MU.beat) => MU.t0 + Math.round((t - MU.t0) / unit) * unit,   // nearest beat (or bar)
    pulse: (t, decay = 9) => { const x = (t - MU.t0) / MU.beat; return x < 0 ? 0 : Math.exp(-(x - Math.floor(x)) * MU.beat * decay); },
    frame: (t) => Math.round(t * fps),
  };
}
