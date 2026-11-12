// compare <variant> <variant> [<variant>..] --at t,t [--labels a,b,c] [--out file.png]
//                    N variants of a film at the same moments, one labelled PNG (a row per variant, a column per time). A variant is a
//                    project (projects/x, or projects/x@style for another look: its stills are rendered, its own stills/ left alone),
//                    a video (mp4, mov, webm) or a folder of stills named t<time>.jpg (the nearest to each time is used).
//                    Default output: compare.png in the current folder.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { sheet } from "./stills2.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const VIDEO = /\.(mp4|mov|webm|mkv|m4v)$/i, IMAGE = /\.(png|jpe?g|webp)$/i;
const fail = (m) => { console.error(m); process.exit(1); };
const num = (t) => "t" + Number(t).toFixed(2).padStart(6, "0");

// `reelwright compare a b` hands the first dir to bin as "the project": take the arguments from argv instead
const GLOBAL = ["--style", "--lang", "--formats", "--as"];
export function variantsOf(argv, own) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--no-cache" || argv[i] === "--strict") continue;
    if ([...GLOBAL, ...own].includes(argv[i])) { i++; continue; }
    if (!argv[i].startsWith("--")) out.push(argv[i]);
  }
  return out;
}

// → { label, file(t) → png path } for one variant
function frames(spec, ts, work) {
  const [target, style] = spec.split("@");
  if (fs.existsSync(path.join(target, "project.json"))) {
    const dir = path.resolve(target), stills = path.join(dir, "stills"), keep = path.join(dir, "stills-keep");
    const had = fs.existsSync(stills);
    let done = false;
    const restore = () => { if (done) return; done = true; fs.rmSync(stills, { recursive: true, force: true }); if (had) fs.renameSync(keep, stills); };   // the project's own stills come back, or go away if it had none
    if (had) fs.renameSync(stills, keep);
    process.once("exit", restore);
    const py = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
    const env = { ...process.env, PYTHONUTF8: "1", ...(style ? { REELWRIGHT_STYLE: style } : {}) };
    const run = (cmd, ...a) => { const r = spawnSync(cmd, a, { stdio: "inherit", env, cwd: ROOT }); if (r.status !== 0) { restore(); fail(`${spec}: ${path.basename(a[0])} failed`); } };
    run(py, path.join(ROOT, "tools", "sched.py"), dir);
    run(process.execPath, path.join(ROOT, "tools", "render.mjs"), dir, "stills", ts.join(","));
    const got = {};
    for (const t of ts) { got[t] = path.join(work, `${path.basename(dir)}-${style || "own"}-${num(t)}.jpg`); fs.copyFileSync(path.join(stills, num(t) + ".jpg"), got[t]); }
    restore();
    return { label: spec, file: (t) => got[t] };
  }
  if (VIDEO.test(target) && fs.existsSync(target)) {
    return { label: path.basename(target), file: (t) => {
      const o = path.join(work, `${path.basename(target)}-${num(t)}.png`);
      const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-ss", String(t), "-i", target, "-frames:v", "1", "-update", "1", o], { encoding: "utf8" });
      if (r.status !== 0 || !fs.existsSync(o)) fail(`${target}: no frame at ${t}s ${r.stderr}`);
      return o;
    } };
  }
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    const files = fs.readdirSync(target).filter((f) => IMAGE.test(f)).map((f) => ({ f, t: Number((/^t([\d.]+?)\.\w+$/.exec(f) || [])[1]) })).filter((x) => x.t === x.t);
    if (!files.length) fail(`${target}: a folder of stills needs files named t<time>.jpg`);
    return { label: path.basename(path.resolve(target)), file: (t) => path.join(target, files.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).f) };
  }
  if (IMAGE.test(target) && fs.existsSync(target)) return { label: path.basename(target), file: () => target };
  return fail(`variant "${spec}": not a project, video, image or folder of stills`);
}

export default async function compare() {
  const argv = process.argv.slice(3), own = ["--at", "--labels", "--out", "--cols"];
  const val = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const specs = variantsOf(argv, own), at = val("--at"), labels = val("--labels")?.split(",");
  if (specs.length < 2 || !at) fail("usage: reelwright compare <variant> <variant> [..] --at t,t [--labels a,b] [--out file.png]");
  const ts = [...new Set(at.split(",").map(Number))].filter((t) => t >= 0);
  if (!ts.length || ts.some((t) => t !== t)) fail("--at takes seconds, like 1.5,4");
  if (labels && labels.length !== specs.length) fail(`--labels: ${labels.length} labels for ${specs.length} variants`);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "reelwright-compare-"));
  try {
    const cells = [];
    specs.forEach((s, i) => {
      const v = frames(s, ts, work);
      for (const t of ts) cells.push({ label: labels?.[i] ?? v.label, sub: `t=${t.toFixed(2)}s`, file: v.file(t) });
    });
    const out = path.resolve(val("--out") || "compare.png");
    await sheet(cells, { out, cols: Math.min(ts.length, Number(val("--cols") || 6)), cellW: ts.length > 3 ? 360 : 520, layout: true });
    console.log(`compare → ${out}  (${specs.length} variants × ${ts.length} moments; cell positions in ${out.replace(/\.png$/i, "")}.json)`);
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
}
