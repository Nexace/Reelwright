// Optional Manim renderer, Node half: Manim scenes are pre-rendered clips that a pvk or HyperFrames film shows as a layer
// (tools/manim.js, KIT.manim). project.json "manim": { engine, scenes: [{ id, file, class, anchor, pre, dur, alpha, fps, engine }] }.
// Flow: sched → kit() writes <proj>/.cache/manim/kit.json from the page's data file and theme.css → render() spawns
// `python -m reelwright_manim render` (python/reelwright_manim, in a per-project uv venv) per scene, extracts the clip to
// frames/%05d.png, and writes window.MANIM (data.js) for the page. Scenes are cached by hash of everything they read.
// Nothing here installs anything except install(), which only `reelwright manim <p> install … --yes` calls.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const PKG = path.join(ROOT, "python", "reelwright_manim");
const PIN = { ce: { pkg: "manim[typst]==0.22.1", dist: "manim", mb: 125 }, gl: { pkg: "manimgl==1.7.2", dist: "manimgl", mb: 103 } };
const posix = (p) => p.split(path.sep).join("/");
const engineOf = (P, s = {}) => s.engine || P.manim?.engine || "ce";
const hf = (P) => P.renderer === "hyperframes";

// ── venv ──────────────────────────────────────────────────────────────────
// one shared install for every project (<repo>/.venv-manim[-gl]): `reelwright clean` wipes a project's .cache/ (the rendered clips) but not this
export const venvDir = (DIR, engine) => process.env.REELWRIGHT_MANIM_VENV || path.join(ROOT, engine === "ce" ? ".venv-manim" : ".venv-manim-" + engine);
export const python = (DIR, engine) => path.join(venvDir(DIR, engine), ...(process.platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"]));
// REELWRIGHT_MANIM_PYTHON = a stand-in interpreter (the self-check's fake: a node script) — used instead of the venv
export const present = (DIR, engine) => !!process.env.REELWRIGHT_MANIM_PYTHON || fs.existsSync(python(DIR, engine));
function py(DIR, engine, args, opts = {}) {
  const fake = process.env.REELWRIGHT_MANIM_PYTHON;
  const [cmd, pre] = fake ? (/\.[cm]?js$/.test(fake) ? [process.execPath, [fake]] : [fake, []]) : [python(DIR, engine), []];
  const env = { ...process.env, PYTHONPATH: path.join(ROOT, "python"), PYTHONHASHSEED: "0", SOURCE_DATE_EPOCH: "0", PYTHONUTF8: "1" };
  return spawnSync(cmd, [...pre, ...args], { encoding: "utf8", env, maxBuffer: 64 << 20, ...opts });
}
const venvInfo = (DIR, engine) => {
  try { return JSON.parse(fs.readFileSync(path.join(venvDir(DIR, engine), "reelwright.json"), "utf8")); } catch { return null; }
};
const has = (cmd, args = ["--version"]) => { const r = spawnSync(cmd, args, { stdio: "ignore" }); return !r.error && r.status === 0; };

// install(DIR, engine, { yes }) → { ok, lines }: without yes, only the plan (and any missing system package) is printed
export function install(DIR, engine = "ce", { yes = false, log = console.log } = {}) {
  if (!PIN[engine]) throw new Error(`unknown Manim engine "${engine}" (ce or gl)`);
  const venv = venvDir(DIR, engine), pin = PIN[engine];
  const steps = [["uv", "python", "install", "3.12"], ["uv", "venv", "--python", "3.12", venv], ["uv", "pip", "install", "--python", venv, pin.pkg]];
  log(`Manim ${engine.toUpperCase()} into ${posix(path.relative(process.cwd(), venv))} (~${pin.mb} MB of downloads: Python 3.12 via uv, then ${pin.pkg}):`);
  const show = (s) => s.map((a) => /[\s[\]"]/.test(a) ? JSON.stringify(a) : a).join(" ");   // copy-pasteable
  for (const s of steps) log("  " + show(s));
  if (!has("uv")) {
    log("uv is not installed; install it first:\n  " + (process.platform === "win32"
      ? 'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"' : "curl -LsSf https://astral.sh/uv/install.sh | sh"));
    return { ok: false };
  }
  if (process.platform === "darwin" && !has("pkg-config", ["--exists", "cairo"])) {
    log("pycairo compiles on macOS and needs cairo; install it first:\n  brew install cairo pkg-config");
    return { ok: false };
  }
  if (process.platform === "linux") log("Linux builds pycairo and ManimPango from source; first install (once):\n" +
    "  Debian/Ubuntu: sudo apt install build-essential python3-dev libcairo2-dev libpango1.0-dev\n" +
    "  Fedora:        sudo dnf install python3-devel pkg-config cairo-devel pango-devel\n" +
    "  Arch:          sudo pacman -Syu base-devel cairo pango" + (engine === "gl" ? "\n  GL also needs: sudo apt install ffmpeg" : ""));
  if (!process.env.REELWRIGHT_MANIM_PYTHON && fs.existsSync(python(DIR, engine)) && healthy(DIR, engine)) { log(`already installed and healthy (${posix(path.relative(process.cwd(), venv))}); nothing downloaded`); return { ok: true, existing: true }; }
  if (!yes) { log("nothing downloaded: re-run with --yes to install"); return { ok: true, planned: true }; }
  for (const s of steps) {
    log("▶ " + show(s));
    const r = spawnSync(s[0], s.slice(1), { stdio: "inherit" });
    if (r.status !== 0) { log(`failed: ${show(s)}`); return { ok: false }; }
  }
  const v = spawnSync(python(DIR, engine), ["-c", `import importlib.metadata as m; print(m.version("${pin.dist}"))`], { encoding: "utf8" });
  const manim = (v.stdout || "").trim() || "unknown";
  fs.writeFileSync(path.join(venv, "reelwright.json"), JSON.stringify({ engine, manim, python: "3.12", pkg: pin.pkg }, null, 2) + "\n");
  log(`installed ${pin.dist} ${manim}`);
  return { ok: true };
}

// doctor(DIR, engine) → { ok, …, problems } from the Python side, or how to install
// the venv imports the pinned Manim (a half-finished or broken install is not "healthy": install then redoes it)
const healthy = (DIR, engine) => spawnSync(python(DIR, engine), ["-c", `import importlib.metadata as m; m.version("${PIN[engine].dist}")`], { stdio: "ignore" }).status === 0;
const dirSize = (d) => { let n = 0; try { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); n += e.isDirectory() ? dirSize(f) : e.isSymbolicLink() ? 0 : fs.statSync(f).size; } } catch { /* unreadable */ } return n; };
export function doctor(DIR, engine = "ce") {
  const venv = venvDir(DIR, engine), where = { venv: posix(venv), venvMB: present(DIR, engine) ? Math.round(dirSize(venv) / 1e6) : 0 };
  const r0 = doctor1(DIR, engine); return { ...r0, ...where };
}
function doctor1(DIR, engine) {
  if (!present(DIR, engine)) return { ok: false, engine, problems: [`Manim ${engine} not installed: reelwright manim <project> install ${engine}`] };
  const r = py(DIR, engine, ["-m", "reelwright_manim", "doctor", "--engine", engine]);
  const line = (r.stdout || "").trim().split(/\r?\n/).filter(Boolean).pop();
  try { return JSON.parse(line); } catch { return { ok: false, engine, problems: [`doctor failed (exit ${r.status}): ${(r.stderr || r.stdout || r.error || "").toString().trim().slice(-800)}`] }; }
}

// ── kit.json ──────────────────────────────────────────────────────────────
const DEFAULT_THEME = { bg: "#0f1115", ink: "#f4f1ea", accent: "#6ee7b7", accent2: "#93c5fd", muted: "#8b8f98",
  fontText: "Helvetica Neue", fontDisplay: "Helvetica Neue" };
const slug = (f) => f.toLowerCase().replace(/\s+/g, "-");
function theme(page) {
  const vars = {};
  const eat = (css) => { for (const b of css.matchAll(/:root\s*\{([^}]*)\}/g)) for (const m of b[1].matchAll(/--kit-([\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim(); };
  try { eat(fs.readFileSync(path.join(ROOT, "tools", "kit.css"), "utf8")); } catch { /* defaults below */ }
  try { eat(fs.readFileSync(path.join(page, "theme.css"), "utf8")); } catch { /* pvk films may have no theme.css */ }
  const get = (k, d = 0) => { const v = vars[k]; if (v == null || d > 8) return undefined;
    const m = /^var\(--kit-([\w-]+)\)$/.exec(v); return m ? get(m[1], d + 1) : v; };
  const fam = (k) => { const v = get(k); if (!v) return undefined; return (/"([^"]+)"|'([^']+)'/.exec(v) || [])[1] || v.split(",")[0].trim(); };
  const t = { bg: get("bg"), ink: get("ink"), accent: get("accent"), accent2: get("accent-2"), muted: get("muted"),
    fontText: fam("font-text"), fontDisplay: fam("font-display") };
  for (const k in t) if (!t[k] || t[k].startsWith("-apple-system")) t[k] = DEFAULT_THEME[k];
  return t;
}
function fontFiles(t) {
  const out = [];
  for (const f of new Set([t.fontText, t.fontDisplay])) {
    const d = path.join(ROOT, "fonts", slug(f));
    if (fs.existsSync(d)) for (const x of fs.readdirSync(d).filter((x) => /\.(ttf|otf|woff2?)$/i.test(x)).sort()) out.push(path.join(d, x));
  }
  return out;
}
export const dataFile = (DIR, P) => path.join(DIR, hf(P) ? "hf/kit-data.js" : "film/data.js");
function pageData(DIR, P) {
  const f = dataFile(DIR, P);
  if (!fs.existsSync(f)) throw new Error(`${posix(path.relative(process.cwd(), f))} missing: run \`reelwright sched <project>\` first`);
  const window = {};
  vm.runInNewContext(fs.readFileSync(f, "utf8"), { window }, { filename: f, timeout: 2000 });
  return JSON.parse(JSON.stringify(window));   // plain objects of this realm
}
// kit(DIR, P) → the kit object Python reads; also writes <proj>/.cache/manim/kit.json (write: false to skip)
export function kit(DIR, P, { write = true } = {}) {
  const W = pageData(DIR, P), PR = W.PROJECT || {};
  const VO = {};
  for (const [id, v] of Object.entries(W.VO || {})) VO[id] = { start: v.start, end: v.end, words: (v.words || []).map(({ w, t, d }) => ({ w, t, d })) };
  const th = theme(path.join(DIR, hf(P) ? "hf" : "film"));
  const K = { fps: PR.fps || P.fps || 60, width: PR.width || P.width || 1920, height: PR.height || P.height || 1080,
    dur: +((PR.speechEnd || 0) + (PR.tail || 0)).toFixed(3), VO, MUSIC: W.MUSIC || {}, theme: th, fonts: fontFiles(th) };
  if (write) {
    fs.mkdirSync(path.join(DIR, ".cache", "manim"), { recursive: true });
    fs.writeFileSync(path.join(DIR, ".cache", "manim", "kit.json"), JSON.stringify(K, null, 2) + "\n");
  }
  return K;
}

// ── scenes, hash ──────────────────────────────────────────────────────────
// scene(P, s, K) → the resolved block: film-time window from the anchor line (never typed seconds)
export function scene(P, s, K) {
  for (const k of ["id", "file", "class", "anchor"]) if (!s[k]) throw new Error(`manim scene ${JSON.stringify(s)}: "${k}" missing`);
  if (!/^[\w-]+$/.test(s.id)) throw new Error(`manim scene id "${s.id}": letters, digits, _ and - only`);
  const v = K.VO[s.anchor];
  if (!v) throw new Error(`manim scene ${s.id}: anchor "${s.anchor}" is not a VO line (have: ${Object.keys(K.VO).join(", ")})`);
  const pre = s.pre || 0, fps = s.fps || K.fps;
  const t0 = +(v.start - pre).toFixed(6), dur = +(s.dur ?? v.end - v.start + pre).toFixed(6);
  if (!(dur > 0)) throw new Error(`manim scene ${s.id}: dur ${dur} must be > 0`);
  return { ...s, pre, fps, fixedFps: s.fps != null, t0, dur, alpha: s.alpha !== false, engine: engineOf(P, s), frames: Math.round(dur * fps), width: K.width, height: K.height };
}
export const scenes = (P, K) => {
  const L = (P.manim?.scenes || []).map((s) => scene(P, s, K));
  const dup = L.map((s) => s.id).filter((id, i, a) => a.indexOf(id) !== i);
  if (dup.length) throw new Error(`manim scene ids repeat: ${dup.join(", ")}`);
  return L;
};
// the scene file and every local .py it imports (same folder: `import x` / `from x import`), recursively
function sources(file, seen = new Set()) {
  if (seen.has(file) || !fs.existsSync(file)) return seen;
  seen.add(file);
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/^\s*(?:from\s+\.*([\w.]+)\s+import|import\s+([\w., ]+))/gm))
    for (const name of (m[1] || m[2]).split(",").map((x) => x.trim().split(/\s+/)[0].split(".")[0]).filter(Boolean))
      sources(path.join(path.dirname(file), name + ".py"), seen);
  return seen;
}
const walk = (d) => !fs.existsSync(d) ? [] : fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.name !== "__pycache__" && !e.name.endsWith(".pyc"))
  .flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]).sort();
