// tools/manim-grid.js (Phase 11 P4): Table (text, integer, decimal, math, mobject, labels, outer lines, highlight), Matrix (decimal, integer,
// tex, mobject; brackets, rows/columns, colours), boolean ops (circles: lens area against the closed form), Code (shiki tokens built here,
// line reveal, focus). check() proves layout geometry, entry text, op areas and the reveal; the harness proves render(t) is pure.
import assert from "node:assert/strict";
import { highlight } from "../../manim/code.mjs";

const SRC = "def area(r):\n    # circle\n    return 3.14159 * r * r\n\nprint(area(2))";
const TOK = highlight(SRC, { lang: "python", theme: "github-dark" });

const film = () => {
  const M = KIT.math, u = KIT.u;
  const T = M.table([[1, 2], [3, 4]], { kind: "integer", rowLabels: ["r1", "r2"], colLabels: ["a", "b"], topLeft: "#", outerLines: true, x: 110, y: 70, size: 40, in: 0.2 });
  const hl = T.highlight(1, 0, { in: 1.5, out: 3.5 });
  const T2 = M.table([[1.234, 2.5]], { kind: "decimal", decimals: 2, x: 110, y: 155, size: 30, in: 0.4 });
  const T3 = M.table([["x^2", "\\frac{1}{2}"], ["\\pi", "e^{i}"]], { kind: "math", x: 110, y: 210, size: 30, in: 0.6 });
  const cellEl = document.createElement("div"); cellEl.textContent = "box"; cellEl.style.cssText = "background:#e0a030;padding:2px 6px";
  const T4 = M.table([[cellEl, "t"]], { kind: "mobject", x: 110, y: 270, size: 30, in: 0.8 });
  const MX = M.matrix([[1, 0.5], [-2, 3.5]], { kind: "decimal", x: 330, y: 70, size: 44, in: 0.3 }).setColumnColors("#e33", "#36c");
  const MI = M.matrix([[1, 2, 3], [4, 5, 6]], { kind: "integer", bracket: "paren", x: 330, y: 150, size: 40, in: 0.5 });
  const MT = M.matrix([["a", "b"], ["c", "\\alpha"]], { kind: "tex", bracket: "bar", x: 330, y: 225, size: 40, in: 0.7 });
  const A = (ox) => M.shape.circle(ox, 300, 20), B = (ox) => M.shape.circle(ox + 20, 300, 20);
  const bo = ["union", "difference", "intersection", "exclusion"].map((op, i) => M.boolMob(op, [A(190 + 60 * i), B(190 + 60 * i)], { in: 0.5 + 0.2 * i, fillOpacity: 0.55, stroke: ["#e33", "#36c", "#2a8", "#a3a"][i] }));
  const CD = M.code(window.CODE.demo, { x: 400, y: 60, size: 30, lineNumbers: true, in: 0.4, step: 0.25, pad: 14 * u });
  CD.focus(3, 3, { in: 3, out: 4.2 });
  const CC = M.code(window.CODE.demo, { x: 400, y: 190, size: 26, reveal: "chars", cps: 40, in: 0.5, pad: 12 * u });
  window.GR = { T, hl, T2, T3, T4, MX, MI, MT, bo, CD, CC, cellEl };
  const all = [T, T2, T3, T4, MX, MI, MT, ...bo, CD, CC];
  KIT.start({ dur: 5, render(t) { for (const o of all) o.set(t); } });
};

