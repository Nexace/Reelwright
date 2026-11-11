// Remotion renderer (optional, opt-in; NOT open source, never bundled with Reelwright): <project>/rm/ is a Remotion
// project (templates/remotion) whose src/Film.jsx is the edit. Remotion is installed per project into rm/node_modules,
// only after the user types yes to the licence notice below. Reelwright keeps owning audio, encode, QA and the manifest:
// Remotion renders muted image sequences, encode is pvk's (frames + mix.wav + subtitles).
//   always   copy templates/remotion → rm/ if missing; check Remotion is installed (else ask); film/data.js (sched.py)
//            → rm/kit-data.json, the composition's props {project, vo, music, width, height, fps}
//   info     rm/src/film.mjs + rm/src/kit.js imported in Node → timeline.json {DUR, FPS, cues, VO, MUSIC}
//   stills   only the asked frames (`--frames=a,b,…`, jpeg) → stills/t<time>.jpg
//   frames   frames/frame_%06d.png (0 = t 0); [from] [to] = frame numbers, to exclusive
//   encode   pvk's encode (frames + mix.wav)
// stills and frames bundle rm/ once (`remotion bundle` → .cache/rm-build) and writes film/index.html: the page
// tools/qa_page.mjs opens. It loads the same bundle, drives it the way @remotion/renderer drives its tab
// (remotion_setBundleMode, then remotion_setFrame + wait for remotion_renderReady) and exposes window.READY,
// window.render(t), window.FILM, window.VO and window.KIT {u, safe, stage, token}.
// Browser: Playwright's headless shell (`--browser-executable`), so Remotion's own Chrome (~460 MB) is never downloaded.
// Env: PAGES (render tabs, default 4), FPS.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { encode } from "./pvk.mjs";
import { headlessShell } from "./hyperframes.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
export const TEMPLATE = path.join(ROOT, "templates", "remotion");
const WIN = process.platform === "win32";

export const NOTICE = `
Remotion is not open source. It is free for individuals, for-profit companies with up to 3 people, and
non-profits; every other company needs a paid Company License (remotion.pro/license; currently $25 per creator
per month, or $0.01 per render with a $100 monthly minimum for automated pipelines such as \`reelwright all\`).
Using "renderer": "remotion" makes YOU a Remotion user. Reelwright is not affiliated with Remotion and does not
grant a Remotion licence. Check remotion.dev/docs/license.

Installing it downloads about 250 MB of npm packages into this project's rm/node_modules (pinned in
rm/package.json). Remotion's own Chrome (~460 MB more) is not downloaded: Reelwright renders with Playwright's
headless shell.`;

export const installed = (RM) => fs.existsSync(path.join(RM, "node_modules", "remotion", "package.json"));

// Remotion present, or the user typed yes and npm installed it. No TTY: print the notice and how to install, exit 1.
export async function ensureRemotion(RM, { tty = !!(process.stdin.isTTY && process.stdout.isTTY) } = {}) {
  if (installed(RM)) return true;
  console.log(NOTICE);
  const how = `To install it yourself: cd "${RM}" && npm install`;
  if (!tty) { console.error(`\nRemotion is not installed and this is not an interactive terminal, so nothing was installed.\n${how}`); process.exit(1); }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question('\nType "yes" to install Remotion into rm/node_modules: ')).trim().toLowerCase();
  rl.close();
  if (a !== "yes") { console.error(`Not installed. ${how}`); process.exit(1); }
  const r = spawnSync(WIN ? "npm.cmd" : "npm", ["install", "--no-audit", "--no-fund"], { cwd: RM, stdio: "inherit", shell: WIN });
  if (r.status !== 0 || !installed(RM)) { console.error("npm install failed"); process.exit(1); }
  return true;
}

// film/data.js (window.PROJECT=…; window.VO=…; window.MUSIC=…;) → the composition's props
export function kitData(DIR, P, FPS) {
  const f = path.join(DIR, "film", "data.js");
  if (!fs.existsSync(f)) { console.error("no film/data.js — run sched first (reelwright sched)"); process.exit(1); }
  const g = {};
  for (const m of fs.readFileSync(f, "utf8").matchAll(/^window\.(\w+)=(.*);$/gm)) g[m[1]] = JSON.parse(m[2]);
  return { project: g.PROJECT || {}, vo: g.VO || {}, music: g.MUSIC || {}, width: P.width || 1920, height: P.height || 1080, fps: FPS };
}

