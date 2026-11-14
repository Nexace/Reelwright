// Shared by tools/selfcheck/p6-*.mjs (a library: running it does nothing). runFixtures(fixtures, label): the shuffled-seek
// harness of tools/selfcheck/motion.mjs for fixtures given as objects { name, scripts, dur, film, check?, hfNoise?,
// files?, style?, scale? }. Each fixture is a small film rendered in both renderers (pvk: file:// page, window.render(t);
// hyperframes: the producer's file server, window.__hf.seek(t)); page A seeks 12 times forward, page B (a fresh browser)
// the same times shuffled; every screenshot must match (pvk byte for byte, hyperframes within the .github/framediff.py
// raster noise) and the frames must move. `files` ({ name: Buffer|string }) are written beside both index.html pages;
// `check(page)` runs in page A of pvk after load.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";
import { copyKit } from "../kit_files.mjs";
import { createFileServer } from "@hyperframes/producer";

export const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const W = 640, H = 360, N = 12;
const url = (rel) => pathToFileURL(path.join(ROOT, ...rel.split("/"))).href;
const kitPath = (rel) => "kit/" + rel.replace(/^(tools|vendor)\//, "");
const BASE = `body{margin:0;background:#f6f4ef}#stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;background:#f6f4ef;color:#1d1b16;font:600 40px Arial,sans-serif}`;
export const STYLE = `<style>${BASE}#stage div{position:absolute}.box{width:80px;height:80px;background:#36c;border-radius:10px}.scene{left:0;top:0;width:${W}px;height:${H}px}.a{background:#36c}.b{background:#e0a030}</style>`;

export const baseStyle = (extra = "") => `<style>${BASE}${extra}</style>`;   // no blanket `#stage div` rule: kit.css decides

export function pages(tmp, fx) {
  const data = `<script>window.PROJECT = { fps: 30, width: ${W}, height: ${H}, speechEnd: ${fx.dur}, tail: 0 }; window.VO = {}; window.MUSIC = {};</script>`;
  const body = `<script>'use strict'; const S = KIT.stage;\n${fx.film}\n</script>`;
  const scripts = ["tools/engine.js", ...fx.scripts];
  const pvk = path.join(tmp, fx.name, "film"), hf = path.join(tmp, fx.name, "hf");
  for (const d of [pvk, hf]) { fs.mkdirSync(d, { recursive: true }); for (const [n, b] of Object.entries(fx.files || {})) fs.writeFileSync(path.join(d, n), b); }
  const style = fx.style || STYLE;
  fs.writeFileSync(path.join(pvk, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${url("tools/kit.css")}">${style}</head>` +
    `<body><div id="stage"></div>${data}${scripts.map((s) => `<script src="${url(s)}"></script>`).join("")}${body}</body></html>`);
  copyKit(hf);
  fs.writeFileSync(path.join(hf, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="kit/kit.css">${style}</head>` +
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
    else {
      const ready = () => p.evaluate(() => !!window.__hf && typeof window.__hf.seek === "function" && window.__hf.duration > 0);
      for (let i = 0; !(await ready()); i++) { assert.ok(i < 300, "HyperFrames runtime never became ready: " + errs.join("; ")); await new Promise((r) => setTimeout(r, 100)); }
    }
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
const NOISE = 2, MAX_PIXELS = 64;
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

export async function runFixtures(fixtures, label) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p6-"));
  let bad = 0;
  try {
    for (const fx of fixtures) {
      const files = pages(tmp, fx);
      const times = Array.from({ length: N }, (_, i) => +(fx.dur * i / (N - 1)).toFixed(4));
      let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      const shuffled = times.slice().sort(() => rnd() - 0.5);
      for (const renderer of ["pvk", "hyperframes"]) {
        const a = await shoot(files[renderer], renderer, times, renderer === "pvk" && fx.check), b = await shoot(files[renderer], renderer, shuffled);
        const diff = [], noisy = [];
        for (const t of times.filter((t) => a[t].sha !== b[t].sha)) {
          const off = renderer === "pvk" ? Infinity : await offPixels(a[t].png, b[t].png);
          const lim = fx.hfNoise && t >= fx.hfNoise.at[0] && t <= fx.hfNoise.at[1] ? fx.hfNoise.px : MAX_PIXELS;
          (off > lim ? diff : noisy).push(off === Infinity ? t : `${t} (${off} px)`);
        }
        const moving = new Set(times.map((t) => a[t].sha)).size, ok = !diff.length && moving >= (fx.minMoving ?? N / 2);
        if (!ok) bad++;
        console.log(`${ok ? "PASS" : "FAIL"}  ${fx.name.padEnd(16)} ${renderer.padEnd(11)} ${N - diff.length - noisy.length}/${N} identical` +
          (noisy.length ? `, ${noisy.length} within raster noise (t = ${noisy.join(", ")})` : "") + `, ${moving} distinct frames` +
          (diff.length ? `; DIFFER at t = ${diff.join(", ")}` : "") + (!ok && !diff.length ? "; barely moves (fixture broken?)" : ""));
      }
    }
  } finally {
    if (cmp) await cmp.context().browser().close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  if (bad) { console.error(`${label}: ${bad} failed`); process.exit(1); }
  console.log(`${label}: every fixture deterministic under shuffled seeks in both renderers`);
}
