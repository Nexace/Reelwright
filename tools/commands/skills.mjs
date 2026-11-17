// skills install [--apps codex,opencode,cursor,antigravity,claude] [--dry-run]   copy this repo's agent skills (.claude/skills/*) into
//                        other coding agents' global skill folders, each with a preface naming this repo's path, so they can make films
//                        from any folder: Codex ~/.codex/skills, OpenCode ~/.config/opencode/skills, Cursor ~/.cursor/skills,
//                        Antigravity ~/.gemini/config/skills, Claude Code ~/.claude/skills. product-video is installed as `reelwright`. Re-run after an update. Writes only those folders.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HOME = process.env.REELWRIGHT_SKILLS_HOME || os.homedir();   // the override is for the self-check
export const APPS = {
  codex: ".codex/skills",
  opencode: ".config/opencode/skills",
  cursor: ".cursor/skills",
  antigravity: ".gemini/config/skills",
  claude: ".claude/skills",   // Claude Code outside this repo (inside it, .claude/skills here already loads)
};
const RENAME = { "product-video": "reelwright" };   // the name the global copy has always used

export function render(src, name, ROOT) {
  const text = fs.readFileSync(src, "utf8").replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) throw new Error(`${src}: no front matter`);
  const front = m[1].replace(/^name: .*$/m, `name: ${name}`), body = text.slice(m[0].length);
  const preface = `Repo: \`${ROOT}\`. Work from that folder: its \`AGENTS.md\` holds the binding rules; read it, \`README.md\` and \`docs/PLAYBOOK.md\` before a real film. Commands: \`./video.sh <cmd>\` (anywhere: \`node bin/reelwright.mjs <cmd>\`).\n`;
  return `---\n${front}\n---\n\n${preface}\n${body.replace(/^\n+/, "")}`;
}

export function install(ROOT, apps, { dry = false } = {}) {
  const skills = fs.readdirSync(path.join(ROOT, ".claude", "skills")).filter((d) => fs.existsSync(path.join(ROOT, ".claude", "skills", d, "SKILL.md")));
  const out = [];
  for (const app of apps) {
    const dir = path.join(HOME, APPS[app]);
    for (const s of skills) {
      const name = RENAME[s] || s, dest = path.join(dir, name, "SKILL.md");
      const text = render(path.join(ROOT, ".claude", "skills", s, "SKILL.md"), name, ROOT);
      if (!dry) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, text); }
      out.push(dest);
    }
  }
  return out;
}

export default async function skills({ args, ROOT }) {
  if (args[0] !== "install") { console.log("usage: reelwright skills install [--apps codex,opencode,cursor,antigravity,claude] [--dry-run]"); process.exit(1); }
  const a = args.indexOf("--apps"), apps = a >= 0 ? String(args[a + 1] || "").split(",").filter(Boolean) : Object.keys(APPS);
  const bad = apps.filter((x) => !APPS[x]);
  if (!apps.length || bad.length) { console.log(`unknown app(s): ${bad.join(", ") || "(none given)"}; known: ${Object.keys(APPS).join(", ")}`); process.exit(1); }
  const dry = args.includes("--dry-run");
  for (const f of install(ROOT, apps, { dry })) console.log(`${dry ? "would write" : "wrote"} ${f}`);
}
