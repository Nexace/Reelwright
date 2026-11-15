// tools/fx-reveal.js: irisWipe, radialWipe, venetianBlinds, pixelDissolve, evolve, pixelate (+ progressive), snowFall, rainFall.
// check() drives set(p) by hand and reads screenshot pixels; the shuffled-seek run then proves render(t) is pure in both renderers.
import { px, region, grab } from "./_helpers.js";
export default { scripts: ["tools/fx-color.js", "tools/fx-reveal.js"], dur: 4, film: `
const X = KIT.fx, T = window.T = {};
const box = (x, y, w = 150, h = 80, bg = '#e33') => { const e = KIT.el('div', '', S); KIT.css(e, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', background: bg }); return e; };
T.iris = X.irisWipe(T.irisEl = box(0, 0));
T.rad = X.radialWipe(T.radEl = box(160, 0));
T.ven = X.venetianBlinds(T.venEl = box(320, 0, 150, 80), { count: 4 });
T.pd = X.pixelDissolve(T.pdEl = box(480, 0), { cell: 10, seed: 3 });
T.ev = X.evolve(T.evEl = box(0, 90), { cell: 15, seed: 5 });
const src = document.createElement('canvas'); src.width = 150; src.height = 80; { const g = src.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 150, 80); g.fillStyle = '#000'; for (let x = 0; x < 150; x += 4) g.fillRect(x, 0, 2, 80); }
const host = (x, y) => { const e = box(x, y, 150, 80, '#fff'); return e; };
T.px = X.pixelate(src, { w: 150, h: 80, parent: host(160, 90) });
T.pg = X.pixelate.progressive(src, { w: 150, h: 80, parent: host(320, 90), axis: 'y', max: 24, strip: 8 });
const sky = box(480, 90, 150, 80, '#234'); T.snow = X.snowFall(sky, { w: 150, h: 80, count: 30, seed: 2 }); T.rain = X.rainFall(sky, { w: 150, h: 80, count: 30, seed: 4 });
KIT.start({ dur: 4, render: (t) => {
  const a = KIT.seg(t, 0, 3);
  T.iris.set(a); T.rad.set(a); T.ven.set(a); T.pd.set(a); T.ev.set(a); T.px.set(1 + 12 * a); T.pg.set(a); T.snow.set(t); T.rain.set(t);
} });`,
  check: async (p) => {
    const bad = [], want = (what, ok, got) => { if (!ok) bad.push(what + ': ' + JSON.stringify(got)); };
    const red = (c) => c[0] > 200 && c[1] < 100, bgc = (c) => c[0] > 230 && c[1] > 230;
    const set = (name, v) => p.evaluate(([n, v]) => window.T[n].set(v), [name, v]);
    await set('iris', 0.5);
    let [cen, cor] = [await px(p, 75, 40), await px(p, 3, 3)];
    want('irisWipe .5: centre shown, corner hidden', red(cen) && bgc(cor), [cen, cor]);
    await set('iris', 1); cor = await px(p, 3, 3); want('irisWipe 1: corner shown', red(cor), cor);
    await set('iris', 0); cen = await px(p, 75, 40); want('irisWipe 0: nothing', bgc(cen), cen);
    await set('rad', 0.25);
    const [q1, q3] = [await px(p, 160 + 120, 15), await px(p, 160 + 30, 65)];
    want('radialWipe .25: the top-right quarter is in, the bottom-left is not', red(q1) && bgc(q3), [q1, q3]);
    await set('rad', 0.75); const q3b = await px(p, 160 + 30, 65), q4 = await px(p, 160 + 30, 15);
    want('radialWipe .75: bottom-left in, top-left (last quarter) not yet', red(q3b) && bgc(q4), [q3b, q4]);
    await set('ven', 0.5);
    const [s1, s2] = [await px(p, 320 + 75, 5), await px(p, 320 + 75, 15)];
    want('venetianBlinds .5: the slat is half open (20 px slats, top 10 px shown)', red(s1) && bgc(s2), [s1, s2]);
    const frac = async (x0) => { const d = await grab(p, x0, x0 === 0 ? 90 : 0, 150, 80); let n = 0, on = 0; for (let j = 0; j < 8; j++) for (let i = 0; i < 15; i++) { const k = ((j * 10 + 5) * 150 + i * 10 + 5) * 4; n++; if (red([d[k], d[k + 1]])) on++; } return on / n; };
    await set('pd', 0.5); const f5 = await frac(480);
    await set('pd', 1); const f10 = await frac(480);
    await set('pd', 0); const f0 = await frac(480);
    want('pixelDissolve: about half the cells at .5, all at 1, none at 0', f5 > 0.3 && f5 < 0.7 && f10 === 1 && f0 === 0, [f0, f5, f10]);
    await set('ev', 0.5); const e5 = await frac(0); await set('ev', 1); const e10 = await frac(0); await set('ev', 0); const e0 = await frac(0);
    want('evolve: partial at .5, complete at 1, hidden at 0', e5 > 0.1 && e5 < 0.9 && e10 === 1 && e0 === 0, [e0, e5, e10]);
    await set('px', 1); const sharp = await region(p, 160, 90, 150, 30);
    await set('px', 12); const blk = await region(p, 160, 90, 150, 30);
    want('pixelate: block 1 keeps the 4 px stripes, block 12 averages them away', sharp.std > 100 && blk.std < sharp.std * 0.5, [sharp.std, blk.std]);
    await set('pg', 1); const top = await region(p, 320, 90, 150, 8), low = await region(p, 320, 90 + 72, 150, 8);
    want('progressive pixelate: sharp at the top strip, blocky at the bottom', top.std > 100 && low.std < top.std * 0.6, [top.std, low.std]);
    // weather: the same t gives the same particle positions whatever came before; time moves them; all stay in bounds
    const w = await p.evaluate(() => {
      const T = window.T, pos = () => [...T.snow.el.children].map((c) => c.style.transform).join('|') + '#' + [...T.rain.el.children].map((c) => c.style.transform).join('|');
      T.snow.set(1.5); T.rain.set(1.5); const a = pos(); T.snow.set(9); T.rain.set(9); const b = pos(); T.snow.set(1.5); T.rain.set(1.5); const c = pos();
      const ys = [...T.snow.el.children].map((e) => +/translate\(([-\d.e]+)px,\s*([-\d.e]+)px/.exec(e.style.transform)[2]);
      return { same: a === c, moves: a !== b, inY: ys.every((y) => y >= -10 && y <= 90), n: T.snow.el.children.length + T.rain.el.children.length };
    });
    want('snowFall / rainFall: pure in t, moving, inside the box', w.same && w.moves && w.inY && w.n === 60, w);
    if (bad.length) throw new Error('fx-reveal check:\n  ' + bad.join('\n  '));
  } };
