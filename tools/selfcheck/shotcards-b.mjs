// node tools/selfcheck/shotcards-b.mjs [module…] — Shotcards B (tools/shotcards/{typography,ui-entrance,data,effects,interaction}.js, envelope.mjs).
// Each fixture tools/selfcheck/shotcards-b/<module>.mjs exports { scripts, build }; build is film code that calls card(name, box => helper(...))
// once per helper. For every card the harness records the card's whole DOM (outerHTML: every style and attribute the helper wrote) at 12 times
// forward, the same times shuffled in the same page, and shuffled in a fresh browser page: all three must match (pure function of t). The same is
// done with the kit loaded the HyperFrames way (kit/shotcards/…, the producer's file server) and that DOM must equal the pvk one. Also: the frames
// must move (>= 3 distinct states), no non-finite number may be formatted into a style (an invalid CSS value is dropped silently, so the DOM alone
// would hide it), no page error, no network. envelope.mjs is run on a synthetic tone when ffmpeg is installed.
// SHEET=<dir> also writes a PNG of every card at 4 times (for looking at; not a check).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";
import { copyKit } from "../kit_files.mjs";
import { createFileServer } from "@hyperframes/producer";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const FIX = path.join(ROOT, "tools", "selfcheck", "shotcards-b");
const W = 960, H = 540, N = 12;
const url = (rel) => pathToFileURL(path.join(ROOT, ...rel.split("/"))).href;
const only = process.argv.slice(2);
const names = fs.readdirSync(FIX).filter((f) => f.endsWith(".mjs")).map((f) => f.slice(0, -4)).filter((n) => !only.length || only.includes(n)).sort();
assert.ok(names.length, "no fixtures in tools/selfcheck/shotcards-b/");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "shotcards-b-"));

