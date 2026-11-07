#!/usr/bin/env node
// reelwright <command> [project]   (project defaults to projects/example)
//
//   new <name> [--renderer hyperframes]   copy the example (or example-hf) into projects/<name>
//   add <component>  copy a HyperFrames catalog component into <project>/hf/blocks/ (use with KIT.block)
//   record           run <project>/record.mjs → screen take (clips/) + film/clip.js
//   vo               voiceover from project.json lines (edge-tts) → vo/
//   beatgrid         fit the beat grid of music/track.mp3 → music/grid.json (only with a real track)
//   sched            place VO lines on the timeline → film/data.js
//   info             timeline.json (duration + SFX cues) from the director
//   music            music/bed.wav (your track, or the built-in synth bed)
//   mix              mix.wav (voice + ducked music + SFX)
//   stills [t,t,..]  preview frames → stills/ + stills/sheet.jpg
//   frames           render every frame → frames/ (pvk: unchanged frames come from .cache/frames/)
//   encode           frames + mix.wav → the mp4 in project.json "out", plus .srt, .vtt and .manifest.json beside it
//   qa               blips and blank frames, then gates (loudness, captions, flash, illustrative, seekable): FAIL exits 1;
//                    and a variety line (WARN when another film in projects/ has the same theme or look)
//   verify           inputs still match <out>.manifest.json, and freshly rendered frames match its hashes: FAIL exits 1
//   preview          live scrubber at http://localhost:4173: the film's own page, mix.wav waveform, reloads on save
//   remix            stills at 25/50/75 % in the 3 themes furthest from this one × 16x9, 9x16, 1x1 → stills-remix/sheet.jpg
//   clean            delete frames/ stills/ .cache/ and intermediate audio (keeps the mp4)
//   themes           list the styles in themes/ (use with "style" in project.json or --style <name>)
//   from-url <url> [name] [--yes]   capture a public page → projects/<name>/ (HyperFrames): drafts the voiceover
//                    from the page's text by rules (no AI), prints it and stops; edit project.json, then `all <name>`.
//                    --yes builds straight away. Read-only: never submits anything on the site.
//   theme-from <url|image> [name]   draft themes/<name>.css from a page's colours and fonts (nearest bundled OFL
//                    font when the real one isn't bundled) or an image's colours; use with "style": "<name>"
//                    Only capture sites you own or have the right to use.
//   beats [project] import <file.csv|timeline.json> [--replace] | export [file.csv] [--replace]   beat-sheet CSV <-> project.json
//                    lines + beats (docusphere headers, both variants); only those keys of project.json change.
//                    --replace overwrites existing lines/beats but keeps extra fields (gap, langs, …) of same-id lines,
//                    and prints which lines were kept, dropped, added; rows with an empty VO Script are skipped.
//                    export refuses to overwrite an existing csv unless --replace
//   gen [project] --provider higgsfield "<prompt>" --out assets/<file> [--kind image|video] [--yes]
//                    opt-in paid generation (key in env or .reelwright/credentials.json): shows the estimate, asks, saves to assets/
//   gen [project] --import <file> --source firefly|express "<note>"   register a file made in Firefly / Express (offline)
//   all              record → vo → (beatgrid) → sched → info → music → mix → frames → encode → qa
//   audio            vo → sched → info → music → mix   (after editing the script)
//   film             sched → info → mix → frames → encode   (after editing film.js)
//
//   --lang <code>         voice project.json langs.<code> (its voice + lines), output <out>-<code>.mp4 + .srt/.vtt
//   --style <name>        build with themes/<name>.css, output <out>-<name>.mp4
//   --formats 16x9,9x16,1x1,4x5   film|all|stills|frames|encode|qa per format (1920×1080, 1080×1920, 1080×1080, 1080×1350):
//                         audio once, then out/<name>-<fmt>.mp4, stills-<fmt>/ and frames-<fmt>/
//   --as <format>         extra output beside the mp4: webm, mov, gif, apng or png (a folder); same as project.json
//                         "output": {"format": …}
//   --no-cache            frames: render every frame instead of reusing .cache/frames/
//
// Plug-in commands (tools/commands/<name>.mjs; each file's header comment is its help, listed below):
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.chdir(ROOT);
// Windows has `python`, not `python3`; PYTHONUTF8 stops cp1252 errors on our UTF-8 JSON and ▶ output.
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
process.env.PYTHONUTF8 = "1";
process.env.REELWRIGHT_NODE = process.execPath;   // tools/qa.py runs its node checks with the same node

