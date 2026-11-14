// node tools/selfcheck/p8-doctor.mjs — `reelwright doctor` reports node, ffmpeg with its encoders, python libs, browser, disk and cores as JSON and
// as text; `browser path/ensure/clear` run without installing or deleting anything; `compositions` lists the compositions of a project
// (the HyperFrames example has several); `docs` lists and prints a topic. Offline, nothing installed or deleted.
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const rw = (...a) => spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), ...a], { encoding: "utf8", cwd: ROOT });

const d = rw("doctor", "--json"), j = JSON.parse(d.stdout);
const names = j.checks.map((c) => c.name);
for (const n of ["reelwright", "node", "ffmpeg", "codec libx264", "codec aac", "python", "python libs", "browser", "docker", "gpu", "disk", "cpu/ram"]) assert.ok(names.includes(n), `check ${n} missing: ${names}`);
assert.equal(d.status, j.ok ? 0 : 1, "exit code follows the checks");
assert.ok(j.checks.find((c) => c.name === "node").ok && j.checks.find((c) => c.name === "ffmpeg").ok, "node and ffmpeg are here");
assert.match(rw("doctor").stdout, /node\s+v\d+/, "text form");

assert.match(rw("browser", "path").stdout, /chrom|Chrome/i, "browser path");
assert.match(rw("browser", "ensure").stdout, /browser ok/, "browser ensure launches");
assert.match(rw("browser", "clear").stdout, /ms-playwright/, "browser clear lists, deletes nothing without --yes");
assert.equal(rw("browser", "bogus").status, 1);

const c = JSON.parse(rw("compositions", "example-hf", "--json").stdout);
assert.ok(c.length >= 1 && c[0].id, `compositions of example-hf: ${JSON.stringify(c)}`);
assert.match(rw("compositions", "--all").stdout, /example-hf\s+hyperframes/, "project list");

assert.match(rw("docs").stdout, /playbook\/motion/, "docs list");
assert.match(rw("docs", "motion").stdout, /^# playbook\/motion/, "docs topic");
assert.equal(rw("docs", "zzzz-nothing").status, 1);
console.log(`p8-doctor self-check: ${j.checks.length} checks (${j.checks.filter((x) => !x.ok).length} not ok on this machine), browser path/ensure/clear, ${c.length} composition(s) in example-hf, docs list and topic`);
