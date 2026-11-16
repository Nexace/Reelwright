// tools/highlight.js: highlight, strike, crossed, box, bracket on text boxes (KIT.doodle.mark). Ink is counted in the box before
// the mark starts and after it is drawn; the shuffled-seek run proves set(t) is pure in both renderers.
import { grab } from "./_helpers.js";
const KINDS = ["highlight", "strike", "crossed", "box", "bracket"];
export default { scripts: ["tools/doodle.js", "tools/doodle2.js", "tools/highlight.js"], dur: 4, film: `
const D = KIT.doodle, T = window.T = {};
const kinds = ${JSON.stringify(KINDS)};
kinds.forEach((k, i) => {
  const e = KIT.el('div', '', S, 'word'); KIT.css(e, { left: 40 + i * 120 + 'px', top: '120px', width: '80px', height: '40px', font: '600 28px Arial', lineHeight: '40px' });
  T[k] = D.mark(e, k, { in: 0.5, draw: 2, id: 'hl-' + k, color: k === 'highlight' ? '#fd0' : '#c22', style: k === 'highlight' ? 'marker' : 'pencil' });
});
KIT.start({ dur: 4, render: (t) => { for (const k of kinds) T[k].set(t); } });`,
  check: async (p) => {
    const bad = [], want = (what, ok, got) => { if (!ok) bad.push(what + ': ' + JSON.stringify(got)); };
    // red or yellow ink (not the dark text, not the page)
    const coloured = (d) => { let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i] - d[i + 2] > 60) n++; return n; };
    const ink = async (x) => coloured(await grab(p, x - 16, 90, 112, 100));
    const draw = (v) => p.evaluate(([ks, v]) => { for (const k of ks) window.T[k].at(v); }, [KINDS, v]);
    await draw(0);
    const before = []; for (let i = 0; i < 5; i++) before.push(await ink(40 + i * 120));
    await draw(1);
    const after = []; for (let i = 0; i < 5; i++) after.push(await ink(40 + i * 120));
    KINDS.forEach((k, i) => want(k + ': nothing before the draw, ink after', before[i] === 0 && after[i] > 40, [before[i], after[i]]));
    await p.evaluate(() => window.T.crossed.at(0.4)); const half = await ink(40 + 2 * 120);
    want('crossed: drawn progressively (the second stroke has not started at 0.4)', half > 0 && half < after[2] * 0.75, [half, after[2]]);
    if (bad.length) throw new Error('hl check:\n  ' + bad.join('\n  '));
  } };
