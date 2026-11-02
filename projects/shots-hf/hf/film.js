// Shots test film: one KIT.shot preset per VO line — pushIn (with a low hand-held drift and a doodle underline) → crashZoom
// on a number → whipPan between two cards → orbit around a mock product → craneRise to the logo. A shot reel, so it breaks
// the "two big moves per film" rule on purpose: one move per scene, each scene still after its move. Hard cuts on the beat
// just before each line; every time from V/W/snap/KIT.dur.
'use strict';
const { V, W, snap, cue, seg, W_, H_, u } = KIT, S = KIT.shot;
const IDS = ['push', 'crash', 'whip', 'orbit', 'crane'];
const DUR = window.PROJECT.speechEnd + window.PROJECT.tail;
const IN = IDS.map((id, i) => (i ? snap(V(id).start - KIT.dur(0.45)) : 0));
IN.slice(1).forEach((t) => cue(t, 'whoosh', 0.5));

const el = (tag, cls, html = '', css = '') => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; e.style.cssText = css; return e; };
const at = (x, y) => `left:${x}px;top:${y}px`;
// a scene: wrap (shown while it is on) > cam (the filmed layer, frame-sized, with a bleed floor) + overlay (not filmed)
const scene = (html, overlay = '', floor = '') => {
  const wrap = el('div', 'scene'), cam = el('div', 'cam', `<div class="bleed" style="${floor}"></div>${html}`);
  wrap.append(cam); if (overlay) wrap.append(el('div', 'scene', overlay));
  KIT.stage.append(wrap); return { wrap, cam };
};
const CW = Math.min(1200 * u, 0.86 * W_);   // card width that fits every format

// 1. push in on the word, with a hand-held drift; the underline draws under it as "matters" is spoken
const push = scene(`<div class="at" style="${at(W_ / 2, H_ * 0.5)}">
  <div class="kick">the one metric</div>
  <div class="big" style="font-size:${170 * u}px;margin-top:${28 * u}px"><span id="key">Activation</span></div></div>
  <div class="at rows" style="${at(W_ / 2, H_ * 0.8)};width:${CW * 0.6}px"><i></i><i style="width:70%"></i></div>`);
const pushShot = S.pushIn({ t0: snap(V('push').start), t1: V('push').end + KIT.dur(0.3), from: 1, to: 1.14, x: W_ / 2, y: H_ * 0.5 });
let underline;   // built at the first frame, after fonts load, so it measures the real word width

// 2. crash zoom onto the number; the label stays put outside the filmed layer
const NY = H_ * 0.48;
const crash = scene(`<div class="at" style="${at(W_ / 2, NY - 150 * u)}"><div class="kick">renders per hour</div></div>
  <div class="at big" style="${at(W_ / 2, NY)};font-size:${220 * u}px;color:var(--kit-accent)">3×</div>`,
  `<div class="note">Illustrative data</div>`);
const HIT = W('crash', 'hard');
const crashShot = S.crashZoom({ at: HIT - KIT.dur(6 / 30), x: W_ / 2, y: NY });
cue(HIT, 'impact', 0.7);

// 3. whip pan from the first card to the second, 1.5 frame widths to the right
const card = (x, n, title) => `<div class="at card idea" style="${at(x, H_ / 2)};width:${CW * 0.7}px"><b>IDEA ${n}</b><div class="big">${title}</div>
  <div class="rows"><i></i><i style="width:80%"></i><i style="width:55%"></i></div></div>`;
// the floor reaches 1.5 frame widths further right (dir 1), so the grid stays under the destination card
const whip = scene(card(W_ / 2, '01', 'Script') + card(W_ / 2 + 1.5 * W_, '02', 'Shots'), '', 'right:-190%');
const whipShot = S.whipPan({ at: snap(W('whip', 'next')) - KIT.dur(4 / 30), dir: 1 });

// 4. orbit around the mock product
const bars = [38, 52, 46, 64, 58, 80, 72, 92].map((h) => `<i style="height:${h}%"></i>`).join('');
const OW = Math.min(CW, 0.7 * W_);   // narrower in 9x16 so the near edge stays in frame at ±18°
const orbit = scene(`<div class="at card mock" style="${at(W_ / 2, H_ / 2)};width:${OW}px;height:${OW * 0.6}px">
  <div class="mock-side"><i></i><i></i><i></i><i></i><i></i></div>
  <div class="mock-main"><div class="mock-h"></div><div class="mock-kpis"><i></i><i></i><i></i></div><div class="mock-chart">${bars}</div></div></div>`);
const orbitShot = S.orbit({ t0: IN[3], t1: V('orbit').end });

// 5. crane up from the film strip to the logo, then hold
const crane = scene(`<div class="at logo" style="${at(W_ / 2, H_ / 2)}"><i>▶</i><div class="big" style="font-size:${120 * u}px">Reelwright</div></div>
  <div class="at strip" style="${at(W_ / 2, H_ * 0.82)}">${'<i></i>'.repeat(9)}</div>`);
const craneShot = S.craneRise({ t0: IN[4], t1: V('crane').end + KIT.dur(0.6) });
cue(V('crane').end, 'chime', 0.5);

const shots = [
  (t) => { const s = pushShot(t), h = KIT.handheld(t, 3 * u, 'push'); return { ...s, x: s.x + h.x, y: s.y + h.y }; },
  crashShot, whipShot, orbitShot, craneShot,
];
const scenes = [push, crash, whip, orbit, crane];

function render(t) {
  underline ||= KIT.doodle.underline(document.getElementById('key'), { id: 'key', in: W('push', 'matters'), draw: KIT.dur(0.5) });
  underline.set(t);
  scenes.forEach((s, i) => {
    const on = t >= IN[i] && (i === IDS.length - 1 || t < IN[i + 1]);
    KIT.show(s.wrap, on ? 1 : 0);
    if (on) KIT.shoot(s.cam, shots[i](t));
  });
  KIT.stage.style.opacity = 1 - seg(t, DUR - KIT.dur(0.6), DUR);
}
KIT.start({ dur: DUR, render });
