// node tools/selfcheck/p8-lottie.mjs — Lottie beyond the one shape fixture: six fixtures made here (mask, track matte, gradient fill, image asset,
// text layer, expression) each give identical pixels when seeked forward in one browser and shuffled in another, change over time, and log
// no error (vendor/lottie, goToAndStop, the way KIT.lottie seeks). And dotLottie: a .lottie zip (v2 a/ i/ layout and v1 animations/ images/,
// deflated and stored) unzips into JSON with its image inlined, `reelwright lottie` writes it, and bad files fail with a reason. Offline.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";
import { readDotLottie, readZip, writeZip, crc32 } from "../dotlottie.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const kf = (a, b, t1 = 60) => ({ a: 1, k: [{ t: 0, s: a, i: { x: [0.5], y: [1] }, o: { x: [0.5], y: [0] } }, { t: t1, s: b }] });
const st = (k) => ({ a: 0, k });
const tr = { ty: "tr", p: st([0, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100) };
const ks = (o = {}) => ({ o: st(100), r: st(0), p: st([100, 60, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), ...o });
const layer = (o) => ({ ddd: 0, ind: 1, ty: 4, nm: "l", sr: 1, ao: 0, ip: 0, op: 60, st: 0, bm: 0, ks: ks(), ...o });
const rect = (w, h, col) => ({ ty: "gr", it: [{ ty: "rc", p: st([0, 0]), s: st([w, h]), r: st(0) }, { ty: "fl", c: st(col), o: st(100) }, tr] });
const comp = (layers, extra = {}) => ({ v: "5.7.0", fr: 30, ip: 0, op: 60, w: 200, h: 120, ddd: 0, assets: [], layers, ...extra });
const square = (x0, y0, x1, y1) => ({ i: [[0, 0], [0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0], [0, 0]], v: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], c: true });
const ellipse = (s) => ({ ty: "gr", it: [{ ty: "el", p: st([0, 0]), s }, { ty: "fl", c: st([1, 1, 1, 1]), o: st(100) }, tr] });

// a 16x16 two-colour PNG, built here (no third-party file)
const png = (() => {
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length); b.write(t, 4); d.copy(b, 8); b.writeUInt32BE(crc32(Buffer.concat([Buffer.from(t), d])), 8 + d.length); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(16, 0); ihdr.writeUInt32BE(16, 4); ihdr[8] = 8; ihdr[9] = 2;
  const rows = Buffer.alloc(16 * (1 + 48)); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const o = y * 49 + 1 + x * 3; const a = (x < 8) === (y < 8); rows[o] = a ? 230 : 20; rows[o + 1] = a ? 60 : 160; rows[o + 2] = a ? 40 : 220; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
})();

const FIX = {
  mask: comp([layer({ shapes: [rect(180, 100, [0.9, 0.3, 0.2, 1])], ks: ks({ p: st([100, 60, 0]) }),
    masksProperties: [{ inv: false, mode: "a", pt: { a: 1, k: [{ t: 0, s: [square(-80, -40, -20, 20)], i: { x: 0.5, y: 1 }, o: { x: 0.5, y: 0 } }, { t: 60, s: [square(20, -10, 80, 50)] }] }, o: st(100), x: st(0), nm: "m" }] })]),
  matte: comp([layer({ ind: 1, td: 1, shapes: [ellipse(kf([10, 10], [120, 120]))] }), layer({ ind: 2, tt: 1, shapes: [rect(200, 120, [0.2, 0.6, 0.9, 1])] })]),
  gradient: comp([layer({ shapes: [{ ty: "gr", it: [{ ty: "rc", p: st([0, 0]), s: st([120, 80]), r: st(10) },
    { ty: "gf", o: st(100), r: 1, g: { p: 3, k: st([0, 1, 0, 0, 0.5, 0, 1, 0, 1, 0, 0, 1]) }, s: st([-60, 0]), e: st([60, 0]), t: 1 }, tr] }], ks: ks({ r: kf([0], [180]) }) })]),
  image: comp([layer({ ty: 2, refId: "img_0", ks: ks({ s: kf([100, 100, 100], [400, 400, 100]), a: st([8, 8, 0]) }) })],
    { assets: [{ id: "img_0", w: 16, h: 16, u: "", p: "data:image/png;base64," + png.toString("base64"), e: 1 }] }),
  text: comp([layer({ ty: 5, ks: ks({ p: kf([20, 70, 0], [90, 70, 0]) }), t: { d: { k: [{ s: { s: 40, f: "Arial", t: "Hello", j: 0, tr: 0, lh: 48, ls: 0, fc: [0.9, 0.2, 0.3] }, t: 0 }] }, p: {}, m: { g: 1, a: st([0, 0]) }, a: [] } })],
    { fonts: { list: [{ fName: "Arial", fFamily: "Arial", fStyle: "Regular", ascent: 71.9 }] } }),
  expression: comp([layer({ shapes: [rect(60, 60, [0.3, 0.8, 0.4, 1])], ks: ks({ r: { a: 0, k: 0, x: "var $bm_rt;\n$bm_rt = time * 120;" }, p: { a: 0, k: [100, 60, 0], x: "var $bm_rt;\n$bm_rt = [100 + Math.sin(time * 3) * 50, 60];" } }) })]),
};
const times = Array.from({ length: 8 }, (_, i) => Math.round(i * 59 / 7));
let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
const shuffled = times.slice().sort(() => rnd() - 0.5);
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 12);

