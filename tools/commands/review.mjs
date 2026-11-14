// review [project]   print the brief for the final independent review: the project's facts, the commands to run, and the itemised
//                  checklist (docs/playbook/final-review.md) for a reviewer with a clean context. Paste it into a fresh subagent. Offline.
import fs from "node:fs";
import path from "node:path";

export const items = (md) => md.split("\n").filter((l) => /^\| [PFVAD]\d /.test(l)).map((l) => l.split("|").map((c) => c.trim()).slice(1, 5));

export default function ({ proj, ROOT, project }) {
  const P = project(), md = fs.readFileSync(path.join(ROOT, "docs", "playbook", "final-review.md"), "utf8");
  const out = P.out || "out/film.mp4", name = path.basename(path.resolve(proj));
  console.log(`You are the final reviewer of the film "${P.title || name}" (project ${proj}). You have not seen it made and you do not know what it was meant to
look like: judge only what is in the frames, the sound and the reports. Do not read film.js or any notes.

Facts: ${P.width || 1920}x${P.height || 1080} at ${P.fps || 60} fps, renderer ${P.renderer || "pvk"}, mp4 ${out}, ${(P.lines || []).length ? `${P.lines.length} voiceover lines` : "music only"}.
Run: reelwright qa ${name}   reelwright arc ${name} --mix   reelwright beatsync ${name}   reelwright verify-av ${name}
Look at: ${proj}/stills/sheet.jpg and the frames around every time qa flags.

Answer one line per item, "<id> PASS" or "<id> FAIL <time or file>: <what you saw>", then "VERDICT: PASS" or "VERDICT: FAIL (<n> F items)".
Open at least one frame per section and say what you saw. F items fail the film; W items you explain either way.
`);
  for (const [id, sev, check, how] of items(md)) console.log(`${id}  ${sev}  ${check}   [${how}]`);
}
