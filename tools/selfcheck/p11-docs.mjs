// node tools/selfcheck/p11-docs.mjs — the Phase 11 docs, read from the directories so a command, page or recipe added later is checked too:
//   1. every command (bin/reelwright.mjs built-ins and every tools/commands/*.mjs) has a row in the README "Every command" table, no
//      plug-in has more than two, no two rows share a first cell, and every --flag a row names exists in that command's source (or bin);
//   2. every docs/playbook/*.md is listed in docs/playbook/README.md and in docs/PLAYBOOK.md, every docs/recipes/**/*.md is linked from
//      docs/recipes/README.md or the index of its own folder, and every link in those indexes lands on a file;
//   3. the three skills have front matter, every `docs/…` path they name exists, every `reelwright <cmd>` / `pvk <cmd>` / `./video.sh <cmd>` they
//      show is a real command, and every KIT.<name> (and KIT.<name>.<member>) they use is defined in tools/**/*.js.
// Offline, no browser. Same approach as tools/selfcheck/p8-docs.mjs.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { commandNames } from "../commands/json.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const rd = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const walk = (d, ext) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.posix.join(d, e.name), ext) : e.name.endsWith(ext) ? [path.posix.join(d, e.name)] : []);   // posix: Windows would give backslashes
const cmds = commandNames(ROOT);
const plug = new Set(fs.readdirSync(path.join(ROOT, "tools/commands")).filter((f) => f.endsWith(".mjs")).map((f) => f.slice(0, -4)));
const bin = rd("bin/reelwright.mjs");

// ── 1. README commands table ──
const readme = rd("README.md"), tbl = readme.slice(readme.indexOf("## Every command"), readme.indexOf("\n## ", readme.indexOf("## Every command") + 5));
const rows = [...tbl.matchAll(/^\| (.+?) \| (.+) \|$/gm)].map((m) => ({ first: m[1], all: m[0] })).filter((r) => r.first !== "Command" && !/^-+$/.test(r.first));
assert.ok(rows.length >= cmds.length - 5, `README table has only ${rows.length} rows`);
const heads = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim().split(/\s+/)[0].replace(/^reelwright$/, ""));
const rowsOf = {};
for (const r of rows) for (const h of new Set(heads(r.first))) (rowsOf[h] ||= []).push(r);
assert.equal(new Set(rows.map((r) => r.first)).size, rows.length, "two README rows share the same first cell");
let flags = 0;
for (const c of cmds) {
  if (c === "help") continue;
  const rs = rowsOf[c];
  assert.ok(rs?.length, `README "Every command" has no row for \`${c}\` (its header comment in tools/commands/${c}.mjs is the text to use)`);
  assert.ok(rs.length <= (plug.has(c) ? 2 : 3), `README lists \`${c}\` in ${rs.length} rows`);
  const src = (plug.has(c) ? rd(`tools/commands/${c}.mjs`) : "") + bin;
  for (const r of rs) for (const f of new Set(r.all.match(/--[a-z][\w-]*/g) || [])) {
    if (["--help"].includes(f)) continue;
    assert.ok(src.includes(f), `README row for \`${c}\` names ${f}, which is in neither tools/commands/${c}.mjs nor bin/reelwright.mjs`); flags++;
  }
}

