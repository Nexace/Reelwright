// node tools/selfcheck/tex-offline.mjs — vendored MathJax (vendor/mathjax) typesets with the network blocked: a page loads
// config.js + tex-svg-full.js with every non-file:// request aborted, typesets formulas that pull in several TeX packages, and must
// attempt no request outside the repo. Also checks that tex2svg is synchronous (done before READY can resolve).
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const url = (rel) => pathToFileURL(path.join(ROOT, ...rel.split("/"))).href;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tex-offline-"));
const TEX = ["e^{i\\pi}+1=0", "\\int_0^1 x^2\\,dx=\\tfrac13", "\\sum_{n=1}^{\\infty}\\frac{1}{n^2}=\\frac{\\pi^2}{6}",
  "\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}", "\\sqrt[3]{\\mathbb{R}^n}\\;\\vec v\\cdot\\hat u", "\\color{red}{x}\\boxed{y}\\cancel{z}"];
const page = path.join(tmp, "index.html");
fs.writeFileSync(page, `<!doctype html><meta charset="utf-8"><body><script src="${url("vendor/mathjax/config.js")}"></script>` +
  `<script src="${url("vendor/mathjax/tex-svg-full.js")}"></script><script>window.OUT = ${JSON.stringify(TEX)}.map((t) => ` +
  `{ const s = MathJax.tex2svg(t); document.body.append(s); return s.querySelectorAll('path').length; });</script></body>`);

const browser = await launch(["--allow-file-access-from-files"]);
try {
  const p = await browser.newPage(), outside = [], errs = [];
  await p.route("**/*", (r) => (r.request().url().startsWith("file:") ? r.continue() : (outside.push(r.request().url()), r.abort())));
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(pathToFileURL(page).href);
  const out = await p.evaluate(() => window.OUT);   // set synchronously by the inline script: typesetting needs no await
  await p.evaluate(() => MathJax.startup.promise);
  await new Promise((r) => setTimeout(r, 500));   // give any lazy loader the chance to try
  assert.deepEqual(errs, [], "page errors: " + errs.join("; ") + " | outside: " + outside.join(", "));
  assert.ok(Array.isArray(out) && out.every((n) => n > 0), "every formula typeset synchronously with glyph paths: " + JSON.stringify(out));
  assert.deepEqual(outside, [], "MathJax tried to fetch: " + outside.join(", "));
  console.log(`tex-offline self-check: ${TEX.length} formulas typeset synchronously, 0 requests outside file:// (network blocked)`);
} finally { await browser.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
