// tools/manim-graph.js (Phase 11 P4): Axes (tips, log scale, coordinates, axis labels), NumberLine (elongated ticks, custom labels, bracket,
// UnitInterval, Slider), BarChart (labels, scheduled value change, brace), SampleSpace (nested division), VectorScene / LinearTransformationScene
// (shear with a transformable vector, label and matrix label). check() proves coordinates, ticks, values and tips; the harness proves purity.
import assert from "node:assert/strict";

const film = () => {
  const M = KIT.math, ex = (e) => Math.abs(e);
  const A = M.axes2({ x: [-2, 2, 1], y: [-1, 3, 1], box: { x: 30, y: 15, w: 170, h: 105 }, numbers: false, in: 0.2 });
  A.addCoordinates(); const AL = A.getAxisLabels("x", "y");
  const plotA = M.plot(A, (x) => 0.5 * x * x, { in: 0.8, width: 3 });
  const B = M.axes2({ x: [0, 4, 1], y: [0, 3, 1], box: { x: 250, y: 15, w: 160, h: 105 }, yAxis: { scale: "log" }, in: 0.3 });
  const plotB = M.plot(B, (x) => Math.pow(10, 0.75 * x), { x: [0, 4], in: 0.9, width: 3 });
  const C = M.numberLine2({ range: [0, 10, 1], box: { x: 450, y: 38, w: 160, h: 0 }, elongated: [0, 5, 10], labels: { 5: "mid" }, tip: true, in: 0.2 });
  const br = C.bracket(2, 6, { label: "4", in: 1.2 });
  const sl = M.slider(C, (t) => 1 + 2 * t, { r: 8 });
  const D = M.unitInterval({ box: { x: 450, y: 100, w: 160, h: 0 }, in: 0.4 });
  const sD = M.slider(D, (t) => 0.5 + 0.4 * Math.sin(t), { r: 8 });
  const E = M.bars([3, 5, 2, 4], { names: ["a", "b", "c", "d"], valueLabels: true, box: { x: 30, y: 160, w: 170, h: 150 }, in: 0.3, yRange: [0, 6, 2] });
  E.change([4, 2, 5, 1], { in: 2.5, dur: 1 }); const bE = E.brace(0, 1, "A", { in: 1.8 });
  const F = M.sampleSpace({ x: 240, y: 190, w: 160, h: 110 });
  const parts = F.divide(0.3, { dir: "h", labels: ["A", "B"], in: 0.5 }), sub = parts[0].space.divide([0.6, 0.4], { dir: "v", labels: ["x", "y"], in: 1.5 });
  const G = M.linearScene([[1, 1], [0, 1]], { plane: { x: [-3, 3, 1], y: [-3, 3, 1], box: { x: 450, y: 150, w: 160, h: 160 }, labels: false, clip: true, in: 0.2 }, in: 1, dur: 1.5, matrixLabel: { x: 70, y: 335, size: 30 } });
  const vec = G.addVector([1, 2], { in: 0.6, label: "v" }), vl = G.addTransformableLabel(vec, "v");
  window.GP = { A, AL, B, plotB, C, br, sl, D, sD, E, bE, F, parts, sub, G, vec, vl, ex };
  const all = [A, plotA, B, plotB, C, sl, D, sD, E, F, G, vl];
  KIT.start({ dur: 5, render(t) { for (const o of all) o.set(t); } });
};

