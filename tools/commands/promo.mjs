// promo <name|path> ["Title"]   start a film from the Ink Press promo template (projects/promo-ink-press): 36 s, 10 shots on the energy
//                  arc, music only. Copies project.json and hf/{index.html,film.js,content.js} to projects/<name>; edit hf/content.js
//                  (copy, logo letter, screenshots), then `reelwright all <name>`. Validate the arc: `reelwright arc <name>`. Offline.
import fs from "node:fs";
import path from "node:path";

export default function ({ args, ROOT }) {
  const [where, title] = args;
  if (!where) { console.log('usage: reelwright promo <name|path> ["Title"]'); process.exit(1); }
  const dest = /[\\/]/.test(where) ? path.resolve(where) : path.join(ROOT, "projects", where);
  if (fs.existsSync(dest)) { console.error(`${dest} already exists`); process.exit(1); }
  const src = path.join(ROOT, "projects", "promo-ink-press");
  fs.mkdirSync(path.join(dest, "hf"), { recursive: true });
  for (const f of ["index.html", "film.js", "content.js"]) fs.copyFileSync(path.join(src, "hf", f), path.join(dest, "hf", f));
  const P = JSON.parse(fs.readFileSync(path.join(src, "project.json"), "utf8"));
  const name = path.basename(dest);
  fs.writeFileSync(path.join(dest, "project.json"), JSON.stringify({ ...P, title: title || name, out: `out/${name}.mp4` }, null, 2) + "\n");
  console.log(`${dest}\n  edit hf/content.js (copy, logo letter, screenshots under assets/), then: reelwright arc ${name}; reelwright all ${name}`);
}
