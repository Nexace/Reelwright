// docs [topic]          the craft docs from the terminal: no topic lists docs/playbook/*.md, docs/recipes/*.md and docs/PLAYBOOK.md with
//                        their first line; a topic prints the best match (name or a word in its title), e.g. `docs motion`, `docs recipes/push-in`
import fs from "node:fs";
import path from "node:path";

export default async function cmd({ args, ROOT }) {
  const D = path.join(ROOT, "docs");
  const all = [["PLAYBOOK", path.join(D, "PLAYBOOK.md")], ...["playbook", "recipes"].flatMap((d) =>
    fs.readdirSync(path.join(D, d)).filter((f) => f.endsWith(".md")).sort().map((f) => [`${d}/${f.slice(0, -3)}`, path.join(D, d, f)]))];
  const title = (f) => (fs.readFileSync(f, "utf8").split("\n").find((l) => l.startsWith("#")) || "").replace(/^#+\s*/, "");
  const q = args.join(" ").toLowerCase().replace(/\.md$/, "");
  if (!q) { for (const [n, f] of all) console.log(`${n.padEnd(34)} ${title(f)}`); return; }
  const hit = all.find(([n]) => n.toLowerCase() === q) || all.find(([n]) => n.toLowerCase().split("/").pop() === q) ||
    all.find(([n, f]) => n.toLowerCase().includes(q) || title(f).toLowerCase().includes(q));
  if (!hit) { console.log(`no doc matches "${q}": run \`reelwright docs\` to list them`); process.exit(1); }
  console.log(`# ${hit[0]}  (${path.relative(ROOT, hit[1])})\n`);
  console.log(fs.readFileSync(hit[1], "utf8"));
}
