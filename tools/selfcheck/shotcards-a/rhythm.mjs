// shotcards/rhythm.js: step list, comic panels, quad split, jump cut, sakuga time and trailer bumper in sequence in a 12 s film
import { PRE, verdict } from "./_common.mjs";
export default { scripts: ["tools/shots.js", "tools/shotcards/rhythm.js"], dur: 12, extra: [1.2, 3.2, 4.9, 6.5, 8.1, 10.3], film: PRE + `
const SC = KIT.shotcards, T = window.T = {}, win = [[0, 2.4], [2.4, 4.0], [4.0, 5.8], [5.8, 7.4], [7.4, 8.8], [8.8, 12.1]], w = win.map(() => el('scene', S, {}));
const items = ['Fast', 'Simple', 'Seekable', 'Yours'].map((s, i) => el('', w[0], { left: '80px', top: 40 + i * 70 + 'px', fontSize: '44px', fontWeight: 800 }, s));
T.steps = SC.stepList({ root: w[0], items, beats: [0.3, 0.9, 1.5, 2.0], themes: [{ bg: '#111', ink: '#fff', accent: '#ff3b6b' }, { bg: '#fff', ink: '#111', accent: '#1a6bff' }, { bg: '#ffd400', ink: '#111', accent: '#e00' }] });
T.panels = SC.comicPanels({ parent: w[1], layout: [[1, 1], [2, 1, 1]], t0: 2.5, t1: 3.8 });
const quad = SC.quadSplit({ parent: w[2], t0: 4.0, offsets: [0, 0.4, 0.8, 1.2] }), movers = quad.cells.map((c, i) => el('box ' + 'abc'[i % 3], c.inner, { left: '60px', top: '120px' }));
T.quad = { set: (t) => { quad.set(t); movers.forEach((m, i) => { m.style.transform = 'translateX(' + (60 * Math.max(0, quad.local(i, t))).toFixed(2) + 'px)'; }); }, at: quad.at };
const jl = scene3(w[3]); T.jump = SC.jumpCut({ beats: [6.2, 6.7, 7.1] });
const d1 = el('dot', w[4], { top: '120px', background: '#e33' }), d2 = el('dot', w[4], { top: '220px', background: '#2a7' });
T.time = SC.sakugaTime({ shifts: [{ at: 0, cadence: 1 }, { at: 7.9, cadence: 3 }], holds: [{ at: 8.3, dur: 0.2 }] });
T.bump = SC.trailerBumper({ parent: w[5], at: 8.8, steps: [{ kind: 'card', text: 'COMING SOON', dur: 0.9 }, { kind: 'slam', text: 'ONE FILM', sub: 'one script', dur: 0.7 }, { kind: 'flash', dur: 0.2 }, { kind: 'black', dur: 0.3 }, { kind: 'card', text: 'REELWRIGHT', dur: 0.9 }] });
KIT.start({ dur: 12, render: (t) => {
  w.forEach((e, i) => KIT.show(e, t >= win[i][0] && t < win[i][1] ? 1 : 0));
  T.steps.set(t); T.panels.set(t); T.quad.set(t); KIT.shoot(jl, T.jump(t)); T.bump.set(t);
  const x = (u) => (40 + 520 * KIT.seg(u, 7.5, 8.7)).toFixed(2) + 'px'; d1.style.left = x(T.time(t)); d2.style.left = x(t);
} });`,
  check: async (p) => {
    await p.evaluate(() => {
      const T = window.T, bad = window.bad, SC = KIT.shotcards, J = JSON.stringify, near = (a, b, m) => { if (Math.abs(a - b) > 1e-6) bad.push(m + ': ' + a + ' vs ' + b); };
      near(T.steps.step(0.2), 0, 'step before the first beat'); near(T.steps.step(0.3), 1, 'step on the first beat'); near(T.steps.step(2.1), 4, 'all four steps');
      if (T.steps.at(1.0).theme.bg !== '#fff' || T.steps.at(0.4).theme.bg !== '#111' || T.steps.at(2.1).theme.bg !== '#111') bad.push('theme cycle: 111, fff, ffd400, then back to 111');
      if (!(T.steps.at(0.2).items.every((i) => i.op === 0) && T.steps.at(1.0).items[1].on && T.steps.at(1.0).items[0].op === 0.4)) bad.push('steps: newest on, older dimmed, later hidden');
      T.steps.set(1.0); if (document.querySelector('.scene').style.background === '') bad.push('stepList must write the root background');
      holds('comicPanels', T.panels.at, 2.5, 3.8); const pn = T.panels.panels; near(pn.length, 5, 'comic panels (2 + 3)');
      for (let i = 0; i < pn.length; i++) { const a = pn[i]; if (a.x < 0 || a.y < 0 || a.x + a.w > KIT.W_ + 0.1 || a.y + a.h > KIT.H_ + 0.1) bad.push('panel ' + i + ' leaves the frame');
        for (let j = i + 1; j < pn.length; j++) { const b = pn[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) bad.push('panels ' + i + ' and ' + j + ' overlap (no gutter)'); } }
      near(Math.max(...T.panels.at(2.5)), 0, 'panels start hidden'); if (!T.panels.at(3.8).every((v) => v === 1)) bad.push('panels all in at the end');
      holds('quadSplit', T.quad.at, 4.0, 4.0 + 0.3 + 0.35); near(T.quad.at(4.0)[0], 0, 'quad start');
      const f = T.jump; if (f.cuts.length !== 3) bad.push('jumpCut cuts');
      near(f(5).z, 1, 'jumpCut holds zooms[0] before the first beat'); near(f(6.2).z, 1.25 + 0.06, 'jumpCut punches in on the beat'); near(f(6.2 + 0.45).z, 1.25, 'jumpCut settles');
      if (!(Math.abs(f(6.2).z - f(6.2 - 1e-3).z) > 0.2)) bad.push('jumpCut is a hard cut'); if (!(f(6.4).x < KIT.W_ / 2 && f(6.9).x > KIT.W_ / 2)) bad.push('jumpCut focal offsets');
      near(SC.steppedTime(0.34, 3), 0.3, 'steppedTime on threes'); near(SC.steppedTime(0.34, 1), 0.34, 'cadence 1 is smooth'); near(SC.steppedTime(0.34, 2), 10 / 30, 'steppedTime on twos');
      let last = -1; for (let i = 0; i <= 1200; i++) { const t = i / 100, u = T.time(t); if (u < last - 1e-9 || u > t + 1e-9) bad.push('sakugaTime must be monotonic and never ahead of t (t=' + t + ')'); last = u; }
      if (T.time(8.31) !== T.time(8.49)) bad.push('sakugaTime hold: the clock must freeze for dur'); near(T.time(7.0), 7.0, 'smooth before the shift'); if (T.time(8.04) === 8.04) bad.push('on threes after the shift');
      near(T.bump.end, 8.8 + 3.0, 'bumper length'); near(T.bump.at(8.7).bed, 0, 'bed before'); near(T.bump.at(9.0).bed, 1, 'bed during'); near(T.bump.at(11.9).bed, 0, 'bed after');
      if (!(T.bump.at(9.2).steps[0].op === 1 && T.bump.at(T.bump.starts[1] + 0.01).flash > 0.5 && T.bump.at(T.bump.starts[2] + 0.1).flash === 1)) bad.push('bumper: card, slam flash, flash cut');
      if (J(T.bump.starts) !== J([8.8, 9.7, 10.4, 10.6, 10.9].map((x) => +x.toFixed(10)))) { const s = T.bump.starts.map((x) => +x.toFixed(10)); if (J(s) !== J([8.8, 9.7, 10.4, 10.6, 10.9])) bad.push('bumper starts ' + J(s)); }
      scan('steps', T.steps.at); scan('panels', T.panels.at); scan('quad', T.quad.at); scan('jump', T.jump); scan('time', T.time); scan('bump', T.bump.at);
      let threw = 0; for (const fn of [() => SC.stepList({}), () => SC.comicPanels({ layout: [[1]], t0: 0, t1: 0.1 }), () => SC.comicPanels({ layout: [[1, 1]], t0: 0, t1: 2, order: [0, 0] }), () => SC.jumpCut({}), () => SC.trailerBumper({})]) try { fn(); } catch { threw++; }
      if (threw !== 5) bad.push('bad arguments must throw (' + threw + ' of 5)');
      window.pure([0.2, 1.0, 3.0, 4.6, 6.5, 8.1, 8.4, 9.9, 10.5]);
    });
    await verdict(p, "rhythm");
  } };
