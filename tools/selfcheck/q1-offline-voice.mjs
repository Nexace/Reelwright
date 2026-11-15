// node tools/selfcheck/q1-offline-voice.mjs — Q1: the offline voice fallback (tools/tts_local.py, reached through tools/vo.py). No network.
// A stub `espeak-ng` on PATH (a tiny script that writes a tone as long as the text) stands in for the engine, so the check is the same on a
// machine with a real engine and on one with none. It must hold: "tts": "local" and REELWRIGHT_TTS=local both give vo/<id>.mp3 and vo/lines.json
// in vo.py's shape (text, key, dur, words[{w,t,d}]) with "timing": "estimated", words inside the line and in order; an unchanged line is reused and
// a forced one redone; --lang writes vo/<lang>/; with no engine it fails with what to install; with edge-tts importable and no tts setting, vo.py
// still takes the edge-tts path (a fake edge_tts module on PYTHONPATH records the call: the default is unchanged). The Windows SAPI call needs
// PowerShell and is exercised by tools/ci_film.mjs there; the stub needs a POSIX shell, so on Windows only the no-engine and default-path cases run.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const win = process.platform === "win32";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "q1-voice-"));
const vo = (proj, env = {}, ...a) => spawnSync(PY, [path.join(ROOT, "tools", "vo.py"), proj, ...a], { encoding: "utf8", env: { ...process.env, PYTHONUTF8: "1", ...env } });
const mk = (name, tts) => {
  const d = path.join(tmp, name); fs.mkdirSync(d);
  const P = { title: name, ...(tts && { tts }), lines: [{ id: "a", text: "Hello there, this is a test." }, { id: "b", text: "- A line that starts with a dash." }],
    langs: { es: { voice: "x", lines: { a: "Hola, esto es una prueba.", b: "Otra linea." } } } };
  fs.writeFileSync(path.join(d, "project.json"), JSON.stringify(P));
  return d;
};
const lines = (d, sub = "vo") => JSON.parse(fs.readFileSync(path.join(d, sub, "lines.json"), "utf8"));
const noEngine = { PATH: path.join(tmp, "empty"), REELWRIGHT_TTS_ENGINE: "none-such" };   // nothing found: PATH aside, the engine filter alone also selects none
fs.mkdirSync(path.join(tmp, "empty"));
const ff = spawnSync("ffmpeg", ["-version"]).status === 0 && spawnSync("ffprobe", ["-version"]).status === 0;
assert.ok(ff, "ffmpeg and ffprobe are needed");

