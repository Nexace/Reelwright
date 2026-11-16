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
console.log(`shader-transitions self-check: ${hf.length} HyperFrames + ${Object.keys(SHADERS2).length} Remotion shaders match both registries and the page`);
