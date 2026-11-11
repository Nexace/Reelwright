// tools/plot2.js: planes, a grid warp (matrix + basis, then z² on a complex plane), Riemann bars, area, secant, a sliding
// tangent with a T label, a polar rose, an implicit circle, a 1/x with a discontinuity, a vector field with flowing stream lines.
import assert from "node:assert/strict";

const film = () => {
  const M = KIT.math, L = { x: 40, y: 45, w: 270, h: 270 }, box = (x, y) => ({ x, y, w: 130, h: 130 });
  const lin = M.plane({ x: [-3, 3, 1], y: [-3, 3, 1], box: L, labels: false, clip: true, out: 3.4 });
  const wl = M.warp(lin, [[1, 1], [-0.5, 1]], { in: 0.8, dur: 1.6 });
  const bs = M.basis(lin, wl, { out: 3.4 });
  const cplx = M.plane({ kind: "complex", x: [-2, 2, 0.5], y: [-2, 2, 0.5], box: L, labels: false, clip: true, in: 3.4 });
  const sq = (z) => ({ re: z.re * z.re - z.im * z.im, im: 2 * z.re * z.im });
  const wz = M.warp(cplx, sq, { kind: "complex", in: 4.4, dur: 1.8 });

  const ax = M.axes({ x: [0, 3, 1], y: [0, 5, 1], box: box(335, 35), labels: false, in: 0.2 });
  const f = (x) => 0.5 * x * x + 0.5;
  const gr = M.plot(ax, f, { in: 0.5, width: 3 });
  const rm = M.riemann(ax, f, [0.5, 2.5], { dx: 0.25, mode: "mid", in: 1.2, out: 3.6 });
  const sc = M.secant(ax, f, 1, 1, { in: 2.4, out: 4.2, length: 110, dxLabel: "dx", dyLabel: "dy", width: 3 });
  const ar = M.area(ax, f, [0.5, 2.5], { bounded: (x) => 0.5 * x, in: 3.6 });
  const xs = (t) => KIT.lerp(0.5, 2.6, KIT.seg(t, 4.2, 6.6));
  const tg = M.tangent(ax, f, xs, { in: 4.2, length: 110, width: 3 });
  const tl = M.tLabel(ax, f, xs, "x", { in: 4.2 });

  const pol = M.plane({ kind: "polar", x: [-1.1, 1.1, 0.5], y: [-1.1, 1.1, 0.5], r: [1, 0.5], box: box(475, 35), labels: false, in: 0.4 });
  const rose = M.polar(pol, (th) => Math.cos(2 * th), { in: 1.5, draw: 2.5, width: 3 });

  const cp = M.plane({ x: [-1.5, 1.5, 0.5], y: [-1.5, 1.5, 0.5], box: box(335, 195), labels: false, faded: 0, clip: true, in: 0.6 });
  const circ = M.implicit(cp, (x, y) => x * x + y * y - 1, { res: 0.1, in: 1.8, width: 3 });
  const hyp = M.plot2(cp, (x) => 0.3 / x, { discontinuities: [0], in: 2.6, width: 2, color: "var(--kit-ink)" });

  const fp = M.plane({ x: [-2, 2, 1], y: [-2, 2, 1], box: box(475, 195), labels: false, faded: 0, in: 0.8 });
  const F = (x, y) => [-y - 0.3 * x, x - 0.3 * y];
  const fd = M.field(fp, F, { step: 0.5, colorByMagnitude: true, in: 1.4, width: 2, tip: 10 });
  const slOpts = { n: 16, seed: 7, dt: 0.05, steps: 80, in: 2.8, dur: 1.4, flow: { dash: 40, speed: 300 }, colorByMagnitude: true, width: 2 };
  const sl = M.streamLines(fp, F, slOpts);

  window.P2 = { lin, cplx, wz, sq, ax, f, rm, circ, fp, F, slOpts, sl };
  const all = [lin, wl, bs, cplx, wz, ax, gr, rm, sc, ar, tg, tl, pol, rose, cp, circ, hyp, fp, fd, sl];
  KIT.start({ dur: 7, render(t) { for (const o of all) o.set(t); } });
};

export default {
  scripts: ["tools/doodle.js", "tools/math.js", "tools/plot2.js"],
  dur: 7,
  film: `(${film.toString()})();`,
  async check(page) {
    const r = await page.evaluate(() => {
      const M = KIT.math, P = window.P2, near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
      const out = {};
      out.n2p = [[0.5, -1.25], [1.7, 0.3], [-2, 2]].every(([re, im]) => { const z = P.cplx.p2n(...P.cplx.n2p({ re, im })); return near(z.re, re) && near(z.im, im); })
        && P.cplx.n2p(1.5).join() === P.cplx.c2p(1.5, 0).join();
      out.c2p = [[0.3, -2.2], [2.9, 1]].every(([x, y]) => { const [a, b] = P.lin.p2c(...P.lin.c2p(x, y)); return near(a, x) && near(b, y); });
      const pts = P.circ.paths.flat();
      out.implicit = pts.length > 40 && P.circ.paths.length === 1 && pts.every(([x, y]) => Math.abs(x * x + y * y - 1) < P.circ.res);
      // ∫ 0.5x² + 0.5 over [0.5, 2.5] = 43/12; the midpoint rule is low by exactly (b − a)·h²·f''/24 for a quadratic
      const I = 43 / 12, h = 0.25;
      out.riemann = near(I - P.rm.sum, (2 * h * h) / 24, 1e-9) && P.rm.bars.length === 8;
      const lr = ["left", "right"].map((mode) => M.riemann(P.ax, P.f, [0.5, 2.5], { dx: h, mode }));
      out.riemannLR = lr[0].sum < I && I < lr[1].sum;
      lr.forEach((x) => x.el.remove());
      const src = P.cplx.lines.map((l) => l.pts), a0 = P.wz.at(0), a1 = P.wz.at(1);
      out.warp0 = a0.every((l, i) => l.every((q, j) => q[0] === src[i][j][0] && q[1] === src[i][j][1]));
      out.warp1 = a1.every((l, i) => l.every((q, j) => { const z = P.sq({ re: src[i][j][0], im: src[i][j][1] }); return q[0] === z.re && q[1] === z.im; }));
      const s1 = M.streamLines(P.fp, P.F, P.slOpts), s2 = M.streamLines(P.fp, P.F, P.slOpts);
      out.stream = JSON.stringify(s1.lines) === JSON.stringify(s2.lines) && JSON.stringify(s1.lines) === JSON.stringify(P.sl.lines) && s1.lines.length > 8;
      s1.el.remove(); s2.el.remove();
      return out;
    });
    for (const k in r) assert.ok(r[k], `plot2 check failed: ${k}`);
    // the z² warp has landed at the end: every line's d is exactly fn of its samples
    assert.ok(await page.evaluate(async () => { await window.render(7); const P = window.P2, a1 = P.wz.at(1);
      return P.cplx.lines.every((l, i) => l.el.getAttribute("d") === P.cplx.dOf(a1[i])); }), "plot2 check failed: warp end d");
    const snap = () => page.evaluate(() => [...document.querySelectorAll("#stage *")].map((e) =>
      ["style", "d", "transform"].map((k) => e.getAttribute(k) || "").join("|")).join("\n"));
    for (const t of [1.9, 5.1]) {
      await page.evaluate((t) => window.render(t), t); const s1 = await snap();
      await page.evaluate(() => window.render(3.3)); await page.evaluate((t) => window.render(t), t);
      assert.equal(await snap(), s1, `plot2 check failed: set(${t}) twice differs`);
    }
  },
};
