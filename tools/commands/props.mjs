// props <project> check [file.json | '{...}']   check per-run props against <project>/props.schema.json (or, without one, the project's composition variables)
// props <project> schema [--write]                print (or write to props.schema.json) the schema made from project.json "variables"
// props <project> merge <file.json | '{...}'>     the props with every default of the schema filled in, as JSON on stdout
//   Per-run props (Remotion `--props`, Zod schema): `reelwright <any command> --props '{"title":"Hi"}'` / `--props-file data.json` (aliases of
//   --variables / --variables-file, bin patch docs/plans/p9-patches/props-flags.patch) are checked against props.schema.json when the project has
//   one, then written to the page's kit-vars.js; the page reads them with KIT.props() (tools/props.js). Rows of a CSV: `batch <project> rows.csv`.
//   Offline. docs/playbook/codecs.md
import fs from "node:fs";
import path from "node:path";
import { validate, withDefaults, schemaFromVariables } from "../props-schema.mjs";

const readJson = (spec) => { const t = String(spec).trim(); return JSON.parse(t.startsWith("{") ? t : fs.readFileSync(spec, "utf8")); };
export function loadSchema(proj) {
  const f = path.join(proj, "props.schema.json");
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const P = JSON.parse(fs.readFileSync(path.join(proj, "project.json"), "utf8"));
  return P.variables ? schemaFromVariables(P.variables) : null;
}
// used by bin before the variables are written: only when the project HAS a props.schema.json (otherwise the typed variables check them)
export function checkProps(proj, { json, file }) {
  if (!fs.existsSync(path.join(proj, "props.schema.json"))) return;
  let v; try { v = readJson(file || json); } catch (e) { console.error(`props: ${e.message}`); process.exit(1); }
  const errs = validate(loadSchema(proj), v);
  if (errs.length) { for (const e of errs) console.error(`  ERROR ${e.path}: ${e.message}`); console.error("props rejected: nothing rendered"); process.exit(1); }
}

export default async ({ proj, args }) => {
  const [sub = "check", ...rest] = args, schema = loadSchema(proj);
  if (sub === "schema") {
    const P = JSON.parse(fs.readFileSync(path.join(proj, "project.json"), "utf8")), s = schemaFromVariables(P.variables);
    if (rest.includes("--write")) { fs.writeFileSync(path.join(proj, "props.schema.json"), JSON.stringify(s, null, 2) + "\n"); console.log("→", path.join(proj, "props.schema.json")); }
    else console.log(JSON.stringify(s, null, 2));
    return;
  }
  if (!schema) { console.error("props: the project has no props.schema.json and no \"variables\" in project.json"); process.exit(1); }
  if (!rest[0]) { console.error(`usage: reelwright props <project> ${sub} <file.json | '{…}'>`); process.exit(1); }
  let v; try { v = readJson(rest[0]); } catch (e) { console.error(`props: ${e.message}`); process.exit(1); }
  const errs = validate(schema, v);
  if (sub === "merge") { if (errs.length) { for (const e of errs) console.error(`  ERROR ${e.path}: ${e.message}`); process.exit(1); } console.log(JSON.stringify(withDefaults(schema, v), null, 2)); return; }
  if (sub !== "check") { console.error("props: check | schema | merge"); process.exit(1); }
  if (errs.length) { for (const e of errs) console.error(`  ERROR ${e.path}: ${e.message}`); console.error("props rejected"); process.exit(1); }
  console.log("props ok");
};
