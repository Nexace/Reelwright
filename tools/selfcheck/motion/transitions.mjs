// KIT.transition: two chains run at once, so each of the 10 interior samples lands inside two different transitions (20 slots for
// the 18 types). Bottom chain = three opaque scene layers cycled; top chain = three transparent card layers in a z-index 5 wrapper.
const BOT = [["slide", "left"], ["push", "up"], ["wipe", "right"], ["barnDoor", "left"], ["blinds", "left"], ["clockWipe", "left"],
  ["iris", "left"], ["flip", "left"], ["cube", "right"], ["zoom", "left"]];
const NAMES = ["cut", "fade", "fadeThrough", "slide", "push", "wipe", "barnDoor", "blinds", "clockWipe", "iris", "flip", "cube", "zoom",
  "pushCut", "flash", "lightLeak", "brush", "glitch"];

export default {
  scripts: ["tools/doodle.js", "tools/transitions.js"], dur: 8,
  film: `
const D = 8, TT = 0.6;
const bg = [0, 1, 2].map((i) => { const e = KIT.el('div', 'scene ' + 'abc'[i], S);
  e.style.backgroundImage = 'repeating-linear-gradient(45deg, rgba(255,255,255,.2) 0 20px, transparent 20px 40px)';
  e.innerHTML = '<div style="left:40px;top:30px;width:120px;height:120px;background:#fff8;border-radius:50%"></div><div style="left:220px;top:40px;width:360px;color:#fff">L' + i + '</div>'; return e; });
const wrap = KIT.el('div', 'scene', S); wrap.style.zIndex = 5;
const card = [0, 1, 2].map((i) => { const e = KIT.el('div', 'scene', wrap);
  e.innerHTML = '<div style="left:' + (60 + i * 150) + 'px;top:190px;width:200px;height:110px;border-radius:14px;background:' + ['#111', '#fff', '#e33'][i] + '"></div>'; return e; });
const BOT = ${JSON.stringify(BOT)};
const TOP = [['fade'], ['fadeThrough'], ['cut'], ['pushCut'], ['flash'], ['lightLeak'], ['brush'], ['glitch'], ['slide', 'up'], ['iris', 'left', { x: 480, y: 120 }]];
window.TRS = [];
for (let i = 0; i < 10; i++) {
  const s = +(D * (i + 1) / 11).toFixed(4), at = s - [0.5, 0.4, 0.6][i % 3] * TT;
  const mk = (chain, [type, dir = 'left', extra = {}], layers) => window.TRS.push({ type, chain, from: layers[i % 3], to: layers[(i + 1) % 3],
    tr: KIT.transition(type, Object.assign({ from: layers[i % 3], to: layers[(i + 1) % 3], at, dur: TT, dir, seed: i + 1 }, extra)) });
  mk('bg', BOT[i], bg); mk('card', TOP[i], card);
}
KIT.transition('slide', { to: null, from: null, at: 0, cue: 'whoosh' });
KIT.start({ dur: D, render: (t) => window.TRS.forEach((x) => x.tr.set(t)) });`,
  check: async (page) => {
    const bad = await page.evaluate((names) => {
      const out = [], as = (c, m) => { if (!c) out.push(m); }, S = KIT.stage, n0 = S.children.length;
      const apply = (t) => window.TRS.forEach((x) => x.tr.set(t)), snap = () => [...S.querySelectorAll('*')].map((e) => e.style.cssText).join('|');
      for (const n of names) as(KIT.transition.names.includes(n), 'names lacks ' + n);
      const seen = new Set();
      for (const x of window.TRS) {
        const { tr, from, to, type } = x; seen.add(type);
        as(tr.p(tr.at) === 0 && tr.p(tr.end) === 1, type + ': p(at) != 0 or p(end) != 1');
        apply(tr.at - 0.002);
        as(to.style.visibility === 'hidden' && from.style.visibility === 'visible', type + ': before at, to must be hidden and from shown');
        apply(tr.end + 0.002);
        as(from.style.visibility === 'hidden' && to.style.visibility === 'visible', type + ': after end, from must be hidden and to shown');
        as(['transform', 'clipPath', 'maskImage', 'filter', 'zIndex'].every((k) => !from.style[k] && !to.style[k]) && !to.style.opacity &&
          (!from.style.opacity || from.style.opacity === '0'), type + ': styles not reset after end (hidden from keeps opacity 0)');
      }
      for (const n of names) as(seen.has(n), n + ' is not in the film');
      for (const t of [0.3, 2.7, 4.1, 6.2]) { apply(t); const a = snap(); apply(5.1); apply(t); as(snap() === a, 'set(' + t + ') is not a pure function of t'); }
      // custom transition function, and a missing from layer
      const mk = () => S.appendChild(document.createElement('div')), [a, b, c] = [mk(), mk(), mk()];
      let calls = 0, ctx;
      const cu = KIT.transition((p, k) => { calls++; ctx = k; k.to.style.opacity = p; }, { from: a, to: b, at: 1, dur: 1, ease: (v) => v });
      cu.set(1.5);
      as(calls === 1 && ctx.from === a && ctx.to === b && !!ctx.overlay && ctx.dir === 'left' && b.style.opacity === '0.5', 'custom transition ctx');
      cu.set(3); as(a.style.visibility === 'hidden' && b.style.opacity === '' && b.style.visibility === 'visible', 'custom transition end state');
      const nf = KIT.transition('fade', { from: null, to: c, at: 1, dur: 1, ease: (v) => v });
      nf.set(0); as(c.style.visibility === 'hidden', 'null from: before'); nf.set(1.5); as(c.style.opacity === '0.5', 'null from: mid'); nf.set(2); as(c.style.visibility === 'visible', 'null from: after');
      nf.set(0); as(c.style.opacity === '0', 'hidden layer also has opacity 0 (a visible child cannot show through)');
      let threw = false; try { KIT.transition('nope', { at: 0 }); } catch { threw = true; } as(threw, 'unknown type must throw');
      while (S.children.length > n0) S.lastChild.remove();
      return out;
    }, NAMES);
    if (bad.length) throw new Error("transitions check: " + bad.join("; "));
    const cues = await page.evaluate(() => window.FILM.cues.length);
    if (cues < 1) throw new Error("transitions check: cue option did not register a KIT.cue");
  },
};
