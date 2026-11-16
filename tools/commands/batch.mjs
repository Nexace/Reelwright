// batch <project> <rows.json|rows.csv> [--concurrency N] [--fail-fast] [--out-dir dir] [--strict] [--keep-work]
//                    one film per row of composition variables (docs/playbook/variables.md): each row is a copy of the project
//                    built with `film`, then out/batch/<_name or row-NN>.mp4 and a batch.json result (status, file, seconds,
//                    error per row). Rows are checked first: a bad row stops the batch before anything renders.
//                    --concurrency N rows at once (default 1; PAGES is split between them). --fail-fast: after the first
//                    failure no new row starts and running ones are stopped. Exit 1 when any row failed.
// batch <project> --check [rows file]   only validate: declarations, page bindings, and the rows
// batch <project> --defaults            write the page's kit-vars.js with the declared defaults (a page that loads it needs the file)
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

// tools/variables.js is a browser script: run it here and take its RWVars checks
export function loadVars() {
  if (!globalThis.RWVars) vm.runInThisContext(fs.readFileSync(path.join(ROOT, "tools", "variables.js"), "utf8"), { filename: "tools/variables.js" });
  return globalThis.RWVars;
}

// the project's page folder, project.json, declarations and lint issues (errors and warnings, none thrown)
export function projectVars(proj) {
  const V = loadVars(), P = JSON.parse(fs.readFileSync(path.join(proj, "project.json"), "utf8"));
  const rend = P.renderer || "pvk";
  if (rend !== "pvk" && rend !== "hyperframes") throw new Error(`composition variables need renderer pvk or hyperframes (this project uses ${rend})`);
  const dir = path.join(proj, rend === "hyperframes" ? "hf" : "film");
  const read = (f) => (fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), "utf8") : "");
  const html = read("index.html"), film = read("film.js");
  const decls = P.variables ?? V.parseHtmlDecls(html);
  const issues = V.checkDecls(decls);
  if (!issues.length) issues.push(...V.lintBindings(html, decls), ...V.lintScript(film, decls));
  return { P, decls, dir, issues, V };
}

const show = (issues) => issues.forEach((i) => console.error(`  ${i.level === "error" ? "ERROR" : "warn "} ${i.code}: ${i.message}`));
const fail = (msg) => { console.error(msg); process.exit(1); };

// write <page dir>/kit-vars.js and put the old file back (or remove it) when the process exits
function writeVarsFile(dir, text, restore = true) {
  const f = path.join(dir, "kit-vars.js"), old = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
  fs.writeFileSync(f, text);
  if (restore) process.once("exit", () => (old === null ? fs.rmSync(f, { force: true }) : fs.writeFileSync(f, old)));
}

// --variables '<json>' / --variables-file <file> on any command: validate, then every page load of this process sees the values
export function applyVariables(proj, { json, file, strict = false }) {
  const what = file ? `--variables-file ${file}` : "--variables";
  let ov;
  try { ov = JSON.parse(file ? fs.readFileSync(file, "utf8") : json); } catch (e) { fail(`${what}: ${e.message}`); }
  if (!ov || typeof ov !== "object" || Array.isArray(ov)) fail(`${what} must be a JSON object of variable values`);
  let pv;
  try { pv = projectVars(proj); } catch (e) { fail(e.message); }
  const { decls, dir, issues, V } = pv, r = V.resolve(decls, ov, { strict }), all = [...issues, ...r.issues];
  show(all);
  if (all.some((i) => i.level === "error")) fail("variables rejected — nothing rendered");
  writeVarsFile(dir, V.fileText(decls, r.values));
}

// ── rows ────────────────────────────────────────────────────────────────────
function csvRows(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; rows.push(row); row = []; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}
// a CSV cell is text: number and boolean columns are read as such, font and image columns may hold JSON
const coerce = (s, d) => {
  if (!d) return s;
  if (d.type === "number") return s.trim() === "" ? s : Number(s);
  if (d.type === "boolean") return /^(true|1|yes)$/i.test(s.trim()) ? true : /^(false|0|no)$/i.test(s.trim()) ? false : s;
  if ((d.type === "font" || d.type === "image") && s.trim().startsWith("{")) { try { return JSON.parse(s); } catch { return s; } }
  return s;
};