export default {
  scripts: ["vendor/katex/katex.min.js", "tools/doodle.js", "tools/math.js", "tools/math2.js", "tools/plot2.js", "tools/motion.js", "tools/manim-grid.js", "tools/manim-graph.js"],
  dur: 5,
  film: `(${film.toString()})();`,
  async check(page) {
    const r = await page.evaluate(async () => {
      const P = window.GP, out = {}, near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
      await window.render(4.9);
      // linear axes: c2p / p2c round trip, two tips, coordinate labels (5 on x, 4 on y: zero numbered once) + 2 axis labels
      out.c2p = [[0.3, -0.7], [-1.9, 2.8]].every(([x, y]) => { const [a, b] = P.A.p2c(...P.A.c2p(x, y)); return near(a, x) && near(b, y); });
      out.tips = [...P.A.el.querySelectorAll(":scope > path")].filter((p) => p.style.fill !== "none" && p.getAttribute("d").endsWith("Z")).length === 2;
      out.coords = P.A.el.querySelectorAll("text").length === 5 + 4 + 2 && P.AL.x.textContent === "x" && P.AL.y.textContent === "y";
      out.axisLabelPos = +P.AL.x.getAttribute("x") > P.A.box.x + P.A.box.w && +P.AL.y.getAttribute("y") < P.A.box.y;
      // log axis: y range in exponents, real values in; ticks labelled 10^k with a raised exponent
      const b = P.B.box;
      out.logC2P = near(P.B.c2p(2, 100)[1], b.y + b.h * (1 - 2 / 3), 1e-9) && near(P.B.c2p(2, 1)[1], b.y + b.h, 1e-9) && near(P.B.c2p(2, 1000)[1], b.y, 1e-9);
      const q = P.B.p2c(...P.B.c2p(2.5, 31.6)); out.logRound = near(q[0], 2.5) && near(q[1], 31.6, 1e-6);
      out.logLabels = [...P.B.el.querySelectorAll("tspan")].map((t) => t.textContent).join() === "0,1,2,3";
      const pe = P.plotB.pointAt(1); out.logPlot = near(pe[0], P.B.c2p(4, 1000)[0], 0.05) && near(pe[1], b.y, 0.05);
      // number line: n2p / p2n, elongated ticks 1.5x, custom label at 5, bracket drawn, slider on the line
      out.n2p = [0, 3.3, 10].every((v) => near(P.C.p2n(P.C.n2p(v)[0]), v, 1e-9)) && near(P.C.n2p(10)[0] - P.C.n2p(0)[0], P.C.box.w, 1e-9);
      const marks = [...P.C.el.querySelectorAll("g")[0].querySelectorAll("path")].map((p) => { const n = p.getAttribute("d").match(/-?[\d.]+/g).map(Number); return Math.abs(n[3] - n[1]); });
      out.elong = marks.length === 11 && [0, 5, 10].every((i) => near(marks[i], marks[1] * 1.5, 0.03)) && near(marks[1], marks[2], 1e-9);
      const cl = [...P.C.el.querySelectorAll("text")].map((t) => t.textContent); out.customLabel = cl.join("|") === "mid|4|10.0" || cl.join("|");   // labels only where asked: "mid", the bracket's "4", the slider readout
      out.bracket = P.br.path.getAttribute("d").startsWith("M") && P.br.label.textContent === "4";
      await window.render(0.5); const v0 = P.sl.valueAt(0.5); out.slider = near(v0, 2) && near(+P.sl.knob.getAttribute("cx"), P.C.n2p(2)[0], 0.01);
      await window.render(4.9); out.sliderClamp = P.sl.valueAt(4.9) === 10 && near(+P.sl.knob.getAttribute("cx"), P.C.n2p(10)[0], 0.01);
      out.unitNums = [...P.D.el.querySelectorAll(":scope > g")[1].querySelectorAll("text")].map((t) => t.textContent).join() === "0,1";
      // bars: values before / during / after the scheduled change; heights follow the values
      const E = P.E; out.barsVals = E.valuesAt(0).join() === "3,5,2,4" && E.valuesAt(5).join() === "4,2,5,1" && near(E.valuesAt(3)[0], 3 + (4 - 3) * KIT.ease(0.5), 1e-9);
      const h = (i) => +E.bars[i].el.getAttribute("height"), unit = E.axes.c2p(0, 0)[1] - E.axes.c2p(0, 1)[1];
      out.barsGeom = near(h(0), 4 * unit, 0.05) && near(h(2), 5 * unit, 0.05) && E.bars[1].label.textContent === "2";
      out.brace = P.bE.label.textContent === "A" && P.bE.path.getAttribute("d").startsWith("M");
      // sample space: 0.3 / 0.7 split of the width, the first part split 0.6 / 0.4 of the height
      const F = P.F, w = (e) => +e.getAttribute("width"), hh = (e) => +e.getAttribute("height");
      out.sampleH = near(w(P.parts[0].rect), 0.3 * F.r.w, 0.01) && near(w(P.parts[1].rect), 0.7 * F.r.w, 0.01) && P.parts[0].braceLabel.textContent === "0.3";
      out.sampleV = near(hh(P.sub[0].rect), 0.6 * F.r.h, 0.01) && near(hh(P.sub[1].rect), 0.4 * F.r.h, 0.01) && near(w(P.sub[0].rect), 0.3 * F.r.w, 0.01);
      // linear scene: shear [[1,1],[0,1]]: v = (1, 2) lands on (3, 2); the arrow ends there; the label has turned into L(v); the matrix label shows 1 1 0 1
      const G = P.G, tip = P.vec.tipAt(4.9), want = G.plane.c2p(3, 2);
      out.shearTip = near(tip[0], 3, 1e-9) && near(tip[1], 2, 1e-9) && near(P.vec.tipAt(0)[0], 1, 1e-12) && near(P.vec.tipAt(1.75)[0], 1 + 2 * KIT.ease(0.5), 1e-9);
      const nums = P.vec.arrow.getAttribute("d").match(/-?[\d.]+/g).map(Number);
      out.shearArrow = Math.hypot(nums[4] - want[0], nums[5] - want[1]) < 0.1;   // the tip point of the arrow path
      out.labelSwap = +P.vl.after.style.opacity > 0.99 && +P.vl.before.style.opacity < 0.01 && P.vl.after.textContent === "L(v)";
      out.matrixLabel = G.matrixLabel.getEntries().map((e) => e.textContent).join() === "1,1,0,1";
      out.basis = near(G.warp.progress(4.9), 1) && G.basis !== null;
      return out;
    });
    for (const k in r) assert.ok(r[k] === true, `p4-graph check failed: ${k} = ${r[k]}`);
    const snap = () => page.evaluate(() => [...document.querySelectorAll("#stage *")].map((e) => ["style", "d", "x", "y", "cx", "width", "height"].map((k) => e.getAttribute(k) || "").join("|") + e.textContent.length).join("\n"));
    for (const t of [1.4, 3.1]) {
      await page.evaluate((t) => window.render(t), t); const s1 = await snap();
      await page.evaluate(() => window.render(0.7)); await page.evaluate((t) => window.render(t), t);
      assert.equal(await snap(), s1, `p4-graph check failed: set(${t}) twice differs`);
    }
    console.log("      p4-graph check: axes tips/coordinates/labels, log scale, number line ticks/slider/bracket, bars change, sample space, shear scene OK");
  },
};
