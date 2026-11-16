// node tools/selfcheck/p8-json.mjs — `reelwright json <command> …` wraps any command in one JSON envelope with _meta (version, node, ms,
// update), exit codes 0 (ok) / 1 (the command failed) / 2 (unknown command, with did_you_mean), and the command's own JSON as `data`. Offline.
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const rw = (...a) => { const r = spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "json", ...a], { encoding: "utf8", cwd: ROOT }); return { status: r.status, j: JSON.parse(r.stdout) }; };

let r = rw("catalog", "--tag", "caption-style", "--json");
assert.equal(r.status, 0); assert.ok(r.j.ok && r.j.exit === 0 && Array.isArray(r.j.data) && r.j.data.length >= 15, "data carries the command's JSON");
assert.ok(r.j._meta.version && "update" in r.j._meta && r.j._meta.ms >= 0, "_meta");

r = rw("compositions", "example-hf");
assert.equal(r.status, 0); assert.match(r.j.stdout, /composition/, "plain output is in stdout");

r = rw("docs", "zzzz-nothing");
assert.equal(r.status, 1); assert.ok(!r.j.ok && r.j.exit === 1 && r.j.error, "a failing command: exit 1 and an error line");

r = rw("stils", "example");
assert.equal(r.status, 2); assert.deepEqual(r.j.did_you_mean.slice(0, 1), ["stills"], "did you mean: " + r.j.did_you_mean);
r = rw();
assert.equal(r.status, 2);
console.log("p8-json self-check: envelope with _meta, exit 0/1/2, data from JSON commands, did_you_mean for a typo");
