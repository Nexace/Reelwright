// tools/new_project.mjs — the extras of `reelwright new` (HyperFrames `init` parity, row G1), all opt-in:
//   --example <name>   start from projects/<name> instead of the default starter (`--example list` prints them)
//   --agents           write AGENTS.md and CLAUDE.md (@AGENTS.md) into the new project: its renderer, its commands, the repo rules
//   --skills           copy the repo's project skills (.claude/skills/*) into <project>/.claude/skills/
//   --tailwind         accepted, does nothing: Tailwind needs an npm install, which `new` never runs (it says so)
// Nothing here touches the network or installs anything.
import fs from "node:fs";
import path from "node:path";

const isDir = (p) => fs.statSync(p, { throwIfNoEntry: false })?.isDirectory() ?? false;

// folders of projects/ that can seed a new film: they have a project.json and are not a QA fixture that breaks on purpose
export const examples = (ROOT) => fs.readdirSync(path.join(ROOT, "projects")).filter((n) =>
  !n.startsWith("qa-") && fs.existsSync(path.join(ROOT, "projects", n, "project.json"))).sort();

const rules = (ROOT) => {   // the "## Rules" section of the repo's AGENTS.md, so the project carries the same craft rules
  const t = fs.readFileSync(path.join(ROOT, "AGENTS.md"), "utf8"), i = t.indexOf("## Rules");
  return i < 0 ? "" : t.slice(i).trim();
};

export function agentFiles(ROOT, dest, name) {
  const P = JSON.parse(fs.readFileSync(path.join(dest, "project.json"), "utf8")), rend = P.renderer || "pvk";
  const edit = rend === "hyperframes" ? "`hf/film.js` (the edit)" : rend === "remotion" ? "`rm/src/Film.jsx` (the edit)"
    : "`record.mjs` (the take) and `film/film.js` (the edit)";
  fs.writeFileSync(path.join(dest, "AGENTS.md"), `# ${P.title || name} — instructions for coding agents

This is a Reelwright film (renderer: ${rend}). It lives in \`projects/${name}/\` of the Reelwright repo; read the repo's
\`README.md\` and \`docs/PLAYBOOK.md\` before changing it. Run commands from the repo root with \`./video.sh <command> ${name}\`
(Windows: \`node bin/reelwright.mjs <command> ${name}\`).

- The script (voiceover lines, gaps, style, fps) is \`project.json\`. Show the lines to the user before building.
- The edit is ${edit}. Every timing comes from \`W()\`, \`V()\`, \`clip.filmAt()\`, recorder marks or \`KIT.snap()\`.
- Iterate: \`sched\` then \`stills\`, read \`stills/sheet.jpg\`; \`audio\` after script changes; \`film\` after edit changes; \`all\` ends with \`qa\`.
- Report the mp4 at \`project.json\` "out", then \`clean\`.

${rules(ROOT)}
`);
  fs.writeFileSync(path.join(dest, "CLAUDE.md"), "@AGENTS.md\n");
}

export function installSkills(ROOT, dest) {
  const src = path.join(ROOT, ".claude", "skills");
  if (!isDir(src)) return [];
  fs.cpSync(src, path.join(dest, ".claude", "skills"), { recursive: true });
  return fs.readdirSync(src);
}
