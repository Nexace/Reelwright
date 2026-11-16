// node tools/selfcheck/p5-motion.mjs [fixture…] — the Phase 11 P5 browser modules (tools/p5-camera.js, p5-time.js, p5-morph.js, p5-doodle.js,
// p5-text.js, p5-media.js) are pure functions of t. Same harness as tools/selfcheck/motion.mjs, fixtures in tools/selfcheck/p5/<name>.mjs
// (export default { scripts, dur, film, check?, vo?, assets?(dir), renderers?, hfNoise? }): each film is rendered in pvk (file:// page,
// window.render(t)) and hyperframes (the producer's file server, window.__hf.seek(t)); page A seeks 12 times forward, page B (a fresh
// browser) the same times shuffled; every screenshot must match (pvk byte for byte, hyperframes within its raster noise) and the frames
// must move. check(page) runs in page A (pvk) after load: assertions on the module's pure parts. vo = window.VO; assets copies files next
// to the page; renderers narrows the list (a fixture says why).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";
import { copyKit } from "../kit_files.mjs";
import { createFileServer } from "@hyperframes/producer";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const FIX = path.join(ROOT, "tools", "selfcheck", "p5");
const W = 640, H = 360, N = 12;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p5-"));
const url = (rel) => pathToFileURL(path.join(ROOT, ...rel.split("/"))).href;
const kitPath = (rel) => "kit/" + rel.replace(/^(tools|vendor)\//, "");   // tools/x.js → kit/x.js, vendor/lib/f → kit/lib/f

const STYLE = `<style>body{margin:0;background:#f6f4ef}#stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;
background:#f6f4ef;color:#1d1b16;font:600 40px Arial,sans-serif}#stage div{position:absolute}
.box{width:80px;height:80px;background:#36c;border-radius:10px}.dot{width:30px;height:30px;border-radius:50%;background:#e33}
.scene{left:0;top:0;width:${W}px;height:${H}px}.a{background:#36c}.b{background:#e0a030}.c{background:#2f9e6b}</style>`;

function pages(name, fx) {
  const data = `<script>window.PROJECT = { fps: 30, width: ${W}, height: ${H}, speechEnd: ${fx.dur}, tail: 0 }; window.VO = ${JSON.stringify(fx.vo || {})}; window.MUSIC = {};</script>`;
  const body = `<script>'use strict'; const S = KIT.stage;\n${fx.film}\n</script>`;
  const scripts = ["tools/engine.js", ...fx.scripts];
  const pvk = path.join(tmp, name, "film"), hf = path.join(tmp, name, "hf");
  fs.mkdirSync(pvk, { recursive: true }); fs.mkdirSync(hf, { recursive: true });
  fs.writeFileSync(path.join(pvk, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${url("tools/kit.css")}">${STYLE}</head>` +
    `<body><div id="stage"></div>${data}${scripts.map((s) => `<script src="${url(s)}"></script>`).join("")}${body}</body></html>`);
  copyKit(hf);
  if (fx.assets) { fx.assets(pvk); fx.assets(hf); }
  fs.writeFileSync(path.join(hf, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="kit/kit.css">${STYLE}</head>` +
    `<body><div id="root" data-composition-id="main" data-width="${W}" data-height="${H}"><div id="stage"></div></div>${data}` +
    `${scripts.map((s) => `<script src="${kitPath(s)}"></script>`).join("")}${body}</body></html>`);
  return { pvk: path.join(pvk, "index.html"), hyperframes: path.join(hf, "index.html") };
}

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);
const closers = [];
async function shoot(file, renderer, order, check) {
  const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  try {
    const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    const server = renderer === "pvk" ? null : await createFileServer({ projectDir: path.dirname(file), fps: 30 });
    closers.push(() => server && server.close());
    await p.goto(server ? server.url + "/index.html" : pathToFileURL(file).href);
    if (renderer === "pvk") assert.ok(await p.evaluate(() => window.READY), "READY was false: " + errs.join("; "));
    else {   // poll from node: the HyperFrames runtime takes over the page's timers, so page.waitForFunction never fires
      const ready = () => p.evaluate(() => !!window.__hf && typeof window.__hf.seek === "function" && window.__hf.duration > 0);
      for (let i = 0; !(await ready()); i++) { assert.ok(i < 300, "HyperFrames runtime never became ready: " + errs.join("; ")); await new Promise((r) => setTimeout(r, 100)); }
    }
    assert.ok(await p.evaluate(() => window.READY), "READY was false: " + errs.join("; "));
    if (check) await check(p);
    const out = {};
    for (const t of order) {
      if (renderer === "pvk") await p.evaluate((t) => window.render(t), t);
      else await p.evaluate(async (t) => { window.__hf.seek(t); await window.__hfWaitForSeekCompletion?.(); }, t);
      const png = await p.screenshot({ type: "png" });
      out[t] = { sha: sha(png), png };
    }
    assert.deepEqual(errs, [], `page errors in ${renderer}`);
    return out;
  } finally { await browser.close(); while (closers.length) closers.pop()(); }
}
// pixels off by more than NOISE/255 between two screenshots (decoded in a page: no image library in the repo)
const NOISE = 2, MAX_PIXELS = 64;   // .github/framediff.py: HyperFrames' software-raster noise on moving layers
let cmp;
async function offPixels(x, y) {
  cmp ||= await (await launch()).newPage();
  return cmp.evaluate(async ([x, y, n]) => {
    const px = async (b64) => { const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
      const c = new OffscreenCanvas(im.width, im.height), g = c.getContext("2d"); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
    const [a, b] = [await px(x), await px(y)];
    let off = 0;
    for (let i = 0; i < a.length; i += 4) if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > n) off++;
    return off;
  }, [x.toString("base64"), y.toString("base64"), NOISE]);
}

const only = process.argv.slice(2);
const names = fs.readdirSync(FIX).filter((f) => f.endsWith(".mjs")).map((f) => f.slice(0, -4)).filter((n) => !only.length || only.includes(n)).sort();
assert.ok(names.length, "no fixtures in tools/selfcheck/p5/");
let bad = 0;
try {
  for (const name of names) {
    const fx = (await import(pathToFileURL(path.join(FIX, name + ".mjs")).href)).default;
    const files = pages(name, fx);
    const times = Array.from({ length: N }, (_, i) => +(fx.dur * i / (N - 1)).toFixed(4));
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const shuffled = times.slice().sort(() => rnd() - 0.5);
    for (const renderer of fx.renderers || ["pvk", "hyperframes"]) {
      const a = await shoot(files[renderer], renderer, times, renderer === "pvk" && fx.check), b = await shoot(files[renderer], renderer, shuffled);
      // pvk re-rasters every frame (engine.js), so it must be byte-identical; hyperframes within its raster noise
      const diff = [], noisy = [];
      for (const t of times.filter((t) => a[t].sha !== b[t].sha)) {
        const off = renderer === "pvk" ? Infinity : await offPixels(a[t].png, b[t].png);
        // a fixture may state a larger HyperFrames limit for frames in a window (fx.hfNoise: { px, at: [t0, t1], why })
        const lim = fx.hfNoise && t >= fx.hfNoise.at[0] && t <= fx.hfNoise.at[1] ? fx.hfNoise.px : MAX_PIXELS;
        (off > lim ? diff : noisy).push(off === Infinity ? t : `${t} (${off} px${lim !== MAX_PIXELS ? ` ≤ ${lim}: ${fx.hfNoise.why}` : ""})`);
      }
      const moving = new Set(times.map((t) => a[t].sha)).size, ok = !diff.length && moving >= N / 2;
      if (!ok) bad++;
      console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(12)} ${renderer.padEnd(11)} ${N - diff.length - noisy.length}/${N} identical` +
        (noisy.length ? `, ${noisy.length} within raster noise (t = ${noisy.join(", ")})` : "") + `, ${moving} distinct frames` +
        (diff.length ? `; DIFFER at t = ${diff.join(", ")}` : "") + (moving < N / 2 ? "; barely moves (fixture broken?)" : ""));
    }
  }
} finally {
  if (cmp) await cmp.context().browser().close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (bad) { console.error(`p5 motion self-check: ${bad} failed`); process.exit(1); }
console.log("p5 motion self-check: every fixture deterministic under shuffled seeks in both renderers");
