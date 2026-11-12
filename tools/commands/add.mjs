// add [project] <name>   a HyperFrames catalog component → <project>/hf/blocks/<name>.html (use with KIT.block), or a
//                        HyperFrames block → <project>/hf/compositions/<name>.html + compositions/<name>/ (use with KIT.mount;
//                        hyperframes films only). Prints the block's title, duration, variables and the usage line.
// add --list [tag]       the supported blocks and the components (vendor/hyperframes/registry/{blocks,components})
import fs from "node:fs";
import path from "node:path";

export default async function add({ proj, args, ROOT }) {
  const reg = path.join(ROOT, "vendor", "hyperframes", "registry");
  const comps = path.join(reg, "components");
  const { index, installBlock } = await import("../blocks.mjs");
  const blocks = fs.existsSync(path.join(reg, "blocks", "index.json")) ? index().blocks : {};

  if (args[0] === "--list") {
    const tag = args[1];
    const sup = Object.entries(blocks).filter(([, b]) => b.status === "supported" && (!tag || b.tags.includes(tag)));
    console.log(`blocks (${sup.length}, KIT.mount, hyperframes films):`);
    for (const [n, b] of sup) console.log(`  ${n.padEnd(34)} ${String(b.duration).padStart(6)} s  ${b.width}x${b.height}  ${b.title}`);
    const cs = fs.readdirSync(comps).filter((n) => {
      if (!tag) return true;
      const f = path.join(comps, n, "registry-item.json");
      return fs.existsSync(f) && (JSON.parse(fs.readFileSync(f, "utf8")).tags || []).includes(tag);
    }).sort();
    console.log(`components (${cs.length}, KIT.block): ${cs.join(", ")}`);
    console.log("unsupported blocks and why: vendor/hyperframes/registry/blocks/UNSUPPORTED.md");
    return;
  }

  const name = args[0];
  const b = name && blocks[name];
  if (b) {
    if (b.status !== "supported") { console.log(`${name} is a HyperFrames block reelwright can't run: ${b.reason}`); process.exit(1); }
    const P = JSON.parse(fs.readFileSync(path.join(proj, "project.json"), "utf8"));
    if (P.renderer !== "hyperframes") {
      // shortcut: blocks are verified on the hyperframes page and renderer only (they wait on window.__hf.buildReady)
      console.log(`${name} is a HyperFrames block: it runs in hyperframes films only (project.json "renderer": "hyperframes"); ` +
        `${proj} renders with ${P.renderer || "pvk"}`);
      process.exit(1);
    }
    installBlock(name, path.join(proj, "hf"));
    const vars = b.vars.map((v) => `${v.id}: ${JSON.stringify(v.default)}`);
    console.log(`${path.join(proj, "hf", "compositions", name + ".html")} — ${b.title}, ${b.duration} s, ${b.width}x${b.height}`);
    if (b.description) console.log(b.description);
    console.log(vars.length ? `variables (defaults):\n  ${vars.join("\n  ")}`
      : `variables: none declared (registry-item.json or data-composition-variables) — its text is in compositions/${name}.html`);
    for (const n of b.notes) console.log(`note: ${n}`);
    console.log(`usage (hf/index.html needs <script src="kit/compose.js"></script> after kit/engine.js):\n` +
      `  KIT.mount('${name}', { start: W(...), dur: ${b.duration}${b.vars.length ? `, vars: { ${b.vars.slice(0, 2).map((v) => v.id + ": …").join(", ")} }` : ""} })`);
    return;
  }

  // catalog component: same as the built-in add
  const dir = path.join(comps, name || "");
  if (!name || !/^[\w-]+$/.test(name) || !fs.existsSync(path.join(dir, "registry-item.json"))) {
    console.log("usage: reelwright add [project] <component|block>   (list: reelwright add --list [tag])"); process.exit(1);
  }
  const item = JSON.parse(fs.readFileSync(path.join(dir, "registry-item.json"), "utf8"));
  const files = (item.files || []).map((f) => f.path);
  if (files.length !== 1 || !files[0].endsWith(".html")) {
    console.log(`${name} needs ${files.join(", ")} — only single-file components are vendored`); process.exit(1);
  }
  const dest = path.join(proj, "hf", "blocks", name + ".html");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `<!-- ${name} from the HyperFrames catalog (heygen-com/hyperframes, Apache-2.0, see ` +
    `vendor/hyperframes/LICENSE and VENDORED.md). Drive it from render(t) via KIT.block("${name}"). -->\n` +
    fs.readFileSync(path.join(dir, files[0]), "utf8"));
  console.log(`${dest} — ${item.description || item.title}`);
}
