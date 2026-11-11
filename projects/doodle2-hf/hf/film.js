// doodle2 demo. 1 "draw": pen lettering (D.letters) writes DRAW; 2: a drawing score (D.score) of box -> arrow -> head -> box with a
// lettered label; 3 "depth": three D.planes under one dolly, strokes counter-weighted with D.weight (stroke `zoom`);
// 4 "end": a matched-move seam (D.matchedMove) into a card that draws itself (D.drawSVG on an inline SVG authored here).
// Every time comes from V/W/snap.
'use strict';
const { el, css, show, win, V, W, snap, cue } = KIT, S = KIT.safe, u = KIT.u, D = KIT.doodle, NS = 'http://www.w3.org/2000/svg';
const CX = S.x + S.w / 2, MY = S.y + S.h * 0.5, DUR = window.PROJECT.speechEnd + window.PROJECT.tail, F = KIT.dur(0.35);
const T_DRAW = snap(V('draw').start - 0.6), TITLE = KIT.dur(2), IN2 = snap(T_DRAW + TITLE + 0.4), IN3 = snap(V('depth').start - 0.3), IN4 = snap(V('end').start - 0.3);
const scene = () => { const e = el('div', 'scene'); return e; };
const svgIn = (parent) => {   // a full-frame <svg> to draw into (strokes share its grain mask)
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('width', KIT.W_); s.setAttribute('height', KIT.H_); s.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
  parent.appendChild(s);
  return s;
};
const tag = (parent, text) => { const e = el('div', 'tag', parent, text); css(e, { left: CX + 'px', top: S.y + 8 * u + 'px' }); return e; };

// ── 1. pen lettering ─────────────────────────────────────────────────────
const s1 = scene(), svg1 = svgIn(s1);
tag(s1, 'pen lettering');
const SIZE1 = 280 * u, w1 = [...'DRAW'].reduce((a, c) => a + D.glyphs[c][0], 0) * SIZE1 / 1000;
const TITLE_END = T_DRAW + TITLE;
const title = D.letters(svg1, 'DRAW', { id: 'title', style: 'pencil', size: SIZE1, x: CX - w1 / 2, y: MY + 60 * u, weight: SIZE1 * 0.1, in: T_DRAW, draw: TITLE });
const under = D.stroke(svg1, [[CX - w1 / 2, MY + 130 * u], [CX - w1 * 0.2, MY + 150 * u], [CX + w1 * 0.2, MY + 125 * u], [CX + w1 / 2, MY + 145 * u]],
  { id: 'under', style: 'marker', in: TITLE_END, draw: KIT.dur(0.5) });
cue(T_DRAW, 'scratch');

// ── 2. a drawing score ───────────────────────────────────────────────────
const s2 = scene(), svg2 = svgIn(s2);
tag(s2, 'drawing score');
const b1 = CX - 640 * u, b2 = CX + 340 * u, BW = 300 * u, BH = 280 * u, BT = MY - BH / 2 + 40 * u;
const box = (x, y) => [[x, y], [x + BW, y + 6 * u], [x + BW - 4 * u, y + BH], [x + 2 * u, y + BH - 6 * u], [x, y]];
const AY = BT + BH / 2, AX0 = b1 + BW + 40 * u, AX1 = b2 - 50 * u;
const T2 = IN2 + KIT.dur(0.3), T2E = IN3 - 0.8;
const score = D.score([
  { id: 'box',   pts: box(b1, BT), style: 'pencil', parent: svg2, ease: 'power1.out' },
  { id: 'arrow', pts: [[AX0, AY], [(AX0 + AX1) / 2, AY - 14 * u], [AX1, AY]], deps: ['box'], style: 'pencil', ease: 'power1.out' },
  { id: 'headA', pts: [[AX1 - 50 * u, AY - 44 * u], [AX1, AY]], deps: ['arrow'], style: 'pencil', ease: 'power1.out' },
  { id: 'headB', pts: [[AX1 - 50 * u, AY + 44 * u], [AX1, AY]], deps: ['arrow'], style: 'pencil', ease: 'power1.out' },
  { id: 'box2',  pts: box(b2, BT), deps: ['headA', 'headB'], style: 'marker', ease: 'power1.out' },
], T2, T2E, { parent: svg2, rest: 0.08 });
const T_ARROW = snap(score.windows.arrow[0]), T_LABEL = score.windows.box2[1];
const NEXT = 'NEXT', SIZE2 = 100 * u, w2 = [...NEXT].reduce((a, c) => a + D.glyphs[c][0], 0) * SIZE2 / 1000;
const label = D.letters(svg2, NEXT, { id: 'label', style: 'ballpoint', size: SIZE2, weight: SIZE2 * 0.1, x: (AX0 + AX1) / 2 - w2 / 2, y: AY - 70 * u, in: score.windows.headB[1], draw: KIT.dur(1.4) });
cue(IN2, 'paper');

