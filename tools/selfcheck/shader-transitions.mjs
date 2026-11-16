// node tools/selfcheck/shader-transitions.mjs — docs/playbook/shader-transitions.md and the shader registries agree:
// the 14 names tools/shaders.js advertises are exactly tools/renderers/shader_glsl.mjs's, the 12 Remotion presentations
// are shader_glsl2.mjs's, every name is in the page, and KIT.transition only forwards a name to KIT.shader
// (tools/transitions.js defines no shader itself). Offline, no browser.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { SHADERS } from "../renderers/shader_glsl.mjs";
import { SHADERS2 } from "../renderers/shader_glsl2.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const rd = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const src = rd("tools/shaders.js");
const at = src.indexOf("const NAMES = [");
const hf = [...src.slice(at, src.indexOf("];", at)).matchAll(/'([^']+)'/g)].map((m) => m[1]);
assert.deepEqual(hf.slice().sort(), Object.keys(SHADERS).sort(), "tools/shaders.js NAMES and shader_glsl.mjs SHADERS differ");
assert.equal(Object.keys(SHADERS2).length, 12, "shader_glsl2.mjs must hold the 12 Remotion presentations");
const all = [...hf, ...Object.keys(SHADERS2)], doc = rd("docs/playbook/shader-transitions.md");
const missing = all.filter((n) => !doc.includes("`" + n + "`"));
assert.deepEqual(missing, [], "the shader-transitions page does not name: " + missing.join(", "));
assert.ok(doc.includes("26"), "the page no longer says 26 transitions");
const tr = rd("tools/transitions.js");
assert.ok(tr.includes("K.shader"), "KIT.transition no longer forwards an unknown type to KIT.shader");
assert.ok(!hf.some((n) => tr.includes("'" + n + "'")), "tools/transitions.js hard-codes a shader name instead of forwarding it");
// the six gl-transitions ports carry their MIT licence: the full text and every author in THIRD_PARTY.md, a line in NOTICE, the credit in the file header
const tp = rd("THIRD_PARTY.md"), notice = rd("NOTICE"), glh = rd("tools/renderers/shader_glsl2.mjs").split("import ")[0];
assert.match(tp, /Permission is hereby granted, free of charge[\s\S]*THE SOFTWARE IS PROVIDED "AS IS"/, "THIRD_PARTY.md lacks the gl-transitions MIT text");
assert.match(tp, /Copyright \(c\) 2017-present gl-transitions contributors/);
for (const who of ["rectalogic", "Eke Péter", "Zeh Fernando", "gre", "Evan Wallace"]) for (const [name, text] of [["THIRD_PARTY.md", tp], ["NOTICE", notice], ["shader_glsl2.mjs header", glh]]) assert.ok(text.includes(who), `${name} does not credit ${who}`);
// the libraries linked into the wasm builds are credited (strings of each binary checked when this list was written)
for (const lib of ["ICU", "FreeType", "HarfBuzz", "libpng", "zlib", "libjpeg-turbo", "Luau"]) assert.ok(notice.includes(lib) && tp.includes(lib), `NOTICE / THIRD_PARTY.md lack ${lib}`);
console.log(`shader-transitions self-check: ${hf.length} HyperFrames + ${Object.keys(SHADERS2).length} Remotion shaders match both registries and the page`);
