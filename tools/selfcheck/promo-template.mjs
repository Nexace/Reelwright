// node tools/selfcheck/promo-template.mjs — row 2b.7 (projects/promo-ink-press, the Ink Press 36 s promo template) and the energy-arc
// side of 2b.9. Offline (music-only: no voiceover, no network). Checks:
//   plan      10 shots, 18 bars = 36 s at 120 BPM; project.json "arc" and hf/content.js ARC say the same; validateArc finds nothing
//   build     `reelwright sched` then `stills` build a copy of the project (sched, theme, kit) and writes a 12-still sheet
//   purity    shuffled seeks of the HyperFrames page (window.__hf.seek, the producer's own file server): the same 12 times forward then shuffled,
//             frames identical within the raster noise of motion.mjs, and moving
//   lints     the aesthetic-rules check (R1 R4 Q11 Q3) and sfx-repeat find nothing on the template itself
//   cuts      every shot starts on a bar: cue() times of the film are all bar times of the grid
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createFileServer } from "@hyperframes/producer";
import { launch } from "../browser.mjs";
import { validateArc, barSeconds } from "../arc.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SRC = path.join(ROOT, "projects", "promo-ink-press");
const P = JSON.parse(fs.readFileSync(path.join(SRC, "project.json"), "utf8"));

