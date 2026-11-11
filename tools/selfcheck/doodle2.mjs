// node tools/selfcheck/doodle2.mjs [--still out.png] — tools/doodle2.js on a blank pvk page (engine.js + doodle.js + doodle2.js, a
// throwaway fixture in the OS temp folder): the ribbon's draw-on ends, taper, noise, score order, drawSVG restore, every glyph,
// matched-move speeds, the load-order error, and a scene (strokes + grain + letters + score + drawSVG + planes) that gives the same
// screenshots whether its frames are seeked forward or shuffled. --still saves the finished scene to look at.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const url = (...p) => pathToFileURL(path.join(ROOT, ...p)).href;
const W = 960, H = 540, DUR = 4;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "doodle2-"));

const FILM = `
const S = KIT.stage, D = KIT.doodle;
const far = KIT.el('div', 'layer', S), near = KIT.el('div', 'layer', S);
const a = D.stroke(near, [[60, 80], [200, 40], [340, 120], [460, 70]], { id: 'a', style: 'pencil', in: 0.2, draw: 1 });
const b = D.stroke(far, [[80, 200], [300, 260], [500, 180]], { id: 'b', style: 'marker', in: 0.6, draw: 0.8, out: 3.4, zoom: (t) => 1 + t * 0.2 });
const c = D.stroke(near, [[520, 300], [600, 250], [700, 330]], { id: 'c', style: 'riso', in: 0.4, draw: 0.6, ease: 'inOut' });
const L = D.letters(near, 'Hand drawn, 2026!', { id: 'L', x: 40, y: 470, size: 90, in: 1, draw: 1.8 });
far.insertAdjacentHTML('beforeend', '<svg id="art" width="300" height="200" viewBox="0 0 300 200" style="position:absolute;left:620px;top:30px">' +
  '<rect x="10" y="10" width="120" height="80" fill="#36c" stroke="#222" stroke-width="4"/>' +
  '<circle cx="210" cy="60" r="40" fill="none" stroke="#e33" stroke-width="6" style="opacity:.9"/>' +
  '<g transform="translate(0 5)"><path d="M20 150 C80 110 160 190 280 140" stroke="#2a2" stroke-width="5" fill="none" pathLength="10"/></g>' +
  '<defs><path id="hidden" d="M0 0 L50 50" stroke="#000"/></defs><polygon points="160,190 200,120 240,190" fill="#fc3"/></svg>' +
  '<svg id="art2" width="200" height="160" viewBox="0 0 100 80" style="position:absolute;left:700px;top:330px">' +
  '<path d="M10 70 L50 10 L90 70 Z" fill="#9c6" stroke="#333" stroke-width="2" transform="rotate(5 50 40)"/><line x1="10" y1="75" x2="90" y2="75" stroke="#333" stroke-width="1.5"/></svg>');
const snap = (svg) => [...svg.querySelectorAll('*')].map((e) => e.getAttributeNames().map((n) => n + '=' + e.getAttribute(n)).join(' '));
const art = document.getElementById('art'), art2 = document.getElementById('art2'), origEls2 = [...art2.querySelectorAll('*')];
window.SNAP = { art: art.outerHTML, art2: snap(art2) };
window.SNAP2 = () => ({ art: art.outerHTML, art2: origEls2.map((e) => e.getAttributeNames().map((n) => n + '=' + e.getAttribute(n)).join(' ')) });
const d1 = D.drawSVG(art, { t0: 0.5, t1: 3 }), d2 = D.drawSVG(art2, { t0: 1, t1: 3.2, style: 'pencil' });
const sc = D.score([
  { id: 'roof', pts: [[100, 330], [160, 280], [220, 330]], deps: ['wall'] },
  { id: 'wall', pts: [[110, 330], [110, 400], [210, 400], [210, 330]] },
  { id: 'door', pts: [[150, 400], [150, 365], [170, 365], [170, 400]], deps: ['wall'], style: 'ballpoint' },
  { id: 'sketch', pts: [[90, 410], [240, 410]], layer: 'construction' },
], 0.3, 3.5, { parent: near, layers: ['main'] });
window.SC = sc;
KIT.start({ dur: ${DUR}, render: (t) => {
  D.planes([{ el: far, z: 2 }, { el: near, z: 1 }], { x: t * 20, y: -t * 4, zoom: 1 + t * 0.05 });
  a.set(t); b.set(t); c.set(t); L.set(t); d1.set(t); d2.set(t); sc.set(t);
} });`;

