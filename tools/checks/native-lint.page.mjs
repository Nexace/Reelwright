// tools/checks/native-lint.page.mjs — WARN plug-in for `reelwright qa`, OPT-IN: project.json "qa": {"native-lint": true}.
// Native versions of the upstream lint rules hf-lint skips, plus coordinate drift and the HDR check (tools/checks/native-lint.mjs
// lists them). Off by default so every existing film's QA output stays as it was; `reelwright lint <project>` runs them without the flag.
import { staticChecks, pageChecks, projectChecks } from "./native-lint.mjs";

export const kind = "warn";

export default async (page, { DIR, P }) => {
  if (!(P.qa && P.qa["native-lint"] === true)) return [];
  try { return [...(P.renderer === "hyperframes" ? staticChecks(DIR, P) : []), ...projectChecks(DIR, P), ...(await pageChecks(page, { DIR, P }))]; }
  catch (e) { return [`native-lint failed: ${String(e && e.message || e).slice(0, 150)}`]; }
};
