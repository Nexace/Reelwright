// node tools/selfcheck/p8-catalog.mjs — `reelwright catalog` (tools/catalog.mjs, tools/commands/catalog.mjs) lists and searches the vendored
// registry by --type, --tag, words and --json, lists tags, and `add <tag>` resolves through byTag. Offline.
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { catalog, search, byTag } from "../catalog.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const items = catalog(ROOT);
assert.ok(items.filter((i) => i.type === "component").length >= 238, "components");
assert.ok(items.filter((i) => i.type === "block" && i.status === "supported").length >= 130, "supported blocks");
const caps = search(items, { tag: "caption-style" });
assert.ok(caps.length >= 15 && caps.every((i) => i.type === "component"), `caption-style: ${caps.length}`);
assert.ok(search(items, { type: "block", tag: "transition" }).length >= 1 || search(items, { type: "block", q: "transition" }).length >= 1, "block search");
assert.deepEqual(byTag(items, "caption-glitch-rgb").map((i) => i.name), ["caption-glitch-rgb"], "exact name wins");
assert.ok(byTag(items, "caption-style").length >= 15, "add by tag");
assert.ok(search(items, { q: "karaoke" }).some((i) => i.name === "caption-pill-karaoke"), "word search");

const run = (...a) => spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "catalog", ...a], { encoding: "utf8" });
const r = run("--tag", "caption-style", "--json");
assert.equal(r.status, 0, r.stderr);
assert.ok(JSON.parse(r.stdout).length === caps.length, "CLI --json matches");
assert.match(run("--tags").stdout, /caption-style\s+\d+/, "--tags");
assert.match(run("pill", "karaoke").stdout, /caption-pill-karaoke/, "CLI words");
console.log(`p8-catalog self-check: ${items.length} items, ${caps.length} caption-style components, tag/type/word/--json/--tags and add-by-tag resolve`);
