// lottie <file.lottie> [out.json] [--animation <id>]   unzip a dotLottie file into plain Lottie JSON (images inlined) for KIT.lottie; default out is
//                        <project>/<film or hf>/assets/<name>.json. Prints the usage line. Lists the animations when the file has several.
import fs from "node:fs";
import path from "node:path";
import { readDotLottie } from "../dotlottie.mjs";

export default async function lottie({ proj, args }) {
  const a = args.slice(), i = a.indexOf("--animation"), animation = i >= 0 ? a.splice(i, 2)[1] : undefined;
  const [src, out0] = a;
  if (!src) { console.log("usage: reelwright lottie [project] <file.lottie> [out.json] [--animation <id>]"); process.exit(1); }
  let r;
  try { r = readDotLottie(fs.readFileSync(src), { animation }); } catch (e) { console.log(`${src}: ${e.message}`); process.exit(1); }
  const P = JSON.parse(fs.readFileSync(path.join(proj, "project.json"), "utf8"));
  const out = out0 || path.join(proj, P.renderer === "hyperframes" ? "hf" : "film", "assets", path.basename(src).replace(/\.lottie$/i, "") + ".json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(r.json));
  console.log(`${out} — ${r.json.w}x${r.json.h}, ${((r.json.op - r.json.ip) / r.json.fr).toFixed(2)} s, ${r.json.layers.length} layers` + (r.animations.length > 1 ? `; animations in the file: ${r.animations.join(", ")}` : ""));
  console.log(`usage: KIT.lottie(el, 'assets/${path.basename(out)}', { t0: W(...) })   (load vendor/lottie/lottie.min.js before tools/runtimes.js)`);
}
