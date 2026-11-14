// captions [project] [<caption-component>]   write <project>/transcript.json ([{text,start,end}], from timeline.json VO words) and, given a
//                        caption-* component (see `catalog --tag caption-style`), <project>/hf/blocks/<name>.html fed by it
//                        (use with KIT.block('<name>'); the film loads vendor/gsap). Run `info` first (timeline.json).
import fs from "node:fs";
import path from "node:path";
import { transcriptFrom, retarget } from "../captions.mjs";

export default async function captions({ proj, args, ROOT }) {
  const tlf = path.join(proj, "timeline.json");
  if (!fs.existsSync(tlf)) { console.log(`no ${tlf}: run \`reelwright info ${path.basename(proj)}\` first`); process.exit(1); }
  const tl = JSON.parse(fs.readFileSync(tlf, "utf8")), words = transcriptFrom(tl);
  if (!words.length) { console.log("timeline.json has no VO words"); process.exit(1); }
  fs.writeFileSync(path.join(proj, "transcript.json"), JSON.stringify(words, null, 1));
  console.log(`${path.join(proj, "transcript.json")} — ${words.length} words, ${words[0].start}–${words.at(-1).end} s`);
  const name = args[0];
  if (!name) return;
  const src = path.join(ROOT, "vendor", "hyperframes", "registry", "components", name, name + ".html");
  if (!/^caption-[\w-]+$/.test(name) || !fs.existsSync(src)) { console.log(`${name} is not a caption component: reelwright catalog --tag caption-style`); process.exit(1); }
  const dest = path.join(proj, "hf", "blocks", name + ".html");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `<!-- ${name} from the HyperFrames catalog (Apache-2.0, vendor/hyperframes/LICENSE), words from transcript.json -->\n` +
    retarget(fs.readFileSync(src, "utf8"), words, tl.DUR));
  console.log(`${dest} — use KIT.block('${name}') and load vendor/gsap/dist/gsap.min.js`);
}
