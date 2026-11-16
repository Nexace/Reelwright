// node tools/selfcheck/p6-components.mjs — row doodle-shots-motion:2b.6: KIT.components (tools/kit-components.js): infoStrip,
// digitRoll, flashCut, verticalTicker, clipCard. One film uses all five; both renderers, 12 seeks forward vs shuffled
// (tools/selfcheck/p6-harness.mjs), plus assertions on each component's pure parts (digits at the end, ticker positions,
// flash cut windows, no leading zeros, set(t) idempotent).
import { runFixtures, baseStyle } from "./p6-harness.mjs";

const svg = (c) => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='90'><rect width='160' height='90' fill='${c}'/><circle cx='80' cy='45' r='20' fill='white'/></svg>`);

const fx = {
  name: "components", scripts: ["tools/transitions.js", "tools/kit-components.js"], dur: 6, minMoving: 8,
  style: baseStyle(".scene{left:0;top:0;width:640px;height:360px}.a{background:#36c}.b{background:#e0a030}#stage > .kit-digitroll{left:30px;top:20px;color:#fff}#stage > .kit-vticker{left:400px;top:30px;width:200px;color:#fff}"),
  film: `
const C = KIT.components;
const A = KIT.el('div', 'scene a', S), B = KIT.el('div', 'scene b', S);
const fc = C.flashCut({ from: A, to: B, at: 3, dur: 0.3 });
const dr = C.digitRoll(S, { to: 2847, at: 0.3, dur: 1.6, suffix: '+' });
const vt = C.verticalTicker(S, { items: ['alpha', 'bravo', 'charlie', 'delta'], at: 0.5, step: 0.7 });
const colors = ['#c33', '#3a6', '#63c', '#c93'];
const cc = C.clipCard(S, { src: (t) => (${svg.toString()})(colors[Math.floor(t * 2) % 4]), w: 300, h: 200, title: 'Clip', sub: 'card', at: 3.4, x: 170, y: 120 });
const is = C.infoStrip(S, { items: [{ k: 'Users', v: '12k' }, { k: 'Uptime', v: '99.9%' }, { k: 'Regions', v: '14' }], at: 1.2 });
window.CMP = { fc, dr, vt, cc, is, A, B };
KIT.start({ dur: 6, render: (t) => { fc.set(t); dr.set(t); vt.set(t); cc.set(t); is.set(t); } });`,
  check: async (page) => {
    const bad = await page.evaluate(() => {
      const out = [], as = (c, m) => { if (!c) out.push(m); }, { fc, dr, vt, A, B } = window.CMP;
      const digits = () => [...dr.el.querySelectorAll('div > div')].filter((d) => d.children.length === 11).map((d) => {
        const m = /translateY\(([-\d.e]+)em\)/.exec(d.style.transform); return m ? Math.round(-m[1] / 1.1 * 1000) / 1000 : NaN; });
      dr.set(2.5);
      as(digits().join() === '2,8,4,7', 'digitRoll end digits ' + digits().join());
      dr.set(0.3);
      const cols = [...dr.el.children].filter((c) => c.children.length === 1 && c.firstChild.children.length === 11);
      as(cols.slice(0, 3).every((c) => c.style.opacity === '0') && cols[3].style.opacity === '1', 'digitRoll shows no leading zeros at 0');
      dr.set(1.0); const a = digits().join(); dr.set(0); dr.set(1.0); as(digits().join() === a, 'digitRoll.set is not pure');
      // the tens column only moves while the ones column goes 9 → 0: at value 5 the tens digit is still 0
      as(Math.abs(dr.value(0.3) - 0) < 1e-9 && Math.abs(dr.value(1.9) - 2847) < 1e-6, 'digitRoll value endpoints');
      as(vt.pos(0) === 0 && vt.pos(0.5) === 0 && Math.abs(vt.pos(1.2) - 1) < 1e-9 && Math.abs(vt.pos(0.5 + 4 * 0.7) % 4) < 1e-9, 'verticalTicker positions');
      fc.set(2.9); as(A.style.visibility === 'visible' && B.style.visibility === 'hidden', 'flashCut before');
      fc.set(3.4); as(B.style.visibility === 'visible' && A.style.visibility === 'hidden', 'flashCut after');
      let threw = false; try { window.KIT.components.verticalTicker(S, { items: ['x'] }); } catch { threw = true; } as(threw, 'ticker with 1 item must throw');
      return out;
    });
    if (bad.length) throw new Error("components check: " + bad.join("; "));
  },
};
await runFixtures([fx], "p6-components");
