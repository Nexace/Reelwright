// node tools/selfcheck/p13-new.mjs — hyperframes:G1: `new --example / --agents / --skills / --tailwind`, offline.
// Default `new` is unchanged (no extra files); each flag does only its own thing; --tailwind says it is skipped.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const mk = (...a) => spawnSync(process.execPath, [path.join(ROOT, "bin/reelwright.mjs"), "new", ...a], { cwd: ROOT, encoding: "utf8" });
const names = ["p13-new-a", "p13-new-b", "p13-new-c"], dir = (n) => path.join(ROOT, "projects", n);
const clean = () => names.forEach((n) => fs.rmSync(dir(n), { recursive: true, force: true }));
clean();
try {
  // default: the same files as before, nothing extra
  let r = mk(names[0], "--renderer", "hyperframes");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(dir(names[0]), "hf/film.js")));
  assert.ok(!fs.existsSync(path.join(dir(names[0]), "AGENTS.md")) && !fs.existsSync(path.join(dir(names[0]), ".claude")), "default new adds no agent files");

  // --example <name> + --agents + --skills + --tailwind
  r = mk(names[1], "--example", "shots-hf", "--agents", "--skills", "--tailwind");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const b = dir(names[1]);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(b, "project.json"), "utf8")).renderer, "hyperframes");
  assert.ok(fs.existsSync(path.join(b, "hf/film.js")), "--example shots-hf copied that project's film");
  const a = fs.readFileSync(path.join(b, "AGENTS.md"), "utf8");
  assert.match(a, /renderer: hyperframes/); assert.match(a, /## Rules/); assert.match(a, /Never let a recording perform a real write/);
  assert.equal(fs.readFileSync(path.join(b, "CLAUDE.md"), "utf8"), "@AGENTS.md\n");
  assert.ok(fs.existsSync(path.join(b, ".claude/skills/product-video/SKILL.md")), "project skills installed");
  assert.match(r.stdout, /--tailwind skipped/);
  assert.ok(!fs.existsSync(path.join(b, "frames")) && !fs.existsSync(path.join(b, "hf/kit")), "build output not copied");

  // an unknown example lists the choices and creates nothing
  r = mk(names[2], "--example", "nope");
  assert.equal(r.status, 1); assert.match(r.stdout, /shots-hf/); assert.ok(!fs.existsSync(dir(names[2])));
  r = mk(names[2], "--example", "qa-broken");   // a deliberate failure fixture is not a starting point
  assert.equal(r.status, 1);
  r = mk("x", "--example", "list");
  assert.match(r.stdout, /example-hf/); assert.ok(!/qa-broken/.test(r.stdout));
  console.log("p13-new: ok");
} finally { clean(); }
