// p5-facts (WARN, opt-in): the claims ledger. Add "facts": [{ "claim": "4.8 stars", "source": "App Store, 12 Oct 2026" }] to project.json and:
//   - a fact with no `source` is reported (every claim needs one);
//   - a fact whose `claim` is nowhere on screen or in the voice-over is reported as stale (the ledger drifted from the film);
//   - a data-like number on screen (a %, a currency, ×, k/M, 1,200, 4.8) that no fact's claim contains is reported, unless an
//     "Illustrative data" label is visible at the same time (qa's own illustrative gate covers those).
// No "facts" array: no output. Silence with "qa": {"p5-facts": false}. Standalone: node tools/checks/p5-facts.page.mjs <project>.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { install, times, safe } from "./p5-util.mjs";

export const kind = "warn";
const NUM = /(?:[$€£₹]\s?\d[\d,.]*[kKmMbB]?|\d[\d,.]*\s?(?:%|×|x\b|[kKmMbB]\b)|\b\d{1,3}(?:,\d{3})+\b|\b\d+\.\d+\b)/g;
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();

export default safe("p5-facts", async (p, { P } = {}) => {
  const facts = P?.facts;
  if (!Array.isArray(facts)) return [];
  const lines = [];
  facts.forEach((f, i) => { if (!f || !f.claim) lines.push(`facts[${i}] has no claim`); else if (!f.source || !String(f.source).trim()) lines.push(`facts: "${f.claim}" has no source`); });
  const claims = facts.filter((f) => f && f.claim).map((f) => norm(f.claim));
  await install(p);
  const dur = await p.evaluate(() => window.FILM.DUR), { ts } = times(dur, 0.5, 240);
  const seen = await p.evaluate(async ({ ts }) => {
    const texts = new Set(), vo = Object.values(window.VO || {}).map((v) => v.text).join(' ');
    const label = [];
    for (const t of ts) {
      await window.render(t);
      const L = window.__p5.leaves(), ill = L.some((x) => /illustrative data/i.test(x.text));
      for (const x of L) if (x.op > 0.3) { texts.add(x.text); if (!ill) label.push(x.text); }
    }
    return { texts: [...texts], unlabelled: [...new Set(label)], vo };
  }, { ts });
  const hay = norm(seen.texts.join(' | ') + ' | ' + seen.vo);
  facts.forEach((f) => { if (f && f.claim && !hay.includes(norm(f.claim))) lines.push(`facts: "${f.claim}" is on no screen and in no voice-over line (stale ledger entry)`); });
  for (const text of seen.unlabelled) for (const m of text.match(NUM) || [])
    if (!claims.some((c) => norm(c).includes(norm(m)))) lines.push(`facts: "${m.trim()}" on screen ("${text.slice(0, 40)}") is not in the facts ledger`);
  return [...new Set(lines)];
});

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { standalone } = await import("./p5-standalone.mjs");
  await standalone(process.argv[2], (await import(import.meta.url)).default, "p5-facts");
}
