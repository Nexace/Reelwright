// node tools/selfcheck/q5-install.mjs — the opt-in local speech installs (`transcribe install`, `tts install`), proven offline: nothing is installed or downloaded.
//   - dry-run text (plan, pins, sizes), refusal without --yes (no command runs, no file or folder is made), a bad --model, steps in order with a recording stub,
//     an existing venv / existing model skipped (a re-run repairs), a failing step stops;
//   - venv and model-dir selection (defaults, env overrides, transcribeReady, pickModel order);
//   - the transcript JSON shape: tools/transcribe_fw.py against a STUB faster-whisper (tools/selfcheck/q5/fw_stub), and transcribeMedia's shape check;
//   - end to end with stubs: `transcribe <file> --out`, `new --video`, `narrate check` use the stub venv's python; tts_kokoro.py re-runs in the venv python,
//     reads <models>/kokoro, and with the stub engine marks "timing": "aligned" with the engine's times (unheard words placed between their neighbours),
//     falls back to "estimated" when the engine fails or align is off, and redoes an "estimated" line once the aligner exists.
// It does NOT prove the real packages, the real model files or their download URLs (the owner runs `transcribe install --yes` and `tts install --yes`).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "q5-install-"));
const venv = path.join(tmp, "venv"), models = path.join(tmp, "models");
process.env.REELWRIGHT_TTS_VENV = venv; process.env.REELWRIGHT_MODELS_DIR = models;
const L = await import(pathToFileURL(path.join(ROOT, "tools/local_speech.mjs")).href);
const FW = path.join(ROOT, "tools/selfcheck/q5/fw_stub"), KS = path.join(ROOT, "tools/selfcheck/p12b/kokoro_stub");
const sh = (cmd, args, env = {}, o = {}) => spawnSync(cmd, args, { encoding: "utf8", cwd: ROOT, env: { ...process.env, PYTHONUTF8: "1", ...env }, ...o });
const rw = (args, env) => sh(process.execPath, [path.join(ROOT, "bin/reelwright.mjs"), ...args], env);
const lines = (s) => s.split(/\r?\n/);
const touch = (f, c = "stub") => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); };
const noop = () => {};
const go = (fn, o) => { const out = [], calls = []; const r = fn({ ...o, log: (l) => out.push(l), run: (c, a) => (calls.push([c, ...a]), { status: o?.fail ? 1 : 0 }) }); return { r, out: out.join("\n"), calls }; };
const created = [];
const made = (n) => { created.push(n); return n; };
try {
  // ── defaults and overrides ──
  assert.equal(L.ttsVenv(), venv); assert.equal(L.modelsDir(), models);
  assert.equal(L.venvPython(), path.join(venv, ...(process.platform === "win32" ? ["Scripts", "python.exe"] : ["bin", "python"])));
  const saved = { v: process.env.REELWRIGHT_TTS_VENV, m: process.env.REELWRIGHT_MODELS_DIR };
  delete process.env.REELWRIGHT_TTS_VENV; delete process.env.REELWRIGHT_MODELS_DIR;
  assert.equal(path.relative(ROOT, L.ttsVenv()), ".venv-tts"); assert.equal(path.relative(ROOT, L.modelsDir()), ".models");
  process.env.REELWRIGHT_TTS_VENV = saved.v; process.env.REELWRIGHT_MODELS_DIR = saved.m;
  const gi = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  assert.match(gi, /^\.venv-tts\/$/m); assert.match(gi, /^\.models\/$/m);

  // ── transcribe install: dry run, refusal without --yes ──
  let { r, out, calls } = go(L.transcribeInstall, {});
  assert.deepEqual(r, { ok: true, planned: true });
  assert.match(out, /faster-whisper>=1\.1,<2/); assert.match(out, /about 145 MB/); assert.match(out, /tiny 75 MB, base 145 MB, small 484 MB/);
  assert.match(out, /uv venv --python 3\.12 /); assert.match(out, /uv pip install --python .*faster-whisper>=1\.1,<2/); assert.match(out, /download_model/);
  assert.match(out, /nothing downloaded: re-run with --yes to install/);
  assert.equal(calls.length, 0, "no command runs without --yes"); assert.ok(!fs.existsSync(venv) && !fs.existsSync(models), "nothing is created without --yes");
  ({ out } = go(L.transcribeInstall, { model: "small" })); assert.match(out, /about 484 MB/); assert.match(out, /whisper[\\/]small/);
  ({ r, out } = go(L.transcribeInstall, { model: "huge", yes: true })); assert.equal(r.ok, false); assert.match(out, /unknown --model "huge"/);

  // ── --yes with a recording stub (the real spawn is never used) ──
  ({ r, calls } = go(L.transcribeInstall, { yes: true }));
  assert.equal(r.ok, true); assert.deepEqual(calls.map((c) => c.slice(0, 2).join(" ")), ["uv venv", "uv pip", `${L.venvPython()} -c`]);
  assert.deepEqual(calls[2].slice(-2), ["base", path.join(models, "whisper", "base")]);
  touch(L.venvPython()); touch(path.join(L.whisperDir("base"), "model.bin"));   // venv and model exist: the re-run only repairs the package
  ({ calls } = go(L.transcribeInstall, { yes: true })); assert.deepEqual(calls.map((c) => c.slice(0, 2).join(" ")), ["uv pip"]);
  ({ calls } = go(L.transcribeInstall, { yes: true, model: "tiny" })); assert.deepEqual(calls.map((c) => c.slice(0, 2).join(" ")), ["uv pip", `${L.venvPython()} -c`]);
  ({ r, calls } = go(L.transcribeInstall, { yes: true, model: "tiny", fail: true })); assert.equal(r.ok, false); assert.equal(calls.length, 1, "a failing step stops the rest");

  // ── tts install ──
  ({ r, out, calls } = go(L.ttsInstall, {}));
  assert.deepEqual(r, { ok: true, planned: true }); assert.match(out, /kokoro-onnx>=0\.4,<1/); assert.match(out, /kokoro-v1\.0\.onnx \(310 MB\) \+ voices-v1\.0\.bin \(27 MB\)/);
  assert.match(out, /nothing downloaded/); assert.equal(calls.length, 0); assert.ok(!fs.existsSync(L.kokoroDir()), "no model folder without --yes");
  assert.equal(out.match(/urlretrieve/g).length, 2); assert.match(out, /github\.com\/thewh1teagle\/kokoro-onnx\/releases\/download\/model-files-v1\.0\/kokoro-v1\.0\.onnx/);
  ({ calls } = go(L.ttsInstall, { yes: true })); assert.deepEqual(calls.map((c) => c.slice(0, 2).join(" ")), ["uv pip", `${L.venvPython()} -c`, `${L.venvPython()} -c`]);   // the venv from above is reused
  touch(path.join(L.kokoroDir(), "kokoro-v1.0.onnx"));
  ({ out, calls } = go(L.ttsInstall, { yes: true })); assert.equal(calls.length, 2, "an existing model file is not fetched again"); assert.doesNotMatch(out, /kokoro-v1\.0\.onnx \(/);
  touch(path.join(L.kokoroDir(), "voices-v1.0.bin"));
  ({ out, calls } = go(L.ttsInstall, { yes: true })); assert.equal(calls.length, 1); assert.match(out, /the model files \(already there\)/);
  ({ r } = go(L.ttsInstall, { yes: true, fail: true })); assert.equal(r.ok, false);

  // ── the CLI: dry run exits 0 and makes nothing; usage and a missing install exit 1 ──
  fs.rmSync(venv, { recursive: true, force: true }); fs.rmSync(models, { recursive: true, force: true });
  for (const a of [["transcribe", "install"], ["tts", "install"], ["transcribe", "install", "--model", "small"]]) {
    const x = rw(a); assert.equal(x.status, 0, x.stderr); assert.match(x.stdout, /nothing downloaded: re-run with --yes to install/);
  }
  assert.ok(!fs.existsSync(venv) && !fs.existsSync(models), "the CLI dry run makes nothing");
  assert.equal(rw(["transcribe", "install", "--model", "huge"]).status, 1);
  assert.equal(rw(["tts"]).status, 1); assert.equal(rw(["transcribe"]).status, 1);
  let x = rw(["transcribe", path.join(tmp, "a.wav")]); assert.equal(x.status, 1); assert.match(x.stderr, /not installed.*transcribe install --yes/s);

  // ── selection: ready only with the venv python AND a model; default model order; explicit model must exist ──
  assert.equal(L.transcribeReady(), false);
  touch(L.venvPython()); assert.equal(L.transcribeReady(), false, "venv without a model");
  touch(path.join(L.whisperDir("small"), "model.bin")); assert.equal(L.transcribeReady(), true); assert.equal(L.pickModel(), "small");
  touch(path.join(L.whisperDir("tiny"), "model.bin")); assert.equal(L.pickModel(), "small"); touch(path.join(L.whisperDir("base"), "model.bin")); assert.equal(L.pickModel(), "base");
  assert.equal(L.pickModel("tiny"), "tiny"); assert.throws(() => L.pickModel("huge"), /not installed/);

  // ── the transcript shape: transcribeMedia validates what the engine prints ──
  const fake = (stdout, status = 0) => () => ({ status, stdout, stderr: "boom\nlast line" });
  assert.deepEqual(L.transcribeMedia("x.wav", { run: fake('[{"text":"hi","start":0,"end":0.4}]\r\n') }), [{ text: "hi", start: 0, end: 0.4 }]);   // CRLF tolerated
  assert.throws(() => L.transcribeMedia("x.wav", { run: fake('[{"w":"hi"}]') }), /did not return/);
  assert.throws(() => L.transcribeMedia("x.wav", { run: fake("", 1) }), /transcribe failed: last line/);
  const seen = []; L.transcribeMedia("x.wav", { lang: "es", model: "tiny", run: (c, a) => (seen.push([c, ...a]), { status: 0, stdout: "[]" }) });
  assert.equal(seen[0][0], L.venvPython()); assert.deepEqual(seen[0].slice(2), ["x.wav", "--model", "tiny", "--models-dir", models, "--lang", "es"]);

  // ── tools/transcribe_fw.py against the STUB engine (any platform): the real script, a stub package ──
  const words = [[" Ship", 0.4, 0.62], [" product", 0.7, 1.1], [" films", 1.15, 1.4], [" plain", 1.7, 1.95], [" code.", 2.0, 2.3]];
  const fwEnv = { PYTHONPATH: FW, FW_STUB_WORDS: JSON.stringify(words), FW_STUB_LOG: path.join(tmp, "fw.jsonl"), REELWRIGHT_MODELS_DIR: models };
  const media = path.join(tmp, "tone.wav");
  assert.equal(sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=d=2.6", "-ar", "24000", "-ac", "1", media]).status, 0);
  x = sh(PY, ["tools/transcribe_fw.py", media, "--model", "base", "--lang", "en", "--models-dir", models], fwEnv);
  assert.equal(x.status, 0, x.stderr);
  assert.deepEqual(JSON.parse(x.stdout), [{ text: "Ship", start: 0.4, end: 0.62 }, { text: "product", start: 0.7, end: 1.1 }, { text: "films", start: 1.15, end: 1.4 }, { text: "plain", start: 1.7, end: 1.95 }, { text: "code.", start: 2, end: 2.3 }]);
  assert.deepEqual(JSON.parse(lines(fs.readFileSync(fwEnv.FW_STUB_LOG, "utf8").trim())[0]), { audio: "tone.wav", language: "en", word_timestamps: true, model: "base", local_files_only: true });
  x = sh(PY, ["tools/transcribe_fw.py", media, "--model", "small", "--models-dir", path.join(tmp, "empty")], fwEnv); assert.notEqual(x.status, 0); assert.match(x.stderr, /whisper model "small" not found.*transcribe install/);

  // ── the aligner, pure (no engine) ──
  const py = (code) => JSON.parse(sh(PY, ["-c", `import sys, json; sys.path.insert(0, "tools"); import tts_kokoro as k\n${code}`], { REELWRIGHT_TTS_VENV: path.join(tmp, "none") }).stdout);
  const al = py(`print(json.dumps(k.align_words("Ship product films from plain code.", [{"text":" ship","start":0.4,"end":0.62},{"text":"Product,","start":0.7,"end":1.1},{"text":"films","start":1.15,"end":1.4},{"text":"plain","start":1.7,"end":1.95},{"text":"code","start":2.0,"end":2.3}], 0.3, 2.4)))`);
  assert.deepEqual(al.map((w) => w.w), ["Ship", "product", "films", "from", "plain", "code."]);
  assert.deepEqual([al[0].t, al[0].d, al[1].t, al[5].t, al[5].d], [0.4, 0.22, 0.7, 2.0, 0.3], "heard words keep the engine's times; case and punctuation are ignored");
  assert.ok(al[3].t >= 1.4 && al[3].t + al[3].d <= 1.7 + 1e-9, "the unheard word sits between its neighbours: " + JSON.stringify(al[3]));
  assert.ok(al.every((w, i) => w.d > 0 && (!i || w.t >= al[i - 1].t)));
  assert.equal(py(`print(json.dumps(k.align_words("one two three four five", [{"text":"one","start":0,"end":1}], 0, 5)))`), null, "under 60% heard: no alignment");
  assert.deepEqual(py(`print(json.dumps(k.align_words("", [], 0, 1)))`), []);
  const head = py(`print(json.dumps(k.align_words("uh Ship it", [{"text":"ship","start":1,"end":1.3},{"text":"it","start":1.4,"end":1.6}], 0.2, 2)))`);
  assert.ok(head[0].t >= 0.2 && head[0].t + head[0].d <= 1 + 1e-9, "an unheard first word is placed before the first heard one");

  if (process.platform !== "win32") {
    // a stub venv: its python is a script that notes it ran, then runs the system python (so the stubs on PYTHONPATH apply)
    const marker = path.join(tmp, "venv-ran");
    fs.rmSync(venv, { recursive: true, force: true }); fs.mkdirSync(path.dirname(L.venvPython()), { recursive: true });
    fs.writeFileSync(L.venvPython(), `#!/bin/sh\necho ran >> "${marker}"\nexec ${PY} "$@"\n`, { mode: 0o755 });
    fs.rmSync(path.join(models, "whisper"), { recursive: true, force: true }); touch(path.join(L.whisperDir("base"), "model.bin"));   // only "base" from here on
    const e2e = { ...fwEnv, PATH: process.env.PATH };
    const wav = path.join(tmp, "speech.wav");
    assert.equal(sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=d=2.6", "-ar", "16000", "-ac", "1", wav]).status, 0);

    // transcribe <file> --out words.json, through the venv python
    const outJson = path.join(tmp, "words.json");
    x = rw(["transcribe", wav, "--out", outJson], e2e); assert.equal(x.status, 0, x.stderr + x.stdout); assert.match(x.stdout, /words\.json: 5 words/);
    assert.deepEqual(JSON.parse(fs.readFileSync(outJson, "utf8")).map((w) => w.text), ["Ship", "product", "films", "plain", "code."]);
    assert.ok(fs.existsSync(marker), "the venv python ran the engine");
    x = rw(["transcribe", wav, "--model", "small"], e2e); assert.equal(x.status, 1); assert.match(x.stderr, /whisper model "small" is not installed/);
    const lang = rw(["transcribe", wav, "--lang", "es"], e2e); assert.equal(lang.status, 0); assert.match(fs.readFileSync(fwEnv.FW_STUB_LOG, "utf8"), /"language": "es"/);

    // new --video: transcript.json from the audio of the file, written by the installed engine (no whisper-cli, no $WHISPER_MODEL)
    const mp4 = path.join(tmp, "clip.mp4"), name = made("q5-media-" + process.pid);
    assert.equal(sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc=s=320x240:d=2.6:r=30", "-f", "lavfi", "-i", "sine=d=2.6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", mp4]).status, 0);
    x = rw(["new", name, "--video", mp4], { ...e2e, WHISPER_MODEL: "" }); assert.equal(x.status, 0, x.stderr + x.stdout); assert.match(x.stdout, /transcript\.json: 5 words/);
    const tj = JSON.parse(fs.readFileSync(path.join(ROOT, "projects", name, "transcript.json"), "utf8"));
    assert.deepEqual(tj[0], { text: "Ship", start: 0.4, end: 0.62 }); assert.deepEqual(Object.keys(tj[0]), ["text", "start", "end"]);

    // narrate check: "hears every word back" with the installed engine
    fs.writeFileSync(path.join(tmp, "hw.json"), "");
    const hw = { ...e2e, FW_STUB_WORDS: JSON.stringify([[" hello", 0.1, 0.5], [" world", 0.5, 0.9]]) };
    x = rw(["narrate", "check", wav, "Hello, world!"], hw); assert.equal(x.status, 0, x.stdout + x.stderr); assert.match(x.stdout, /PASS\s+WER 0/);
    x = rw(["narrate", "check", wav, "hello there world"], hw); assert.equal(x.status, 1); assert.match(x.stdout, /FAIL/); assert.match(x.stdout, /not heard: there/);

    // tts_kokoro.py: run with the PLAIN python; it re-runs in the venv python, reads <models>/kokoro, and aligns with the engine
    const mk = (n, P) => { const d = path.join(tmp, n); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, "project.json"), JSON.stringify(P)); return d; };
    for (const f of ["kokoro-v1.0.onnx", "voices-v1.0.bin"]) touch(path.join(models, "kokoro", f));
    const P = { tts: "kokoro", voice: "af_heart", lines: [{ id: "a", text: "Ship product films from plain code." }] };
    const kEnv = { ...e2e, PYTHONPATH: [KS, FW].join(path.delimiter), KOKORO_STUB_LOG: path.join(tmp, "k.jsonl") };
    const kcalls = () => (fs.existsSync(kEnv.KOKORO_STUB_LOG) ? fs.readFileSync(kEnv.KOKORO_STUB_LOG, "utf8").trim().split(/\r?\n/).length : 0);
    fs.rmSync(marker); fs.rmSync(path.join(models, "whisper"), { recursive: true });   // no whisper model yet: the line is estimated
    const pa = mk("aligned", P);
    x = sh(PY, ["tools/tts_kokoro.py", pa], kEnv); assert.equal(x.status, 0, x.stderr + x.stdout);
    assert.ok(fs.existsSync(marker), "tts_kokoro.py re-ran itself with the venv python");
    let V = JSON.parse(fs.readFileSync(path.join(pa, "vo/lines.json"), "utf8")).a;
    assert.equal(V.timing, "estimated"); assert.equal(kcalls(), 1);
    touch(path.join(models, "whisper", "base", "model.bin"));   // the aligner arrives: the estimated line is redone with real times
    x = sh(PY, ["tools/tts_kokoro.py", pa], kEnv); assert.equal(x.status, 0, x.stderr + x.stdout); assert.equal(kcalls(), 2);
    V = JSON.parse(fs.readFileSync(path.join(pa, "vo/lines.json"), "utf8")).a;
    assert.equal(V.timing, "aligned"); assert.deepEqual(V.words.map((w) => w.w), "Ship product films from plain code.".split(" "));
    assert.deepEqual([V.words[0].t, V.words[0].d, V.words[1].t, V.words[4].t, V.words[5].t, V.words[5].d], [0.4, 0.22, 0.7, 1.7, 2, 0.3], "the engine's times, not the estimate");
    assert.ok(V.words[3].t >= 1.4 && V.words[3].t + V.words[3].d <= 1.7 + 1e-6, "'from' was not heard: placed between its neighbours");
    assert.ok(!fs.existsSync(path.join(pa, "vo/a.wav")) && fs.statSync(path.join(pa, "vo/a.mp3")).size > 1000);
    assert.match(fs.readFileSync(fwEnv.FW_STUB_LOG, "utf8").trim().split(/\r?\n/).at(-1), /"audio": "a\.wav", "language": "en", "word_timestamps": true, "model": "base"/);
    x = sh(PY, ["tools/tts_kokoro.py", pa], kEnv); assert.equal(kcalls(), 2, "an aligned line is not synthesised again");
    // the engine fails: estimated, and it says so; align:false: estimated, the engine is not asked
    const pf = mk("failing", P); x = sh(PY, ["tools/tts_kokoro.py", pf], { ...kEnv, FW_STUB_FAIL: "1" });
    assert.equal(x.status, 0, x.stderr); assert.match(x.stderr, /alignment skipped \(stub engine failure\)/); assert.equal(JSON.parse(fs.readFileSync(path.join(pf, "vo/lines.json"), "utf8")).a.timing, "estimated");
    const logN = () => fs.readFileSync(fwEnv.FW_STUB_LOG, "utf8").trim().split(/\r?\n/).length, before = logN();
    const po = mk("off", { ...P, kokoro: { align: false } }); x = sh(PY, ["tools/tts_kokoro.py", po], kEnv);
    assert.equal(x.status, 0, x.stderr); assert.equal(JSON.parse(fs.readFileSync(path.join(po, "vo/lines.json"), "utf8")).a.timing, "estimated"); assert.equal(logN(), before);
    // aligned words keep the vo.py contract the scheduler reads
    assert.ok(V.words.every((w) => typeof w.w === "string" && typeof w.t === "number" && typeof w.d === "number") && typeof V.dur === "number" && V.key.length === 12);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const n of created) fs.rmSync(path.join(ROOT, "projects", n), { recursive: true, force: true });
}
console.log("q5-install ok: dry runs and refusals, venv/model selection, transcript shape, and the stub-engine paths (transcribe, new --video, narrate check, Kokoro alignment)" + (process.platform === "win32" ? " [venv-python paths skipped on Windows]" : ""));
