// capture-trio <url> <out_dir> [width] [--selector "<css>"] [--max 40]   the page capture trio: full@2x.png, a transparent cutout PNG per
//                  element (cutouts/), and layout.json with each element's box, for floating-chip and camera-over-a-page shots.
//                  Read-only; only pages you own or may use. (tools/capture_trio.mjs)
import { spawnSync } from "node:child_process";
import path from "node:path";

export default function ({ args, ROOT }) {
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "capture_trio.mjs"), ...args], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}