export default {
  scripts: ["vendor/katex/katex.min.js", "vendor/polygon-clipping/polygon-clipping.umd.min.js", "tools/doodle.js", "tools/math.js", "tools/math2.js", "tools/motion.js", "tools/manim-grid.js"],
  dur: 5,
  film: `window.CODE = { demo: ${JSON.stringify(TOK)} };\n(${film.toString()})();`,
  async check(page) {
    const r = await page.evaluate(async () => {
      const G = window.GR, out = {}, near = (a, b, e) => Math.abs(a - b) <= e;
      await window.render(4.8);
      const st = document.getElementById("stage").getBoundingClientRect(), mid = (e) => { const b = e.getBoundingClientRect(); return [b.left - st.left + b.width / 2, b.top - st.top + b.height / 2]; };
      // table: entries sit at the centre of their cell rect; 3 rows x 3 columns with outer lines = 4 + 4 lines
      out.tblLines = G.T.lines.length === 8;
      out.tblText = G.T.entry(0, 0).textContent === "1" && G.T.entry(1, 1).textContent === "4" && G.T.rowLabels[1].textContent === "r2" && G.T.colLabels[0].textContent === "a";
      out.tblCenter = [[0, 0], [1, 1], [1, 0]].every(([i, j]) => { const rc = G.T.cellRect(i, j), m = mid(G.T.entry(i, j)); return near(m[0], rc.x + rc.w / 2, 1.5) && near(m[1], rc.y + rc.h / 2, 1.5); });
      out.tblDec = G.T2.entry(0, 0).textContent === "1.23" && G.T2.entry(0, 1).textContent === "2.50";
      out.tblMath = G.T3.entry(0, 1).querySelector(".katex") !== null && G.T3.entry(0, 1).querySelector(".mfrac") !== null;
      out.tblMob = G.T4.entry(0, 0) === G.cellEl && G.T4.entry(0, 1).textContent === "t";
      out.tblNoOuter = G.T3.lines.length === 2;   // 2x2 without outer lines: one horizontal + one vertical
      // table highlight: visible only inside its window, over the right cell
      await window.render(2); const op = +G.hl.rect.style.opacity;
      const rc = G.T.cellRect(1, 0);
      out.hl = op > 0.3 && near(+G.hl.rect.getAttribute("x"), rc.x, 0.01) && near(+G.hl.rect.getAttribute("height"), rc.h, 0.01);
      await window.render(4.8); out.hlGone = +G.hl.rect.style.opacity === 0;
      // reveal order: lines first, entries after, row by row
      await window.render(0.15); out.tblHidden = G.T.el.style.visibility === "hidden";
      await window.render(0.2 + 0.4 * 1 + 0.05); out.tblRevealStart = G.T.lines.some((l) => l.style.visibility !== "hidden") && +G.T.entry(1, 1).style.opacity === 0;
      await window.render(4.8);
      // matrix
      out.mxText = G.MX.entry(1, 0).textContent === "−2.0" && G.MX.entry(0, 1).textContent === "0.5" && G.MX.getEntries().length === 4;
      out.mxRC = G.MI.getRows().length === 2 && G.MI.getColumns().length === 3 && G.MI.getColumns()[2][1].textContent === "6";
      out.mxColor = getComputedStyle(G.MX.entry(0, 0)).color === "rgb(238, 51, 51)" && getComputedStyle(G.MX.entry(1, 1)).color === "rgb(51, 102, 204)" && getComputedStyle(G.MX.entry(1, 0)).color === "rgb(238, 51, 51)";
      const bx = G.MX.box, c = mid(G.MX.entry(0, 0));
      out.mxBrackets = c[0] > bx.x && c[0] < bx.x + bx.w && c[1] > bx.y && c[1] < bx.y + bx.h && G.MX.brackets.left.getAttribute("d").startsWith("M") && G.MI.brackets.left.getAttribute("d").includes("C");
      out.mxTex = G.MT.entry(1, 1).querySelector(".katex") !== null;
      // boolean ops: two circles r = 20 whose centres are 20 apart
      const R = 20, d = 20, lens = 2 * R * R * Math.acos(d / (2 * R)) - (d / 2) * Math.sqrt(4 * R * R - d * d), disc = Math.PI * R * R, rel = (a, b) => Math.abs(a - b) / b;
      const want = [2 * disc - lens, disc - lens, lens, 2 * disc - 2 * lens];
      out.boolAreas = G.bo.every((m, i) => rel(m.result.area, want[i]) < 0.01) || G.bo.map((m) => m.result.area.toFixed(1)).join();
      out.boolHole = G.bo[1].result.d.split("M").length === 2 && G.bo[3].result.d.split("M").length === 3;   // difference: one ring; exclusion: two lunes
      // code: lines, tokens, reveal, focus
      const lines = [...G.CD.el.querySelectorAll(".kit-code-line")];
      out.codeLines = lines.length === 5 && G.CD.lines.length === 5;
      out.codeText = lines.map((l) => [...l.querySelectorAll("span")].slice(1).map((s) => s.textContent).join("")).join("\n").replace(/ +$/gm, "") === "def area(r):\n    # circle\n    return 3.14159 * r * r\n\nprint(area(2))";
      out.codeColors = new Set([...lines[0].querySelectorAll("span")].map((s) => s.style.color)).size >= 3;
      await window.render(0.3); out.codeHiddenBefore = G.CD.el.style.visibility === "hidden" || lines.every((l) => +l.style.opacity === 0);
      await window.render(0.4 + 0.25 * 2 + 0.2); out.codeReveal = +lines[0].style.opacity > 0.99 && +lines[3].style.opacity === 0;
      await window.render(3.6); out.codeFocus = lines.filter((l, i) => i !== 2).every((l) => +l.style.opacity < 0.5) && +lines[2].style.opacity > 0.99;
      await window.render(4.9); out.codeFocusEnd = lines.every((l) => +l.style.opacity > 0.99);
      await window.render(0.5 + 12 / 40); const cl = [...G.CC.el.querySelectorAll(".kit-code-line")];
      out.codeChars = cl[0].textContent.length === 12 && cl[1].textContent === "";   // 12 chars typed at 40 cps in 0.3 s, line 1 not yet
      await window.render(4.9); out.codeCharsEnd = cl.map((l) => l.textContent).join("\n").replace(/ +$/gm, "") === "def area(r):\n    # circle\n    return 3.14159 * r * r\n\nprint(area(2))";
      return out;
    });
    for (const k in r) assert.ok(r[k] === true, `p4-grid check failed: ${k} = ${r[k]}`);
    const snap = () => page.evaluate(() => [...document.querySelectorAll("#stage *")].map((e) => ["style", "d", "x", "y"].map((k) => e.getAttribute(k) || "").join("|") + e.childNodes.length).join("\n"));
    for (const t of [1.1, 3.6]) {
      await page.evaluate((t) => window.render(t), t); const s1 = await snap();
      await page.evaluate(() => window.render(0.7)); await page.evaluate((t) => window.render(t), t);
      assert.equal(await snap(), s1, `p4-grid check failed: set(${t}) twice differs`);
    }
    console.log("      p4-grid check: table cells/lines/highlight, matrix rows/columns/brackets, op areas vs closed form, code reveal/focus OK");
  },
};
