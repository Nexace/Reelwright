// node tools/selfcheck/runner.mjs — tools/selfcheck_run.mjs itself: --list derives the checks from the folder (libraries
// skipped), a 3-way shard split covers every check exactly once and is stable, --only picks and rejects unknown names,
// a deliberately failing check on a temp --dir is reported (PASS/FAIL lines, failure list, exit 1) while a green one
// exits 0, --record merges seconds into the timing table, and serial checks run before (never beside) the pool. Offline, fast.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RUN = path.join(ROOT, "tools", "selfcheck_run.mjs");
const sh = (...a) => spawnSync(process.execPath, [RUN, ...a], { cwd: ROOT, encoding: "utf8" });
const listed = (r) => r.stdout.split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => l.split(/\s+/)[0]);

// 1. --list: every top-level check, no libraries, no itself-missing; the real table has serial flags and every check a time
const all = listed(sh("--list"));
const onDisk = fs.readdirSync(path.join(ROOT, "tools/selfcheck")).filter((f) => f.endsWith(".mjs") && fs.statSync(path.join(ROOT, "tools/selfcheck", f)).isFile()).map((f) => f.slice(0, -4));
const libs = ["fixture", "seek-harness"];
for (const lib of libs) assert.ok(onDisk.includes(lib) && !all.includes(lib), lib + " is a library, not a check");
assert.ok(all.includes("runner") && all.includes("themes") && all.length === onDisk.length - libs.length, `the list is the folder minus the ${libs.length} libraries`);
const table = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/selfcheck/timings.json"), "utf8")).checks;
for (const n of all) assert.equal(typeof table[n]?.s, "number", n + " has a recorded time (node tools/selfcheck_run.mjs --record --only " + n + ")");
for (const n of Object.keys(table)) assert.ok(all.includes(n), n + " is in the timing table but not a check");

// 2. shards: disjoint, together exactly the list, balanced, stable on a second call
const N = 3, parts = [1, 2, 3].map((i) => listed(sh("--list", "--shard", `${i}/${N}`)));
assert.deepEqual(parts.flat().sort(), [...all].sort(), "3 shards cover every check exactly once");
assert.deepEqual(parts.map((_, i) => listed(sh("--list", "--shard", `${i + 1}/${N}`))), parts, "stable");
const tot = parts.map((p) => p.reduce((a, n) => a + table[n].s, 0)), biggest = Math.max(...all.map((n) => table[n].s));
assert.ok(Math.max(...tot) - Math.min(...tot) <= biggest + 1e-6, `shards balanced within the longest check (${tot.map((t) => t.toFixed(0))})`);
assert.notEqual(sh("--list", "--shard", "4/3").status, 0, "bad shard rejected");

// 3. --only and an unknown name
assert.deepEqual(listed(sh("--list", "--only", "themes,runner")), ["runner", "themes"]);
const miss = sh("--only", "no-such-check");
assert.equal(miss.status, 2); assert.match(miss.stderr, /no such check: no-such-check/);

// 4. a temp folder with a passing, a failing and a library file; unknown checks get the median of the (empty) table
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "q3-"));
try {
  fs.writeFileSync(path.join(tmp, "good.mjs"), "// node good.mjs\r\nconsole.log('fine');\r\n");       // CRLF header
  fs.writeFileSync(path.join(tmp, "bad.mjs"), "// node bad.mjs\nconsole.error('boom marker'); process.exit(3);\n");
  fs.writeFileSync(path.join(tmp, "lib.mjs"), "// Shared by the checks (a library: running it does nothing)\nthrow new Error('must never run');\n");
  fs.writeFileSync(path.join(tmp, "timings.json"), JSON.stringify({ checks: { bad: { s: 0.1, serial: true } } }));
  const run = (...a) => sh("--dir", tmp, ...a);
  assert.deepEqual(listed(run("--list")), ["bad", "good"]);
  const r = run("--jobs", "2");
  assert.equal(r.status, 1, "a failing check exits 1");
  assert.match(r.stdout, /^PASS {2}good/m); assert.match(r.stdout, /^FAIL {2}bad/m);
  assert.match(r.stdout, /boom marker/, "the failing check's output is shown");
  assert.match(r.stdout, /FAILED: bad\b/); assert.doesNotMatch(r.stdout, /must never run|FAILED:.*good/);
  assert.ok(r.stdout.indexOf("FAIL  bad") < r.stdout.indexOf("PASS  good"), "the serial check ran before the pool");
  const g = run("--only", "good");
  assert.equal(g.status, 0); assert.match(g.stdout, /1\/1 passed/);
  // 5. --record writes seconds, keeps the serial flag, and leaves a failing check's time too
  run("--record");
  const t = JSON.parse(fs.readFileSync(path.join(tmp, "timings.json"), "utf8")).checks;
  assert.equal(t.bad.serial, true); assert.equal(typeof t.good.s, "number"); assert.equal(typeof t.bad.s, "number");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log("runner: ok");
