// node tools/selfcheck/hf-lint.mjs — the hf-lint / hf-lint-warn QA plug-ins (tools/checks/): the broken fixture
// projects/qa-broken-lint trips every intended rule under the right kind, no committed hyperframes film trips the gate,
// a skipped rule never shows, and the project.json "qa" switches work. Static (no browser, no build output).
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import gate from "../checks/hf-lint.page.mjs";
import warn from "../checks/hf-lint-warn.page.mjs";
import { SKIP, DOWNGRADE } from "../checks/hf-lint.mjs";
import { lintProject } from "../../vendor/hyperframes/lint/dist/index.js";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const load = (dir) => ({ DIR: dir, P: JSON.parse(fs.readFileSync(path.join(dir, "project.json"), "utf8")) });
const codes = (lines) => lines.map((l) => l.split(":")[0]);
const run = async (ctx) => ({ gate: await gate(null, ctx), warn: await warn(null, ctx) });

// the fixture: ≥ 6 error rules (gate) and ≥ 4 warning rules (warn) from different groups
const WANT_GATE = ["visible_markup_comment", "non_deterministic_code", "requestanimationframe_in_composition",
  "missing_gsap_script", "font_family_without_font_face", "missing_local_asset"];
const WANT_WARN = ["root_dimensions_mismatch", "css_transition_used", "media_preload_none", "svg_round_cap_hidden_dash", "negative_z_index"];
const bad = load(path.join(ROOT, "projects/qa-broken-lint"));
assert.notEqual(bad.P.ci, true, "the broken fixture must not be a CI film");
const r = await run(bad);
for (const c of WANT_GATE) assert.ok(codes(r.gate).includes(c), `gate should report ${c}:\n${r.gate.join("\n")}`);
for (const c of WANT_WARN) assert.ok(codes(r.warn).includes(c), `warn should report ${c}:\n${r.warn.join("\n")}`);
assert.ok(!codes(r.warn).some((c) => WANT_GATE.includes(c)) && !codes(r.gate).some((c) => WANT_WARN.includes(c)), "gate/warn kinds must not mix");
for (const l of [...r.gate, ...r.warn]) assert.ok(l.length <= 200 && !l.includes("\n"), `one short line: ${l}`);
console.log(`qa-broken-lint: ${r.gate.length} gate, ${r.warn.length} warn`);

// no skipped or downgraded rule leaks into the wrong place
for (const c of Object.keys(SKIP)) assert.ok(![...codes(r.gate), ...codes(r.warn)].includes(c), `${c} is skipped`);
const raw = (await lintProject(path.join(bad.DIR, "hf"))).results.flatMap((x) => x.result.findings.map((f) => f.code));
assert.ok(raw.some((c) => Object.hasOwn(SKIP, c)), "the fixture should also trip a skipped rule upstream (else the skip is untested)");
assert.ok(!Object.keys(DOWNGRADE).some((c) => codes(r.gate).includes(c)), "a downgraded rule is never a gate");
assert.ok(!Object.keys(DOWNGRADE).some((c) => Object.hasOwn(SKIP, c)), "SKIP and DOWNGRADE overlap");

// project.json "qa" switches
const off = await run({ ...bad, P: { ...bad.P, qa: { "hf-lint": false } } });
assert.deepEqual([off.gate, off.warn], [[], []], '"qa": {"hf-lint": false} silences both');
const one = await run({ ...bad, P: { ...bad.P, qa: { "hf-lint-skip": ["non_deterministic_code", "negative_z_index"] } } });
assert.ok(!codes(one.gate).includes("non_deterministic_code") && !codes(one.warn).includes("negative_z_index"), "hf-lint-skip drops one rule");
assert.ok(codes(one.gate).includes("missing_gsap_script") && codes(one.warn).includes("css_transition_used"), "…and keeps the others");
// a pvk film (not a HyperFrames composition) is not linted
assert.deepEqual(await run({ ...bad, P: { ...bad.P, renderer: "pvk" } }), { gate: [], warn: [] });

// every committed hyperframes film passes the gate (WARN lines are shown, not asserted)
let tracked = null;
try {   // only when ROOT is itself a git checkout (not a copy inside another repo); else use the folders
  const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" });
  if (fs.realpathSync(git("rev-parse", "--show-toplevel").trim()) === fs.realpathSync(ROOT)) tracked = git("ls-files", "projects", "docs/recipes").split("\n");
} catch { /* no git */ }
const dirs = [...fs.readdirSync(path.join(ROOT, "projects")).map((n) => `projects/${n}`), "docs/recipes/film"]
  .filter((d) => d !== "projects/qa-broken-lint" && fs.existsSync(path.join(ROOT, d, "project.json")) && fs.existsSync(path.join(ROOT, d, "hf/index.html"))
    && (!tracked || tracked.includes(`${d}/hf/index.html`)));
assert.ok(dirs.length >= 6, `expected the committed hyperframes films, found ${dirs.join(", ")}`);
for (const d of dirs) {
  const ctx = load(path.join(ROOT, d));
  if (ctx.P.renderer !== "hyperframes") continue;
  const t0 = performance.now();
  const x = await run(ctx);
  console.log(`${d}: ${x.gate.length} gate, ${x.warn.length} warn, ${(performance.now() - t0).toFixed(0)} ms`);
  for (const l of x.warn) console.log(`  WARN  ${l}`);
  assert.deepEqual(x.gate, [], `${d} must pass the hf-lint gate:\n${x.gate.join("\n")}`);
}
console.log("hf-lint selfcheck ok");
