// tools/fx-gl.js, source path: 17 WebGL2 effects and the 2 canvas-2D ones (shatter, lightning) on a transparent source, in an 8 × 3 grid.
// Every parameter animates 0 → final over t = 0..3, so an effect that does nothing shows up twice: as a cell unchanged from t = 0 (the generic
// "did it move" pass below) and as a cell whose pixels still hold the source. The specific assertions then pin the effects whose output has an
// exact answer (a ring outside the silhouette, a shifted picture, a heat ramp, a gradient). The renderer path for DOM elements and the 12
// shader transitions is tools/selfcheck/fx-gl.mjs.
import { px, at, near, grab } from "../remotion-kit/_helpers.js";

const CELL = 70, OX = (i) => (i % 8) * 80 + 5, OY = (i) => Math.floor(i / 8) * 88 + 5;
const NAMES = ["outline", "roughenEdges", "shrinkwrap", "tear", "bevelAlpha", "cylinder", "sphere", "pageTurn", "magnify", "thermalVision",
  "linearGradient", "linearGradientTint", "halftoneLinearGradient", "radialProgressivePixelate", "uvTranslate", "starburst", "filmBurn",
  "shatter", "lightning"];

export default { scripts: ["tools/fx-color.js", "tools/fx-gl.js"], dur: 6, film: `
const X = KIT.fx, T = window.T = {}, sw = (t) => KIT.seg(t, 0, 3), NAMES = ${JSON.stringify(NAMES)};
const OX = (i) => (i % 8) * 80 + 5, OY = (i) => Math.floor(i / 8) * 88 + 5;
// the source: transparent, a blue disc (35, 40) r 20 and a red square 4..18 — transparency at the edges is what outline and roughenEdges need
const src = document.createElement('canvas'); src.width = src.height = 70;
{ const g = src.getContext('2d'); g.fillStyle = '#36c'; g.beginPath(); g.arc(35, 40, 20, 0, 6.2832); g.fill(); g.fillStyle = '#e33'; g.fillRect(4, 4, 14, 14); }
for (const [i, n] of NAMES.entries()) { const host = KIT.el('div', '', S); KIT.css(host, { left: OX(i) + 'px', top: OY(i) + 'px', width: '70px', height: '70px' });
  T[n] = X[n](src, { w: 70, h: 70, parent: host }); }
KIT.start({ dur: 6, render: (t) => { const s = sw(t);
  T.outline.set({ width: 4 + 8 * s });
  T.roughenEdges.set({ amount: s, border: 20 });
  T.shrinkwrap.set({ amount: s, displacement: 8 * s });
  T.tear.set({ progress: 0.85 * s, jaggedness: 10 });
  T.bevelAlpha.set({ edgeThickness: 2 + 8 * s });
  T.cylinder.set({ radius: 26, rotationY: 50 * s, shading: 0.5 });
  T.sphere.set({ radius: 26, rotationY: 70 * s, shading: 0.5 });
  T.pageTurn.set({ foldPosition: [0.55 + 0.2 * s, 0.5], foldRadius: 14 });
  T.magnify.set({ size: 40, magnification: 150 + 150 * s });
  T.thermalVision.set({ amount: s });
  T.linearGradient.set({ start: [0.2 * s, 0.5] });
  T.linearGradientTint.set({ startColor: '#ff0000', endColor: '#00ffff', amount: s });
  T.halftoneLinearGradient.set({ secondStopDotSize: 30 * s, gridSize: 10, dotColor: '#000000' });
  T.radialProgressivePixelate.set({ startBlockSize: 1, endBlockSize: 1 + 14 * s });
  T.uvTranslate.set({ u: 0.25 * s, v: 0 });
  T.starburst.set({ rays: 10, rotation: 40 * s });
  T.filmBurn.set({ progress: 0.6 * s, seed: 1 });
  T.shatter.set({ time: 0.7 * s, pattern: 'bricks', repetitions: 5, seed: 2 });
  T.lightning.set({ conductivityState: 1 + Math.floor(4 * s), seed: 3 });
} });`,
  check: async (p) => {
    const bad = [], want = (what, ok, got) => { if (!ok) bad.push(what + ': ' + JSON.stringify(got)); };
    const cell = (i, dx, dy) => [OX(i) + dx, OY(i) + dy];
    const BG = [246, 244, 239];
    // (a) every cell moves: t = 0 (all parameters at their neutral value) against t = 3
    await at(p, 0); const before = [];
    for (let i = 0; i < NAMES.length; i++) before.push(await grab(p, OX(i), OY(i), CELL, CELL));
    await at(p, 3);
    for (let i = 0; i < NAMES.length; i++) {
      const after = await grab(p, OX(i), OY(i), CELL, CELL);
      let off = 0;
      for (let k = 0; k < after.length; k += 4) if (Math.max(Math.abs(after[k] - before[i][k]), Math.abs(after[k + 1] - before[i][k + 1]), Math.abs(after[k + 2] - before[i][k + 2])) > 6) off++;
      want(NAMES[i] + ' changes the picture from t = 0 to t = 3', off > CELL * CELL * 0.05, off);
    }
    // (b) exact answers, at t = 3
    let v = await px(p, ...cell(0, 35, 12));   // outline width 12: 8 px above the disc's top edge (y = 20)
    want('outline paints its colour 8 px outside the silhouette', v[0] > 245 && v[1] > 245 && v[2] > 245, v);
    v = await px(p, ...cell(0, 35, 2));         // 18 px out: past the ring
    want('outline stops at its width', near(v[0], BG[0], 6) && near(v[1], BG[1], 6) && near(v[2], BG[2], 6), v);
    v = await px(p, ...cell(5, 35, 40)); want('cylinder shows the source where the ray hits it', v[2] > 120 && v[0] < 120, v);
    v = await px(p, ...cell(5, 2, 2)); want('cylinder is empty outside its radius', near(v[0], BG[0], 8) && near(v[2], BG[2], 8), v);
    v = await px(p, ...cell(6, 35, 40)); want('sphere shows the source at its centre', v[2] > 120 && v[0] < 120, v);
    v = await px(p, ...cell(6, 2, 2)); want('sphere is empty outside its radius', near(v[0], BG[0], 8) && near(v[2], BG[2], 8), v);
    v = await px(p, ...cell(7, 20, 40)); want('pageTurn keeps the page before the fold', v[2] > 120 && v[0] < 120, v);
    v = await px(p, ...cell(7, 66, 66)); want('pageTurn has peeled the page away past the fold', near(v[0], BG[0], 8) && near(v[2], BG[2], 8), v);
    v = await px(p, ...cell(9, 11, 11)); want('thermalVision maps the red square to the cyan part of the ramp', v[1] > 200 && v[2] > 100 && v[0] < 60, v);
    v = await px(p, ...cell(10, 18, 40)); want('linearGradient is dark at its start end', v[0] < 90 && v[0] === v[1] && v[1] === v[2], v);
    v = await px(p, ...cell(10, 52, 40)); want('linearGradient is light at its end end', v[0] > 150 && v[0] === v[2], v);
    v = await px(p, ...cell(14, 52, 40)); want('uvTranslate u = 0.25 moves the disc 17 px right', v[2] > 120 && v[0] < 120, v);
    v = await px(p, ...cell(14, 20, 40)); want('uvTranslate leaves nothing where the disc was', near(v[0], BG[0], 8) && near(v[2], BG[2], 8), v);
    v = await px(p, ...cell(15, 50, 40)); want('starburst fills a ray with its palette', v[0] > 200 && v[2] < 80, v);
    const dots = await grab(p, OX(12), OY(12), CELL, CELL);
    let dark = 0, light = 0;
    for (let k = 0; k < dots.length; k += 4) { const l = 0.3 * dots[k] + 0.59 * dots[k + 1] + 0.11 * dots[k + 2]; if (l < 60) dark++; if (l > 200) light++; }
    want('halftoneLinearGradient draws dots on the source', dark > 200 && light > 200, { dark, light });
    want('every effect name is a KIT.fx function', await p.evaluate((n) => n.every((x) => typeof KIT.fx[x] === 'function'), NAMES), null);
    if (bad.length) throw new Error('fx-gl check:\n  ' + bad.join('\n  '));
  } };
