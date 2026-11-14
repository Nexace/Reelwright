// catalog [words…] [--type block|component] [--tag <tag>] [--all] [--tags] [--json] [--pick]
//                        search the HyperFrames catalog reelwright has (components and blocks); --all also shows the ones it can't
//                        run; --tags lists tags with counts; --pick asks for a number and prints the add line. Add one with `add <name>`.
import readline from "node:readline/promises";
import { catalog, search } from "../catalog.mjs";

export default async function cmd({ args, ROOT }) {
  const a = args.slice(), flag = (n) => { const i = a.indexOf(n); if (i < 0) return false; a.splice(i, 1); return true; };
  const val = (n) => { const i = a.indexOf(n); if (i < 0) return undefined; return a.splice(i, 2)[1]; };
  const json = flag("--json"), all = flag("--all"), tags = flag("--tags"), pick = flag("--pick");
  const type = val("--type"), tag = val("--tag");
  if (type && !["block", "component"].includes(type)) { console.log("--type is block or component"); process.exit(1); }
  const items = catalog(ROOT);
  if (tags) {
    const n = {}; for (const i of search(items, { type, supported: !all })) for (const t of i.tags) n[t] = (n[t] || 0) + 1;
    const rows = Object.entries(n).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
    console.log(json ? JSON.stringify(rows.map(([tag, count]) => ({ tag, count }))) : rows.map(([t, c]) => `${t.padEnd(24)} ${c}`).join("\n"));
    return;
  }
  const hits = search(items, { type, tag, q: a.join(" "), supported: !all });
  if (json) { console.log(JSON.stringify(hits)); return; }
  hits.forEach((i, k) => console.log(`${pick ? String(k + 1).padStart(3) + " " : ""}${i.name.padEnd(34)} ${i.type.padEnd(9)} ${i.status === "supported" ? "" : "[" + i.status + "] "}${i.title}${i.duration ? `  (${i.duration} s, ${i.size})` : ""}`));
  console.log(`${hits.length} of ${items.length} items` + (hits.length ? "" : " (try --all, or `catalog --tags`)"));
  if (pick && hits.length && process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const n = Number(await rl.question("number to add: ")); rl.close();
    if (hits[n - 1]) console.log(`reelwright add ${hits[n - 1].name}`);
  }
}
