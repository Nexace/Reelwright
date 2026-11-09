// KIT.tex (tools/tex.js): Write, a matching transform along an arc, a non-matching morph, set_color_by_tex, Unwrite.
import assert from "node:assert/strict";

export default {
  scripts: ["vendor/mathjax/config.js", "vendor/mathjax/tex-svg-full.js", "vendor/flubber/flubber.min.js", "tools/tex.js"],
  dur: 6,
  film: `
const A = KIT.tex('a^2 + b^2 = c^2', { x: 320, y: 110, size: 44 });
const B = KIT.tex('c^2 = a^2 + b^2', { x: 320, y: 110, size: 44 });
const C = KIT.tex('\\\\frac{a+b}{2}', { x: 320, y: 250, size: 44 });
const D = KIT.tex('x = \\\\sqrt{y}', { x: 320, y: 250, size: 44 });
const colored = B.color('c^2', '#e33');
A.write({ at: 0.3, dur: 1.2 });
A.transform(B, { at: 1.8, dur: 1, pathArc: Math.PI / 2 });
C.write({ at: 0.5, dur: 1.2 });
C.transform(D, { at: 2.4, dur: 1.2, matching: false });
B.unwrite({ at: 4.2, dur: 1 });
D.unwrite({ at: 4.6, dur: 1 });
window.T = { A, B, C, D, colored: colored.length };
KIT.start({ dur: 6, render: (t) => { A.set(t); B.set(t); C.set(t); D.set(t); } });
`,
  async check(page) {
    const r = await page.evaluate(async () => {
      const { A, B, C, D } = window.T, all = [A, B, C, D].flatMap((x) => x.glyphs);
      const cs = (g) => getComputedStyle(g.el);
      const snap = () => all.map((g) => { const s = cs(g); return [s.opacity, s.visibility, s.fillOpacity, s.strokeOpacity, s.strokeDasharray,
        s.strokeDashoffset, s.color, s.fillRule, g.el.getAttribute("d"), g.el.getAttribute("transform")].join("|"); }).join("\n");
      const out = { n: all.length, keys: all.every((g) => g.key), colored: window.T.colored };
      await render(0.2); out.before = all.every((g) => +cs(g).opacity === 0);
      await render(1.75); out.written = [...A.glyphs, ...C.glyphs].every((g) => { const s = cs(g);
        return +s.opacity === 1 && +s.fillOpacity === 1 && +s.strokeOpacity === 0 && s.strokeDasharray === "none"; }) && B.glyphs.every((g) => +cs(g).opacity === 0);
      await render(1.0); out.midWrite = A.glyphs.some((g) => cs(g).strokeDasharray !== "none" && +cs(g).strokeOpacity > 0);
      await render(2.8);   // matched transform done: each A glyph sits on its B partner (same key, in order)
      const used = new Set(); out.maxOff = 0; out.matched = 0;
      for (const g of A.glyphs) {
        const j = B.glyphs.findIndex((h, j) => !used.has(j) && h.key === g.key); if (j < 0) continue;
        used.add(j); out.matched++;
        const a = g.el.getBoundingClientRect(), b = B.glyphs[j].el.getBoundingClientRect();
        out.maxOff = Math.max(out.maxOff, ...["x", "y", "width", "height"].map((k) => Math.abs(a[k] - b[k])));
      }
      out.handoff = A.glyphs.every((g) => +cs(g).opacity === 0) && B.glyphs.every((g) => +cs(g).opacity === 1);
      out.red = B.glyphs.filter((g) => cs(g).color === "rgb(238, 51, 51)").length;
      await render(3.0); out.morphing = C.glyphs.some((g) => cs(g).fillRule === "evenodd");
      await render(3.7); out.morphed = C.glyphs.every((g) => +cs(g).opacity === 0) && D.glyphs.every((g) => +cs(g).opacity === 1);
      await render(6); out.gone = all.every((g) => +cs(g).opacity === 0);
      await render(3.1); const s1 = snap(); await render(0.9); await render(5.0); await render(3.1); out.same = s1 === snap();
      return out;
    });
    assert.ok(r.n > 0 && r.keys, "glyphs with keys");
    assert.ok(r.before, "nothing visible before write");
    assert.ok(r.midWrite, "outlines drawing mid-write");
    assert.ok(r.written, "every glyph drawn and filled after write");
    assert.equal(r.matched, 8, "a^2+b^2=c^2 → c^2=a^2+b^2 pairs every glyph");
    assert.ok(r.maxOff < 0.05, `matched transform ends on the target boxes (off by ${r.maxOff}px)`);
    assert.ok(r.handoff, "target takes over at the end of the transform");
    assert.equal(r.colored, 2, "color('c^2') coloured c and its 2");
    assert.equal(r.red, 2, "two red glyphs on screen");
    assert.ok(r.morphing && r.morphed, "non-matching morph runs and hands over");
    assert.ok(r.gone, "unwrite ends hidden");
    assert.ok(r.same, "same t gives identical styles");
    // review regressions: \color kept, \boxed hollow, nested-svg pieces (stretched delimiters) inside the formula's box
    const q = await page.evaluate(() => {
      const c = KIT.tex('\\textcolor{red}{x}+y', { x: 100, y: 300, size: 40 }), b = KIT.tex('\\boxed{y}', { x: 300, y: 300, size: 40 });
      const n = KIT.tex('\\left(\\begin{matrix}a\\\\b\\\\c\\\\d\\end{matrix}\\right)', { x: 500, y: 200, size: 30 });
      for (const x of [c, b, n]) { x.write({ at: 0, dur: 1 }); x.set(5); }
      const svgBox = n.el.getBoundingClientRect(), pad = 4;
      const inside = n.glyphs.every((g) => { const r = g.el.getBoundingClientRect(); return r.left >= svgBox.left - pad && r.right <= svgBox.right + pad && r.top >= svgBox.top - pad && r.bottom <= svgBox.bottom + pad; });
      const red = c.glyphs.filter((g) => getComputedStyle(g.el).color === 'rgb(255, 0, 0)').length;
      const rule = b.glyphs.find((g) => g.key === 'rule'), hollow = rule && rule.el.style.fillOpacity === '0' && rule.el.style.strokeOpacity === '1';
      for (const x of [c, b, n]) x.el.remove();
      return { red, hollow, inside, parts: n.glyphs.length };
    });
    assert.equal(q.red, 1, "\\textcolor{red}{x} colours only x red");
    assert.ok(q.hollow, "\\boxed rule is an outline, not a filled block");
    assert.ok(q.inside && q.parts > 4, "stretched delimiter pieces sit inside the formula (nested svg x/y/viewBox applied)");
  },
};