const [cmd = "help", ...args] = process.argv.slice(2);
const st = args.indexOf("--style");   // any command: build with themes/<name>.css, output <out>-<name>.mp4
if (st >= 0) process.env.REELWRIGHT_STYLE = args.splice(st, 2)[1];
const lg = args.indexOf("--lang");     // any command: voice project.json langs.<code>, output <out>-<code>.mp4
if (lg >= 0) process.env.REELWRIGHT_LANG = args.splice(lg, 2)[1];
const nc = args.indexOf("--no-cache");   // frames: render every frame (tools/renderers/pvk.mjs frame cache off)
if (nc >= 0) { args.splice(nc, 1); process.env.REELWRIGHT_NO_CACHE = "1"; }
const as = args.indexOf("--as");   // encode: also write this format beside the mp4 (tools/renderers/pvk.mjs encode)
if (as >= 0) process.env.REELWRIGHT_OUT_FORMAT = args.splice(as, 2)[1] || "";
const SIZES = { "16x9": "1920x1080", "9x16": "1080x1920", "1x1": "1080x1080", "4x5": "1080x1350" };
const fo = args.indexOf("--formats");
const formats = fo >= 0 ? (args.splice(fo, 2)[1] || "").split(",").filter(Boolean) : null;
if (formats && (!formats.length || formats.some((f) => !SIZES[f]))) {
  console.log(`--formats takes a comma list of ${Object.keys(SIZES).join(", ")}`); process.exit(1);
}
let proj = "projects/example";
if (!["new", "from-url", "theme-from"].includes(cmd) && args.length) {
  const a = args[0].replace(/[\\/]+$/, "");
  if (isDir(a)) { proj = a; args.shift(); }
  else if (isDir(path.join("projects", a))) { proj = path.join("projects", a); args.shift(); }
}

