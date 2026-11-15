// make "<brief>" [--name n] [--audience a] [--length s] [--voice|--music-only] [--url u] [--folder f] [--yes]
//                  guided start, offline and with no AI service: reads the brief for what you want (a URL → from-url, a --folder → slideshow, promo/launch/teaser →
//                  the Ink Press promo, walkthrough/demo/app → new, explainer/motion/graphics → new --renderer hyperframes), picks a theme with theme-brief's matcher,
//                  drafts the voiceover lines (your "script: …" or quoted text split into sentences, else marked [DRAFT] placeholders, ~2.5 words per second),
//                  and prints the plan. Without --yes it stops there (dry run). With --yes it creates projects/<name> with the existing commands, writes AGENTS.md and
//                  CLAUDE.md into it and prints the next three commands. It never renders, never makes a paid call, never downloads (from-url loads the page you name).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { parseArgs, plan, show, create, nextSteps } from "../make.mjs";

export default function make({ args, ROOT }) {
  const bin = path.join(ROOT, "bin", "reelwright.mjs");
  const fail = (m) => { console.error(m); process.exit(1); };
  let P, o;
  try { o = parseArgs(args); P = plan(o, ROOT); } catch (e) { fail(e.message); }
  console.log(show(P));
  if (!o.yes) return console.log(`\ndry run: re-run with --yes to create ${P.dest}`);
  console.log("");
  try {
    create(P, ROOT, (a) => spawnSync(process.execPath, [bin, ...a], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 }));
  } catch (e) { fail(e.message); }
  console.log(`\ncreated ${P.dest} (AGENTS.md and CLAUDE.md written into it). Next:`);
  nextSteps(P).forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  if (P.voice) console.log("  (the voiceover needs the internet: `reelwright audio " + P.name + "` once the lines read right, before stills)");
}