const STYLE = `<style>:root{--kit-boil:8;--kit-ink:#2b2b30;--kit-accent:#ee4b35}body{margin:0;background:#f6f4ef}#stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;background:#f6f4ef}
.layer{position:absolute;left:0;top:0;width:${W}px;height:${H}px}</style>`;
const page = (scripts, body) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${url("tools", "kit.css")}">${STYLE}</head>` +
  `<body><div id="stage"></div><script>window.PROJECT = { fps: 30, width: ${W}, height: ${H}, speechEnd: ${DUR}, tail: 0 }; window.VO = {}; window.MUSIC = {};</script>` +
  scripts.map((s) => `<script src="${url("tools", s)}"></script>`).join("") + `<script>'use strict';${body}</script></body></html>`;
const file = (name, html) => { const f = path.join(tmp, name); fs.writeFileSync(f, html); return pathToFileURL(f).href; };
const SCENE = file("scene.html", page(["engine.js", "doodle.js", "doodle2.js"], FILM));
const BARE = file("bare.html", page(["engine.js", "doodle2.js"], ""));

let bad = 0;
const check = (name, fn) => fn().then(() => console.log("PASS  " + name), (e) => { bad++; console.log("FAIL  " + name + "\n  " + e.message.split("\n").join("\n  ")); });

async function open(browser, href) {
  const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto(href);
  return { p, errs };
}

const times = [0, 0.35, 0.8, 1.15, 1.6, 2.05, 2.5, 2.95, 3.3, 4];
const shuffled = [2.5, 0.8, 4, 0, 3.3, 1.15, 2.95, 0.35, 2.05, 1.6];
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);
async function shoot(order) {
  const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  try {
    const { p, errs } = await open(browser, SCENE);
    assert.ok(await p.evaluate(() => window.READY), "READY was false");
    const out = {};
    for (const t of order) { await p.evaluate((t) => window.render(t), t); out[t] = await p.screenshot({ type: "png" }); }
    assert.deepEqual(errs, [], "page errors");
    return out;
  } finally { await browser.close(); }
}

