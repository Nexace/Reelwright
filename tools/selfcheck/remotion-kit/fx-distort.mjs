// tools/fx-distort.js: chromaticAberration, noiseDisplacement, turbulentDisplace, cornerPin, transform, remap (barrel, fisheye, mirror, tile, wave).
// Canvas remaps are checked against the formula on a source whose red = x·2.55 and green = y·2.55 (every pixel unique); cornerPin by pushing the
// four corners through the element's real computed matrix.
import { px, grab, at, near } from "./_helpers.js";
export default { scripts: ["tools/fx-color.js", "tools/fx-distort.js"], dur: 4, film: `
const X = KIT.fx, T = window.T = {};
const box = (x, y, w, h, css = {}) => { const e = KIT.el('div', '', S); KIT.css(e, Object.assign({ left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' }, css)); return e; };
T.ca = box(10, 10, 70, 70, { background: '#fff' }); T.fca = X.chromaticAberration({ amount: 0 });
T.nd = box(110, 10, 100, 70, { background: '#000' }); T.fnd = X.noiseDisplacement({ scale: 0 }); T.td = box(220, 10, 100, 70, { background: '#000' }); T.ftd = X.turbulentDisplace({ scale: 0 });
T.cp = box(340, 10, 100, 60, { background: '#36c' }); T.cp.innerHTML = '';
T.tf = box(480, 20, 60, 40, { background: '#e0a030' });
const src = (() => { const c = document.createElement('canvas'); c.width = c.height = 100; const g = c.getContext('2d'), im = g.createImageData(100, 100);
  for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) { const i = (y * 100 + x) * 4; im.data.set([Math.round(x * 2.55), Math.round(y * 2.55), 128, 255], i); } g.putImageData(im, 0, 0); return c; })();
const cell = (i) => box(10 + i * 110, 120, 100, 100);
T.barrel = X.barrelDistortion(src, { w: 100, h: 100, parent: cell(0) }); T.fish = X.fisheye(src, { w: 100, h: 100, parent: cell(1) });
T.mir = X.mirror(src, { w: 100, h: 100, parent: cell(2) }); T.tile = X.tile(src, { w: 100, h: 100, parent: cell(3) }); T.wave = X.wave(src, { w: 100, h: 100, parent: cell(4) });
for (const k of ['barrel', 'fish', 'mir', 'tile', 'wave']) T[k].el.style.cssText += ';left:0;top:0';
KIT.start({ dur: 4, render: (t) => {
  const a = KIT.seg(t, 0, 2);
  T.fca.set({ amount: 8 * a }).on(T.ca);
  T.fnd.set({ scale: 80 * a, frequency: 0.03, phase: t }).on(T.nd); T.ftd.set({ scale: 80 * a, frequency: 0.03, phase: t }).on(T.td);
  X.cornerPin(T.cp, [[10 * a, 5], [100 - 20 * a, 0], [100, 60 - 15 * a], [0, 60]], { w: 100, h: 60 });
  T.tf.style.transform = X.transform({ x: 20 * a, skewX: -20 * a, scale: 1 + 0.5 * a });
  T.barrel.set(0.5 * a); T.fish.set(a); T.mir.set(); T.tile.set({ cols: 2, ox: 30 * a }); T.wave.set({ amp: 8 * a, length: 50, phase: 0 });
} });`,
  check: async (p) => {
    await at(p, 2);
    const bad = [], want = (what, ok, got) => { if (!ok) bad.push(what + ': ' + JSON.stringify(got)); };
    // chromatic aberration: 8 px split → red fringe beyond the right edge, blue beyond the left
    const r = await px(p, 10 + 70 + 3, 10 + 35), b = await px(p, 10 - 4, 10 + 35);
    want('chromaticAberration: red fringe right, blue fringe left', r[0] > 200 && r[1] < 60 && r[2] < 60 && b[2] > 200 && b[0] < 60 && b[1] < 60, [r, b]);
    // displacement: a straight edge (x = 110 + 50, black | the page's cream background past it is not part of the box) bends under scale 30
    const edgeSpread = async (x0) => {   // box is black on cream; first non-black column per row inside the box area, spread = max - min
      const w = 130, d = await grab(p, x0 - 15, 10, w, 70), xs = [];
      for (let y = 5; y < 65; y += 3) { let first = -1; for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (d[i] < 40 && d[i + 1] < 40) { first = x; break; } } xs.push(first); }
      return Math.max(...xs) - Math.min(...xs);
    };
    const sn = await edgeSpread(110), st = await edgeSpread(220);
    want('noiseDisplacement bends the box edge (scale 80)', sn >= 3, sn); want('turbulentDisplace bends the box edge (scale 80)', st >= 3, st);
    await at(p, 0); want('displacement at scale 0 leaves the edge straight', (await edgeSpread(110)) <= 1, null); await at(p, 2);
    // cornerPin: the four corners through the real matrix
    const want4 = [[10 * 1, 5], [80, 0], [100, 45], [0, 60]], got = await p.evaluate(() => {
      const m = new DOMMatrix(getComputedStyle(window.T.cp).transform);
      return [[0, 0], [100, 0], [100, 60], [0, 60]].map(([x, y]) => { const q = m.transformPoint(new DOMPoint(x, y)); return [q.x / q.w, q.y / q.w]; });
    });
    want('cornerPin maps all four corners exactly', want4.every((q, i) => near(q[0], got[i][0], 2e-3) && near(q[1], got[i][1], 2e-3)), got);
    const mid = await px(p, 340 + 50, 10 + 30); want('cornerPin: the pinned box paints its middle', mid[2] > 150 && mid[0] < 90, mid);
    want('transform(): translate, skew, scale in one string', await p.evaluate(() => KIT.fx.transform({ x: 5, skewX: 10, scale: 2 })) === 'translate(5px, 0px) rotate(0deg) skew(10deg, 0deg) scale(2, 2)', null);
    for (const [what, fn] of [['3 points', () => KIT.fx.cornerPin.matrix(10, 10, [[0, 0], [1, 0], [1, 1]])], ['collinear points', () => KIT.fx.cornerPin.matrix(10, 10, [[0, 0], [1, 1], [2, 2], [3, 3]])]])
      want('cornerPin rejects ' + what, await p.evaluate((s) => { try { eval('(' + s + ')()'); return false; } catch { return true; } }, fn.toString()), what);
    // canvas remaps vs the formula
    const c = await p.evaluate(() => {
      const T = window.T, d = (e) => e.el.getContext('2d').getImageData(0, 0, 100, 100).data, R = (a, x, y) => [a[(y * 100 + x) * 4], a[(y * 100 + x) * 4 + 1], a[(y * 100 + x) * 4 + 3]];
      const barrel = d(T.barrel), fish = d(T.fish), mir = d(T.mir), tile = d(T.tile), wave = d(T.wave);
      T.fish.set(0); const f0 = d(T.fish); T.fish.set(1);
      return { bCentre: R(barrel, 50, 50), bR: R(barrel, 90, 50), fCentre: R(fish, 50, 50), fEdge: R(fish, 90, 50), f0: R(f0, 30, 40), m: R(mir, 80, 30), mL: R(mir, 20, 30), t10: R(tile, 10, 50), t60: R(tile, 60, 50), w: R(wave, 50, 12), tileScroll: R(tile, 10, 50) };
    });
    want('barrel: centre unchanged', near(c.bCentre[0], 127, 4) && near(c.bCentre[1], 127, 4), c.bCentre);
    want('barrel k = 0.5 samples source x = 80.5 at output x = 90 (formula)', near(c.bR[0], 204, 6), c.bR);
    want('fisheye: centre unchanged, edge moved, a = 0 is the plain picture', near(c.fCentre[0], 127, 4) && Math.abs(c.fEdge[0] - 90 * 2.55) > 12 && near(c.f0[0], 30 * 2.55, 3) && near(c.f0[1], 40 * 2.55, 3), [c.fCentre, c.fEdge, c.f0]);
    want('mirror x: the right half is the left half reversed', near(c.m[0], 19 * 2.55, 5) && near(c.mL[0], 20 * 2.55, 3), [c.m, c.mL]);
    want('tile cols = 2 (scrolled 30 px of a tile): two copies 50 px apart are equal', near(c.t10[0], c.t60[0], 3) && near(c.t10[1], c.t60[1], 3), [c.t10, c.t60]);
    want('wave amp 8 at the crest row: x shifted by +8', near(c.w[0], 58 * 2.55, 6), c.w);
    if (bad.length) throw new Error('fx-distort check:\n  ' + bad.join('\n  '));
  } };
