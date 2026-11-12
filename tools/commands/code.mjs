// code [project] highlight <file> [--lang L] [--theme github-dark|github-light] [--id name] [--lines a-b] | model <file.obj> [--id name]
//                  build-time data for KIT.math.code and KIT.math3d models (tools/manim-grid.js, tools/manim-3d.js). highlight tokenizes a source
//                  file with the vendored shiki (js ts python json bash html css) and writes <film|hf>/code-<id>.js (window.CODE[id]); model
//                  wraps an .obj text as <film|hf>/model-<id>.js (window.MODEL[id]). Load the file in the page, then KIT.math.code("<id>").
import fs from "node:fs";
import path from "node:path";
import { highlight, langOf, dataScript, LANGS, THEMES } from "../manim/code.mjs";

export default async ({ proj, args, project }) => {
  const DIR = path.resolve(proj), [sub, file, ...rest] = args;
  const opt = (k, d) => { const i = rest.indexOf("--" + k); return i >= 0 ? rest[i + 1] : d; };
  const fail = (m) => { console.log("  FAIL  " + m); process.exit(1); };
  let P = {};
  try { P = project() || {}; } catch { /* no project.json: write next to film/ */ }
  const dir = path.join(DIR, P.renderer === "hyperframes" ? "hf" : "film");
  try {
    if ((sub === "highlight" || sub === "model") && !file) return fail(`usage: reelwright code <project> ${sub} <file>`);
    if (sub === "highlight") {
      const lang = opt("lang", langOf(file)), theme = opt("theme", "github-dark"), id = opt("id", path.basename(file).replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-"));
      if (!lang) return fail(`cannot tell the language of ${file}: pass --lang (${LANGS.join(", ")})`);
      if (!THEMES.includes(theme)) return fail(`theme "${theme}" is not bundled (${THEMES.join(", ")})`);
      let text = fs.readFileSync(path.resolve(file), "utf8");
      const rg = opt("lines");
      if (rg) { const [a, b] = rg.split("-").map(Number); text = text.split(/\r?\n/).slice(a - 1, b || a).join("\n"); }
      const data = highlight(text, { lang, theme });
      fs.mkdirSync(dir, { recursive: true });
      const out = path.join(dir, `code-${id}.js`);
      fs.writeFileSync(out, dataScript(id, data));
      return console.log(`code: ${data.lines.length} line(s) of ${lang} (${theme}) -> ${path.relative(process.cwd(), out)}; load it, then KIT.math.code("${id}")`);
    }
    if (sub === "model") {
      const id = opt("id", path.basename(file).replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-")), text = fs.readFileSync(path.resolve(file), "utf8");
      fs.mkdirSync(dir, { recursive: true });
      const out = path.join(dir, `model-${id}.js`);
      fs.writeFileSync(out, dataScript(id, text, "MODEL"));
      return console.log(`code: ${text.split("\n").length} OBJ line(s) -> ${path.relative(process.cwd(), out)}; load it, then api.model(window.MODEL["${id}"]) inside KIT.math3d.sceneExt`);
    }
    console.log("usage: reelwright code <project> highlight <file> [--lang L] [--theme T] [--id name] [--lines a-b] | model <file.obj> [--id name]");
    process.exit(1);
  } catch (e) { fail(e.message); }
};
