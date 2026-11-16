// node tools/selfcheck/remotion-helpers.mjs — the Remotion-parity helpers (docs/playbook/timing.md "Style, crop, caption and composition helpers").
// Browser side (posterize, string outputs, series, interpolateStyles, makeTransform, crop, roundedTextBox: exact numbers, pixels, shuffled seeks in pvk and
// HyperFrames) is the fixture tools/selfcheck/remotion-kit/helpers.mjs, run here through the p9 harness. Node side, no browser: Caption JSON in tools/captions.mjs
// and `reelwright captions --format remotion | --from`, project.json "compositions" and `--composition <id>` (tools/compositions.mjs).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const imp = (f) => import(pathToFileURL(path.join(ROOT, f)).href);
const run = (args, o = {}) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", ...o });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rwhelp-"));

try {
  // ── Caption JSON ──
  const { toCaptions, fromCaptions } = await imp("tools/captions.mjs");
  const words = [{ text: "Hello", start: 0.1, end: 0.45 }, { text: "world.", start: 0.5, end: 0.9 }, { text: "Again", start: 1.2, end: 1.6 }];
  assert.deepEqual(toCaptions(words), [
    { text: "Hello", startMs: 100, endMs: 450, timestampMs: 275, confidence: null, pageBreakAfter: false },
    { text: " world.", startMs: 500, endMs: 900, timestampMs: 700, confidence: null, pageBreakAfter: true },
    { text: " Again", startMs: 1200, endMs: 1600, timestampMs: 1400, confidence: null, pageBreakAfter: false }]);
  assert.deepEqual(fromCaptions(toCaptions(words)), words, "toCaptions → fromCaptions is the identity");
  assert.deepEqual(fromCaptions([{ text: " hi ", startMs: 1, endMs: 2 }, { text: "  ", startMs: 3, endMs: 4 }]), [{ text: "hi", start: 0.001, end: 0.002 }]);
  assert.throws(() => fromCaptions({}), /array/); assert.throws(() => fromCaptions([{ text: "x" }]), /startMs/);

  // ── reelwright captions --format remotion / --from ──
  const proj = path.join(tmp, "film"); fs.mkdirSync(proj);
  fs.writeFileSync(path.join(proj, "timeline.json"), JSON.stringify({ DUR: 3, VO: { a: { start: 0, words: words.map((w) => ({ w: w.text, t: w.start, d: +(w.end - w.start).toFixed(3) })) } } }));
  let r = run(["bin/reelwright.mjs", "captions", proj, "--format", "remotion"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(proj, "captions.json"), "utf8")), toCaptions(words));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(proj, "transcript.json"), "utf8")), words);
  const other = path.join(tmp, "other"); fs.mkdirSync(other);
  r = run(["bin/reelwright.mjs", "captions", other, "--from", path.join(proj, "captions.json")]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(other, "transcript.json"), "utf8")), words, "--from imports Remotion captions without timeline.json");
  assert.equal(run(["bin/reelwright.mjs", "captions", proj, "--format", "srt"]).status, 1, "an unknown --format is refused");

  // ── compositions ──
  const { resolveComposition, applyComposition } = await imp("tools/compositions.mjs");
  const P = { title: "t", fps: 30, width: 1920, height: 1080, out: "out/film.mp4", lines: [{ id: "a", text: "x" }],
    compositions: [{ id: "square", width: 1080, height: 1080 }, { id: "short", lines: [{ id: "b", text: "y" }], out: "out/short.mp4" }] };
  assert.deepEqual(resolveComposition(P, "square"), { title: "t", fps: 30, width: 1080, height: 1080, out: "out/film-square.mp4", lines: [{ id: "a", text: "x" }], composition: "square" });
  assert.deepEqual(resolveComposition(P, "short"), { title: "t", fps: 30, width: 1920, height: 1080, out: "out/short.mp4", lines: [{ id: "b", text: "y" }], composition: "short" });
  assert.throws(() => resolveComposition(P, "nope"), /no composition "nope".*square, short/);
  assert.throws(() => resolveComposition({ title: "t" }, "x"), /no "compositions"/);
  assert.throws(() => resolveComposition({ compositions: [{ id: "a b" }] }, "x"), /needs an id/);

  // through the CLI: sched writes film/data.js from the merged project.json, which is put back afterwards
  const cp = path.join(tmp, "comp"); fs.mkdirSync(path.join(cp, "film"), { recursive: true });
  const original = JSON.stringify({ ...P, lines: [] }, null, 1) + "\n";
  fs.writeFileSync(path.join(cp, "project.json"), original);
  r = run(["bin/reelwright.mjs", "sched", cp, "--composition", "square"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const data = fs.readFileSync(path.join(cp, "film", "data.js"), "utf8");
  assert.match(data, /"width": 1080, "height": 1080, "composition": "square"/, "the film sees the composition's size and id");
  assert.equal(fs.readFileSync(path.join(cp, "project.json"), "utf8"), original, "project.json is put back byte for byte");
  assert.ok(!fs.existsSync(path.join(cp, "project.json.composition-bak")), "no backup left behind");
  r = run(["bin/reelwright.mjs", "sched", cp, "--composition", "nope"]);
  assert.equal(r.status, 1); assert.match(r.stderr, /no composition "nope"/);
  assert.equal(fs.readFileSync(path.join(cp, "project.json"), "utf8"), original, "a refused id leaves project.json alone");
  fs.writeFileSync(path.join(cp, "project.json.composition-bak"), original); fs.writeFileSync(path.join(cp, "project.json"), "{ merged by a killed run }");   // repair after a kill
  r = run(["bin/reelwright.mjs", "sched", cp, "--composition", "square"]);
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.equal(fs.readFileSync(path.join(cp, "project.json"), "utf8"), original, "a killed run's leftovers are repaired");
  r = run(["bin/reelwright.mjs", "sched", cp]);   // without the flag: the project's own size
  assert.match(fs.readFileSync(path.join(cp, "film", "data.js"), "utf8"), /"width": 1920, "height": 1080, "speechEnd"/);
  assert.equal(typeof applyComposition, "function");

  // ── browser side ──
  r = run(["tools/selfcheck/remotion-kit.mjs", "helpers"], { stdio: ["ignore", "pipe", "pipe"] });
  assert.equal(r.status, 0, "remotion-kit helpers fixture failed:\n" + r.stdout + r.stderr);
  assert.match(r.stdout, /PASS +helpers +pvk/); assert.match(r.stdout, /PASS +helpers +hyperframes/);
  console.log("remotion-helpers self-check: caption JSON, compositions and the browser helpers (pvk + hyperframes) pass");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
