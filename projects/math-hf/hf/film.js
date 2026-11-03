// Math test film: axes draw on → a curve drawn as "curve" is spoken, a dot on its tip → a square morphs into a circle →
// an equation writes itself glyph by glyph. Scenes start on the beat just before their line and overlap the next one by
// KIT.dur(0.45) (a crossfade, no blank dip); every time comes from V/W/snap.
'use strict';
const { V, W, snap, cue, seg } = KIT, M = KIT.math, S = KIT.safe, u = KIT.u;
const IDS = ['axes', 'plot', 'morph', 'equation'];
const DUR = window.PROJECT.speechEnd + window.PROJECT.tail;
const IN = IDS.map((id, i) => (i ? snap(V(id).start - 0.45) : 0));
const OUT = (i) => (i < IDS.length - 1 ? IN[i + 1] + KIT.dur(0.45) : DUR - 0.2);
IN.slice(1).forEach((t) => cue(t, 'whoosh', 0.6));

// axes + plot share one chart (scenes 0–1); the axis finishes drawing as "axis" is spoken
const ax = M.axes({ x: [0, 6, 1], y: [-2, 2, 1], in: 0, draw: W('axes', 'axis') + KIT.dur(0.4), out: OUT(1) });
const CURVE = W('plot', 'curve');
const curve = M.plot(ax, (x) => 1.6 * Math.sin(1.1 * x) * Math.exp(-0.12 * x), { in: CURVE, out: OUT(1) });
const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
dot.setAttribute('r', 12 * u);
dot.style.fill = 'var(--kit-accent)';
ax.el.appendChild(dot);
const note = KIT.el('div', 'note');
note.textContent = 'Illustrative data';
KIT.css(note, { right: KIT.W_ - S.x - S.w + 'px', top: S.y + S.h - 40 * u + 'px' });
cue(CURVE, 'riser', 0.5);

// morph: a square becomes a circle (both one closed subpath, clockwise)
const R = Math.min(S.w, S.h) * 0.28, cx = S.x + S.w / 2, cy = S.y + S.h / 2;
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
KIT.css(svg, { position: 'absolute', left: 0, top: 0, overflow: 'visible' });
svg.setAttribute('width', KIT.W_); svg.setAttribute('height', KIT.H_);
KIT.stage.appendChild(svg);
const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
const r = R * 0.886;   // same area as the circle
shape.setAttribute('d', `M${cx - r} ${cy - r}H${cx + r}V${cy + r}H${cx - r}Z`);
shape.style.fill = 'var(--kit-accent)';
svg.appendChild(shape);
const MORPH = W('morph', 'morph'), EQ = W('equation', 'writes');
const MORPH_OUT = EQ;   // the circle holds until the formula starts writing: no empty stretch, no shape behind the glyphs
const morph = M.morph(shape, `M${cx - R} ${cy}A${R} ${R} 0 1 1 ${cx + R} ${cy}A${R} ${R} 0 1 1 ${cx - R} ${cy}Z`, { in: MORPH });

// \left( … \right) and a fraction: the reveal has to walk delimiters, the bar and scripts in order
const eq = M.equation('\\left(\\frac{a+b}{2}\\right)^{2} \\ge ab', { in: EQ, size: 88, out: OUT(3) });
cue(EQ, 'chime', 0.5);

function render(t) {
  ax.set(t);
  curve.set(t);
  const p = curve.progress(t), [x, y] = curve.pointAt(p);
  dot.setAttribute('cx', x); dot.setAttribute('cy', y);
  KIT.show(dot, p > 0 ? 1 - seg(t, OUT(1) - KIT.dur(0.45), OUT(1)) : 0);
  KIT.show(note, KIT.ease(seg(t, CURVE, CURVE + KIT.dur(0.4))) * (1 - seg(t, OUT(1) - KIT.dur(0.45), OUT(1))));
  morph.set(t);
  const sIn = KIT.ease(seg(t, IN[2], IN[2] + KIT.dur(0.45))), sOut = seg(t, MORPH_OUT - KIT.dur(0.45), MORPH_OUT);
  KIT.show(svg, sIn * (1 - sOut));
  svg.style.transform = `scale(${0.9 + 0.1 * sIn})`; svg.style.transformOrigin = `${cx}px ${cy}px`;
  eq.set(t);
  KIT.stage.style.opacity = 1 - seg(t, DUR - 0.6, DUR);
}
KIT.start({ dur: DUR, render });
