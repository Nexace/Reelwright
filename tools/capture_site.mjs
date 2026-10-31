// node tools/capture_site.mjs <url> <out_dir> [width=1440]
// Captures a website for a film: scrolls the whole page first (so scroll-reveal animations fire and lazy
// images load), then saves a 2× screenshot of every <section>, the full page, and the raw image files.
// Use the pieces as layers in film.js (a scrolling "browser" shot, cards popping out, etc.).
// Also writes site.json (the page's facts: text, headings, colours, fonts) and hero.jpg + one shot per h2/h3,
// which `reelwright from-url` / `theme-from` use through capture(). Only capture sites you own or may use.
// Read-only: any request other than GET/HEAD gets a fake 200 and never reaches the site.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "./browser.mjs";

// opts: width; extras (sections, full page, images, as the CLI always did); shots (hero + per-heading jpgs)
export async function capture(url, out, { width = 1440, extras = false, shots = true } = {}) {
  fs.mkdirSync(out, { recursive: true });
  const b = await launch();
  try {
    const p = await b.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
    await p.route("**/*", (r) => (["GET", "HEAD"].includes(r.request().method()) ? r.continue()
      : r.fulfill({ status: 200, contentType: "application/json", body: "{}" })));
    await p.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 300) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(120); }
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1000);
    await p.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 20000 }).catch(() => {});

    const facts = { url, ...(await p.evaluate(readFacts)) };
    if (shots) {
      await p.screenshot({ path: path.join(out, "hero.jpg"), type: "jpeg", quality: 85 });
      for (const [i, h] of facts.headings.entries()) {
        if (h.level < 2 || i > 24) continue;
        const ph = await p.evaluate(() => document.documentElement.scrollHeight);
        const y = Math.max(0, Math.min(h.y - 48, ph - 900));
        await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(300);
        h.shot = `shot${String(i).padStart(2, "0")}.jpg`;
        await p.screenshot({ path: path.join(out, h.shot), type: "jpeg", quality: 85 });
      }
      await p.evaluate(() => scrollTo(0, 0));
    }
    fs.writeFileSync(path.join(out, "site.json"), JSON.stringify(facts, null, 1));
    if (extras) await saveExtras(p, out);
    return facts;
  } finally { await b.close(); }
}

async function saveExtras(p, out) {
  const srcs = await p.evaluate(() => [...new Set([...document.images].map((i) => i.currentSrc).filter(Boolean))]);
  fs.mkdirSync(path.join(out, "images"), { recursive: true });
  for (const s of srcs) {
    try { const r = await p.request.get(s); fs.writeFileSync(path.join(out, "images", decodeURIComponent(s.split("/").pop().split("?")[0]).slice(-80)), await r.body()); } catch {}
  }
  const secs = p.locator("section");
  const n = await secs.count();
  for (let i = 0; i < n; i++) {
    const s = secs.nth(i); const bb = await s.boundingBox();
    if (!bb || bb.height < 40) continue;
    await s.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
    await s.screenshot({ path: path.join(out, `section${String(i).padStart(2, "0")}.png`) });
  }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(out, "full.png"), fullPage: true });
  console.log(`${n} sections, ${srcs.length} images, full.png → ${out}`);
  console.log("check full.png: some sites repeat content in fullPage shots (sticky/virtual layouts) — crop if so");
}

