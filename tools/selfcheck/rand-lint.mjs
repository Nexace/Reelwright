// node tools/selfcheck/rand-lint.mjs: the opt-in `rand-lint` command (Remotion 2.1.9 lint hint) and the text-rule numbers of the playbook page (2.6.11).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { lint, strip } from "../commands/rand-lint.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const bad = lint(`const a = Math.random();\nconst t0 = Date.now();\nlet d = new Date();\nrequestAnimationFrame(f);\nsetTimeout(g, 5);\nconst p = performance.now();`);
assert.equal(bad.length, 6, "six findings, one per line"); assert.match(bad[0].why, /KIT\.random/); assert.match(bad[1].why, /use t/);
assert.deepEqual(lint(`// Math.random() is banned\nconst s = "Date.now()"; const q = 'setTimeout(x)'; const tpl = \`new Date()\`;\n/* performance.now() */\nconst ok = KIT.random('x') + t;`), [], "comments and strings are not findings");
assert.equal(strip("a\n// x\nb").split("\n").length, 3, "line numbers survive stripping");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rand-lint-"));
try {
  fs.mkdirSync(path.join(dir, "film")); fs.writeFileSync(path.join(dir, "film", "film.js"), "KIT.start({ dur: 1, render: (t) => { x.style.left = Math.random() * 10 + 'px'; } });\n"); fs.writeFileSync(path.join(dir, "film", "kit-vars.js"), "Math.random()");
  const run = () => spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "rand-lint", dir], { encoding: "utf8", cwd: ROOT });
  let r = run(); assert.equal(r.status, 1, r.stdout + r.stderr); assert.match(r.stdout, /film\.js:1: Math\.random\(\)/); assert.ok(!/kit-vars/.test(r.stdout), "generated kit files are skipped");
  fs.writeFileSync(path.join(dir, "film", "film.js"), "KIT.start({ dur: 1, render: (t) => { x.style.left = KIT.random('a') * 10 + 'px'; } });\n");
  r = run(); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /clean/);
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
// the playbook page states the Remotion video-layout minimums as numbers a lint can hold a film to
const page = fs.readFileSync(path.join(ROOT, "docs", "playbook", "text-rules.md"), "utf8");
for (const n of ["84 px", "44 px", "80 px", "100 px"]) assert.ok(page.includes(n), `docs/playbook/text-rules.md states ${n}`);
console.log("rand-lint self-check: rand-lint finds clocks, timers and Math.random (not in comments or strings), skips generated kit files, exits 1 / 0; text-rule page has the numbers");
