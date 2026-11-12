// shotcards/transition.js: five transition types chained over three scene layers (0 - 7.5 s), then cardFlock (7.8 - 9.0 s)
import { PRE, verdict } from "./_common.mjs";
const NAMES = ["pageTurn", "versusSlam", "invisibleCut", "lightLeakBurn", "letterformZoom"];
export default { scripts: ["tools/shots.js", "tools/motion.js", "tools/transitions.js", "tools/shotcards/transition.js"], dur: 10, extra: [1.45, 2.85, 4.25, 5.65, 7.05, 8.3], film: PRE + `
const SC = KIT.shotcards, T = window.T = {}, tw = el('scene', S, {}), cw = el('scene', S, {}), TT = 0.9, lin = (v) => v;
const L = [0, 1, 2].map((i) => { const e = el('scene ' + 'abc'[i], tw, {}); e.style.backgroundImage = 'repeating-linear-gradient(45deg, rgba(255,255,255,.2) 0 20px, transparent 20px 40px)';
  e.innerHTML = '<div style="left:210px;top:30px;width:220px;color:#fff;font-size:200px;line-height:1">O' + i + '</div>'; return e; });
const PLAN = [['pageTurn', 0, 1, 'left', 1.0], ['versusSlam', 1, 2, 'left', 2.4], ['invisibleCut', 2, 0, 'right', 3.8], ['lightLeakBurn', 0, 1, 'up', 5.2], ['letterformZoom', 1, 2, 'left', 6.6]];
window.TRS = PLAN.map(([type, a, b, dir, at]) => ({ type, from: L[a], to: L[b], tr: type === 'letterformZoom'
  ? KIT.transition(SC.letterformZoom({ r: 40 }), { from: L[a], to: L[b], at, dur: TT, dir, x: 320, y: 120, ease: lin })
  : SC.transition(type, { from: L[a], to: L[b], at, dur: TT, dir, seed: 3, ease: lin }) }));
const word = el('', cw, { left: '0px', top: '110px', width: '640px', textAlign: 'center', fontSize: '110px', fontWeight: 900 }, 'FLOCK');
T.flock = SC.cardFlock({ parent: cw, text: 'FLOCK', word, fontSize: 110, t0: 7.8, t1: 9.0, seed: 4 });
KIT.start({ dur: 10, render: (t) => { KIT.show(tw, t < 7.7 ? 1 : 0); KIT.show(cw, t >= 7.7 ? 1 : 0); window.TRS.forEach((x) => x.tr.set(t)); T.flock.set(t); } });`,
  check: async (p) => {
    await p.evaluate((names) => {
      const T = window.T, bad = window.bad, S = KIT.stage, as = (c, m) => { if (!c) bad.push(m); }, near = (a, b, m) => as(Math.abs(a - b) < 1e-3, m + ': ' + a + ' vs ' + b);
      const apply = (t) => window.TRS.forEach((x) => x.tr.set(t));
      for (const n of names) as(KIT.shotcards.types[n], 'types lacks ' + n);
      for (const x of window.TRS) {
        const { tr, from, to, type } = x;
        apply(tr.at - 0.002); as(to.style.visibility === 'hidden' && from.style.visibility === 'visible', type + ': before the window from is up and to hidden');
        apply(tr.end + 0.002); as(from.style.visibility === 'hidden' && to.style.visibility === 'visible', type + ': after the window to is up and from hidden');
        as(['transform', 'clipPath', 'maskImage', 'filter', 'zIndex'].every((k) => !from.style[k] && !to.style[k]), type + ': styles not reset after the window');
        for (const q of [0.15, 0.5, 0.85]) {
          apply(tr.at + q * 0.9); const ov = S.querySelectorAll('.kit-transition-overlay'), shown = [...ov].some((o) => o.style.visibility === 'visible');
          as(from.style.transform || from.style.clipPath || from.style.filter || to.style.clipPath || to.style.transform || to.style.maskImage || shown, type + ': does nothing at p = ' + q);
        }
      }
      const by = (n) => window.TRS.find((x) => x.type === n);
      let x = by('pageTurn'); apply(x.tr.at + 0.9 * 0.25); as(/rotateY\(-45deg\)/.test(x.from.style.transform) && x.from.style.zIndex === '2', 'pageTurn: -45 deg at p = .25 and from on top');
      apply(x.tr.at + 0.9 * 0.75); as(/rotateY\(-135deg\)/.test(x.from.style.transform), 'pageTurn: -135 deg at p = .75');
      x = by('versusSlam'); apply(x.tr.at + 0.9 * 0.62); as(/polygon/.test(x.from.style.clipPath) && /polygon/.test(x.to.style.clipPath), 'versusSlam: both halves clipped at the slam');
      apply(x.tr.at + 0.9 * 0.57); as(x.tr, 'x'); as(parseFloat(S.querySelectorAll('.kit-transition-overlay')[1].style.opacity) > 0.3, 'versusSlam: impact flash just after the slam');
      x = by('invisibleCut'); apply(x.tr.at + 0.9 * 0.45); as(x.from.style.visibility === 'visible' && x.to.style.visibility === 'hidden', 'invisibleCut: from before the cut'); apply(x.tr.at + 0.9 * 0.55); as(x.to.style.visibility === 'visible' && x.from.style.visibility === 'hidden', 'invisibleCut: to after the cut');
      as(/polygon/.test(S.querySelectorAll('.kit-transition-overlay')[2].style.clipPath), 'invisibleCut: the band is a polygon');
      x = by('lightLeakBurn'); apply(x.tr.at + 0.9 * 0.5); as(/brightness\(2\.6/.test(x.from.style.filter + x.to.style.filter), 'lightLeakBurn: peak brightness 2.6');
      x = by('letterformZoom'); apply(x.tr.at + 0.9 * 0.5); as(/translate/.test(x.from.style.transform) && /circle/.test(x.to.style.clipPath), 'letterformZoom: from scales and to shows through a circle');
      apply(x.tr.at + 0.9 * 0.99); as(parseFloat(/circle\(([\d.]+)px/.exec(x.to.style.clipPath)[1]) > Math.hypot(KIT.W_, KIT.H_) * 0.9, 'letterformZoom: the circle covers the frame at the end');
      const f = T.flock; near(f.cards.length, 30, 'cardFlock cards (5 letters x 6)'); near(f.letters, 5, 'cardFlock letters'); holds('cardFlock', (t) => f.at(t).c, 7.8, 9.0);
      as(f.at(7.8).c.every((c) => c.y < 0), 'cardFlock: cards start above the frame'); as(f.at(7.8).op === 0 || f.at(7.8).op < 0.5, 'cardFlock: cards invisible at the very start');
      const e = f.at(9.0).c; as(e.every((c) => c.r === 0 && c.x > 320 - 3 * 110 * 0.62 && c.x < 320 + 3 * 110 * 0.62 && Math.abs(c.y - 180) < 110 * 0.8), 'cardFlock: cards land in the glyph boxes, unrotated');
      near(f.at(9.0).word, 0.05 / 0.3, 'cardFlock: word crossfade'); near(f.at(9.4).op, 0, 'cardFlock: cards gone'); near(f.at(9.4).word, 1, 'cardFlock: word in');
      as(f.at(8.3).c.some((c, i) => Math.abs(c.r) > 1) && f.at(8.3).c.some((c, i) => c.y > 0), 'cardFlock: tumbling mid-flight');
      scan('cardFlock', f.at); for (const k of [0.05, 0.3, 0.5, 0.8, 0.95]) { apply(1.0 + 0.9 * k); apply(5.2 + 0.9 * k); }
      let threw = 0; for (const g of [() => KIT.shotcards.transition('nope', { at: 0 }), () => KIT.shotcards.cardFlock({}), () => KIT.shotcards.gradientWipe && KIT.shotcards.gradientWipe({ feather: 0 })]) try { g(); } catch { threw++; }
      as(threw >= 2, 'bad arguments must throw');
      window.pure([1.3, 2.8, 4.2, 5.6, 7.0, 8.4, 9.1]);
    }, NAMES);
    await verdict(p, "transition");
  } };
