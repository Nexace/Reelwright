// Motion demo: four scene layers joined by KIT.transition (iris, light leak, brush). 1 "path": a KIT.path drawn on, a dot
// riding it; 2 "type": KIT.typewriter with one mistake, KIT.indicate.circumscribe; 3 "cam": three cards on depth planes
// (KIT.shot.planes) flown by a KIT.shot.tour; 4 "end": balls from a fixed-step KIT.sim. Every time comes from V/W/snap.
'use strict';
const { el, css, V, W, snap, cue } = KIT, S = KIT.safe, u = KIT.u, P = KIT.path;
const CX = S.x + S.w / 2, CY = S.y + S.h / 2, DUR = window.PROJECT.speechEnd + window.PROJECT.tail;
const scene = () => el('div', 'scene');
const [s1, s2, s3, s4] = [scene(), scene(), scene(), scene()];
const tag = (parent, text, y) => { const e = el('div', 'tag', parent, text); css(e, { left: CX - e.offsetWidth / 2 + 'px', top: y + 'px' }); return e; };
const NS = 'http://www.w3.org/2000/svg';

// ── 1. path ──────────────────────────────────────────────────────────────
const svg = document.createElementNS(NS, 'svg');
svg.setAttribute('width', KIT.W_); svg.setAttribute('height', KIT.H_); css(svg, { left: 0, top: 0 });
s1.appendChild(svg);
const pts = [[S.x, CY + S.h * 0.18], [S.x + S.w * 0.3, CY - S.h * 0.22], [S.x + S.w * 0.62, CY + S.h * 0.2], [S.x + S.w, CY - S.h * 0.12]];
const route = P(P.fromPoints(pts, { curviness: 1 }));
svg.innerHTML = `<path d="${route.d}" fill="none" stroke="var(--kit-accent)" stroke-width="${10 * u}" stroke-linecap="round"/>`;
const line = svg.firstChild, rider = el('div', 'dot', s1);
css(rider, { left: 0, top: 0, width: 46 * u + 'px', height: 46 * u + 'px' });
tag(s1, 'KIT.path', S.y + S.h * 0.86);
const DRAW = snap(W('path', 'Draw')), RIDE = snap(W('path', 'ride'));
cue(RIDE, 'whoosh');

// ── 2. type ──────────────────────────────────────────────────────────────
const typed = el('div', 'h', s2);
css(typed, { left: S.x + S.w * 0.18 + 'px', top: CY - 60 * u + 'px' });
const TYPE = snap(W('type', 'Type'));
const tw = KIT.typewriter(typed, 'KIT.transition', { at: TYPE, cps: 30, hold: 0.25, mistakes: [{ index: 4, wrong: 'tarns' }] });
const word = el('div', 'h', s2, 'circle it');
css(word, { left: S.x + S.w * 0.18 + 'px', top: CY + 70 * u + 'px', fontSize: 56 * u + 'px' });
const ring = KIT.indicate.circumscribe(word, { at: snap(W('type', 'circle')), dur: KIT.dur(1.2), shape: 'circle', parent: s2 });
tag(s2, 'KIT.typewriter + KIT.indicate', S.y + S.h * 0.86);

// ── 3. cam: three cards on depth planes, one camera ──────────────────────
const CAM = V('cam').start;
const planes = [[2.4, -0.28, -0.1], [1.4, 0.05, 0.12], [0.85, 0.3, -0.04]].map(([z, dx, dy], i) => {
  const layer = el('div', '', s3);
  css(layer, { left: 0, top: 0, width: KIT.W_ + 'px', height: KIT.H_ + 'px' });
  const c = el('div', 'card', layer), w = S.w * 0.26;
  css(c, { position: 'absolute', left: CX + dx * S.w - w / 2 + 'px', top: CY + dy * S.h - w * 0.32 + 'px', width: w + 'px', height: w * 0.64 + 'px',
    opacity: [0.55, 0.8, 1][i] });
  const lab = el('div', 'tag', c, ['far', 'mid', 'near'][i]); css(lab, { position: 'absolute', left: 24 * u + 'px', top: 20 * u + 'px' });
  return { el: layer, z };
});
const fly = KIT.shot.tour([
  { t: CAM, state: { z: 1, x: CX - S.w * 0.08, y: CY } },
  { t: CAM + KIT.dur(1.6), state: { z: 1.45, x: CX + S.w * 0.1, y: CY + S.h * 0.04 } },
  { t: CAM + KIT.dur(2.6), state: { z: 1.3, x: CX + S.w * 0.04, y: CY, rz: -2 } },
]);
const depth = KIT.shot.planes(planes, fly);
tag(s3, 'KIT.shot.planes + tour', S.y + S.h * 0.86);

// ── 4. end: balls from a fixed-step simulation ───────────────────────────
const title = el('div', 'h', s4, 'render(t)');
css(title, { left: CX - title.offsetWidth / 2 + 'px', top: S.y + S.h * 0.22 + 'px' });
const END = V('end').start, FLOOR = S.y + S.h * 0.8, R = 22 * u, N = 5;
const balls = Array.from({ length: N }, () => { const b = el('div', 'dot', s4); css(b, { left: 0, top: 0, width: 2 * R + 'px', height: 2 * R + 'px' }); return b; });
const sim = KIT.sim((s, dt) => {
  const v = s.v.map((v) => v + 2600 * u * dt), y = s.y.map((y, i) => y + v[i] * dt);
  for (let i = 0; i < N; i++) if (y[i] > FLOOR - R) { y[i] = FLOOR - R; v[i] = -v[i] * 0.62; }
  return { y, v };
}, { y: Array.from({ length: N }, (_, i) => S.y + S.h * (0.52 - i * 0.04)), v: Array(N).fill(0) }, { dur: DUR - END + 0.1 });
tag(s4, 'KIT.sim', S.y + S.h * 0.88);

// ── transitions between the scenes ───────────────────────────────────────
const TR = [
  KIT.transition('iris', { from: s1, to: s2, at: snap(V('type').start - KIT.dur(0.3)), dur: KIT.dur(0.6), cue: 'swish' }),
  KIT.transition('lightLeak', { from: s2, to: s3, at: snap(V('cam').start - KIT.dur(0.35)), dur: KIT.dur(0.7) }),
  KIT.transition('brush', { from: s3, to: s4, at: snap(V('end').start - KIT.dur(0.35)), dur: KIT.dur(0.7), cue: 'whoosh' }),
];
const subs = KIT.subtitles(['path', 'type', 'cam', 'end']);
css(subs.box, { bottom: KIT.H_ - S.y - S.h + 'px' });

function render(t) {
  P.draw(line, KIT.ease(KIT.seg(t, DRAW, DRAW + KIT.dur(0.9))));
  P.follow(rider, route, KIT.rate.smooth(KIT.seg(t, RIDE, RIDE + KIT.dur(1.4))));
  KIT.show(rider, KIT.seg(t, RIDE - 0.15, RIDE));
  tw.set(t); ring.set(t);
  depth(t);
  const st = sim.at(t - END);
  balls.forEach((b, i) => css(b, { transform: `translate(${CX + (i - (N - 1) / 2) * 120 * u - R}px, ${st.y[i] - R}px)` }));
  for (const tr of TR) tr.set(t);
  subs.set(t);
}
KIT.start({ dur: DUR, render });
