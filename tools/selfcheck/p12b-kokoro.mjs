// node tools/selfcheck/p12b-kokoro.mjs — D9: the local Kokoro voiceover adapter (tools/tts_kokoro.py), with a STUB kokoro-onnx package
// (tools/selfcheck/p12b/kokoro_stub/) because the real model (~300 MB) is neither in the repo nor downloadable at build time.
// Proves: the adapter writes vo/<id>.mp3 + vo/lines.json in vo.py's format (text, key, dur, words[{w,t,d}]); voice → language for all
// 9 groups; speed and voice reach the engine; word times are monotonic, inside the speech span and inside the file; unchanged lines are
// not synthesised again and an edited one is; --lang writes vo/<lang>/; without the model, without the package, or with a bad voice or
// speed it exits non-zero with what to do and writes nothing. It does NOT prove audio quality or the real model's output.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const STUB = path.join(ROOT, "tools/selfcheck/p12b/kokoro_stub");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p12b-kokoro-"));
const run = (args, env = {}, code = null) => spawnSync(PY, [...args], { cwd: ROOT, encoding: "utf8", env: { ...process.env, PYTHONUTF8: "1", ...env } });
const py = (code) => JSON.parse(run(["-c", `import sys, json; sys.path.insert(0, "tools"); import tts_kokoro as k\n${code}`]).stdout);

