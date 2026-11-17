// node tools/selfcheck/starburst.mjs — Remotion row 2.2.10: KIT.fx.starburst and the filmBurn transition (tools/fx-starburst.js). Runs the
// remotion-kit fixture of the same name: pixel checks on real screenshots, then 12 seeks in order and 12 shuffled in pvk and HyperFrames, same frames.
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [path.join(here, "remotion-kit.mjs"), "starburst"], { stdio: "inherit" });
process.exit(r.status ?? 1);
