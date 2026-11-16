// node tools/selfcheck/skia.mjs — KIT.skia (tools/skia.js over vendor/canvaskit/, CanvasKit 0.42.0): a CanvasKit surface
// painted by render(t). The film draws a blue square that slides with t and a fixed green triangle (a Path), so the check
// covers rectangles, paths and colour.
//  1. KIT.skia in both renderers: 12 seeks forward vs shuffled: identical frames; the square is where t puts it whatever
//     the seek order; the frames move; the page asks for nothing outside the project (no CDN).
// Text is not drawn here: CanvasKit needs a TTF/OTF typeface and the repo ships woff2 fonts, which FreeType in CanvasKit
// does not parse. The vendored build does have the paragraph/font API.
import assert from "node:assert/strict";
import { runFixtures, baseStyle } from "./seek-harness.mjs";

const style = baseStyle("#stage > .half{width:320px;height:360px;top:0}#stage > .l{left:0}#stage > .r{left:320px}");
const fx = {
  name: "skia", dur: 2, style, scripts: ["tools/runtimes.js", "tools/skia.js"],
  film: `
const a = KIT.skia(KIT.el('div', 'half l', S), (c, CK, t) => {
  const p = new CK.Paint();
  p.setColor(CK.Color(0x33, 0x66, 0xcc, 1));
  c.drawRect(CK.XYWHRect(48 + 96 * t - 40, 100, 80, 80), p);
  p.setColor(CK.Color(0x2f, 0x9e, 0x4f, 1));
  const path = new CK.PathBuilder().moveTo(20, 300).lineTo(80, 300).lineTo(50, 240).close().detach();
  c.drawPath(path, p);
  p.delete(); path.delete();
});
window.SK = { a };
KIT.start({ dur: 2, render: (t) => { a.set(t); } });`,
  check: async (page) => {
    const bad = await page.evaluate(async () => {
      const out = [], as = (c, m) => { if (!c) out.push(m); }, { a } = window.SK;
      // mean x of the blue square's pixels on the canvas (null: none)
      const cx = (h) => { const c = h.canvas, g = c.getContext('2d', { willReadFrequently: true }), d = g.getImageData(0, 0, c.width, c.height).data;
        let n = 0, s = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] < 90 && d[i + 2] > 170) { n++; s += (i / 4) % c.width; } return n ? s / n : null; };
      const green = (h) => { const c = h.canvas, g = c.getContext('2d', { willReadFrequently: true }), d = g.getImageData(0, 0, c.width, c.height).data;
        let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] < 90 && d[i + 1] > 120) n++; return n; };
      as(!!a.CK && !!a.surface, 'CanvasKit / surface missing');
      a.set(0); const x0 = cx(a); a.set(1); const x1 = cx(a); a.set(2); const x2 = cx(a); a.set(1); const x1b = cx(a);
      as(Math.abs(x0 - 48) < 4 && Math.abs(x2 - 240) < 4 && Math.abs(x1 - 144) < 4, 'square at 0, 1, 2 s: ' + [x0, x1, x2]);
      as(x1b === x1, 'same time, same pixels (' + x1 + ' then ' + x1b + ')');
      as(green(a) > 400, 'the triangle path drew ' + green(a) + ' green pixels');
      const ext = performance.getEntriesByType('resource').filter((e) => /^https?:/.test(e.name) && !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(e.name));
      as(!ext.length, 'the page asked the network for ' + ext.map((e) => e.name).join());
      return out;
    });
    if (bad.length) throw new Error("skia check: " + bad.join("; "));
  },
};
await runFixtures([fx], "skia");
