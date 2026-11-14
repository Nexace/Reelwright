// tools/checks/motion-assert.page.mjs — GATE plug-in for `reelwright qa`: the project's `*.motion.json` assertions
// (tools/checks/motion.mjs). Opt-in by file: a project with no *.motion.json gets no lines and costs nothing.
// Skip with "qa": {"motion-assert": false}.
import { findMotionFiles, loadAssertions, motionAudit } from "./motion.mjs";

export const kind = "gate";

export default async (page, { DIR }) => {
  const files = findMotionFiles(DIR);
  if (!files.length) return [];
  const { list, errors } = loadAssertions(files);
  const vo = await page.evaluate(() => window.VO || {});
  return [...errors.map((e) => `motion file: ${e}`), ...(await motionAudit(page, list, { vo }))];
};
