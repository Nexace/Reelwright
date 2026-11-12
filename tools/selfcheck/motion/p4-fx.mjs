// tools/manim-fx.js (Phase 11 P4): Broadcast, TracedPath/TracingTail, AnimatedBoundary, Create/Uncreate, letter/word typing with a
// cursor and untyping, PhaseFlow, ZoomedScene. check() proves the numbers (ring radii, trace head, boundary dash, lag windows,
// typed strings, the flow against its closed-form solution, the zoom display against the source geometry); the harness proves
// render(t) is pure (shuffled seeks, both renderers).
import assert from "node:assert/strict";

const film = () => {
  const M = KIT.math, mk = (c, x, y, w, h) => { const e = KIT.el("div", c, S); Object.assign(e.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px", background: "#36c" }); return e; };
  const target = mk("t", 40, 40, 40, 30);
  const bc = KIT.indicate.broadcast(target, { at: 0.2, dur: 1.4, n: 4, radius: 60, lag: 0.25, width: 3 });
  const pos = (t) => [140 + 50 * Math.cos(t * 2), 90 + 30 * Math.sin(t * 2)];
  const tr = M.trace(pos, { in: 0.3, tail: 1, width: 4 }), tr2 = M.trace((t) => [330 + 20 * t, 60 + 15 * Math.sin(t * 3)], { in: 0.3, tail: Infinity, samples: 40, width: 2 });
  const box = mk("b", 230, 40, 70, 40);
  const ab = M.animatedBoundary(box, { colors: ["#e33", "#2a8", "#36c"], cycleRate: 0.5, pad: 6 });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.assign(svg.style, { position: "absolute", left: "0", top: "0", overflow: "visible" }); svg.setAttribute("width", 640); svg.setAttribute("height", 360); S.appendChild(svg);
  const sh = (tag, a) => { const e = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const k in a) e.setAttribute(k, a[k]); Object.assign(e.style, { fill: "none", stroke: "#222", strokeWidth: "3px" }); svg.appendChild(e); return e; };
  const g1 = [sh("circle", { cx: 40, cy: 150, r: 22 }), sh("rect", { x: 70, y: 130, width: 40, height: 40 }), sh("path", { d: "M130 170L150 130L170 170Z" })];
  const g2 = [sh("circle", { cx: 40, cy: 210, r: 22 }), sh("rect", { x: 70, y: 190, width: 40, height: 40 }), sh("path", { d: "M130 230L150 190L170 230Z" })];
  const cr = M.create(g1, { in: 0.4, dur: 1.5, lag: 0.5 }), un = M.create(g2, { mode: "uncreate", in: 3, dur: 1.2, lag: 0.5 });
  const tx1 = KIT.el("div", "tx", S); Object.assign(tx1.style, { left: "200px", top: "120px", font: "600 18px Arial", color: "#222" });
  const ty = KIT.type(tx1, "Hello Manim", { at: 0.5, cps: 8 });
  const tx2 = KIT.el("div", "tx", S); Object.assign(tx2.style, { left: "200px", top: "150px", font: "600 18px Arial", color: "#222" });
  const tw = KIT.type(tx2, "one two three four", { at: 0.5, by: "word", wps: 3, cursor: "block", leaveCursor: false });
  const tx3 = KIT.el("div", "tx", S); Object.assign(tx3.style, { left: "200px", top: "180px", font: "600 18px Arial", color: "#222" });
  const un3 = KIT.type(tx3, "Goodbye", { at: 3, cps: 6, mode: "untype" });
  const pl = M.plane({ x: [-2, 2, 1], y: [-1.5, 1.5, 1], box: { x: 400, y: 200, w: 200, h: 150 }, labels: false, faded: 0 });
  const F = (x, y) => [-y, x];
  const pf = M.phaseFlow(pl, F, { from: [1, 0], in: 0.5, dur: 3, virtualTime: 1, trail: true });
  const marker = mk("m", 20, 250, 60, 40); marker.style.background = "#e0a030"; marker.textContent = "M"; marker.style.font = "700 22px Arial"; marker.style.color = "#fff";
  const zi = KIT.zoomInset({ x: 10, y: 240, w: 100, h: 60 }, { x: 140, y: 230, w: 200, h: 120 }, { in: 1, grow: 0.8 });
  window.FX = { g2, bc, tr, tr2, ab, cr, un, g1, ty, tw, un3, pf, F, zi, marker, pos, target };
  const all = [bc, tr, tr2, ab, cr, un, ty, tw, un3, pl, pf];
  KIT.start({ dur: 5, render(t) { for (const o of all) o.set(t); zi.set(t); } });
};

export default {
  scripts: ["tools/doodle.js", "tools/math.js", "tools/plot2.js", "tools/motion.js", "tools/manim-fx.js"],
  dur: 5,
  film: `(${film.toString()})();`,
  async check(page) {
    const r = await page.evaluate(async () => {
      const X = window.FX, out = {}, near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
      // Broadcast: 4 rings over a 1.4 s window, lag 0.25: ring i starts i·0.25·w, w = 1/(1 + 3·0.25) = 4/7 of the window
      await window.render(0.2 + 0.7); const p = 0.5, w = 4 / 7;
      const rs = [...document.querySelectorAll("circle")].slice(0, 4);
      out.rings = rs.length === 4 && rs.every((c, i) => { const q = KIT.clamp((p - i * 0.25 * w) / w); return near(+c.getAttribute("r"), 60 * q, 0.02) && near(+c.style.opacity, 1 - q, 1e-6); });
      await window.render(0.1); out.bcHidden = rs[0].parentNode.style.visibility === "hidden";
      await window.render(1.7); out.bcDone = rs[0].parentNode.style.visibility === "hidden";
      // trace: the newest piece ends on the point of the path at t; nothing before `in`
      await window.render(2); const seg = X.tr.el.querySelectorAll("path");
      const d0 = seg[0].getAttribute("d"), e = X.pos(2);
      out.traceHead = d0.endsWith(`L${+e[0].toFixed(2)} ${+e[1].toFixed(2)}`) && +seg[0].style.opacity > 0.95 && +seg[29].style.opacity < 0.05;
      await window.render(0.31); out.traceEarly = [...X.tr.el.querySelectorAll("path")].filter((s) => s.style.visibility !== "hidden").length <= 1;
      await window.render(2); const poly = X.tr2.el.querySelector("path").getAttribute("d");
      out.traceAll = poly.startsWith("M336 ") && poly.split("L").length === 41;   // fn(in) = 330 + 20·0.3, 40 samples
      // AnimatedBoundary at time = t·0.5 = 0.5: growing stretch [0, smooth(0.5) = 0.5]; at time 1.5 (back and forth) it is [1 − smooth(0.5), 1]
      await window.render(1); const gp = X.ab.el.querySelectorAll("path");
      out.abGrow = near(parseFloat(gp[0].style.strokeDasharray), 0.5, 1e-4) && near(parseFloat(gp[0].style.strokeDashoffset), -0, 1e-9) && gp[1].style.visibility === "hidden";
      await window.render(3); const gq = X.ab.el.querySelectorAll("path");
      out.abBack = near(parseFloat(gq[0].style.strokeDasharray), 0.5, 1e-4) && near(parseFloat(gq[0].style.strokeDashoffset), -0.5, 1e-4) && gq[1].style.visibility !== "hidden";
      // Create: items draw one after another (lag .5 of 3 items: windows [0,.5] [.25,.75] [.5,1]); Uncreate hides everything at its end
      await window.render(0.4); out.createStart = X.g1.every((s) => s.style.visibility === "hidden");
      await window.render(0.4 + 1.5 * 0.4); const off = X.g1.map((s) => parseFloat(s.style.strokeDashoffset));
      out.createMid = off[0] < off[1] && off[1] < off[2] + 1e-9 && off[0] >= 0 && off[2] === 1;
      await window.render(2.5); out.createEnd = X.g1.every((s) => s.style.strokeDashoffset === "0" && +s.style.fillOpacity === 1);
      await window.render(3 + 0.6); const o2 = X.g2.map((s) => parseFloat(s.style.strokeDashoffset));
      out.uncreateOrder = o2[2] > o2[0] || X.g2[2].style.visibility === "hidden";   // the last item retracts first
      await window.render(4.3); out.uncreateEnd = X.g2.every((s) => s.style.visibility === "hidden");
      // typing
      out.ty = [[0.4, ""], [0.5, ""], [0.5 + 1 / 8, "H"], [0.5 + 4 / 8, "Hell"], [0.5 + 1.4, "Hello Manim"], [9, "Hello Manim"]].every(([t, s]) => X.ty.shown(t) === s);
      out.tw = [[0.5, ""], [0.5 + 1 / 3, "one "], [0.5 + 2 / 3, "one two "], [0.5 + 4 / 3, "one two three four"]].every(([t, s]) => X.tw.shown(t) === s);
      out.untype = [[2.9, "Goodbye"], [3 + 3 / 6, "Good"], [3 + 7 / 6, ""], [9, ""]].every(([t, s]) => X.un3.shown(t) === s);
      await window.render(0.3); const cur = document.querySelectorAll("#stage > .tx span");
      out.cursor = cur.length === 3;
      await window.render(4); out.cursorLeave = document.querySelectorAll("#stage > .tx")[1].querySelector("span").style.visibility === "hidden" && document.querySelectorAll("#stage > .tx")[0].querySelector("span").style.visibility === "visible";
      // PhaseFlow on F = (-y, x): after virtual time 1 from (1, 0) the point is (cos 1, sin 1)
      const a = X.pf.at(0.5 + 3), b = X.pf.at(0.5 + 1.5), c = X.pf.at(0);
      out.flowEnd = near(a[0], Math.cos(1), 1e-6) && near(a[1], Math.sin(1), 1e-6);
      out.flowMid = near(b[0], Math.cos(0.5), 1e-6) && near(b[1], Math.sin(0.5), 1e-6) && near(c[0], 1, 1e-12) && near(c[1], 0, 1e-12);
      // ZoomedScene: once grown, the clone of the marker sits at display + (marker − src)·k with k = 200/100
      await window.render(2.5); const zi = X.zi, box = zi.el.getBoundingClientRect(), cl = zi.el.querySelector(".m").getBoundingClientRect(), st = document.getElementById("stage").getBoundingClientRect();
      const m = { x: 20, y: 250, w: 60, h: 40 }, s = { x: 10, y: 240 }, d = { x: 140, y: 230 }, k = 2, bw = 3 * KIT.u;
      out.zoomGeom = near(box.left - st.left, d.x, 0.6) && near(cl.left - st.left, d.x + bw + (m.x - s.x) * k, 1.5) && near(cl.top - st.top, d.y + bw + (m.y - s.y) * k, 1.5) && near(cl.width, m.w * k, 1.5);
      out.zoomNoSelf = zi.el.querySelectorAll(".kit-zoom").length === 0;
      await window.render(0.5); out.zoomHidden = zi.el.style.visibility === "hidden";
      return out;
    });
    for (const k in r) assert.ok(r[k] === true, `p4-fx check failed: ${k} = ${r[k]}`);
    const snap = () => page.evaluate(() => [...document.querySelectorAll("#stage *")].map((e) => ["style", "d", "r", "cx", "cy", "stroke-dasharray"].map((k) => e.getAttribute(k) || "").join("|")).join("\n") + [...document.querySelectorAll("#stage > .tx")].map((e) => e.textContent).join("|"));
    for (const t of [1.9, 3.6]) {
      await page.evaluate((t) => window.render(t), t); const s1 = await snap();
      await page.evaluate(() => window.render(0.7)); await page.evaluate((t) => window.render(t), t);
      assert.equal(await snap(), s1, `p4-fx check failed: set(${t}) twice differs`);
    }
    console.log("      p4-fx check: Broadcast rings, trace head, boundary dash, Create/Uncreate lag, typing, PhaseFlow vs cos/sin, zoom geometry OK");
  },
};
