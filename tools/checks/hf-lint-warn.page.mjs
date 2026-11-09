// tools/checks/hf-lint-warn.page.mjs — WARN plug-in for `reelwright qa`: the vendored @hyperframes/lint's warning/info
// findings on a hyperframes film's hf/ folder, plus the few errors kept as warnings here (DOWNGRADE in hf-lint.mjs).
// Skip it with project.json "qa": {"hf-lint-warn": false}; see hf-lint.page.mjs for the gate half.
import { hfLint } from "./hf-lint.mjs";

export const kind = "warn";

export default async (_page, { DIR, P }) => {
  try { return (await hfLint(DIR, P)).warn; } catch { return []; }   // the gate half reports a crash
};
