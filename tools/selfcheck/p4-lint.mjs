// Phase 11 P4, rows manim:m11.2 and manim:m11.3: the Manim scene lints (tools/checks/manim-lint.mjs, the two QA plug-ins, the manim-lint command)
// and the Python texts.json exporter (python/reelwright_manim/texts.py) without Manim. Rules, thresholds, silence on non-Manim films,
// dark stretches on a real (ffmpeg-made) video, Python -> texts.json -> Node lint round trip.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lintTexts, lintPace, darkStretches, darkFindings, lumaOfVideo, sceneTexts, formatFindings } from "../checks/manim-lint.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const rule = (f, r) => f.filter((x) => x.rule === r);
const box = (text, x, y, w, h, size = 60) => ({ text, kind: "Text", x, y, w, h, size_px: size });
const doc = (...texts) => ({ version: 1, width: 1920, height: 1080, snapshots: [{ t: 3.5, label: "s", texts }] });

// ── m11.2 layout lint ──
assert.deepEqual(lintTexts(doc(box("ok", 100, 100, 400, 80), box("fine", 100, 300, 400, 80))), [], "a clean frame has no findings");
let f = lintTexts(doc(box("right", 1800, 100, 400, 80)));
assert.equal(f.length, 1); assert.equal(f[0].rule, "OFF-FRAME"); assert.match(f[0].msg, /by 280 px \(right\)/); assert.equal(f[0].severity, "FAIL");
assert.match(lintTexts(doc(box("l", -50, 100, 100, 80)))[0].msg, /\(left\)/); assert.match(lintTexts(doc(box("b", 10, 1050, 100, 80)))[0].msg, /\(bottom\)/);
assert.deepEqual(lintTexts(doc(box("edge", 1520, 10, 400.5, 80))), [], "within 1 px of the edge is not off-frame");
f = lintTexts(doc(box("A", 100, 100, 400, 80), box("B", 200, 110, 400, 80)));
assert.equal(rule(f, "TEXT-OVERLAP").length, 1); assert.match(f[0].msg, /overlap by 66 %/);
assert.deepEqual(lintTexts(doc(box("A", 100, 100, 400, 80), box("B", 500, 100, 400, 80))), [], "touching boxes do not overlap");
assert.equal(lintTexts(doc(box("A", 100, 100, 400, 80), box("B", 440, 100, 400, 80))).length, 0, "a 10 % overlap is under the 15 % line");
assert.equal(lintTexts(doc(box("A", 100, 100, 400, 80), box("B", 100, 100, 100, 80))).length, 1, "a small text inside a big one overlaps 100 % of the smaller");
f = lintTexts(doc(box("tiny", 100, 100, 100, 20, 20)));
assert.equal(f[0].rule, "TINY-TEXT"); assert.match(f[0].msg, /about 20 px, under 28 px/);
assert.equal(lintTexts({ ...doc(box("t", 100, 100, 50, 10, 10)), width: 960, height: 540 }).length, 1, "the minimum scales with the frame: 14 px at 540");
assert.equal(lintTexts({ ...doc(box("t", 100, 100, 50, 10, 15)), width: 960, height: 540 }).length, 0);
const twice = lintTexts({ ...doc(box("same", 0, 0, 1, 1, 10)), snapshots: [{ t: 1, texts: [box("same", 0, 0, 1, 1, 10)] }, { t: 2, texts: [box("same", 0, 0, 1, 1, 10)] }] });
assert.equal(rule(twice, "TINY-TEXT").length, 1, "one tiny text is reported once, not once per snapshot");
assert.throws(() => lintTexts({}), /expected \{ width, height, snapshots/);

// ── m11.3 pace lint ──
const words = (n) => Array.from({ length: n }, (_, i) => ({ w: "w" + i }));
const vo = { a: { start: 1, end: 4, words: words(6) }, b: { start: 5, end: 8, words: words(12) }, c: { start: 14, end: 18, words: words(8) } };   // a: 2 w/s, b: 4 w/s, c: 2 w/s
const P1 = lintPace(vo, { dur: 25 });
assert.equal(rule(P1.findings, "RUSHED").length, 1); assert.match(rule(P1.findings, "RUSHED")[0].msg, /"b": 4\.0 words\/s over 2\.5/);
assert.equal(rule(P1.findings, "GAP").length, 1); assert.match(rule(P1.findings, "GAP")[0].msg, /6\.0 s without voice-over before "c"/);
assert.ok(Math.abs(P1.unnarrated - (1 - 10 / 25)) < 1e-9); assert.equal(rule(P1.findings, "UNNARRATED").map((x) => x.severity).join(), "INFO", "60 % unnarrated: info line only");
assert.match(rule(P1.findings, "UNNARRATED")[0].msg, /^unnarrated 60 % of 25\.0 s$/);
const P2 = lintPace({ a: { start: 0, end: 10, words: words(20) } }, { dur: 11 });   // 91 % narrated -> 9 % unnarrated: warn
assert.deepEqual(rule(P2.findings, "UNNARRATED").map((x) => x.severity), ["INFO", "WARN"]); assert.match(rule(P2.findings, "UNNARRATED")[1].msg, /only 9 %/);
assert.equal(rule(lintPace({ a: { start: 0, end: 10, words: words(25) } }, { dur: 20 }).findings, "RUSHED").length, 0, "exactly 2.5 words/s is fine");
assert.deepEqual(lintPace({ a: { start: 0, end: 1, words: words(2) } }, { dur: 20 }).findings.map((x) => x.rule), ["UNNARRATED"], "a two-word line is never RUSHED");
const overlap = lintPace({ a: { start: 0, end: 10, words: words(5) }, b: { start: 5, end: 12, words: words(5) } }, { dur: 24 });
assert.ok(Math.abs(overlap.unnarrated - 0.5) < 1e-9, "overlapping lines are counted once");
assert.equal(lintPace({}, { dur: 10 }).unnarrated, 1);

// ── dark stretches ──
const luma = [...Array(30).fill(0.5), ...Array(90).fill(0.01), ...Array(30).fill(0.6), ...Array(20).fill(0.0), ...Array(30).fill(0.5)];   // 60 fps: 1.5 s dark, then 0.33 s dark
assert.deepEqual(darkStretches(luma, 60), [{ from: 0.5, to: 2 }]); assert.deepEqual(darkStretches(luma.slice(0, 118), 60), [], "89 frames is under 1.5 s");
assert.deepEqual(darkStretches(Array(200).fill(0), 60, { darkSec: 3 }), [{ from: 0, to: 3.333 }], "a run to the end is closed");
assert.match(formatFindings(darkFindings(luma, 60))[0], /WARN\s+DARK-STRETCH\s+0\.50s to 2\.00s \(1\.5 s\) is nearly black/);
const ff = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
let videoNote = "ffmpeg missing: video luma not run";
if (!ff.error && ff.status === 0) {
  const tmp0 = fs.mkdtempSync(path.join(os.tmpdir(), "p4dark-")), mp4 = path.join(tmp0, "d.mp4");
  const mk = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=64x36:r=30:d=2", "-f", "lavfi", "-i", "testsrc2=s=64x36:r=30:d=2", "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0", "-pix_fmt", "yuv420p", mp4]);
  assert.equal(mk.status, 0, "ffmpeg made the test video");
  const v = lumaOfVideo(mp4);
  assert.equal(v.fps, 30); assert.equal(v.luma.length, 120); assert.ok(v.luma.slice(0, 60).every((x) => x < 0.04) && v.luma.slice(70).every((x) => x > 0.1));
  assert.deepEqual(darkStretches(v.luma, v.fps), [{ from: 0, to: 2 }]);
  fs.rmSync(tmp0, { recursive: true, force: true }); videoNote = "dark stretch found on a real 4 s video";
}

// ── Python exporter -> texts.json -> Node lint ──
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p4lint-"));
const proj = path.join(tmp, "film"), sdir = path.join(proj, ".cache", "manim", "s1-0123456789ab");
fs.mkdirSync(path.join(proj, "film"), { recursive: true }); fs.mkdirSync(sdir, { recursive: true });
const py = spawnSync("python3", ["-c", [
  "import sys, os; sys.path.insert(0, 'python')",
  "from reelwright_manim import texts",
  "from reelwright_manim.tests.test_texts import Text, Scene, RW",
  `rw = RW(${JSON.stringify(path.join(sdir, ".rw-state.json"))})`,
  "s = Scene(Text('good', 0, 0, 4, 1), Text('wide title that leaves', 7, 3, 4, 1), Text('tiny', 0, -3, 1, 0.1, font_size=10), Text('over', 0.5, 0.2, 4, 1))",
  "texts.snapshot(s, rw, 'end'); print(texts.write(rw))"].join("\n")], { cwd: ROOT, encoding: "utf8" });
if (py.error) videoNote += "; python3 missing: exporter not run";
else {
  assert.equal(py.status, 0, py.stderr);
  const written = JSON.parse(fs.readFileSync(path.join(sdir, "texts.json"), "utf8")), got = lintTexts(written).map((x) => x.rule).sort();
  assert.deepEqual(got, ["OFF-FRAME", "TEXT-OVERLAP", "TINY-TEXT"], `Python wrote ${JSON.stringify(written.snapshots[0].texts.map((t) => [t.x, t.y, t.w, t.h, t.size_px]))}`);
  const ut = spawnSync("python3", ["-m", "unittest", "reelwright_manim.tests.test_texts"], { cwd: path.join(ROOT, "python"), encoding: "utf8" });
  assert.equal(ut.status, 0, "python unittest test_texts: " + ut.stderr);
}

// ── QA plug-ins and the command: silent for a film without a manim block, active with one ──
globalThis.window = { VO: vo, PROJECT: { speechEnd: 24, tail: 1 } };
const fakePage = { evaluate: async (fn) => fn() }, plug = async (n) => (await import(pathToFileURL(path.join(ROOT, "tools/checks", n + ".page.mjs")).href));
const texts = await plug("manim-texts"), pace = await plug("manim-pace");
assert.equal(texts.kind, "gate"); assert.equal(pace.kind, "warn");
assert.deepEqual(await texts.default(fakePage, { DIR: proj, P: {} }), []); assert.deepEqual(await pace.default(fakePage, { DIR: proj, P: {} }), [], "a film without manim: QA output unchanged");
assert.deepEqual(await pace.default(fakePage, { DIR: proj, P: { qa: { pace: true } } }).then((l) => l.length > 0), true, '"qa": { "pace": true } opts a plain film in');
const Pm = { manim: { scenes: [{ id: "s1" }] } };
assert.equal(sceneTexts(proj, Pm).length, 1); assert.equal(sceneTexts(proj, { manim: { scenes: [{ id: "zz" }] } }).length, 0);
const tl = await texts.default(fakePage, { DIR: proj, P: Pm }); assert.equal(tl.length, 3); assert.match(tl.join("\n"), /s1: OFF-FRAME .*leaves the frame/);
const pl = await pace.default(fakePage, { DIR: proj, P: Pm }); assert.ok(pl.some((l) => /^RUSHED /.test(l)) && pl.some((l) => /^GAP /.test(l)) && pl.some((l) => /^UNNARRATED unnarrated \d+ %/.test(l)));
delete globalThis.window;

fs.writeFileSync(path.join(proj, "film", "data.js"), `window.PROJECT=${JSON.stringify({ fps: 30, width: 1920, height: 1080, speechEnd: 24, tail: 1 })};window.VO=${JSON.stringify(vo)};window.MUSIC={};\n`);
const cmd = (await import(pathToFileURL(path.join(ROOT, "tools/commands/manim-lint.mjs")).href)).default, said = [], log = console.log, exit = process.exit;
console.log = (...a) => said.push(a.join(" ")); let code = 0; process.exit = (c) => { code = c; throw new Error("exit " + c); };
try { await cmd({ proj, args: ["all"], project: () => Pm }); } catch (e) { if (!/^exit/.test(e.message)) throw e; } finally { console.log = log; process.exit = exit; }
assert.equal(code, 1, "texts FAILs make the command exit 1"); assert.match(said.join("\n"), /FAIL\s+OFF-FRAME/); assert.match(said.join("\n"), /WARN\s+RUSHED/); assert.match(said.join("\n"), /INFO\s+UNNARRATED\s+unnarrated 60 %/);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`p4-lint: OFF-FRAME / TEXT-OVERLAP / TINY-TEXT, RUSHED / GAP / UNNARRATED + info line, dark stretches (${videoNote}), Python exporter -> Node lint, QA plug-ins silent without manim OK`);
