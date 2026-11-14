// compositions [project] [--all] [--json]   (--all: every project's renderer and composition count) the compositions in a HyperFrames project (hf/index.html and hf/compositions/*.html, hf/blocks/*.html):
//                        id, start, duration, size, and which file; with no project, every project's renderer and film length
import fs from "node:fs";
import path from "node:path";

const attr = (tag, n) => new RegExp(`${n}="([^"]*)"`).exec(tag)?.[1];
export function compositionsOf(hfDir) {
  const files = [["index.html", "."], ...["compositions", "blocks"].flatMap((d) => (fs.existsSync(path.join(hfDir, d)) ? fs.readdirSync(path.join(hfDir, d)).filter((f) => f.endsWith(".html")).map((f) => [path.join(d, f), d]) : []))];
  const out = [];
  for (const [f] of files) {
    const p = path.join(hfDir, f);
    if (!fs.existsSync(p)) continue;
    for (const m of fs.readFileSync(p, "utf8").matchAll(/<[^>]*data-composition-id="[^"]*"[^>]*>/g))
      out.push({ id: attr(m[0], "data-composition-id"), file: f, start: +(attr(m[0], "data-start") || 0), duration: attr(m[0], "data-duration") ? +attr(m[0], "data-duration") : null,
        width: +(attr(m[0], "data-width") || 0) || null, height: +(attr(m[0], "data-height") || 0) || null });
  }
  return out;
}

export default async function cmd({ proj, args, ROOT }) {
  const json = args.includes("--json");
  if (!args.includes("--all")) {
    const hf = path.join(proj, "hf"), c = fs.existsSync(hf) ? compositionsOf(hf) : [];
    if (json) { console.log(JSON.stringify(c)); return; }
    if (!fs.existsSync(hf)) { console.log(`${proj} has no hf/ folder (renderer "pvk": one film in film/film.js)`); return; }
    for (const x of c) console.log(`${String(x.id).padEnd(30)} ${String(x.duration ?? "?").padStart(6)} s  ${x.width ? x.width + "x" + x.height : "".padEnd(9)}  start ${x.start}  ${x.file}`);
    console.log(`${c.length} composition${c.length === 1 ? "" : "s"}`);
    return;
  }
  const rows = fs.readdirSync(path.join(ROOT, "projects")).filter((n) => fs.existsSync(path.join(ROOT, "projects", n, "project.json"))).map((n) => {
    const P = JSON.parse(fs.readFileSync(path.join(ROOT, "projects", n, "project.json"), "utf8"));
    const hf = path.join(ROOT, "projects", n, "hf");
    return { project: n, renderer: P.renderer || "pvk", compositions: fs.existsSync(hf) ? compositionsOf(hf).length : 0 };
  });
  console.log(json ? JSON.stringify(rows) : rows.map((r) => `${r.project.padEnd(18)} ${r.renderer.padEnd(12)} ${r.compositions || ""}`).join("\n"));
}
