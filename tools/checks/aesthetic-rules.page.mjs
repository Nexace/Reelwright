// tools/checks/aesthetic-rules.page.mjs — WARN plug-in for `reelwright qa`, OFF unless project.json has "qa": {"aesthetic-rules": true}
// (row 2b.10: the video-shotcraft aesthetic rules as lints). Steps the film at 30 fps through window.render(t) and reports:
//   R1   the wordmark (an element marked data-wordmark, class "wordmark" or data-role="wordmark") is on screen, fully opaque and still
//        for at least 1 s somewhere in the film (the logo needs a beat to be read)
//   R4   at most 3 whole-frame beat hits: shake onsets (KIT.shake called with a window that opens) and crash zooms (a filmed layer's
//        zoom rises by 0.8 or more within 0.25 s) closer than 0.5 s count as one
//   Q11  captions (.kit-subrow) at least 5% of the frame height in font size, any other text at least 3%
//   Q3   no hand-held drift (KIT.handheld with a non-zero result) while a product shot (data-product, class "product", data-shot="product")
//        is on screen
// (S2, repeated SFX alternate and step down, is the sfx-repeat plug-in: tools/checks/sfx-repeat.py.) Mark elements with a data
// attribute and the lints see them; an element with data-aesthetic-skip (and what it holds) is ignored by Q11. Standalone:
//   node tools/checks/aesthetic-rules.page.mjs <project>
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const kind = "warn";

const T = { STEP: 1 / 30, HOLD: 1, MAX_HITS: 3, HIT_GAP: 0.5, ZOOM_RISE: 0.8, ZOOM_WIN: 0.25, CAPTION: 0.05, SECONDARY: 0.03, STILL_PX: 1.5, OPAQUE: 0.95 };

