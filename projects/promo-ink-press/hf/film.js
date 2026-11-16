// Ink Press: a 36 s music-only promo template, 10 shots on the energy arc (docs/playbook/shotcraft-lints.md): a low open, one hero, a climb of
// features with breath cards between, a number that crash-zooms, a peak group-photo outro, and a held wordmark. Every start time is a bar of
// the music grid (KIT.bar), so every cut lands on the beat; the copy, logo letter and screenshots are in content.js. One camera move per
// shot (KIT.shot.*), each still after its move. render(t) is a pure function of t.
'use strict';
const { snap, cue, seg, W_, H_, u } = KIT, S = KIT.shot, C = window.CONTENT, ARC = window.ARC.map(([shot, role, bars, energy, hold]) => ({ shot, role, bars, energy, hold }));
const DUR = window.PROJECT.speechEnd + window.PROJECT.tail;
let bar = 0; const T0 = ARC.map((s) => { const t = KIT.bar(bar); bar += s.bars; return t; }), T1 = ARC.map((_, i) => (i < ARC.length - 1 ? T0[i + 1] : DUR));
const idx = (name) => ARC.findIndex((s) => s.shot === name), dur = KIT.dur;
const spring = KIT.spring({ damping: 13, stiffness: 120 }), snappy = KIT.spring({ damping: 20, stiffness: 260 });   // snappy: the logo settles in ~0.4 s so the wordmark can hold
const ent = (t, a, d = 0.6) => KIT.ease(seg(t, a, a + dur(d)));

const el = (tag, cls, html = '', css = '') => { const e = document.createElement(tag); e.className = cls; e.innerHTML = html; e.style.cssText = css; return e; };
const at = (x, y) => `left:${x}px;top:${y}px`;
// a shot: wrap (shown while it is on) > cam (the filmed layer, frame-sized, on a bleed floor) + overlay (not filmed)
const scene = (name, html, overlay = '') => {
  const wrap = el('div', 'scene'), cam = el('div', 'cam', `<div class="bleed"></div>${html}`);
  wrap.append(cam); if (overlay) wrap.append(el('div', 'scene', overlay));
  KIT.stage.append(wrap); return { name, wrap, cam, i: idx(name) };
};
const mock = (screen, w) => screen ? `<img class="card shot" src="${screen}" style="width:${w}px">` :
  `<div class="card mock" style="width:${w}px;height:${w * 0.625}px"><div class="mock-side"><i></i><i></i><i></i><i></i></div>
   <div class="mock-main"><div class="mock-h"></div><div class="mock-p"></div><div class="mock-p" style="width:70%"></div><div class="mock-p" style="width:84%"></div><div class="mock-p" style="width:50%"></div></div></div>`;
const MW = Math.min(1100 * u, 0.78 * W_), TW = Math.min(0.9 * W_, 1500 * u);

const scenes = [];
// 1. open (energy 1): one quiet line, a slow push
scenes.push(scene('open', `<div class="at" style="${at(W_ / 2, H_ / 2)}"><div class="kick">${C.open.kicker}</div><div class="big" style="font-size:${108 * u}px;margin-top:${30 * u}px;width:${TW}px">${C.open.line}</div></div>`));
// 2. hero (3): the product, once, big
scenes.push(scene('hero', `<div class="at" style="${at(W_ / 2, H_ * 0.25)}"><div class="kick">${C.hero.kicker}</div><div class="big" style="font-size:${88 * u}px;margin-top:${20 * u}px;width:${TW}px">${C.hero.title}</div></div>
  <div class="at" id="hero-card" style="${at(W_ / 2, H_ * 0.68)}">${mock(C.hero.screen, MW * 0.8)}</div>`));
// 3, 5, 7. features: copy on the left, the product on the right
C.features.forEach((f, k) => scenes.push(scene('feature' + (k + 1), `<div class="at left" style="${at(W_ * 0.3, H_ / 2)};width:${W_ * 0.4}px"><div class="kick">${f.kicker}</div>
  <div class="big" style="font-size:${72 * u}px;margin-top:${20 * u}px">${f.title}</div><div class="body" style="margin-top:${24 * u}px">${f.body}</div></div>
  <div class="at" id="f${k + 1}-card" style="${at(W_ * 0.72, H_ / 2)}">${mock(f.screen, W_ * 0.4)}</div>`)));
// 4, 6. breath cards (1): a single quiet line
C.breath.forEach((line, k) => scenes.push(scene('breath' + (k + 1), `<div class="at" style="${at(W_ / 2, H_ / 2)}"><div class="big" style="font-size:${72 * u}px;width:${TW}px">${line}</div></div>`)));
// 8. numbers (6): the number the film earns, a crash zoom on it
const NY = H_ * 0.5;
scenes.push(scene('numbers', `<div class="at" style="${at(W_ / 2, NY - 190 * u)}"><div class="kick">${C.numbers.label}</div></div>
  <div class="at big accent" id="num" style="${at(W_ / 2, NY)};font-size:${280 * u}px">0${C.numbers.unit}</div>`, `<div class="note">${C.numbers.note}</div>`));
