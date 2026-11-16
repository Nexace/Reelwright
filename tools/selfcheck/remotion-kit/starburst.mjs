// tools/fx-starburst.js: KIT.fx.starburst and the filmBurn transition (Remotion row 2.2.10). check() reads screenshot pixels; the shuffled-seek run
// then proves render(t) is pure in both renderers.
import { px } from "./_helpers.js";
export default { scripts: ["tools/fx-color.js", "tools/transitions.js", "tools/fx-starburst.js"], dur: 4, film: `
const T = window.T = {};
const A = KIT.el('div', 'scene a', S), B = KIT.el('div', 'scene b', S);
const sky = KIT.el('div', '', S); KIT.css(sky, { left: '0px', top: '0px', width: '320px', height: '180px', background: '#102', zIndex: 5 });
T.sb = KIT.fx.starburst(sky, { rays: 8, colors: ['#fff', '#fa0'], rotate: 30, width: 0.5 });
T.tr = KIT.transition('filmBurn', { from: A, to: B, at: 1.5, dur: 1, seed: 2 });
KIT.start({ dur: 4, render: (t) => { T.sb.set(t, KIT.seg(t, 0, 0.5)); T.tr.set(t); } });`,
  check: async (p) => {
    const bad = [], want = (what, ok, got) => { if (!ok) bad.push(what + ': ' + JSON.stringify(got)); };
    const css = (t, a) => p.evaluate(([t, a]) => { window.T.sb.set(t, a); return window.T.sb.el.style.backgroundImage + '|' + window.T.sb.el.style.opacity; }, [t, a]);
    // pure in t: the same t gives the same style whatever came before; rotation moves the rays; amount is the opacity
    const a1 = await css(1.25, 1); await css(3, 1); const a2 = await css(1.25, 1);
    want('starburst: set(t) is pure', a1 === a2, [a1, a2]);
    want('starburst: rotates with t', a1 !== await css(2, 1), a1);
    want('starburst: amount sets the opacity', (await css(1, 0)).endsWith('|0') && (await css(1, 0.5)).endsWith('|0.5'), 0);
    want('starburst: 8 rays', (a1.match(/transparent/g) || []).length === 16, a1);
    const threw = await p.evaluate(() => { try { KIT.fx.starburst(KIT.stage, { rays: 0 }); return false; } catch { return true; } });
    want('starburst: rays 0 throws', threw, 0);
    // pixels: rays are bright, the gaps show the dark backdrop (8 rays: 45 degree pitch, a ray fills the first half of it)
    await css(0, 1);
    const lit = [];
    for (let i = 0; i < 8; i++) for (const f of [0.25, 0.75]) {
      const r = (i + f) * Math.PI / 4, c = await px(p, Math.round(160 + 70 * Math.sin(r)), Math.round(90 - 70 * Math.cos(r)));
      lit.push(c[0] + c[1] + c[2] > 150);
    }
    want('starburst: rays alternate with gaps', lit.filter((v, k) => v === (k % 2 === 0)).length >= 14, lit);
    // filmBurn: before = from (.a blue), after = to (.b amber), the middle is brighter than both ends
    const at = async (t) => { await p.evaluate((t) => { window.T.sb.set(t, 0); window.T.tr.set(t); }, t); return px(p, 500, 300); };
    const cb = await at(1.2), cm = await at(2.0), ca = await at(2.8), sum = (c) => c[0] + c[1] + c[2];
    want('filmBurn: before shows from (blue)', cb[2] > cb[0] + 60, cb);
    want('filmBurn: after shows to (amber)', ca[0] > ca[2] + 60, ca);
    want('filmBurn: the middle is brighter than both ends', sum(cm) > Math.max(sum(cb), sum(ca)) + 60, [cb, cm, ca]);
    want('filmBurn is registered', await p.evaluate(() => KIT.transition.names.includes('filmBurn')), 0);
    if (bad.length) throw new Error('starburst check:\n  ' + bad.join('\n  '));
  } };
