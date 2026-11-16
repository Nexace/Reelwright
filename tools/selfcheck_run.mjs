// node tools/selfcheck_run.mjs [--only a,b] [--shard i/n] [--list] [--jobs k] [--record] [--dir d] [--timings f]
// Runs every tools/selfcheck/*.mjs check (the list is derived from the folder; helper libraries whose header says
// "Shared fixture" / "Shared by" / "(a library" are skipped). --shard i/n runs the i-th of n balanced slices (greedy
// longest-first on the seconds in tools/selfcheck/timings.json, unknown checks get the median); the split is stable.
// Checks marked "serial" in timings.json (they write to or scan the shared projects/ dir) run alone, before the
// --jobs pool of the rest. --record re-measures the selected checks one at a time and merges the seconds into
// timings.json (serial flags are kept). Prints PASS/FAIL per check, then the failures; exit 1 if any failed.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const has = (n) => args.includes(n);
const DIR = path.resolve(opt("--dir", path.join(ROOT, "tools", "selfcheck")));
const TIMINGS = path.resolve(opt("--timings", path.join(DIR, "timings.json")));
const JOBS = Math.max(1, parseInt(opt("--jobs", "1"), 10) || 1);
const LIB = /shared (fixture|by)\b|\(a library|\blibrary:/i;

const isLib = (f) => LIB.test(fs.readFileSync(f, "utf8").split(/\r?\n/).slice(0, 3).join("\n"));
let names = fs.readdirSync(DIR).filter((f) => f.endsWith(".mjs") && fs.statSync(path.join(DIR, f)).isFile())
  .filter((f) => !isLib(path.join(DIR, f))).map((f) => f.slice(0, -4)).sort();
const only = opt("--only");
if (only) {
  const want = only.split(",").map((s) => s.trim().replace(/\.mjs$/, "")).filter(Boolean);
  const miss = want.filter((n) => !names.includes(n));
  if (miss.length) { console.error("no such check: " + miss.join(", ")); process.exit(2); }
  names = names.filter((n) => want.includes(n));
}

let T = { checks: {} };
try { T = JSON.parse(fs.readFileSync(TIMINGS, "utf8")); } catch { /* no table yet: everything is the median */ }
T.checks ||= {};
const secs = Object.values(T.checks).map((c) => c.s).filter((s) => typeof s === "number").sort((a, b) => a - b);
const median = secs.length ? secs[Math.floor(secs.length / 2)] : 1;
const est = (n) => T.checks[n]?.s ?? median;
const serial = (n) => !!T.checks[n]?.serial;

// Balanced stable split: heaviest first (name breaks ties), each into the currently lightest shard.
function split(list, n, cost) {
  const shards = Array.from({ length: n }, () => ({ total: 0, items: [] }));
  for (const c of [...list].sort((a, b) => cost(b) - cost(a) || (a < b ? -1 : 1))) {
    const s = shards.reduce((m, x) => (x.total < m.total ? x : m));
    s.items.push(c); s.total += cost(c);
  }
  return shards.map((s) => ({ total: s.total, items: s.items.sort() }));
}

let shardTotal = null;
const sh = opt("--shard");
if (sh) {
  const m = /^(\d+)\/(\d+)$/.exec(sh);
  if (!m || +m[1] < 1 || +m[1] > +m[2]) { console.error("--shard wants i/n with 1 <= i <= n"); process.exit(2); }
  const sp = split(names, +m[2], est)[+m[1] - 1];
  names = sp.items; shardTotal = sp.total;
}

if (has("--list")) {
  for (const n of names) console.log(`${n.padEnd(24)} ${est(n).toFixed(1).padStart(7)}s${serial(n) ? "  serial" : ""}`);
  console.log(`# ${names.length} checks, about ${Math.round(names.reduce((a, n) => a + est(n), 0))}s${shardTotal == null ? "" : ` (shard ${sh})`}`);
  process.exit(0);
}

const run = (n) => new Promise((ok) => {
  const t0 = Date.now(); let out = "";
  const p = spawn(process.execPath, [path.join(DIR, n + ".mjs")], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], timeout: 25 * 60 * 1000 });
  p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (out += d));
  p.on("close", (code, sig) => ok({ n, s: (Date.now() - t0) / 1000, pass: code === 0, out, why: sig ? `killed by ${sig}` : `exit ${code}` }));
  p.on("error", (e) => ok({ n, s: (Date.now() - t0) / 1000, pass: false, out: String(e), why: "spawn error" }));
});

const results = [];
const done = (r) => {
  results.push(r);
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.n.padEnd(24)} ${r.s.toFixed(1).padStart(7)}s`);
};
const t0 = Date.now();
const rec = has("--record");
const ser = rec ? names : names.filter(serial);
for (const n of ser) done(await run(n));
const rest = names.filter((n) => !ser.includes(n));
let next = 0;
await Promise.all(Array.from({ length: Math.min(JOBS, rest.length) }, async () => {
  while (next < rest.length) done(await run(rest[next++]));
}));

if (rec) {
  for (const r of results) T.checks[r.n] = { ...T.checks[r.n], s: Math.round(r.s * 10) / 10 };
  for (const k of Object.keys(T.checks)) if (!fs.existsSync(path.join(DIR, k + ".mjs"))) delete T.checks[k];
  T.checks = Object.fromEntries(Object.entries(T.checks).sort(([a], [b]) => (a < b ? -1 : 1)));
  fs.writeFileSync(TIMINGS, JSON.stringify(T, null, 2) + "\n");
  console.log(`recorded ${results.length} timings to ${path.relative(ROOT, TIMINGS)}`);
}

const bad = results.filter((r) => !r.pass).sort((a, b) => (a.n < b.n ? -1 : 1));
for (const r of bad) {
  console.log(`\n::group::FAIL ${r.n} (${r.why})`);
  console.log(r.out.split(/\r?\n/).slice(-40).join("\n"));
  console.log("::endgroup::");
}
console.log(`\n${results.length - bad.length}/${results.length} passed in ${Math.round((Date.now() - t0) / 1000)}s`);
if (bad.length) { console.log(`::error::self-checks failed: ${bad.map((r) => r.n).join(" ")}`); console.log("FAILED: " + bad.map((r) => r.n).join(", ")); process.exit(1); }
