// applyPatch(dir, patchFile) — for the P8 wiring self-checks: apply docs/plans/p8-patches/*.patch to a COPY of the repo files in `dir` with `git apply`
// (present wherever CI is; no `patch` binary needed). Once the orchestrator has applied the patch to the real files the copy already has it:
// that is detected (the reverse applies cleanly) and reported as "already", so the self-check keeps passing after the merge.
import { spawnSync } from "node:child_process";

export function applyPatch(dir, patchFile) {
  const git = (...a) => spawnSync("git", ["apply", "-p1", "--unsafe-paths", ...a, patchFile], { cwd: dir, encoding: "utf8" });
  if (git("--check", "-R").status === 0) return "already";
  const r = git();
  if (r.status !== 0) throw new Error(`patch ${patchFile} does not apply:\n${r.stderr}`);
  return "applied";
}
