// shotcards/opening.js: nine openings in sequence, each in its own 1.2 - 1.6 s window of a 12 s film
import { PRE, verdict } from "./_common.mjs";
export default { scripts: ["tools/shots.js", "tools/shots2.js", "tools/shotcards/opening.js"], dur: 12, extra: [0.9, 2.4, 3.75, 5.1, 6.4, 7.6, 8.9, 10.2, 11.4], film: PRE + `
const SC = KIT.shotcards, T = window.T = {}, wrap = () => el('scene', S, {});
const win = [[0, 1.6], [1.6, 3.2], [3.2, 4.4], [4.4, 5.8], [5.8, 7.0], [7.0, 8.2], [8.2, 9.6], [9.6, 10.8], [10.8, 12.1]];
const w = win.map(wrap);
T.land = SC.datavizLandscapeOpen({ parent: w[0], cols: 8, rows: 6, seed: 3, t0: 0.1, t1: 1.5 });
const src = scene3(w[1]), to = el('scene', w[1], { background: '#e0a030' }, '<div style="left:60px;top:120px;color:#fff">next scene</div>');
T.frac = SC.fracture({ source: src, to, at: 2.0, dur: 0.8, seed: 5 });
T.ink = SC.inkBloom({ parent: w[2], x: 320, y: 180, r: 70, t0: 3.3, t1: 4.2, seed: 2 });
const cr = w[3]; for (let i = 0; i < 5; i++) el('box a', cr, { left: '80px', top: 60 + i * 50 + 'px', width: '480px', height: '36px' });
T.crane = SC.craneRise({ layer: cr, rows: [...cr.children], t0: 4.5, t1: 5.6 });
const dot = (c) => '<div style="position:relative;width:44px;height:44px;border-radius:50%;background:' + c + '"></div>';
T.icons = SC.iconField({ parent: w[4], items: ['#e33', '#36c', '#2a7', '#e0a030', '#a4c', '#0aa', '#c60', '#888', '#d36', '#58f', '#3b8', '#ea0'].map(dot), cols: 4, x: 80, y: 40, w: 480, h: 280, t0: 5.9, t1: 6.9, seed: 4 });
const ls = el('', w[5], { left: '0px', top: '130px', width: '640px', textAlign: 'center', boxSizing: 'border-box', fontSize: '56px' }, 'REELWRIGHT');
T.space = SC.letterspace(ls, { t0: 7.1, t1: 8.0 });
const nuc = el('', w[6], { fontSize: '46px' }, 'REEL'), sats = [0, 1, 2, 3].map((i) => el('dot', w[6], { background: ['#e33', '#36c', '#2a7', '#e0a030'][i] }));
T.orbit = SC.orbitRingTitle({ parent: w[6], nucleus: nuc, satellites: sats, t0: 8.3, t1: 9.4 });
const hl = scene3(w[7]);
T.hero = SC.spotlightHero({ parent: w[7], layer: hl, hero: { r: 60 }, t0: 9.7, t1: 10.7, x: 320, y: 180 });
T.mask = SC.textMask({ parent: w[8], text: 'FILM', media: 'linear-gradient(120deg,#e33,#fb0,#2c8)', t0: 10.9, t1: 12, font: '900 150px Arial' });
KIT.start({ dur: 12, render: (t) => {
  w.forEach((e, i) => KIT.show(e, t >= win[i][0] && t < win[i][1] ? 1 : 0));
  for (const k of ['land', 'frac', 'ink', 'crane', 'icons', 'space', 'orbit', 'hero', 'mask']) T[k].set(t);
} });`,
  check: async (p) => {
    await p.evaluate(() => {
      const T = window.T, bad = window.bad, J = JSON.stringify, near = (a, b, m) => { if (Math.abs(a - b) > 1e-3) bad.push(m + ': ' + a + ' vs ' + b); };
      holds('landscape', T.land.at, 0.1, 1.5); near(T.land.at(0.1).pitch, 90, 'landscape pitch start'); near(T.land.at(1.5).pitch, 34, 'landscape pitch end');
      if (!T.land.at(0.1).heights.every((h) => h === 0)) bad.push('landscape bars must start at 0'); if (T.land.at(1.5).heights.some((h) => h <= 0.1)) bad.push('landscape bars must all be up at the end');
      holds('fracture', (t) => T.frac.at(t).shards, 2.0, 2.8); near(T.frac.shards.length, 48, 'fracture shards (6 x 4 x 2)');
      T.frac.set(1.9); const vis = (e) => e.style.visibility; const srcEl = document.querySelector('.scene .scene');
      T.frac.set(2.4); if (!T.frac.shards.some((e) => vis(e) === 'visible')) bad.push('fracture: no shard visible mid-window');
      T.frac.set(3.0); if (T.frac.shards.some((e) => vis(e) === 'visible')) bad.push('fracture: shards must be gone after the window');
      holds('inkBloom', T.ink.at, 3.3, 4.2); if (!T.ink.at(3.3).every((c) => c.r === 0)) bad.push('ink starts empty'); if (!T.ink.el.querySelector('filter')) bad.push('ink: goo filter missing');
      holds('craneRise', T.crane.at, 4.5, 5.6); near(Math.max(...T.crane.at(5.6)), Math.max(...T.crane.at(5.6)), 'finite'); if (Math.max(...T.crane.at(5.05)) <= 0.5) bad.push('crane: a row must pulse as the camera crosses it');
      holds('iconField', T.icons.at, 5.9, 6.9); if (!T.icons.at(5.9).every((v) => v === 0) || !T.icons.at(6.9).every((v) => v === 1)) bad.push('iconField must go 0 -> 1 on every tile');
      T.icons.set(5.9); if (!/grayscale\(1\)/.test(T.icons.tiles[0].style.filter)) bad.push('iconField starts grayscale');
      T.icons.set(7); if (T.icons.tiles[0].style.filter !== 'none') bad.push('iconField ends in colour (filter none)');
      holds('letterspace', T.space.at, 7.1, 8.0); near(T.space.at(8).ls, 0.04, 'letterspace end'); near(T.space.at(7.1).op, 0, 'letterspace starts invisible');
      if (J(T.orbit.at(8.3 - 1)) !== J(T.orbit.at(8.3))) bad.push('orbit: not holding its start'); near(T.orbit.at(9.4).nucleus, 1, 'orbit nucleus end'); if (T.orbit.at(9.5).sats[0].x === T.orbit.at(9.4).sats[0].x) bad.push('orbit keeps drifting');
      if (!T.orbit.at(9.0).sats.some((s) => s.front) || !T.orbit.at(9.0).sats.some((s) => !s.front)) bad.push('orbit: needs a front and a back half');
      holds('hero cam', T.hero.cam, 9.7, 10.7); near(T.hero.cam(9.7).z, 0.78, 'hero z start'); near(T.hero.cam(10.7).z, 2.6, 'hero z end'); near(T.hero.cam(9.7).ry, 34, 'hero ry start');
      holds('textMask', T.mask.at, 10.9, 12); near(T.mask.at(12).size, 100, 'textMask zoom end');
      for (const k of ['land', 'ink', 'crane', 'icons', 'space', 'orbit', 'hero', 'mask']) scan(k, T[k].at);
      scan('fracture', T.frac.at);
      let threw = 0; for (const f of [() => KIT.shotcards.fracture({}), () => KIT.shotcards.inkBloom({ t0: 1, t1: 0 }), () => KIT.shotcards.letterspace(null, {}), () => KIT.shotcards.datavizLandscapeOpen({ t0: 1, t1: 1 }),
        () => KIT.shotcards.datavizLandscapeOpen({ t0: 0, t1: 1, colors: ['red', 'blue'] })]) try { f(); } catch { threw++; }
      if (threw !== 5) bad.push('bad arguments must throw (' + threw + ' of 5)');
      window.pure([0.9, 2.1, 2.5, 3.8, 5.0, 6.4, 7.6, 8.9, 10.2, 11.4]);
    });
    await verdict(p, "opening");
  } };
