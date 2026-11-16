// node tools/ci_film.mjs [project]   — Q1: a voiced film built end to end with no network (default project: example).
// Runs `reelwright all <project>` with REELWRIGHT_TTS=local (the OS voice, tools/tts_local.py: macOS say, Linux espeak-ng, Windows SAPI;
// project.json is not edited), which ends with `qa`, then asserts on the result:
//   - the mp4 exists; its duration is within 0.15 s of timeline.json DUR; it has one video and one audio stream
//   - the video has round(DUR x fps) frames (+-1) and that many frames/ files; the audio is not silent (ffmpeg astats peak above -50 dB),
//     and neither is any voiceover line
//   - every vo/lines.json entry is marked "timing": "estimated"; project.json is byte-for-byte what it was
//   - no qa gate printed FAIL (WARN lines are fine; a FAIL also makes `all` exit 1)
// The OS voice is probed first (tools/tts_local.py --probe speaks a test line): when the machine has no engine, or its engine writes no speech
// (seen on macOS CI runners: `say` exits 0 with 0.01 s of audio), the film is built with the deterministic stand-in voice
// (REELWRIGHT_TTS_ENGINE=synth) and the reason is printed, so the offline path still runs end to end; REELWRIGHT_REQUIRE_TTS=1 makes that a FAIL.
// It rebuilds the project in place: vo/, out/, frames/ are replaced.
// PAGES (render workers) defaults to 2, as in CI. Exit 1 on any failed assertion, the first problem listed.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const name = process.argv[2] || "example", dir = path.join(ROOT, "projects", name);
const lines = (s) => s.split(/\r?\n/);   // CRLF on Windows

const pv = spawnSync(PY, [path.join(ROOT, "tools", "tts_local.py"), "--probe"], { encoding: "utf8" });
let voice = String(pv.stdout || "").trim(), why = "";
if (pv.status !== 0) {
  why = (String(pv.stderr || "").trim().split(/\r?\n/).pop() || "no output") + (pv.error ? ` [${PY}: ${pv.error.message}]` : "");
  if (process.env.REELWRIGHT_REQUIRE_TTS === "1") { console.log(`FAIL ci_film: the OS voice is not usable here: ${why}`); process.exit(1); }
  voice = "synth";
  console.log(`ci_film: the OS voice is not usable here (${why}): building with the stand-in voice instead (REELWRIGHT_TTS_ENGINE=synth)`);
}
console.log(`ci_film: ${name} with the local voice "${voice}"`);

const pj = path.join(dir, "project.json"), sha = () => crypto.createHash("sha1").update(fs.readFileSync(pj)).digest("hex");
const before = sha(), P = JSON.parse(fs.readFileSync(pj, "utf8"));
const bad = [], ok = (cond, msg) => { if (!cond) bad.push(msg); };

const log = [];
const code = await new Promise((res) => {
  const p = spawn(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "all", name], { cwd: ROOT, env: { PAGES: "2", ...process.env, REELWRIGHT_TTS: "local", ...(why && { REELWRIGHT_TTS_ENGINE: "synth" }) } });
  for (const s of [p.stdout, p.stderr]) s.on("data", (d) => { log.push(d.toString()); process.stdout.write(d); });
  p.on("close", (c) => res(c ?? 1));
});
const out = log.join("");
ok(code === 0, `reelwright all ${name} exited ${code}`);
const fails = lines(out).filter((l) => /^\s+FAIL\b/.test(l));
ok(!fails.length, `qa FAIL: ${fails.map((l) => l.trim()).join(" | ")}`);
ok(sha() === before, "project.json changed during the build");

const probe = (file, args) => spawnSync("ffprobe", ["-v", "error", ...args, "-of", "json", file], { encoding: "utf8" });
const peak = (file) => {   // overall peak level in dB of the audio, -Infinity when silent or unreadable
  const r = spawnSync("ffmpeg", ["-nostdin", "-v", "info", "-i", file, "-vn", "-af", "astats", "-f", "null", "-"], { encoding: "utf8" });
  const all = lines(r.stderr), at = all.findIndex((l) => /\] Overall\s*$/.test(l));
  const m = all.slice(at < 0 ? 0 : at).map((l) => l.match(/Peak level dB:\s*(-?[\d.]+|-inf)/)).find(Boolean);
  return m ? Number(m[1] === "-inf" ? -Infinity : m[1]) : -Infinity;
};

const mp4 = path.join(dir, P.out || "out/film.mp4");
if (!fs.existsSync(mp4)) bad.push(`no mp4 at ${path.relative(ROOT, mp4)}`);
else {
  const T = JSON.parse(fs.readFileSync(path.join(dir, "timeline.json"), "utf8")), fps = T.FPS || P.fps || 60;
  const f = JSON.parse(probe(mp4, ["-count_frames", "-show_entries", "format=duration:stream=codec_type,nb_read_frames"]).stdout || "{}");
  const v = (f.streams || []).filter((s) => s.codec_type === "video"), a = (f.streams || []).filter((s) => s.codec_type === "audio");
  const dur = Number(f.format?.duration), want = Math.round(T.DUR * fps);
  ok(Math.abs(dur - T.DUR) <= 0.15, `duration ${dur} s vs timeline ${T.DUR} s`);
  ok(v.length === 1 && a.length === 1, `streams: ${v.length} video, ${a.length} audio`);
  ok(Math.abs(Number(v[0]?.nb_read_frames) - want) <= 1, `video frames ${v[0]?.nb_read_frames} vs ${want} (${T.DUR} s x ${fps})`);
  const nfiles = fs.readdirSync(path.join(dir, "frames")).filter((n) => /\.(jpg|png)$/.test(n)).length;
  ok(Math.abs(nfiles - want) <= 1, `frames/ has ${nfiles} files vs ${want}`);
  const pk = peak(mp4);
  ok(pk > -50, `the mp4's audio is silent (peak ${pk} dB)`);
  console.log(`ci_film: ${path.relative(ROOT, mp4)}  ${dur.toFixed(2)} s (timeline ${T.DUR} s), ${v[0]?.nb_read_frames}/${want} frames, ${nfiles} frame files, audio peak ${pk} dB`);
}
const L = fs.existsSync(path.join(dir, "vo", "lines.json")) ? JSON.parse(fs.readFileSync(path.join(dir, "vo", "lines.json"), "utf8")) : {};
ok(Object.keys(L).length === P.lines.length, `vo/lines.json has ${Object.keys(L).length} of ${P.lines.length} lines`);
for (const [id, l] of Object.entries(L)) {
  ok(l.timing === "estimated", `vo line ${id} is not marked "timing": "estimated"`);
  const q = peak(path.join(dir, "vo", id + ".mp3"));
  ok(q > -50, `vo line ${id} is silent (peak ${q} dB)`);
}

if (bad.length) { console.error(`\nci_film: FAIL\n  ${bad.join("\n  ")}`); process.exit(1); }
console.log(`ci_film: PASS (voice: ${voice}${why ? `, because the OS voice is not usable: ${why}` : ""})`);
