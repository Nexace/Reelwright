// node tools/preview.mjs <project>  → live scrubber on http://localhost:4173 (PORT=…), page tools/preview.html.
// Serves the repo root, so the film's ../../../tools/ paths resolve. fs.watch on the project and the kit sends an SSE
// event; the page reloads and returns to the same t. Look: same as render.mjs (project.json "style", --style, brand.json).
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeTheme } from "./theme.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIR = path.resolve(process.argv[2] || "projects/example");
const PORT = Number(process.env.PORT || 4173);
const KIT = ["engine.js", "kit.css", "layouts.js"];
const posix = (p) => p.split(path.sep).join("/");
const project = () => JSON.parse(fs.readFileSync(path.join(DIR, "project.json"), "utf8"));
const hf = () => project().renderer === "hyperframes";

// what render.mjs does before a render: theme.css, and for HyperFrames the kit copied into hf/kit/
function prepare() {
  // theme.mjs exits on a bad style or brand.json (it prints why); here that's an error to fix, not the end of preview
  const exit = process.exit;
  process.exit = () => { throw new Error("theme.css not updated: fix the error above"); };
  try {
    const P = project();
    writeTheme(DIR, P);
    if (P.renderer === "hyperframes") {
      fs.mkdirSync(path.join(DIR, "hf", "kit"), { recursive: true });
      for (const f of KIT) fs.copyFileSync(path.join(ROOT, "tools", f), path.join(DIR, "hf", "kit", f));
    }
  } catch (e) { console.error(e.message); } finally { process.exit = exit; }
}
prepare();

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf", ".mp4": "video/mp4", ".webm": "video/webm" };
const clients = new Set();

const HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);   // no DNS rebinding: other sites can't read the repo

http.createServer((req, res) => {
  if (!HOSTS.has(req.headers.host)) { res.writeHead(403); return res.end(); }
  try { serve(req, res); } catch (e) { res.writeHead(e instanceof URIError ? 400 : 500); res.end(e.message); }
}).on("error", (e) => { console.error(e.code === "EADDRINUSE" ? `port ${PORT} is busy: PORT=<n> reelwright preview` : e.message); process.exit(1); })
  .listen(PORT, "127.0.0.1", () => console.log(`preview of ${posix(path.relative(ROOT, DIR))}: http://localhost:${PORT}/  (ctrl-c to stop)`));

function serve(req, res) {
  const u = new URL(req.url, "http://localhost");
  if (u.pathname === "/") { res.writeHead(302, { location: "/tools/preview.html" }); return res.end(); }
  if (u.pathname === "/__project") {
    const P = project(), dir = posix(path.relative(ROOT, DIR));
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    return res.end(JSON.stringify({ dir, page: `/${dir}/${hf() ? "hf" : "film"}/index.html`, width: P.width || 1920,
      height: P.height || 1080, fps: Number(P.fps || 60), title: P.title || dir }));
  }
  if (u.pathname === "/__events") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store" });
    res.write(": hello\n\n"); clients.add(res); req.on("close", () => clients.delete(res));
    return;
  }
  const f = path.join(ROOT, decodeURIComponent(u.pathname));
  if (f !== ROOT && !f.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
  if (hf() && f === path.join(DIR, "hf", "index.html") && fs.existsSync(f)) {
    // the HyperFrames producer compiles this rule into the page it renders (injectTextRenderingRule); text metrics
    // and glyph edges follow it, so the preview gets it too
    res.writeHead(200, { "content-type": TYPES[".html"], "cache-control": "no-store" });
    return res.end(fs.readFileSync(f, "utf8").replace(/<head[^>]*>/i,
      (h) => h + "<style data-hyperframes-text-rendering>html,body,*{text-rendering:geometricPrecision}</style>"));
  }
  fs.stat(f, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": TYPES[path.extname(f).toLowerCase()] || "application/octet-stream",
      "content-length": st.size, "cache-control": "no-store" });
    fs.createReadStream(f).pipe(res);
  });
}

// changes → one debounced event listing the files; build output is ignored
const SKIP = /^(frames|stills|out|\.cache)([-/]|$)|^hf\/kit\/|\.(mp4|tmp)$/;
let pending = new Set(), timer = null;
function changed(rel) {
  if (!rel || SKIP.test(rel)) return;
  pending.add(rel);
  clearTimeout(timer);
  timer = setTimeout(() => {
    const files = [...pending]; pending = new Set();
    // the look or the kit moved: redo what render.mjs would (writes theme.css / hf/kit, which reload the page anyway)
    if (files.some((f) => /^(project|brand)\.json$|^(tools|themes)\//.test(f))) prepare();
    console.log("changed:", files.join(", "));
    for (const c of clients) c.write(`data: ${JSON.stringify({ files })}\n\n`);
  }, 150);
}
fs.watch(DIR, { recursive: true }, (_, f) => changed(f && posix(f)));
fs.watch(path.join(ROOT, "tools"), (_, f) => KIT.includes(f) && changed("tools/" + f));
fs.watch(path.join(ROOT, "themes"), (_, f) => f && f.endsWith(".css") && changed("themes/" + f));