try {
  // voice → language, the nine groups
  assert.deepEqual(py(`print(json.dumps([k.lang_of(v) for v in ["af_heart","am_adam","bf_emma","bm_george","ef_dora","ff_siri","hf_alpha","if_sara","jf_alpha","pf_dora","zf_xiaobei"]]))`),
    ["en-us", "en-us", "en-gb", "en-gb", "es", "fr", "hi", "it", "ja", "pt-br", "cmn"]);
  assert.equal(py(`
try:
    k.lang_of("xx_nope")
    print(json.dumps("no error"))
except ValueError as e:
    print(json.dumps(str(e)))`).includes("unknown Kokoro voice"), true);
  // word estimate: ordered, inside the span, longer words longer, a pause after a sentence end
  const est = py(`print(json.dumps(k.estimate_words("Hi, this is a longer sentence. Next one", 1.0, 4.0)))`);
  assert.equal(est.length, 8);
  assert.ok(est[0].t >= 1 && est.every((w, i) => w.d > 0 && (!i || w.t >= est[i - 1].t + est[i - 1].d - 2e-3)) && est.at(-1).t + est.at(-1).d <= 4.002);
  assert.ok(est[5].d > est[2].d, "a longer word gets longer");
  assert.ok(est[6].t - (est[5].t + est[5].d) > est[1].t - (est[0].t + est[0].d) - 2e-3, "a sentence end leaves the longest pause");
  assert.deepEqual(py(`print(json.dumps(k.estimate_words("", 0, 1)))`), []);

  const mk = (name, P, files = true) => {
    const proj = path.join(tmp, name); fs.mkdirSync(proj, { recursive: true });
    fs.writeFileSync(path.join(proj, "project.json"), JSON.stringify(P));
    return proj;
  };
  const model = path.join(tmp, "model"); fs.mkdirSync(model);
  for (const f of ["kokoro-v1.0.onnx", "voices-v1.0.bin"]) fs.writeFileSync(path.join(model, f), "stub");
  const log = path.join(tmp, "calls.jsonl");
  const env = { PYTHONPATH: STUB, KOKORO_STUB_LOG: log, KOKORO_DIR: model, KOKORO_CACHE: path.join(tmp, "cache") };
  const lines = [{ id: "a", text: "Ship product films from plain code." }, { id: "b", text: "Every scene is a function of time, so renders never drift." }];
  const proj = mk("p", { tts: "kokoro", voice: "bf_emma", speed: 1.25, lines });
  let r = run(["tools/tts_kokoro.py", proj], env);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const L = JSON.parse(fs.readFileSync(path.join(proj, "vo/lines.json"), "utf8"));
  assert.deepEqual(Object.keys(L), ["a", "b"]);
  for (const [id, text] of lines.map((l) => [l.id, l.text])) {
    const v = L[id], mp3 = path.join(proj, "vo", id + ".mp3");
    assert.ok(fs.statSync(mp3).size > 1000 && !fs.existsSync(path.join(proj, "vo", id + ".wav")), "mp3 written, temp wav removed");
    const probe = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3], { encoding: "utf8" }).stdout);
    assert.ok(Math.abs(probe - v.dur) < 0.01 && Math.abs(v.dur - (text.length * 0.06 / 1.25 + 0.6)) < 0.15, `${id}: dur ${v.dur} follows the stub's length at speed 1.25`);
    assert.deepEqual([v.text, v.timing, v.key.length], [text, "estimated", 12]);
    assert.deepEqual(v.words.map((w) => w.w), text.split(" "));
    assert.ok(v.words[0].t >= 0.25 && v.words[0].t < 0.35, "starts after the silent head: " + v.words[0].t);   // the stub has 0.3 s of silence
    assert.ok(v.words.every((w, i) => w.d > 0 && (!i || w.t >= v.words[i - 1].t)) && v.words.at(-1).t + v.words.at(-1).d <= v.dur - 0.25, "inside the speech");
  }
  const calls = () => fs.readFileSync(log, "utf8").trim().split("\n").map(JSON.parse);
  assert.deepEqual(calls().map((c) => [c.voice, c.speed, c.lang, c.model]), [["bf_emma", 1.25, "en-gb", "kokoro-v1.0.onnx"], ["bf_emma", 1.25, "en-gb", "kokoro-v1.0.onnx"]]);

  // unchanged lines are reused; an edited one and a forced one are redone
  fs.writeFileSync(path.join(proj, "project.json"), JSON.stringify({ tts: "kokoro", voice: "bf_emma", speed: 1.25, lines: [lines[0], { id: "b", text: "A different second line." }] }));
  assert.equal(run(["tools/tts_kokoro.py", proj], env).status, 0);
  assert.deepEqual(calls().slice(2).map((c) => c.text), ["A different second line."]);
  assert.equal(run(["tools/tts_kokoro.py", proj], env).status, 0); assert.equal(calls().length, 3, "nothing to do: no synthesis");
  assert.equal(run(["tools/tts_kokoro.py", proj, "a"], env).status, 0); assert.equal(calls().length, 4, "an id forces a redo");
  // a changed voice or speed changes the key: everything is redone
  fs.writeFileSync(path.join(proj, "project.json"), JSON.stringify({ voice: "am_adam", lines: [lines[0]] }));
  assert.equal(run(["tools/tts_kokoro.py", proj], env).status, 0);
  assert.deepEqual([calls().at(-1).voice, calls().at(-1).speed, calls().at(-1).lang], ["am_adam", 1, "en-us"]);

  // --lang
  const pl = mk("lang", { voice: "af_heart", lines: [lines[0]], langs: { es: { voice: "ef_dora", lines: { a: "Hola, esto es una prueba." } } } });
  assert.equal(run(["tools/tts_kokoro.py", pl], { ...env, REELWRIGHT_LANG: "es" }).status, 0);
  assert.ok(fs.existsSync(path.join(pl, "vo/es/a.mp3")) && JSON.parse(fs.readFileSync(path.join(pl, "vo/es/lines.json"), "utf8")).a.words.length === 5);
  assert.equal(calls().at(-1).lang, "es");

  // refusals: no model, no package, bad voice, bad speed — each exits non-zero, says what to do, writes no lines.json
  const refuse = (name, P, e, want) => {
    const d = mk(name, P), x = run(["tools/tts_kokoro.py", d], e);
    assert.notEqual(x.status, 0, name); assert.match(x.stderr, want, `${name}: ${x.stderr}`); assert.ok(!fs.existsSync(path.join(d, "vo/lines.json")), `${name}: nothing written`);
  };
  refuse("nomodel", { voice: "af_heart", lines }, { ...env, KOKORO_DIR: path.join(tmp, "empty") }, /model not found.*Nothing is downloaded/s);
  refuse("nopkg", { voice: "af_heart", lines }, { ...env, PYTHONPATH: "" }, /kokoro-onnx package is not installed/);
  refuse("badvoice", { voice: "nope", lines }, env, /unknown Kokoro voice/);
  refuse("badspeed", { voice: "af_heart", speed: 3, lines }, env, /speed is 0\.5 to 2/);
  // music-only film
  const m = mk("music", { voice: "af_heart", lines: [] }); assert.equal(run(["tools/tts_kokoro.py", m], env).status, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(m, "vo/lines.json"), "utf8")), {});
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log("p12b-kokoro ok: adapter proven against a stub engine (the real 82M model is not in the repo)");
