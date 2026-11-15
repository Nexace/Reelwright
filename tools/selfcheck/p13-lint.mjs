// node tools/selfcheck/p13-lint.mjs — hyperframes:G4: the native lint (tools/checks/native-lint.mjs, tools/commands/lint.mjs),
// offline, on a tiny example-hf copy (fake VO) with a real browser. A clean film reports nothing; a film broken on purpose trips each
// native rule (coordinate drift, heavy overlays, duplicate audio, imperative media control, unused audio, big file, HEVC, HDR);
// the qa plug-in is opt-in; `lint --components` passes the vendored catalog with no error.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { tinyFilm, ROOT } from "../p13_fixture.mjs";
import { launch } from "../browser.mjs";
import { copyKit } from "../kit_files.mjs";
import { writeTheme } from "../theme.mjs";
import { staticChecks, pageChecks, hdrCheck } from "../checks/native-lint.mjs";
import plug from "../checks/native-lint.page.mjs";
import { SKIP } from "../checks/hf-lint.mjs";

const codes = (l) => l.map((x) => x.split(":")[0]);
const f = tinyFilm(), lint = (...a) => f.run("lint", "@", ...a), film = path.join(f.dir, "hf/film.js"), good = fs.readFileSync(film, "utf8");
let browser;
try {
  assert.equal(f.run("sched", "@").status, 0);
  const r0 = lint();
  assert.equal(r0.status, 0, r0.stdout + r0.stderr);
  assert.match(r0.stdout, /0 error\(s\), 0 warning\(s\)/, "a clean film reports nothing (no false drift)");

  // the film broken on purpose
  fs.mkdirSync(path.join(f.dir, "assets"));
  fs.writeFileSync(path.join(f.dir, "assets/unused.wav"), "");
  const hdr = path.join(f.dir, "assets/hdr.mp4"), sdr = path.join(f.dir, "assets/hevc.mp4");
  const mk = (out, ...x) => spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=64x64:d=1:r=10", "-c:v", "libx265", "-tag:v", "hvc1", "-pix_fmt", "yuv420p10le", "-x265-params", "log-level=error" + (x[0] || ""), out], { encoding: "utf8" });
  assert.equal(mk(hdr, ":colorprim=bt2020:transfer=smpte2084:colormatrix=bt2020nc").status, 0, "ffmpeg with libx265 builds the HDR fixture");
  assert.equal(mk(sdr).status, 0);
  fs.writeFileSync(film, good.replace("KIT.start({ dur: DUR, render });", `
let __n = 0; const __d = KIT.el("div", "p13-drift", KIT.stage); __d.style.cssText = "position:absolute;width:10px;height:10px;left:5px;top:5px";
for (let i = 0; i < 26; i++) KIT.el("div", "p13-heavy", KIT.stage).style.cssText = "position:absolute;width:4px;height:4px;filter:blur(2px)";
KIT.audio("assets/a.wav", { start: 0 }); KIT.audio("assets/a.wav", { start: 1 });
KIT.video("../assets/hdr.mp4", { id: "h", start: 0, dur: 1 }); KIT.video("../assets/hevc.mp4", { id: "e", start: 0, dur: 1 });
const myVideo = document.createElement("video"); myVideo.play();
${"\n".repeat(300)}
KIT.start({ dur: DUR, render: (t) => { render(t); __d.style.left = (5 + (++__n % 7)) + "px"; } });`));
  const idx = path.join(f.dir, "hf/index.html");   // KIT.audio / KIT.video are opt-in (docs/playbook/video-audio.md)
  fs.writeFileSync(idx, fs.readFileSync(idx, "utf8").replace('<script src="film.js">', '<script src="kit/media.js"></script><script src="film.js">'));
  const P = JSON.parse(fs.readFileSync(path.join(f.dir, "project.json"), "utf8"));
  const bad = { ...P, qa: { "native-lint": true } };
  writeTheme(f.dir, bad); copyKit(path.join(f.dir, "hf"));
  browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(pathToFileURL(path.join(f.dir, "hf/index.html")).href);
  assert.ok(await page.evaluate(() => window.READY).catch(() => false), `the broken film still loads: ${errs.join("; ")}`);
  const st = staticChecks(f.dir, bad), pg = await pageChecks(page, { DIR: f.dir, P: bad });
  const got = codes([...st, ...pg]);
  for (const c of ["imperative_media_control", "audio_file_without_element", "composition_file_too_large", "coordinate_drift",
    "composition_heavy_overlay_count_high", "duplicate_audio_track", "hevc_preview_codec"]) assert.ok(got.includes(c), `${c} missing from:\n${[...st, ...pg].join("\n")}`);
  assert.ok(pg.some((l) => /hdr_check: a KIT.video source is HDR but output.hdr is off/.test(l)), "HDR source with output.hdr off");
  for (const l of [...st, ...pg]) assert.ok(l.length <= 200 && !l.includes("\n") && /\(fix: /.test(l), `one short line with a fix: ${l}`);
  // none of the native ports is a rule hf-lint still runs: each answers a SKIPped upstream code (or is new)
  for (const c of ["missing_timeline_registry", "root_composition_missing_duration_source", "composition_file_too_large", "composition_heavy_overlay_count_high",
    "duplicate_audio_track", "audio_file_without_element", "imperative_media_control", "hevc_preview_codec"]) assert.ok(Object.hasOwn(SKIP, c), `${c} is a skipped upstream rule`);

  // the two page rules a working film cannot trip (a duration that is not positive, two caption rows) through a stubbed page
  const stub = (r) => ({ evaluate: async () => ({ dur: 5, heavy: 0, subs: 1, drift: [], media: { videos: [], audio: [] }, ...r }) });
  assert.deepEqual(codes(await pageChecks(stub({ dur: 0, subs: 2 }), { DIR: f.dir, P })), ["root_composition_missing_duration_source", "multiple_caption_tracks"]);
  assert.deepEqual(await pageChecks(stub({}), { DIR: f.dir, P }), [], "the stub baseline is clean");
  assert.ok(Object.hasOwn(SKIP, "multiple_caption_tracks"));

  // the plug-in is opt-in
  assert.deepEqual(await plug(page, { DIR: f.dir, P }), [], "off unless qa.native-lint is true");
  assert.ok((await plug(page, { DIR: f.dir, P: bad })).length >= 7, "on with qa.native-lint");

  // HDR check on its own: hdr on without a source, and with conflicts
  const h = (o, src) => codes(hdrCheck(f.dir, { ...P, output: o }, src));
  assert.deepEqual(h({ hdr: true }, false), ["hdr_check"], "output.hdr with no HDR source");
  assert.deepEqual(h({ hdr: true }, true), [], "output.hdr with an HDR source");
  assert.equal(h({ hdr: true, alpha: true }, true).length, 1, "HDR + alpha");
  assert.equal(h({ hdr: true, format: "webm" }, true).length, 1, "HDR + webm");
  assert.equal(codes(hdrCheck(f.dir, { ...P, renderer: "pvk", output: { hdr: true } }, true)).length, 1, "HDR on pvk");
  // a written SDR mp4 under output.hdr is reported
  const out = path.join(f.dir, "out/film.mp4"); fs.mkdirSync(path.dirname(out));
  assert.equal(spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=blue:s=64x64:d=1:r=10", "-c:v", "libx264", "-pix_fmt", "yuv420p", out]).status, 0);
  assert.ok(hdrCheck(f.dir, { ...P, out: "out/film.mp4", output: { hdr: true } }, true).some((l) => /not PQ\/HLG/.test(l)), "an SDR mp4 under output.hdr");

  // a film that never calls KIT.start (static)
  fs.writeFileSync(film, good.replace("KIT.start({ dur: DUR, render });", ""));
  assert.ok(codes(staticChecks(f.dir, P)).includes("missing_timeline_registry"));
  fs.writeFileSync(film, good);

  // the command on the broken film: warnings, exit 0 (no upstream ERROR), and --components
  fs.writeFileSync(film, fs.readFileSync(film, "utf8"));
  const rc = f.run("lint", "@", "--components", "agent-cursor");
  assert.equal(rc.status, 0, rc.stdout); assert.match(rc.stdout, /1 component\(s\), 0 error\(s\)/);
  const all = spawnSync(process.execPath, [path.join(ROOT, "bin/reelwright.mjs"), "lint", "--components", "--all"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(all.status, 0, all.stdout.slice(-600)); assert.match(all.stdout, /23\d component\(s\), 0 error\(s\)/);
  assert.notEqual(f.run("lint", "@", "--components", "no-such-thing").status, 0);
  console.log(`p13-lint: ok (${got.length} native findings on the broken film, ${all.stdout.match(/(\d+) component/)[1]} catalog components clean)`);
} finally { await browser?.close(); f.rm(); }
