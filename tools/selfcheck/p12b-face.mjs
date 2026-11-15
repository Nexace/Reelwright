// node tools/selfcheck/p12b-face.mjs — G9 `measure face` (tools/measure_face.mjs): frames are cut with ffmpeg from a generated 8 s video, boxes
// come from a STUB detector (tools/selfcheck/p12b/face_stub.py, through REELWRIGHT_FACE_CMD), and the summary is asserted: presence, segments
// (a one-frame gap bridged, a two-frame gap not), biggest face, centre, head room, the face on the safe margin. Without a detector
// the real path must fail with the install line. This does NOT prove the Haar detector finds faces: no face image and no OpenCV are in the repo.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { measureFace, summarize , facePython } from "../measure_face.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p12b-face-"));
try {
  const video = path.join(tmp, "v.mp4");
  execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=10:duration=8", "-pix_fmt", "yuv420p", video]);
  const stub = path.join(ROOT, "tools/selfcheck/p12b/face_stub.py");
  fs.chmodSync(stub, 0o755);
  process.env.REELWRIGHT_FACE_CMD = stub;
  if (process.platform === "win32") {   // Windows cannot exec a .py: a .cmd on the same contract (image paths in, JSON out)
    process.env.REELWRIGHT_FACE_CMD = path.join(tmp, "face_stub.cmd");
    fs.writeFileSync(process.env.REELWRIGHT_FACE_CMD, `@echo off\r\n"${process.env.PYTHON || "python"}" "${stub}" %*\r\n`);
  }
  const r = measureFace(video, { every: 1 });
  assert.deepEqual([r.size, r.samples.length, r.duration], [[1280, 720], 8, 8]);
  assert.deepEqual(r.samples.map((s) => s.faces.length), [1, 1, 1, 0, 0, 1, 1, 0]);
  const s = r.summary;
  assert.equal(s.present, 0.625);
  assert.deepEqual(s.segments, [[0, 3], [5, 7]], "two segments; the two missing frames split them");
  assert.deepEqual(s.biggest, { t: 2, heightShare: 0.361 });
  const cx = [640, 640, 670, 700, 95].map((v) => v / 1280).reduce((a, b) => a + b) / 5, cy = [280, 280, 300, 270, 390].map((v) => v / 720).reduce((a, b) => a + b) / 5;
  assert.ok(Math.abs(s.centre[0] - cx) < 0.002 && Math.abs(s.centre[1] - cy) < 0.002, JSON.stringify(s.centre));
  assert.ok(Math.abs(s.headroom - [160, 160, 170, 150, 300].map((v) => v / 720).reduce((a, b) => a + b) / 5) < 0.002);
  assert.deepEqual(s.outsideSafe, [6], "the face at x=20 of 1280 is inside the 5% margin");

  // pure summary: a one-sample gap is bridged, no faces at all
  const mk = (pattern) => pattern.map((f, i) => ({ t: i, faces: f ? [[100, 100, 50, 50]] : [] }));
  assert.deepEqual(summarize(mk([1, 0, 1, 1]), 1000, 1000).segments, [[0, 4]]);
  assert.deepEqual(summarize(mk([1, 0, 0, 1]), 1000, 1000).segments, [[0, 1], [3, 4]]);
  assert.deepEqual(summarize(mk([0, 0]), 1000, 1000), { present: 0, segments: [], biggest: null, centre: null, headroom: null, outsideSafe: [] });
  assert.equal(summarize([], 10, 10).present, 0);

  // refusals
  assert.throws(() => measureFace(video, { every: 0 }), /seconds > 0/);
  assert.throws(() => measureFace(path.join(tmp, "missing.mp4")), /ffprobe could not read/);
  fs.writeFileSync(path.join(tmp, "a.wav"), "");
  assert.throws(() => measureFace(path.join(tmp, "a.wav")), /ffprobe could not read|no video stream/);
  // no detector: the real path. With OpenCV absent it must name the install; with it present it must run and find nothing in a test pattern
  delete process.env.REELWRIGHT_FACE_CMD;
  const hasCv = spawnSync(facePython(), ["-c", "import cv2; cv2.CascadeClassifier"]).status === 0;
  if (hasCv) assert.equal(measureFace(video, { every: 4 }).summary.present, 0, "testsrc has no faces");
  else assert.throws(() => measureFace(video, { every: 4 }), /pip install opencv-python-headless/);
  console.log(`real detector path: OpenCV ${hasCv ? "present, ran" : "absent, refused with the install line"}`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log("p12b-face ok: measure face summary proven against a stub detector (Haar detection itself is unproven here)");
