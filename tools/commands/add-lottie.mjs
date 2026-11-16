// add-lottie [project] <file.lottie> [name]   unpack a dotLottie archive into the project: <assets>/lottie/<name>.lottie (the
//                  original, for KIT.dotLottie) and <assets>/lottie/<name>/ (every animation, theme, image and state machine as
//                  plain files, for KIT.lottie) plus index.json (animations with size, frame rate and duration; themes; state
//                  machines; expression warnings). <assets> is hf/assets (hyperframes films) or assets (others).
//                  Prints the usage lines. No network, no install: the zip is read by tools/dotlottie.mjs.
// add-lottie [project] <file.lottie> --inline [out.json] [--animation <id>]   one animation as plain Lottie JSON with its images inlined
//                  as data URIs, for KIT.lottie; default out is <project>/<film or hf>/assets/<name>.json. Lists the animations when the
//                  file has several. (`reelwright lottie` is the deprecated old name of this mode.)
import fs from "node:fs";
import path from "node:path";
import { readZip, readDotLottie } from "../dotlottie.mjs";

const NONDET = /\b(wiggle|random|seedRandom|gaussRandom)\s*\(|Math\.random/;
const exprs = (o, acc = []) => { if (Array.isArray(o)) o.forEach((v) => exprs(v, acc)); else if (o && typeof o === "object") { if (typeof o.x === "string" && "k" in o) acc.push(o.x); Object.values(o).forEach((v) => exprs(v, acc)); } return acc; };

// --inline: what `reelwright lottie` did, unchanged
function inline(proj, args) {
  const a = args.slice(), i = a.indexOf("--animation"), animation = i >= 0 ? a.splice(i, 2)[1] : undefined;
  const [src, out0] = a;
  if (!src) { console.log("usage: reelwright add-lottie [project] <file.lottie> --inline [out.json] [--animation <id>]"); process.exit(1); }
  let r;
  try { r = readDotLottie(fs.readFileSync(src), { animation }); } catch (e) { console.log(`${src}: ${e.message}`); process.exit(1); }
  const P = JSON.parse(fs.readFileSync(path.join(proj, "project.json"), "utf8"));
  const out = out0 || path.join(proj, P.renderer === "hyperframes" ? "hf" : "film", "assets", path.basename(src).replace(/\.lottie$/i, "") + ".json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(r.json));
  console.log(`${out} — ${r.json.w}x${r.json.h}, ${((r.json.op - r.json.ip) / r.json.fr).toFixed(2)} s, ${r.json.layers.length} layers` + (r.animations.length > 1 ? `; animations in the file: ${r.animations.join(", ")}` : ""));
  console.log(`usage: KIT.lottie(el, 'assets/${path.basename(out)}', { t0: W(...) })   (load vendor/lottie/lottie.min.js before tools/runtimes.js)`);
}

export default async function addLottie({ proj, args }) {
  const k = args.indexOf("--inline");
  if (k >= 0) return inline(proj, args.filter((_, j) => j !== k));
  const file = args[0];
  if (!file || !fs.existsSync(file) || !/\.lottie$/i.test(file)) { console.log("usage: reelwright add-lottie [project] <file.lottie> [name]"); process.exit(1); }
  const name = (args[1] || path.basename(file, path.extname(file))).replace(/[^\w-]+/g, "-");
  const buf = fs.readFileSync(file);
  let files;
  try { files = readZip(buf); } catch (e) { console.log(`${file}: ${e.message}`); process.exit(1); }
  if (!files.has("manifest.json")) { console.log(`${file}: no manifest.json: not a dotLottie archive`); process.exit(1); }
  const manifest = JSON.parse(files.get("manifest.json").toString("utf8"));

  let hf = false;
  try { hf = JSON.parse(fs.readFileSync(path.join(proj, "project.json"), "utf8")).renderer === "hyperframes"; } catch { /* no project.json: plain folder */ }
  const root = path.join(proj, hf ? "hf" : "", "assets", "lottie"), dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(root, name + ".lottie"), buf);
  for (const [f, b] of files) { const dest = path.join(dir, f); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, b); }

  // dotLottie v1 keeps animations/<id>.json, v2 a/<id>.json; themes themes/ or t/; state machines states/ or s/
  const kind = (f, a, b) => new RegExp(`^(${a}|${b})/(.+)\\.json$`).exec(f);
  const idx = { name, version: manifest.version, animations: [], themes: [], stateMachines: [], warnings: [] };
  for (const f of files.keys()) {
    let m;
    if ((m = kind(f, "animations", "a"))) {
      const j = JSON.parse(files.get(f).toString("utf8")), ex = exprs(j);
      idx.animations.push({ id: m[2], file: f, w: j.w, h: j.h, fps: j.fr, frames: j.op - j.ip, duration: +((j.op - j.ip) / j.fr).toFixed(3), expressions: ex.length });
      if (ex.some((x) => NONDET.test(x))) idx.warnings.push(`${f}: wiggle/random expression: its frames differ between runs; the lottie-expressions qa gate fails it`);
    } else if ((m = kind(f, "themes", "t"))) idx.themes.push({ id: m[2], file: f });
    else if ((m = kind(f, "states", "s"))) idx.stateMachines.push({ id: m[2], file: f });
  }
  if (idx.stateMachines.length) idx.warnings.push("state machines run on a real-time clock and cannot be seeked: drive states from the film with KIT.dotLottie's `schedule` instead");
  fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify(idx, null, 2) + "\n");

  const rel = path.relative(path.join(proj, hf ? "hf" : ""), root).split(path.sep).join("/"), up = hf ? "" : "../";
  console.log(`${file} → ${dir}/  (${idx.animations.length} animation(s), ${idx.themes.length} theme(s), ${idx.stateMachines.length} state machine(s); ${path.join(root, name + ".lottie")})`);
  for (const a of idx.animations) console.log(`  ${a.id.padEnd(20)} ${a.w}x${a.h}  ${a.fps} fps  ${a.duration} s${a.expressions ? `  ${a.expressions} expression(s)` : ""}`);
  for (const w of idx.warnings) console.log(`warning: ${w}`);
  const first = idx.animations[0];
  console.log(`usage (${hf ? "hf/film.js; load kit/lottie/lottie.min.js" : "film.js; load ../../../vendor/lottie/lottie.min.js"} for KIT.lottie, or tools/dotlottie.js after tools/runtimes.js for KIT.dotLottie):\n` +
    `  KIT.dotLottie(KIT.el('div', 'box'), '${up}${rel}/${name}.lottie', { animation: '${first ? first.id : ""}', t0: W(...)${idx.themes[0] ? `, theme: '${idx.themes[0].id}'` : ""} })\n` +
    `  KIT.lottie(KIT.el('div', 'box'), '${up}${rel}/${name}/${first ? first.file : "a/<id>.json"}', { t0: W(...) })   // lottie-web: no WASM, no themes`);
}
