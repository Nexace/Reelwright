// tools/fx-color.js: hue / invert / tint / duotone / exposure / whiteBalance / shadowsHighlights / levels / curves / longShadow / glow /
// dropShadow / colorKey / vibrance / vignette / shine. Every effect is checked on real pixels at t = 3 (each parameter animates 0 → final at 3).
import { px, at, near } from "./_helpers.js";
export default { scripts: ["tools/fx-color.js"], dur: 6, film: `
const X = KIT.fx, T = window.T = {};
const box = (i, css, kids = []) => { const e = KIT.el('div', '', S); KIT.css(e, Object.assign({ left: (i % 8) * 80 + 5 + 'px', top: Math.floor(i / 8) * 88 + 5 + 'px', width: '70px', height: '70px' }, css));
  for (const [c, x] of kids) { const k = KIT.el('div', '', e); KIT.css(k, { left: x + 'px', top: '0px', width: '35px', height: '70px', background: c }); } return e; };
const sw = (t, a) => KIT.seg(t, 0, a), halves = (c1, c2) => [[c1, 0], [c2, 35]];
T.hue = box(0, { background: '#f00' }); T.inv = box(1, { background: '#f00' }); T.tint = box(2, { background: '#808080' });
T.duo = box(3, {}, halves('#fff', '#000')); T.exp = box(4, { background: '#404040' }); T.wb = box(5, { background: '#808080' });
T.sh = box(6, {}, halves('#282828', '#dcdcdc')); T.lev = box(7, {}, halves('#404040', '#c0c0c0'));
T.cur = box(8, { background: '#808080' }); T.cr = box(9, { background: '#808080' });
T.ls = box(10, { background: '#36c', width: '30px', height: '30px' }); T.gl = box(11, { background: '#fff', width: '30px', height: '30px' });
T.ds = box(12, { background: '#36c', width: '30px', height: '30px' });
const fTint = X.tint({ color: '#f00' }), fDuo = X.duotone({ dark: '#102030', light: '#f0e0d0' }), fExp = X.exposure({ stops: 0 }), fWb = X.whiteBalance({}), fSh = X.shadowsHighlights({});
const fLev = X.levels({ inBlack: 0.25, inWhite: 0.75 }), fCur = X.curves([[0, 0], [0.5, 0.5], [1, 1]]), fCr = X.curves([[0, 0], [0.5, 0.5], [1, 1]], { channel: 'r' }), fLs = X.longShadow({ length: 1 });
const src = (draw) => { const c = document.createElement('canvas'); c.width = 70; c.height = 70; draw(c.getContext('2d')); return c; };
const keySrc = src((g) => { g.fillStyle = '#0f0'; g.fillRect(0, 0, 35, 70); g.fillStyle = '#f00'; g.fillRect(35, 0, 35, 70); });
const vibSrc = src((g) => { g.fillStyle = 'rgb(150,120,120)'; g.fillRect(0, 0, 70, 70); });
const host = (i, css = {}) => box(i, css);
T.key = X.colorKey(keySrc, { w: 70, h: 70, parent: host(13) });
T.vib = X.vibrance(vibSrc, { w: 70, h: 70, parent: host(14) });
const dark = host(15, { background: '#555' });
T.vig = X.vignette(dark, { strength: 0.9 }); T.shn = X.shine(dark, { width: 0.2 });
KIT.start({ dur: 6, render: (t) => {
  T.hue.style.filter = X.filter({ hue: 360 * t / 6 }); T.inv.style.filter = X.filter({ invert: 0.5 + 0.5 * sw(t, 3) });
  fTint.on(T.tint); fDuo.on(T.duo); fExp.set({ stops: 2 * t / 6 }).on(T.exp); fWb.set({ temperature: sw(t, 3) }).on(T.wb);
  fSh.set({ shadows: sw(t, 3), highlights: sw(t, 3) }).on(T.sh); fLev.on(T.lev);
  const m = 0.5 + 0.3 * sw(t, 3); fCur.set([[0, 0], [0.5, m], [1, 1]]).on(T.cur); fCr.set([[0, 0], [0.5, m], [1, 1]]).on(T.cr);
  fLs.set({ length: 40 * sw(t, 3), angle: 0, color: '#000' }).on(T.ls);
  T.gl.style.filter = X.filter({ glow: { radius: 10, color: '#f00', strength: Math.round(3 * sw(t, 3)) } }); T.ds.style.filter = X.filter({ dropShadow: { x: 0, y: 12 * sw(t, 3), blur: 0, color: '#000' } });
  T.key.set(); T.vib.set(sw(t, 3)); T.vig.set(sw(t, 3)); T.shn.set(sw(t, 6));
} });`,
  check: async (p) => {
    await at(p, 3);
    const bad = [], want = (what, ok, got) => { if (!ok) bad.push(what + ': ' + JSON.stringify(got)); };
    const c = (i, dx = 35, dy = 35) => [(i % 8) * 80 + 5 + dx, Math.floor(i / 8) * 88 + 5 + dy];
    let v = await px(p, ...c(0)); want('hue 180 turns red cyan-ish', v[0] < 40 && v[1] > 80 && v[2] > 80, v);
    v = await px(p, ...c(1)); want('invert flips red to cyan', v[0] < 6 && v[1] > 250 && v[2] > 250, v);
    v = await px(p, ...c(2)); want('tint gray to red at luminance 128', near(v[0], 128, 8) && v[1] < 8 && v[2] < 8, v);
    v = await px(p, ...c(3, 15)); want('duotone white = light colour', near(v[0], 240, 4) && near(v[1], 224, 4) && near(v[2], 208, 4), v);
    v = await px(p, ...c(3, 55)); want('duotone black = dark colour', near(v[0], 16, 4) && near(v[1], 32, 4) && near(v[2], 48, 4), v);
    v = await px(p, ...c(4)); want('exposure +1 stop in linear light: 64 → ~90', near(v[0], 90, 6), v);
    v = await px(p, ...c(5)); want('whiteBalance +1 warms (r up, b down)', v[0] > 150 && v[2] < 105, v);
    v = await px(p, ...c(6, 15)); want('shadows +1 lifts 40', v[0] > 55, v);
    v = await px(p, ...c(6, 55)); want('highlights +1 pulls 220 down', v[0] < 205, v);
    v = await px(p, ...c(7, 15)); want('levels 0.25..0.75 clips 64 to black', v[0] < 6, v);
    v = await px(p, ...c(7, 55)); want('levels 0.25..0.75 clips 192 to white', v[0] > 249, v);
    v = await px(p, ...c(8)); want('curves hits its control point (0.5 → 0.8 = 204)', near(v[0], 204, 4) && near(v[2], 204, 4), v);
    v = await px(p, ...c(9)); want('curves per channel: only red moves', near(v[0], 204, 4) && near(v[1], 128, 3) && near(v[2], 128, 3), v);
    const f = await p.evaluate(() => { const X = KIT.fx; return [X.curve([[0, 0], [0.5, 0.8], [1, 1]])(0.5), X.curve([[0, 0], [0.5, 0.8], [1, 1]], false)(0.25), X.curve([[0, 0], [0.3, 0.1], [0.7, 0.9], [1, 1]])(0.5)]; });
    want('curve(): control point exact, linear mid-segment, monotone interior', near(f[0], 0.8, 1e-9) && near(f[1], 0.4, 1e-9) && f[2] > 0.1 && f[2] < 0.9, f);
    for (const [what, fn] of [['1 point', 'KIT.fx.curve([[0,0]])'], ['33 points', 'KIT.fx.curve(Array.from({length:33},(_, i)=>[i,i]))'], ['descending x', 'KIT.fx.curve([[1,0],[0,1]])']])
      want('curve rejects ' + what, await p.evaluate((s) => { try { eval(s); return false; } catch { return true; } }, fn), what);
    v = await px(p, ...c(10, 50, 15)); want('longShadow 40 px: shadow 20 px right of the box', v[0] < 30 && v[2] < 30, v);
    v = await px(p, ...c(10, 75, 15)); want('longShadow stops at its length', v[0] > 200, v);
    v = await px(p, ...c(11, 33, 15)); want('glow: red halo beside the box', v[0] > v[2] + 15, v);
    v = await px(p, ...c(12, 15, 38)); want('dropShadow: dark below the box', v[0] < 60, v);
    const k = await p.evaluate(() => { const d = window.T.key.el.getContext('2d').getImageData(0, 0, 70, 70).data; return [d[3], d[(35 * 70 + 60) * 4 + 3]]; });
    want('colorKey: green transparent, red kept', k[0] === 0 && k[1] === 255, k);
    const vb = await p.evaluate(() => { const d = window.T.vib.el.getContext('2d').getImageData(1, 1, 1, 1).data; return [d[0], d[1], d[2]]; });
    want('vibrance +1 spreads the channels of a muted colour', vb[0] - vb[1] > 40, vb);
    const a = await px(p, ...c(15, 3, 66)), b2 = await px(p, ...c(15));
    want('vignette darkens the corner more than the centre', a[0] < b2[0] - 25, [a, b2]);
    await at(p, 0); const s0 = await px(p, ...c(15)); await at(p, 3); const s1 = await px(p, ...c(15));
    want('shine passes the middle of the box at half progress', s1[0] > s0[0] + 10, [s0, s1]);
    if (bad.length) throw new Error('fx-color check:\n  ' + bad.join('\n  '));
  } };