try {
  const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  try {
    const { p, errs } = await open(browser, SCENE);
    await p.evaluate(() => window.READY);
    const ev = (fn) => p.evaluate(fn);

    await check("ribbon: p ≥ 1 is exactly the full stroke, p ≤ 0 (and NaN) is ''", async () => {
      const r = await ev(() => { const D = KIT.doodle, pts = [[0, 0], [80, 40], [200, 10]], o = { w: 12, id: 'r' };
        return { full: D.ribbon(pts, o), p1: D.ribbon(pts, { ...o, p: 1 }), p12: D.ribbon(pts, { ...o, p: 1.2 }), p0: D.ribbon(pts, { ...o, p: 0 }),
          neg: D.ribbon(pts, { ...o, p: -1 }), nan: D.ribbon(pts, { ...o, p: NaN }), half: D.ribbon(pts, { ...o, p: 0.5 }) }; });
      assert.ok(r.full.length > 100, "full ribbon is empty");
      assert.equal(r.p1, r.full); assert.equal(r.p12, r.full);
      assert.equal(r.p0, ""); assert.equal(r.neg, ""); assert.equal(r.nan, "");
      assert.ok(r.half && r.half.length < r.full.length, "half-drawn ribbon is not shorter");
    });
    await check("ribbon: tapered ends are narrower than the middle (also at the moving tip)", async () => {
      const w = await ev(() => {
        const widths = (d) => { const P = d.slice(1, -1).split("L").map((s) => s.split(" ").map(Number)), N = P.length / 2;
          return Array.from({ length: N }, (_, i) => Math.hypot(P[i][0] - P[2 * N - 1 - i][0], P[i][1] - P[2 * N - 1 - i][1])); };
        const o = { w: 20, rough: 0, pressure: 0, seed: 1 };
        return [widths(KIT.doodle.ribbon([[0, 0], [300, 0]], o)), widths(KIT.doodle.ribbon([[0, 0], [300, 0]], { ...o, p: 0.6 }))];
      });
      for (const ws of w) {
        const mid = ws[Math.floor(ws.length / 2)];
        assert.ok(ws[0] < mid * 0.5 && ws[ws.length - 1] < mid * 0.5, `ends ${ws[0].toFixed(2)} / ${ws[ws.length - 1].toFixed(2)} vs middle ${mid.toFixed(2)}`);
        assert.ok(Math.abs(mid - 20) < 0.01, "middle width " + mid);
      }
    });
    await check("noise: deterministic, in [0, 1], smooth, not flat; wobble2/boil2 keyed by id and bucket", async () => {
      const r = await ev(() => { const D = KIT.doodle, a = [], b = [];
        for (let i = 0; i < 2000; i++) { const x = (i % 50) * 0.37, y = Math.floor(i / 50) * 0.29; a.push(D.noise(42, x, y)); b.push(D.noise(42, x, y)); }
        let jump = 0; for (let i = 0; i < 500; i++) jump = Math.max(jump, Math.abs(D.noise(7, i * 0.01, 3.3) - D.noise(7, (i + 1) * 0.01, 3.3)));
        const pts = [[0, 0], [10, 0], [20, 0]];
        return { a, b, jump, other: D.noise(43, 1.37, 2.29) !== D.noise(42, 1.37, 2.29),
          w: JSON.stringify(D.wobble2('x', pts)) === JSON.stringify(D.wobble2('x', pts)) && JSON.stringify(D.wobble2('x', pts)) !== JSON.stringify(D.wobble2('y', pts)),
          bo: JSON.stringify(D.boil2('x', pts, 0.1, 1, 8)) === JSON.stringify(D.boil2('x', pts, 0.12, 1, 8)) && JSON.stringify(D.boil2('x', pts, 0.1, 1, 8)) !== JSON.stringify(D.boil2('x', pts, 0.3, 1, 8)) };
      });
      assert.deepEqual(r.a, r.b);
      assert.ok(r.a.every((v) => v >= 0 && v <= 1), "out of [0, 1]");
      assert.ok(Math.max(...r.a) - Math.min(...r.a) > 0.3, "noise is nearly flat");
      assert.ok(r.jump < 0.05, "noise is not smooth: step " + r.jump);
      assert.ok(r.other && r.w && r.bo, JSON.stringify(r));
    });
    await check("grain: one mask per svg, tile periodic, image decoded before the first frame", async () => {
      const r = await ev(async () => {
        const masks = document.querySelectorAll("mask[data-kit-grain]"), img = document.querySelector("mask[data-kit-grain]") && document.querySelector("pattern image");
        const im = new Image(); im.src = img.getAttribute("href"); await im.decode();
        const c = new OffscreenCanvas(im.width, im.height), g = c.getContext("2d"); g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, im.width, im.height).data, A = (x, y) => d[4 * (y * im.width + x) + 3];
        let wrap = 0, step = 0, lo = 255;
        for (let y = 0; y < im.height; y++) { wrap += Math.abs(A(0, y) - A(im.width - 1, y)); step += Math.abs(A(0, y) - A(1, y)); }
        for (let i = 3; i < d.length; i += 4) lo = Math.min(lo, d[i]);
        const svgs = new Set([...masks].map((m) => m.ownerSVGElement));
        return { n: masks.length, svgs: svgs.size, wrap, step, lo, size: im.width, decode: typeof img.decode };
      });
      assert.equal(r.n, r.svgs, "more than one grain mask in an svg");
      assert.equal(r.size, 256);
      assert.ok(r.wrap < 3 * r.step + 50, `tile seam: wrap diff ${r.wrap} vs neighbour diff ${r.step}`);
      assert.ok(r.lo < 200, "the tooth never thins the graphite (min alpha " + r.lo + ")");
      assert.equal(r.decode, "function", "SVGImageElement.decode missing: the first frame may miss the grain");
    });
    await check("score: deps respected, stable order, skipped layer, ends at t1, bad input throws", async () => {
      const r = await ev(() => { const D = KIT.doodle, w = SC.windows, thr = (f) => { try { f(); return ""; } catch (e) { return e.message; } };
        return { w, order: SC.order, cyc: thr(() => D.score([{ id: "a", pts: [[0, 0], [9, 9]], deps: ["b"] }, { id: "b", pts: [[0, 0], [9, 9]], deps: ["a"] }], 0, 1, { parent: KIT.stage })),
          unk: thr(() => D.score([{ id: "a", pts: [[0, 0], [9, 9]], deps: ["zz"] }], 0, 1, { parent: KIT.stage })) }; });
      assert.deepEqual(r.order, ["wall", "roof", "door"]);
      assert.ok(r.w.roof[0] >= r.w.wall[1] && r.w.door[0] >= r.w.wall[1], JSON.stringify(r.w));
      assert.equal(r.w.door[1], 3.5); assert.equal(r.w.wall[0], 0.3); assert.ok(!("sketch" in r.w));
      assert.match(r.cyc, /cycle/); assert.match(r.unk, /unknown "zz"/);
    });
    await check("drawSVG: mid-draw differs, t ≥ t1 restores every original attribute (plain and pen-style)", async () => {
      const r = await ev(async () => { await window.render(1.2); const mid = SNAP2(); await window.render(3.2); const end = SNAP2(); await window.render(0.7); await window.render(9); return { mid, end, again: SNAP2() }; });
      const s0 = await ev(() => SNAP);
      assert.notEqual(r.mid.art, s0.art, "drawSVG did nothing mid-draw");
      assert.equal(r.end.art, s0.art); assert.deepEqual(r.end.art2, s0.art2);
      assert.equal(r.again.art, s0.art); assert.deepEqual(r.again.art2, s0.art2);
    });
    await check("letters: every glyph builds, and draws nothing before `in`", async () => {
      const r = await ev(() => { const D = KIT.doodle, chars = Object.keys(D.glyphs).join(""), box = KIT.el("div", "", KIT.stage);
        const h = D.letters(box, chars + "abc", { id: "all", size: 40, in: 1, draw: 2 });
        const nStrokes = [...chars + "ABC"].reduce((n, ch) => n + D.glyphs[ch][1].length, 0), paths = [...h.el.querySelectorAll("path")];
        h.set(0.5); const before = paths.filter((p) => p.getAttribute("d")).length;
        h.set(2); const mid = paths.filter((p) => p.getAttribute("d")).length;
        h.set(3); const after = paths.filter((p) => (p.getAttribute("d") || "").length > 20).length;
        const adv = [...chars + "ABC"].reduce((n, ch) => n + D.glyphs[ch][0], 0) * 0.04;
        let err = ""; try { D.letters(box, "é", {}); } catch (e) { err = e.message; }
        box.remove();
        return { glyphs: chars.length, nStrokes, paths: paths.length, before, mid, after, width: h.width, adv, err };
      });
      assert.equal(r.glyphs, 45);
      assert.equal(r.paths, r.nStrokes); assert.equal(r.after, r.nStrokes, `${r.nStrokes - r.after} strokes empty when finished`);
      assert.equal(r.before, 0); assert.ok(r.mid > 0 && r.mid < r.nStrokes, "mid-word " + r.mid);
      assert.ok(Math.abs(r.width - r.adv) < 1e-6); assert.match(r.err, /no glyph for "É"/);
    });
    await check("matchedMove: exit and entry speeds match at the cut (finite difference, 1 %)", async () => {
      const r = await ev(() => { const D = KIT.doodle, h = 1e-5, out = [];
        for (const o of [{ dir: "right", exitDist: 400, exitDur: 0.5, entryDur: 0.8 }, { dir: [1, 1], exitDist: 300, exitDur: 0.4, entryDist: 120 }, { dir: "up", exitDist: 200, exitDur: 0.3 }]) {
          const m = D.matchedMove(o), n = (v) => Math.hypot(v[0], v[1]);
          out.push({ vx: (n(m.exit(1)) - n(m.exit(1 - h))) / (h * o.exitDur), ve: (n(m.entry(0)) - n(m.entry(h))) / (h * m.entryDur), v: m.v,
            ends: [n(m.exit(0)), n(m.entry(1)), n(m.exit(1)) - o.exitDist] });
        }
        let err = ""; try { D.matchedMove({ exitDist: 400, exitDur: 0.5, entryDist: 100, entryDur: 0.8 }); } catch (e) { err = e.message; }
        return { out, err };
      });
      for (const { vx, ve, v, ends } of r.out) {
        assert.ok(Math.abs(vx / ve - 1) < 0.01 && Math.abs(vx / v - 1) < 0.01, `exit ${vx} vs entry ${ve} px/s (v ${v})`);
        assert.ok(ends.every((e) => Math.abs(e) < 1e-9), "ends " + ends);
      }
      assert.match(r.err, /drop entryDist/);
    });
    await check("planes + weight: offset ∝ 1/z, scale zoom^(1/z), zoom^-0.35", async () => {
      const r = await ev(() => { const D = KIT.doodle, a = document.createElement("div"), b = document.createElement("div");
        D.planes([{ el: a, z: 1 }, { el: b, z: 4 }], { x: 100, y: 40, zoom: 16 }); return [a.style.transform, b.style.transform, D.weight(2)]; });
      assert.equal(r[0], "translate(-100px, -40px) scale(16)"); assert.equal(r[1], "translate(-25px, -10px) scale(2)");
      assert.ok(Math.abs(r[2] - Math.pow(2, -0.35)) < 1e-12);
    });
    await check("no page errors on the scene", async () => assert.deepEqual(errs, []));
    await check("doodle2.js without doodle.js throws a clear error", async () => {
      const { p: q, errs: e2 } = await open(browser, BARE);
      await q.close();
      assert.ok(e2.some((m) => /load tools\/doodle\.js first/.test(m)), "got: " + e2.join("; "));
    });
    const still = process.argv.indexOf("--still");
    if (still > 0) { await p.evaluate(() => window.render(4)); await p.screenshot({ path: process.argv[still + 1] }); await p.evaluate(() => window.render(1.6)); await p.screenshot({ path: process.argv[still + 1].replace(/\.png$/, "-mid.png") }); }
  } finally { await browser.close(); }

  await check(`scene: ${times.length} seeks forward and shuffled give identical screenshots, and the frames move`, async () => {
    const a = await shoot(times), b = await shoot(shuffled);
    const diff = times.filter((t) => sha(a[t]) !== sha(b[t]));
    assert.deepEqual(diff, [], "screenshots differ at t = " + diff.join(", "));
    const moving = new Set(times.map((t) => sha(a[t]))).size;
    assert.ok(moving >= times.length - 1, `only ${moving} distinct frames`);
  });
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (bad) { console.error(`doodle2 self-check: ${bad} failed`); process.exit(1); }
console.log("doodle2 self-check: all passed");
