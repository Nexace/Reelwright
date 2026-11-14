// p5-motionscan (WARN): slide-deck rhythm. Ten times a second the visible text and picture elements of the stage are listed (document order,
// with their text); a hard cut is a sample in which at least 60 % of what was on screen is gone or replaced at once (a crossfade spreads
// over many samples and is not counted). Reported:
//   slides     4 or more hard cuts closer than 3.5 s on average: the film is a slideshow; fly one camera through one canvas (KIT.world) or overlap
//   carousel   3 or more cuts at near-equal intervals (spread under 15 %): a metronome of slides; vary the hold lengths
// Silence with "qa": {"p5-motionscan": false}. Standalone: node tools/checks/p5-motionscan.page.mjs <project>.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { install, times, safe } from "./p5-util.mjs";

export const kind = "warn";

export default safe("p5-motionscan", async (p) => {
  await install(p);
  const dur = await p.evaluate(() => window.FILM.DUR), { ts, step } = times(dur, 0.1, 900);
  const cuts = await p.evaluate(async ({ ts }) => {
    const out = []; let prev = null;
    for (const t of ts) {
      await window.render(t);
      const stage = document.getElementById('stage') || document.body, keys = new Set();
      for (const e of stage.querySelectorAll('*')) {
        if (e.closest('.kit-subs, .kit-subrow, svg') || e.children.length > 3) continue;
        const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim(), isImg = e.tagName === 'IMG' || e.tagName === 'VIDEO';
        if (!own && !isImg) continue;
        if (window.__p5.visible(e) > 0.5) keys.add((e.id || e.className || e.tagName) + '|' + (own || e.getAttribute('src') || ''));
      }
      if (prev && prev.size >= 2) {
        const gone = [...prev].filter((k) => !keys.has(k)).length;
        if (gone / prev.size >= 0.6) out.push(t);
      }
      prev = keys;
    }
    return out;
  }, { ts });
  const lines = [];
  if (cuts.length >= 4) {
    const gap = (cuts[cuts.length - 1] - cuts[0]) / (cuts.length - 1);
    if (gap < 3.5) lines.push(`motionscan: ${cuts.length} hard cuts, one every ${gap.toFixed(1)} s on average (${cuts.slice(0, 6).map((c) => c.toFixed(1)).join(', ')}s…): reads as a slide deck`);
  }
  if (cuts.length >= 3) {
    const g = cuts.slice(1).map((c, i) => c - cuts[i]), mean = g.reduce((a, b) => a + b, 0) / g.length, spread = (Math.max(...g) - Math.min(...g)) / mean;
    if (spread < 0.15 + step / mean) lines.push(`motionscan: ${cuts.length} cuts at near-equal intervals of ${mean.toFixed(1)} s: a carousel metronome`);
  }
  return lines;
});

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { standalone } = await import("./p5-standalone.mjs");
  await standalone(process.argv[2], (await import(import.meta.url)).default, "p5-motionscan");
}
