// tools/capture_url.mjs — `reelwright capture <url>` (HyperFrames `capture`, G3): a read-only, SSRF-guarded capture of a page
// into a folder an agent (or you) can build a film from. Only capture sites you own or may use.
//   captureUrl(target, out, { width = 1440, height = 900, shots = 21, localFile = false, video = false, log })  → the capture.json object
// Writes under <out>/:
//   screenshots/scroll-00.jpg …   `shots` evenly spaced scroll positions (default 21), full-page.png (the whole page, capped at
//                                 16000 px), contact-sheet.jpg (every scroll shot in one grid)
//   page.html  styles.css  text.txt   the rendered DOM (scripts removed), every stylesheet's rules, the visible text
//   tokens.json                   CSS custom properties, and the colours, fonts, sizes, radii, shadows and spacing in use (by weight)
//   assets/fonts/*  assets/images/*  assets/svg/*   downloaded @font-face files (fonts.json lists source + a licence reminder),
//                                 <img> files, inline <svg>s
//   animations.json  media.json   CSS animations/transitions/@keyframes and animation libraries found; Lottie, video, canvas
//                                 (2d / webgl / webgl2), iframes
//   AGENTS.md  capture.json       how to use the folder; what was written
// Safety: http(s) only, no credentials in the URL; every request (the page's, its redirects and sub-resources, and our own
// downloads) must resolve to public addresses (see isPrivateIp: loopback, private, link-local, CGNAT, multicast, unique-local,
// and IPv6 forms that embed them, are refused). `localFile: true` (CLI --local-file) instead serves one local file's folder on
// 127.0.0.1 and allows only that origin. Read-only like tools/capture_site.mjs: writes get a fake 200, no service workers, no
// WebSockets, no popups, no beacons.
// `video: true` (CLI --video) also downloads the page's own <video> files to assets/video/ (150 MB cap each). Not done: Gemini image captions (HyperFrames: paid, skipped). shortcut: DNS is resolved
// once per host and cached for the run, so a rebinding server could still answer differently to the browser's own lookup;
// run it on a network that can't reach private ranges if the target is untrusted.
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import dns from "node:dns";
import { launch } from "./browser.mjs";

// ── SSRF guard ─────────────────────────────────────────────────────────────
const v4 = (s) => s.split(".").map(Number);
function privateV4([a, b, c]) {
  return a === 0 || a === 10 || a === 127 || a >= 224 ||                       // this-net, private, loopback, multicast + reserved
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||             // CGNAT, link-local (cloud metadata lives here)
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) || (a === 198 && (b === 18 || b === 19));   // IETF protocol block, benchmarking
}
function expandV6(ip) {   // → 8 numbers; the last 32 bits may be written a.b.c.d
  ip = ip.split("%")[0].toLowerCase();
  const m = ip.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (m) { const [a, b, c, d] = v4(m[2]); ip = m[1] + ((a << 8) | b).toString(16) + ":" + ((c << 8) | d).toString(16); }
  const [h, t] = ip.split("::");
  const head = h ? h.split(":") : [], tail = t ? t.split(":") : [];
  const mid = ip.includes("::") ? Array(8 - head.length - tail.length).fill("0") : [];
  return [...head, ...mid, ...tail].map((x) => parseInt(x || "0", 16));
}
export function isPrivateIp(ip) {
  const k = net.isIP(ip);
  if (k === 4) return privateV4(v4(ip));
  if (k !== 6) return true;   // not an address at all: refuse
  const g = expandV6(ip), emb = (hi, lo) => privateV4([hi >> 8, hi & 255, lo >> 8, lo & 255]);
  if (g.every((x) => x === 0) || (g.slice(0, 7).every((x) => x === 0) && g[7] === 1)) return true;   // :: and ::1
  if ((g[0] & 0xfe00) === 0xfc00 || (g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xff00) === 0xff00) return true;   // unique-local, link-local, multicast
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return emb(g[6], g[7]);                          // ::ffff:a.b.c.d
  if (g.slice(0, 6).every((x) => x === 0)) return true;                                                          // ::a.b.c.d (deprecated)
  if (g[0] === 0x64 && g[1] === 0xff9b) return emb(g[6], g[7]);                                                  // NAT64
  if (g[0] === 0x2002) return emb(g[1], g[2]);                                                                   // 6to4
  return false;
}
// throws unless `url` is http(s), has no credentials, and its host is a public address (or resolves only to public ones)
export async function assertPublicUrl(url, { lookup = (h) => dns.promises.lookup(h, { all: true }) } = {}) {
  let u;
  try { u = new URL(url); } catch { throw new Error(`${url}: not a URL`); }
  if (!/^https?:$/.test(u.protocol)) throw new Error(`${url}: only http(s) URLs (use --local-file for a file on this machine)`);
  if (u.username || u.password) throw new Error(`${u.origin}: credentials in the URL are refused`);
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) { if (isPrivateIp(host)) throw new Error(`${host}: private or reserved address refused (SSRF guard)`); return u; }
  if (/^(localhost|.*\.(localhost|local|internal|lan|home|corp))$/i.test(host)) throw new Error(`${host}: local host name refused (SSRF guard)`);
  const addrs = await lookup(host);
  if (!addrs.length) throw new Error(`${host}: does not resolve`);
  for (const a of addrs) if (isPrivateIp(a.address)) throw new Error(`${host} resolves to ${a.address}: private or reserved address refused (SSRF guard)`);
  return u;
}

