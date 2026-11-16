// node tools/selfcheck/rive.mjs — KIT.rive (tools/rive.js over vendor/rive/, @rive-app/canvas): a Rive file driven only by seeking.
// Offline: the fixture .riv is written by tools/selfcheck/fixtures/riv.mjs (a square, four animations, a state machine) and also
// ships as tools/selfcheck/fixtures/sample.riv (`node tools/selfcheck/rive.mjs --write` refreshes it).
//  1. the file parses: artboard, animations, state machine.
//  2. KIT.rive in both renderers: a linear animation and a state machine with a film-time input schedule, 12 seeks forward vs
//     shuffled: identical frames; the square is where the animation / schedule puts it whatever the seek order; the frames move;
//     the page asks for nothing outside the project (no CDN).
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { runFixtures, baseStyle, ROOT } from "./seek-harness.mjs";
import { riv } from "./fixtures/riv.mjs";

const bytes = riv();
const sample = path.join(ROOT, "tools", "selfcheck", "fixtures", "sample.riv");
if (process.argv.includes("--write")) fs.writeFileSync(sample, bytes);
assert.ok(fs.existsSync(sample) && fs.readFileSync(sample).equals(bytes), "fixtures/sample.riv is out of date: node tools/selfcheck/rive.mjs --write");

const style = baseStyle("#stage > .half{width:320px;height:360px;top:0}#stage > .l{left:0}#stage > .r{left:320px}");
const fx = {
  name: "rive", dur: 2, style, files: { "x.riv": bytes }, scripts: ["tools/runtimes.js", "tools/rive.js"],
  film: `
const a = KIT.rive(KIT.el('div', 'half l', S), { src: 'x.riv', animation: 'slide' });
const b = KIT.rive(KIT.el('div', 'half r', S), { src: 'x.riv', stateMachine: 'Machine', inputs: [{ at: 1, name: 'go', fire: true }] });
window.RV = { a, b };
KIT.start({ dur: 2, render: (t) => { a.set(t); b.set(t); } });`,
  check: async (page) => {
    const bad = await page.evaluate(async () => {
      const out = [], as = (c, m) => { if (!c) out.push(m); }, { a, b } = window.RV;
      // mean x of the blue square's pixels on a canvas (null: none)
      const cx = (h) => { const c = h.canvas, g = c.getContext('2d', { willReadFrequently: true }), d = g.getImageData(0, 0, c.width, c.height).data;
        let n = 0, s = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] < 90 && d[i + 2] > 170) { n++; s += (i / 4) % c.width; } return n ? s / n : null; };
      as(a.dur === 2, 'animation length ' + a.dur);
      as(a.artboard.animationCount() === 4 && a.artboard.stateMachineCount() === 1, 'artboard contents');
      a.set(0); const x0 = cx(a); a.set(1); const x1 = cx(a); a.set(2); const x2 = cx(a); a.set(1); const x1b = cx(a);
      as(Math.abs(x0 - 48) < 4 && Math.abs(x2 - 240) < 4 && Math.abs(x1 - 144) < 4, 'slide at 0, 1, 2 s: ' + [x0, x1, x2]);
      as(x1b === x1, 'same time, same pixels (' + x1 + ' then ' + x1b + ')');
      b.set(0.5); const s0 = cx(b); b.set(1.95); const s1 = cx(b); b.set(0.3); const s2 = cx(b); b.set(1.95); const s3 = cx(b);
      as(Math.abs(s0 - 48) < 4 && Math.abs(s1 - 240) < 4, 'state machine before / after the trigger: ' + [s0, s1]);
      as(s2 === s0, 'seeking back replays from the start: ' + s0 + ' ' + s2);
      as(s3 === s1, 'seeking forward again lands on the same frame: ' + s1 + ' ' + s3);
      const ext = performance.getEntriesByType('resource').filter((e) => /^https?:/.test(e.name) && !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(e.name));
      as(!ext.length, 'the page asked the network for ' + ext.map((e) => e.name).join());
      return out;
    });
    if (bad.length) throw new Error("rive check: " + bad.join("; "));
  },
};
await runFixtures([fx], "rive");
