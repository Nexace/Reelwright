// embed [project] [--out <file.html>]   one self-contained preview page → <project>/out/embed.html (sched runs first):
//                  the film page with every script, style, font, image and block inlined, played by the vendored
//                  HyperFrames player (vendor/hf-player/) with mix.wav as audio. Works offline, from file://, in the
//                  desktop app's side panel or published as an artifact; add #12.5 to the URL to open at a moment.
//                  Prints any file the page still asks the network for (then the preview misses it).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const FAKE = "https://reelwright.invalid/";   // the film page's <base>: relative URLs resolve here, then map to data: URIs
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
  ".otf": "font/otf", ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg", ".m4a": "audio/mp4",
  ".wav": "audio/wav", ".txt": "text/plain" };
const TEXT = new Set([".html", ".css", ".svg"]);
const rel = (f) => path.relative(ROOT, f).split(path.sep).join("/");
const uri = (f, buf = fs.readFileSync(f)) => `data:${TYPES[path.extname(f).toLowerCase()] || "application/octet-stream"};base64,${buf.toString("base64")}`;
const local = (u) => !/^(data:|blob:|https?:|about:|#|\/\/)/i.test(u);
const noClose = (s) => s.replace(/<\/script/gi, "<\\/script");

// url(...) inside CSS → data: URIs, relative to the CSS file's folder; a missing file (KaTeX's .woff/.ttf fallbacks)
// becomes an empty data: URI, so nothing ever reaches for the network
const cssInline = (css, dir) => css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => {
  if (!local(u)) return m;
  const f = path.resolve(dir, u.split(/[?#]/)[0]);
  return fs.existsSync(f) && fs.statSync(f).isFile() ? `url("${uri(f)}")` : `url("data:,")`;
});

// the film page as one string: <script src> and <link rel=stylesheet> inlined, static src="…" mapped from `assets`
function inlinePage(file, assets) {
  const dir = path.dirname(file);
  let h = fs.readFileSync(file, "utf8");
  h = h.replace(/<script\b([^>]*?)\bsrc="([^"]+)"([^>]*)>\s*<\/script>/gi, (m, a, u, b) => {
    const f = path.resolve(dir, u);
    return local(u) && fs.existsSync(f) ? `<script${a}${b}>${noClose(fs.readFileSync(f, "utf8"))}\n</script>` : m;
  });
  h = h.replace(/<link\b[^>]*>/gi, (m) => {
    const u = /\bhref="([^"]+)"/i.exec(m)?.[1], f = u && path.resolve(dir, u);
    if (!/\brel="?stylesheet/i.test(m) || !u || !local(u) || !fs.existsSync(f)) return m;
    return `<style>${cssInline(fs.readFileSync(f, "utf8"), path.dirname(f)).replace(/<\/style/gi, "<\\/style")}</style>`;
  });
  h = h.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (m, a, css) => `<style${a}>${cssInline(css, dir)}</style>`);
  h = staticSrc(h, dir, assets);
  return h;
}
// src="…" / href="…" on media in HTML text (the page, or a block it fetches) → the data: URI the sweep found
const staticSrc = (h, dir, assets) => h.replace(/\b(src|poster)="([^"]+)"/gi, (m, a, u) => {
  const k = local(u) && rel(path.resolve(dir, u.split(/[?#]/)[0]));
  return k && assets[k] ? `${a}="${assets[k]}"` : m;
});

// runs in the film page before anything else: <img>/<video>/<audio>/<source>.src, XHR (KIT.block) and fetch get the
// data: URI of a file the build found; anything else resolves against FAKE and fails (the verify step lists those)
// The comment stops the player putting its runtime (<script src=…/hyperframe.runtime.iife.js>, from jsdelivr) into a
// srcdoc: it skips a document that already names that file. The film plays through __timelines.main instead.
const SHIM = (assets, base) => `<!-- no hyperframe.runtime.iife.js here: the player drives window.__timelines.main -->
<base href="${FAKE}${base}/">
<script>/* reelwright embed: local files → data: URIs (tools/commands/embed.mjs) */
(() => { const A = ${JSON.stringify(assets).replace(/</g, "\\u003c")}, O = ${JSON.stringify(FAKE)};
  const map = (v) => { try { const u = new URL(v, document.baseURI).href; return (u.startsWith(O) && A[decodeURIComponent(u.slice(O.length).split(/[?#]/)[0])]) || v; } catch { return v; } };
  for (const C of [HTMLImageElement, HTMLMediaElement, HTMLSourceElement]) {
    const d = Object.getOwnPropertyDescriptor(C.prototype, "src");
    Object.defineProperty(C.prototype, "src", { ...d, set(v) { d.set.call(this, map(v)); } });
  }
  const sa = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (n, v) { return sa.call(this, n, /^(src|poster)$/i.test(n) ? map(String(v)) : v); };
  // XHR (KIT.block's sync GET) and fetch are answered here: an artifact's CSP blocks connecting even to data: URIs
  const bytes = (d) => Uint8Array.from(atob(d.slice(d.indexOf(",") + 1)), (c) => c.charCodeAt(0));
  const X = XMLHttpRequest.prototype, op = X.open, se = X.send;
  X.open = function (m, u, ...r) { const d = map(String(u)); this.__rw = d.startsWith("data:") ? d : null; return op.call(this, m, u, ...r); };
  X.send = function (...a) {
    if (!this.__rw) return se.apply(this, a);
    const text = new TextDecoder().decode(bytes(this.__rw));
    for (const [k, v] of [["readyState", 4], ["status", 200], ["responseText", text], ["response", text]]) Object.defineProperty(this, k, { value: v });
    for (const e of ["readystatechange", "load", "loadend"]) this.dispatchEvent(new Event(e));
  };
  const f = window.fetch;
  window.fetch = (u, ...r) => { const d = typeof u === "string" ? map(u) : u;
    return typeof d === "string" && d.startsWith("data:") ? Promise.resolve(new Response(bytes(d), { headers: { "content-type": d.slice(5, d.search(/[;,]/)) } })) : f(u, ...r); };
  // The player's probe starts on the iframe's first (about:blank) load; if it sees __timelines after 5 polls (1 s, a big
  // page still parsing) it injects its runtime from jsdelivr. So main stays hidden from Object.keys until this page's
  // load, which restarts the probe: it then finds main on its first poll.
  let m; const TL = window.__timelines = {};
  Object.defineProperty(TL, "main", { get: () => m, set: (v) => { m = v; }, enumerable: false, configurable: true });
  addEventListener("load", () => Object.defineProperty(TL, "main", { value: m, writable: true, enumerable: true, configurable: true }));
})();
</script>`;

// after the film: engine.js's __timelines.main only seeks (renders don't play); the player wants play()/pause() to run a
// clock, so give it one. Preview only: renders never load this page.
const CLOCK = `<script>/* reelwright embed: real-time play() for the player */
(() => { const wrap = () => { const T = window.__timelines && window.__timelines.main; if (!T || T.__rw) return; T.__rw = 1;
  const S = T.seek; let raf = 0, t0 = 0, w0 = 0;
  const tick = () => { const t = Math.min(T.duration(), w0 + (performance.now() - t0) / 1000); S(t); raf = t < T.duration() ? requestAnimationFrame(tick) : 0; };
  T.seek = (t) => { w0 = t; t0 = performance.now(); S(t); };
  T.play = () => { cancelAnimationFrame(raf); w0 = T.time(); t0 = performance.now(); raf = requestAnimationFrame(tick); };
  T.pause = () => { cancelAnimationFrame(raf); raf = 0; }; };
  wrap(); addEventListener("load", wrap); })();
</script>`;

// no network at all, as in an artifact (the film's srcdoc frame inherits it): what plays here plays there
const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; " +
  "media-src data: blob:; font-src data:; frame-src 'self' about: data: blob:";
const shell = ({ title, W, H, film, audio }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${title.replace(/</g, "&lt;")}</title>
<!-- made by reelwright embed (tools/commands/embed.mjs); player: HyperFrames player 0.9.19, Apache-2.0, Copyright 2026
     HeyGen, Inc. (vendor/hf-player/LICENSE) -->
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; height: 100%; background: #0b0b0c; }
  body { display: grid; place-items: center; }
  hyperframes-player { display: block; width: min(100vw, calc(100vh * ${W} / ${H})); aspect-ratio: ${W} / ${H}; }
</style>
<script>${noClose(fs.readFileSync(path.join(ROOT, "vendor/hf-player/hyperframes-player.global.js"), "utf8"))}
</script></head>
<body>
<hyperframes-player id="film" width="${W}" height="${H}" controls loop muted autoplay${audio ? ` audio-src="${audio}"` : ""}></hyperframes-player>
<script>
  const p = document.getElementById("film");
  p.setAttribute("srcdoc", ${JSON.stringify(film).replace(/</g, "\\u003c")});
  const at = parseFloat(location.hash.slice(1));   // embed.html#12.5 opens paused at 12.5 s
  if (at >= 0) { p.removeAttribute("autoplay"); p.addEventListener("ready", () => { p.pause(); p.seek(at); }, { once: true }); }
</script>
</body></html>
`;

// every local file the film asks for while it plays (images, clip frames, blocks), seen from a real browser
async function sweep(page, fps) {
  const { launch } = await import(pathToFileURL(path.join(ROOT, "tools/browser.mjs")).href);
  const browser = await launch(["--allow-file-access-from-files"]);
  const seen = new Set();
  try {
    const p = await browser.newPage();
    p.on("request", (r) => { if (r.url().startsWith("file:")) seen.add(fileURLToPath(r.url().split(/[?#]/)[0])); });
    await p.goto(pathToFileURL(page).href);
    await p.waitForFunction(() => window.READY, null, { timeout: 30000 });
    const { dur, clip } = await p.evaluate(async () => {
      await window.READY;
      const C = window.CLIP;   // a recorded take: every frame, also ones the sweep steps over
      return { dur: window.FILM.DUR, clip: C ? C.files.map((f) => C.dir + f) : [] };
    });
    for (const u of clip) seen.add(path.resolve(path.dirname(page), u));
    const step = 1 / Math.min(fps, 30);
    for (let t = 0; t <= dur + 1e-6; t += step) await p.evaluate((x) => window.render(x), t);
  } finally { await browser.close(); }
  return [...seen].filter((f) => f.startsWith(ROOT + path.sep) && fs.existsSync(f) && fs.statSync(f).isFile());
}

// the written page in a browser: it must become ready, and play with no network request
async function verify(out) {
  const { launch } = await import(pathToFileURL(path.join(ROOT, "tools/browser.mjs")).href);
  const browser = await launch();
  const misses = new Set(), errors = [];
  try {
    const p = await browser.newPage();
    p.on("request", (r) => { if (!/^(data|blob|about):/.test(r.url()) && !r.url().startsWith(pathToFileURL(out).href)) misses.add(r.url()); });
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(pathToFileURL(out).href);
    const r = await p.evaluate(() => new Promise((ok) => {
      const pl = document.getElementById("film");
      const done = (x) => ok(x);
      if (pl.ready) return done({ duration: pl.duration });
      pl.addEventListener("ready", (e) => done({ duration: e.detail.duration }), { once: true });
      pl.addEventListener("error", (e) => done({ error: e.detail.message }), { once: true });
      setTimeout(() => done({ error: "player not ready after 20 s" }), 20000);
    }));
    if (r.error) errors.push(r.error);
    else {   // seek through, then check the clock runs
      for (let i = 0; i <= 8; i++) await p.evaluate((x) => document.getElementById("film").seek(x), (r.duration * i) / 8);
      const moved = await p.evaluate(() => new Promise((ok) => {
        const pl = document.getElementById("film"); pl.seek(0); pl.play();
        setTimeout(() => { const t = pl.currentTime; pl.pause(); ok(t); }, 700);
      }));
      if (!(moved > 0.2)) errors.push(`play() did not advance (t = ${moved})`);
    }
    return { ...r, misses: [...misses], errors };
  } finally { await browser.close(); }
}

export async function embed(dir, { out } = {}) {
  const P = JSON.parse(fs.readFileSync(path.join(dir, "project.json"), "utf8"));
  const hf = P.renderer === "hyperframes";
  const page = path.join(dir, hf ? "hf/index.html" : "film/index.html");
  const [W, H] = (process.env.REELWRIGHT_SIZE || `${P.width || 1920}x${P.height || 1080}`).split("x").map(Number);
  // what render.mjs does before a render: theme.css, and for HyperFrames the kit copied into hf/kit/
  const { writeTheme } = await import(pathToFileURL(path.join(ROOT, "tools/theme.mjs")).href);
  const { copyKit } = await import(pathToFileURL(path.join(ROOT, "tools/kit_files.mjs")).href);
  writeTheme(dir, P);
  if (hf) copyKit(path.join(dir, "hf"));

  const files = await sweep(page, Number(P.fps || 60));
  const assets = {};
  // scripts, stylesheets and their fonts are inlined into the page itself; binary files first, so a block's (or an
  // SVG's) own src="…" can point at them
  const ext = (f) => path.extname(f).toLowerCase();
  const keep = files.filter((f) => f !== page && ![".js", ".css", ".woff2", ".woff", ".ttf", ".otf"].includes(ext(f)));
  // over ~10 MB (base64 adds a third; artifacts take 16): stills and clip frames at half size as JPEG, which is plenty for a preview
  const big = keep.reduce((n, f) => n + fs.statSync(f).size, 0) > 10 * 1048576, tmp = fs.mkdtempSync(path.join(os.tmpdir(), "embed-"));
  let shrunk = 0;
  for (const f of keep) if (!TEXT.has(ext(f))) {
    const j = path.join(tmp, "s.jpg");
    const ok = big && [".jpg", ".jpeg", ".png"].includes(ext(f)) &&
      spawnSync("ffmpeg", ["-v", "error", "-y", "-i", f, "-vf", "scale=trunc(iw/4)*2:-2", "-q:v", "5", j]).status === 0;
    assets[rel(f)] = ok ? uri(j) : uri(f);
    shrunk += ok;
  }
  for (const f of keep) if (TEXT.has(ext(f))) assets[rel(f)] = uri(f, Buffer.from(staticSrc(fs.readFileSync(f, "utf8"), path.dirname(f), assets)));
  let film = inlinePage(page, assets);
  film = film.replace(/<head[^>]*>/i, (h) => h + SHIM(assets, rel(path.dirname(page))) +
    // what the HyperFrames producer compiles into the page it renders, as preview.mjs does
    (hf ? "<style data-hyperframes-text-rendering>html,body,*{text-rendering:geometricPrecision}</style>" : ""));
  film = film.replace(/<\/body>/i, CLOCK + "</body>");

  let audio = "";
  const mix = path.join(dir, "mix.wav");
  if (fs.existsSync(mix)) {   // AAC keeps the page small; the wav itself if ffmpeg can't
    const m4a = path.join(tmp, "mix.m4a");
    const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", mix, "-c:a", "aac", "-b:a", "128k", m4a]);
    audio = uri(r.status === 0 ? m4a : mix);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  out = path.resolve(out || path.join(dir, "out", "embed.html"));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, shell({ title: P.title || path.basename(dir), W, H, film, audio }));
  return { out, size: fs.statSync(out).size, assets: Object.keys(assets).length, shrunk, audio: !!audio, ...(await verify(out)) };
}

export default async ({ proj, args, step, py }) => {
  const o = args.indexOf("--out"), out = o >= 0 ? args.splice(o, 2)[1] : undefined;
  step("sched"); py("sched.py");
  step("embed");
  const r = await embed(path.resolve(proj), { out });
  const mb = (r.size / 1048576).toFixed(1);
  console.log(`${path.relative(process.cwd(), r.out)}  ${mb} MB, ${r.assets} files inlined${r.shrunk ? ` (${r.shrunk} at half size)` : ""}, ${r.audio ? "audio: mix.wav" : "no audio (run: reelwright audio " + path.basename(proj) + ")"}` +
    (r.duration ? `, ${r.duration.toFixed(2)} s` : ""));
  for (const u of r.misses.slice(0, 8)) console.log(`  WARN  embed: the page asks the network for ${u}`);
  for (const e of r.errors) console.log(`  WARN  embed: ${e}`);
  if (r.size > 16 * 1048576) console.log(`  WARN  embed: over 16 MB, too big to publish as an artifact (open it locally)`);
  if (r.errors.length) process.exit(1);
};
