// add-lottie [project] <file.lottie> [name]   unpack a dotLottie archive into the project: <assets>/lottie/<name>.lottie (the
//                  original, for KIT.dotLottie) and <assets>/lottie/<name>/ (every animation, theme, image and state machine as
//                  plain files, for KIT.lottie) plus index.json (animations with size, frame rate and duration; themes; state
//                  machines; expression warnings). <assets> is hf/assets (hyperframes films) or assets (others).
//                  Prints the usage lines. No network, no install: the zip is read here.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// minimal zip reader: central directory, stored (0) and deflate (8) entries; rejects zip64, encryption and unsafe paths
export function readZip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error("not a zip file (no end-of-directory record)");
  const n = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const out = {};
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("corrupt zip central directory");
    const flags = buf.readUInt16LE(p + 8), method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), size = buf.readUInt32LE(p + 24);
    const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nl);
    p += 46 + nl + xl + cl;
    if (name.endsWith("/")) continue;
    if (flags & 1) throw new Error(`${name}: encrypted entries are not supported`);
    if (csize === 0xffffffff || size === 0xffffffff) throw new Error("zip64 is not supported");
    if (/^([\\/]|[A-Za-z]:)|(^|[\\/])\.\.([\\/]|$)/.test(name)) throw new Error(`unsafe path in archive: ${name}`);
    const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28), raw = buf.subarray(start, start + csize);
    if (method === 0) out[name] = Buffer.from(raw);
    else if (method === 8) out[name] = zlib.inflateRawSync(raw);
    else throw new Error(`${name}: compression method ${method} is not supported`);
    if (out[name].length !== size) throw new Error(`${name}: size mismatch`);
  }
  return out;
}

const NONDET = /\b(wiggle|random|seedRandom|gaussRandom)\s*\(|Math\.random/;
const exprs = (o, acc = []) => { if (Array.isArray(o)) o.forEach((v) => exprs(v, acc)); else if (o && typeof o === "object") { if (typeof o.x === "string" && "k" in o) acc.push(o.x); Object.values(o).forEach((v) => exprs(v, acc)); } return acc; };

export default async function addLottie({ proj, args }) {
  const file = args[0];
  if (!file || !fs.existsSync(file) || !/\.lottie$/i.test(file)) { console.log("usage: reelwright add-lottie [project] <file.lottie> [name]"); process.exit(1); }
  const name = (args[1] || path.basename(file, path.extname(file))).replace(/[^\w-]+/g, "-");
  const buf = fs.readFileSync(file);
  let files;
  try { files = readZip(buf); } catch (e) { console.log(`${file}: ${e.message}`); process.exit(1); }
  if (!files["manifest.json"]) { console.log(`${file}: no manifest.json: not a dotLottie archive`); process.exit(1); }
  const manifest = JSON.parse(files["manifest.json"].toString("utf8"));

  let hf = false;
  try { hf = JSON.parse(fs.readFileSync(path.join(proj, "project.json"), "utf8")).renderer === "hyperframes"; } catch { /* no project.json: plain folder */ }
  const root = path.join(proj, hf ? "hf" : "", "assets", "lottie"), dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(root, name + ".lottie"), buf);
  for (const [f, b] of Object.entries(files)) { const dest = path.join(dir, f); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, b); }

  // dotLottie v1 keeps animations/<id>.json, v2 a/<id>.json; themes themes/ or t/; state machines states/ or s/
  const kind = (f, a, b) => new RegExp(`^(${a}|${b})/(.+)\\.json$`).exec(f);
  const idx = { name, version: manifest.version, animations: [], themes: [], stateMachines: [], warnings: [] };
  for (const f of Object.keys(files)) {
    let m;
    if ((m = kind(f, "animations", "a"))) {
      const j = JSON.parse(files[f].toString("utf8")), ex = exprs(j);
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
