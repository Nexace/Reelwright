// p5-readtime (WARN): text that is not up long enough to read, and captions that are too tight.
//   readtime       each text on screen (outside the captions) must stay visible (at least 60 % opaque) for readS = max(0.7 s, 0.3 s per word);
//                  sampled every 0.1 s, a run starts when the text appears and ends when it hides or its words change. Text on screen
//                  for the whole film, and a run cut off by the film's end, pass.
//   caption-tight  each caption cue (FILM.captions, or KIT.captionPhrases when the film loads tools/p5-text.js) is shown for its own
//                  readS: a cue shorter than that is TOO TIGHT (speech faster than 0.3 s per word, so cut words or split the line).
// Silence with project.json "qa": {"p5-readtime": false}. Standalone: node tools/checks/p5-readtime.page.mjs <project>.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { install, times, span, safe } from "./p5-util.mjs";

export const kind = "warn";
const SLACK = 0.05;

export default safe("p5-readtime", async (p) => {
  await install(p);
  const dur = await p.evaluate(() => window.FILM.DUR), { ts, step } = times(dur, 0.1, 600), lines = [];
  const runs = await p.evaluate(async ({ ts }) => {
    const words = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length, readS = (s) => Math.max(0.7, 0.3 * words(s));
    const open = new Map(), done = [];
    const close = (k, why) => { const r = open.get(k); if (r) { done.push({ ...r, why }); open.delete(k); } };
    for (const t of ts) {
      await window.render(t);
      const seen = new Set();
      for (const { el, text, op } of window.__p5.leaves()) {
        if (op < 0.6) continue;
        seen.add(el);
        const r = open.get(el);
        if (r && r.text !== text) close(el, 'text');
        if (!open.has(el)) open.set(el, { text, first: t, last: t, need: readS(text), t0: t === ts[0] });
        else open.get(el).last = t;
      }
      for (const el of [...open.keys()]) if (!seen.has(el)) close(el, 'hide');
    }
    for (const el of [...open.keys()]) close(el, 'end');
    return done.filter((r) => words(r.text) >= 1);
  }, { ts });
  for (const r of runs) {
    const shown = r.last - r.first + step;
    if (r.why === 'end' || (r.t0 && r.why === 'text')) continue;   // up from the first frame, or cut off by the end of the film
    if (shown + SLACK < r.need) lines.push(`readtime ${span(r.first, r.last)} "${r.text.slice(0, 40)}" is up ${shown.toFixed(2)} s, needs ${r.need.toFixed(2)} s (0.3 s/word, min 0.7 s)`);
  }
  const cues = await p.evaluate(() => {
    const K = window.KIT, cs = K.captionPhrases ? K.captionPhrases() : window.FILM.captions || [];
    return cs.map((c) => ({ t: c.t, end: c.end, text: c.text }));
  });
  for (const c of cues) {
    const need = Math.max(0.7, 0.3 * c.text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length), shown = c.end - c.t;
    if (shown + SLACK < need) lines.push(`caption-tight ${c.t.toFixed(2)}s "${c.text.slice(0, 40)}" is on screen ${shown.toFixed(2)} s, needs ${need.toFixed(2)} s: TOO TIGHT`);
  }
  return lines;
});

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { standalone } = await import("./p5-standalone.mjs");
  await standalone(process.argv[2], (await import(import.meta.url)).default, "p5-readtime");
}
