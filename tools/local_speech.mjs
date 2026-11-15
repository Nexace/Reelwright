// tools/local_speech.mjs — the opt-in local speech installs: `reelwright transcribe install` (faster-whisper) and `reelwright tts install` (Kokoro).
//   One repo-local venv (<repo>/.venv-tts, gitignored) and one model folder (<repo>/.models, gitignored); both can be moved with
//   REELWRIGHT_TTS_VENV / REELWRIGHT_MODELS_DIR. Nothing is installed or downloaded unless the install is run with --yes (same pattern as `face install`).
//   transcribeInstall({ model, yes, log, run }) / ttsInstall({ yes, log, run }) → { ok, planned? }   `run` (default spawnSync, inherited stdio) is injectable
//   transcribeMedia(media, { model, lang, run }) → [{ text, start, end }]   word-level timings, the shape `captions` and caption_transcript.mjs use
//   transcribeReady() → true when the venv python and at least one whisper model are there
// Pins are ranges that keep the major line (a bare `pip install` once pulled OpenCV 5 and broke `face`): change PINS here, nowhere else.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
export const PINS = { whisper: "faster-whisper>=1.1,<2", kokoro: "kokoro-onnx>=0.4,<1", python: "3.12" };
export const WHISPER_MB = { tiny: 75, base: 145, small: 484 };   // CTranslate2 weights on the Hugging Face hub (Systran/faster-whisper-<size>)
export const KOKORO_FILES = [   // [file, url, MB]
  ["kokoro-v1.0.onnx", "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx", 310],
  ["voices-v1.0.bin", "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin", 27],
];
export const WHISPER_ORDER = ["base", "small", "tiny"];   // the default when no --model is given: the first one installed

export const ttsVenv = () => process.env.REELWRIGHT_TTS_VENV || path.join(ROOT, ".venv-tts");
export const venvPython = () => path.join(ttsVenv(), ...(process.platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"]));
export const modelsDir = () => process.env.REELWRIGHT_MODELS_DIR || path.join(ROOT, ".models");
export const whisperDir = (model) => path.join(modelsDir(), "whisper", model);
export const kokoroDir = () => path.join(modelsDir(), "kokoro");
export const installedWhisper = () => WHISPER_ORDER.filter((m) => fs.existsSync(path.join(whisperDir(m), "model.bin")));
export const transcribeReady = () => fs.existsSync(venvPython()) && installedWhisper().length > 0;
export const pickModel = (want) => {
  const have = installedWhisper();
  if (want) { if (!have.includes(want)) throw new Error(`whisper model "${want}" is not installed (\`reelwright transcribe install --model ${want} --yes\`)`); return want; }
  if (!have.length) throw new Error("no whisper model installed (`reelwright transcribe install --yes`)");
  return have[0];
};

const show = (s) => s.map((a) => (/[\s"<>|&;]/.test(a) ? JSON.stringify(a) : a)).join(" ");
const rel = (p) => path.relative(process.cwd(), p) || p;
const defaultRun = (c, a) => spawnSync(c, a, { stdio: "inherit" });
// fetch one file with the venv's python (no curl needed, same on Windows); written as .part then renamed
const FETCH = "import os,sys,urllib.request as u; u.urlretrieve(sys.argv[1], sys.argv[2]+'.part'); os.replace(sys.argv[2]+'.part', sys.argv[2])";

function execute(steps, { yes, log, run, head, done }) {
  log(head);
  for (const s of steps) log("  " + show(s));
  if (!yes) { log("nothing downloaded: re-run with --yes to install"); return { ok: true, planned: true }; }
  for (const s of steps) {
    log("> " + show(s));
    const r = run(s[0], s.slice(1));
    if (r.status !== 0) { log(`failed: ${show(s)}${r.error ? ` (${r.error.message}; is uv installed? https://docs.astral.sh/uv/)` : ""}`); return { ok: false }; }
  }
  log(done);
  return { ok: true };
}
const venvSteps = () => (fs.existsSync(venvPython()) ? [] : [["uv", "venv", "--python", PINS.python, ttsVenv()]]);   // an existing venv is reused, so a re-run repairs

export function transcribeInstall({ model = "base", yes = false, log = console.log, run = defaultRun } = {}) {
  if (!WHISPER_MB[model]) { log(`unknown --model "${model}" (tiny, base or small)`); return { ok: false }; }
  const steps = [...venvSteps(), ["uv", "pip", "install", "--python", venvPython(), PINS.whisper]];
  const dir = whisperDir(model);
  if (!fs.existsSync(path.join(dir, "model.bin")))
    steps.push([venvPython(), "-c", "import sys; from faster_whisper import download_model; download_model(sys.argv[1], output_dir=sys.argv[2])", model, dir]);
  return execute(steps, { yes, log, run,
    head: `local transcription into ${rel(ttsVenv())} (${PINS.whisper}, about 100 MB of packages from PyPI) and the whisper "${model}" model into ${rel(dir)} (about ${WHISPER_MB[model]} MB from Hugging Face; tiny 75 MB, base 145 MB, small 484 MB):`,
    done: `installed; \`reelwright transcribe <audio|video>\` (and \`new --video\`, \`narrate check\`) now use the "${model}" model` });
}

export function ttsInstall({ yes = false, log = console.log, run = defaultRun } = {}) {
  const steps = [...venvSteps(), ["uv", "pip", "install", "--python", venvPython(), PINS.kokoro]];
  const need = KOKORO_FILES.filter(([f]) => !fs.existsSync(path.join(kokoroDir(), f)));
  for (const [f, url] of need) steps.push([venvPython(), "-c", FETCH, url, path.join(kokoroDir(), f)]);
  if (yes && need.length) fs.mkdirSync(kokoroDir(), { recursive: true });
  return execute(steps, { yes, log, run,
    head: `local Kokoro voiceover into ${rel(ttsVenv())} (${PINS.kokoro}, about 60 MB of packages from PyPI) and ${need.length ? need.map(([f, , mb]) => `${f} (${mb} MB)`).join(" + ") : "the model files (already there)"} into ${rel(kokoroDir())} (from the kokoro-onnx GitHub release, Apache-2.0):`,
    done: `installed; set "tts": "kokoro" in project.json and \`vo\` uses it. With \`transcribe install\` too, the word times are aligned to the audio instead of estimated` });
}

// run the venv python on tools/transcribe_fw.py → [{ text, start, end }]
export function transcribeMedia(media, { model, lang, run = (c, a) => spawnSync(c, a, { encoding: "utf8", maxBuffer: 1 << 28 }) } = {}) {
  if (!fs.existsSync(venvPython())) throw new Error("local transcription is not installed (`reelwright transcribe install --yes`)");
  const m = pickModel(model);
  const r = run(venvPython(), [path.join(HERE, "transcribe_fw.py"), media, "--model", m, "--models-dir", modelsDir(), ...(lang ? ["--lang", lang] : [])]);
  if (r.status !== 0) throw new Error(`transcribe failed: ${(r.stderr || r.error?.message || "").trim().split("\n").pop()}`);
  const words = JSON.parse(r.stdout);
  if (!Array.isArray(words) || words.some((w) => typeof w.text !== "string" || !Number.isFinite(w.start) || !Number.isFinite(w.end))) throw new Error("transcribe: the engine did not return [{text,start,end}]");
  return words;
}
