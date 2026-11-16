// qa-strict [project]   run `qa` and exit 1 on any WARN line as well as any FAIL (the CI mode: nothing that qa would only mention gets through).
//                        Prints qa's own output, then a one-line verdict. The same as upstream HyperFrames' `--strict`.
import path from "node:path";
import { spawnSync } from "node:child_process";

export const warnCount = (out) => (out || "").split("\n").filter((l) => /^\s*WARN\b/.test(l)).length;

export default async function qaStrict({ proj, args, ROOT }) {
  const r = spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "qa", proj, ...args], { encoding: "utf8", cwd: ROOT, maxBuffer: 1 << 28 });
  process.stdout.write(r.stdout || ""); process.stderr.write(r.stderr || "");
  const warns = warnCount(r.stdout);
  if (r.status) { console.log(`\nqa-strict: qa failed (exit ${r.status})`); process.exit(r.status); }
  if (warns) { console.log(`\nqa-strict: ${warns} WARN line${warns > 1 ? "s" : ""}: fix them, or switch the check off in project.json "qa" with a reason`); process.exit(1); }
  console.log("\nqa-strict: no FAIL, no WARN");
}
