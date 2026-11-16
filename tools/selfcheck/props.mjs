// node tools/selfcheck/props.mjs: per-run props (Remotion 2.7.10). (1) the JSON-Schema subset validator and defaults; (2) `props check|merge|schema`;
// (3) docs/plans/p9-patches/props-flags.patch applied to a COPY of tools/ and bin/: `--props` / `--props-file` are accepted by any command, checked
// against props.schema.json, and a bad value stops the run before anything renders. The page side (KIT.props) is `remotion-kit.mjs props`.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validate, withDefaults, schemaFromVariables } from "../props-schema.mjs";
import { applyPatch } from "../patch_util.mjs";
import { makeProject, DECLS } from "./fixture.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const ok = (s, v) => assert.deepEqual(validate(s, v), [], JSON.stringify(v));
const no = (s, v, re) => { const e = validate(s, v); assert.ok(e.length, "should be refused: " + JSON.stringify(v)); assert.match(e.map((x) => x.path + " " + x.message).join("\n"), re); };

// 1. validator
const S = { type: "object", required: ["title"], additionalProperties: false, properties: {
  title: { type: "string", minLength: 2, maxLength: 12 }, bars: { type: "integer", minimum: 1, maximum: 5, default: 3 }, accent: { type: "string", format: "color", default: "#fff" },
  tone: { enum: ["calm", "loud"], default: "calm" }, tags: { type: "array", items: { type: "string" }, maxItems: 2 }, code: { type: "string", pattern: "^[A-Z]{3}$" } } };
ok(S, { title: "Hello", bars: 4, accent: "#0af", tone: "loud", tags: ["a"], code: "ABC" });
no(S, {}, /\$\.title is required/); no(S, { title: 7 }, /expected string/); no(S, { title: "x" }, /at least 2/); no(S, { title: "x".repeat(13) }, /at most 12/);
no(S, { title: "Hi", bars: 2.5 }, /expected integer/); no(S, { title: "Hi", bars: 9 }, /<= 5/); no(S, { title: "Hi", bars: 0 }, />= 1/); no(S, { title: "Hi", accent: "not a colour!" }, /colour/);
no(S, { title: "Hi", tone: "meh" }, /one of/); no(S, { title: "Hi", tags: ["a", "b", "c"] }, /at most 2 items/); no(S, { title: "Hi", tags: [1] }, /\[0\] expected string/); no(S, { title: "Hi", code: "abc" }, /match/);
no(S, { title: "Hi", extra: 1 }, /extra is not declared/); no(S, "x", /expected object/);
assert.deepEqual(withDefaults(S, { title: "Hi" }), { title: "Hi", bars: 3, accent: "#fff", tone: "calm" }, "defaults fill the missing properties");
assert.deepEqual(withDefaults(S, { title: "Hi", bars: 5 }).bars, 5, "a given value is kept");
const FS = schemaFromVariables(DECLS);
ok(FS, { title: "T", accent: "#123456", bars: 3, tone: "loud", dark: true, face: "Arial" }); no(FS, { tone: "meh" }, /one of/); no(FS, { bars: "three" }, /expected number/); no(FS, { zzz: 1 }, /not declared/);
console.log("PASS  validator: type / enum / range / length / pattern / colour / required / additionalProperties / items, defaults, schema from variables");

// 2 + 3. the command and the CLI flags, on a patched copy
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "props-"));
try {
  for (const d of ["vendor", "fonts", "themes", "node_modules", "python", "templates"]) if (fs.existsSync(path.join(ROOT, d))) fs.symlinkSync(path.join(ROOT, d), path.join(tmp, d), "junction");   // junction: Windows needs no symlink privilege for a directory
  for (const d of ["tools", "bin"]) fs.cpSync(path.join(ROOT, d), path.join(tmp, d), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "package.json"), path.join(tmp, "package.json"));
  const how = applyPatch(tmp, path.join(ROOT, "docs", "plans", "p9-patches", "props-flags.patch"));
  const pj = makeProject(path.join(tmp, "proj")), rw = (...a) => { const r = spawnSync(process.execPath, [path.join(tmp, "bin", "reelwright.mjs"), ...a], { encoding: "utf8", cwd: tmp }); return { status: r.status, out: r.stdout + r.stderr }; };
  const w = (n, o) => { const f = path.join(tmp, n); fs.writeFileSync(f, JSON.stringify(o)); return f; };
  // from variables (no schema file yet)
  let r = rw("props", pj, "check", '{"bars":4,"tone":"loud"}'); assert.equal(r.status, 0, r.out); assert.match(r.out, /props ok/);
  r = rw("props", pj, "check", '{"bars":"x"}'); assert.equal(r.status, 1); assert.match(r.out, /expected number/);
  r = rw("props", pj, "merge", '{"title":"Hey"}'); assert.equal(r.status, 0, r.out); const m = JSON.parse(r.out.slice(r.out.indexOf("{"))); assert.equal(m.title, "Hey"); assert.equal(m.bars, 3); assert.equal(m.tone, "calm");
  r = rw("props", pj, "schema", "--write"); assert.equal(r.status, 0, r.out); const sch = JSON.parse(fs.readFileSync(path.join(pj, "props.schema.json"), "utf8")); assert.equal(sch.properties.bars.type, "number");
  // a stricter schema file wins over the typed variables
  sch.properties.bars = { type: "integer", minimum: 1, maximum: 5, default: 3 }; fs.writeFileSync(path.join(pj, "props.schema.json"), JSON.stringify(sch));
  r = rw("props", pj, "check", '{"bars":9}'); assert.equal(r.status, 1); assert.match(r.out, /<= 5/);
  // the flags, through the patched bin: any command; a rejected prop stops before the command runs
  r = rw("info", pj, "--props", '{"bars":9}'); assert.equal(r.status, 1); assert.match(r.out, /props rejected/);
  r = rw("info", pj, "--props-file", w("bad.json", { bars: 2.5 })); assert.equal(r.status, 1); assert.match(r.out, /expected integer/);
  r = rw("info", pj, "--props", '{"bars":"three"}', "--strict-variables"); assert.equal(r.status, 1);
  const before = fs.readFileSync(path.join(pj, "hf", "kit-vars.js"), "utf8");
  r = rw("sched", pj, "--props-file", w("good.json", { bars: 4, accent: "#0000ff" })); assert.equal(r.status, 0, r.out);
  assert.equal(fs.readFileSync(path.join(pj, "hf", "kit-vars.js"), "utf8"), before, "kit-vars.js is put back after the run");
  console.log(`PASS  command + CLI (patch ${how}): props check / merge / schema; --props / --props-file checked against props.schema.json, bad values stop the run, good ones reach the page and are restored`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log("props self-check: schema subset, props command, --props flags");
