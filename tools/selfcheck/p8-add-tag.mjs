// node tools/selfcheck/p8-add-tag.mjs — docs/plans/p8-patches/add-tag.patch applied to a COPY of tools/commands/add.mjs: `add <project> <tag>` installs
// the one item with that tag, lists several (and installs them all with --all), an exact name still wins, and an unknown name keeps the old usage
// message. Runs the real CLI in a temp root (tools/ and bin/ copied, vendor and node_modules symlinked). Offline.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p8-add-"));
const run = (cmd, args, o = {}) => spawnSync(cmd, args, { encoding: "utf8", cwd: tmp, ...o });
try {
  for (const d of ["vendor", "fonts", "themes", "node_modules", "python"]) if (fs.existsSync(path.join(ROOT, d))) fs.symlinkSync(path.join(ROOT, d), path.join(tmp, d));
  for (const d of ["tools", "bin"]) fs.cpSync(path.join(ROOT, d), path.join(tmp, d), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "package.json"), path.join(tmp, "package.json"));
  let r = run("patch", ["-p1", "-i", path.join(ROOT, "docs", "plans", "p8-patches", "add-tag.patch")]); assert.equal(r.status, 0, r.stdout + r.stderr);
  const proj = path.join(tmp, "p"); fs.mkdirSync(proj); fs.writeFileSync(path.join(proj, "project.json"), JSON.stringify({ renderer: "hyperframes" }));
  const add = (...a) => run(process.execPath, [path.join(tmp, "bin", "reelwright.mjs"), "add", proj, ...a]);
  const have = (n) => fs.existsSync(path.join(proj, "hf", "blocks", n + ".html"));

  r = add("pill"); assert.equal(r.status, 0, r.stdout + r.stderr); assert.ok(have("caption-pill-karaoke"), "the one item tagged `pill` is installed");
  r = add("caption-style"); assert.match(r.stdout, /\d+ items tagged "caption-style"/); assert.match(r.stdout, /add caption-style --all/); assert.ok(!have("caption-glitch-rgb"), "several matches are listed, not installed");
  r = add("caption-style", "--all"); assert.equal(r.status, 0, r.stdout + r.stderr); assert.ok(have("caption-glitch-rgb") && have("caption-weight-shift"), "--all installs them");
  r = add("hw-arrow"); assert.ok(r.status !== 0 && /only single-file/.test(r.stdout), "exact name still goes the old way (asset components are refused)");
  r = add("no-such-thing"); assert.equal(r.status, 1); assert.match(r.stdout, /usage: reelwright add/);
  console.log("p8-add-tag self-check: patch applies; add by tag installs one, lists many, --all installs all; names and errors unchanged");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
