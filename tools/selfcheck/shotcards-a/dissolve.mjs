// shotcards/dissolve.js: six texture transitions chained over three scene layers in an 8 s film
import { PRE, verdict } from "./_common.mjs";
const NAMES = ["grain", "halftone", "tornEdge", "inkBleed", "gradientWipe", "tearStreak"];
export default { scripts: ["tools/transitions.js", "tools/shotcards/dissolve.js"], dur: 8, extra: [1.05, 2.25, 3.45, 4.65, 5.85, 7.05], film: PRE + `
const SC = KIT.shotcards, TT = 0.9, lin = (v) => v;
const L = [0, 1, 2].map((i) => { const e = el('scene ' + 'abc'[i], S, {}); e.style.backgroundImage = 'repeating-linear-gradient(45deg, rgba(255,255,255,.2) 0 20px, transparent 20px 40px)';
  e.innerHTML = '<div style="left:200px;top:60px;width:240px;color:#fff;font-size:200px;line-height:1">' + 'XYZ'[i] + '</div>'; return e; });
const PLAN = [['grain', 0, 1, 'left', 0.6, {}], ['halftone', 1, 2, 'left', 1.8, {}], ['tornEdge', 2, 0, 'right', 3.0, {}], ['inkBleed', 0, 1, 'left', 4.2, {}],
  ['gradientWipe', 1, 2, 'left', 5.4, { color: '#ffe14d' }], ['tearStreak', 2, 0, 'down', 6.6, {}]];
window.TRS = PLAN.map(([type, a, b, dir, at, extra]) => ({ type, from: L[a], to: L[b], tr: SC.transition(type, Object.assign({ from: L[a], to: L[b], at, dur: TT, dir, seed: 3, ease: lin }, extra)) }));
KIT.start({ dur: 8, render: (t) => window.TRS.forEach((x) => x.tr.set(t)) });`,
  check: async (p) => {
    await p.evaluate((names) => {
      const bad = window.bad, S = KIT.stage, as = (c, m) => { if (!c) bad.push(m); }, W = KIT.W_, H = KIT.H_;
      const apply = (t) => window.TRS.forEach((x) => x.tr.set(t)), by = (n) => window.TRS.find((x) => x.type === n), at = (x, q) => apply(x.tr.at + 0.9 * q);
      const ov = (i) => S.querySelectorAll('.kit-transition-overlay')[i];
      for (const n of names) as(KIT.shotcards.types[n], 'types lacks ' + n);
      for (const x of window.TRS) {
        const { tr, from, to, type } = x;
        apply(tr.at - 0.002); as(to.style.visibility === 'hidden' && from.style.visibility === 'visible', type + ': before the window from is up');
        apply(tr.end + 0.002); as(from.style.visibility === 'hidden' && to.style.visibility === 'visible', type + ': after the window to is up');
        as(['transform', 'clipPath', 'maskImage', 'filter', 'zIndex'].every((k) => !from.style[k] && !to.style[k]), type + ': styles not reset after the window');
        for (const q of [0.15, 0.5, 0.85]) { at(x, q); as(to.style.clipPath || to.style.maskImage || from.style.transform, type + ': does nothing at p = ' + q); }
      }
      let x = by('grain'); at(x, 0.5); const g1 = x.to.style.clipPath; as(/^path\(["']M[\d. -]+h/.test(g1), 'grain: a path of squares'); at(x, 0.5); as(x.to.style.clipPath === g1, 'grain: same p, same shape');
      const cells = (s) => (s.match(/M/g) || []).length; at(x, 0.2); const c2 = cells(x.to.style.clipPath); at(x, 0.8); as(c2 > 100 && cells(x.to.style.clipPath) > c2, 'grain: more cells as p grows');
      at(x, 0.995); as(cells(x.to.style.clipPath) === Math.ceil(W / (W / 64)) * Math.ceil(H / (W / 64)), 'grain: every cell is on at the end');
      x = by('halftone'); at(x, 0.2); const xs = [...x.to.style.clipPath.matchAll(/M\s*([\d.-]+)\s/g)].map((m) => +m[1]); as(xs.length > 5 && Math.min(...xs) > 0.45 * W, 'halftone (dir left): dots appear on the right side first');
      at(x, 0.5); as(/a\s*[\d.]+\s+[\d.]+\s+0\s+1\s+0/.test(x.to.style.clipPath), 'halftone: dots are arcs');
      x = by('tornEdge'); at(x, 0.5); as(/^path\(["']M/.test(x.to.style.clipPath) && /^path\(["']M/.test(ov(2).style.clipPath) && ov(2).style.visibility === 'visible', 'tornEdge: ragged edge and paper lip');
      const e1 = x.to.style.clipPath; apply(0.1); at(x, 0.5); as(x.to.style.clipPath === e1, 'tornEdge: same p, same edge');
      x = by('inkBleed'); at(x, 0.1); const m = /^path\(["']M\s*([\d.-]+)\s+([\d.-]+)/.exec(x.to.style.clipPath); as(m && +m[1] > W / 2 && Math.abs(+m[2] - H / 2) < 1, 'inkBleed: the first blot starts at (x, y): ' + x.to.style.clipPath.slice(0, 60));
      at(x, 0.5); as((x.to.style.clipPath.match(/Z/g) || []).length >= 5, 'inkBleed: several merging blots'); at(x, 0.995); const R = +/^path\(["']M\s*([\d.-]+)\s/.exec(x.to.style.clipPath)[1]; as(Math.abs(R - W / 2) > Math.hypot(W, H), 'inkBleed: the main blot passes the frame at the end');
      x = by('gradientWipe'); at(x, 0.5); as(/linear-gradient\(270deg/.test(x.to.style.maskImage) && /screen/.test(ov(4).style.mixBlendMode) && ov(4).style.visibility === 'visible', 'gradientWipe: mask from the right and a coloured glow');
      at(x, 0.001); as(/transparent -?[\d.]+%/.test(x.to.style.maskImage), 'gradientWipe: nothing is revealed at the start');
      x = by('tearStreak'); at(x, 0.5); as(/rotate\(0\.6deg\)/.test(x.from.style.transform) && (ov(5).style.background.match(/linear-gradient/g) || []).length === 5 && /^path\(["']M/.test(x.to.style.clipPath), 'tearStreak: from pushed and tilted, five streaks, ragged edge');
      let threw = 0; for (const f of [() => KIT.shotcards.gradientWipe({ feather: 0 }), () => KIT.shotcards.transition('nope', { at: 0 })]) try { f(); } catch { threw++; }
      as(threw === 2, 'bad arguments must throw');
      window.pure([0.9, 2.2, 3.4, 4.6, 5.9, 7.0]);
    }, NAMES);
    await verdict(p, "dissolve");
  } };
