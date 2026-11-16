// tools/checks/taste-shotcards.page.mjs — WARN-only plug-in for `reelwright qa` (and standalone: node tools/checks/taste-shotcards.page.mjs <project>).
// A film that calls KIT.shotcards.<helper> gets that helper's tips and, once per category, the category's advice, read from
// tools/checks/taste-shotcards.json (edit the data, not this file). Static: it reads the film's own scripts, no page, no pixels, so a
// film without shotcards gets no lines and every existing check's output is unchanged. Lines: `<helper> (<category>): <advice>`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const kind = "warn";
const RULES = JSON.parse(fs.readFileSync(fileURLToPath(new URL("./taste-shotcards.json", import.meta.url)), "utf8"));
const MAX_LINES = 12;   // advice, not a wall of text (as taste.page.mjs)

// the helpers a script names: KIT.shotcards.x, an alias (const SC = KIT.shotcards; SC.x) or a destructure (const { x } = KIT.shotcards)
export function helpersUsed(src) {
  const found = new Set(), alias = [...src.matchAll(/\b([A-Za-z_][\w]*)\s*=\s*(?:window\.)?KIT\.shotcards\b(?!\.)/g)].map((m) => m[1]);
  const base = ["\\bKIT\\.shotcards", ...alias.map((a) => `\\b${a}`)].join("|");
  for (const m of src.matchAll(new RegExp(`(?:${base})\\.(types\\.)?([A-Za-z0-9]+)`, "g"))) found.add((m[1] || "") + m[2]);
  for (const m of src.matchAll(/\{([^}]*)\}\s*=\s*(?:window\.)?KIT\.shotcards\b/g)) for (const n of m[1].split(",")) { const k = n.split(":")[0].trim(); if (k) found.add(k); }
  return [...found].filter((n) => RULES.helpers[n]);
}

export function advise(used) {
  const lines = [], cats = new Set();
  for (const n of used) {
    const h = RULES.helpers[n];
    for (const t of h.tips) lines.push(`${n} (${h.category}): ${t}`);
    if (!cats.has(h.category)) { cats.add(h.category); lines.push(`${n} (${h.category}): ${RULES.categories[h.category]}`); }
  }
  return lines;
}

export function scan(DIR) {
  const files = [];
  for (const d of ["film", "hf"]) {
    const p = path.join(DIR, d);
    if (fs.existsSync(p)) for (const f of fs.readdirSync(p)) if (/\.(js|html)$/.test(f) && !/^kit-|^code-|^model-/.test(f)) files.push(path.join(p, f));
  }
  return advise([...new Set(files.flatMap((f) => helpersUsed(fs.readFileSync(f, "utf8"))))]).slice(0, MAX_LINES);
}

export default async (_page, { DIR } = {}) => { try { return scan(DIR); } catch (e) { return [`taste-shotcards skipped: ${String((e && e.message) || e).split("\n")[0]}`]; } };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.argv[2]) { console.error("usage: node tools/checks/taste-shotcards.page.mjs <project>"); process.exit(2); }
  const lines = scan(path.resolve(process.argv[2]));
  console.log(lines.length ? lines.join("\n") : "taste-shotcards: no shotcards used");
}