function isDir(p) { return fs.statSync(p, { throwIfNoEntry: false })?.isDirectory() ?? false; }
function step(name) { console.log(`\n\x1b[1;32m▶ ${name}\x1b[0m  (${proj})`); }
function run(bin, ...a) {
  const r = spawnSync(bin, a, { stdio: "inherit" });
  if (r.error) { console.error(`${bin}: ${r.error.message}`); process.exit(1); }
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const py = (tool, ...a) => run(PY, path.join("tools", tool), proj, ...a);
const render = (mode, ...a) => run(process.execPath, path.join("tools", "render.mjs"), proj, mode, ...a);
const project = () => JSON.parse(fs.readFileSync(path.join(proj, "project.json"), "utf8"));
const rm = (...ps) => ps.forEach((p) => fs.rmSync(path.join(proj, p), { recursive: true, force: true }));
function hasTrack() { const f = project().music?.file; return !!f && fs.existsSync(path.join(proj, f)); }

const C = {
  new() {
    const r = args.indexOf("--renderer");
    const hf = r >= 0 && args.splice(r, 2)[1] === "hyperframes";
    const name = args[0];
    if (!name) { console.log("usage: reelwright new <name> [--renderer hyperframes]"); process.exit(1); }
    const dest = path.join("projects", name);
    if (fs.existsSync(dest)) { console.log(`${dest} already exists`); process.exit(1); }
    const src = path.join("projects", hf ? "example-hf" : "example");
    const skip = new Set(["clips", "frames", "stills", "vo", "out", "mix.wav", "timeline.json",
      "music/bed.wav", "music/grid.json", "film/data.js", "film/clip.js", "hf/kit", "hf/kit-data.js"]);
    fs.cpSync(src, dest, { recursive: true, filter: (s) => !skip.has(path.relative(src, s).split(path.sep).join("/")) });
    console.log(hf ? `created ${dest} — edit project.json (script) and hf/film.js (the edit)`
      : `created ${dest} — edit project.json (script), record.mjs (the take), film/film.js (the edit)`);
    console.log(`then: reelwright all ${name}`);
  },
  add() {
    const name = args[0];
    const dir = path.join("vendor", "hyperframes", "registry", "components", name || "");
    if (!name || !/^[\w-]+$/.test(name) || !isDir(dir)) {
      console.log("usage: reelwright add [project] <component>   (list: vendor/hyperframes/registry/components/)"); process.exit(1);
    }
    const item = JSON.parse(fs.readFileSync(path.join(dir, "registry-item.json"), "utf8"));
    const files = (item.files || []).map((f) => f.path);
    if (files.length !== 1 || !files[0].endsWith(".html")) {
      console.log(`${name} needs ${files.join(", ")} — only single-file components are vendored`); process.exit(1);
    }
    const dest = path.join(proj, "hf", "blocks", name + ".html");
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, `<!-- ${name} from the HyperFrames catalog (heygen-com/hyperframes, Apache-2.0, see ` +
      `vendor/hyperframes/LICENSE and VENDORED.md). Drive it from render(t) via KIT.block("${name}"). -->\n` +
      fs.readFileSync(path.join(dir, files[0]), "utf8"));
    console.log(`${dest} — ${item.description || item.title}`);
  },
  async "from-url"() {
    const y = args.indexOf("--yes"), yes = y >= 0 && !!args.splice(y, 1);
    const [url, name] = args;
    if (!/^(https?|file):\/\//i.test(url || "")) {
      console.log("usage: reelwright from-url <url> [name] [--yes]   (only capture sites you own or have the right to use)"); process.exit(1);
    }
    const { fromUrl } = await import("../tools/from_url.mjs");
    const r = await fromUrl(url, name).catch((e) => { console.error(e.message); process.exit(1); });
    console.log(`\ndrafted ${path.relative(ROOT, r.dir)} — the voiceover:\n`);
    for (const l of r.lines) console.log(`  ${l.id.padEnd(5)} ${l.text}`);
    if (r.numbers.length) console.log(`\nnumbers inside the screenshots (shown with a "Source:" credit — real figures only):\n` +
      r.numbers.map((n) => `  ${n.id.padEnd(5)} ${n.nums.join("  ")}`).join("\n"));
    proj = path.relative(ROOT, r.dir);
    if (!yes) return console.log(`\nedit the lines in ${proj}/project.json (and on-screen copy in hf/site.js), then: reelwright all ${r.name}`);
    C.all();
  },
  async "theme-from"() {
    const [src, name] = args;
    if (!src) { console.log("usage: reelwright theme-from <url|image> [name]   (only capture sites you own or have the right to use)"); process.exit(1); }
    const { themeFrom } = await import("../tools/from_url.mjs");
    const r = await themeFrom(src, name).catch((e) => { console.error(e.message); process.exit(1); });
    console.log(`${path.relative(ROOT, r.out)} (on ${r.d.base})\n  ${r.d.notes.join("\n  ")}\nuse it: "style": "${r.name}" in project.json, or --style ${r.name}`);
  },
  record() {
    const f = path.join(proj, "record.mjs");
    if (!fs.existsSync(f)) return console.log(`(${proj} has no record.mjs — nothing to record)`);
    step("record"); run(process.execPath, f);
  },
  vo() {
    if (process.env.REELWRIGHT_LANG) {   // the base-language VO too: --lang cues map from its word positions
      const lang = process.env.REELWRIGHT_LANG; delete process.env.REELWRIGHT_LANG;
      step("vo"); py("vo.py"); process.env.REELWRIGHT_LANG = lang;
    }
    step("vo"); py("vo.py", ...args);
  },
  beatgrid() { step("beatgrid"); py("beatgrid.py"); },
  sched() { step("sched"); py("sched.py"); },
  info() { step("info"); render("info"); },
  music() { step("music"); py("music.py"); },
  mix() { step("mix"); py("mix.py"); },
  stills() { step("stills"); render("stills", ...args); py("sheet.py"); },
  frames() { step("frames"); render("frames", ...args); },
  encode() { step("encode"); render("encode"); },
  qa() { step("qa"); py("qa.py"); },
  themes() { import("../tools/theme.mjs").then((m) => console.log(m.themes().join("\n"))); },
  beats() { import("../tools/beats.mjs").then((m) => m.cli(proj, args)).catch((e) => { console.error(e.message); process.exit(1); }); },
  verify() { step("verify"); render("verify"); },
  preview() { run(process.execPath, path.join("tools", "preview.mjs"), proj); },
  gen() { run(process.execPath, path.join("tools", "gen.mjs"), proj, ...args); },
  async remix() {
    const { furthest, variety } = await import("../tools/look.mjs");
    const looks = furthest(proj).map((s, i) => [s, Object.keys(SIZES)[i]]);
    if (!fs.existsSync(path.join(proj, "timeline.json"))) C.info();
    const dur = JSON.parse(fs.readFileSync(path.join(proj, "timeline.json"), "utf8")).DUR;
    const ts = [0.25, 0.5, 0.75].map((f) => +(f * dur).toFixed(2)).join(",");
    const out = path.join(proj, "stills-remix"), keep = path.join(proj, "stills-keep"), stills = path.join(proj, "stills");
    rm("stills-remix"); fs.mkdirSync(out);
    // the user's own stills come back after, also when a step fails (run() exits the process)
    const restore = () => { if (fs.existsSync(keep)) { rm("stills"); fs.renameSync(keep, stills); } };
    if (fs.existsSync(stills)) { fs.renameSync(stills, keep); process.once("exit", restore); }
    const ENV = ["REELWRIGHT_STYLE", "REELWRIGHT_FORMAT", "REELWRIGHT_SIZE"], saved = ENV.map((k) => process.env[k]);
    looks.forEach(([s, f], i) => {
      console.log(`\n\x1b[1;36m■ ${s} · ${f}\x1b[0m`);
      Object.assign(process.env, { REELWRIGHT_STYLE: s, REELWRIGHT_FORMAT: f, REELWRIGHT_SIZE: SIZES[f] });
      C.sched(); step("stills"); render("stills", ts);
      fs.renameSync(stills, path.join(out, `${i + 1} ${s} · ${f}`));
    });
    ENV.forEach((k, i) => (saved[i] === undefined ? delete process.env[k] : (process.env[k] = saved[i])));
    restore();
    C.sched();   // back to project.json's own size and look
    (await import("../tools/theme.mjs")).writeTheme(path.resolve(proj), project());
    py("sheet.py", "stills-remix");
    const [st, msg] = variety(proj);
    console.log(`\nvariety: ${st} ${msg}`);
  },
  clean() {
    rm("frames", "stills", ".cache", "mix.wav", "music/bed.wav", ...fs.readdirSync(proj).filter((f) => /^(frames|stills)-/.test(f)));
    console.log(`cleaned ${proj} (mp4 kept)`);
  },
  audio() { args.length = 0; C.vo(); C.sched(); C.info(); C.music(); C.mix(); },
  film() { args.length = 0; C.sched(); C.info(); C.mix(); rm("frames"); C.frames(); C.encode(); },
  all() {
    args.length = 0;
    C.record(); C.vo();
    if (hasTrack()) C.beatgrid();
    C.sched(); C.info(); C.music(); C.mix();
    rm("frames"); C.frames(); C.encode(); C.qa();
    console.log(`\n\x1b[1;32m✔ done:\x1b[0m ${path.join(proj, project().out || "out/film.mp4")}`);
  },
};

