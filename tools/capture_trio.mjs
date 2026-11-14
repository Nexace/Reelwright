// node tools/capture_trio.mjs <url> <out_dir> [width=1440] [--selector "<css>"] [--max 40]   (row 2b.13; only pages you own or may use)
// The page capture trio a 3D "floating chip" or camera-over-a-page shot is built from, beside what tools/capture_site.mjs saves:
//   full@2x.png      the whole page at 2x
//   cutouts/*.png    one transparent PNG per element (2x): the element and what it holds, nothing behind it (page and ancestor
//                    backgrounds, shadows and every other element are hidden for the shot), so it can float as its own layer
//   layout.json      { url, width, height, scale, elements: [{ id, tag, name, text, x, y, w, h, z, radius, bg, cutout }] }: each
//                    element's box in page CSS px, document order z, to place the cutouts back
// Elements: [data-capture] when the page has any, else sections, headings, buttons, images, cards, chips and nav; boxes under 24 px
// or covering the whole page are skipped, a box identical to an earlier one is kept once. Read-only like capture_site: writes get a
// fake 200, no service workers, WebSockets, popups or beacons. Works on file:// pages (the self-check does).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./browser.mjs";

const DEFAULT = "section, header, nav, footer, h1, h2, h3, button, a[class*=btn], a[class*=button], img, svg, [class*=card], [class*=chip], [class*=badge], [class*=pill]";
const CUT_CSS = `html,body{background:transparent!important}body *{visibility:hidden!important}
[data-p10-cut],[data-p10-cut] *{visibility:visible!important}
[data-p10-anc]{background:none!important;box-shadow:none!important;border-color:transparent!important;backdrop-filter:none!important;outline:none!important}`;

export async function captureTrio(url, out, { width = 1440, selector, max = 40 } = {}) {
  if (!/^(https?|file):\/\//i.test(url)) throw new Error(`${url}: only http(s) and file URLs`);
  const b = await launch();
  try {
    const ctx = await b.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, serviceWorkers: "block" });
    await ctx.route("**/*", (r) => {
      const q = r.request();
      if (!/^(https?|file|data|blob):/i.test(q.url())) return r.abort();
      return ["GET", "HEAD"].includes(q.method()) ? r.continue() : r.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await ctx.routeWebSocket(/.*/, (ws) => ws.close());
    await ctx.addInitScript(() => { window.open = () => null; navigator.sendBeacon = () => true; });
    const p = await ctx.newPage();
    ctx.on("page", (x) => { if (x !== p) x.close().catch(() => {}); });
    const resp = await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (resp && !resp.ok()) throw new Error(`${url}: HTTP ${resp.status()} — not capturing an error or challenge page`);
    await p.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => p.waitForTimeout(1000));
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 300) { await p.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y); await p.waitForTimeout(80); }
    await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" })); await p.waitForTimeout(300);
    await p.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 20000 }).catch(() => {});
    fs.mkdirSync(path.join(out, "cutouts"), { recursive: true });
    await p.screenshot({ path: path.join(out, "full@2x.png"), fullPage: true });

    // the boxes, in document order, marked so each can be picked up again
    const els = await p.evaluate(([sel, max]) => {
      const pageW = document.documentElement.scrollWidth, pageH = document.documentElement.scrollHeight;
      const all = [...document.querySelectorAll(document.querySelector("[data-capture]") ? "[data-capture]" : sel)];
      const rows = [], seen = new Set();
      for (const e of all) {
        const r = e.getBoundingClientRect(), s = getComputedStyle(e);
        if (r.width < 24 || r.height < 24 || (r.width >= pageW - 1 && r.height >= pageH - 1) || s.visibility === "hidden" || s.display === "none" || Number(s.opacity) < 0.05) continue;
        const key = [r.left, r.top + scrollY, r.width, r.height].map(Math.round).join(",");
        if (seen.has(key)) continue; seen.add(key);
        e.setAttribute("data-p10-i", String(rows.length));
        rows.push({ tag: e.tagName.toLowerCase(), name: e.id || (typeof e.className === "string" ? e.className.trim().split(/\s+/)[0] : "") || e.tagName.toLowerCase(),
          text: (e.innerText || e.alt || "").replace(/\s+/g, " ").trim().slice(0, 60), x: +(r.left + scrollX).toFixed(2), y: +(r.top + scrollY).toFixed(2),
          w: +r.width.toFixed(2), h: +r.height.toFixed(2), z: rows.length, radius: parseFloat(s.borderTopLeftRadius) || 0, bg: s.backgroundColor });
        if (rows.length >= max) break;
      }
      return { rows, pageW, pageH };
    }, [selector || DEFAULT, max]);
    await p.addStyleTag({ content: CUT_CSS });
    for (const [i, r] of els.rows.entries()) {
      const file = `${String(i).padStart(2, "0")}-${r.name.replace(/[^\w-]+/g, "").slice(0, 24) || r.tag}.png`;
      await p.evaluate((i) => { const e = document.querySelector(`[data-p10-i="${i}"]`); e.setAttribute("data-p10-cut", ""); for (let a = e.parentElement; a; a = a.parentElement) a.setAttribute("data-p10-anc", ""); }, i);
      await p.locator(`[data-p10-i="${i}"]`).screenshot({ path: path.join(out, "cutouts", file), omitBackground: true });
      await p.evaluate(() => { document.querySelectorAll("[data-p10-cut]").forEach((e) => e.removeAttribute("data-p10-cut")); document.querySelectorAll("[data-p10-anc]").forEach((e) => e.removeAttribute("data-p10-anc")); });
      r.id = i; r.cutout = "cutouts/" + file;
    }
    const layout = { url, width: els.pageW, height: els.pageH, scale: 2, elements: els.rows.map(({ id, tag, name, text, x, y, w, h, z, radius, bg, cutout }) => ({ id, tag, name, text, x, y, w, h, z, radius, bg, cutout })) };
    fs.writeFileSync(path.join(out, "layout.json"), JSON.stringify(layout, null, 1));
    return layout;
  } finally { await b.close(); }
}

const same = (a, b) => { const [x, y] = [a, b].map((f) => fs.realpathSync(f)); return process.platform === "win32" ? x.toLowerCase() === y.toLowerCase() : x === y; };
if (process.argv[1] && fs.existsSync(process.argv[1]) && same(process.argv[1], fileURLToPath(import.meta.url))) {
  const a = process.argv.slice(2), flag = (k) => (a.includes(k) ? a.splice(a.indexOf(k), 2)[1] : undefined);
  const selector = flag("--selector"), max = flag("--max"), [url, out, width = "1440"] = a;
  if (!url || !out) { console.log('usage: node tools/capture_trio.mjs <url> <out_dir> [width] [--selector "<css>"] [--max 40]   (only pages you own or may use)'); process.exit(1); }
  const l = await captureTrio(url, out, { width: Number(width), selector, max: max ? Number(max) : undefined });
  console.log(`full@2x.png, ${l.elements.length} cutouts, layout.json → ${out}`);
}
