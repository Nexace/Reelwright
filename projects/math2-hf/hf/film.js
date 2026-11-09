// Math depth demo: 1 "write": an identity written glyph by glyph (KIT.tex, MathJax paths), rearranged with
// TransformMatchingTex; 2 "warp": a complex plane warped by z² (KIT.math.plane + warp); 3 "depth": a checkerboard saddle
// and a helix in 3D with the camera turning (KIT.math3d). Scenes crossfade; every time comes from V/W/snap.
'use strict';
const { el, css, show, win, V, W, snap } = KIT, S = KIT.safe, u = KIT.u, M = KIT.math;
const CX = S.x + S.w / 2, CY = S.y + S.h / 2, DUR = window.PROJECT.speechEnd + window.PROJECT.tail, F = KIT.dur(0.4);
const tag = (parent, text) => { const e = el('div', 'tag', parent, text); css(e, { left: CX - e.offsetWidth / 2 + 'px', top: S.y + S.h * 0.86 + 'px' }); };
const IN2 = snap(V('warp').start - KIT.dur(0.3)), IN3 = snap(V('depth').start - KIT.dur(0.3));

// ── 1. write ─────────────────────────────────────────────────────────────
const s1 = el('div', 'scene');
const eqA = KIT.tex('a^2 + b^2 = c^2', { x: CX, y: CY - 20 * u, size: 110 * u, parent: s1 });
const eqB = KIT.tex('c^2 = a^2 + b^2', { x: CX, y: CY - 20 * u, size: 110 * u, parent: s1 });
eqA.color('c^2', 'var(--kit-accent)'); eqB.color('c^2', 'var(--kit-accent)');
const WRITE = snap(W('write', 'Write'));
eqA.write({ at: WRITE, dur: KIT.dur(1.4) }).transform(eqB, { at: snap(W('write', 'glyph')), dur: KIT.dur(1), pathArc: Math.PI / 2 });
tag(s1, 'KIT.tex · write + TransformMatchingTex');

// ── 2. warp ──────────────────────────────────────────────────────────────
const s2 = el('div', 'scene');
const box = { x: CX - S.h * 0.36, y: S.y + S.h * 0.06, w: S.h * 0.72, h: S.h * 0.72 };
const plane = M.plane({ kind: 'complex', x: [-2, 2, 0.5], y: [-2, 2, 0.5], box, labels: false, clip: true, in: IN2, parent: s2 });
const sq = (z) => ({ re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im });
const warp = M.warp(plane, sq, { kind: 'complex', in: snap(W('warp', 'squared')) - KIT.dur(0.6), dur: KIT.dur(1.6) });
tag(s2, 'KIT.math.plane · warp z → z²');

// ── 3. depth ─────────────────────────────────────────────────────────────
const s3 = el('div', 'scene');
const box3 = el('div', '', s3); css(box3, { position: 'absolute', left: 0, top: 0, width: KIT.W_ + 'px', height: KIT.H_ + 'px' });
const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue('--kit-' + n).trim();   // Three needs real colours
const sc = KIT.math3d.scene(box3, (a) => {
  const ax = a.axes({ x: [-3, 3, 1], y: [-3, 3, 1], z: [-2, 2, 1] });
  const sd = a.surface((x, y) => [x, y, (x * x - y * y) / 4], { u: [-2.5, 2.5], v: [-2.5, 2.5], resolution: [20, 20], wire: true,
    checkerboard: [tok('accent'), tok('accent-2') || tok('muted')] });
  const hx = a.curve((t) => [1.4 * Math.cos(t), 1.4 * Math.sin(t), t / 3], { t: [-3, 3 * Math.PI], samples: 160, width: 0.05 });
  a.each((t) => { ax.show(t, { in: IN3, grow: true }); sd.show(t, { in: IN3 + 0.3, dur: KIT.dur(0.8) }); hx.show(t, { in: IN3 + 0.8, dur: KIT.dur(1.6), draw: true }); });
}, { phi: 70, theta: -60, zoom: 0.72 });
sc.camera.orient(IN3, IN3 + KIT.dur(1.6), { phi: 64, theta: -25, zoom: 0.85 });
sc.camera.ambient({ rate: 14, from: IN3 + KIT.dur(1.6) });
tag(s3, 'KIT.math3d · surface + curve');

const subs = KIT.subtitles(['write', 'warp', 'depth']);
css(subs.box, { bottom: KIT.H_ - S.y - S.h + 'px' });

function render(t) {
  show(s1, win(t, 0, IN2 + F, 0.01, F)); eqA.set(t); eqB.set(t);
  show(s2, win(t, IN2, IN3 + F, F, F)); plane.set(t); warp.set(t);
  show(s3, win(t, IN3, DUR, F, KIT.dur(0.5))); sc.set(t);
  subs.set(t);
}
KIT.start({ dur: DUR, render });
