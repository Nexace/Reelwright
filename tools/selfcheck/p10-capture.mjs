// node tools/selfcheck/p10-capture.mjs — row 2b.13 (tools/capture_trio.mjs). Offline: captures a local file:// page with a tinted
// body, a tinted section and a rounded blue card at a known box, then checks the trio: full@2x.png is 2x the page, layout.json holds
// the card's exact box (page CSS px) and document order, and the card's cutout is 2x its box, opaque in the middle, TRANSPARENT in the
// rounded corner and in the pixels where the body/section tint would have shown, so only the element survives.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";
import { captureTrio } from "../capture_trio.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p10-capture-"));
const page = path.join(tmp, "page.html"), out = path.join(tmp, "out");
fs.writeFileSync(page, `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#dde;font:16px Arial}
section{position:relative;height:700px;background:#eed;box-shadow:0 0 30px #0004}
.card{position:absolute;left:100px;top:200px;width:300px;height:120px;border-radius:40px;background:#36c;color:#fff;box-shadow:0 8px 30px #0008;padding:20px;box-sizing:border-box}
h2{position:absolute;left:100px;top:60px;margin:0;font-size:32px}</style>
<section id="hero"><h2>Hello</h2><div class="card" id="chip">Floating chip</div></section>`);
try {
  const L = await captureTrio(pathToFileURL(page).href, out, { width: 800 });
  const card = L.elements.find((e) => e.name === "chip");
  assert.ok(card, "the card is in layout.json: " + L.elements.map((e) => e.name));
  assert.deepEqual([card.x, card.y, card.w, card.h, card.radius], [100, 200, 300, 120, 40]);
  assert.ok(L.elements.some((e) => e.name === "hero") && L.elements.findIndex((e) => e.name === "hero") < L.elements.indexOf(card), "document order: the section before the card");
  assert.equal(L.scale, 2); assert.ok(L.height >= 700);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, "layout.json"), "utf8")), L);

  const b = await launch(); const px = await b.newPage();
  try {
    const read = async (f) => px.evaluate(async (b64) => {
      const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
      const c = new OffscreenCanvas(im.width, im.height), g = c.getContext("2d"); g.drawImage(im, 0, 0);
      const a = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data);
      return { w: im.width, h: im.height, mid: a(im.width >> 1, im.height >> 1), corner: a(1, 1), edge: a(im.width >> 1, 2), under: a(im.width >> 1, im.height - 1), outside: a(im.width + 0 > 10 ? 3 : 0, im.height >> 1) };
    }, fs.readFileSync(f).toString("base64"));
    const full = await read(path.join(out, "full@2x.png"));
    assert.equal(full.w, 1600, "full page is 2x the 800 px width"); assert.ok(full.h >= 1400);
    const cut = await read(path.join(out, card.cutout));
    assert.deepEqual([cut.w, cut.h], [600, 240], "cutout is the card at 2x");
    assert.equal(cut.mid[3], 255, "opaque in the middle"); assert.ok(cut.mid[2] > 150 && cut.mid[0] < 100, "the card's blue: " + cut.mid);
    assert.ok(cut.corner[3] < 40, "transparent in the rounded corner (only the card's own faint shadow, no body/section tint behind it): " + cut.corner);
    // the shadow and the section's own shadow lie outside the card's box: the cutout is only the box, and inside it only the card
    assert.ok(cut.edge[3] === 255 || cut.edge[3] === 0, "the edge row is the card or nothing: " + cut.edge);
    const hero = L.elements.find((e) => e.name === "hero"), heroCut = await read(path.join(out, hero.cutout));
    assert.deepEqual([heroCut.w, heroCut.h], [1600, 1400]);
    assert.equal(heroCut.corner[3], 255, "a section keeps its own background (it is the cut element), only ancestors lose theirs");
  } finally { await b.close(); }
  console.log(`p10-capture self-check: full@2x.png, ${L.elements.length} cutouts and layout.json pass (card box, 2x size, transparent corner)`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