// ── plan ──
assert.equal(P.arc.length, 10, "ten shots");
const bars = P.arc.reduce((a, s) => a + s.bars, 0);
assert.equal(bars, 18); assert.equal(bars * barSeconds(P), 36); assert.equal(P.lead + P.tail, 36); assert.deepEqual(P.lines, []);
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(SRC, "hf", "content.js"), "utf8"), ctx);
assert.equal(JSON.stringify(ctx.window.ARC.map(([shot, role, b, energy, hold]) => ({ shot, role, bars: b, energy, hold }))), JSON.stringify(P.arc), "content.js ARC must equal project.json arc");
const v = validateArc(P.arc, { bar: barSeconds(P), dur: 36 });
assert.deepEqual(v.lines, [], "the template's own arc: " + v.lines.join("; "));
assert.equal(Math.max(...v.shots.map((s) => s.energy)), v.shots.find((s) => s.role === "peak").energy, "the peak is the loudest");
assert.ok(!/\b(clickstream|screenshot-\d)\b/.test(JSON.stringify(ctx.window.CONTENT)), "no third-party screenshots shipped");
for (const f of fs.readdirSync(path.join(SRC, "hf"))) assert.ok(!/\.(png|jpe?g|webp|mp4)$/i.test(f), "no media in the template: " + f);
console.log(`  plan: ${P.arc.length} shots, ${bars} bars, arc valid`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "promo-template-"));
const dir = path.join(tmp, "promo");
try {
  // ── build ──
  fs.mkdirSync(path.join(dir, "hf"), { recursive: true });
  fs.copyFileSync(path.join(SRC, "project.json"), path.join(dir, "project.json"));
  for (const f of ["index.html", "film.js", "content.js"]) fs.copyFileSync(path.join(SRC, "hf", f), path.join(dir, "hf", f));
  const sc = spawnSync(process.execPath, ["bin/reelwright.mjs", "sched", dir], { cwd: ROOT, encoding: "utf8" });
  assert.equal(sc.status, 0, sc.stdout + sc.stderr);
  const r = spawnSync(process.execPath, ["bin/reelwright.mjs", "stills", dir], { cwd: ROOT, encoding: "utf8", timeout: 280000 });
  assert.equal(r.status, 0, r.stdout.replace(/.*initSession.*\n/g, "").slice(-1500) + r.stderr.slice(-800));
  assert.ok(fs.existsSync(path.join(dir, "stills", "sheet.jpg")) && fs.readdirSync(path.join(dir, "stills")).filter((f) => /^t\d/.test(f)).length === 12, "12 stills and a sheet");
  console.log("  build: stills + sheet from a fresh copy, offline");

  // ── purity + lints, on the built HyperFrames page ──
  const N = 12, times = Array.from({ length: N }, (_, i) => +(36 * i / (N - 1) - (i === N - 1 ? 0.05 : 0)).toFixed(3));
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, shuffled = times.slice().sort(() => rnd() - 0.5);
  const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);
  const seekAll = async (order, lint) => {
    const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
    const server = await createFileServer({ projectDir: path.join(dir, "hf"), fps: 30 });
    try {
      const p = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
      const errs = []; p.on("pageerror", (e) => errs.push(e.message));
      await p.goto(server.url + "/index.html");
      for (let i = 0; !(await p.evaluate(() => !!window.__hf && typeof window.__hf.seek === "function" && window.__hf.duration > 0)); i++) { assert.ok(i < 300, "HyperFrames never ready: " + errs); await new Promise((r) => setTimeout(r, 100)); }
      const out = {};
      for (const t of order) { await p.evaluate(async (t) => { window.__hf.seek(t); await window.__hfWaitForSeekCompletion?.(); }, t); out[t] = { sha: sha(await p.screenshot({ type: "png" })), png: await p.screenshot({ type: "png" }) }; }
      let found = null;
      if (lint) found = await lint(p);
      assert.deepEqual(errs, [], "page errors");
      return { out, found };
    } finally { await browser.close(); server.close(); }
  };
  const { default: aesthetic } = await import(pathToFileURL(path.join(ROOT, "tools/checks/aesthetic-rules.page.mjs")).href);
  const A = await seekAll(times, (p) => aesthetic(p, { P: { ...P, qa: { "aesthetic-rules": true } } }));
  const B = await seekAll(shuffled);
  const differ = times.filter((t) => A.out[t].sha !== B.out[t].sha);
  const moving = new Set(times.map((t) => A.out[t].sha)).size;
  // frames may differ only by raster noise: compare decoded pixels (no image library in the repo)
  const cmp = await (await launch()).newPage();
  const off = async (x, y) => cmp.evaluate(async ([x, y]) => {
    const px = async (b64) => { const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode(); const c = new OffscreenCanvas(im.width, im.height), g = c.getContext("2d"); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
    const [a, b] = [await px(x), await px(y)]; let n = 0;
    for (let i = 0; i < a.length; i += 4) if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 2) n++;
    return n;
  }, [x.toString("base64"), y.toString("base64")]);
  const bad = [];
  for (const t of differ) { const n = await off(A.out[t].png, B.out[t].png); if (n > 64 * 9) bad.push(`${t} (${n} px)`); }   // 1920x1080: 9x the motion.mjs budget of 64 px at 640x360
  await cmp.context().browser().close();
  assert.deepEqual(bad, [], "shuffled seeks differ beyond raster noise at t = " + bad);
  assert.ok(moving >= N - 2, `the film moves: ${moving} distinct frames of ${N}`);
  console.log(`  purity: ${N - differ.length}/${N} identical under shuffled seeks, ${differ.length} within raster noise, ${moving} distinct frames`);
  assert.deepEqual(A.found, [], "aesthetic-rules on the template: " + A.found);
  console.log("  lints: aesthetic-rules finds nothing on the template");

  // ── cuts on the bar ──
  const film = fs.readFileSync(path.join(SRC, "hf", "film.js"), "utf8");
  assert.ok(/KIT\.bar\(bar\)/.test(film) && !/\bcue\(\s*\d/.test(film), "every shot start comes from KIT.bar, no literal cue times");
  // ── the starter command ──
  const mine = path.join(tmp, "mine"), pr = spawnSync(process.execPath, ["bin/reelwright.mjs", "promo", mine, "My Film"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(pr.status, 0, pr.stderr);
  for (const f of ["project.json", "hf/index.html", "hf/film.js", "hf/content.js"]) assert.ok(fs.existsSync(path.join(mine, f)), "promo copies " + f);
  assert.equal(JSON.parse(fs.readFileSync(path.join(mine, "project.json"), "utf8")).title, "My Film");
  assert.notEqual(spawnSync(process.execPath, ["bin/reelwright.mjs", "promo", mine], { cwd: ROOT }).status, 0, "promo never overwrites");
  const an = spawnSync(process.execPath, ["bin/reelwright.mjs", "arc", mine], { cwd: ROOT, encoding: "utf8" });
  assert.match(an.stdout, /arc ok/, an.stdout);
  console.log("promo-template self-check: Ink Press promo template builds offline, is pure under shuffled seeks and passes its own arc and lints");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