// DUR and SFX cues straight from the film's own timing code, in Node (no browser, no Remotion)
export async function filmInfo(RM, props) {
  const v = `?v=${Date.now()}`;   // a fresh module per call when one process asks twice (selfcheck)
  const { makeKit } = await import(pathToFileURL(path.join(RM, "src", "kit.js")).href + v);
  const film = await import(pathToFileURL(path.join(RM, "src", "film.mjs")).href + v);
  const k = makeKit(props);
  return { DUR: +film.DUR(k).toFixed(3), FPS: k.fps, cues: film.cues(k).sort((a, b) => a.t - b.t), VO: props.vo, MUSIC: props.music };
}

function remotionCli(RM, args) {
  // --no-install: never let npx fetch anything; Remotion runs only from rm/node_modules
  const r = spawnSync(WIN ? "npx.cmd" : "npx", ["--no-install", "remotion", ...args], { cwd: RM, stdio: "inherit", shell: WIN });
  if (r.status !== 0) { console.error(`remotion ${args[0]} failed`); process.exit(r.status || 1); }
}

// the QA page host: the bundle's own index.html with a <base> so its relative bundle.js/chunks load from
// .cache/rm-build, Remotion's renderer globals set before the bundle runs, and Reelwright's page API after it
function writeHost(DIR, BUILD, props) {
  let html = fs.readFileSync(path.join(BUILD, "index.html"), "utf8");
  const base = path.relative(path.join(DIR, "film"), BUILD).split(path.sep).join("/") + "/";
  html = html.replaceAll("window.location.href", "document.baseURI");   // staticFile() resolves inside the bundle too
  const pre = `<base href="${base}">
<!-- generated by tools/renderers/remotion.mjs: Reelwright's QA page for rm/ (built with Remotion, see remotion.pro/license).
     The theme (film/theme.css, copied to rm/public/theme.css) comes in through the bundle. -->
<script>window.process = { env: { NODE_ENV: "production" } }; window.remotion_puppeteerTimeout = 30000;
window.remotion_isMainTab = true; window.remotion_initialFrame = 0; window.remotion_attempt = 1; window.remotion_logLevel = "error";
window.RW_PROPS = ${JSON.stringify(props)}; window.remotion_inputProps = JSON.stringify(window.RW_PROPS);</script>`;
  const post = `<script>
(() => {
  const props = window.RW_PROPS, R = window.REELWRIGHT, k = R.makeKit(props), fps = k.fps, DUR = R.DUR(k);
  const frames = Math.max(1, Math.ceil(DUR * fps));
  window.VO = props.vo; window.PROJECT = props.project; window.MUSIC = props.music;
  window.FILM = { DUR, FPS: fps, VO: props.vo, MUSIC: props.music };
  for (const e of [document.documentElement, document.body]) { e.style.width = k.W_ + "px"; e.style.height = k.H_ + "px"; e.style.margin = "0"; e.style.overflow = "hidden"; }
  const stage = () => document.getElementById("stage");
  window.KIT = { u: k.u, safe: k.safe, fmt: k.fmt, get stage() { return stage(); },
    token: (n) => getComputedStyle(stage() || document.documentElement).getPropertyValue("--kit-" + n).trim() };
  const ready = () => new Promise((res, rej) => { const f = () => window.remotion_cancelledError !== undefined ? rej(new Error(String(window.remotion_cancelledError).split("\\n")[0]))
    : window.remotion_renderReady === true ? res() : setTimeout(f, 5); f(); });
  let attempt = 1;
  window.render = async (t) => {
    await ready();
    window.remotion_setFrame(Math.min(frames - 1, Math.max(0, Math.round(t * fps))), "Film", ++attempt);
    await ready(); await document.fonts.ready;
  };
  window.remotion_setBundleMode({ type: "composition", compositionName: "Film", serializedResolvedPropsWithSchema: window.remotion_inputProps,
    compositionDurationInFrames: frames, compositionFps: fps, compositionHeight: k.H_, compositionWidth: k.W_, compositionDefaultCodec: "h264",
    compositionDefaultOutName: "film", compositionDefaultVideoImageFormat: null, compositionDefaultPixelFormat: null,
    compositionDefaultProResProfile: null, compositionDefaultSampleRate: 48000 });
  window.READY = ready().then(() => window.render(0)).then(() => !!stage());
})();
</script>`;
  html = html.replace(/<head>/i, (h) => h + "\n" + pre).replace(/<\/body>/i, () => post + "\n</body>");
  fs.writeFileSync(path.join(DIR, "film", "index.html"), html);
}