// rows file → [{ name, values }], with the problems found (nothing thrown for a bad row)
export function readRows(file, decls, V, { strict = false } = {}) {
  const text = fs.readFileSync(file, "utf8"), by = new Map(decls.map((d) => [d.id, d]));
  let raw;
  if (/\.csv$/i.test(file)) {
    const [head, ...body] = csvRows(text);
    raw = body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] === undefined ? undefined : coerce(r[i], by.get(h.trim()))]).filter(([, v]) => v !== undefined && v !== "")));
  } else raw = JSON.parse(text);
  if (!Array.isArray(raw) || !raw.length) throw new Error(`${file}: expected a non-empty array of rows (objects of variable values)`);
  const pad = String(raw.length).length, names = new Set(), out = [], problems = [];
  raw.forEach((r, i) => {
    if (!r || typeof r !== "object" || Array.isArray(r)) return problems.push({ row: i, issues: [{ level: "error", code: "invalid_row", message: "a row must be an object" }] });
    const { _name, ...vals } = r;
    const name = String(_name ?? `row-${String(i + 1).padStart(pad, "0")}`);
    const iss = [];
    if (!/^[\w][\w.-]*$/.test(name)) iss.push({ level: "error", code: "invalid_row_name", message: `_name "${name}": use letters, digits, . _ -` });
    if (names.has(name)) iss.push({ level: "error", code: "duplicate_row_name", message: `_name "${name}" is used twice` });
    names.add(name);
    iss.push(...V.validate(vals, decls, { strict }));
    if (iss.length) problems.push({ row: i, name, issues: iss });
    out.push({ name, values: V.resolve(decls, vals).values, overrides: vals });
  });
  return { rows: out, problems };
}

