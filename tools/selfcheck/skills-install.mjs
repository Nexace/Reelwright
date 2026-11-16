// node tools/selfcheck/skills-install.mjs — `reelwright skills install` (tools/commands/skills.mjs) writes every repo skill into each
// app's global folder under a temp HOME, with the repo-path preface, product-video renamed `reelwright`, and refuses unknown apps.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const home = fs.mkdtempSync(path.join(os.tmpdir(), "skills-"));
const run = (...a) => spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "skills", ...a], { encoding: "utf8", env: { ...process.env, REELWRIGHT_SKILLS_HOME: home } });
try {
  const skills = fs.readdirSync(path.join(ROOT, ".claude", "skills"));
  let r = run("install", "--dry-run"); assert.equal(r.status, 0, r.stderr); assert.equal(fs.readdirSync(home).length, 0, "dry run writes nothing");
  r = run("install"); assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const dir of [".codex/skills", ".config/opencode/skills", ".cursor/skills", ".gemini/config/skills"]) for (const s of skills) {
    const name = s === "product-video" ? "reelwright" : s, f = path.join(home, dir, name, "SKILL.md");
    assert.ok(fs.existsSync(f), f); const t = fs.readFileSync(f, "utf8");
    assert.match(t, new RegExp(`^---\\nname: ${name}\\n`)); assert.ok(t.includes(`Repo: \`${ROOT}\``), "repo path preface");
  }
  r = run("install", "--apps", "codex,nope"); assert.equal(r.status, 1); assert.match(r.stdout, /unknown app\(s\): nope/);
  console.log(`skills-install self-check: ${skills.length} skills into 4 apps, dry run, rename, preface, refusal`);
} finally { fs.rmSync(home, { recursive: true, force: true }); }
