// p5-safe-zone (WARN, vertical films only): text under the phone app's own UI. For a frame taller than 1.2 × its width, every 0.25 s each
// visible text (outside the captions, which qa gates) is tested against three zones, in fractions of the frame:
//   top     the upper 13 %          (status bar, the app's search / handle row)
//   bottom  the lower 22 %          (caption, username, music row, the home bar)
//   rail    the right 12 % between 38 % and 80 % of the height (like / comment / share column)
// A text whose box sticks into a zone by more than 8 px is reported once per run. KIT.safe (engine.js) is the same idea for layouts
// (top 12 %, bottom 20 %); these are the zones real apps cover. Silence with "qa": {"p5-safe-zone": false}.
// Standalone: node tools/checks/p5-safe-zone.page.mjs <project>.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { install, times, span, safe } from "./p5-util.mjs";

export const kind = "warn";
export const ZONES = { top: [0, 0, 1, 0.13], bottom: [0, 0.78, 1, 1], rail: [0.88, 0.38, 1, 0.8] };   // [x0, y0, x1, y1] fractions

export default safe("p5-safe-zone", async (p, { W, H } = {}) => {
  const dims = await p.evaluate(() => [innerWidth, innerHeight]), [w, h] = [W || dims[0], H || dims[1]];
  if (!(h > 1.2 * w)) return [];
  await install(p);
  const dur = await p.evaluate(() => window.FILM.DUR), { ts } = times(dur, 0.25, 480);
  const hits = await p.evaluate(async ({ ts, ZONES, w, h }) => {
    const out = [], runs = new Map();
    for (const t of ts) {
      await window.render(t);
      const now = new Set();
      for (const { text, op, r } of window.__p5.leaves()) {
        if (op < 0.4) continue;
        for (const [z, [x0, y0, x1, y1]] of Object.entries(ZONES)) {
          const ox = Math.min(r.right, x1 * w) - Math.max(r.left, x0 * w), oy = Math.min(r.bottom, y1 * h) - Math.max(r.top, y0 * h);
          if (ox > 8 && oy > 8) { const k = z + '|' + text; now.add(k); const q = runs.get(k); if (q) q.b = t; else runs.set(k, { z, text, a: t, b: t }); }
        }
      }
      for (const [k, q] of [...runs]) if (!now.has(k)) { out.push(q); runs.delete(k); }
    }
    return out.concat([...runs.values()]);
  }, { ts, ZONES, w, h });
  return hits.map((q) => `safe-zone ${span(q.a, q.b)} "${q.text.slice(0, 40)}" sits in the ${q.z} UI zone (${q.z === 'rail' ? 'right 12 %' : q.z === 'top' ? 'top 13 %' : 'bottom 22 %'})`);
});

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { standalone } = await import("./p5-standalone.mjs");
  await standalone(process.argv[2], (await import(import.meta.url)).default, "p5-safe-zone");
}
