// node tools/theme-gallery.mjs [theme ...] [--projects a,b] [--out <dir>] [--sheet <file.jpg>]
// Renders every theme (or those named) on example-hf and layouts-hf (or --projects) and checks each one:
//   static    tools/theme-check.mjs (FAIL: tokens, #hex palette, bundled fonts; WARN: token contrast)
//   page QA   tools/qa_page.mjs with the theme applied: caption gate (safe area, ≤ 2 lines, contrast ≥ 4.5 on real
//             pixels), illustrative label, and the overlap / tiny-text / wordy WARNs
//   stills    at 30 % and 70 % of each film → <out>/<NN theme>/ and <out>/sheet.jpg, one labelled row per theme
//             (out: scratch/theme-gallery). --sheet also writes a 1600 px wide copy, e.g. docs/playbook/theme-gallery.jpg.
// Works on copies of the projects under <out>/work/, so the projects are untouched and runs with different --out can go
// side by side. Needs each project's audio first (`reelwright audio <project>`). Exit 1 when any theme has a FAIL, a
// caption problem or a WARN.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkTheme, allThemes } from "./theme-check.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i < 0 ? null : args.splice(i, 2)[1]; };
const projects = (opt("--projects") || "example-hf,layouts-hf").split(",");
const OUT = path.resolve(opt("--out") || path.join(ROOT, "scratch", "theme-gallery"));
const sheet = opt("--sheet");
const names = args.length ? args : allThemes();
fs.rmSync(OUT, { recursive: true, force: true });

const run = (bin, a, env = {}) => {
  const r = spawnSync(bin, a, { cwd: ROOT, encoding: "utf8", env: { ...process.env, REELWRIGHT_STYLE: "", ...env } });
  if (r.status !== 0) throw new Error(`${path.basename(a[0])} ${a.slice(1).join(" ")}: ${(r.stderr || r.stdout).trim().split("\n").slice(-3).join(" / ")}`);
  return r.stdout;
};
const SKIP = new Set(["frames", "stills", "out", ".cache", "clips"]);
const work = projects.map((p) => {
  const src = path.join(ROOT, "projects", p), dst = path.join(OUT, "work", p);
  if (!fs.existsSync(path.join(src, "timeline.json"))) { console.error(`run \`reelwright audio ${p}\` first`); process.exit(1); }
  fs.cpSync(src, dst, { recursive: true, filter: (f) => !SKIP.has(path.relative(src, f).split(path.sep)[0]) });
  return [p, dst, JSON.parse(fs.readFileSync(path.join(dst, "timeline.json"), "utf8")).DUR];
});

let bad = 0;
names.forEach((name, k) => {
  const { fail, warn } = checkTheme(name), issues = [...fail.map((x) => "FAIL " + x), ...warn.map((x) => "WARN " + x)];
  const row = path.join(OUT, `${String(k + 1).padStart(2, "0")} ${name}`);
  fs.mkdirSync(row, { recursive: true });
  for (const [p, dir, dur] of work) {
    const env = { REELWRIGHT_STYLE: name }, stills = path.join(dir, "stills");
    try {
      run(process.execPath, ["tools/render.mjs", dir, "stills", [0.3, 0.7].map((f) => (f * dur).toFixed(2)).join(",")], env);
      for (const f of fs.readdirSync(stills).filter((f) => f.endsWith(".jpg")).sort()) fs.copyFileSync(path.join(stills, f), path.join(row, `${p} ${f}`));
      fs.rmSync(stills, { recursive: true, force: true });
      const q = JSON.parse(run(process.execPath, ["tools/qa_page.mjs", dir], env).trim().split("\n").pop());
      for (const c of q.captions) issues.push(`${p}: caption ${c}`);
      if (q.illustrative?.length) issues.push(`${p}: illustrative label missing at ${q.illustrative.join(", ")}s`);
      for (const w of ["tiny", "overlap", "wordy"]) for (const x of q[w] || []) issues.push(`${p}: WARN ${w === "tiny" ? "tiny-text" : w} ${x}`);
      if (q.warnError) issues.push(`${p}: WARN checks threw ${q.warnError}`);
    } catch (e) { issues.push(`${p}: ${e.message}`); }
  }
  bad += issues.length > 0;
  console.log(`${issues.length ? "✗" : "✓"} ${name}${issues.map((x) => "\n    " + x).join("")}`);
});
fs.rmSync(path.join(OUT, "work"), { recursive: true, force: true });
run(PY, ["tools/sheet.py", path.dirname(OUT), path.basename(OUT)]);
if (sheet) run(PY, ["-c", "import sys; from PIL import Image; i=Image.open(sys.argv[1]); w=1600; i.resize((w, round(i.height*w/i.width)), Image.LANCZOS).save(sys.argv[2], quality=82)",
  path.join(OUT, "sheet.jpg"), path.resolve(sheet)]);
console.log(`${names.length - bad}/${names.length} themes clean · sheet: ${path.relative(ROOT, path.join(OUT, "sheet.jpg"))}${sheet ? " and " + sheet : ""}`);
process.exit(bad ? 1 : 0);