// ── 3. depth planes ──────────────────────────────────────────────────────
const s3 = scene();
tag(s3, 'depth planes + line weight');
const cam = (t) => { const e = KIT.ease(KIT.seg(t, IN3, IN4)); return { x: 220 * e, y: -24 * e, zoom: 1 + 0.3 * e }; };
const plane = (z) => { const l = el('div', 'layer', s3); return { z, el: l, svg: svgIn(l) }; };
const far = plane(3), mid = plane(1), near = plane(0.75);
const pen = (p, id, pts, style, at, draw) => D.stroke(p.svg, pts, { id, style, in: IN3 + at, draw: KIT.dur(draw), zoom: (t) => Math.pow(cam(t).zoom, 1 / p.z), ease: 'sine.inOut' });
const X = (v) => v * u;
const farS = [
  pen(far, 'mount', [[-300, 640], [100, 520], [300, 590], [560, 430], [820, 600], [1100, 500], [1400, 610], [1700, 470], [2100, 620]].map(([a, b]) => [X(a), X(b)]), 'ballpoint', 0.1, 1.6),
  pen(far, 'sun', Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * 6.6 - 1; return [X(1480 + 90 * Math.cos(a)), X(250 + 90 * Math.sin(a))]; }), 'riso', 0.3, 0.9),
];
const midS = [
  pen(mid, 'wall', [[760, 760], [756, 560], [1100, 566], [1104, 760], [760, 760]].map(([a, b]) => [X(a), X(b)]), 'pencil', 0.4, 0.9),
  pen(mid, 'roof', [[720, 570], [930, 440], [1140, 574]].map(([a, b]) => [X(a), X(b)]), 'pencil', 0.8, 0.7),
  pen(mid, 'door', [[900, 760], [902, 660], [970, 662], [968, 760]].map(([a, b]) => [X(a), X(b)]), 'pencil', 1.1, 0.4),
  pen(mid, 'trunk', [[1320, 760], [1322, 600], [1326, 520]].map(([a, b]) => [X(a), X(b)]), 'pencil', 1.3, 0.4),
  pen(mid, 'crown', Array.from({ length: 11 }, (_, i) => { const a = (i / 10) * 6.5 - 1.2; return [X(1325 + 90 * Math.cos(a)), X(440 + 80 * Math.sin(a))]; }), 'marker', 1.5, 0.8),
];
const SIZE3 = 150 * u, w3 = [...'DEPTH'].reduce((a, c) => a + D.glyphs[c][0], 0) * SIZE3 / 1000;
const depthT = D.letters(mid.svg, 'DEPTH', { id: 'depth', style: 'pencil', size: SIZE3, weight: SIZE3 * 0.1, x: CX - w3 / 2 + X(160), y: X(350), in: IN3 + 0.3, draw: KIT.dur(2) });
const nearS = [
  pen(near, 'ground', [[-500, 880], [300, 900], [1000, 870], [1700, 905], [2500, 880]].map(([a, b]) => [X(a), X(b)]), 'marker', 0.2, 2),
  pen(near, 'grass1', [[200, 900], [215, 840], [250, 790]].map(([a, b]) => [X(a), X(b)]), 'pencil', 1.0, 0.3),
  pen(near, 'grass2', [[250, 900], [290, 830], [340, 800]].map(([a, b]) => [X(a), X(b)]), 'pencil', 1.2, 0.3),
  pen(near, 'grass3', [[1650, 905], [1660, 840], [1700, 790]].map(([a, b]) => [X(a), X(b)]), 'pencil', 1.4, 0.3),
  pen(near, 'grass4', [[1700, 905], [1740, 835], [1790, 805]].map(([a, b]) => [X(a), X(b)]), 'pencil', 1.6, 0.3),
];
cue(IN3, 'swish');

