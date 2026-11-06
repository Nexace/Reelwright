// node tools/selfcheck/rails.mjs — the Phase 10 parallel rails: a command, a QA check (python and page), a kit module and
// a kit library each added as a new file are picked up with no edit to a shared file. Writes dummies, removes them after.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const at = (...p) => path.join(ROOT, ...p);
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rails-"));
const made = {
  [at("tools", "commands", "zz-rails.mjs")]: `// zz-rails [project] <args>   dummy plug-in command (tools/selfcheck/rails.mjs)\nexport default ({ proj, args }) => console.log("rails-cmd", proj.split("\\\\").join("/"), args.join(","));\n`,
  [at("tools", "zz_rails.js")]: "// dummy kit module (tools/selfcheck/rails.mjs)\n",
  [at("vendor", "zz-rails", "kit.json")]: "{}\n",
  [at("tools", "checks", "zz_rails.py")]: `KIND = "gate"\ndef check(ctx): return [f"dummy gate on {len(ctx['frames'])} frames"]\n`,
  [at("tools", "checks", "zz-rails.page.mjs")]: `export const kind = "warn";\nexport default async (page) => [await page.evaluate(() => "page dummy " + typeof window.render)];\n`,
};
const dirs = [at("tools", "commands"), at("tools", "checks"), at("vendor", "zz-rails")].filter((d) => !fs.existsSync(d));
const run = (bin, ...a) => spawnSync(bin, a, { cwd: ROOT, encoding: "utf8" });
try {
  for (const [f, s] of Object.entries(made)) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); }

  let r = run(process.execPath, "bin/reelwright.mjs", "zz-rails", "example", "a", "b");
  assert.match(r.stdout, /rails-cmd projects\/example a,b/, r.stderr);
  r = run(process.execPath, "bin/reelwright.mjs", "help");
  assert.match(r.stdout, /zz-rails \[project\] <args> {3}dummy plug-in command/);

  const { copyKit } = await import("../kit_files.mjs");
  copyKit(tmp);
  for (const f of ["engine.js", "kit.css", "zz_rails.js", "zz-rails/kit.json", "katex/katex.min.js"])
    assert.ok(fs.existsSync(path.join(tmp, "kit", f)), `copyKit missed ${f}`);

  // a two-frame project with a stub film page: just enough for tools/qa.py and tools/qa_page.mjs to run the plug-ins
  const P = path.join(tmp, "proj");
  fs.mkdirSync(path.join(P, "frames"), { recursive: true }); fs.mkdirSync(path.join(P, "film"));
  fs.writeFileSync(path.join(P, "project.json"), JSON.stringify({ fps: 2, width: 64, height: 36, qa: { loudness: false } }));
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  for (const f of ["f00000.png", "f00001.png"]) fs.writeFileSync(path.join(P, "frames", f), png);
  fs.writeFileSync(path.join(P, "film", "index.html"), `<body><script>window.KIT={token:()=>"#000",safe:{x:0,w:64},stage:document.body,u:1};` +
    `window.VO={};window.FILM={DUR:1};window.render=async()=>{};window.READY=Promise.resolve(true);</script></body>`);
  r = spawnSync(PY, [at("tools", "qa.py"), P], { cwd: ROOT, encoding: "utf8", env: { ...process.env, REELWRIGHT_NODE: process.execPath } });
  assert.match(r.stdout, /FAIL {2}zz_rails\r?\n {10}dummy gate on 2 frames/, r.stdout + r.stderr);
  assert.match(r.stdout, /WARN {2}zz-rails: page dummy function/, r.stdout + r.stderr);
  assert.equal(r.status, 1);
  console.log("rails self-check: command, help, kit module, kit library, python check, page check — all picked up");
} finally {
  for (const f of Object.keys(made)) fs.rmSync(f, { force: true });
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  fs.rmSync(at("vendor", "zz-rails"), { recursive: true, force: true });
  fs.rmSync(tmp, { recursive: true, force: true });
}
