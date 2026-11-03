// node tools/gen.mjs <projectDir> ...   (`reelwright gen [project] ...`) — opt-in paid generation, never part of a build.
//   --provider higgsfield [--model <id>] [--kind image|video] "<prompt>" --out assets/<file> [--yes]
//        shows the provider's price estimate and asks before it submits (--yes skips the question), polls, downloads
//        to <project>/assets/<file>; the result is cached in assets/.gen/ by (provider, model, kind, prompt), so the
//        same command again costs nothing and needs no key.
//   --import <file> --source firefly|express "<note>" [--out assets/<file>]
//        register a file you made in Firefly / Adobe Express (copied byte for byte, keeps Content Credentials);
//        offline, no key.
// Writes assets/gen.json (what each asset is and where it came from; never keys or signed URLs).
// Keys: env HIGGSFIELD_API_KEY_ID + HIGGSFIELD_API_KEY_SECRET, else the git-ignored .reelwright/credentials.json
// at the repo root (path override: env REELWRIGHT_CREDENTIALS). Missing → exit 2, nothing written.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const PROVIDERS = ["higgsfield"], SOURCES = ["firefly", "express"];
const USAGE = `usage: reelwright gen [project] --provider higgsfield [--model <id>] [--kind image|video] "<prompt>" --out assets/<file> [--yes]
       reelwright gen [project] --import <file> --source firefly|express "<note>" [--out assets/<file>]`;
const die = (msg, code = 1) => { console.error(msg); process.exit(code); };
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const [dir, ...argv] = process.argv.slice(2);
if (!dir) die(USAGE);
const DIR = path.resolve(dir), ASSETS = path.join(DIR, "assets"), CACHE = path.join(ASSETS, ".gen"), MANIFEST = path.join(ASSETS, "gen.json");
const VAL = new Set(["--provider", "--model", "--kind", "--out", "--import", "--source"]), o = {}, pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (VAL.has(a)) o[a.slice(2)] = argv[++i]; else if (a === "--yes") o.yes = true;
  else if (a.startsWith("--")) die(`unknown option ${a}\n${USAGE}`); else pos.push(a);
}
if (pos.length > 1) die(`quote the prompt: got ${pos.length} words/arguments; is "${pos[0]}" meant to be a project name?\n${USAGE}`);
const prompt = pos[0] || "";
if (!o.provider && !o.import) die(USAGE);

function outPath() {
  if (!o.out) return null;
  const f = path.resolve(DIR, o.out), n = (p) => process.platform === "win32" || process.platform === "darwin" ? p.toLowerCase() : p;   // case-insensitive file systems
  if (!n(f).startsWith(n(ASSETS + path.sep)) || n(f).startsWith(n(CACHE + path.sep)) || n(f) === n(MANIFEST)) die(`--out must be inside ${path.relative(process.cwd(), ASSETS) || "assets"}/ (e.g. --out assets/hero.png)`);
  return f;
}

function record(entry) {
  const m = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : { assets: [] };
  const i = m.assets.findIndex((a) => a.file === entry.file);
  if (i >= 0) m.assets[i] = entry; else m.assets.push(entry);
  fs.mkdirSync(ASSETS, { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + "\n");
  return m;
}
const relFile = (f) => path.relative(DIR, f).split(path.sep).join("/");

if (o.import) {
  if (!SOURCES.includes(o.source)) die(`--source must be one of: ${SOURCES.join(", ")}`);
  if (!fs.existsSync(o.import)) die(`${o.import}: no such file`);
  const ext = path.extname(o.import).toLowerCase();
  const kind = /^\.(png|jpe?g|webp|gif)$/.test(ext) ? "image" : /^\.(mp4|mov|webm|m4v)$/.test(ext) ? "video" : die(`${o.import}: expected an image or video file`);
  const out = outPath() || path.join(ASSETS, path.basename(o.import));
  if (path.resolve(out) !== path.resolve(o.import)) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.copyFileSync(o.import, out); }
  record({ file: relFile(out), provider: o.source, kind, note: prompt, date: new Date().toISOString(), sha256: sha(out) });
  console.log(`registered ${relFile(out)} (${o.source}, ${kind}) in assets/gen.json\nlabel it on screen with KIT.aiLabel(el)`);
  process.exit(0);
}

if (!PROVIDERS.includes(o.provider)) die(`unknown provider "${o.provider}" — available: ${PROVIDERS.join(", ")}`);
const P = (await import(`./gen/${o.provider}.mjs`)).default;
const kind = o.kind || "image", out = outPath();
if (!["image", "video"].includes(kind)) die("--kind must be image or video");
if (!out || !prompt) die(USAGE);
const model = o.model || P.models[kind];
const req = { prompt, kind, model, opts: {} };
const key = crypto.createHash("sha256").update(JSON.stringify({ provider: P.name, model, kind, prompt, opts: req.opts })).digest("hex");
const stamp = { key, provider: P.name, model, kind, prompt };