// ── 4. the seam, then a card that draws itself ───────────────────────────
const EXIT = KIT.dur(0.4), seam = D.matchedMove({ dir: 'left', exitDist: KIT.W_, exitDur: EXIT });   // the entry takes the same time and distance
const s4 = scene();
s4.insertAdjacentHTML('beforeend', `<svg id="card" width="${X(760)}" height="${X(440)}" viewBox="0 0 760 440" style="position:absolute;left:${CX - X(380)}px;top:${S.y + X(100)}px;overflow:visible">
  <rect x="30" y="30" width="700" height="380" rx="30" style="fill:var(--kit-surface);stroke:var(--kit-ink);stroke-width:6"/>
  <polygon points="190,110 218,172 286,178 235,222 250,290 190,255 130,290 145,222 94,178 162,172" style="fill:var(--kit-accent);stroke:var(--kit-ink);stroke-width:6;stroke-linejoin:round"/>
  <path d="M360 250 L420 310 L560 150" style="fill:none;stroke:var(--kit-accent-2);stroke-width:14;stroke-linecap:round;stroke-linejoin:round"/>
  <path d="M340 360 C420 345 520 372 660 350" style="fill:none;stroke:var(--kit-ink);stroke-width:6;stroke-linecap:round"/>
</svg>`);
tag(s4, 'a card that draws itself');
const draws = D.drawSVG(document.getElementById('card'), { t0: IN4 + seam.entryDur, t1: IN4 + seam.entryDur + KIT.dur(2.6), style: 'pencil' });
const endT = el('div', 'big', s4, 'Draw. Depth. Done.');
css(endT, { left: CX + 'px', top: S.y + X(570) + 'px' });
cue(snap(IN4 - EXIT), 'whooshsoft');
cue(snap(IN4 + seam.entryDur + KIT.dur(2.6) - 0.2), 'sparkle');

const subs = KIT.subtitles(['draw', 'depth', 'end']);
css(subs.box, { bottom: KIT.H_ - S.y - S.h + 'px' });

const move = (e, [x, y]) => { e.style.transform = `translate(${x}px, ${y}px)`; };

function render(t) {
  show(s1, win(t, 0, IN2 + F, 0.01, F));
  title.set(t); under.set(t);
  show(s2, win(t, IN2, IN3 + F, F, F));
  score.set(t); label.set(t);
  // scene 3 is cut at IN4, after the seam has taken it off to the left
  show(s3, t < IN4 ? win(t, IN3, IN4, F, 0.0001) : 0);
  const q3 = KIT.seg(t, IN4 - EXIT, IN4);
  move(s3, seam.exit(q3));
  D.planes([far, mid, near], cam(t));
  for (const p of [...farS, ...midS, ...nearS]) p.set(t);
  depthT.set(t);
  show(s4, t >= IN4 ? win(t, IN4, DUR, 0.0001, KIT.dur(0.5)) : 0);
  move(s4, seam.entry(KIT.seg(t, IN4, IN4 + seam.entryDur)));
  draws.set(t);
  subs.set(t);
}
KIT.start({ dur: DUR, render });
