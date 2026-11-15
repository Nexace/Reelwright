// node tools/selfcheck/p12a-new-media.mjs — row hyperframes:G1, `new <name> --video <file> [--audio <file>]`: a VP9 webm is converted to H.264 yuv420p mp4 (an H.264 mp4
// is copied byte for byte), the project takes the file's size and fps, and a real `film` of the new project renders the clip (frames of the source, its sound, its
// length). The transcript comes ONLY through the existing whisper-cli + $WHISPER_MODEL path: without them `new` says it skipped it and downloads nothing; with a
// stand-in whisper-cli (a shell script that writes whisper.cpp's JSON) transcript.json holds the timed words. Offline; whisper itself is not run here.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { ROOT, pixel } from "./p1-fixture.mjs";
import { parseWhisperJson } from "../new_media.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p12a-g1-")), names = [`p12a-g1a-${process.pid}`, `p12a-g1b-${process.pid}`, `p12a-g1c-${process.pid}`];
const sh = (cmd, args, env = {}) => spawnSync(cmd, args, { encoding: "utf8", cwd: ROOT, env: { ...process.env, ...env, PAGES: "2" }, maxBuffer: 1 << 26 });
const rw = (args, env) => sh(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), ...args], env);
const probe = (f, e) => spawnSync("ffprobe", ["-v", "error", "-show_entries", e, "-of", "csv=p=0:s=,", f], { encoding: "utf8" }).stdout.replace(/\r/g, "").trim();
try {
  const webm = path.join(tmp, "clip.webm"), mp4 = path.join(tmp, "clip.mp4"), beep = path.join(tmp, "beep.wav");
  assert.equal(sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=321x181:rate=24:duration=1.5", "-f", "lavfi", "-i", "sine=f=440:d=1.5", "-c:v", "libvpx-vp9", "-b:v", "1M", "-c:a", "libopus", "-shortest", webm]).status, 0);
  assert.equal(sh("ffmpeg", ["-y", "-v", "error", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", mp4]).status, 0);
  assert.equal(sh("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=f=880:d=1.5", beep]).status, 0);

  // the word parser, on whisper.cpp's JSON shape
  assert.deepEqual(parseWhisperJson({ transcription: [{ offsets: { from: 0, to: 420 }, text: " Hello" }, { offsets: { from: 420, to: 900 }, text: " world." }, { offsets: { from: 900, to: 950 }, text: " [BLANK_AUDIO]" }] }),
    [{ text: "Hello", start: 0, end: 0.42 }, { text: "world.", start: 0.42, end: 0.9 }]);

  // a webm with an odd size: converted, sized to even, no model → no transcript, nothing downloaded
  let r = rw(["new", names[0], "--video", webm, "--audio", beep], { WHISPER_MODEL: "", PATH: process.env.PATH });
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /converted to H\.264 mp4/); assert.match(r.stdout, /no transcript: whisper-cli and \$WHISPER_MODEL are not set up/);
  const A = path.join(ROOT, "projects", names[0]), P = JSON.parse(fs.readFileSync(path.join(A, "project.json"), "utf8"));
  assert.deepEqual([P.width, P.height, P.fps, P.renderer], [320, 180, 24, "hyperframes"], "size (made even) and fps come from the file");
  assert.equal(probe(path.join(A, "hf", "media", names[0] + ".mp4"), "stream=codec_name,pix_fmt").split(/\r?\n/)[0], "h264,yuv420p");
  assert.ok(!fs.existsSync(path.join(A, "transcript.json")));
  // a real render of it
  r = rw(["film", names[0]]); assert.equal(r.status, 0, r.stdout.slice(-600) + r.stderr.slice(-600));
  const out = path.join(A, P.out);
  assert.equal(probe(out, "stream=width,height").split("\n")[0], "320,180"); assert.ok(Math.abs(Number(probe(out, "format=duration")) - 1.5) < 0.25, "the film is the clip's length");
  assert.ok(probe(out, "stream=codec_type").includes("audio"), "its sound is in the mp4");
  const px = pixel(out, 160, 90, 0.5), px2 = pixel(out, 10, 10, 0.5); assert.ok(px.some((v) => v > 20) && px2.some((v) => v > 20), "the frames show the source (testsrc2), not a blank page");

  // an H.264 mp4 is copied untouched
  r = rw(["new", names[1], "--video", mp4]); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /is H\.264 mp4, copied as it is/);
  assert.ok(fs.readFileSync(path.join(ROOT, "projects", names[1], "hf", "media", names[1] + ".mp4")).equals(fs.readFileSync(mp4)), "byte for byte");

  // with a speech path present (a stand-in whisper-cli): transcript.json from the media's audio
  const bin = path.join(tmp, "bin"); fs.mkdirSync(bin);
  if (process.platform === "win32") fs.writeFileSync(path.join(bin, "whisper-cli.cmd"),   // no /bin/sh on Windows: the same -of contract as a batch file (libuv runs .cmd through cmd.exe)
    `@echo off\r\nsetlocal\r\nset "OF="\r\n:loop\r\nif "%~1"=="" goto done\r\nif "%~1"=="-of" set "OF=%~2"\r\nshift\r\ngoto loop\r\n:done\r\necho {"transcription":[{"offsets":{"from":0,"to":500},"text":" one"},{"offsets":{"from":500,"to":1000},"text":" two"}]} > "%OF%.json"\r\n`);
  else fs.writeFileSync(path.join(bin, "whisper-cli"), `#!/bin/sh\nwhile [ $# -gt 0 ]; do case "$1" in -of) OF="$2";; esac; shift; done\necho '{"transcription":[{"offsets":{"from":0,"to":500},"text":" one"},{"offsets":{"from":500,"to":1000},"text":" two"}]}' > "$OF.json"\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(tmp, "model.bin"), "x");
  r = rw(["new", names[2], "--video", mp4], { PATH: bin + path.delimiter + process.env.PATH, WHISPER_MODEL: path.join(tmp, "model.bin") });
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /transcript\.json: 2 words/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(ROOT, "projects", names[2], "transcript.json"), "utf8")), [{ text: "one", start: 0, end: 0.5 }, { text: "two", start: 0.5, end: 1 }]);
  // errors
  assert.notEqual(rw(["new", names[2], "--video", mp4]).status, 0, "an existing project is not overwritten");
  assert.match(rw(["new", "x-" + process.pid, "--video", path.join(tmp, "nope.mp4")]).stderr, /no such file/);
  console.log("p12a-new-media self-check: webm -> H.264 mp4, size/fps from the file, a real film plays it with its sound, H.264 copied untouched, transcript only via whisper-cli + $WHISPER_MODEL (skipped and said so without)");
} finally {
  for (const n of names) fs.rmSync(path.join(ROOT, "projects", n), { recursive: true, force: true });
  fs.rmSync(tmp, { recursive: true, force: true });
}