export default async function remotion(DIR, P, mode, [a3, a4] = []) {
  const FPS = Number(process.env.FPS || P.fps || 60), W = P.width || 1920, H = P.height || 1080;
  const RM = path.join(DIR, "rm"), BUILD = path.join(DIR, ".cache", "rm-build");
  if (!fs.existsSync(RM)) { fs.cpSync(TEMPLATE, RM, { recursive: true }); console.log("rm/ ← templates/remotion"); }
  await ensureRemotion(RM);
  const off = [P.output?.alpha && "output.alpha", P.output?.hdr && "output.hdr", P.motionBlur && "motionBlur"].filter(Boolean);
  if (off.length) console.log(`renderer remotion ignores ${off.join(", ")} (pvk / hyperframes only)`);
  const props = kitData(DIR, P, FPS), propsFile = path.join(RM, "kit-data.json");
  fs.writeFileSync(propsFile, JSON.stringify(props));
  const film = await filmInfo(RM, props), N = Math.max(1, Math.ceil(film.DUR * FPS));

  if (mode === "stills" || mode === "frames") {
    // themes: kit.css + the generated film/theme.css (fonts inlined) are imported by rm/src/index.js
    const pub = path.join(RM, "public"), theme = path.join(DIR, "film", "theme.css");
    fs.mkdirSync(pub, { recursive: true });
    fs.copyFileSync(path.join(ROOT, "tools", "kit.css"), path.join(pub, "kit.css"));
    if (fs.existsSync(theme)) fs.copyFileSync(theme, path.join(pub, "theme.css"));
    else fs.writeFileSync(path.join(pub, "theme.css"), "/* no film/theme.css yet: kit.css defaults */\n");
    fs.rmSync(BUILD, { recursive: true, force: true });
    remotionCli(RM, ["bundle", path.join("src", "index.js"), `--out-dir=${BUILD}`, "--log=error"]);
    writeHost(DIR, BUILD, props);
  }
  const render = (out, ...a) => remotionCli(RM, ["render", BUILD, "Film", out, `--props=${propsFile}`, `--browser-executable=${headlessShell()}`,
    `--width=${W}`, `--height=${H}`, `--fps=${FPS}`, "--muted", "--sequence", "--log=error", ...a]);
  // Remotion pads frame numbers to the last frame's digits: list what it wrote as [frame, file]
  const written = (d) => fs.readdirSync(d).map((f) => [/^f_(\d+)\.\w+$/.exec(f), f]).filter(([m]) => m).map(([m, f]) => [Number(m[1]), path.join(d, f)]);

  if (mode === "info") {
    fs.writeFileSync(path.join(DIR, "timeline.json"), JSON.stringify(film, null, 1));
    console.log(`timeline.json: ${film.DUR}s, ${film.cues.length} SFX cues, ${Object.keys(film.VO || {}).length} VO lines`);
  } else if (mode === "stills") {
    const out = path.join(DIR, "stills"), tmp = path.join(out, "_rm");
    fs.rmSync(out, { recursive: true, force: true });
    const ts = a3 ? a3.split(",").map(Number) : Array.from({ length: 12 }, (_, i) => +((i + 0.5) * film.DUR / 12).toFixed(2));
    const fr = (t) => Math.min(N - 1, Math.max(0, Math.round(t * FPS)));
    render(tmp, "--image-format=jpeg", "--jpeg-quality=94", "--image-sequence-pattern=f_[frame].[ext]", `--frames=${[...new Set(ts.map(fr))].sort((a, b) => a - b).join(",")}`);
    const got = new Map(written(tmp));
    for (const t of ts) fs.copyFileSync(got.get(fr(t)), path.join(out, "t" + t.toFixed(2).padStart(6, "0") + ".jpg"));
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log("stills →", out, ts.join(", "));
  } else if (mode === "frames") {
    const from = Number(a3 || 0), to = Math.min(N, Number(a4 || N));
    const out = process.env.REELWRIGHT_FRAMES_DIR || path.join(DIR, "frames"), tmp = path.join(out, "_rm");
    if (!a3 && !a4) fs.rmSync(out, { recursive: true, force: true });   // a full render: frames/ holds exactly this film
    fs.rmSync(tmp, { recursive: true, force: true });
    const t0 = Date.now();
    render(tmp, "--image-format=png", "--image-sequence-pattern=f_[frame].[ext]", `--concurrency=${Number(process.env.PAGES || 4)}`, `--frames=${from}-${to - 1}`);
    const got = written(tmp);
    for (const [n, f] of got) fs.renameSync(f, path.join(out, `frame_${String(n).padStart(6, "0")}.png`));
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`${got.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } else if (mode === "encode") {
    const first = fs.readdirSync(path.join(DIR, "frames")).filter((f) => /^frame_\d{6}\.png$/.test(f)).sort()[0];
    if (!first) { console.error("no frames/ — run frames first"); process.exit(1); }
    encode(DIR, P, FPS, "frames/frame_%06d.png", Number(first.slice(6, 12)));
  } else {
    console.log("unknown mode", mode); process.exit(1);
  }
}