// runs in the page (scrolled to the top): text, headings, buttons, colours, fonts
function readFacts() {
  const txt = (e) => (e.innerText || e.textContent || "").replace(/\s+/g, " ").trim();
  const meta = (k) => document.querySelector(`meta[name="${k}"], meta[property="${k}"]`)?.content?.trim() || "";
  const shown = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.1; };
  const rgba = (c) => { const m = (c || "").match(/[\d.]+/g) || []; return m.length < 3 ? null : [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1]; };
  const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const tally = (m, k, w) => m.set(k, (m.get(k) || 0) + w);
  const top = (m) => [...m].sort((a, b) => b[1] - a[1]);
  const sat = (c) => (Math.max(...c.slice(0, 3)) - Math.min(...c.slice(0, 3))) / 255;   // chroma: near-black isn't "saturated"
  const inMain = (e) => !e.closest("nav, header nav, footer, aside, [role=navigation], [aria-hidden=true]");

  // background: what's on top at grid points over the first two screens
  const bgs = new Map();
  for (const sy of [0, innerHeight]) {
    scrollTo(0, sy);
    for (let gx = 0.5; gx < 24; gx++) for (let gy = 0.5; gy < 14; gy++) {
      const hit = document.elementsFromPoint(gx / 24 * innerWidth, gy / 14 * innerHeight)
        .map((e) => rgba(getComputedStyle(e).backgroundColor)).find((c) => c && c[3] >= 0.5);
      tally(bgs, hex(hit || [255, 255, 255]), 1);   // nothing opaque, not even <html>: the browser's white
    }
  }
  scrollTo(0, 0);

  // text colour and fonts weighted by text length; accent from saturated buttons/links/text
  const inks = new Map(), accents = new Map(), fonts = { display: new Map(), text: new Map(), mono: new Map() };
  for (const e of document.body.querySelectorAll("*")) {
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ");
    const isBtn = e.matches("a, button, [role=button]");
    if (!own && !isBtn) continue;
    if (!shown(e)) continue;
    const s = getComputedStyle(e), c = rgba(s.color), n = own.length;
    if (n && c && c[3] > 0.5) {
      tally(inks, hex(c), n);
      if (sat(c) > 0.25) tally(accents, hex(c), n * 0.5);
      const role = e.closest("code, pre, kbd, samp") ? "mono" : e.closest("h1, h2, h3") ? "display" : "text";
      tally(fonts[role], `${s.fontFamily}|${s.fontWeight}`, n);
    }
    const bg = rgba(s.backgroundColor);
    if (isBtn && bg && bg[3] > 0.5 && sat(bg) > 0.25) { const r = e.getBoundingClientRect(); tally(accents, hex(bg), Math.sqrt(r.width * r.height)); }
  }
  const font = (m) => { const [k] = top(m)[0] || []; if (!k) return null; const [stack, w] = k.split("|"); return { stack, weight: +w || 400 }; };

  // headings in page order, each with the first sentence-ish text after it
  const all = [...document.querySelectorAll("p, li")];
  const headings = [...document.querySelectorAll("h1, h2, h3")].filter((h) => shown(h) && inMain(h) && txt(h)).map((h) => {
    let body = "";
    const next = all.find((p) => (h.compareDocumentPosition(p) & 4) && txt(p).split(" ").length >= 5 && inMain(p));
    if (next && Math.abs(next.getBoundingClientRect().top - h.getBoundingClientRect().top) < 600) body = txt(next);
    return { level: +h.tagName[1], text: txt(h), body, y: Math.round(h.getBoundingClientRect().top + scrollY) };
  });
  const paragraphs = [...document.querySelectorAll("p")].filter((p) => shown(p) && inMain(p)).map(txt).filter((t) => t.split(" ").length >= 8).slice(0, 10);
  const buttons = [...document.querySelectorAll("a, button")].filter((e) => shown(e) && !e.closest("nav, footer"))
    .map((e) => ({ text: txt(e), y: Math.round(e.getBoundingClientRect().top + scrollY), filled: (rgba(getComputedStyle(e).backgroundColor) || [0, 0, 0, 0])[3] > 0.5,
      radius: parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0 }))
    .filter((b) => b.text && b.text.split(" ").length <= 4 && b.y < innerHeight * 1.2).slice(0, 12);

  return {
    title: document.title.trim(), description: meta("description") || meta("og:description"),
    siteName: meta("og:site_name"), ogTitle: meta("og:title"), headings, paragraphs, buttons,
    colors: { bg: top(bgs).map(([k, v]) => [k, v]).slice(0, 6), ink: top(inks).slice(0, 6), accent: top(accents).slice(0, 6) },
    fonts: { display: font(fonts.display), text: font(fonts.text), mono: font(fonts.mono) },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [url, out, width = "1440"] = process.argv.slice(2);
  if (!url || !out) { console.log("usage: node tools/capture_site.mjs <url> <out_dir> [width]   (only sites you own or may use)"); process.exit(1); }
  await capture(url, out, { width: Number(width), extras: true });
}