// ── 2. indexes ──
const links = (md) => [...md.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)].map((m) => m[1]).filter((l) => !/^https?:/.test(l));
const exists = (from, l) => assert.ok(fs.existsSync(path.join(ROOT, path.dirname(from), l)), `${from}: link to ${l} lands nowhere`);
const pbIndex = rd("docs/playbook/README.md"), pbMain = rd("docs/PLAYBOOK.md");
links(pbIndex).forEach((l) => exists("docs/playbook/README.md", l));
const pages = fs.readdirSync(path.join(ROOT, "docs/playbook")).filter((f) => f.endsWith(".md") && f !== "README.md");
for (const f of pages) {
  assert.ok(links(pbIndex).includes(f), `docs/playbook/README.md does not link ${f}`);
  assert.ok(pbMain.includes(`playbook/${f}`), `docs/PLAYBOOK.md does not name playbook/${f}`);
}
const recipes = walk("docs/recipes", ".md").filter((f) => f !== "docs/recipes/README.md");
const idx = (dir) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => /^(README|.*index)\.md$/.test(f)).flatMap((f) => links(rd(`${dir}/${f}`)));
for (const f of recipes) {
  const dir = path.posix.dirname(f.split(path.sep).join("/")), name = path.posix.basename(f);
  const isIndex = dir !== "docs/recipes" && /^(README|.*index)\.md$/.test(name);   // a sub-index must itself be linked from the top one
  assert.ok((isIndex ? links(rd("docs/recipes/README.md")).map((l) => path.posix.normalize(l)) : idx(dir)).includes(isIndex ? `${path.posix.relative("docs/recipes", dir)}/${name}` : name),
    `${dir}/${name} is not linked from ${isIndex ? "docs/recipes/README.md" : "an index in " + dir}`);
}
for (const f of ["docs/recipes/README.md", ...recipes.filter((x) => /(README|index)\.md$/.test(x))]) links(rd(f)).filter((l) => l.endsWith(".md") || l.endsWith(".jpg")).forEach((l) => exists(f, l));

// ── 3. skills ──
const SKILLS = fs.readdirSync(path.join(ROOT, ".claude/skills")).map((d) => `.claude/skills/${d}/SKILL.md`);
const kitSrc = [...walk("tools", ".js").filter((f) => !f.includes("selfcheck")), ...walk("tools", ".mjs").filter((f) => !f.includes("selfcheck") && !f.includes("commands"))].map(rd).join("\n");
const known = new Set(cmds), STOP = new Set(["is", "the", "writes", "never", "a", "and", "or", "of", "in", "to", "command", "does", "skill", "with", "from", "on", "as", "for", "runs", "it", "then", "no", "prints", "finds", "renderer", "wrapper", "if", "page"]);
let nPaths = 0, nCmds = 0, nKit = 0;
const mentioned = new Set();
for (const f of SKILLS) {
  const s = rd(f);
  assert.match(s, /^---\r?\nname: [\w-]+\r?\ndescription: .{40,}\r?\n---/, `${f} front matter`);
  for (const m of s.matchAll(/`?((?:docs|tools|vendor)\/[\w./<>-]+\.(?:md|js|mjs|py|json|jpg))`?/g)) { if (/[<>]/.test(m[1])) continue; assert.ok(fs.existsSync(path.join(ROOT, m[1])), `${f}: ${m[1]} does not exist`); nPaths++; }
  for (const m of s.matchAll(/(?:\.\/video\.sh|node bin\/reelwright\.mjs|reelwright|pvk) ([a-z][\w-]*)/g)) {
    if (known.has(m[1])) { mentioned.add(m[1]); nCmds++; } else assert.ok(STOP.has(m[1]), `${f}: "${m[0]}" is not a command (known: ${[...known].join(" ")})`);
  }
  for (const m of s.matchAll(/`([a-z][\w-]*)[ `]/g)) if (known.has(m[1])) mentioned.add(m[1]);
  for (const m of s.matchAll(/\bKIT\.([A-Za-z]\w*)(?:\.([A-Za-z]\w*))?/g)) {
    assert.ok(new RegExp(`\\b${m[1]}\\b`).test(kitSrc), `${f}: KIT.${m[1]} is not defined in tools/`);
    if (m[2]) assert.ok(new RegExp(`\\b${m[2]}\\b`).test(kitSrc), `${f}: KIT.${m[1]}.${m[2]} is not defined in tools/`);
    nKit++;
  }
}
const unmentioned = cmds.filter((c) => !mentioned.has(c) && c !== "help");
console.log(`p11-docs self-check: ${cmds.length} commands (${plug.size} plug-ins) all in the README table (${flags} flags checked against source), ${pages.length} playbook pages and ${recipes.length} recipe pages indexed, ${SKILLS.length} skills: ${nPaths} paths, ${nCmds} command lines and ${nKit} KIT names verified`);
if (unmentioned.length) console.log(`  (not named in any skill, fine for ones a film's workflow never needs: ${unmentioned.join(" ")})`);
