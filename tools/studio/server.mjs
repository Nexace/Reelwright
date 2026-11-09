// The studio's server (reelwright studio → tools/commands/studio.mjs). Plain node:http, no framework, no new dependency.
//
// Trust boundary, in the order a request meets it (docs/playbook/studio.md has the prose):
//   1. listens on 127.0.0.1 only, and every request's Host must be localhost:PORT / 127.0.0.1:PORT (no DNS rebinding:
//      another site can't read the repo or the project through the user's browser);
//   2. the only state-changing routes are POST /__save and POST /__run, and they need `content-type: application/json`
//      AND an Origin equal to the studio's own origin (a cross-site page can send neither: it can't write, and with the
//      Host check it can't read either);
//   3. writes touch exactly <project>/project.json and <project>/brand.json, validated, atomically (tmp + rename);
//   4. jobs run only from a fixed allow-list of repo commands, via spawn(process.execPath, [...]) with no shell and a
//      numeric-only argument; one at a time (409 while busy);
//   5. static GET is read-only, from the repo root (and the project folder when it lives outside it), path traversal
//      and dot-folders (.git, .reelwright/credentials.json, .env) refused.
// The studio edits data (project.json, brand.json). It never writes film.js or any animation code.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { themes, writeTheme } from "../theme.mjs";
import { copyKit, kitFiles } from "../kit_files.mjs";
import { HIDE, CLOCK, TEXT_RULE } from "./shims.mjs";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf", ".mp4": "video/mp4", ".webm": "video/webm" };
const MAX_BODY = 2 * 1048576;
const posix = (p) => p.split(path.sep).join("/");
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const num = (v, lo, hi) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;
// changes that are only a build writing its own output: never a reason to reload the page
const SKIP = /^(frames|stills|out|\.cache)([-/]|$)|^hf\/kit\/|(^|\/)theme\.css$|^timeline\.json$|\.(mp4|tmp)$/;
// jobs that change what the film is made from (the page reloads when they end); the others only write stills/out/…
const INPUT_JOBS = new Set(["sched", "audio"]);

