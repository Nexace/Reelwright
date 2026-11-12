// tools/checks/manim-pace.page.mjs — WARN-only pace lint for Manim films (row manim:m11.3): a VO line over 2.5 words/s, more than 4 s of
// silence between lines, under 15 % of the film unnarrated, plus the info line "unnarrated N %". Dark stretches are already QA's own
// `dark` WARN (tools/qa.py). Active only for films with a "manim" block (or "qa": { "pace": true }), so QA output for every other film is
// unchanged. Numbers and rules: tools/checks/manim-lint.mjs. Skip with "qa": { "manim-pace": false }.
import { lintPace } from "./manim-lint.mjs";

export const kind = "warn";

export default async (page, { P }) => {
  if (!P?.manim?.scenes?.length && !P?.qa?.pace) return [];
  const d = await page.evaluate(() => ({ vo: window.VO || {}, dur: (window.PROJECT?.speechEnd || 0) + (window.PROJECT?.tail || 0) }));
  if (!(d.dur > 0)) return [];
  return lintPace(d.vo, { dur: d.dur }).findings.map((f) => `${f.rule} ${f.msg}`);
};
