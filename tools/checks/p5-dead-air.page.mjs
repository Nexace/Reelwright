// p5-dead-air (WARN): "something changes every second". The film page is screenshotted four times a second; any whole second in which
// all five frames (at s, s+¼, s+½, s+¾, s+1) are byte-identical is dead air, and a run of them is reported as one line. A held
// title is fine for a second: it is a hold of 2 s or more (default; "qa": {"p5-dead-air": {"maxHold": 1}} to tighten) that is flagged.
// Silence with "qa": {"p5-dead-air": false}. Standalone: node tools/checks/p5-dead-air.page.mjs <project>.
import crypto from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { span, safe } from "./p5-util.mjs";

export const kind = "warn";

// hashes of the page at each time, in order (exported so tools/p5-gate.mjs and the self-check share one definition of "a frame")
export async function frameHashes(p, ts) {
  const out = [];
  for (const t of ts) {
    await p.evaluate((t) => window.render(t), t);
    out.push(crypto.createHash("sha1").update(await p.screenshot({ type: "png" })).digest("hex"));
  }
  return out;
}

export default safe("p5-dead-air", async (p, { P } = {}) => {
  const dur = await p.evaluate(() => window.FILM.DUR), cfg = P?.qa?.["p5-dead-air"], maxHold = (cfg && cfg.maxHold) || 2;
  const secs = Math.floor(dur), ts = [];
  for (let s = 0; s <= secs; s++) for (const q of [0, 0.25, 0.5, 0.75]) if (s + q <= dur) ts.push(+(s + q).toFixed(2));
  ts.push(+dur.toFixed(2));
  const h = await frameHashes(p, ts), at = new Map(ts.map((t, i) => [t, h[i]])), lines = [];
  let run = null;
  const flush = () => { if (run && run.b - run.a >= maxHold - 1e-9) lines.push(`dead-air ${span(run.a, run.b)}: nothing changes for ${(run.b - run.a).toFixed(1)} s`); run = null; };
  for (let s = 0; s < dur; s++) {
    const w = [0, 0.25, 0.5, 0.75, 1].map((q) => at.get(+Math.min(s + q, dur).toFixed(2))).filter(Boolean);
    if (new Set(w).size === 1) { if (!run) run = { a: s, b: s + 1 }; else run.b = s + 1; } else flush();
  }
  flush();
  return lines;
});

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { standalone } = await import("./p5-standalone.mjs");
  await standalone(process.argv[2], (await import(import.meta.url)).default, "p5-dead-air");
}
