// tools/gallery.mjs: the shotcard and effect gallery (`reelwright gallery`, tools/commands/gallery.mjs).
// Renders every shotcard helper (docs/recipes/shotcards, fixtures of tools/selfcheck/shotcards-{a,b}) and every fx-* effect (tools/gallery-fx.mjs) at
// 3 to 5 moments, on the pvk renderer (a file:// page, no network; same input, same bytes) and writes, under <out> (default docs/gallery):
//   index.html   one self-contained page: a grid, a filter per module, a contact strip (jpg, inlined) per item, the helper call, the recipe link
//   refs/<id>.jpg   a small strip per item: what `--check` compares against
// run({ kinds, out, check, only }): check = compare fresh strips with <out>/refs/ (per-pixel tolerance), write nothing; returns the ids that changed.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "./browser.mjs";
import { copyKit } from "./kit_files.mjs";
import { FX, FX_FILES, FX_RUNTIME } from "./gallery-fx.mjs";

export const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SHOW = [256, 144], REF = [128, 72];   // one frame of a strip in the page, and in refs/
const TOL = 48, MAX_OFF = 0.02;             // check: a pixel is off when a channel differs by more than TOL (of 255); an item changed when more than 2 % are off
const url = (rel) => pathToFileURL(path.join(ROOT, ...rel.split("/"))).href;
const rd = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

// Shotcards A: one film per module (tools/selfcheck/shotcards-a/<module>.mjs), the helpers in turn; [helper, from, to] = its window, copied from those fixtures
const A = {
  camera: [["cursorFlyover", 0.05, 2.45], ["pullBackIsolation", 2.65, 4.2], ["terminal3d", 4.6, 6.2]],
  opening: [["datavizLandscapeOpen", 0.1, 1.5], ["fracture", 2, 2.8], ["inkBloom", 3.3, 4.2], ["craneRise", 4.5, 5.6], ["iconField", 5.9, 6.9], ["letterspace", 7.1, 8], ["orbitRingTitle", 8.3, 9.4], ["spotlightHero", 9.7, 10.7], ["textMask", 10.9, 11.95]],
  outro: [["logoLockup", 0.2, 1.6], ["neonMarquee", 1.9, 3.5], ["groupLaunch", 3.7, 5.3], ["uiStripAway", 5.5, 7.1], ["iconFlipBloom", 7.3, 8.5], ["inputMorphAssemble", 8.7, 9.95]],
  rhythm: [["stepList", 0.1, 2.3], ["comicPanels", 2.5, 3.8], ["quadSplit", 4, 5.7], ["jumpCut", 6, 7.3], ["sakugaTime", 7.5, 8.7], ["trailerBumper", 8.8, 11.8]],
  transition: [["pageTurn", 1, 1.9], ["versusSlam", 2.4, 3.3], ["invisibleCut", 3.8, 4.7], ["lightLeakBurn", 5.2, 6.1], ["letterformZoom", 6.6, 7.5], ["cardFlock", 7.8, 9]],
  dissolve: [["grain", 0.6, 1.5], ["halftone", 1.8, 2.7], ["tornEdge", 3, 3.9], ["inkBleed", 4.2, 5.1], ["gradientWipe", 5.4, 6.3], ["tearStreak", 6.6, 7.5]],
};
const A_FRAMES = [0, 0.25, 0.5, 0.75, 1], B_FRAMES = [0.06, 0.28, 0.5, 0.72, 0.94];   // where in the window: A, and B (a fraction of each card's own length)
const FX_P = [0, 0.25, 0.5, 0.75, 1];

const CSS_A = (W, H) => `<style>body{margin:0;background:#f6f4ef}#stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;
background:#f6f4ef;color:#1d1b16;font:600 40px Arial,sans-serif}#stage div{position:absolute}
.box{width:80px;height:80px;background:#36c;border-radius:10px}.dot{width:30px;height:30px;border-radius:50%;background:#e33}
.scene{left:0;top:0;width:${W}px;height:${H}px}.a{background:#36c}.b{background:#e0a030}.c{background:#2f9e6b}</style>`;
const DATA = (W, H, dur) => `<script>window.PROJECT = { fps: 30, width: ${W}, height: ${H}, speechEnd: ${dur}, tail: 0 }; window.VO = {}; window.MUSIC = {};</script>`;
const html = (head, body) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${url("tools/kit.css")}">${head}</head><body>${body}</body></html>`;
const scripts = (l) => ["tools/engine.js", ...l].map((s) => `<script src="${url(s)}"></script>`).join("");

