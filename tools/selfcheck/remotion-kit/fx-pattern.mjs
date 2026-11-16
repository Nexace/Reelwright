// tools/fx-pattern.js: CSS / SVG / canvas patterns (checkerboard, dotGrid, gridlines, lines, scanlines, rings, zigzag, waves, noise family,
// whiteNoise, halftone, emboss, tvSignalOff). Each is checked on real screenshot pixels, then shuffled seeks run in both renderers.
import { px, region, at } from "./_helpers.js";
export default { scripts: ["tools/fx-color.js", "tools/fx-pattern.js"], dur: 4, film: `
const P = KIT.fx.pattern, T = window.T = {};
const box = (x, y, w = 150, h = 90, bg = '#fff') => { const e = KIT.el('div', '', S); KIT.css(e, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', background: bg, overflow: 'hidden' }); return e; };
T.chk = P.checkerboard(box(0, 0), { size: 15, color: '#000', bg: '#fff' });
T.dot = P.dotGrid(box(160, 0), { size: 30, radius: 6 });
T.grid = P.gridlines(box(320, 0), { size: 30, width: 2 });
T.lines = P.lines(box(480, 0, 150, 90), { size: 10, width: 3, angle: 90 });
T.rings = P.rings(box(0, 100), { size: 20, width: 4 });
T.zig = P.zigzag(box(160, 100), { size: 20, width: 2 });
T.wav = P.waves(box(320, 100), { size: 40, height: 14, width: 2 });
T.noise = P.noise(box(480, 100), { frequency: 0.5, seed: 3 });
T.fn = P.fractalNoise(box(0, 200), { frequency: 0.05, seed: 2 });
T.wn = P.whiteNoise(box(160, 200), { size: 32 });
T.ht = P.halftone(box(320, 200), { w: 150, h: 90, cell: 12 });
T.paper = P.paper(box(480, 200, 150, 90, '#f4efe4'), {});
T.tv = P.tvSignalOff(box(0, 300, 200, 60, '#222'), { w: 200, h: 60 });
const em = P.emboss({ strength: 1 }); const src = box(210, 300, 100, 60, 'linear-gradient(90deg,#808080 50%,#c0c0c0 50%)'); em.on(src);
KIT.start({ dur: 4, render: (t) => {
  const a = KIT.seg(t, 0, 3);
  T.chk.set({ x: 15 * a, y: 0 }); T.dot.set({ x: 30 * a }); T.grid.set({ x: 10 * a }); T.lines.set({ x: 5 * a }); T.rings.set({}); T.zig.set({ x: 10 * a }); T.wav.set({ x: 20 * a });
  T.noise.set({ phase: 6 * a }); T.fn.set({ phase: 6 * a }); T.wn.set({ seed: Math.floor(a * 10) }); T.ht.set(a); T.paper.set({ phase: a }); T.tv.set(a);
} });`,
  check: async (p) => {
    await at(p, 0);
    const bad = [], want = (what, ok, got) => { if (!ok) bad.push(what + ': ' + JSON.stringify(got)); };
    const lum = (c) => c[0] + c[1] + c[2];
    const [c1, c2, c3] = [await px(p, 7, 7), await px(p, 22, 7), await px(p, 22, 22)];
    want('checkerboard: neighbouring cells alternate, diagonal cells match', lum(c1) !== lum(c2) && lum(c1) === lum(c3), [c1, c2, c3]);
    const dc = await px(p, 160 + 15, 15), de = await px(p, 160 + 1, 1);
    want('dotGrid: ink at the cell centre, clear at the edge', lum(dc) < 100 && lum(de) > 700, [dc, de]);
    const g1 = await px(p, 320 + 1, 15), g2 = await px(p, 320 + 15, 15);
    want('gridlines: a line at x=0 of the tile, clear in between', lum(g1) < 200 && lum(g2) > 700, [g1, g2]);
    const l = await region(p, 480, 0, 150, 20); want('lines: stripes (high contrast)', l.std > 60, l);
    const r = await region(p, 0, 100, 150, 90); want('rings: bands', r.std > 40, r);
    const z = await region(p, 160, 100, 150, 90), w = await region(p, 320, 100, 150, 90);
    want('zigzag and waves draw ink', z.std > 15 && w.std > 15, [z, w]);
    const n = await region(p, 480, 100, 150, 90), f = await region(p, 0, 200, 150, 90), wn = await region(p, 160, 200, 150, 90);
    want('noise, fractalNoise and whiteNoise have texture', n.std > 8 && f.std > 3 && wn.std > 40, [n, f, wn]);
    const ht = await region(p, 320, 200, 150, 90); want('halftone: dots on white', ht.std > 20 && ht.mean < 250, ht);
    const ppr = await region(p, 480, 200, 150, 90); want('paper: lit texture', ppr.std > 1, ppr);
    const e0 = await px(p, 220, 330), e1 = await px(p, 259, 330), e2 = await px(p, 260, 330), e3 = await px(p, 300, 330);
    want('emboss: flat areas keep their grey, the edge between them is pushed away from both', e0[0] === 128 && e3[0] === 192 && Math.min(Math.abs(e1[0] - 128), Math.abs(e2[0] - 192)) > 5 && (e1[0] !== 128 || e2[0] !== 192), [e0, e1, e2, e3]);
    // the same seed gives the same white-noise pixels; a different seed another picture
    const same = await p.evaluate(() => { const T = window.T, d = () => [...T.wn.el.getContext('2d').getImageData(0, 0, 32, 32).data].join(); T.wn.set({ seed: 4 }); const a = d(); T.wn.set({ seed: 5 }); const b = d(); T.wn.set({ seed: 4 }); return [a === d(), a !== b]; });
    want('whiteNoise: same seed same pixels, other seed other pixels', same[0] && same[1], same);
    // tvSignalOff: full picture at p=0 hidden, p=0.5 a thin bright band across the middle, p=1 gone
    await p.evaluate(() => window.T.tv.set(0.5));
    const mid = await px(p, 100, 330), top = await px(p, 100, 303);
    want('tvSignalOff p=.5: bright line in the middle, black above', lum(mid) > 500 && lum(top) < 100, [mid, top]);
    if (bad.length) throw new Error('fx-pattern check:\n  ' + bad.join('\n  '));
  } };