// hash(DIR, P, s, K) → sha256 hex over everything the rendered frames depend on
export function hash(DIR, P, s, K) {
  const S = s.t0 === undefined ? scene(P, s, K) : s;
  const file = path.resolve(DIR, S.file);
  if (!fs.existsSync(file)) throw new Error(`manim scene ${S.id}: ${S.file} not found`);
  const h = crypto.createHash("sha256");
  const add = (label, data) => { h.update(label + "\0"); h.update(data); h.update("\0"); };
  for (const f of [...sources(file)].sort()) add("src:" + posix(path.relative(DIR, f)), fs.readFileSync(f));
  for (const f of walk(PKG)) add("pkg:" + posix(path.relative(PKG, f)), fs.readFileSync(f));
  add("kit", JSON.stringify({ fps: S.fps, size: [K.width, K.height], alpha: S.alpha, t0: S.t0, dur: S.dur, theme: K.theme, VO: K.VO, MUSIC: K.MUSIC }));
  add("scene", JSON.stringify({ class: S.class, engine: S.engine, manim: venvInfo(DIR, S.engine)?.manim || "absent" }));
  return h.digest("hex");
}

// ── render ────────────────────────────────────────────────────────────────
const cacheRoot = (DIR, P) => path.join(DIR, ...(hf(P) ? ["hf", "kit", "manim"] : [".cache", "manim"]));
const pageRel = (P) => hf(P) ? "kit/manim/" : "../.cache/manim/";
const pngs = (d) => { try { return fs.readdirSync(d).filter((f) => /^\d{5}\.png$/.test(f)).length; } catch { return 0; } };
const readJSON = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
function extract(mov, dir, alpha) {
  fs.mkdirSync(dir, { recursive: true });
  const a = ["-v", "error", "-y", "-i", mov, "-pix_fmt", alpha ? "rgba" : "rgb24", "-start_number", "0"];
  let r = spawnSync("ffmpeg", [...a, "-fps_mode", "passthrough", path.join(dir, "%05d.png")], { encoding: "utf8" });
  if (r.status !== 0 && /fps_mode|Unrecognized option/.test(r.stderr)) r = spawnSync("ffmpeg", [...a, "-vsync", "0", path.join(dir, "%05d.png")], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg could not extract ${mov}: ${(r.stderr || r.error || "").toString().trim()}`);
}
// render(DIR, P, { force, log }) → [{ id, hash, cached, dir }]; writes the page's data.js (window.MANIM)
export function render(DIR, P, { force = false, log = console.log } = {}) {
  const K = kit(DIR, P), root = cacheRoot(DIR, P), kitJson = path.join(DIR, ".cache", "manim", "kit.json");
  fs.mkdirSync(root, { recursive: true });
  const out = [], data = {};
  for (const s of scenes(P, K)) {
    const hx = hash(DIR, P, s, K), name = `${s.id}-${hx.slice(0, 12)}`, dir = path.join(root, name);
    const meta = readJSON(path.join(dir, "meta.json"));
    const cached = !force && meta?.hash === hx && pngs(path.join(dir, "frames")) === meta.frames;
    if (!cached) {
      if (!present(DIR, s.engine)) throw new Error(`manim scene ${s.id}: Manim ${s.engine} not installed: reelwright manim <project> install ${s.engine}`);
      fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
      log(`manim ${s.id}: rendering ${s.class} (${s.engine}, ${s.frames} frames at ${s.fps} fps, t ${s.t0.toFixed(2)} → ${(s.t0 + s.dur).toFixed(2)})`);
      const r = py(DIR, s.engine, ["-m", "reelwright_manim", "render", "--kit", kitJson, "--file", path.resolve(DIR, s.file), "--class", s.class,
        "--engine", s.engine, "--t0", String(s.t0), "--dur", String(s.dur), "--fps", String(s.fps), "--size", `${K.width}x${K.height}`,
        "--alpha", s.alpha ? "1" : "0", "--out", dir], { stdio: ["ignore", "inherit", "inherit"] });
      if (r.status !== 0) throw new Error(`manim scene ${s.id}: render failed (exit ${r.status}${r.error ? ", " + r.error.message : ""})`);
      const mk = readJSON(path.join(dir, "marks.json"));
      if (!mk || !fs.existsSync(path.join(dir, "scene.mov"))) throw new Error(`manim scene ${s.id}: the render wrote no scene.mov + marks.json in ${dir}`);
      if (mk.frames !== s.frames) throw new Error(`manim scene ${s.id}: marks.json says ${mk.frames} frames, want ${s.frames} (dur ${s.dur} × ${s.fps} fps)`);
      extract(path.join(dir, "scene.mov"), path.join(dir, "frames"), s.alpha);
      const n = pngs(path.join(dir, "frames"));
      if (n !== s.frames) throw new Error(`manim scene ${s.id}: extracted ${n} frames from scene.mov, want ${s.frames}`);
      fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ id: s.id, hash: hx, frames: n, fps: s.fps, t0: s.t0, dur: s.dur,
        marks: mk.marks || {}, illustrative: !!mk.illustrative, engine: s.engine, manim: venvInfo(DIR, s.engine)?.manim || "absent" }, null, 2) + "\n");
    } else log(`manim ${s.id}: cached (${name})`);
    for (const d of fs.readdirSync(root)) if (d !== name && d.startsWith(s.id + "-") && /^[0-9a-f]{12}$/.test(d.slice(s.id.length + 1)))
      fs.rmSync(path.join(root, d), { recursive: true, force: true });
    const m = readJSON(path.join(dir, "meta.json"));
    data[s.id] = { t0: s.t0, dur: s.dur, fps: s.fps, frames: m.frames, dir: `${pageRel(P)}${name}/frames/`, hash: hx, marks: m.marks,
      illustrative: m.illustrative, anchor: s.anchor, pre: s.pre, width: K.width, height: K.height, fixedFps: s.fixedFps };
    out.push({ id: s.id, hash: hx, cached, dir });
  }
  fs.writeFileSync(path.join(root, "data.js"), "// generated by tools/manim.mjs (reelwright manim <project> render) — do not edit\n" +
    `window.MANIM=${JSON.stringify({ renderer: hf(P) ? "hyperframes" : "pvk", scenes: data })};\n`);
  return out;
}

// verify(DIR, P) → problems[] (empty = every scene's clip is fresh, complete and listed in data.js)
export function verify(DIR, P) {
  const problems = [];
  if (!P.manim?.scenes?.length) return problems;
  let K, L;
  try { K = kit(DIR, P, { write: false }); L = scenes(P, K); } catch (e) { return [e.message]; }
  const root = cacheRoot(DIR, P);
  let D = {};
  try { const window = {}; vm.runInNewContext(fs.readFileSync(path.join(root, "data.js"), "utf8"), { window }); D = window.MANIM?.scenes || {}; }
  catch { problems.push(`${posix(path.relative(process.cwd(), path.join(root, "data.js")))} missing or broken: run reelwright manim <project> render`); }
  for (const s of L) {
    let hx; try { hx = hash(DIR, P, s, K); } catch (e) { problems.push(e.message); continue; }
    const dir = path.join(root, `${s.id}-${hx.slice(0, 12)}`), meta = readJSON(path.join(dir, "meta.json"));
    if (!meta || meta.hash !== hx) { problems.push(`manim ${s.id}: stale or not rendered (inputs changed): run reelwright manim <project> render`); continue; }
    const n = pngs(path.join(dir, "frames"));
    if (meta.frames !== s.frames || n !== s.frames) problems.push(`manim ${s.id}: ${n} frame files, meta says ${meta.frames}, want ${s.frames}`);
    const d = D[s.id];
    if (!d) problems.push(`manim ${s.id}: not in data.js`);
    else if (d.hash !== hx || d.frames !== s.frames || Math.abs(d.t0 - s.t0) > 1e-3 || d.fps !== s.fps) problems.push(`manim ${s.id}: data.js disagrees with the scene (re-run render)`);
  }
  return problems;
}
