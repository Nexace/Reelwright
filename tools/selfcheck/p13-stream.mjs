// node tools/selfcheck/p13-stream.mjs — hyperframes:I10 (streaming encode): `frames --stream` on a tiny hyperframes film renders through the producer's
// streaming encoder, so frames go to ffmpeg as they are captured and NO image file is ever written (a poller watches the project and the temp
// folder the whole render); `encode` then muxes mix.wav into frames/stream.mp4 (video copied) and writes the .srt/.vtt. A control render without
// the flag does write PNGs (the poller can see them), the streamed picture matches the default one, and the combinations that need frame files
// (a range, --cache, alpha) are refused. Offline.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { tinyFilm, ROOT } from "../p13_fixture.mjs";

const f = tinyFilm(), tmpdir = path.join(f.dir, "..", path.basename(f.dir) + "-tmp");
const IMG = /\.(png|jpe?g)$/i;
const rw = (...a) => new Promise((ok) => {   // async, so the poller runs while it renders; TMPDIR is private so the producer's work folder is ours to watch
  const c = spawn(process.execPath, [path.join(ROOT, "bin/reelwright.mjs"), ...a.map((x) => (x === "@" ? f.dir : x))], { cwd: ROOT, env: { ...process.env, TMPDIR: tmpdir, TEMP: tmpdir, TMP: tmpdir, PAGES: "2" } });   // TEMP/TMP: what os.tmpdir() reads on Windows
  let out = ""; c.stdout.on("data", (d) => (out += d)); c.stderr.on("data", (d) => (out += d)); c.on("close", (code) => ok({ code, out }));
});
const images = new Set(), walk = (d) => { try { for (const e of fs.readdirSync(d, { recursive: true, withFileTypes: true })) if (e.isFile() && IMG.test(e.name) && !/[\\/](assets|hf[\\/]blocks|hf[\\/]kit)[\\/]/.test(e.parentPath + "/")) images.add(path.join(e.parentPath, e.name)); } catch { /* a folder came or went */ } };
let work = false;   // the producer's own work folder (hf-render-* in TMPDIR, work-* beside the output) was there and watched
const sawWork = () => { for (const d of [tmpdir, path.join(f.dir, "frames")]) { try { if (fs.readdirSync(d).some((n) => /^(hf-render-|work-)/.test(n))) work = true; } catch { /* not there yet */ } } };
const watch = async (fn) => { images.clear(); work = false; const t = setInterval(() => { walk(f.dir); walk(tmpdir); sawWork(); }, 30); try { return await fn(); } finally { clearInterval(t); walk(f.dir); walk(tmpdir); } };
const frameCount = (mp4) => +spawnSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", mp4], { encoding: "utf8" }).stdout;
const mean = (mp4, n) => { const r = spawnSync("ffmpeg", ["-v", "error", "-i", mp4, "-vf", `select=eq(n\\,${n}),scale=48:27`, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"]); return [...r.stdout]; };
try {
  fs.mkdirSync(tmpdir);
  for (const c of ["sched", "info"]) { const r = f.run(c, "@"); assert.equal(r.status, 0, r.stdout + r.stderr); }
  const DUR = JSON.parse(fs.readFileSync(path.join(f.dir, "timeline.json"), "utf8")).DUR, N = Math.ceil(DUR * 10);
  assert.equal(spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `sine=frequency=440:duration=${DUR}`, "-ar", "48000", path.join(f.dir, "mix.wav")]).status, 0);

  // control: the default path writes PNGs, the poller sees them, and its mp4 is the reference picture
  let r = await watch(() => rw("frames", "@"));
  assert.equal(r.code, 0, r.out.slice(-500)); assert.ok(images.size >= N, `the default render writes ${N} frame files (the poller saw ${images.size})`);
  r = await rw("encode", "@"); assert.equal(r.code, 0, r.out.slice(-500));
  const ref = path.join(f.dir, "out/ref.mp4"); fs.copyFileSync(path.join(f.dir, "out/example-hf.mp4"), ref);
  fs.rmSync(path.join(f.dir, "frames"), { recursive: true, force: true }); fs.rmSync(path.join(f.dir, "out/example-hf.mp4"));

  // --stream: no image file at any moment, one mp4
  r = await watch(() => rw("frames", "@", "--stream"));
  assert.equal(r.code, 0, r.out.slice(-800)); assert.match(r.out, /streamed to frames[\\/]stream\.mp4/);   // the message names a path: Windows prints a backslash
  assert.deepEqual([...images], [], `no frame file was written: ${[...images].slice(0, 3)}`);
  assert.ok(work, "the poller did see the producer's work folder (so an image written there would have been seen)");
  assert.deepEqual(fs.readdirSync(path.join(f.dir, "frames")), ["stream.mp4"], "frames/ holds only the streamed video");
  assert.equal(frameCount(path.join(f.dir, "frames/stream.mp4")), N, "the stream has every frame");
  r = await rw("encode", "@", "--stream"); assert.equal(r.code, 0, r.out.slice(-500));
  const out = path.join(f.dir, "out/example-hf.mp4");
  const streams = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name", "-of", "csv=p=0", out], { encoding: "utf8" }).stdout;
  assert.match(streams, /h264,video/); assert.match(streams, /aac,audio/, "mix.wav is muxed in");
  assert.ok(Math.abs(frameCount(out) - N) <= 1, "-shortest against mix.wav may trim the last half frame");
  assert.ok(fs.existsSync(path.join(f.dir, "out/example-hf.srt")) || !(JSON.parse(fs.readFileSync(path.join(f.dir, "timeline.json"), "utf8")).captions || []).length, "subtitles are written when the film has captions");
  // the same picture as the default render (both are lossy encodes of the same frames)
  for (const n of [5, Math.floor(N / 2), N - 3]) {
    const a = mean(ref, n), b = mean(out, n), d = a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
    assert.ok(d < 8, `frame ${n}: streamed and default differ by ${d.toFixed(2)} of 255`);
  }

  // project.json "output": {"stream": true} does the same; the combinations that need frame files are refused
  fs.rmSync(path.join(f.dir, "frames"), { recursive: true, force: true });
  const pj = path.join(f.dir, "project.json"), P = JSON.parse(fs.readFileSync(pj, "utf8"));
  fs.writeFileSync(pj, JSON.stringify({ ...P, output: { stream: true } }));
  r = await watch(() => rw("frames", "@")); assert.equal(r.code, 0, r.out.slice(-500)); assert.deepEqual([...images], []); assert.ok(fs.existsSync(path.join(f.dir, "frames/stream.mp4")));
  r = await rw("frames", "@", "10", "20"); assert.equal(r.code, 1); assert.match(r.out, /need frame files/, "a range needs frame files");
  r = await rw("frames", "@", "--cache"); assert.equal(r.code, 1); assert.match(r.out, /need frame files/);
  fs.writeFileSync(pj, JSON.stringify({ ...P, output: { stream: true, alpha: true } }));
  r = await rw("frames", "@"); assert.equal(r.code, 1); assert.match(r.out, /drop output\.alpha/);
  console.log(`p13-stream: ok (${N} frames streamed to an mp4, no image file written; the default render's PNGs were seen by the same poller)`);
} finally { f.rm(); fs.rmSync(tmpdir, { recursive: true, force: true }); }
