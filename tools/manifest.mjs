// <out>.manifest.json beside the mp4 (written by encode), and `reelwright verify` (render.mjs mode "verify").
//   tools    node, python, ffmpeg, Chromium, Playwright, edge-tts, the vendored HyperFrames commit
//   inputs   sha256 of every file in the project except build output (frames*, stills*, out/, .cache/), the theme,
//            and tools/ (the fonts used are inside the project's generated theme.css); text files with LF line ends
//   output   the mp4's duration and video frame count, the rendered frame count, sha256 of every frame
// verify: inputs must match (it names the ones that don't), then it re-renders the frames into a temp folder with
// the cache off and compares the frame count (= the duration, at the film's fps) and per-frame hashes. Same machine: identical frames. A manifest
// from another OS or Chromium: within .github/framediff.py's raster-noise tolerance, against the original frames/.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launch } from "./browser.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const rel = (f) => path.relative(ROOT, f).split(path.sep).join("/");
// text files hash with LF line ends, so a Windows checkout (git autocrlf) matches a manifest made elsewhere
const TEXT = /\.(js|mjs|json|css|html|md|py|txt)$/i;
const sha = (f) => crypto.createHash("sha256").update(TEXT.test(f)
  ? Buffer.from(fs.readFileSync(f, "latin1").replace(/\r\n/g, "\n"), "latin1") : fs.readFileSync(f)).digest("hex");
const out1 = (bin, ...a) => { const r = spawnSync(bin, a, { encoding: "utf8" }); return r.status === 0 ? (r.stdout || r.stderr).trim().split("\n")[0] : null; };
const BUILD = /^(frames|stills)(-.*)?$|^(out|\.cache)$/;

function walk(d, skip, acc = []) {
  if (!fs.existsSync(d)) return acc;
  for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const f = path.join(d, e.name);
    if (skip && skip.test(e.name) || /^(__pycache__|\.DS_Store|Thumbs\.db|desktop\.ini)$/i.test(e.name)) continue;
    if (e.isDirectory()) walk(f, null, acc); else if (e.isFile()) acc.push(f);
  }
  return acc;
}

function inputs(DIR, P) {
  const files = walk(DIR, BUILD).concat(walk(path.join(ROOT, "tools")));
  const style = process.env.REELWRIGHT_STYLE || P.style;
  if (style) files.push(path.join(ROOT, "themes", style + ".css"));
  return Object.fromEntries([...new Set(files)].map((f) => [rel(f), sha(f)]));
}

async function tools() {
  const b = await launch();
  const chromium = b.version();
  await b.close();
  const pw = path.join(ROOT, "node_modules", "playwright", "package.json");
  const hf = /commit `([0-9a-f]+)`/.exec(fs.readFileSync(path.join(ROOT, "vendor", "hyperframes", "VENDORED.md"), "utf8"));
  return { node: process.version, python: out1(PY, "--version"), ffmpeg: out1("ffmpeg", "-version"), chromium,
    playwright: fs.existsSync(pw) ? JSON.parse(fs.readFileSync(pw, "utf8")).version : null,
    "edge-tts": out1(PY, "-c", "import importlib.metadata as m; print(m.version('edge-tts'))"), hyperframes: hf && hf[1] };
}

// only the renderer's own frame names (tools/render.mjs contract)
const FRAME = { pvk: /^f\d{5}\.jpg$/, hyperframes: /^frame_\d{6}\.png$/, remotion: /^frame_\d{6}\.png$/ };
const frameFiles = (d, P) => fs.readdirSync(d).filter((f) => FRAME[P.renderer || "pvk"].test(f)).sort().map((f) => path.join(d, f));
const manifestPath = (DIR, P) => path.join(DIR, (P.out || "out/film.mp4").replace(/(\.mp4)?$/, ".manifest.json"));

