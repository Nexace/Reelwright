// node tools/selfcheck/text-split.mjs — KIT.text (tools/text-split.js): split into lines/words/glyphs, masked reveals,
// tracking animation and variable-font axes. Two passes over the fixture tools/selfcheck/remotion-kit/textsplit.mjs:
//   1. the p9 harness (tools/selfcheck/remotion-kit.mjs textsplit): 12 times forward and the same times shuffled, in pvk
//      and HyperFrames, every screenshot identical — the reveal is seek-pure in both renderers;
//   2. this file builds the same fixture pages and runs the fixture's own check on each renderer: exact line/glyph boxes
//      against the canvas, the mask geometry, axes validation, the canvas path and the pixel assertions (the text region
//      is empty at t = 0, partly inked mid-wipe, full at the end). The harness only runs check in pvk, hence the second pass.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";
import { copyKit } from "../kit_files.mjs";
import { createFileServer } from "@hyperframes/producer";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const FIXTURE = path.join(ROOT, "tools/selfcheck/remotion-kit/textsplit.mjs");
const W = 640, H = 360, tmp = fs.mkdtempSync(path.join(os.tmpdir(), "textsplit-"));

// ── 1. the p9 harness: shuffled seeks in both renderers ──
const r = spawnSync(process.execPath, ["tools/selfcheck/remotion-kit.mjs", "textsplit"], { cwd: ROOT, encoding: "utf8" });
assert.equal(r.status, 0, "the p9 harness failed:\n" + r.stdout + r.stderr);
assert.match(r.stdout, /PASS +textsplit +pvk/); assert.match(r.stdout, /PASS +textsplit +hyperframes/);

// ── 2. the fixture's check in both renderers (its pixels included) ──
const fx = (await import(pathToFileURL(FIXTURE).href)).default;
const STYLE = `<style>body{margin:0;background:#f6f4ef}#stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;
background:#f6f4ef;color:#1d1b16;font:600 40px Arial,sans-serif}#stage div{position:absolute}
.box{width:80px;height:80px;background:#36c;border-radius:10px}.dot{width:30px;height:30px;border-radius:50%;background:#e33}
.scene{left:0;top:0;width:${W}px;height:${H}px}.a{background:#36c}.b{background:#e0a030}.c{background:#2f9e6b}</style>`;
const url = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const kitPath = (rel) => "kit/" + rel.replace(/^tools\//, "");
const data = `<script>window.PROJECT = { fps: 30, width: ${W}, height: ${H}, speechEnd: ${fx.dur}, tail: 0 }; window.VO = {}; window.MUSIC = {};</script>`;
const body = `<script>'use strict'; const S = KIT.stage;\n${fx.film}\n</script>`;
const scripts = ["tools/engine.js", ...fx.scripts];

function pages() {
  const pvk = path.join(tmp, "film"), hf = path.join(tmp, "hf");
  fs.mkdirSync(pvk, { recursive: true }); fs.mkdirSync(hf, { recursive: true });
  fs.writeFileSync(path.join(pvk, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${url("tools/kit.css")}">${STYLE}</head>` +
    `<body><div id="stage"></div>${data}${scripts.map((s) => `<script src="${url(s)}"></script>`).join("")}${body}</body></html>`);
  copyKit(hf);
  fs.writeFileSync(path.join(hf, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="kit/kit.css">${STYLE}</head>` +
    `<body><div id="root" data-composition-id="main" data-width="${W}" data-height="${H}"><div id="stage"></div></div>${data}` +
    `${scripts.map((s) => `<script src="${kitPath(s)}"></script>`).join("")}${body}</body></html>`);
  for (const dir of [pvk, hf]) fx.assets(dir);
  return { pvk: path.join(pvk, "index.html"), hyperframes: path.join(hf, "index.html") };
}

const files = pages();
try {
  for (const renderer of ["pvk", "hyperframes"]) {
    const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
    try {
      const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
      const errs = [];
      p.on("pageerror", (e) => errs.push(e.message));
      p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
      const server = renderer === "pvk" ? null : await createFileServer({ projectDir: path.dirname(files.hyperframes), fps: 30 });
      try {
        await p.goto(server ? server.url + "/index.html" : pathToFileURL(files.pvk).href);
        if (renderer === "pvk") assert.ok(await p.evaluate(() => window.READY), "READY was false: " + errs.join("; "));
        else {
          const ready = () => p.evaluate(() => !!window.__hf && typeof window.__hf.seek === "function" && window.__hf.duration > 0);
          for (let i = 0; !(await ready()); i++) { assert.ok(i < 300, "HyperFrames never became ready: " + errs.join("; ")); await new Promise((r) => setTimeout(r, 100)); }
        }
        assert.ok(await p.evaluate(() => window.READY), "READY was false: " + errs.join("; "));
        await fx.check(p);   // geometry, axes, canvas, pixels
        assert.deepEqual(errs, [], `page errors in ${renderer}`);
      } finally { if (server) server.close(); }
      console.log(`PASS  text-split  ${renderer}`);
    } finally { await browser.close(); }
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log("text-split self-check: split geometry, masked reveals, tracking, axes and pixels in pvk and hyperframes");
