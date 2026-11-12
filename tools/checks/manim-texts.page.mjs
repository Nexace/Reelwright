// tools/checks/manim-texts.page.mjs — QA gate for Manim scenes (row manim:m11.2): OFF-FRAME, TEXT-OVERLAP and TINY-TEXT over the texts.json
// a scene exports with reelwright_manim.texts (python/reelwright_manim/texts.py). Silent for films without a "manim" block and for scenes
// that did not export the file (the scene opts in). Rules and numbers: tools/checks/manim-lint.mjs. Skip with "qa": { "manim-texts": false }.
import { lintTexts, sceneTexts } from "./manim-lint.mjs";

export const kind = "gate";

export default async (_page, { DIR, P }) => {
  if (!P?.manim?.scenes?.length) return [];
  return sceneTexts(DIR, P).flatMap((s) => lintTexts(s.doc).map((f) => `${s.id}: ${f.rule} ${f.msg}`));
};
