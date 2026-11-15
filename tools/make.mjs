// tools/make.mjs — the engine of `reelwright make` (tools/commands/make.mjs): a deterministic, offline, no-LLM guided entry point.
//   parseArgs(argv)        flags + brief → opts (throws on an unknown flag, a bad value, an empty brief)
//   plan(opts, ROOT)       brief → { intent, commands, lines, duration, theme, … }; reads the disk, writes nothing
//   create(p, ROOT, run)   runs the plan's existing commands (new / promo / slideshow / from-url), then edits project.json
// It never renders, never calls a paid service and downloads nothing; `from-url` (only with --yes) loads the one page you named.
import fs from "node:fs";
import path from "node:path";
import { pick, draft } from "./commands/theme-brief.mjs";
import { themeCss } from "./theme_from.mjs";
import { checkTheme } from "./theme-check.mjs";
import { agentFiles } from "./new_project.mjs";
import { IMAGE, CLIP } from "./slideshow.mjs";

const WPS = 2.5, LINE_WORDS = 12, GAP = 0.7, LEAD = 0.8, TAIL = 2.4;   // spoken words per second; one drafted line ≈ 12 words ≈ 5.5 s with its gap
const VALUE = ["--name", "--audience", "--length", "--url", "--folder"], BOOL = ["--voice", "--music-only", "--yes"];
const URL_RE = /\b(?:https?|file):\/\/[^\s"'<>]+/i;
const ROLES = ["problem", "solution", "proof", "feature", "benefit"];
// words that name the kind of film, its length or are filler: left out of the project name and of the theme-brief match
const STOP = new Set("a an the for of to and or with my our your this that make film video from about in on at is are it its me us we how what why s sec second seconds minute minutes promo launch teaser trailer explainer explain motion graphic graphics animated animation infographic walkthrough walk through demo tutorial screen recording slideshow".split(" "));
const keep = (t) => (t.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => !STOP.has(w) && !/^\d+$/.test(w));
const isDir = (p) => fs.statSync(p, { throwIfNoEntry: false })?.isDirectory() ?? false;
const words = (s) => (s.match(/\S+/g) || []).length;
const sh = (a) => (/^[\w./:@%+=,-]+$/.test(a) ? a : JSON.stringify(a));

export function parseArgs(argv) {
  const o = { brief: [], yes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (BOOL.includes(a)) o[a.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = true;
    else if (VALUE.includes(a)) {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new Error(`${a} needs a value`);
      o[a.slice(2)] = v;
    } else if (a.startsWith("--")) throw new Error(`unknown flag ${a} (flags: ${[...VALUE, ...BOOL].join(" ")})`);
    else o.brief.push(a);
  }
  o.brief = o.brief.join(" ").trim();
  if (!o.brief) throw new Error('the brief is empty: reelwright make "<what the film is about>" [--name n] [--audience a] [--length s] [--voice|--music-only] [--url u] [--folder f] [--yes]');
  if (o.voice && o.musicOnly) throw new Error("--voice and --music-only exclude each other");
  if (o.name !== undefined && !/^[A-Za-z0-9][\w-]*$/.test(o.name)) throw new Error(`--name "${o.name}": use letters, digits, - and _`);
  if (o.length !== undefined) {
    const m = /^(\d+(?:\.\d+)?)\s*(s|sec|m|min)?$/i.exec(o.length);
    const s = m && Number(m[1]) * (/^m/i.test(m[2] || "") ? 60 : 1);
    if (!(s >= 5 && s <= 600)) throw new Error(`--length "${o.length}": seconds between 5 and 600 (45, 45s, 2m)`);
    o.seconds = s;
  }
  if (o.url !== undefined && !/^(https?|file):\/\/\S+$/i.test(o.url)) throw new Error(`--url "${o.url}": needs an http(s):// or file:// address`);
  return o;
}

// the script text inside a brief: after "script:" / "voiceover:" / "vo:", else "double quoted" spans
export function scriptText(brief) {
  const m = /\b(?:script|voice-?over|vo)\s*:\s*([\s\S]+)$/i.exec(brief);
  if (m) return { script: m[1].trim(), rest: brief.slice(0, m.index).trim() };
  const q = [...brief.matchAll(/["“]([^"”]{12,})["”]/g)];
  return q.length ? { script: q.map((x) => x[1].trim()).join("\n"), rest: brief.replace(/["“][^"”]{12,}["”]/g, " ").trim() } : { script: "", rest: brief };
}
const SENT = /(?<!\b(?:e\.g|i\.e|etc|vs|cf|Dr|Mr|Mrs|Ms|St|Inc|Ltd)\.)(?<=[.!?])\s+|\r?\n+/;
export const sentences = (t) => t.split(SENT).map((s) => s.trim()).filter(Boolean);

const ROUTES = [   // first match wins; the keyword that matched is shown in the plan
  ["promo", /\b(promo|launch|teaser|trailer)\b/i],
  ["explainer", /\b(explainer|explain|motion|graphics?|animated?|animation|infographic)\b/i],
  ["walkthrough", /\b(walkthrough|walk-through|demo|tutorial|app|screen[- ]?recording)\b/i]];

export function route(o, rest) {
  const url = o.url || URL_RE.exec(rest)?.[0].replace(/[.,;:!?)\]]+$/, "");
  if (url) return { intent: "from-url", why: o.url ? "--url" : `a URL in the brief (${url})`, url };
  const tok = rest.split(/\s+/).find((t) => /^(\/|\.\.?[\\/]|~[\\/]|[A-Za-z]:[\\/])/.test(t) && isDir(t.replace(/^~/, process.env.HOME || "~")));
  const folder = o.folder || tok;
  if (folder) return { intent: "slideshow", why: o.folder ? "--folder" : `a folder in the brief (${tok})`, folder };
  for (const [intent, re] of ROUTES) { const m = re.exec(rest); if (m) return { intent, why: `"${m[0].toLowerCase()}"` }; }
  return { intent: "explainer", why: "no keyword matched, so the default (motion graphics need no recording)" };
}

const titleOf = (rest) => { const t = sentences(rest)[0] || rest; return (t.length > 60 ? t.slice(0, 57).replace(/\s+\S*$/, "") + "…" : t).replace(/[.!?]+$/, ""); };
const slug = (rest) => keep(rest.replace(URL_RE, " ")).slice(0, 3).join("-") || "film";

// N placeholder lines for `seconds`: hook first, close last, a role in between; every one starts with "[DRAFT" so it cannot be mistaken for copy
export function skeleton(seconds, audience) {
  const n = Math.max(2, Math.round((seconds - LEAD - TAIL) / (LINE_WORDS / WPS + GAP)));
  return Array.from({ length: n }, (_, i) => {
    const role = i === 0 ? "hook" : i === n - 1 ? "close" : ROLES[(i - 1) % ROLES.length];
    return { id: `l${i + 1}`, gap: i === 0 ? 0 : GAP, text: `[DRAFT ${i + 1}/${n} ${role}] Replace with about ${LINE_WORDS} words for ${audience || "the viewer"}.`, draft: true };
  });
}
export const spoken = (lines) => LEAD + TAIL + lines.reduce((t, l) => t + l.gap + Math.max(l.draft ? LINE_WORDS : 0, words(l.text)) / WPS, 0);

export function plan(o, ROOT) {
  const { script, rest } = scriptText(o.brief), r = route(o, rest), P = { ...r, brief: o.brief };
  P.name = o.name || slug(rest);
  P.dest = path.posix.join("projects", P.name);
  if (fs.existsSync(path.join(ROOT, "projects", P.name))) throw new Error(`projects/${P.name} already exists: pick another with --name (nothing was created)`);
  if (r.folder && !isDir(r.folder)) throw new Error(`--folder ${r.folder}: not a folder`);
  P.title = titleOf(rest);
  P.audience = o.audience;
  P.notes = [];
  const templ = r.intent === "promo" || r.intent === "slideshow", wantsMusic = o.musicOnly || /\bmusic[- ]only\b|\bno (voice|narration)/i.test(o.brief);
  P.voice = r.intent === "from-url" || (!templ && !wantsMusic);
  if (templ && o.voice) P.notes.push(`${r.intent} is a music-only template: --voice is ignored (its copy lives in hf/)`);
  if (r.intent === "from-url" && wantsMusic) P.notes.push("from-url drafts a voiceover from the page: delete the lines in project.json for music only");
  const t = rest.match(/(\d+(?:\.\d+)?)\s*[- ]?(?:s\b|sec|seconds?)\b/i);
  P.seconds = o.seconds ?? (t ? Number(t[1]) : 30);
  const cmds = [];
  const rw = (...a) => cmds.push(a);
  if (r.intent === "from-url") {
    rw("from-url", r.url, P.name);
    P.renderer = "hyperframes"; P.template = "from-url (captures the page, drafts the film by rules)";
    P.notes.push("from-url loads the one page you named (network + a headless browser); nothing is rendered or downloaded beyond it");
  } else if (r.intent === "slideshow") {
    const n = isDir(r.folder) ? fs.readdirSync(r.folder).filter((f) => !f.startsWith(".") && (IMAGE.test(f) || CLIP.test(f))).length : 0;
    rw("slideshow", r.folder, P.name);
    P.renderer = "hyperframes"; P.template = `slideshow of ${n} file(s) in ${r.folder}`; P.slides = n;
    P.seconds = n * 3;
    if (!n) throw new Error(`${r.folder} has no images or clips for a slideshow (nothing was created)`);
  } else if (r.intent === "promo") {
    rw("promo", P.name, P.title);
    P.renderer = "hyperframes"; P.template = "Ink Press promo (projects/promo-ink-press): 10 shots on the energy arc"; P.seconds = 36;
    if (o.seconds && o.seconds !== 36) P.notes.push("the promo template is a fixed 36 s: --length is ignored");
  } else {
    P.renderer = r.intent === "explainer" ? "hyperframes" : "pvk";
    P.template = r.intent === "explainer" ? "example-hf starter (hf/film.js)" : "example starter (record.mjs + film/film.js)";
    rw("new", P.name, ...(P.renderer === "hyperframes" ? ["--renderer", "hyperframes"] : []), "--agents");
  }
  // the script
  if (P.voice && r.intent !== "from-url") {
    const s = sentences(script);
    P.lines = s.length ? s.slice(0, 40).map((text, i) => ({ id: `l${i + 1}`, gap: i ? GAP : 0, text })) : skeleton(P.seconds, o.audience);
    P.scriptFrom = s.length ? "your script text" : "placeholders";
    P.seconds = Math.round(spoken(P.lines));
    if (s.length && o.seconds && Math.abs(P.seconds - o.seconds) > Math.max(5, o.seconds * 0.25)) P.notes.push(`your script runs about ${P.seconds} s, not the ${o.seconds} s asked for: trim or add lines`);
  } else if (r.intent === "from-url") { P.lines = null; P.scriptFrom = "drafted from the page when it is captured"; P.seconds = null; }
  else { P.lines = []; P.scriptFrom = "none (music only)"; if (script) P.notes.push("the script text in the brief is kept in project.json \"brief\", not voiced (music-only)"); }
  // the theme: theme-brief's own matcher; a file is written only for the starters, the templates and captures keep their own look
  const themeBrief = keep(rest.replace(URL_RE, " ")).join(" ");
  try {
    const d = draft(themeBrief), type = pick(themeBrief).product["Product Type"];
    P.theme = { type, base: d.base };
    const applies = r.intent === "walkthrough" || r.intent === "explainer";
    if (applies && !fs.existsSync(path.join(ROOT, "themes", P.name + ".css"))) { P.theme.write = `themes/${P.name}.css`; P.theme.d = d; }
    else if (applies) P.notes.push(`themes/${P.name}.css exists: the starter's style is kept`);
    else P.theme.suggest = `reelwright theme-brief ${sh(themeBrief.trim())} <theme-name>`;
  } catch (e) { P.theme = { none: e.message.split(" — ")[0] }; }
  P.argv = cmds; P.commands = cmds.map((a) => ["reelwright", ...a].map(sh).join(" "));
  return P;
}

export function show(P) {
  const L = [];
  const out = (s = "") => L.push(s);
  out(`reelwright make: plan for "${P.title}"`);
  out(`  intent:    ${P.intent} (matched ${P.why})`);
  out(`  renderer:  ${P.renderer}`);
  out(`  template:  ${P.template}`);
  out(`  theme:     ${P.theme.none ? `${P.theme.none}; the starter keeps its style (try: reelwright remix <name> later)` : P.theme.write
    ? `${P.theme.write} drafted from product type "${P.theme.type}" (theme-brief) -> "style": "${P.name}"`
    : `${P.intent === "from-url" ? "taken from the page" : "the template's own look"}; theme-brief would say "${P.theme.type}": ${P.theme.suggest}`}`);
  out(`  voice:     ${P.voice ? "voiceover" : P.intent === "from-url" ? "voiceover, drafted from the page" : "music only"}${P.audience ? `, audience: ${P.audience}` : ""}`);
  out(`  script:    ${P.lines?.length ? `${P.lines.length} line(s) from ${P.scriptFrom}` : P.scriptFrom}`);
  out(`  duration:  ${P.seconds ? `about ${P.seconds} s` : "set by the page (about 20-40 s)"}`);
  out(`  project:   ${P.dest}`);
  out("commands it will run:");
  P.commands.forEach((c, i) => out(`  ${i + 1}. ${c}`));
  out(`  ${P.commands.length + 1}. ${P.intent === "walkthrough" || P.intent === "explainer" ? "(agent files come from new --agents above)" : `write ${P.dest}/AGENTS.md and CLAUDE.md (new --agents)`}`);
  out(`  ${P.commands.length + 2}. edit ${P.dest}/project.json: title, out, brief${P.lines?.length ? ", lines" : ""}${P.theme.write ? ", style" : ""}`);
  if (P.lines?.length) { out("lines:"); P.lines.forEach((l) => out(`  ${l.id.padEnd(4)} ${l.text}`)); }
  P.notes.forEach((n) => out(`note: ${n}`));
  return L.join("\n");
}

// run: (args[]) → { status, stdout, stderr }, the existing commands in a child process
export function create(P, ROOT, run) {
  const dest = path.join(ROOT, P.dest), argv = P.argv;
  const made = [];
  try {
    for (const a of argv) {
      const r = run(a);
      if (r.stdout) made.push(r.stdout.trimEnd());
      if (r.status !== 0) throw new Error(`reelwright ${a[0]} failed:\n${(r.stderr || r.stdout).trim()}`);
    }
    if (!fs.existsSync(path.join(dest, "project.json"))) throw new Error(`${P.dest}/project.json was not created`);
    if (!fs.existsSync(path.join(dest, "AGENTS.md"))) agentFiles(ROOT, dest, P.name);
    const f = path.join(dest, "project.json"), J = JSON.parse(fs.readFileSync(f, "utf8"));
    Object.assign(J, { title: P.title, out: `out/${P.name}.mp4`, brief: P.audience ? `${P.brief} (audience: ${P.audience})` : P.brief });
    if (P.intent === "walkthrough" || P.intent === "explainer") {
      delete J.langs; delete J.ci;
      if (P.voice) { J.lines = P.lines.map(({ id, gap, text }) => ({ id, gap, text })); J.lead = LEAD; J.tail = TAIL; }
      else { J.lines = []; J.lead = 0; J.tail = P.seconds; }
      if (P.theme.write) {
        const css = path.join(ROOT, P.theme.write);
        fs.writeFileSync(css, themeCss(P.name, `"${P.brief}" (make, ui-ux-pro-max data, MIT)`, P.theme.d, "make"));
        const { fail } = checkTheme(P.name);
        if (fail.length) { fs.rmSync(css); P.notes.push(`the drafted theme failed its check (${fail[0]}): the starter's style is kept`); }
        else J.style = P.name;
      }
    } else if (P.intent === "slideshow" || P.intent === "promo") { /* music-only templates: title/out/brief only */ }
    fs.writeFileSync(f, JSON.stringify(J, null, 2) + "\n");
  } catch (e) {   // leave no half-made project behind
    fs.rmSync(dest, { recursive: true, force: true });
    if (P.theme?.write) fs.rmSync(path.join(ROOT, P.theme.write), { force: true });
    throw e;
  }
  return made.join("\n");
}

export const nextSteps = (P) => [`reelwright sched ${P.name}`, `reelwright stills ${P.name}`, `reelwright all ${P.name}`];