async function shoot(browser, data, order) {
  const p = await browser.newPage({ viewport: { width: 200, height: 120 }, deviceScaleFactor: 1 });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await p.setContent(`<body style="margin:0;background:#fff"><div id=c style="width:200px;height:120px"></div></body>`);
  await p.addScriptTag({ path: path.join(ROOT, "vendor", "lottie", "lottie.min.js") });
  await p.evaluate((d) => new Promise((res) => { window.anim = lottie.loadAnimation({ container: document.getElementById("c"), renderer: "svg", loop: false, autoplay: false, animationData: d }); window.anim.addEventListener("DOMLoaded", res); }), data);
  const out = {};
  for (const f of order) { await p.evaluate((f) => window.anim.goToAndStop(f, true), f); out[f] = sha(await p.screenshot({ type: "png" })); }
  await p.close(); assert.ok(!errs.length, errs.join("; "));
  return out;
}
const b = await launch(["--force-device-scale-factor=1"]), tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p8-lottie-"));
try {
  for (const [name, data] of Object.entries(FIX)) {
    const a = await shoot(b, data, times), c = await shoot(b, data, shuffled);
    assert.deepEqual(c, a, `${name}: shuffled seeks gave different pixels`);
    assert.ok(new Set(Object.values(a)).size >= 3, `${name}: the animation did not move (${Object.values(a)})`);
  }
  // dotLottie: v2 layout (deflated) and v1 layout (stored), the image moved out of the JSON into i/ or images/
  const mk = (layout, deflate) => {
    const j = JSON.parse(JSON.stringify(FIX.image)), name = "img_0.png"; Object.assign(j.assets[0], { u: layout === 2 ? "/i/" : "/images/", p: name, e: 0 });
    return writeZip([["manifest.json", Buffer.from(JSON.stringify({ version: "1", animations: [{ id: "pop" }, { id: "other" }] }))],
      [layout === 2 ? "a/pop.json" : "animations/pop.json", Buffer.from(JSON.stringify(j))], [layout === 2 ? "a/other.json" : "animations/other.json", Buffer.from(JSON.stringify(FIX.mask))],
      [(layout === 2 ? "i/" : "images/") + name, png]], { deflate });
  };
  for (const [layout, deflate] of [[2, true], [1, false]]) {
    const r = readDotLottie(mk(layout, deflate));
    assert.deepEqual(r.animations, ["pop", "other"]); assert.equal(r.json.layers.length, 1);
    assert.equal(r.json.assets[0].p, "data:image/png;base64," + png.toString("base64"), "image inlined"); assert.equal(r.json.assets[0].e, 1);
    assert.equal(readDotLottie(mk(layout, deflate), { animation: "other" }).json.layers[0].masksProperties.length, 1);
    const inl = await shoot(b, r.json, [0, 30]); assert.notEqual(inl[0], inl[30], "the unzipped animation plays");
  }
  assert.equal(readZip(mk(2, true)).size, 4);
  assert.throws(() => readDotLottie(Buffer.from("not a zip at all, long enough to scan for a record....")), /not a zip/);
  assert.throws(() => readDotLottie(mk(2, true), { animation: "nope" }), /not in this file \(it has: pop, other\)/);
  assert.throws(() => readDotLottie(writeZip([["x.txt", Buffer.from("hi")]])), /manifest\.json is missing/);
  // the command
  const proj = path.join(tmp, "p"); fs.mkdirSync(proj); fs.writeFileSync(path.join(proj, "project.json"), JSON.stringify({ renderer: "hyperframes" }));
  const f = path.join(tmp, "pop.lottie"); fs.writeFileSync(f, mk(2, true));
  const r = spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "lottie", proj, f], { encoding: "utf8", cwd: ROOT });
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /animations in the file: pop, other/); assert.match(r.stdout, /KIT\.lottie\(el, 'assets\/pop\.json'/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(proj, "hf", "assets", "pop.json"), "utf8")).assets[0].e, 1);
  assert.equal(spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "lottie", proj, path.join(tmp, "nope.lottie")], { encoding: "utf8", cwd: ROOT }).status, 1);
  console.log("p8-lottie self-check: mask, track matte, gradient, image, text and expression fixtures seek-pure and moving; dotLottie v1 and v2 unzip with images inlined; `reelwright lottie` writes the JSON");
} finally { await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
