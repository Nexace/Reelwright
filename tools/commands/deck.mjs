// deck [list] | deck find <words> | deck deal [--seed S] [--cats open,cam,...]   the motion deck: 46 named moves (open, seam, cam, reveal,
//                  type, act, emph, close), each with the KIT call and the numbers behind it. `deal` hands one move per group from a seeded
//                  hash (same seed, same hand) as a place to start an edit. docs/playbook/p5-deck.md; tools/p5-deck.mjs.
import { DECK, find, deal } from "../p5-deck.mjs";

const line = (m) => `${String(m.n).padStart(2)}  ${m.cat.padEnd(6)} ${m.name.padEnd(16)} ${m.call}\n${"".padEnd(32)}${m.numbers}`;

export default async ({ args }) => {
  const [sub = "list", ...rest] = args, opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest.splice(i, 2)[1] : d; };
  if (sub === "list") return console.log(DECK.map(line).join("\n"));
  if (sub === "find") {
    const r = find(rest.join(" "));
    return console.log(r.length ? r.map(line).join("\n") : `no move matches "${rest.join(" ")}"`);
  }
  if (sub === "deal") {
    const seed = opt("--seed", "reelwright"), cats = opt("--cats"), hand = deal({ seed, cats: cats && cats.split(",") });
    return console.log(`hand for seed "${seed}":\n` + hand.map(line).join("\n"));
  }
  console.log("usage: reelwright deck [list] | find <words> | deal [--seed S] [--cats a,b]");
  process.exit(1);
};