// pvk: a file:// page loading the repo's tools/*.js. hyperframes: a composition folder with the kit copied in (kit/…), served by the producer's
// own file server, as a real HyperFrames film loads it. copyKit copies tools/*.js only; tools/shotcards/ travels as kit/shotcards/ (see the
// tools/kit_files.mjs patch in the Phase 11 P3 report), which is what the cpSync below does.
function page(name, fx, renderer) {
  const data = `<script>window.PROJECT = { fps: 30, width: ${W}, height: ${H}, speechEnd: 8, tail: 0 }; window.VO = {}; window.MUSIC = {};</script>`;
  const boot = `<script>'use strict'; const S = KIT.stage, C = KIT.shotcards; window.CARDS = {}; window.__nan = 0;
/* an invalid CSS value is dropped silently, so a NaN would never reach outerHTML: count every non-finite number the helpers format */
const __tf = Number.prototype.toFixed; Number.prototype.toFixed = function (d) { if (!Number.isFinite(+this)) window.__nan++; return __tf.call(this, d); };
function card(name, make) { const box = KIT.el('div', '', S); KIT.css(box, { left: '0px', top: '0px', width: '${W}px', height: '${H}px' }); window.CARDS[name] = Object.assign({ root: box }, make(box)); box.style.display = 'none'; }   /* built visible: helpers measure text */</script>`;
  const STYLE = "<style>body{margin:0;background:#0f1115}#stage{font:600 40px Arial,sans-serif}</style>";
  const list = ["tools/engine.js", ...fx.scripts];
  if (renderer === "pvk") {
    const file = path.join(tmp, name + ".html");
    fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${url("tools/kit.css")}">${STYLE}</head>` +
      `<body><div id="stage"></div>${data}${list.map((s) => `<script src="${url(s)}"></script>`).join("")}${boot}<script>${fx.build}</script></body></html>`);
    return file;
  }
  const hf = path.join(tmp, name + "-hf");
  fs.mkdirSync(hf, { recursive: true });
  copyKit(hf);
  fs.cpSync(path.join(ROOT, "tools", "shotcards"), path.join(hf, "kit", "shotcards"), { recursive: true });
  fs.writeFileSync(path.join(hf, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="kit/kit.css">${STYLE}</head>` +
    `<body><div id="root" data-composition-id="main" data-width="${W}" data-height="${H}"><div id="stage"></div></div>${data}` +
    `${list.map((s) => `<script src="kit/${s.replace(/^tools\//, "")}"></script>`).join("")}${boot}<script>${fx.build}</script></body></html>`);
  return path.join(hf, "index.html");
}

// record every card's DOM at the given times, in the given order (cards are shown one at a time: the others stay display:none)
async function record(browser, file, times, shots, renderer, tag) {
  const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const server = renderer === "pvk" ? null : await createFileServer({ projectDir: path.dirname(file), fps: 30 });
  const errs = [], net = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  p.on("request", (r) => { const u = r.url(); if (!/^(file|data|blob):/.test(u) && !(server && u.startsWith(server.url))) net.push(u); });
  try {
    await p.goto(server ? server.url + "/index.html" : pathToFileURL(file).href);
    await p.waitForFunction(() => window.CARDS && Object.keys(window.CARDS).length > 0, null, { timeout: 15000 });
    const cards = await p.evaluate(() => Object.fromEntries(Object.entries(window.CARDS).map(([k, c]) => [k, c.end])));
    const out = {};
    for (const [name, end] of Object.entries(cards)) {
      out[name] = { end, snap: {} };
      const span = Math.max(end ?? 2, 0.5) + 0.3;
      for (const f of times) {
        const t = +(span * f).toFixed(4);
        out[name].snap[f] = await p.evaluate(([n, t]) => { const c = window.CARDS[n]; for (const k in window.CARDS) window.CARDS[k].root.style.display = k === n ? "block" : "none"; c.set(t); return c.root.outerHTML; }, [name, t]);
        const nan = await p.evaluate(() => { const v = window.__nan; window.__nan = 0; return v; });
        if (nan) out[name].nan = (out[name].nan || 0) + nan;
        if (shots && [0, 3, 6, 9].includes(times.indexOf(f))) fs.writeFileSync(path.join(shots, `${tag}-${name}-${times.indexOf(f)}.png`), await p.screenshot({ type: "png" }));
      }
    }
    return { out, errs, net };
  } finally { await p.close(); if (server) await server.close(); }
}

let bad = 0;
const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
try {
  const shots = process.env.SHEET ? path.resolve(process.env.SHEET) : null;
  if (shots) fs.mkdirSync(shots, { recursive: true });
  for (const name of names) {
    const fx = (await import(pathToFileURL(path.join(FIX, name + ".mjs")).href)).default;
    const fwd = Array.from({ length: N }, (_, i) => i / (N - 1));
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const shuf = fwd.slice().sort(() => rnd() - 0.5), run = {};
    for (const renderer of ["pvk", "hyperframes"]) {
      const file = page(name, fx, renderer);
      run[renderer] = [await record(browser, file, fwd, renderer === "pvk" ? shots : null, renderer, name), await record(browser, file, shuf, null, renderer, name)];
    }
    const [A, B] = run.pvk, [HA, HB] = run.hyperframes;
    for (const e of [...A.errs, ...B.errs, ...HA.errs, ...HB.errs]) { console.log(`FAIL  ${name}: page error: ${e}`); bad++; }
    for (const u of [...A.net, ...B.net, ...HA.net, ...HB.net]) { console.log(`FAIL  ${name}: network request ${u}`); bad++; }
    for (const card of Object.keys(A.out)) {
      const a = A.out[card].snap, b = B.out[card].snap;
      const diff = fwd.filter((f) => a[f] !== b[f]), distinct = new Set(fwd.map((f) => a[f])).size;
      const hf = fwd.filter((f) => HA.out[card].snap[f] !== a[f] || HB.out[card].snap[f] !== a[f]);   // same DOM when loaded the HyperFrames way
      const nan = (A.out[card].nan || 0) + (HA.out[card].nan || 0), junk = fwd.filter((f) => /NaN|undefined|Infinity/.test(a[f]));
      const ok = !diff.length && distinct >= 3 && !junk.length && !nan && !hf.length;
      if (!ok) bad++;
      console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(12)} ${card.padEnd(26)} ${N - diff.length}/${N} identical under shuffled seeks (pvk, hyperframes), ${distinct} distinct frames` +
        (nan || junk.length ? `; non-finite number formatted or in the DOM (${nan})` : "") + (hf.length ? `; HyperFrames DOM differs at ${hf.map((f) => f.toFixed(2))}` : "") +
        (diff.length ? `; DIFFER at ${diff.map((f) => f.toFixed(2))}` : "") + (distinct < 3 ? "; barely moves" : ""));
    }
  }
  // envelope.mjs: silence for 1 s, then a loud tone for 1 s, at 30 fps
  if (!only.length || only.includes("interaction")) {
    const tone = path.join(tmp, "tone.wav");
    if (spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "aevalsrc=0.8*sin(2*PI*220*t)*gte(t\\,1):d=2:s=16000", tone]).status !== 0) console.log("SKIP  envelope.mjs: ffmpeg not installed");
    else {
      const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "shotcards", "envelope.mjs"), tone, "--fps", "30"], { encoding: "utf8" });
      let ok = r.status === 0;
      if (ok) { const e = JSON.parse(r.stdout); ok = e.fps === 30 && Math.abs(e.rms.length - 60) <= 1 && e.rms.slice(2, 26).every((v) => v < 0.05) && e.rms.slice(36, 56).every((v) => v > 0.9) && e.rms.every((v) => v >= 0 && v <= 1); }
      if (!ok) bad++;
      console.log(`${ok ? "PASS" : "FAIL"}  envelope.mjs   silence then tone → rms ≈ 0 then ≈ 1 at 30 fps${ok ? "" : "; " + r.stderr}`);
    }
  }
} finally { await browser.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
if (bad) { console.error(`shotcards-b self-check: ${bad} failed`); process.exit(1); }
console.log("shotcards-b self-check: every card is a pure function of t, moves, loads in both renderers and stays offline");