// --formats: shared steps once, then these steps per format with the frame size in the env (tools/sched.py and
// tools/render.mjs read it). frames/ and stills/ are parked as frames-<fmt>/ and stills-<fmt>/ between formats.
const PER_FORMAT = {
  film: ["sched", "info", "frames", "encode"], all: ["sched", "info", "frames", "encode", "qa"],
  stills: ["sched", "stills"], frames: ["sched", "frames"], encode: ["encode"], qa: ["qa"],
};
const SHARED = { film: ["sched", "info", "mix"], all: ["record", "vo", "beatgrid", "sched", "info", "music", "mix"] };
if (formats && Object.hasOwn(PER_FORMAT, cmd)) {
  const extra = args.splice(0).filter(() => !SHARED[cmd]);   // film/all take no extra args, as without --formats
  for (const s of SHARED[cmd] || []) if (s !== "beatgrid" || hasTrack()) C[s]();
  for (const f of formats) {
    console.log(`\n\x1b[1;36m■ format ${f}\x1b[0m`);
    Object.assign(process.env, { REELWRIGHT_FORMAT: f, REELWRIGHT_SIZE: SIZES[f] });
    const d = cmd === "stills" ? "stills" : "frames";
    rm(d);   // start from this format's parked dir, or empty
    if (fs.existsSync(path.join(proj, `${d}-${f}`))) fs.renameSync(path.join(proj, `${d}-${f}`), path.join(proj, d));
    for (const s of PER_FORMAT[cmd]) { args.splice(0, args.length, ...extra); C[s](); }
    if (fs.existsSync(path.join(proj, d))) fs.renameSync(path.join(proj, d), path.join(proj, `${d}-${f}`));
  }
  delete process.env.REELWRIGHT_FORMAT; delete process.env.REELWRIGHT_SIZE;
  if (PER_FORMAT[cmd].includes("sched")) C.sched();   // leave the data file at project.json's own size
} else if (/^[\w-]+$/.test(cmd) && fs.existsSync(path.join("tools", "commands", cmd + ".mjs"))) {
  // a plug-in command (wins over a built-in of the same name): default export gets what the built-ins use
  const m = await import(pathToFileURL(path.join(ROOT, "tools", "commands", cmd + ".mjs")).href);
  await m.default({ proj, args, ROOT, PY, run, py, render, step, project, rm });
} else if (Object.hasOwn(C, cmd)) C[cmd]();
else {
  // help: this file's header, then each plug-in's header (tools/commands/*.mjs)
  const header = (f) => { const l = fs.readFileSync(f, "utf8").split("\n").filter((x, i) => i || !x.startsWith("#!"));
    return l.slice(0, l.findIndex((x) => !x.startsWith("//"))).map((x) => x.replace(/^\/\/ ?/, "")); };
  const cmds = path.join("tools", "commands");
  const plug = fs.existsSync(cmds) ? fs.readdirSync(cmds).filter((f) => f.endsWith(".mjs")).sort() : [];
  console.log([...header(fileURLToPath(import.meta.url)), ...plug.flatMap((f) => header(path.join(cmds, f)).map((x) => "  " + x))].join("\n"));
}
