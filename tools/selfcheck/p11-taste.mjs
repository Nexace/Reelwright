// node tools/selfcheck/p11-taste.mjs — the taste advice for shotcards (tools/checks/taste-shotcards.json + taste-shotcards.page.mjs): every helper
// that tools/shotcards/*.js defines has a rule and a category with advice, a fixture film that calls shotcards (by KIT.shotcards.x, an alias
// and a destructure) gets exactly those helpers' tips plus each category's advice once, a film without shotcards gets nothing, and the
// plug-in has the shape `qa` loads (kind "warn", default export). Offline, no browser (the browser half stays in tools/selfcheck/taste.mjs).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import * as plug from "../checks/taste-shotcards.page.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const rules = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/checks/taste-shotcards.json"), "utf8"));

// the helpers the shotcard modules define (read from the directory, so a helper added later must get a rule too)
const defined = new Set();
for (const f of fs.readdirSync(path.join(ROOT, "tools/shotcards")).filter((x) => x.endsWith(".js"))) {
  const s = fs.readFileSync(path.join(ROOT, "tools/shotcards", f), "utf8"), cat = f.slice(0, -3);
  assert.ok(rules.categories[cat]?.length > 40, `no advice for the category "${cat}" (tools/checks/taste-shotcards.json categories)`);
  for (const m of s.matchAll(/^\s*(?:C|S|SC)\.([A-Za-z0-9]+) *=/gm)) if (!["types", "transition"].includes(m[1])) defined.add(m[1]);
  for (const m of s.matchAll(/^\/\/\s+types\.([A-Za-z0-9]+)/gm)) defined.add("types." + m[1]);
}
for (const n of defined) {
  assert.ok(rules.helpers[n], `the shotcard helper ${n} has no rule: add it under "helpers" in tools/checks/taste-shotcards.json`);
  assert.ok(rules.categories[rules.helpers[n].category], `${n}: unknown category ${rules.helpers[n].category}`);
}
for (const n of Object.keys(rules.helpers)) assert.ok(defined.has(n), `rule for ${n}, which no tools/shotcards/*.js defines`);
const withTips = Object.values(rules.helpers).filter((h) => h.tips.length).length;
assert.ok(withTips >= defined.size / 2, `only ${withTips} of ${defined.size} helpers carry a tip of their own`);

// a fixture film that uses three helpers three ways
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p11-taste-"));
try {
  fs.mkdirSync(path.join(tmp, "hf"));
  fs.writeFileSync(path.join(tmp, "hf", "film.js"), [
    "const SC = KIT.shotcards;", "const stack = SC.cardStack({ cards: ['a', 'b'] });",
    "const { fracture } = KIT.shotcards; const g = KIT.shotcards.types.grain;", "KIT.shotcards.notAHelper();", "function render(t) { stack.set(t); }"].join("\n"));
  const lines = plug.scan(tmp);
  assert.deepEqual(plug.helpersUsed(fs.readFileSync(path.join(tmp, "hf", "film.js"), "utf8")).sort(), ["cardStack", "fracture", "types.grain"]);
  for (const [n, cat] of [["cardStack", "ui-entrance"], ["fracture", "opening"], ["types.grain", "dissolve"]]) {
    assert.ok(lines.some((l) => l.startsWith(`${n} (${cat}): `) && l.includes(rules.categories[cat])), `${n}: no ${cat} advice in\n${lines.join("\n")}`);
    for (const t of rules.helpers[n].tips) assert.ok(lines.includes(`${n} (${cat}): ${t}`), `${n}: tip missing: ${t}`);
  }
  assert.equal(lines.filter((l) => l.includes(rules.categories["ui-entrance"])).length, 1, "a category's advice is given once");
  assert.ok(lines.length <= 12, "capped at 12 lines");
  fs.writeFileSync(path.join(tmp, "hf", "film.js"), "function render(t) { KIT.shot.pushIn({}); }");
  assert.deepEqual(plug.scan(tmp), [], "a film without shotcards gets no lines");
  assert.deepEqual(await plug.default(null, { DIR: tmp }), []);
  assert.match((await plug.default(null, {}))[0], /^taste-shotcards skipped/, "a broken call never throws (qa would turn that into a FAIL)");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
assert.equal(plug.kind, "warn");
// no committed film uses shotcards yet: `qa` output on every existing project is unchanged by the plug-in
for (const p of fs.readdirSync(path.join(ROOT, "projects"))) {
  const dir = path.join(ROOT, "projects", p);
  if (fs.statSync(dir).isDirectory() && p !== "node_modules") console.log(`  ${p}: ${plug.scan(dir).length} shotcard lines`);
}
console.log(`p11-taste self-check: ${defined.size} helpers in ${Object.keys(rules.categories).length} categories have rules (${withTips} with tips), fixture advice, no-shotcards silence and plug-in shape verified`);