// ── a local file's folder on loopback (--local-file) ───────────────────────
const TYPES = { ".html": "text/html", ".htm": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf", ".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain" };
export function serveFolder(root) {
  root = path.resolve(root);
  const srv = http.createServer((q, r) => {
    const rel = decodeURIComponent((q.url || "/").split(/[?#]/)[0]);
    const f = path.resolve(root, "." + path.posix.normalize("/" + rel));
    if (q.method !== "GET" && q.method !== "HEAD" || (f !== root && !f.startsWith(root + path.sep)) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { r.writeHead(404).end(); return; }
    r.writeHead(200, { "content-type": TYPES[path.extname(f).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(f).pipe(r);
  });
  return new Promise((res) => srv.listen(0, "127.0.0.1", () => res({ origin: `http://127.0.0.1:${srv.address().port}`, close: () => srv.close() })));
}

// ── the capture ────────────────────────────────────────────────────────────
const slug = (s) => s.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(-60) || "file";
const EXT = { "font/woff2": ".woff2", "font/woff": ".woff", "font/ttf": ".ttf", "font/otf": ".otf", "application/font-woff2": ".woff2", "application/font-woff": ".woff" };

export async function captureUrl(target, out, { width = 1440, height = 900, shots = 21, localFile = false, video = false, log = () => {} } = {}) {
  let url, local = null;
  if (localFile) {
    const f = path.resolve(String(target).replace(/^file:\/\//, ""));
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) throw new Error(`--local-file: ${f} is not a file`);
    local = await serveFolder(path.dirname(f));
    url = `${local.origin}/${encodeURIComponent(path.basename(f))}`;
  } else url = (await assertPublicUrl(target)).href;
  const okHost = new Map();   // host → true | Error, per run
  const checkUrl = async (u) => {   // for every request the browser or we make
    if (!/^https?:/i.test(u)) return;
    const h = new URL(u);
    if (local && h.origin === local.origin) return;
    if (!okHost.has(h.host)) okHost.set(h.host, await assertPublicUrl(u).then(() => true, (e) => e));
    if (okHost.get(h.host) !== true) throw okHost.get(h.host);
  };
  const b = await launch();
  const media = { lottie: new Set(), requests: [] };
  try {
    const ctx = await b.newContext({ viewport: { width, height }, deviceScaleFactor: 1, serviceWorkers: "block" });
    await ctx.route("**/*", async (r) => {
      const q = r.request();
      if (!/^(https?|data|blob|about):/i.test(q.url())) return r.abort();   // no file:// from a remote page
      try { await checkUrl(q.url()); } catch (e) { log(`blocked ${q.url().slice(0, 100)}: ${e.message}`); return r.abort("blockedbyclient"); }
      if (/\.(lottie|json)(\?|$)/i.test(q.url()) && /lottie|animation|anim/i.test(q.url())) media.lottie.add(q.url());
      return ["GET", "HEAD"].includes(q.method()) ? r.continue() : r.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await ctx.routeWebSocket(/.*/, (ws) => ws.close());
    await ctx.addInitScript(() => {
      window.open = () => null; navigator.sendBeacon = () => true;
      window.__rwCanvas = [];
      const g = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...a) { try { window.__rwCanvas.push(String(type)); } catch {} return g.call(this, type, ...a); };
    });
    const p = await ctx.newPage();
    ctx.on("page", (x) => { if (x !== p) x.close().catch(() => {}); });
    const resp = await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (resp && !resp.ok()) throw new Error(`${url}: HTTP ${resp.status()} — not capturing an error or challenge page`);
    await p.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => p.waitForTimeout(2000));
    const scrollH = () => p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < await scrollH(); y += Math.round(height / 3)) { await p.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y); await p.waitForTimeout(80); }   // fire scroll reveals, load lazy images
    await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" })); await p.waitForTimeout(500);
    await p.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});

    for (const d of ["screenshots", "assets/fonts", "assets/images", "assets/svg"]) fs.mkdirSync(path.join(out, d), { recursive: true });
    const base = p.url();
    const fetchGuarded = async (u, max) => {   // our own downloads: same guard, same size cap
      let r;
      for (let hop = 0; hop < 4; hop++) {   // redirects are followed by hand so each hop passes the guard
        await checkUrl(u);
        r = await ctx.request.get(u, { timeout: 20000, maxRedirects: 0 });
        const loc = r.headers().location;
        if (r.status() >= 300 && r.status() < 400 && loc) { u = new URL(loc, u).href; continue; }
        break;
      }
      if (!r.ok()) throw new Error(`HTTP ${r.status()}`);
      const body = await r.body();
      if (body.length > max) throw new Error(`${(body.length / 1e6).toFixed(1)} MB over the ${max / 1e6} MB cap`);
      return { body, type: (r.headers()["content-type"] || "").split(";")[0] };
    };

    // scroll screenshots + full page + contact sheet
    const H = await scrollH(), maxY = Math.max(0, H - height), n = maxY ? Math.max(1, shots) : 1, files = [];
    for (let i = 0; i < n; i++) {
      const y = n === 1 ? 0 : Math.round((maxY * i) / (n - 1));
      await p.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y); await p.waitForTimeout(120);
      const f = `screenshots/scroll-${String(i).padStart(2, "0")}.jpg`;
      await p.screenshot({ path: path.join(out, f), type: "jpeg", quality: 82 });
      files.push({ file: f, y });
    }
    await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" })); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, "full-page.png"), fullPage: true, ...(H > 16000 ? { clip: { x: 0, y: 0, width, height: 16000 } } : {}) });
    {
      const sheetCtx = await b.newContext(), sheet = await sheetCtx.newPage();   // its own context: ctx closes every extra page
      const cols = Math.min(4, files.length), cell = 360;
      const tiles = files.map((f, i) => `<figure><img src="data:image/jpeg;base64,${fs.readFileSync(path.join(out, f.file)).toString("base64")}"><figcaption>${String(i).padStart(2, "0")} · y ${f.y}</figcaption></figure>`).join("");
      await sheet.setContent(`<body style="margin:0;background:#161616;font:14px sans-serif;color:#ddd"><div style="display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:10px;padding:10px;width:max-content">${tiles}</div><style>figure{margin:0}img{width:${cell}px;display:block;border:1px solid #333}figcaption{padding:4px 0}</style>`);
      await sheet.waitForLoadState("load");
      await sheet.screenshot({ path: path.join(out, "contact-sheet.jpg"), type: "jpeg", quality: 85, fullPage: true });
      await sheetCtx.close();
    }
    await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));

    // html / css / text / tokens / animations / media
    const doc = await p.evaluate(readDocument);
    fs.writeFileSync(path.join(out, "page.html"), doc.html);
    fs.writeFileSync(path.join(out, "text.txt"), doc.text);
    // stylesheets the page can't read (cross-origin): fetch them through the guard
    let css = doc.css.filter((s) => s.rules !== null).map((s) => `/* ${s.href || "inline"} */\n${s.rules}`);
    const fontFaces = [...doc.fontFaces];
    for (const s of doc.css.filter((s) => s.rules === null && s.href)) {
      try {
        const txt = (await fetchGuarded(s.href, 2e6)).body.toString("utf8");
        css.push(`/* ${s.href} (fetched) */\n${txt}`);
        for (const m of txt.matchAll(/@font-face\s*{([^}]*)}/g)) fontFaces.push(parseFace(m[1], s.href));
      } catch (e) { css.push(`/* ${s.href}: not readable (${e.message}) */`); }
    }
    fs.writeFileSync(path.join(out, "styles.css"), css.join("\n\n"));
    fs.writeFileSync(path.join(out, "tokens.json"), JSON.stringify(doc.tokens, null, 1));
    fs.writeFileSync(path.join(out, "animations.json"), JSON.stringify(doc.animations, null, 1));
    const canv = await p.evaluate(() => window.__rwCanvas || []);
    const mediaOut = { lottie: [...new Set([...doc.lottie, ...media.lottie])], videos: doc.videos, canvas: { elements: doc.canvases, contexts: [...new Set(canv)] },
      webgl: canv.some((t) => /webgl/.test(t)), iframes: doc.iframes };
    fs.writeFileSync(path.join(out, "media.json"), JSON.stringify(mediaOut, null, 1));

    // fonts
    const fonts = [], seen = new Set();
    for (const f of fontFaces) for (const src of f.srcs) {
      let abs; try { abs = new URL(src, f.base || base).href; } catch { continue; }
      if (/^data:/.test(abs) || seen.has(abs) || !/^https?:/.test(abs)) continue;
      seen.add(abs);
      try {
        const { body, type } = await fetchGuarded(abs, 5e6);
        const ext = EXT[type] || path.extname(new URL(abs).pathname) || ".bin";
        const name = `${slug(f.family)}-${slug(f.weight)}${f.style === "italic" ? "-italic" : ""}${ext}`;
        fs.writeFileSync(path.join(out, "assets/fonts", name), body);
        fonts.push({ family: f.family, weight: f.weight, style: f.style, file: `assets/fonts/${name}`, from: abs, bytes: body.length });
      } catch (e) { fonts.push({ family: f.family, weight: f.weight, from: abs, error: e.message }); }
    }
    fs.writeFileSync(path.join(out, "assets/fonts/fonts.json"), JSON.stringify({ note: "Check each font's licence before using it in a film; these are the page's own files.", fonts }, null, 1));

    // images and SVGs
    const images = [];
    for (const [i, s] of doc.images.slice(0, 60).entries()) {
      try {
        const { body, type } = await fetchGuarded(s, 8e6);
        const ext = ({ "image/svg+xml": ".svg", "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "image/avif": ".avif" })[type] || ".img";
        const name = `${String(i).padStart(2, "0")}-${slug(decodeURIComponent(new URL(s).pathname.split("/").pop() || "image")).replace(/\.\w+$/, "")}${ext}`;
        fs.writeFileSync(path.join(out, "assets/images", name), body);
        images.push({ file: `assets/images/${name}`, from: s });
      } catch (e) { images.push({ from: s, error: e.message }); }
    }
    // --video: the page's own <video> files (http(s) only, 150 MB each, 6 files), through the same guard
    const videos = [];
    if (video) {
      fs.mkdirSync(path.join(out, "assets/video"), { recursive: true });
      for (const [i, v] of doc.videos.filter((v) => /^https?:/.test(v.src.split(",")[0])).slice(0, 6).entries()) {
        const s = v.src.split(",")[0];
        try {
          const { body } = await fetchGuarded(s, 150e6);
          const name = `${String(i).padStart(2, "0")}-${slug(decodeURIComponent(new URL(s).pathname.split("/").pop() || "video"))}`;
          fs.writeFileSync(path.join(out, "assets/video", name), body);
          videos.push({ file: `assets/video/${name}`, from: s, bytes: body.length });
        } catch (e) { videos.push({ from: s, error: e.message }); }
      }
      fs.writeFileSync(path.join(out, "assets/video/videos.json"), JSON.stringify(videos, null, 1));
    }
    doc.svgs.slice(0, 40).forEach((s, i) => fs.writeFileSync(path.join(out, "assets/svg", `inline-${String(i).padStart(2, "0")}.svg`), s));

    const man = {
      url: p.url().replace(/[?#].*$/, ""), captured: new Date().toISOString(), viewport: { width, height }, pageHeight: H,
      screenshots: files, fullPage: "full-page.png", contactSheet: "contact-sheet.jpg", title: doc.title,
      counts: { fonts: fonts.filter((f) => f.file).length, images: images.filter((f) => f.file).length, inlineSvgs: Math.min(40, doc.svgs.length), animations: doc.animations.running.length, keyframes: doc.animations.keyframes.length,
        videos: doc.videos.length, videoFiles: videos.filter((v) => v.file).length, canvases: doc.canvases.length, lottie: mediaOut.lottie.length },
      libraries: doc.animations.libraries, webgl: mediaOut.webgl, blocked: [...okHost].filter(([, v]) => v !== true).map(([h]) => h),
      notes: ["images.json lists every <img> source; entries with `error` were not downloaded"],
    };
    fs.writeFileSync(path.join(out, "assets/images/images.json"), JSON.stringify(images, null, 1));
    fs.writeFileSync(path.join(out, "capture.json"), JSON.stringify(man, null, 1));
    fs.writeFileSync(path.join(out, "AGENTS.md"), agentsMd(man, doc));
    return man;
  } finally { await b.close(); local?.close(); }
}

const parseFace = (decl, base) => {
  const g = (k) => (decl.match(new RegExp(`${k}\\s*:\\s*([^;]+)`, "i")) || [])[1]?.trim().replace(/^["']|["']$/g, "") || "";
  return { family: g("font-family") || "font", weight: g("font-weight") || "400", style: g("font-style") || "normal", base,
    srcs: [...(g("src")).matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]) };
};

function agentsMd(m, d) {
  return `# Capture of ${m.url}

Captured ${m.captured} by \`reelwright capture\` (read-only; only use sites you own or may use). Viewport ${m.viewport.width}x${m.viewport.height}, page height ${m.pageHeight}px.

## What is here
- \`screenshots/scroll-00.jpg\` … ${m.screenshots.length} scroll positions top to bottom; \`full-page.png\` the whole page; \`contact-sheet.jpg\` all scroll shots in one grid. **Read contact-sheet.jpg first.**
- \`page.html\` the rendered DOM (scripts removed), \`styles.css\` every stylesheet, \`text.txt\` the visible text (${d.text.split(/\\s+/).length} words).
- \`tokens.json\` colours, fonts, sizes, radii, shadows, spacing in use, plus the page's CSS custom properties. Build the film's theme from these, not from guesses.
- \`assets/fonts/\` (${m.counts.fonts} files; \`fonts.json\` has the source of each: check licences), \`assets/images/\`, \`assets/svg/\`.
- \`animations.json\` CSS animations, transitions, @keyframes and animation libraries seen (${m.libraries.join(", ") || "none"}); \`media.json\` Lottie, video, canvas/WebGL, iframes.
${m.webgl ? "\n**WebGL is used on this page.** A scroll shot shows one frame only; rebuild the effect, do not screenshot it.\n" : ""}
## Rules
- Fake numbers in a film built from this need an "Illustrative data" label; real numbers from the page need a "Source:" credit.
- Do not publish the captured text, images or fonts without the owner's permission.
- Never run a recording that performs a real write on the source site.
`;
}

// runs in the page (scrolled to the top)
function readDocument() {
  const clone = document.documentElement.cloneNode(true);
  clone.querySelectorAll("script, noscript").forEach((e) => e.remove());
  const sel = (e) => { if (e.id) return `#${CSS.escape(e.id)}`; const c = [...e.classList][0]; return e.tagName.toLowerCase() + (c ? "." + CSS.escape(c) : ""); };
  const rgba = (c) => { const m = (c || "").match(/[\d.]+/g) || []; return m.length < 3 ? null : [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1]; };
  const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const tally = (m, k, w = 1) => m.set(k, (m.get(k) || 0) + w);
  const top = (m, n = 12) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
  const shown = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05; };

  // stylesheets: rules as text; cross-origin ones can't be read here (rules: null), the caller fetches them
  const css = [], fontFaces = [], keyframes = [], vars = {};
  for (const sh of document.styleSheets) {
    let rules = null;
    try { rules = [...sh.cssRules].map((r) => r.cssText).join("\n"); } catch {}
    css.push({ href: sh.href || "", rules });
    if (rules === null) continue;
    const walk = (list) => { for (const r of list) {
      if (r.type === CSSRule.FONT_FACE_RULE) {
        const st = r.style, u = (st.getPropertyValue("src").match(/url\(\s*["']?([^"')]+)["']?\s*\)/g) || []).map((x) => x.replace(/^url\(\s*["']?|["']?\s*\)$/g, ""));
        fontFaces.push({ family: st.getPropertyValue("font-family").replace(/^["']|["']$/g, ""), weight: st.getPropertyValue("font-weight") || "400", style: st.getPropertyValue("font-style") || "normal", base: sh.href || location.href, srcs: u });
      } else if (r.type === CSSRule.KEYFRAMES_RULE) keyframes.push({ name: r.name, steps: [...r.cssRules].map((k) => k.cssText).join(" ").slice(0, 600) });
      else if (r.type === CSSRule.STYLE_RULE && /^(:root|html|body|\*)$/.test(r.selectorText.trim())) {
        for (const p of r.style) if (p.startsWith("--")) vars[p] = r.style.getPropertyValue(p).trim();
      } else if (r.cssRules) walk(r.cssRules);
    } };
    walk(sh.cssRules);
  }

  const ink = new Map(), bg = new Map(), accent = new Map(), fam = new Map(), size = new Map(), radius = new Map(), shadow = new Map(), space = new Map();
  const sat = (c) => (Math.max(...c.slice(0, 3)) - Math.min(...c.slice(0, 3))) / 255;
  for (const e of document.body.querySelectorAll("*")) {
    if (!shown(e)) continue;
    const s = getComputedStyle(e), own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ");
    const b = rgba(s.backgroundColor), r = e.getBoundingClientRect();
    if (b && b[3] > 0.5) tally(bg, hex(b), Math.sqrt(r.width * r.height));
    if (own) {
      const c = rgba(s.color); if (c && c[3] > 0.5) { tally(ink, hex(c), own.length); if (sat(c) > 0.25) tally(accent, hex(c), own.length * 0.5); }
      tally(fam, s.fontFamily.split(",")[0].trim().replace(/["']/g, ""), own.length); tally(size, s.fontSize, own.length);
    }
    if (b && b[3] > 0.5 && sat(b) > 0.25 && e.matches("a, button, [role=button]")) tally(accent, hex(b), Math.sqrt(r.width * r.height));
    if (parseFloat(s.borderTopLeftRadius) > 0) tally(radius, s.borderTopLeftRadius);
    if (s.boxShadow !== "none") tally(shadow, s.boxShadow);
    for (const p of ["paddingTop", "paddingLeft", "marginTop", "gap"]) { const v = s[p]; if (v && v !== "0px" && v !== "normal") tally(space, v); }
  }
  const tokens = { cssVariables: vars, colors: { background: top(bg), text: top(ink), accent: top(accent) }, fontFamilies: top(fam, 6), fontSizes: top(size), radii: top(radius, 6), shadows: top(shadow, 6), spacing: top(space) };

  // animations: what is running at this moment, what the CSS declares, and libraries by their globals
  const running = document.getAnimations().slice(0, 80).map((a) => ({ type: a.constructor.name, name: a.animationName || a.transitionProperty || a.id || "", target: a.effect?.target ? sel(a.effect.target) : "",
    duration: a.effect?.getTiming().duration, iterations: a.effect?.getTiming().iterations, state: a.playState }));
  const declared = [], transitions = new Map();
  for (const e of document.body.querySelectorAll("*")) {
    const s = getComputedStyle(e);
    if (s.animationName !== "none") declared.push({ target: sel(e), animation: `${s.animationName} ${s.animationDuration} ${s.animationTimingFunction} ${s.animationIterationCount}` });
    if (s.transitionDuration !== "0s") tally(transitions, `${s.transitionProperty} ${s.transitionDuration} ${s.transitionTimingFunction}`);
  }
  const W = window, libs = [["gsap", !!W.gsap], ["ScrollTrigger", !!W.ScrollTrigger], ["lottie", !!(W.lottie || W.bodymovin)], ["three", !!W.THREE], ["pixi", !!W.PIXI], ["anime", !!W.anime],
    ["AOS", !!W.AOS], ["Lenis", !!W.Lenis], ["framer-motion", !!document.querySelector("[data-framer-appear-id], [data-projection-id]")], ["swiper", !!W.Swiper],
    ["next", !!W.__NEXT_DATA__], ["webflow", !!W.Webflow], ["barba", !!W.barba]].filter(([, y]) => y).map(([k]) => k);
  const animations = { libraries: libs, running, declared: declared.slice(0, 120), transitions: top(transitions, 20), keyframes };

  const imgs = [...new Set([...document.images].map((i) => i.currentSrc || i.src).filter((s) => /^https?:/.test(s)))];
  return {
    title: document.title.trim(), html: "<!doctype html>\n" + clone.outerHTML, text: document.body.innerText.replace(/\n{3,}/g, "\n\n"), css, fontFaces, tokens, animations,
    images: imgs, svgs: [...document.querySelectorAll("svg")].map((s) => { const c = s.cloneNode(true); if (!c.getAttribute("xmlns")) c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); return c.outerHTML; }).filter((s) => s.length > 120),
    lottie: [...document.querySelectorAll("lottie-player, dotlottie-player, dotlottie-wc, [data-animation-path], .lottie")].map((e) => e.getAttribute("src") || e.getAttribute("data-animation-path") || sel(e)),
    videos: [...document.querySelectorAll("video")].map((v) => ({ src: v.currentSrc || v.src || [...v.querySelectorAll("source")].map((s) => s.src).join(","), poster: v.poster, duration: Number.isFinite(v.duration) ? +v.duration.toFixed(2) : null, loop: v.loop, muted: v.muted, autoplay: v.autoplay })),
    canvases: [...document.querySelectorAll("canvas")].map((c) => ({ target: sel(c), width: c.width, height: c.height })),
    iframes: [...document.querySelectorAll("iframe")].map((f) => f.src).filter(Boolean),
  };
}
