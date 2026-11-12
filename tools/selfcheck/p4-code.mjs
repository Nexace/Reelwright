// Phase 11 P4, row manim:m7.7: build-time syntax highlighting with the vendored, trimmed shiki (vendor/shiki/, tools/manim/code.mjs,
// tools/commands/code.mjs). Offline: tokens rebuild the source exactly, every bundled language colours its keywords, both themes
// differ, output is byte-identical run to run, the command writes a loadable window.CODE file, the bundle stays small, licences ship.
import fs from "node:fs";
import os from "node:os";
import vm from "node:vm";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { highlight, langOf, dataScript, LANGS, THEMES } from "../manim/code.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
for (const f of ["LICENSE", "VENDORED.md", "THIRD_PARTY.md", "shiki.min.mjs", "entry.src.js"]) assert.ok(fs.existsSync(path.join(ROOT, "vendor/shiki", f)), `vendor/shiki/${f} is missing`);
assert.match(fs.readFileSync(path.join(ROOT, "vendor/shiki/LICENSE"), "utf8"), /MIT License/);
assert.ok(fs.statSync(path.join(ROOT, "vendor/shiki/shiki.min.mjs")).size < 900_000, "trimmed bundle should stay under 900 KB");
assert.deepEqual([...LANGS].sort(), ["bash", "css", "html", "javascript", "json", "python", "typescript"]);
assert.deepEqual([...THEMES].sort(), ["github-dark", "github-light"]);

const SAMPLES = {
  javascript: "const x = [1, 2].map((n) => n * 2); // double\nfunction f(a) { return `v${a}`; }",
  typescript: "interface P { x: number }\nexport const p: P = { x: 1 };",
  python: "def f(x):\n    return x + 1  # inc\n\nclass A: pass",
  json: '{ "a": [1, true, null], "b": "s" }',
  bash: 'for f in *.txt; do echo "$f"; done # list',
  html: '<div class="a"><p>hi</p></div>',
  css: ".a > p { color: #fff; margin: 0 }",
};
const text = (d) => d.lines.map((l) => l.map((t) => t.content).join("")).join("\n");
for (const [lang, src] of Object.entries(SAMPLES)) {
  const d = highlight(src, { lang });
  assert.equal(text(d), src, `${lang}: tokens must rebuild the source`);
  const colors = new Set(d.lines.flat().map((t) => t.color));
  assert.ok(colors.size >= 3, `${lang}: expected several token colours, got ${[...colors]}`);
  assert.equal(JSON.stringify(highlight(src, { lang })), JSON.stringify(d), `${lang}: deterministic`);
}
const light = highlight(SAMPLES.python, { lang: "py", theme: "github-light" }), dark = highlight(SAMPLES.python, { lang: "python", theme: "github-dark" });
assert.notEqual(light.bg, dark.bg); assert.equal(text(light), text(dark));
assert.equal(highlight("a\tb", { lang: "js", tabSize: 2 }).lines[0].map((t) => t.content).join(""), "a  b", "tabs become spaces");
assert.equal(langOf("x/y.PY"), "python"); assert.equal(langOf("a.tsx"), "typescript"); assert.equal(langOf("a.rs"), undefined);
assert.throws(() => highlight("x", { lang: "rust" }), /not bundled/); assert.throws(() => highlight("x", { lang: "js", theme: "dracula" }), /not bundled/);
assert.throws(() => highlight("x", {}), /give a language/); assert.throws(() => dataScript("a b", {}), /letters, digits/);

// the command: writes film/code-<id>.js, which a page loads as window.CODE[id]; --lines slices; model wraps OBJ text
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p4code-")), proj = path.join(tmp, "demo");
fs.mkdirSync(proj); fs.writeFileSync(path.join(tmp, "snip.py"), "a = 1\nb = 2\nc = 3\n"); fs.writeFileSync(path.join(tmp, "t.obj"), "v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n");
const cmd = (await import(pathToFileURL(path.join(ROOT, "tools/commands/code.mjs")).href)).default, log = console.log, said = [];
console.log = (...a) => said.push(a.join(" "));
try {
  await cmd({ proj, args: ["highlight", path.join(tmp, "snip.py"), "--lines", "2-3", "--id", "snip"], project: () => ({}) });
  await cmd({ proj, args: ["model", path.join(tmp, "t.obj"), "--id", "tri"], project: () => ({ renderer: "hyperframes" }) });
} finally { console.log = log; }
const w = {}; vm.runInNewContext(fs.readFileSync(path.join(proj, "film/code-snip.js"), "utf8"), { window: w });
assert.equal(w.CODE.snip.lines.length, 2); assert.equal(text(w.CODE.snip), "b = 2\nc = 3"); assert.equal(w.CODE.snip.lang, "python");
const w2 = {}; vm.runInNewContext(fs.readFileSync(path.join(proj, "hf/model-tri.js"), "utf8"), { window: w2 });
assert.match(w2.MODEL.tri, /^v 0 0 0\n/); assert.match(said.join("\n"), /2 line\(s\) of python/);
fs.rmSync(tmp, { recursive: true, force: true });
console.log("p4-code: 7 languages x 2 themes rebuild their source, deterministic, command writes window.CODE, bundle " + Math.round(fs.statSync(path.join(ROOT, "vendor/shiki/shiki.min.mjs")).size / 1000) + " KB OK");
