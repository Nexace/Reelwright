// node tools/selfcheck/p8-docs.mjs — the P8 docs (L1 skill references and the two companion skills, L2 three workflow recipes, L4 three prompting
// pages): they exist and are not stubs, every `docs/...` path they mention exists, every `./video.sh <cmd>` / `reelwright <cmd>` they show is a
// real command, every KIT.* name they use is defined in tools/*.js, the skills carry front matter, the L1 reference table covers all
// eleven topics, and the patch for the shared skill file names every new page. Offline.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { commandNames } from "../commands/json.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const rd = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const cmds = new Set(commandNames(ROOT));
const kit = ["engine", "layouts", "shots", "math", "doodle", "compose", "media", "fit", "runtimes"].map((n) => rd(`tools/${n}.js`)).join("\n");

const RECIPES = ["pr-to-video", "lyric-video", "faceless-explainer"].map((n) => `docs/recipes/${n}.md`);
const PROMPTS = ["data-maps", "recreate-reference", "editing-existing"].map((n) => `docs/playbook/prompting-${n}.md`);
const ALL = [...RECIPES, ...PROMPTS, "docs/playbook/skill-references.md", "docs/playbook/skill-patch.md", ".claude/skills/reelwright-cli/SKILL.md", ".claude/skills/reelwright-registry/SKILL.md"];

let paths = 0, commands = 0, apis = 0;
for (const f of ALL) {
  const s = rd(f);
  assert.ok(s.split("\n").length >= (f.endsWith("skill-patch.md") ? 8 : 12), `${f} is a stub`);
  for (const m of s.matchAll(/`?((?:docs|tools|vendor)\/[\w./<>-]+\.(?:md|js|mjs|py|json|jpg))`?/g)) {
    if (/[<>]/.test(m[1])) continue;
    assert.ok(fs.existsSync(path.join(ROOT, m[1])), `${f}: ${m[1]} does not exist`); paths++;
  }
  for (const m of s.matchAll(/(?:\.\/video\.sh|node bin\/reelwright\.mjs|reelwright|pvk) ([a-z][\w-]*)/g)) {
    if (["json"].includes(m[1]) || cmds.has(m[1]) || ["is", "the", "writes", "never", "a", "and", "or", "of", "in", "to", "command", "does", "skill"].includes(m[1])) { commands += cmds.has(m[1]) ? 1 : 0; continue; }
    assert.fail(`${f}: "${m[0]}" is not a command (known: ${[...cmds].join(" ")})`);
  }
  for (const m of s.matchAll(/KIT\.((?:layout|shot|math|fit|doodle)\.)?([a-zA-Z]+)/g)) {
    assert.ok(new RegExp(`(?:K\\.|L\\.|S\\.|\\b)${m[2]}\\b`).test(kit), `${f}: KIT.${m[1] || ""}${m[2]} is not defined in tools/*.js`); apis++;
  }
}
for (const f of RECIPES) { const s = rd(f); assert.match(s, /^# /m); assert.match(s, /## When to use/); assert.match(s, /\[Back to the index\]\(README\.md\)/, f); }
for (const f of PROMPTS) assert.ok((rd(f).match(/^> /gm) || []).length >= 4, `${f}: at least 4 ready-to-paste prompts`);
for (const f of ALL.filter((x) => x.endsWith("SKILL.md"))) assert.match(rd(f), /^---\nname: [\w-]+\ndescription: .{40,}\n---/, `${f} front matter`);

const ref = rd("docs/playbook/skill-references.md");
for (const topic of ["film", "captions", "overlays", "motion", "look", "sound", "story", "storyboard", "review", "format", "runtimes"])
  assert.match(ref, new RegExp(`^\\| ${topic} \\|`, "m"), `reference "${topic}" is missing`);
assert.match(ref, /## CLI skill/); assert.match(ref, /## Registry skill/);
const patch = rd("docs/playbook/skill-patch.md");
for (const n of ["skill-references", "prompting-", "pr-to-video", "lyric-video", "faceless-explainer", "catalog", "captions", "check", "doctor", "audio-report", "json"]) assert.ok(patch.includes(n), `patch should name ${n}`);
console.log(`p8-docs self-check: ${ALL.length} pages, ${paths} paths, ${commands} command lines and ${apis} KIT names verified, 11 skill references, patch complete`);