// 9. group (9): the peak, every face lands in a stagger
const N = C.group.names.length, cols = W_ > H_ ? 4 : 2, AV = Math.min(W_ / (cols + 1.4), H_ / ((N / cols) + 2.4)) * 0.92;
scenes.push(scene('group', `<div class="at" style="${at(W_ / 2, H_ * 0.16)}"><div class="kick">${C.group.kicker}</div></div>` +
  C.group.names.map((n, k) => `<div class="at av" data-k="${k}" style="${at(W_ / 2 + (k % cols - (cols - 1) / 2) * AV * 1.12, H_ * 0.5 + (Math.floor(k / cols) - (N / cols - 1) / 2) * AV * 1.12)};width:${AV}px;height:${AV}px">
    <b class="big" style="font-size:${AV * 0.42}px">${n[0]}</b><span>${n}</span></div>`).join('')));
// 10. end (3): the wordmark holds
scenes.push(scene('end', `<div class="at" style="${at(W_ / 2, H_ / 2)}"><div class="logo" data-wordmark id="wordmark"><i>${C.logo}</i><div class="big" style="font-size:${150 * u}px">${C.brand}</div></div>
  <div class="kick" style="margin-top:${36 * u}px">${C.end.sub}</div></div>`));

// camera: one move per shot, each starting on its bar
const win = (n) => ({ t0: T0[idx(n)], t1: T1[idx(n)] });
const NUMHIT = snap(T0[idx('numbers')] + KIT.MUSIC.bar * 0.5);
const shots = {
  open: S.pushIn({ ...win('open'), from: 1, to: 1.06 }), hero: S.pushIn({ ...win('hero'), from: 1, to: 1.05 }),
  feature1: S.orbit({ ...win('feature1'), ry: [-9, 9], z: 1.05 }), breath1: S.pushIn({ ...win('breath1'), from: 1, to: 1.03 }),
  feature2: S.craneRise({ ...win('feature2'), lift: 0.12, zoom: 1.12, tilt: 2 }), breath2: S.pushIn({ ...win('breath2'), from: 1, to: 1.03 }),
  feature3: S.pushIn({ ...win('feature3'), from: 1, to: 1.07 }),
  numbers: S.crashZoom({ at: NUMHIT - dur(6 / 30), x: W_ / 2, y: NY, zoom: 1.5, variant: 'rebound', rebound: 1.4 }),
  group: S.pullBack({ ...win('group'), from: 1.14, to: 1 }), end: () => KIT.cam3(),
};
const GROUP = T0[idx('group')], END = T0[idx('end')];
T0.slice(1).forEach((t, k) => { if (ARC[k + 1].role !== 'peak') cue(t, 'whoosh', 0.45); });
cue(NUMHIT, 'impact', 0.7); cue(GROUP, 'riser', 0.8); cue(GROUP, 'subdrop', 0.9); cue(END, 'chime', 0.5);

const num = scenes[idx('numbers')].cam.querySelector('#num'), avs = [...scenes[idx('group')].cam.querySelectorAll('.av')];
const logo = scenes[idx('end')].cam.querySelector('.logo');

function render(t) {
  scenes.forEach((s) => {
    const on = t >= T0[s.i] && t < T1[s.i];
    KIT.show(s.wrap, on ? 1 : 0);
    if (!on) return;
    const lt = t - T0[s.i], cs = shots[s.name](t);
    if (s.name === 'group') { const h = KIT.shake(t, GROUP, 9 * u); cs.x += h.x; cs.y += h.y; }
    KIT.shoot(s.cam, cs, { sharp: true });   // layout zoom: the layer is rasterised at its final size every frame (tools/sharp-camera.js)
    // entrances: copy and product land in a stagger from the bar, the hero card springs in
    const ax = s.cam.querySelectorAll('.kick, .big, .body, .card');
    ax.forEach((e, k) => { if (e.closest('.av') || e.id === 'num') return; const p = ent(t, T0[s.i] + dur(0.08) * k, 0.5); e.style.opacity = p; e.style.transform = `translateY(${(1 - p) * 24 * u}px)`; });
    if (s.name === 'hero') { const c = s.cam.querySelector('#hero-card'); c.style.transform = `translate(-50%,-50%) scale(${0.86 + 0.14 * spring(lt)})`; }
  });
  const n = KIT.ease(seg(t, T0[idx('numbers')] + dur(0.3), NUMHIT));
  num.textContent = `${Math.round(C.numbers.value * n)}${C.numbers.unit}`;
  avs.forEach((a, k) => { const p = spring(t - GROUP - dur(0.12) * k); a.style.opacity = Math.min(1, 6 * Math.max(0, t - GROUP - dur(0.12) * k)); a.style.transform = `translate(-50%,-50%) scale(${0.3 + 0.7 * p})`; });
  const lp = snappy(t - END); logo.style.opacity = seg(t, END, END + dur(0.15)); logo.style.transform = `scale(${0.8 + 0.2 * lp})`;
  KIT.stage.style.opacity = 1 - seg(t, DUR - dur(0.3), DUR);
}
KIT.start({ dur: DUR, render });
