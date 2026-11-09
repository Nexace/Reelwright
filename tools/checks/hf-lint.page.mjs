// tools/checks/hf-lint.page.mjs — GATE plug-in for `reelwright qa`: the vendored @hyperframes/lint's error-level findings
// on a hyperframes film's hf/ folder (broken HTML/CSS, missing assets, non-deterministic code, GSAP misuse, fonts…).
// Static, no browser. Skipped rules and why: docs/playbook/qa-lint.md. Silence: project.json "qa": {"hf-lint": false} or
// {"hf-lint-skip": ["code"]}. The warning-level findings are in hf-lint-warn.page.mjs.
import { hfLint, hfLintFailed } from "./hf-lint.mjs";

export const kind = "gate";

export default async (_page, { DIR, P }) => {
  try { return (await hfLint(DIR, P)).gate; } catch (e) { return hfLintFailed(e); }
};
