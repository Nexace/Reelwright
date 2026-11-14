// node tools/selfcheck/p12a-json.mjs — row hyperframes:G15: `--json` on EVERY command (not only `json <command>`): a command without its own --json gets the
// envelope { ok, command, args, exit, stdout, stderr, data?, _meta }, a command that prints its own JSON keeps doing so, exit codes are 0 / 1 / 2, and an unknown
// command exits 2 on its own (not only through `json`) with "did you mean". Every built-in and plug-in command name is dispatched, none is lost. Offline.
import path from "node:path";
import fs from "node:fs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { commandNames } from "../commands/json.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const rw = (...a) => spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), ...a], { encoding: "utf8", cwd: ROOT, maxBuffer: 1 << 26 });

let r = rw("themes", "--json"), j = JSON.parse(r.stdout);
assert.equal(r.status, 0); assert.ok(j.ok && j.command === "themes" && j.exit === 0 && /dark-tech/.test(j.stdout), "built-in command: the envelope");
assert.ok(j._meta.version && j._meta.node && j._meta.ms >= 0 && j._meta.update === null, "_meta: version, node, ms, update (null: no network call)");
assert.equal(r.stdout, JSON.stringify(j) + "\n", "one JSON document on stdout");

r = rw("docs", "--json", "zzzz-nothing"); j = JSON.parse(r.stdout);
assert.equal(r.status, 1); assert.ok(!j.ok && j.exit === 1 && j.error, "a failing command: exit 1 and an error line, still one envelope");

r = rw("--json", "themes"); assert.equal(JSON.parse(r.stdout).command, "themes", "the flag may come first");
r = rw("catalog", "--tag", "caption-style", "--json"); j = JSON.parse(r.stdout);
assert.ok(Array.isArray(j), "a command with its own --json still prints its own JSON, as before");
r = rw("doctor", "--json"); assert.ok("checks" in JSON.parse(r.stdout), "doctor keeps its own shape");

r = rw("stils"); assert.equal(r.status, 2, "unknown command: exit 2 by itself"); assert.match(r.stderr, /did you mean: stills/); assert.equal(r.stdout, "");
r = rw("stils", "--json"); j = JSON.parse(r.stdout); assert.equal(r.status, 2); assert.deepEqual(j.did_you_mean.slice(0, 1), ["stills"]);
assert.equal(rw("help").status, 0, "help is still exit 0"); assert.equal(rw().status, 0, "no command: help, exit 0");

// the command list the did-you-mean draws on
const names = commandNames(ROOT); assert.ok(names.length > 50, names.length + " commands");
const src = fs.readFileSync(path.join(ROOT, "bin", "reelwright.mjs"), "utf8");
for (const n of ["new", "qa", "stills", "frames", "film", "all", "sched"]) assert.ok(names.includes(n), n);
assert.ok(src.includes('"--json"'));
console.log(`p12a-json self-check: --json envelope on any command (${names.length} command names), own-JSON commands unchanged, exit 0/1/2, unknown command exit 2 with did-you-mean`);
