// tools/measure_face.mjs — `measure face <video>` (HyperFrames measure, G9): where the faces are in a video, from ffmpeg frames and a local detector.
//   measureFace(video, { every = 1, detect = defaultDetect, tmp }) → { video, size, duration, every, samples: [{ t, faces: [[x,y,w,h]] }], summary }
//   summarize(samples, W, H, every) → { present, segments, biggest, centre, headroom, outsideSafe }   (pure)
// Frames come from ffmpeg (one per `every` s, scaled never). The detector is `tools/face_detect.py` (OpenCV Haar, from the opencv-python
// wheel; `pip install opencv-python-headless`, not done here) unless REELWRIGHT_FACE_CMD names another command that takes image paths and
// prints the same JSON ({ path: [[x,y,w,h], …] }). No model is downloaded by reelwright; without a detector this throws with what to install.
// summary: present = share of samples with a face; segments = [start, end] runs of samples with a face (a gap of one sample is bridged);
// biggest = the largest face's height as a share of the frame height; centre = mean face centre as 0..1 of the frame; headroom = space
// above the face as a share of the frame height, averaged; outsideSafe = samples whose face leaves the 5% safe margin (captions and UI sit there).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SYS_PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");

// opt-in install (`reelwright face install [--yes]`): one repo-local venv (<repo>/.venv-face, gitignored); when it exists the detector runs with its python
export const faceVenv = () => process.env.REELWRIGHT_FACE_VENV || path.join(ROOT, ".venv-face");
export const venvPython = () => path.join(faceVenv(), ...(process.platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"]));
export const facePython = () => (fs.existsSync(venvPython()) ? venvPython() : SYS_PY);

// faceInstall({ yes, log, run }) → { ok, planned? }: without yes only the plan is printed; `run` (default spawnSync, inherited stdio) is injectable for the self-check
export function faceInstall({ yes = false, log = console.log, run = (c, a) => spawnSync(c, a, { stdio: "inherit" }) } = {}) {
  const venv = faceVenv();
  const steps = [["uv", "venv", venv], ["uv", "pip", "install", "--python", venvPython(), "opencv-python-headless"]];
  const show = (s) => s.map((a) => (/[\s"]/.test(a) ? JSON.stringify(a) : a)).join(" ");
  log(`face detector into ${path.relative(process.cwd(), venv) || venv} (opencv-python-headless, ~50 MB download from PyPI):`);
  for (const s of steps) log("  " + show(s));
  if (!yes) { log("nothing downloaded: re-run with --yes to install"); return { ok: true, planned: true }; }
  for (const s of steps) {
    log("> " + show(s));
    const r = run(s[0], s.slice(1));
    if (r.status !== 0) { log(`failed: ${show(s)}${r.error ? ` (${r.error.message}; is uv installed? https://docs.astral.sh/uv/)` : ""}`); return { ok: false }; }
  }
  log(`installed; \`reelwright face <video>\` now uses ${path.relative(process.cwd(), venvPython())}`);
  return { ok: true };
}

export function probe(video) {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", video], { encoding: "utf8" });
  if (r.status) throw new Error(`ffprobe could not read ${video}: ${r.stderr.trim()}`);
  const j = JSON.parse(r.stdout);
  if (!j.streams?.[0]) throw new Error(`${video} has no video stream`);
  return { width: j.streams[0].width, height: j.streams[0].height, duration: Number(j.format.duration) };
}

export function defaultDetect(files) {
  const cmd = process.env.REELWRIGHT_FACE_CMD;
  const r = cmd ? spawnSync(cmd, files, { encoding: "utf8", maxBuffer: 1 << 28, shell: false }) : spawnSync(facePython(), [path.join(HERE, "face_detect.py"), ...files], { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status) throw new Error((r.stderr || `detector exited ${r.status}`).trim());
  return JSON.parse(r.stdout);
}

export function summarize(samples, W, H, every = 1) {
  const n = samples.length, withFace = samples.map((s) => s.faces.length > 0);
  const segs = []; let start = null, last = null;
  samples.forEach((s, i) => {
    if (withFace[i]) { if (start === null) start = s.t; last = s.t; }
    else if (start !== null && s.t - last > every * 1.5) { segs.push([start, last + every]); start = null; }   // one missed sample is bridged
  });
  if (start !== null) segs.push([start, last + every]);
  const faces = samples.flatMap((s) => s.faces.map((f) => ({ t: s.t, f })));
  const big = faces.reduce((b, x) => (!b || x.f[3] > b.f[3] ? x : b), null);
  const lead = samples.filter((s) => s.faces.length).map((s) => s.faces.reduce((b, f) => (f[2] * f[3] > b[2] * b[3] ? f : b)));   // the main (largest) face per sample
  const avg = (xs) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3) : null);
  const m = 0.05;
  return {
    present: n ? +(withFace.filter(Boolean).length / n).toFixed(3) : 0,
    segments: segs.map(([a, b]) => [+a.toFixed(2), +b.toFixed(2)]),
    biggest: big ? { t: big.t, heightShare: +(big.f[3] / H).toFixed(3) } : null,
    centre: lead.length ? [avg(lead.map((f) => (f[0] + f[2] / 2) / W)), avg(lead.map((f) => (f[1] + f[3] / 2) / H))] : null,
    headroom: avg(lead.map((f) => f[1] / H)),
    outsideSafe: samples.filter((s) => s.faces.some((f) => f[0] < m * W || f[1] < m * H || f[0] + f[2] > (1 - m) * W || f[1] + f[3] > (1 - m) * H)).map((s) => s.t),
  };
}

export function measureFace(video, { every = 1, detect = defaultDetect, tmp } = {}) {
  if (!(every > 0)) throw new Error("--every is seconds > 0");
  const info = probe(video);
  const dir = tmp || fs.mkdtempSync(path.join(os.tmpdir(), "rw-face-"));
  try {
    const r = spawnSync("ffmpeg", ["-v", "error", "-i", video, "-vf", `fps=1/${every}`, "-q:v", "3", path.join(dir, "f%05d.jpg")], { encoding: "utf8" });
    if (r.status) throw new Error(`ffmpeg: ${r.stderr.trim()}`);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort().map((f) => path.join(dir, f));
    const found = files.length ? detect(files) : {};
    const samples = files.map((f, i) => ({ t: +(i * every).toFixed(3), faces: found[f] || [] }));
    return { video, size: [info.width, info.height], duration: +info.duration.toFixed(3), every, samples, summary: summarize(samples, info.width, info.height, every) };
  } finally { if (!tmp) fs.rmSync(dir, { recursive: true, force: true }); }
}