// ── the three kinds of page; each returns { file, W, H, items: async (page) → [{ id, name, frames: async (shoot) → png[] }] } ──
async function pageA(mod, tmp, want) {
  const fx = (await import(pathToFileURL(path.join(ROOT, "tools/selfcheck/shotcards-a", mod + ".mjs")).href)).default, W = 640, H = 360, file = path.join(tmp, `a-${mod}.html`);
  fs.writeFileSync(file, html(CSS_A(W, H), `<div id="stage"></div>${DATA(W, H, fx.dur)}${scripts(fx.scripts)}<script>'use strict'; const S = KIT.stage;\n${fx.film}\n</script>`));
  return { file, W, H, ready: (p) => p.evaluate(() => window.READY),
    items: A[mod].filter(([n]) => want(`${mod}.${n}`)).map(([n, t0, t1]) => ({ id: `${mod}.${n}`, name: n, call: `KIT.shotcards.${n}`, frames: async (p, shoot) => {
      const out = []; for (const f of A_FRAMES) { await p.evaluate((t) => window.render(t), +(t0 + (t1 - t0) * f).toFixed(4)); out.push(await shoot()); } return out; } })) };
}
async function pageB(mod, tmp, want) {
  const fx = (await import(pathToFileURL(path.join(ROOT, "tools/selfcheck/shotcards-b", mod + ".mjs")).href)).default, W = 960, H = 540, file = path.join(tmp, `b-${mod}.html`);
  const boot = `<script>'use strict'; const S = KIT.stage, C = KIT.shotcards; window.CARDS = {};
function card(name, make) { const box = KIT.el('div', '', S); KIT.css(box, { left: '0px', top: '0px', width: '${W}px', height: '${H}px' }); window.CARDS[name] = Object.assign({ root: box }, make(box)); box.style.display = 'none'; }</script>`;
  fs.writeFileSync(file, html("<style>body{margin:0;background:#0f1115}#stage{font:600 40px Arial,sans-serif}</style>",
    `<div id="stage"></div>${DATA(W, H, 8)}${scripts(fx.scripts)}${boot}<script>${fx.build}</script>`));
  return { file, W, H, ready: (p) => p.evaluate(() => window.CARDS && Object.keys(window.CARDS).length > 0),
    items: async (p) => (await p.evaluate(() => Object.fromEntries(Object.entries(window.CARDS).map(([k, c]) => [k, c.end])))), mod, want,
    make: (n, end) => ({ id: `${mod}.${n}`, name: n, call: `KIT.shotcards.${n}`, frames: async (p, shoot) => {
      const span = Math.max(end ?? 2, 0.5) + 0.3, out = [];
      for (const f of B_FRAMES) { await p.evaluate(([n, t]) => { const c = window.CARDS[n]; for (const k in window.CARDS) window.CARDS[k].root.style.display = k === n ? "block" : "none"; c.set(t); }, [n, +(span * f).toFixed(4)]); out.push(await shoot()); }
      return out; } }) };
}
function pageFx(mod, tmp, want) {
  const W = 480, H = 270, file = path.join(tmp, `fx-${mod}.html`);
  fs.writeFileSync(file, html("<style>body{margin:0;background:#14161c}#stage{position:absolute;left:0;top:0;width:480px;height:270px;overflow:hidden;background:#14161c;font:600 40px Arial,sans-serif}#stage div{position:absolute}</style>",
    `<div id="stage"></div>${DATA(W, H, 4)}${scripts(FX_FILES[mod].map((f) => "tools/" + f + ".js"))}<script>${FX_RUNTIME}</script>`));
  return { file, W, H, ready: (p) => p.evaluate(() => !!window.G),
    items: FX.filter(([m, n]) => m === mod && want(`fx-${m}.${n}`)).map(([m, n, call, body, stat]) => ({ id: `fx-${m}.${n}`, name: n, call, frames: async (p, shoot) => {
      await p.evaluate((b) => window.runFx(b), body); const out = []; for (const q of stat ? [0.5] : FX_P) { await p.evaluate((q) => window.stepFx(q), q); out.push(await shoot()); } return out; } })) };
}