export function startStudio({ ROOT, DIR, port }) {
  ROOT = fs.realpathSync(ROOT); DIR = fs.realpathSync(DIR);
  const inRoot = DIR.startsWith(ROOT + path.sep);
  // a project outside the repo (a temp folder) is served under /__p/; inside, under its own repo path as preview.mjs does
  const mount = inRoot ? "/" + posix(path.relative(ROOT, DIR)) : "/__p";
  const readProject = () => JSON.parse(fs.readFileSync(path.join(DIR, "project.json"), "utf8"));
  const isHf = (P) => P.renderer === "hyperframes";
  const inside = (p) => { const f = path.resolve(DIR, p); return f === DIR || f.startsWith(DIR + path.sep); };
  const reply = (res, code, obj) => {
    res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(obj));
  };

  // ── what render.mjs does before a render: theme.css, and for HyperFrames the kit copied into hf/kit/ ──
  // theme.mjs exits on a bad style or brand.json (and prints why): here that's text for the log pane, not the end of the studio
  function prepare() {
    const lines = [], ce = console.error, exit = process.exit;
    console.error = (...a) => lines.push(a.join(" "));
    process.exit = () => { throw new Error("theme.css not updated"); };
    try {
      const P = readProject();
      writeTheme(DIR, P);
      if (isHf(P)) copyKit(path.join(DIR, "hf"));
    } catch (e) { lines.push(e.message); } finally { console.error = ce; process.exit = exit; }
    return lines.join("\n");
  }
  prepare();

  // ── validation: what a save may write ──
  function checkProject(P) {
    if (!Array.isArray(P.lines)) return "project.json: \"lines\" must be an array of { id, text }";
    const seen = new Set();
    for (const l of P.lines) {
      if (!isObj(l) || typeof l.id !== "string" || typeof l.text !== "string") return "project.json: every line needs a string id and text";
      if (!/^[\w-]+$/.test(l.id)) return `project.json: line id "${l.id}" must be letters, digits, _ or - (it names files in vo/)`;
      if (seen.has(l.id)) return `project.json: duplicate line id "${l.id}"`;
      seen.add(l.id);
      if ("gap" in l && !num(l.gap, 0, 60)) return `project.json: line "${l.id}" gap must be a number from 0 to 60`;
    }
    if ("style" in P && !(typeof P.style === "string" && themes().includes(P.style))) return `project.json: unknown style (have: ${themes().join(", ")})`;
    if ("fps" in P && !num(P.fps, 1, 240)) return "project.json: fps must be a number from 1 to 240";
    for (const k of ["width", "height"]) if (k in P && !(Number.isInteger(P[k]) && P[k] > 0 && P[k] <= 8192)) return `project.json: ${k} must be a whole number`;
    if ("renderer" in P && !(typeof P.renderer === "string" && /^[\w-]+$/.test(P.renderer))) return "project.json: renderer must be a name";
    if ("out" in P && !(typeof P.out === "string" && inside(P.out))) return "project.json: out must be a path inside the project";
    return null;
  }
  // theme.mjs reads brand.json's logo and font files and copies them under the page: keep them inside the project
  function checkBrand(B) {
    if ("logo" in B && !(typeof B.logo === "string" && inside(B.logo))) return "brand.json: logo must be a file inside the project";
    for (const [role, f] of Object.entries(isObj(B.fonts) ? B.fonts : {}))
      if (isObj(f) && !(typeof f.src === "string" && inside(f.src))) return `brand.json: fonts.${role}.src must be a file inside the project`;
    return null;
  }
  const FILES = { project: ["project.json", checkProject], brand: ["brand.json", checkBrand] };

  // ── jobs: the allow-list. One at a time; output tail goes to every open page ──
  const clients = new Set();
  const send = (o) => { for (const c of clients) c.write(`data: ${JSON.stringify(o)}\n\n`); };
  const bin = path.join(ROOT, "bin", "reelwright.mjs");
  const JOBS = {
    sched: () => [bin, "sched", DIR],
    audio: () => [bin, "audio", DIR],                                       // network: edge-tts
    stills: (t) => [bin, "stills", DIR, ...(t == null ? [] : [String(t)])], // t: a validated number, the only extra argument
    taste: () => [path.join(ROOT, "tools", "checks", "taste.page.mjs"), DIR],
    embed: () => [bin, "embed", DIR],
  };
  let job = null, child = null, lastJobEnd = 0;
  const results = { still: null, sheet: null, embed: null };               // survive a page reload
  const url = (f) => `${mount}/${posix(path.relative(DIR, f))}?v=${fs.statSync(f).mtimeMs | 0}`;
  function finishJob(kind, t) {
    const out = path.join(DIR, "stills");
    if (kind === "stills" && job.code === 0) {
      // `stills` clears stills/ first, so each run replaces the other's files
      results.sheet = results.still = null;
      if (t == null) { const s = path.join(out, "sheet.jpg"); if (fs.existsSync(s)) results.sheet = url(s); }
      else {
        const f = fs.existsSync(out) && fs.readdirSync(out).filter((x) => /^t.*\.jpg$/.test(x)).sort()[0];
        if (f) results.still = { url: url(path.join(out, f)), t };
      }
    }
    if (kind === "embed" && job.code === 0 && fs.existsSync(path.join(DIR, "out", "embed.html"))) results.embed = url(path.join(DIR, "out", "embed.html"));
  }
  function runJob(kind, t) {
    if (job && job.state === "running") return false;
    job = { cmd: kind === "stills" && t == null ? "contact sheet" : kind, state: "running", code: null, out: "" };
    const note = (s) => { job.out = (job.out + s.replace(ANSI, "")).slice(-8000); send({ job }); };
    child = spawn(process.execPath, JOBS[kind](t), { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    child.stdout.on("data", (d) => note(String(d)));
    child.stderr.on("data", (d) => note(String(d)));
    const end = (code, why) => {
      if (job.state !== "running") return;   // 'error' then 'close' both fire for a failed spawn
      job.state = "done"; job.code = code; if (why) job.out += `\n${why}`;
      child = null; lastJobEnd = Date.now();
      try { finishJob(kind, t); } catch (e) { job.out += `\n${e.message}`; }
      send({ job, results });
      // the files the job wrote reach the page as one reload, after the watcher has seen them (flush() ignores a
      // render's own writes unless the job changes the film's inputs); edits made while it ran are released here too
      schedule(300);
    };
    child.on("error", (e) => end(1, `could not start: ${e.message}`));
    child.on("close", (code) => end(code ?? 1));
    send({ job });
    return true;
  }

  // ── static files and the page ──
  function resolveStatic(pathname) {
    let p = decodeURIComponent(pathname), base = ROOT;
    if (p.includes("\0")) return null;
    if (!inRoot && (p === "/__p" || p.startsWith("/__p/"))) { base = DIR; p = p.slice(4); }
    const f = path.join(base, p);
    if (f !== base && !f.startsWith(base + path.sep)) return null;
    if (posix(path.relative(base, f)).split("/").some((s) => s.startsWith("."))) return null;   // .git, .env, .reelwright/
    return f;
  }
  function info() {
    const text = fs.readFileSync(path.join(DIR, "project.json"), "utf8"), P = JSON.parse(text);
    const brand = path.join(DIR, "brand.json"), mix = path.join(DIR, "mix.wav");
    let voiced = null;
    try { voiced = JSON.parse(fs.readFileSync(path.join(DIR, "vo", "lines.json"), "utf8")); } catch { /* not voiced yet */ }
    return { dir: inRoot ? posix(path.relative(ROOT, DIR)) : DIR, page: `${mount}/${isHf(P) ? "hf" : "film"}/index.html`,
      width: P.width || 1920, height: P.height || 1080, fps: Number(P.fps || 60), title: P.title || path.basename(DIR),
      themes: themes(), project: text, brand: fs.existsSync(brand) ? fs.readFileSync(brand, "utf8") : null,
      mix: fs.existsSync(mix) ? url(mix) : null,
      // lines whose text differs from the one the voiceover was made from (vo/lines.json keeps it): need `audio`
      stale: (P.lines || []).filter((l) => !voiced || !voiced[l.id] || voiced[l.id].text !== l.text).map((l) => l.id),
      job, results };
  }
  function serve(req, res) {
    const u = new URL(req.url, "http://localhost");
    if (u.pathname === "/__save" || u.pathname === "/__run") return reply(res, 405, { error: "POST only" });
    if (req.method !== "GET") return reply(res, 405, { error: "GET only" });
    if (u.pathname === "/") { res.writeHead(302, { location: "/tools/studio/studio.html" }); return res.end(); }
    if (u.pathname === "/__studio") return reply(res, 200, info());
    if (u.pathname === "/__events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store" });
      res.write(": hello\n\n"); clients.add(res); req.on("close", () => clients.delete(res));
      return;
    }
    const f = resolveStatic(u.pathname);
    if (!f) { res.writeHead(403); return res.end("forbidden"); }
    let P = null; try { P = readProject(); } catch { /* served as a plain file */ }
    if (P && f === path.join(DIR, isHf(P) ? "hf" : "film", "index.html") && fs.existsSync(f)) {
      // the film page gets the player shims (tools/studio/shims.mjs); for HyperFrames also the producer's text rule
      res.writeHead(200, { "content-type": TYPES[".html"], "cache-control": "no-store" });
      return res.end(fs.readFileSync(f, "utf8").replace(/<head[^>]*>/i, (h) => h + (isHf(P) ? TEXT_RULE : "") + HIDE)
        .replace(/<\/body>/i, () => CLOCK + "</body>"));
    }
    fs.stat(f, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); return res.end("not found"); }
      res.writeHead(200, { "content-type": TYPES[path.extname(f).toLowerCase()] || "application/octet-stream",
        "content-length": st.size, "cache-control": "no-store" });
      fs.createReadStream(f).pipe(res);
    });
  }

  // ── POST /__save, POST /__run ──
  function save(res, b) {
    const spec = FILES[b.file];
    if (!spec || typeof b.text !== "string") return reply(res, 400, { error: "file must be \"project\" or \"brand\", text a string" });
    let obj;
    try { obj = JSON.parse(b.text); } catch (e) { return reply(res, 400, { error: `not valid JSON: ${e.message}` }); }
    if (!isObj(obj)) return reply(res, 400, { error: `${spec[0]} must be a JSON object` });
    const bad = spec[1](obj);
    if (bad) return reply(res, 400, { error: bad });
    if (job && job.state === "running") return reply(res, 409, { error: `busy: ${job.cmd} is running` });
    // tmp file in the project folder, then rename: a reader never sees half a file
    const target = path.join(DIR, spec[0]), tmp = path.join(DIR, `.${spec[0]}.${process.pid}.tmp`);
    try { fs.writeFileSync(tmp, b.text.endsWith("\n") ? b.text : b.text + "\n"); fs.renameSync(tmp, target); }
    catch (e) { fs.rmSync(tmp, { force: true }); return reply(res, 500, { error: `could not write ${spec[0]}: ${e.message}` }); }
    const warn = prepare();                  // theme.css and the kit follow project.json / brand.json
    runJob("sched");                         // places the lines again; the page reloads when it ends
    reply(res, 200, { ok: true, warn });
  }
  function run(res, b) {
    if (!Object.hasOwn(JOBS, b.cmd)) return reply(res, 400, { error: "unknown command" });
    let t = null;
    if (b.cmd === "stills" && b.t != null) {
      if (!num(b.t, 0, 36000)) return reply(res, 400, { error: "t must be a number of seconds" });
      t = +b.t.toFixed(2);                   // the only argument that reaches a command line: a plain decimal number
    }
    if (!runJob(b.cmd, t)) return reply(res, 409, { error: `busy: ${job.cmd} is running` });
    reply(res, 202, { ok: true });
  }
  function post(req, res, u) {
    if (u.pathname !== "/__save" && u.pathname !== "/__run") return reply(res, 404, { error: "not found" });
    if (req.headers.origin !== `http://${req.headers.host}`) return reply(res, 403, { error: "bad Origin" });
    if (!/^application\/json\s*(;|$)/i.test(req.headers["content-type"] || "")) return reply(res, 415, { error: "content-type must be application/json" });
    let n = 0; const chunks = [];
    req.on("data", (c) => { n += c.length; if (n > MAX_BODY) { reply(res, 413, { error: "too large" }); req.destroy(); } else chunks.push(c); });
    req.on("end", () => {
      if (res.writableEnded) return;
      let b;
      try { b = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return reply(res, 400, { error: "body must be JSON" }); }
      if (!isObj(b)) return reply(res, 400, { error: "body must be a JSON object" });
      try { (u.pathname === "/__save" ? save : run)(res, b); } catch (e) { reply(res, 500, { error: e.message }); }
    });
  }

  // ── watch: the project folder and the kit, as preview.mjs does; one debounced event for the page ──
  let pending = new Set(), timer = null;
  const flush = () => {
    if (job && job.state === "running") return;   // held until the job ends (schedule() then runs again)
    const files = [...pending]; pending = new Set();
    // a render stamps hf/index.html with the frame size and puts it back: not an edit
    const keep = INPUT_JOBS.has(job?.cmd) ? files : files.filter((f) => !(f === "hf/index.html" && Date.now() - lastJobEnd < 1500));
    if (!keep.length) return;
    if (keep.some((f) => /^(project|brand)\.json$|^(tools|themes)\//.test(f))) prepare();
    console.log("changed:", keep.join(", "));
    send({ changed: keep });
  };
  function schedule(ms = 150) { clearTimeout(timer); timer = setTimeout(flush, ms); }
  function changed(rel) {
    if (!rel || SKIP.test(rel)) return;
    pending.add(rel); schedule();
  }
  const watchers = [
    fs.watch(DIR, { recursive: true }, (_, f) => changed(f && posix(f))),
    fs.watch(path.join(ROOT, "tools"), (_, f) => kitFiles().includes(f) && changed("tools/" + f)),
    fs.watch(path.join(ROOT, "themes"), (_, f) => f && f.endsWith(".css") && changed("themes/" + f)),
  ];

  return new Promise((resolve, reject) => {
    const HOSTS = new Set();
    const server = http.createServer((req, res) => {
      // no DNS rebinding: a page on another name that resolves to 127.0.0.1 is refused here
      if (!HOSTS.has(req.headers.host)) { res.writeHead(403); return res.end("forbidden host"); }
      try {
        const u = new URL(req.url, "http://localhost");
        if (req.method === "POST") post(req, res, u); else serve(req, res);
      } catch (e) { res.writeHead(e instanceof URIError ? 400 : 500); res.end(e.message); }
    });
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const p = server.address().port;
      HOSTS.add(`localhost:${p}`); HOSTS.add(`127.0.0.1:${p}`);
      resolve({ port: p, url: `http://localhost:${p}/`,
        close() {
          clearTimeout(timer); watchers.forEach((w) => w.close()); child?.kill();
          for (const c of clients) c.end();
          server.closeAllConnections?.(); server.close();
        } });
    });
  });
}
