// tools/math2.js: shapes drawn on, arrows, a brace with a label, an angle, a surround, and the four flubber morph kinds.
// check(page) tests the pure parts: every shape's d parses, circle length, arcBetween ends, brace tip, morph ends, set(t) purity.
import assert from "node:assert/strict";

const film = `
S.style.setProperty('--kit-ink', '#1d1b16'); S.style.setProperty('--kit-accent', '#36c');
S.style.setProperty('--kit-bg', '#f6f4ef'); S.style.setProperty('--kit-font-text', 'Arial, sans-serif');
const M = KIT.math, sh = M.shape;
const text = (txt, x, y) => { const d = KIT.el('div', '', S, txt); KIT.css(d, { left: x + 'px', top: y + 'px', font: '600 20px Arial' }); return d; };
const A = { out: 3.5 };
const blue = 'rgba(51,102,204,.3)', gold = 'rgba(224,160,48,.5)', green = 'rgba(47,158,107,.4)';
const mobs = [
  M.circle({ cx: 45, cy: 45, r: 30, fill: blue, in: 0.2, ...A }),
  M.mob(sh.star(5, 32, 13, { cx: 125, cy: 47 }), { fill: gold, in: 0.3, ...A }),
  M.mob(sh.regularPolygon(6, 30, { cx: 205, cy: 45 }), { fill: green, in: 0.4, ...A }),
  M.mob(sh.annulus(285, 45, 30, 15), { fill: blue, in: 0.5, ...A }),
  M.mob(sh.sector(365, 60, 36, 0.4, 2.2), { fill: gold, in: 0.6, ...A }),
  M.mob(sh.annularSector(460, 68, 16, 36, 0.3, 2.6), { fill: green, in: 0.7, ...A }),
  M.mob(sh.roundedRect(540, 20, 70, 52, 14), { fill: blue, in: 0.8, ...A }),
  M.arrow([20, 120], [110, 120], { in: 1.0, ...A }),
  M.arrow([140, 120], [230, 120], { double: true, tip: 'stealth', in: 1.1, ...A }),
  M.arrow([260, 135], [350, 135], { curved: 1.2, in: 1.2, ...A }),
  M.line([380, 120], [470, 120], { dash: true, in: 1.3, ...A }),
  M.mob(sh.elbow([510, 140], 26), { in: 1.4, ...A }),
  M.line([545, 150], [620, 150], { in: 1.5, ...A }), M.line([545, 150], [600, 100], { in: 1.5, ...A }),
  M.mob(sh.angle([545, 150], [620, 150], [600, 100], 28), { stroke: 'var(--kit-accent)', in: 1.7, ...A }),
  M.mob(sh.rect(30, 190, 200, 26), { fill: gold, in: 1.9, ...A }),
  M.brace([30, 226], [230, 226], { depth: 28, label: { text: 'n items', size: 48 }, in: 2.1, ...A }),
  M.mob(sh.rightAngle([260, 270], [330, 270], [260, 200], 26), { in: 2.2, ...A }),
  M.arcBrace(430, 300, 60, 0.4, 1.7, { depth: 22, label: { text: 'arc', size: 48 }, in: 2.3, ...A }),
  M.labeled.dot(560, 300, 'P', { in: 2.4, ...A }), M.labeled.arrow([470, 215], [620, 215], 'v', { in: 2.5, ...A }),
  M.vector([60, 20], { from: [300, 340], in: 2.6, ...A }),
];
const t1 = text('E = mc2', 270, 200), t2 = text('wrong', 380, 200), t3 = text('under', 380, 240);
mobs.push(M.surround(t1, { in: 2.6, ...A }), M.cross(t2, { in: 2.7, ...A }), M.underline(t3, { in: 2.8, ...A }), M.backgroundRect(t1, { in: 2.6, ...A }));
const texts = [t1, t2, t3];
const sq = (x, y, s) => sh.rect(x, y, s, s), tri = (x, y) => sh.polygon([[x, y + 40], [x + 40, y + 40], [x + 20, y]]);
const IN = [   // one quadrant each: 1→1, 1→n, n→1, n→n
  [sq(100, 50, 60), sh.circle(240, 80, 40)],
  [sq(380, 50, 70), [sh.circle(500, 60, 25), sh.circle(560, 120, 25)]],
  [[tri(60, 230), tri(130, 260)], sh.star(5, 45, 18, { cx: 240, cy: 270 })],
  [[sq(380, 230, 50), sh.circle(470, 260, 25)], [sh.star(5, 35, 14, { cx: 400, cy: 310 }), sh.regularPolygon(6, 30, { cx: 540, cy: 290 })]],
];
const morphs = IN.map(([a, b], i) => M.morphShapes(a, b, { in: 3.9 + i * 0.15, dur: 1.2, show: 3.6, stroke: ['#36c', '#c33', '#2f9e6b', '#a0a'][i], fill: 'rgba(0,0,0,.06)' }));
window.T = { mobs, morphs, IN, texts };
KIT.start({ dur: 6.2, render(t) {
  for (const m of mobs) m.set(t);
  texts.forEach((e, i) => KIT.show(e, t >= 2.6 + i * 0.1 && t < 3.5 ? 1 : 0));
  for (const m of morphs) m.set(t);
} });
`;