// ── strips: the frames of one item side by side as a jpg (made in a page: no image library in the repo) ──
const STRIP = async (cmp, pngs, [fw, fh], q) => cmp.evaluate(async ([pngs, fw, fh, q]) => {
  const c = new OffscreenCanvas(fw * pngs.length, fh), g = c.getContext("2d"); g.imageSmoothingQuality = "high";
  for (const [i, b64] of pngs.entries()) { const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode(); g.drawImage(im, i * fw, 0, fw, fh); }
  const blob = await c.convertToBlob({ type: "image/jpeg", quality: q }), u = new Uint8Array(await blob.arrayBuffer());
  let s = ""; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192));
  return btoa(s);
}, [pngs.map((b) => b.toString("base64")), fw, fh, q]);
// share of pixels whose channel differs by more than TOL between two jpgs (base64); 1 when the sizes differ
const DIFF = (cmp, a, b) => cmp.evaluate(async ([a, b, tol]) => {
  const px = async (s) => { const im = new Image(); im.src = "data:image/jpeg;base64," + s; await im.decode(); const g = new OffscreenCanvas(im.width, im.height).getContext("2d"); g.drawImage(im, 0, 0); return [im.width, im.height, g.getImageData(0, 0, im.width, im.height).data]; };
  const [w1, h1, x] = await px(a), [w2, h2, y] = await px(b);
  if (w1 !== w2 || h1 !== h2) return 1;
  let off = 0; for (let i = 0; i < x.length; i += 4) if (Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2])) > tol) off++;
  return off / (x.length / 4);
}, [a, b, TOL]);

