// node tools/selfcheck/p10-motion.mjs — rows 2b.1 (tools/p10-sharp.js) and 2b.3 (tools/p10-motion.js). Runs the two fixtures
// tools/selfcheck/motion/p10-{sharp,motion}.mjs through motion.mjs: shuffled-seek purity in pvk and HyperFrames, the helpers' numbers
// (ramp velocity, follower lag, spring overshoot), and sharp-vs-scale() geometry in 16x9 and 9x16 (a marker lands within 0.05 px;
// text boxes within 3 px, they are re-laid out at the zoomed size). The default camera call passes straight to shots.js.
import { spawnSync } from "node:child_process";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const r = spawnSync(process.execPath, ["tools/selfcheck/motion.mjs", "p10-sharp", "p10-motion"], { cwd: ROOT, encoding: "utf8" });
process.stdout.write(r.stdout); process.stderr.write(r.stderr);
assert.equal(r.status, 0, "motion fixtures failed");
assert.equal((r.stdout.match(/^PASS /gm) || []).length, 4, "want 4 PASS lines (2 fixtures x 2 renderers)");
console.log("p10-motion self-check: 2b.1 sharp camera and 2b.3 velocity helpers pass");
