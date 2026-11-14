// tools/checks/contrast-audit.page.mjs — OPT-IN WARN plug-in for `reelwright qa`: WCAG AA contrast of every visible text
// against the pixels drawn behind it, with a suggested colour (tools/checks/contrast.mjs). Off unless project.json has
// "qa": {"contrast-audit": true}, because it screenshots every sample; `reelwright audit <project> --contrast` runs it on demand.
import { contrastAudit } from "./contrast.mjs";
import { auditTimes } from "./audit-times.mjs";

export const kind = "warn";

export default async (page, { P }) => {
  if (P.qa?.["contrast-audit"] !== true) return [];
  return contrastAudit(page, { times: await auditTimes(page, { step: 1 }) });
};