// ── recipe links ──
function recipes(outDir) {
  const dir = "docs/recipes/shotcards", pages = fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(".md") && f !== "README.md" && f !== "b-index.md").sort();
  const text = Object.fromEntries(pages.map((f) => [f, rd(`${dir}/${f}`)]));
  const rel = (f) => path.relative(outDir, path.join(ROOT, f)).split(path.sep).join("/");   // a link from index.html, wherever --out is
  return (item, mod) => {
    if (mod.startsWith("fx-")) return { href: rel("docs/playbook/effects.md"), text: "Effects playbook page" };
    const n = (s, name) => (s.match(new RegExp(`\\b${name}\\b`, "g")) || []).length;
    const base = item.name.split(".")[0], best = pages.map((f) => [f, n(text[f], base)]).filter(([, c]) => c).sort((a, b) => b[1] - a[1])[0];
    if (best) return { href: rel(`${dir}/${best[0]}`), text: text[best[0]].split(/\r?\n/)[0].replace(/^#+\s*/, "") };
    return { href: rel(`${dir}/${A[mod] ? "README.md" : "b-index.md"}`), text: A[mod] ? "Shotcards A" : "Shotcards B" };
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function pageHtml(items) {
  const mods = [...new Set(items.map((i) => i.mod))];
  const cards = items.map((i) => `<figure data-mod="${i.mod}" data-k="${esc((i.id + " " + i.call).toLowerCase())}"><img alt="${esc(i.id)}" src="data:image/jpeg;base64,${i.strip}">` +
    `<figcaption><b>${esc(i.name)}</b><code>${esc(i.call)}</code><span>${esc(i.mod)}</span><a href="${esc(i.link.href)}">${esc(i.link.text)}</a></figcaption></figure>`).join("\n");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reelwright gallery</title><style>
:root{--bg:#f7f5f0;--ink:#1d1b16;--mut:#6b675c;--card:#fff;--line:#ddd8cb;--acc:#0b6bcb}
@media(prefers-color-scheme:dark){:root{--bg:#14161c;--ink:#ece9df;--mut:#9a968a;--card:#1d2028;--line:#2c303a;--acc:#6fb1ff}}
body{margin:0;padding:16px;background:var(--bg);color:var(--ink);font:15px/1.4 system-ui,sans-serif}h1{margin:0 0 4px;font-size:22px}p{margin:0 0 12px;color:var(--mut)}
nav{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}nav button,nav input{font:inherit;padding:4px 10px;border:1px solid var(--line);border-radius:99px;background:var(--card);color:var(--ink)}
nav button.on{background:var(--acc);color:#fff;border-color:var(--acc)}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr));gap:14px}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden}figure[hidden]{display:none}img{display:block;width:100%;height:auto;background:#000}
figcaption{display:grid;gap:2px;padding:8px 10px;font-size:13px}code{color:var(--mut);overflow-wrap:anywhere}span{color:var(--mut)}a{color:var(--acc)}</style></head><body>
<h1>Reelwright gallery</h1><p>${items.length} shotcards and effects, each at up to ${A_FRAMES.length} moments in time (pvk renderer). Made by <code>reelwright gallery</code>.</p>
<nav><input id="q" type="search" placeholder="filter by name" aria-label="filter by name"><button class="on" data-m="">all (${items.length})</button>${mods.map((m) => `<button data-m="${m}">${m} (${items.filter((i) => i.mod === m).length})</button>`).join("")}</nav>
<main>
${cards}
</main><script>let m="",q="";const f=()=>document.querySelectorAll("figure").forEach(e=>e.hidden=!((!m||e.dataset.mod===m)&&e.dataset.k.includes(q)));
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{m=b.dataset.m;document.querySelectorAll("nav button").forEach(x=>x.classList.toggle("on",x===b));f()});
document.getElementById("q").oninput=e=>{q=e.target.value.toLowerCase();f()}</script></body></html>
`;
}

export async function run({ kinds = ["shotcards", "effects"], out = "docs/gallery", check = false, only = [], page = !only.length } = {}) {
  const outDir = path.resolve(ROOT, out), refs = path.join(outDir, "refs"), tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gallery-"));
  const want = (id) => !only.length || only.includes(id), wantMod = (m) => !only.length || only.some((o) => o.startsWith(m + "."));
  const plan = [];   // [builder, module]
  if (kinds.includes("shotcards")) {
    for (const m of Object.keys(A)) wantMod(m) && plan.push(["a", m]);
    for (const m of fs.readdirSync(path.join(ROOT, "tools/selfcheck/shotcards-b")).filter((f) => f.endsWith(".mjs")).map((f) => f.slice(0, -4)).sort()) wantMod(m) && plan.push(["b", m]);
  }
  if (kinds.includes("effects")) for (const m of Object.keys(FX_FILES)) wantMod("fx-" + m) && plan.push(["fx", m]);
  const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]), done = [], problems = [];
  try {
    const cmp = await browser.newPage(), link = recipes(outDir);
    for (const [kind, m] of plan) {
      const src = kind === "a" ? await pageA(m, tmp, want) : kind === "b" ? await pageB(m, tmp, want) : pageFx(m, tmp, want);
      const p = await browser.newPage({ viewport: { width: src.W, height: src.H }, deviceScaleFactor: 1 }), errs = [];
      p.on("pageerror", (e) => errs.push(e.message));
      p.on("request", (r) => { if (!/^(file|data|blob|about):/.test(r.url())) errs.push("network request: " + r.url()); });   // offline, always
      try {
        await p.goto(pathToFileURL(src.file).href);
        for (let i = 0; !(await src.ready(p)); i++) { if (i > 150) throw new Error("page never became ready: " + errs.join("; ")); await new Promise((r) => setTimeout(r, 100)); }
        const items = Array.isArray(src.items) ? src.items : Object.entries(await src.items(p)).map(([n, end]) => src.make(n, end)).filter((i) => want(i.id));
        for (const it of items) {
          const pngs = await it.frames(p, () => p.screenshot({ type: "png" })), mod = it.id.split(".")[0];
          const ref = await STRIP(cmp, pngs, REF, 0.8), file = path.join(refs, it.id + ".jpg");
          if (check) {
            const have = fs.existsSync(file) ? fs.readFileSync(file).toString("base64") : null, d = have ? await DIFF(cmp, ref, have) : 1;
            console.log(`${d > MAX_OFF ? "CHANGED" : "ok     "} ${it.id}${have ? ` (${(d * 100).toFixed(2)} % of pixels off)` : " (no reference strip)"}`);
            if (d > MAX_OFF) problems.push(it.id);
          } else done.push({ ...it, mod, strip: await STRIP(cmp, pngs, SHOW, 0.82), ref, link: link(it, mod) });
        }
        if (errs.length) problems.push(...errs.map((e) => `${m}: ${e}`));
      } finally { await p.close(); }
    }
    if (check) return problems;
    if (!done.length) throw new Error("nothing matched" + (only.length ? ` --only ${only.join(",")}` : ""));
    fs.mkdirSync(refs, { recursive: true });
    for (const i of done) fs.writeFileSync(path.join(refs, i.id + ".jpg"), Buffer.from(i.ref, "base64"));
    // a full run owns index.html; a partial one (--only) only refreshes the refs it rendered
    if (page) fs.writeFileSync(path.join(outDir, "index.html"), pageHtml(done));
    return done.map((i) => i.id);
  } finally { await browser.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
}
