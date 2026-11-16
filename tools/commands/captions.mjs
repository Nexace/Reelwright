// captions [project] [<caption-component>] [--format remotion] [--from captions.json]   write <project>/transcript.json ([{text,start,end}], from timeline.json VO words) and, given a
//                        caption-* component (see `catalog --tag caption-style`), <project>/hf/blocks/<name>.html fed by it
//                        (use with KIT.block('<name>'); the film loads vendor/gsap). Run `info` first (timeline.json).
//                        --format remotion also writes <project>/captions.json, Remotion's Caption[] ({ text, startMs, endMs, timestampMs, confidence, pageBreakAfter });
//                        --from <file> reads such a file into transcript.json instead of timeline.json (no `info` needed).
import fs from "node:fs";
import path from "node:path";
import { transcriptFrom, adaptCaption, retarget, toCaptions, fromCaptions } from "../captions.mjs";   // adaptCaption: all 16 components; retarget is the fallback

export default async function captions({ proj, args, ROOT }) {
  const take = (f) => { const i = args.indexOf(f); return i < 0 ? undefined : args.splice(i, 2)[1]; };
  const format = take("--format"), from = take("--from");
  if (format && format !== "remotion") { console.log(`--format is remotion (Caption JSON), not "${format}"`); process.exit(1); }
  const tlf = path.join(proj, "timeline.json");
  if (!from && !fs.existsSync(tlf)) { console.log(`no ${tlf}: run \`reelwright info ${path.basename(proj)}\` first`); process.exit(1); }
  let tl = null, words;
  try { words = from ? fromCaptions(JSON.parse(fs.readFileSync(from, "utf8"))) : transcriptFrom((tl = JSON.parse(fs.readFileSync(tlf, "utf8")))); } catch (e) { console.log(`${from || tlf}: ${e.message}`); process.exit(1); }
  if (!words.length) { console.log(`${from || "timeline.json"} has no ${from ? "captions" : "VO words"}`); process.exit(1); }
  fs.writeFileSync(path.join(proj, "transcript.json"), JSON.stringify(words, null, 1));
  console.log(`${path.join(proj, "transcript.json")} — ${words.length} words, ${words[0].start}–${words.at(-1).end} s`);
  if (format) { fs.writeFileSync(path.join(proj, "captions.json"), JSON.stringify(toCaptions(words), null, 1)); console.log(`${path.join(proj, "captions.json")} — Remotion Caption JSON`); }
  const name = args[0];
  if (!name) return;
  const src = path.join(ROOT, "vendor", "hyperframes", "registry", "components", name, name + ".html");
  if (!/^caption-[\w-]+$/.test(name) || !fs.existsSync(src)) { console.log(`${name} is not a caption component: reelwright catalog --tag caption-style`); process.exit(1); }
  const dest = path.join(proj, "hf", "blocks", name + ".html");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `<!-- ${name} from the HyperFrames catalog (Apache-2.0, vendor/hyperframes/LICENSE), words from transcript.json -->\n` +
    (() => { const h = fs.readFileSync(src, "utf8"); try { return adaptCaption(h, words); } catch { return retarget(h, words, tl?.DUR ?? words.at(-1).end + 0.6); } })());
  console.log(`${dest} — use KIT.block('${name}') and load vendor/gsap/dist/gsap.min.js`);
}