// no engine → a clear failure, nothing written as a pretend success
{
  const d = mk("none", "local");
  const r = vo(d, { REELWRIGHT_TTS_ENGINE: "none-such" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /no local speech engine/);
}

// the default is unchanged: no tts setting + importable edge_tts → the edge_tts module is used (a fake one that records and writes tiny audio)
{
  const d = mk("default"), fake = path.join(tmp, "fake"); fs.mkdirSync(fake);
  fs.writeFileSync(path.join(fake, "edge_tts.py"), `import subprocess
class Communicate:
    def __init__(self, text, voice, rate=None, pitch=None, boundary=None): self.text = text
    async def stream(self):
        open(${JSON.stringify(path.join(tmp, "edge-called.txt"))}, "a").write(self.text + "\\n")
        wav = ${JSON.stringify(path.join(tmp, "fake.mp3"))}
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "sine=duration=1", wav], check=True)
        yield {"type": "audio", "data": open(wav, "rb").read()}
        yield {"type": "WordBoundary", "text": "Hello", "offset": 0, "duration": 5000000}
`);
  const r = vo(d, { PYTHONPATH: fake, REELWRIGHT_TTS: "" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(fs.readFileSync(path.join(tmp, "edge-called.txt"), "utf8"), /Hello there/);
  assert.ok(!("timing" in lines(d).a), "edge-tts lines carry no estimated-timing mark");
}

if (win) console.log("q1-offline-voice: stub-engine cases skipped on Windows (SAPI is covered by tools/ci_film.mjs)");
else {
  const bin = path.join(tmp, "bin"); fs.mkdirSync(bin);
  // stub espeak-ng: `espeak-ng -w <out.wav> --stdin`: a 220 Hz tone, 0.05 s per input character, after a 0.1 s lead of silence
  fs.writeFileSync(path.join(bin, "espeak-ng"), `#!/bin/sh
[ "$1" = "-w" ] && [ "$3" = "--stdin" ] || { echo "stub: unexpected args $*" >&2; exit 2; }
n=$(wc -c | tr -d ' ')
ffmpeg -nostdin -y -v error -f lavfi -i "anullsrc=r=22050:cl=mono" -f lavfi -i "sine=frequency=220:sample_rate=22050" -filter_complex "[0]atrim=0:0.1[s];[1]atrim=0:$(awk "BEGIN{print $n*0.05}")[t];[s][t]concat=n=2:v=0:a=1" -ac 1 -f wav "$2"
`, { mode: 0o755 });
  const env = { PATH: bin + path.delimiter + process.env.PATH, REELWRIGHT_TTS_ENGINE: "espeak-ng" };
  assert.equal(spawnSync(PY, [path.join(ROOT, "tools", "tts_local.py"), "--engine"], { encoding: "utf8", env: { ...process.env, ...env } }).stdout.trim(), "espeak-ng");

  for (const [how, tts, e] of [["project.json tts: local", "local", env], ["env REELWRIGHT_TTS=local", undefined, { ...env, REELWRIGHT_TTS: "local" }]]) {
    const d = mk("stub-" + how.replace(/\W+/g, "-"), tts);
    const r = vo(d, e);
    assert.equal(r.status, 0, `${how}: ${r.stderr}${r.stdout}`);
    const L = lines(d);
    for (const [id, text] of [["a", "Hello there, this is a test."], ["b", "- A line that starts with a dash."]]) {
      const l = L[id];
      assert.equal(l.text, text); assert.equal(l.timing, "estimated"); assert.ok(l.key);
      assert.ok(fs.statSync(path.join(d, "vo", id + ".mp3")).size > 500, id + ".mp3 written");
      const dur = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(d, "vo", id + ".mp3")], { encoding: "utf8" }).stdout);
      assert.ok(Math.abs(dur - l.dur) < 0.01 && dur > 1, `${id}: dur ${l.dur} vs ${dur}`);
      assert.deepEqual(l.words.map((w) => w.w), text.split(" "));
      let prev = 0;
      for (const w of l.words) { assert.ok(w.t >= prev - 1e-6 && w.d > 0 && w.t + w.d <= l.dur + 0.01, `${id} word ${w.w} in order and inside the line`); prev = w.t; }
      assert.ok(l.words[0].t >= 0.05 && l.words[0].t < 0.2, `words start after the silent lead (${l.words[0].t})`);   // the span is found from the audio, not from 0
    }
    // reuse an unchanged line, redo a forced one
    const m0 = fs.statSync(path.join(d, "vo", "a.mp3")).mtimeMs;
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(vo(d, e).status, 0);
    assert.equal(fs.statSync(path.join(d, "vo", "a.mp3")).mtimeMs, m0, "unchanged line reused");
    assert.equal(vo(d, e, "a").status, 0);
    assert.ok(fs.statSync(path.join(d, "vo", "a.mp3")).mtimeMs > m0, "named line redone");
    assert.equal(fs.readFileSync(path.join(d, "vo", "lines.json"), "utf8").includes("\r") ? "crlf" : "lf", "lf");
  }
  const d = mk("stub-lang", "local");   // --lang es → vo/es/
  assert.equal(vo(d, { ...env, REELWRIGHT_LANG: "es" }).status, 0);
  assert.equal(lines(d, "vo/es").a.text, "Hola, esto es una prueba.");
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log("q1-offline-voice: ok");
