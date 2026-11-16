// node tools/selfcheck/p12a-hf-render.mjs — rows hyperframes:I5 (4K), I10 (frame range, content-hash frame cache, resume) and I13 (timeouts, --strict /
// --best-effort, max render, render lock) on a REAL tiny HyperFrames film (the p1 fixture at 960x540, 10 fps, 13 frames), offline:
//   I5   --resolution 4k renders 3840x2160 frames and a 3840x2160 mp4 from the 960x540 layout; a wrong-aspect preset is refused with the reason
//   I10  `frames 4 9` writes exactly those frames, byte-identical to the same frames of a whole render; --cache re-renders only what an edit
//        changed and the frames/ folder then equals a fresh whole render of the edited film; --resume finishes a half-done render from the cache
//   I13  --timeout stops a render (exit 124), --player-ready-timeout and --max-render fail it with their reason, --strict reaches the producer,
//        --strict with --best-effort is refused, the render lock queues in order, times out, and drops a dead render's ticket
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { ROOT, tmpdir, makeProject, rw } from "./p1-fixture.mjs";
import { acquire, queue } from "../render_lock.mjs";

const tmp = tmpdir("hf-render"), dir = makeProject(path.join(tmp, "fx"), { width: 960, height: 540 });
const frames = path.join(dir, "frames"), png = (f) => path.join(frames, `frame_${String(f + 1).padStart(6, "0")}.png`);
const size = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const probe = (f) => spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", f], { encoding: "utf8" }).stdout.trim().replace(/x$/, "");
const hashes = () => Object.fromEntries(fs.readdirSync(frames).filter((f) => f.endsWith(".png")).sort().map((f) => [f, createHash("sha256").update(fs.readFileSync(path.join(frames, f))).digest("hex")]));
const ok = (r, what) => assert.equal(r.status, 0, `${what}:\n${r.out.split("\n").filter((l) => !/initSession|HyperFrames\]/.test(l)).slice(-12).join("\n")}`);
try {
  // ── baseline: a whole render, no new flag ──
  ok(rw("film", dir), "film");
  const N = fs.readdirSync(frames).filter((f) => f.endsWith(".png")).length;
  assert.equal(N, 13); assert.deepEqual(size(png(0)), [960, 540], "no flag: the layout size");
  const base = hashes(); fs.cpSync(frames, path.join(tmp, "base"), { recursive: true });
  assert.equal(probe(path.join(dir, "out", "fx.mp4")), "960x540");

  // ── I5: 4K from the same layout ──
  const bad = rw("frames", dir, "--resolution", "portrait-4k");
  assert.notEqual(bad.status, 0); assert.match(bad.out, /aspect must match/, "a wrong-aspect preset is refused with the reason");
  assert.match(rw("frames", dir, "--resolution", "8k").out, /not one of/);
  ok(rw("film", dir, "--resolution", "4k"), "film --resolution 4k");
  assert.deepEqual(size(png(0)), [3840, 2160], "--resolution 4k: 3840x2160 frames"); assert.deepEqual(size(png(12)), [3840, 2160]);
  assert.equal(probe(path.join(dir, "out", "fx.mp4")), "3840x2160", "the mp4 is 4K too");

  // ── I10: a range ──
  fs.rmSync(frames, { recursive: true });
  ok(rw("frames", dir, "4", "9"), "frames 4 9");
  assert.deepEqual(fs.readdirSync(frames).sort(), [5, 6, 7, 8, 9].map((n) => `frame_${String(n).padStart(6, "0")}.png`), "exactly frames 4..8");
  for (let f = 4; f < 9; f++) assert.ok(fs.readFileSync(png(f)).equals(fs.readFileSync(path.join(tmp, "base", path.basename(png(f))))), `frame ${f} of the range = frame ${f} of the whole render`);
  assert.deepEqual(size(png(4)), [960, 540]);
  assert.match(rw("frames", dir, "9", "4").out, /whole frame numbers/, "a bad range is refused");

  // ── I10: the frame cache ──
  fs.rmSync(frames, { recursive: true });
  let r = rw("frames", dir, "--cache", "--segment", "5"); ok(r, "cache cold");
  assert.match(r.out, /13 rendered in 3 segments, 0 from cache/); assert.deepEqual(hashes(), base, "a cached-path render = a plain render, frame for frame");
  r = rw("frames", dir, "--cache"); ok(r, "cache warm"); assert.match(r.out, /0 rendered in 0 segments, 13 from cache/);
  assert.deepEqual(hashes(), base);
  // edit the film so only the last frames change (t > 1.0 s): only those are re-rendered, the folder equals a fresh render of the edited film
  const filmJs = path.join(dir, "hf", "film.js"), src = fs.readFileSync(filmJs, "utf8");
  fs.writeFileSync(filmJs, src.replace("b.style.width = 28 *", "b.style.width = (t > 1.05 ? 5 : 0) + 28 *"));
  ok(rw("info", dir), "info");
  r = rw("frames", dir, "--cache"); ok(r, "cache after an edit");
  const m = /: (\d+) rendered in (\d+) segments?, (\d+) from cache/.exec(r.out); assert.ok(m, r.out.slice(-300));
  assert.ok(+m[1] > 0 && +m[1] <= 4 && +m[3] >= 9, `only the changed tail re-rendered: ${m[0]}`);
  const edited = hashes(); fs.rmSync(frames, { recursive: true });
  ok(rw("frames", dir), "fresh whole render of the edited film");
  assert.deepEqual(hashes(), edited, "cached + re-rendered frames = a whole render of the edited film");
  assert.notDeepEqual(edited, base, "the edit changed pixels");
  // resume: half the film is done (frames 0..6 cached), the rest is finished from where it stopped
  fs.rmSync(path.join(dir, ".cache", "frames-hf"), { recursive: true }); fs.rmSync(frames, { recursive: true });
  ok(rw("frames", dir, "0", "6", "--cache"), "first half");
  r = rw("frames", dir, "--resume", "--segment", "4"); ok(r, "resume");
  assert.match(r.out, /resume: [4-7] of 13 frames are already done/); assert.match(r.out, /rendered in [12] segments?/);
  assert.deepEqual(hashes(), edited, "the resumed render is the whole film");
  // KIT.video films can't take a range or the cache (the producer extracts a video's frames by its own clock): refused, not wrong
  const vid = path.join(tmp, "vid"); makeProject(vid, { width: 320, height: 180 });
  fs.writeFileSync(path.join(vid, "hf", "film.js"), fs.readFileSync(path.join(vid, "hf", "film.js"), "utf8").replace("'use strict';", "'use strict'; KIT.video('v.mp4', { id: 'v', start: 0, dur: 1 });"));
  fs.writeFileSync(path.join(vid, "hf", "index.html"), fs.readFileSync(path.join(vid, "hf", "index.html"), "utf8").replace('<script src="kit/engine.js"></script>', '<script src="kit/engine.js"></script>\n<script src="kit/media.js"></script>'));
  spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=160x90:rate=10:duration=1", "-pix_fmt", "yuv420p", path.join(vid, "hf", "v.mp4")]);
  ok(rw("sched", vid), "sched"); ok(rw("info", vid), "info video fixture");
  r = rw("frames", vid, "2", "6"); assert.notEqual(r.status, 0); assert.match(r.out, /don't work with KIT\.video/);

  // ── I13 ──
  r = rw("frames", dir, "--resolution", "4k", "--timeout", "1"); assert.equal(r.status, 124, "--timeout: exit 124\n" + r.out.slice(-300)); assert.match(r.out, /stopped after --timeout 1 s/);
  assert.match(rw("frames", dir, "--timeout", "soon").out, /--timeout takes a positive number of seconds/);
  r = rw("frames", dir, "--player-ready-timeout", "5"); assert.notEqual(r.status, 0, "a 5 ms player-ready timeout fails the render");
  // the producer's own ETA guard samples for 60 s before it can abort, so a tiny film shows only that the limit reached it (maxRenderMs in the request)
  r = rw("frames", dir, "--max-render", "90"); ok(r, "--max-render"); assert.match(r.out, /producer max render: 90 s/);
  assert.match(rw("frames", dir, "--max-render", "-3").out, /--max-render takes a positive number/);
  r = rw("frames", dir, "--strict"); ok(r, "--strict on a clean film"); assert.match(r.out, /producer strictness: strict/);
  r = rw("frames", dir, "--best-effort"); ok(r, "--best-effort"); assert.match(r.out, /producer strictness: best-effort/);
  r = rw("frames", dir, "--strict", "--best-effort"); assert.notEqual(r.status, 0); assert.match(r.out, /pick one/);

  // pvk (the page loads the kit from ../../../tools, so this fixture sits in projects/): --best-effort carries on past a page error that stops a plain
  // render; --player-ready-timeout bounds the wait
  const pv = path.join(ROOT, "projects", `p12a-tmp-${process.pid}`);
  try {
    makeProject(pv, { renderer: "pvk", width: 320, height: 180 });
    ok(rw("sched", pv), "pvk sched"); ok(rw("info", pv), "pvk info");   // the error is added after info, which has no flag for it
    fs.writeFileSync(path.join(pv, "film", "film.js"), fs.readFileSync(path.join(pv, "film", "film.js"), "utf8") + "\nsetTimeout(() => { throw new Error('late page error'); }, 0);\n");
    r = rw("frames", pv, "--no-cache"); assert.notEqual(r.status, 0); assert.match(r.out, /late page error/); assert.match(r.out, /failed to load/);
    r = rw("frames", pv, "--no-cache", "--best-effort"); ok(r, "pvk --best-effort"); assert.match(r.out, /best-effort: carrying on past \d+ page error/);
    assert.equal(fs.readdirSync(path.join(pv, "frames")).filter((f) => f.endsWith(".jpg")).length, 13, "all frames rendered");
    r = rw("frames", pv, "--no-cache", "--best-effort", "--player-ready-timeout", "1"); assert.notEqual(r.status, 0, "a 1 ms player-ready timeout fails a pvk render");
  } finally { fs.rmSync(pv, { recursive: true, force: true }); }
  const lock = path.join(tmp, "lock"); process.env.REELWRIGHT_LOCK_DIR = lock;
  const holder = spawn(process.execPath, ["-e", `const {acquire}=await import(${JSON.stringify(pathToFileURL(path.join(ROOT, "tools", "render_lock.mjs")).href)});acquire({dir:${JSON.stringify(lock)}});console.log("held");setTimeout(()=>process.exit(0),2500)`, "--input-type=module"], { stdio: ["ignore", "pipe", "inherit"] });
  await new Promise((go) => holder.stdout.once("data", go));
  assert.equal(queue(lock).length, 1);
  assert.throws(() => acquire({ dir: lock, timeoutMs: 400 }), /gave up waiting for the render lock/, "a second render waits, then gives up");
  assert.equal(queue(lock).length, 1, "the gave-up ticket is gone");
  const waited = Date.now(); const release = acquire({ dir: lock, timeoutMs: 8000 });   // returns when the holder exits
  assert.ok(Date.now() - waited > 500, "it waited for the holder"); release(); assert.equal(queue(lock).length, 0);
  fs.mkdirSync(lock, { recursive: true }); fs.writeFileSync(path.join(lock, `${String(Date.now() - 1000).padStart(15, "0")}-2147480`), "");   // a render that died
  const release2 = acquire({ dir: lock, timeoutMs: 1000 }); assert.deepEqual(queue(lock).map((q) => q.pid), [process.pid], "a dead render's ticket is dropped"); release2();
  // through the CLI: --lock waits behind a live ticket and --lock-timeout gives up with its reason
  const holder2 = spawn(process.execPath, ["-e", `setTimeout(()=>{},4000)`]);
  fs.writeFileSync(path.join(lock, `${String(Date.now() - 500).padStart(15, "0")}-${holder2.pid}`), "");
  r = rw("frames", dir, "--lock", "--lock-timeout", "1"); assert.equal(r.status, 1); assert.match(r.out, /gave up waiting for the render lock/);
  holder2.kill(); await new Promise((go) => holder2.once("exit", go));
  r = rw("frames", dir, "--lock"); ok(r, "--lock with nobody ahead"); assert.deepEqual(queue(lock), [], "the ticket is released when the render ends");
  console.log(`p12a-hf-render self-check: 4K (3840x2160 frames and mp4), range = whole-render frames, cache re-rendered ${m[1]} of 13 and equals a fresh render, resume, KIT.video refused, timeout 124, player-ready, max-render, strict, lock queue`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