async function check(page) {
  return page.evaluate(async (T) => {
    const K = window.KIT, F = window.FILM, H = innerHeight;
    if (!K || !F) return [];
    const out = [], t2 = (t) => t.toFixed(2);
    const visible = (e) => {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return 0;
      let op = 1;
      for (let x = e; x && x.nodeType === 1; x = x.parentElement) {
        const s = getComputedStyle(x);
        if (s.display === 'none' || s.visibility === 'hidden') return 0;
        op *= Number(s.opacity);
      }
      return op;
    };
    // record what render(t) asks of the camera helpers, then put them back
    const cur = { t: 0, shake: new Set(), hand: [], zoom: new Map() };
    const orig = { shake: K.shake, handheld: K.handheld, shoot: K.shoot };
    K.shake = (t, t0, ...a) => { const r = orig.shake(t, t0, ...a); if (r.x || r.y) cur.shake.add(+t0.toFixed(3)); return r; };
    K.handheld = (...a) => { const r = orig.handheld(...a); if (r.x || r.y) cur.hand.push(cur.t); return r; };
    K.shoot = (el, st, ...a) => { const z = K.cam3(st).z; (cur.zoom.get(el) || cur.zoom.set(el, []).get(el)).push([cur.t, z]); return orig.shoot(el, st, ...a); };
    const wm = { run: null, best: 0, found: false, prev: null }, product = [], caption = new Map(), secondary = new Map();
    try {
      for (let t = 0; t <= F.DUR + 1e-9; t += T.STEP) {
        cur.t = t; await window.render(t);
        // R1
        const w = [...document.querySelectorAll('[data-wordmark], .wordmark, [data-role="wordmark"]')].find((e) => visible(e) > T.OPAQUE);
        for (const e of document.querySelectorAll('[data-wordmark], .wordmark, [data-role="wordmark"]')) wm.found = true;
        if (w) {
          const r = w.getBoundingClientRect(), still = wm.prev && Math.hypot(r.left - wm.prev.left, r.top - wm.prev.top, r.width - wm.prev.width) < T.STILL_PX;
          wm.run = wm.run && still ? { from: wm.run.from, to: t } : { from: t, to: t };
          wm.best = Math.max(wm.best, wm.run.to - wm.run.from + T.STEP); wm.prev = r;
        } else { wm.run = null; wm.prev = null; }
        // Q3
        if (cur.hand.length && [...document.querySelectorAll('[data-product], .product, [data-shot="product"]')].some((e) => visible(e) > 0.5)) product.push(t);
        cur.hand.length = 0;
        // Q11
        const walk = document.createTreeWalker(K.stage, NodeFilter.SHOW_TEXT);
        for (let n; (n = walk.nextNode());) {
          const s = n.textContent.trim(), e = n.parentElement;
          if (!s || e.closest('[data-aesthetic-skip]') || visible(e) < 0.5) continue;
          const px = parseFloat(getComputedStyle(e).fontSize), cap = !!e.closest('.kit-subs, .kit-subrow');
          const lim = (cap ? T.CAPTION : T.SECONDARY) * H;
          if (px < lim - 0.5 && !(cap ? caption : secondary).has(s.slice(0, 28))) (cap ? caption : secondary).set(s.slice(0, 28), { px, lim, t });
        }
      }
    } finally { Object.assign(K, orig); }
    // R1
    if (wm.best < T.HOLD) out.push(wm.found ? `R1 the wordmark is never on screen, opaque and still for ${T.HOLD} s (longest ${wm.best.toFixed(2)} s)`
      : `R1 no wordmark element found (mark it data-wordmark): the 1 s hold was not checked`);
    // R4
    const ev = new Set(cur.shake);
    for (const pts of cur.zoom.values()) {
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length && pts[j][0] - pts[i][0] <= T.ZOOM_WIN + 1e-9; j++)
        if (pts[j][1] - pts[i][1] >= T.ZOOM_RISE) { ev.add(+pts[i][0].toFixed(3)); i = j; break; }
    }
    const hits = []; for (const t of [...ev].sort((a, b) => a - b)) if (!hits.length || t - hits[hits.length - 1] > T.HIT_GAP) hits.push(t);
    if (hits.length > T.MAX_HITS) out.push(`R4 ${hits.length} whole-frame beat hits (shake / crash zoom) at ${hits.map(t2).join(', ')} s: keep to ${T.MAX_HITS}, they stop landing`);
    // Q3
    if (product.length) out.push(`Q3 hand-held drift while a product shot is on screen at ${t2(product[0])}–${t2(product[product.length - 1])} s: lock the camera on product`);
    // Q11
    for (const [s, v] of caption) out.push(`Q11 caption "${s}" is ${v.px.toFixed(0)} px (${(100 * v.px / H).toFixed(1)}% of the frame height) at ${t2(v.t)} s, needs ${(100 * T.CAPTION).toFixed(0)}% = ${v.lim.toFixed(0)} px`);
    for (const [s, v] of secondary) out.push(`Q11 text "${s}" is ${v.px.toFixed(0)} px (${(100 * v.px / H).toFixed(1)}%) at ${t2(v.t)} s, needs ${(100 * T.SECONDARY).toFixed(0)}% = ${v.lim.toFixed(0)} px`);
    return out.slice(0, 16);
  }, T);
}

export default async (page, ctx = {}) => {
  if (!ctx.P || !ctx.P.qa || ctx.P.qa["aesthetic-rules"] !== true) return [];   // opt-in: every film would otherwise pay for a 30 fps sweep
  try { return await check(page); } catch (e) { return [`aesthetic-rules skipped: ${String((e && e.message) || e).split('\n')[0]}`]; }
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.argv[2]) { console.error("usage: node tools/checks/aesthetic-rules.page.mjs <project>"); process.exit(2); }
  const { launch } = await import("../browser.mjs");
  const DIR = path.resolve(process.argv[2]), P = JSON.parse(fs.readFileSync(path.join(DIR, "project.json"), "utf8"));
  const [W, H] = (P.width && P.height ? [P.width, P.height] : [1920, 1080]);
  const b = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  try {
    const p = await b.newPage({ viewport: { width: W, height: H } });
    await p.goto(pathToFileURL(path.join(DIR, P.renderer === "hyperframes" ? "hf/index.html" : "film/index.html")).href);
    await p.waitForFunction(() => window.READY, null, { timeout: 30000 });
    const lines = await (await import(import.meta.url)).default(p, { DIR, P: { ...P, qa: { ...(P.qa || {}), "aesthetic-rules": true } }, W, H });
    console.log(lines.length ? lines.join("\n") : "aesthetic-rules: no findings");
  } finally { await b.close(); }
}