// cache hit: no key, no network
const hit = fs.existsSync(CACHE) && fs.readdirSync(CACHE).find((f) => f.startsWith(key + ".") && !f.endsWith(".tmp"));
if (hit) {
  const prev = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")).assets.find((a) => a.key === key) : null;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(path.join(CACHE, hit), out);
  record({ file: relFile(out), ...stamp, date: new Date().toISOString(), sha256: sha(out), ...(prev?.sourceUrlHost && { sourceUrlHost: prev.sourceUrlHost }) });
  console.log(`cached: ${relFile(out)} (same prompt as before, nothing submitted, no charge)`);
  process.exit(0);
}

let file = {};
const CREDS = process.env.REELWRIGHT_CREDENTIALS || path.join(ROOT, ".reelwright", "credentials.json");
let raw = null;
try { raw = fs.readFileSync(CREDS, "utf8"); } catch (e) { if (e.code !== "ENOENT") die(`${CREDS} can't be read (${e.code})`, 2); }
// only a missing file counts as absent; a BOM (PowerShell 5.1) is fine, UTF-16 or junk is an error that never prints the contents
if (raw !== null) try { file = JSON.parse(raw.replace(/^\uFEFF/, "")); if (!file || typeof file !== "object") throw 0; } catch { die(`${CREDS} is not valid JSON (save it as UTF-8)`, 2); }
const creds = Object.fromEntries(P.envKeys.map((k) => [k, process.env[k] || file[k]]));
const missing = P.envKeys.filter((k) => !creds[k]);
if (missing.length) die(`missing ${missing.join(" and ")}: set the environment variable(s) or put them in ${CREDS} (git-ignored)`, 2);
// a value with CR/LF/NUL makes fetch throw an error that echoes it; name the variable only
for (const k of P.envKeys) if (!/^[\x21-\x7e]+$/.test(creds[k])) die(`${k} contains invalid characters (printable ASCII without spaces expected)`, 2);

const label = P.name[0].toUpperCase() + P.name.slice(1);
let job;   // set once submitted, so every later error can name the (possibly charged) request
try {
  const { usd } = await P.estimate(req, creds);
  if (usd == null || usd === "" || !Number.isFinite(Number(usd))) die(`${label}: no estimate returned; nothing was submitted`);
  console.log(`${label} estimate for your account: $${usd}\n  project ${dir}, out ${relFile(out)}, ${kind}, model ${model}\n  prompt: ${prompt}`);
  if (!o.yes) {
    process.stdout.write("Submit? [y/N] ");
    const rl = readline.createInterface({ input: process.stdin });
    let ans = ""; for await (const l of rl) { ans = l; break; } rl.close();
    if (!/^y(es)?$/i.test(ans.trim())) die("cancelled");
  }
  job = await P.submit(req, creds);
  console.log(`submitted (request ${job.id}), waiting…`);
  let wait = 2000, r; const end = Date.now() + 15 * 60e3;
  for (;;) {
    if (Date.now() > end) die(`timed out after 15 min; request ${job.id} may still finish (and be charged)`);
    await sleep(wait + Math.random() * 500); wait = Math.min(wait * 1.5, 10000);
    r = await P.poll(job, creds);
    if (!["queued", "in_progress"].includes(r.status)) break;   // anything else is terminal (an unknown status is reported, not looped on)
  }
  if (r.status !== "completed") die(`${label}: request ${job.id} ${["failed", "nsfw", "canceled"].includes(r.status) ? r.status : `ended with unexpected status ${r.status ?? "(none)"}`}${r.error ? ` (${r.error})` : ""}${["failed", "nsfw"].includes(r.status) ? " — not charged" : ""}`);
  if (!r.urls[0]) die(`${label}: request ${job.id} completed without a result URL`);
  const dl = await fetch(r.urls[0]);   // plain fetch: the CDN gets no credentials
  if (!dl.ok) die(`download failed (HTTP ${dl.status}); request ${job.id} completed, the result link may have expired`);
  const ct = dl.headers.get("content-type") || "";
  const ext = [path.extname(new URL(r.urls[0]).pathname)].filter((e) => /^\.[a-z0-9]{2,4}$/i.test(e))[0]
    || { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov" }[ct.split(";")[0]]
    || (kind === "video" ? ".mp4" : ".png");
  fs.mkdirSync(CACHE, { recursive: true });
  const cached = path.join(CACHE, key + ext);
  fs.writeFileSync(cached + ".tmp", Buffer.from(await dl.arrayBuffer()));
  fs.renameSync(cached + ".tmp", cached);   // a killed run must not leave a truncated cache hit
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(cached, out);
  record({ file: relFile(out), ...stamp, date: new Date().toISOString(), sha256: sha(out), sourceUrlHost: new URL(r.urls[0]).host });
  console.log(`wrote ${relFile(out)} and registered it in assets/gen.json\nlabel it on screen with KIT.aiLabel(el)`);
} catch (e) { die(e.message + (job ? `; request ${job.id} may still finish (and be charged)` : "")); }