export async function writeManifest(DIR, P, FPS) {
  const mp4 = path.join(DIR, P.out || "out/film.mp4");
  const probe = (e, s) => Number(out1("ffprobe", "-v", "error", ...s, "-show_entries", e, "-of", "default=nw=1:nk=1", mp4));
  const frames = frameFiles(path.join(DIR, "frames"), P);
  // the mp4's own duration and frame count are for the record: -shortest and AAC packets can trim a frame
  const m = { out: P.out || "out/film.mp4", platform: `${process.platform}-${process.arch}`, renderer: P.renderer || "pvk", fps: FPS,
    tools: await tools(), inputs: inputs(DIR, P), output: { duration: probe("format=duration", []),
      video_frames: probe("stream=nb_frames", ["-select_streams", "v:0"]), frames: frames.length, frame_sha256: frames.map(sha) } };
  fs.writeFileSync(manifestPath(DIR, P), JSON.stringify(m, null, 1));
  console.log("→", manifestPath(DIR, P), `(${Object.keys(m.inputs).length} inputs, ${frames.length} frames)`);
}

// render(mode, extraArgs) is the renderer; exits 1 on any mismatch
export async function verify(DIR, P, FPS, render) {
  const mf = manifestPath(DIR, P);
  if (!fs.existsSync(mf)) { console.error(`no ${rel(mf)}: run encode first`); process.exit(1); }
  const M = JSON.parse(fs.readFileSync(mf, "utf8")), now = inputs(DIR, P);
  const bad = [...new Set([...Object.keys(M.inputs), ...Object.keys(now)])].sort().filter((k) => M.inputs[k] !== now[k])
    .map((k) => `${k} (${!now[k] ? "missing" : !M.inputs[k] ? "new" : "changed"})`);
  if (bad.length) { console.log(`  FAIL  inputs differ from ${rel(mf)}:\n          ${bad.join("\n          ")}`); process.exit(1); }
  console.log(`  PASS  inputs  (${Object.keys(now).length} files match)`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelwright-verify-"));
  Object.assign(process.env, { REELWRIGHT_NO_CACHE: "1", REELWRIGHT_FRAMES_DIR: tmp });
  let fail = false;
  try {
    await render("frames", []);
    const files = frameFiles(tmp, P), hashes = files.map(sha), dur = files.length / FPS;
    const okDur = files.length === M.output.frames;   // same frame count at the same fps = same video duration
    console.log(`  ${okDur ? "PASS" : "FAIL"}  duration  ${files.length} frames = ${dur.toFixed(3)} s (manifest: ${M.output.frames} frames)`);
    fail = !okDur;
    const diff = hashes.map((h, i) => (h === M.output.frame_sha256[i] ? -1 : i)).filter((i) => i >= 0);
    const t = await tools(), same = M.platform === `${process.platform}-${process.arch}` && M.tools.chromium === t.chromium;
    if (!diff.length) console.log(`  PASS  frames  all ${files.length} identical`);
    else if (same) {
      fail = true;
      console.log(`  FAIL  frames  ${diff.length} differ on the machine that made the manifest: ${diff.slice(0, 8).map((i) => `${i} (${(i / FPS).toFixed(2)} s)`).join(", ")}`);
    } else {
      // another OS or Chromium: raster noise is allowed, which takes the original frames to measure
      const orig = path.join(DIR, "frames");
      const ok = fs.existsSync(orig) && frameFiles(orig, P).map(sha).join() === M.output.frame_sha256.join();
      if (!ok) { fail = true; console.log(`  FAIL  frames  ${diff.length} differ by hash (manifest from ${M.platform}, Chromium ${M.tools.chromium}); put its frames/ beside it to check them within raster noise`); }
      else {
        const r = spawnSync(PY, [path.join(ROOT, ".github", "framediff.py"), orig, tmp], { encoding: "utf8" });
        fail = r.status !== 0;
        console.log(`  ${fail ? "FAIL" : "PASS"}  frames  within raster noise of ${M.platform}: ${(r.stdout + r.stderr).trim().split("\n").pop()}`);
      }
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  if (fail) process.exit(1);
}