// ── scheduler: `concurrency` rows at a time; runRow(row, signal) → { out } or throws ──────────────
export async function runBatch(rows, { concurrency = 1, failFast = false, runRow }) {
  const res = rows.map((r, index) => ({ index, name: r.name, status: "skipped", variables: r.overrides }));
  const ac = new AbortController();
  let next = 0, running = 0, peak = 0;
  async function worker() {
    for (;;) {
      if (ac.signal.aborted) return;
      const i = next++;
      if (i >= rows.length) return;
      const t0 = Date.now(); peak = Math.max(peak, ++running);
      try { Object.assign(res[i], await runRow(rows[i], ac.signal), { status: "ok" }); }
      catch (e) {
        res[i].status = ac.signal.aborted ? "cancelled" : "failed"; res[i].error = e?.message || String(e);
        if (failFast && res[i].status === "failed") ac.abort();
      } finally { running--; res[i].seconds = +((Date.now() - t0) / 1000).toFixed(2); }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return { rows: res, ok: res.filter((r) => r.status === "ok").length, failed: res.filter((r) => r.status === "failed").length, peak };
}

// ── the real row: a copy of the project in a sibling folder (same depth, so pvk's ../../../tools holds), `film` on it ──
const SHARED = ["vo", "clips", "assets", "music"];   // read-only for `film`: linked, not copied
const SKIP = (rel) => /^(frames|stills|out|\.cache|node_modules|mix\.wav|timeline\.json)($|[\\/])/.test(rel) || /^(frames|stills)-/.test(rel) || /^hf[\\/]kit($|[\\/])/.test(rel) || /^\.batch/.test(rel);

function filmRow({ proj, dir, V, decls, outDir, keep, env }) {
  return async (row, signal) => {
    const abs = path.resolve(proj), work = path.join(path.dirname(abs), `.batch-${path.basename(abs)}-${row.name}`);
    fs.rmSync(work, { recursive: true, force: true });
    fs.cpSync(abs, work, { recursive: true, filter: (s) => { const rel = path.relative(abs, s); return !rel || !(SKIP(rel) || SHARED.includes(rel)); } });
    for (const d of SHARED) if (fs.existsSync(path.join(abs, d))) fs.symlinkSync(path.join(abs, d), path.join(work, d), "junction");
    const wdir = path.join(work, path.relative(abs, path.resolve(dir)));
    fs.writeFileSync(path.join(wdir, "kit-vars.js"), V.fileText(decls, row.values));
    let log = "";
    try {
      const code = await new Promise((resolve, reject) => {
        const c = spawn(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "film", work], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
        const eat = (b) => { log = (log + b).slice(-4000); };
        c.stdout.on("data", eat); c.stderr.on("data", eat);
        signal.addEventListener("abort", () => c.kill("SIGTERM"), { once: true });
        c.on("error", reject); c.on("close", (n, sig) => resolve(sig ? 1 : n));
      });
      if (signal.aborted) throw new Error("stopped by --fail-fast");
      if (code !== 0) throw new Error(`film exited ${code}: ${log.trim().split(/\r?\n/).slice(-6).join(" | ")}`);
      const wout = path.join(work, "out"), mp4 = fs.existsSync(wout) ? fs.readdirSync(wout).filter((f) => f.endsWith(".mp4")) : [];
      if (mp4.length !== 1) throw new Error(`film made ${mp4.length} mp4 files in out/`);
      const stem = mp4[0].replace(/\.mp4$/, ""), made = [];
      fs.mkdirSync(outDir, { recursive: true });
      for (const f of fs.readdirSync(wout).filter((f) => f.startsWith(stem))) {
        const dest = path.join(outDir, row.name + f.slice(stem.length));
        fs.copyFileSync(path.join(wout, f), dest); made.push(dest);
      }
      return { out: path.join(outDir, row.name + ".mp4"), files: made };
    } finally { if (!keep) fs.rmSync(work, { recursive: true, force: true }); }
  };
}

export default async function batch({ proj, args }) {
  const flag = (n, ...alias) => { for (const k of [n, ...alias]) { const i = args.indexOf(k); if (i >= 0) { args.splice(i, 1); return true; } } return false; };
  const val = (n, ...alias) => { for (const k of [n, ...alias]) { const i = args.indexOf(k); if (i >= 0) return args.splice(i, 2)[1]; } };
  const check = flag("--check"), defaults = flag("--defaults"), failFast = flag("--fail-fast", "--batch-fail-fast"), strict = flag("--strict"), keep = flag("--keep-work");
  const concurrency = Math.max(1, Number(val("--concurrency", "--batch-concurrency") || 1));
  const outDir = path.resolve(val("--out-dir") || path.join(proj, "out", "batch"));
  const rowsFile = args.find((a) => !a.startsWith("--"));
  let pv;
  try { pv = projectVars(proj); } catch (e) { fail(e.message); }
  const { decls, dir, issues, V } = pv;
  if (!decls.length) fail(`${proj} declares no variables: add "variables": [{ "id", "type", "default" }] to project.json (docs/playbook/variables.md)`);
  if (defaults) {
    show(issues);
    if (issues.some((i) => i.level === "error")) fail("declarations rejected");
    writeVarsFile(dir, V.fileText(decls, V.resolve(decls, {}).values), false);
    return console.log(`${path.join(dir, "kit-vars.js")}: ${decls.length} variable(s) at their defaults`);
  }
  if (!rowsFile) fail("usage: reelwright batch <project> <rows.json|rows.csv> [--concurrency N] [--fail-fast] [--out-dir dir] [--strict] [--check]");
  let rd;
  try { rd = readRows(rowsFile, decls, V, { strict }); } catch (e) { fail(e.message); }
  show(issues);
  for (const p of rd.problems) { console.error(`row ${p.row + 1}${p.name ? ` (${p.name})` : ""}:`); show(p.issues); }
  const bad = issues.some((i) => i.level === "error") || rd.problems.some((p) => p.issues.some((i) => i.level === "error"));
  if (bad) fail("rows rejected — nothing rendered");
  console.log(`${rd.rows.length} row(s) valid for ${decls.length} variable(s)${rd.problems.length ? " (warnings above)" : ""}`);
  if (check) return;

  const env = { ...process.env, PAGES: String(Math.max(1, Math.floor(Number(process.env.PAGES || 4) / concurrency))) };
  const t0 = Date.now();
  const r = await runBatch(rd.rows, { concurrency, failFast, runRow: filmRow({ proj, dir, V, decls, outDir, keep, env }) });
  const result = { project: path.resolve(proj), concurrency, failFast, seconds: +((Date.now() - t0) / 1000).toFixed(1), ok: r.ok, failed: r.failed, rows: r.rows };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "batch.json"), JSON.stringify(result, null, 2) + "\n");
  for (const x of r.rows) console.log(`${x.status.padEnd(9)} ${x.name}${x.out ? " → " + path.relative(process.cwd(), x.out) : ""}${x.error ? "  " + x.error : ""}`);
  console.log(`${r.ok}/${rd.rows.length} ok, ${r.failed} failed · ${path.join(outDir, "batch.json")}`);
  if (r.ok !== rd.rows.length) process.exit(1);
}
