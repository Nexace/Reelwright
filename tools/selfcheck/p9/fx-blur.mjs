// tools/fx-blur.js: progressiveBlur (linear + radial), regionBlur, zoomBlur, lensBlur, lightTrail, trail. A black/white line pattern shows how
// sharp each region is (std of luminance); canvas effects are checked on the canvas pixels; trail on where its copies stand at t.
import { px, region, at } from "./_helpers.js";
export default { scripts: ["tools/fx-color.js", "tools/fx-blur.js"], dur: 4, film: `
const X = KIT.fx, T = window.T = {};
const STRIPES = 'repeating-linear-gradient(90deg, #000 0 2px, #fff 2px 4px)';
const panel = (x, y, w, h) => { const e = KIT.el('div', '', S); KIT.css(e, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', background: STRIPES }); return e; };
const lin = panel(0, 0, 200, 160), rad = panel(210, 0, 200, 160), reg = panel(420, 0, 200, 160);
T.lin = X.progressiveBlur(lin, { direction: 'down', max: 20, from: 0.3, to: 0.9 });
T.rad = X.progressiveBlur(rad, { shape: 'radial', max: 20, from: 0.2, to: 0.8 });
T.reg = X.regionBlur(reg, { x: 50, y: 40, w: 100, h: 80, blur: 12, feather: 8 });
const src = (draw) => { const c = document.createElement('canvas'); c.width = 100; c.height = 100; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 100, 100); draw(g); return c; };
const line = src((g) => { g.fillStyle = '#fff'; g.fillRect(80, 0, 2, 100); });
const dot = src((g) => { g.fillStyle = '#fff'; g.fillRect(48, 48, 4, 4); });
const host = (x) => { const e = KIT.el('div', '', S); KIT.css(e, { left: x + 'px', top: '180px', width: '100px', height: '100px' }); return e; };
T.zoom = X.zoomBlur(line, { w: 100, h: 100, parent: host(0) }); T.zoom.el.style.cssText += ';left:0;top:0';
T.lens = X.lensBlur(dot, { w: 100, h: 100, parent: host(110) }); T.lens.el.style.cssText += ';left:0;top:0';
T.lt = X.lightTrail(dot, { w: 100, h: 100, parent: host(220) }); T.lt.el.style.cssText += ';left:0;top:0';
const tr = KIT.el('div', '', S); KIT.css(tr, { left: '330px', top: '180px', width: '290px', height: '100px', background: '#fff' });
T.trail = X.trail(tr, (hst) => { const b = KIT.el('div', '', hst); KIT.css(b, { top: '30px', width: '30px', height: '40px', background: '#e33' }); return (t) => { b.style.left = 40 + 60 * t + 'px'; }; }, { layers: 3, lag: 0.25, opacity: 0.6 });
KIT.start({ dur: 4, render: (t) => {
  const a = KIT.seg(t, 0, 2); T.lin.set(a); T.rad.set(a); T.reg.set({ blur: 12 * a });
  T.zoom.set(0.3 * a); T.lens.set(8 * a); T.lt.set({ dx: -40 * a, dy: 0 }); T.trail.set(t);
} });`,
  check: async (p) => {
    await at(p, 2);
    const bad = [], want = (what, ok, got) => { if (!ok) bad.push(what + ': ' + JSON.stringify(got)); };
    let top = await region(p, 20, 4, 160, 40), low = await region(p, 20, 120, 160, 36);
    want('linearProgressiveBlur: sharp at the top, blurred at the bottom', top.std > 100 && low.std < top.std * 0.4, [top.std, low.std]);
    const mid = await region(p, 20, 70, 160, 20); want('linearProgressiveBlur: in between in the middle', mid.std < top.std && mid.std > low.std, [top.std, mid.std, low.std]);
    const c = await region(p, 210 + 85, 70, 30, 20), e = await region(p, 210 + 0, 0, 30, 20);
    want('radialProgressiveBlur: sharp in the centre, blurred at the corner', c.std > 100 && e.std < c.std * 0.5, [c.std, e.std]);
    const inn = await region(p, 420 + 70, 70, 60, 30), out = await region(p, 420 + 2, 130, 40, 25);
    want('regionBlur: blurred inside the box only', inn.std < out.std * 0.4 && out.std > 100, [inn.std, out.std]);
    const cv = await p.evaluate(() => {
      const d = (el) => el.getContext('2d').getImageData(0, 0, 100, 100).data, T = window.T, zz = d(T.zoom.el), ll = d(T.lens.el), tt = d(T.lt.el);
      const lum = (a, x, y) => a[(y * 100 + x) * 4];
      return { zoomOff: lum(zz, 88, 50), zoomOn: lum(zz, 80, 50), lensCentre: lum(ll, 50, 50), lensNear: lum(ll, 55, 50), ltRight: lum(tt, 30, 50), ltBefore: (() => { T.lt.set({ dx: 0, dy: 0 }); const z = d(T.lt.el); T.lt.set({ dx: -40, dy: 0 }); return lum(z, 30, 50); })() };
    });
    want('zoomBlur: the line smears outward and dims', cv.zoomOff > 5 && cv.zoomOn < 255, cv);
    want('lensBlur: the dot spreads', cv.lensCentre < 255 && cv.lensNear > 0, cv);
    want('lightTrail: a bright trail where the unsmeared dot has none', cv.ltRight > 20 && cv.ltBefore === 0, cv);
    // trail at t = 2: the real box spans x 160..190 of the host (330 on the stage); each older copy is 15 px further left and fainter
    const g = async (x) => (await px(p, 330 + x, 180 + 50))[1];
    const [real, c3, c12, none] = [await g(182), await g(117), await g(152), await g(100)];
    want('trail: real box solid, faint oldest copy, denser copies in between, nothing before them', real === 51 && c3 > 150 && c3 < 235 && c12 < c3 && none === 255, [real, c3, c12, none]);
    if (bad.length) throw new Error('fx-blur check:\n  ' + bad.join('\n  '));
  } };