export default {
  scripts: ["tools/doodle.js", "tools/math.js", "vendor/flubber/flubber.min.js", "tools/math2.js"],
  dur: 6.2,
  film,
  async check(page) {
    const r = await page.evaluate(() => {
      const NS = "http://www.w3.org/2000/svg", sh = KIT.math.shape;
      const probe = document.createElementNS(NS, "svg");
      probe.style.cssText = "position:absolute;visibility:hidden"; document.body.appendChild(probe);
      const path = (d) => { const e = document.createElementNS(NS, "path"); e.setAttribute("d", d); probe.appendChild(e); return e; };
      const pt = (e, s) => { const q = e.getPointAtLength(s); return [q.x, q.y]; };
      const samples = (ds, step) => ds.flatMap((d) => { const e = path(d), L = e.getTotalLength(), n = Math.max(2, Math.ceil(L / step)); return Array.from({ length: n + 1 }, (_, i) => pt(e, (L * i) / n)); });
      const miss = (A, B) => Math.max(...A.map((a) => Math.min(...B.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1])))));   // A within miss(A, B) of B
      const out = {};
      // 1. every shape parses and has length
      const arrow = sh.arrow([10, 10], [90, 40], { double: true, curved: 0.8 });
      const all = { circle: sh.circle(50, 50, 50), ellipse: sh.ellipse(50, 50, 40, 20), arc: sh.arc(50, 50, 40, 0, 2), arcBetween: sh.arcBetween([0, 0], [80, 0]),
        full: sh.arc(50, 50, 40, 0, 7), annulus: sh.annulus(50, 50, 40, 20), sector: sh.sector(50, 50, 40, 0, 2), annularSector: sh.annularSector(50, 50, 20, 40, 0, 2),
        polygon: sh.polygon([[0, 0], [50, 0], [20, 30]]), regularPolygon: sh.regularPolygon(5, 30), star: sh.star(5, 30), rect: sh.rect(0, 0, 40, 20),
        roundedRect: sh.roundedRect(0, 0, 40, 20, 6), line: sh.line([0, 0], [30, 40]), elbow: sh.elbow([40, 40], 20), cross: sh.cross(0, 0, 30, 30),
        angle: sh.angle([0, 0], [50, 0], [0, -50], 20), rightAngle: sh.rightAngle([0, 0], [50, 0], [0, -50], 15), brace: sh.brace([0, 0], [100, 0]),
        arcBrace: sh.arcBrace(50, 50, 40, 0, 1.5), arrow: arrow.d, tip: arrow.tip, tip2: arrow.tip2 };
      out.lens = Object.fromEntries(Object.entries(all).map(([k, d]) => [k, [path(d).getTotalLength(), /NaN|Infinity/.test(d)]]));
      // 2. circle length; 3. arcBetween ends and length
      out.circle = path(sh.circle(100, 100, 50)).getTotalLength();
      const p = [100, 200], q = [200, 150], ang = 1.1, ab = path(sh.arcBetween(p, q, ang)), abL = ab.getTotalLength();
      out.arcEnds = [pt(ab, 0), pt(ab, abL)]; out.arcLen = [abL, (Math.hypot(100, 50) / (2 * Math.sin(ang / 2))) * ang];
      // 4. brace tip = midpoint + n * depth, on both sides and slanted
      out.braces = [[[100, 200], [300, 200], 40, 1, [200, 240]], [[50, 50], [150, 100], 30, -1, [100 + 30 * Math.sin(Math.atan2(50, 100)), 75 - 30 * Math.cos(Math.atan2(50, 100))]]].map(([a, b, depth, side, tip]) => {
        const e = path(sh.brace(a, b, { depth, side })); return [pt(e, e.getTotalLength() / 2), tip];
      });
      // 5. morph ends: the expected outline is inside the result at p = 0 / 1 (separate / combine add cut edges), both ways for 1→1 and n→n
      out.morph = window.T.morphs.map((m, i) => {
        const [a, b] = window.T.IN[i], A = [].concat(a), B = [].concat(b), one = (A.length === 1 && B.length === 1) || (A.length > 1 && B.length > 1);
        const res = (t) => { m.set(t); return m.els.map((e) => e.getAttribute("d")); };
        const chk = (got, want) => Math.max(miss(samples(want, 2), samples(got, 0.25)), one ? miss(samples(got, 2), samples(want, 0.25)) : 0);
        return [chk(res(0), A), chk(res(10), B), m.els.length];
      });
      // 6. set(t) twice, and after other times, gives the same markup
      const items = [...window.T.mobs, ...window.T.morphs];
      // (style order is not state: compare attributes and sorted declarations)
      const canon = (el) => [el, ...el.querySelectorAll("*")].map((e) => e.tagName + [...e.attributes].map((x) => x.name === "style" ? [...e.style].map((k) => k + ":" + e.style.getPropertyValue(k)).sort().join(";") : x.name + "=" + x.value).sort().join("|") + e.textContent).join("\n");
      out.pure = [0.1, 0.5, 1.9, 2.75, 3.45, 4.3, 5.9].map((t) => items.filter((m) => {
        m.set(t); const a = canon(m.el); m.set(t); const b = canon(m.el); m.set(t + 1.3); m.set(0); m.set(t);
        return a !== b || a !== canon(m.el);
      }).length);
      out.n = items.length;
      return out;
    });
    for (const [k, [len, bad]] of Object.entries(r.lens)) assert.ok(len > 0 && !bad, `shape ${k}: length ${len}${bad ? ", NaN in d" : ""}`);
    assert.ok(Math.abs(r.circle - 2 * Math.PI * 50) < 0.5, `circle length ${r.circle}`);
    assert.ok(Math.hypot(r.arcEnds[0][0] - 100, r.arcEnds[0][1] - 200) < 0.05 && Math.hypot(r.arcEnds[1][0] - 200, r.arcEnds[1][1] - 150) < 0.05, "arcBetween ends " + JSON.stringify(r.arcEnds));
    assert.ok(Math.abs(r.arcLen[0] - r.arcLen[1]) < 0.5, `arcBetween length ${r.arcLen}`);
    for (const [got, want] of r.braces) assert.ok(Math.hypot(got[0] - want[0], got[1] - want[1]) < 0.5, `brace tip ${got} vs ${want}`);
    assert.deepEqual(r.morph.map((m) => m[2]), [1, 2, 2, 1], "morph path counts");
    r.morph.forEach(([a, b], i) => assert.ok(a < 0.5 && b < 0.5, `morph ${i}: p=0 off by ${a.toFixed(2)} px, p=1 off by ${b.toFixed(2)} px`));
    assert.deepEqual(r.pure, r.pure.map(() => 0), "set(t) not pure for some items, per time");
    console.log(`  math2 check: ${Object.keys(r.lens).length} shapes parse, circle ${r.circle.toFixed(2)}, ${r.n} items pure, morph ends within 0.5 px`);
  },
};
