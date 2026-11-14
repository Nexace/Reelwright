// node tools/selfcheck/p8-fit.mjs — KIT.fit (tools/fit.js): the result fits, one pixel more would not, longer text gives a
// smaller size, repeated calls agree, and no DOM node is added (no reflow). Offline.
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const b = await launch();
try {
  const p = await b.newPage();
  await p.setContent("<body></body>");
  await p.addScriptTag({ path: path.join(ROOT, "tools", "fit.js") });
  const r = await p.evaluate(() => {
    const F = KIT.fit, o = { font: "Arial", maxWidth: 600, maxHeight: 200, max: 120, min: 8 };
    const n0 = document.querySelectorAll("*").length;
    const short = F("Ship it", o), long = F("A much longer headline that has to wrap onto several lines to fit", o);
    const again = F("Ship it", o);
    const over = F.lines("Ship it", { font: "Arial", size: short.size + 1, maxWidth: 600 });   // size+1 still fits width unless capped by max
    const capped = F("Ship it", { ...o, max: short.size + 1 }), one = F("a b c d e f g h i j k l m n o p", { ...o, lines: 1 });
    const wide = F.measure("Ship it", { font: "Arial", size: long.size }).width;
    // the next size up must not fit (unless the cap stopped us)
    const next = F(long.lines.join(" "), { ...o, min: long.size + 1, max: long.size + 1 });
    return { short, long, same: JSON.stringify(short) === JSON.stringify(again), nodes: document.querySelectorAll("*").length - n0,
      narrowW: F.measure("iiii", { font: "Arial", size: 20 }).width < F.measure("WWWW", { font: "Arial", size: 20 }).width, nextFits: next.fits, one, capped, wide, over };
  });
  assert.ok(r.short.fits && r.long.fits, "both fit");
  assert.ok(r.short.size > r.long.size, `short ${r.short.size} should be bigger than long ${r.long.size}`);
  assert.ok(r.long.lines.length > 1, "long text wraps");
  assert.ok(!r.nextFits, "one pixel more must not fit");
  assert.ok(r.one.size >= 8 && (r.one.lines.length === 1 || !r.one.fits), "lines: 1 is honoured or reported");
  assert.ok(r.same && r.nodes === 0, "pure, and no DOM touched");
  assert.ok(r.narrowW, "measure uses real glyph widths");
  console.log(`p8-fit self-check: "Ship it" ${r.short.size}px, long headline ${r.long.size}px in ${r.long.lines.length} lines, +1px does not fit, pure, no reflow`);
} finally { await b.close(); }
