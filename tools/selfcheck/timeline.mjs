// node tools/selfcheck/timeline.mjs — the five timeline mechanisms (cut-centred windows, KIT.easing.svg, easeReverse,
// KIT.path motion, KIT.range retiming). Runs the remotion-kit fixture of the same name: assertions on the pure parts,
// then 12 seeks in order and 12 shuffled in pvk and HyperFrames, same frames.
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [path.join(here, "remotion-kit.mjs"), "timeline"], { stdio: "inherit" });
process.exit(r.status ?? 1);
