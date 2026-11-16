// node tools/selfcheck/lint-ports.mjs — hyperframes:G4, the last 35 skipped upstream lint rules: 22 are ported to Reelwright's model
// (tools/checks/native-lint2.mjs), 13 have no counterpart (NO_COUNTERPART, reasons in docs/playbook/qa-lint.md). Offline, a tiny example-hf copy
// with a fake voiceover and a real browser: a clean film reports nothing; a film broken on purpose trips every ported rule; the 9 earlier
// ports, the 22 new ones and the 13 no-counterpart rules are exactly the 44 rules hf-lint.mjs skips.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { tinyFilm } from "../tiny-film.mjs";
import { launch } from "../browser.mjs";
import { copyKit } from "../kit_files.mjs";
import { writeTheme } from "../theme.mjs";
import { staticChecks, pageChecks, projectChecks } from "../checks/native-lint.mjs";
import { NO_COUNTERPART, calls } from "../checks/native-lint2.mjs";
import plug from "../checks/native-lint.page.mjs";
import { SKIP } from "../checks/hf-lint.mjs";

const codes = (l) => [...new Set(l.map((x) => x.split(":")[0]))];
const PORTED = ["missing_data_no_timeline", "gsap_timeline_not_registered", "nested_clip_never_visible", "clip_ends_past_root_duration", "gsap_animates_clip_element",
  "media_missing_data_start", "media_missing_id", "nested_media_start_basis_ambiguous", "video_nested_in_timed_element", "video_missing_muted", "video_muted_with_declared_audio",
  "media_runtime_src_mutation", "speed_ramp_on_non_media", "audio_volume_tween_overrides_gain", "audio_group_no_members", "linked_clip_orphan", "linked_clips_out_of_sync",
  "studio_missing_editable_id", "root_path_missing_in_preview", "composition_exceeds_inspection_viewport_cap", "caption_transcript_not_inline", "system_font_will_alias"];
const EARLIER = ["missing_timeline_registry", "root_composition_missing_duration_source", "composition_file_too_large", "composition_heavy_overlay_count_high", "duplicate_audio_track",
  "audio_file_without_element", "imperative_media_control", "multiple_caption_tracks", "hevc_preview_codec"];

// the partition: every skipped upstream rule is ported (earlier or now) or has a reason, none twice, none missing
const skipped = Object.keys(SKIP), nc = Object.keys(NO_COUNTERPART);
assert.equal(skipped.length, 44);
assert.deepEqual([...skipped].sort(), [...EARLIER, ...PORTED, ...nc].sort(), "SKIP = earlier ports + P15 ports + no-counterpart rules, each once");
assert.equal(PORTED.length, 22); assert.equal(nc.length, 13);
for (const [c, why] of Object.entries(NO_COUNTERPART)) assert.ok(why.length > 30, `${c} has a real reason`);
// the scanner the static ports rely on
const c1 = calls('KIT.audio("a, b)", { start: 1, ramp: [1, 2] }); x(', /\bKIT\.audio\s*\(/);
assert.equal(c1.length, 1); assert.equal(c1[0].args, '"a, b)", { start: 1, ramp: [1, 2] }');

const f = tinyFilm(), film = path.join(f.dir, "hf/film.js"), idx = path.join(f.dir, "hf/index.html"), good = fs.readFileSync(film, "utf8");
let browser;
try {
  assert.equal(f.run("sched", "@").status, 0);
  const r0 = f.run("lint", "@");
  assert.equal(r0.status, 0, r0.stdout + r0.stderr);
  assert.match(r0.stdout, /0 error\(s\), 0 warning\(s\)/, "a clean film reports nothing from the 22 new checks either");

  // ── the film broken on purpose ──
  fs.mkdirSync(path.join(f.dir, "assets"));
  fs.writeFileSync(path.join(f.dir, "assets/hevc.mp4"), "");
  fs.writeFileSync(path.join(f.dir, "hf/blocks/caption-demo.html"), '<div class="hf-catalog-caption"></div><script>fetch("../transcript.json").then((r) => r.json());</script>');
  fs.writeFileSync(path.join(f.dir, "hf/blocks/host-demo.html"), '<div data-composition-id="demo"></div>');
  fs.writeFileSync(path.join(f.dir, "hf/blocks/path-demo.html"), '<style>.x { background: url(/assets/bg.png); }</style>');
  fs.writeFileSync(film, good.replace("KIT.start({ dur: DUR, render });", `
function __never() {   // read by the static checks, never run
  const clip = KIT.video("assets/x.mp4", { id: "never", start: 0, dur: 1, gain: 1 });
  const tl = gsap.timeline({ paused: true });
  gsap.to(clip, { autoAlpha: 0 });
  gsap.to("#never", { volume: 0 });
  clip.src = "assets/y.mp4";
  KIT.audio("assets/a.wav", { start: 0, ramp: [], volume: 1 });
}
const __h = KIT.el("div", "p15", KIT.stage);
__h.innerHTML = '<video src="../assets/hevc.mp4"></video>'
  + '<video data-start="2" data-duration="1" src="../assets/hevc.mp4" muted></video>'
  + '<div data-start="0" data-duration="3"><video id="v3" data-start="1" data-duration="1" src="../assets/hevc.mp4" muted></video></div>'
  + '<audio id="aa" src="../assets/hevc.mp4"></audio>'
  + '<video id="v5" data-start="1" data-duration="1" data-has-audio="true" src="../assets/hevc.mp4" muted></video>';
const __m = KIT.el("div", "kit-mount", KIT.stage); __m.style.display = "none";
__m.innerHTML = '<video id="v4" data-start="2" data-duration="1" src="../assets/hevc.mp4" muted></video>';
KIT.video("../assets/hevc.mp4", { id: "nv", start: 0, dur: 1, parent: __m });
KIT.video("../assets/hevc.mp4", { id: "late", start: DUR - 0.2, dur: 1 });
KIT.audio("assets/a.wav", { start: DUR - 0.5, out: 3 });
const __f = KIT.el("div", "p15font", KIT.stage); __f.textContent = "hello"; __f.style.fontFamily = "Arial, sans-serif";
fetch("/assets/data.json");
KIT.start({ dur: DUR, render });`));
  fs.writeFileSync(idx, fs.readFileSync(idx, "utf8").replace('<script src="film.js">', '<script src="kit/media.js"></script><script src="film.js">'));
  const P = JSON.parse(fs.readFileSync(path.join(f.dir, "project.json"), "utf8")), bad = { ...P, qa: { "native-lint": true } };
  writeTheme(f.dir, bad); copyKit(path.join(f.dir, "hf"));
  browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(pathToFileURL(idx).href);
  assert.ok(await page.evaluate(() => window.READY).catch(() => false), `the broken film still loads: ${errs.join("; ")}`);
  const st = staticChecks(f.dir, bad), pg = await pageChecks(page, { DIR: f.dir, P: bad });

  // project.json and vo/: duplicate and unusable ids, a stale, an unvoiced and an orphan clip, a stray bus, a huge frame
  const ids = P.lines.map((l) => l.id), voF = path.join(f.dir, "vo/lines.json"), vo = JSON.parse(fs.readFileSync(voF, "utf8"));
  vo[ids[0]].text = "the old words"; delete vo[ids[1]]; vo.ghost = { text: "x", words: [] };
  fs.writeFileSync(voF, JSON.stringify(vo));
  const P2 = { ...bad, width: 9000, lines: [...P.lines, { id: "bad id!", text: "x" }, { id: ids[0], text: "again" }], fx: { bass: "hall", lines: { nobody: "hall" } } };
  const pj = projectChecks(f.dir, P2);

  const got = codes([...st, ...pg, ...pj]), all = [...st, ...pg, ...pj];
  for (const c of PORTED) assert.ok(got.includes(c), `${c} missing from:\n${all.join("\n")}`);
  assert.ok(got.includes("media_option_ignored"), "an option KIT.video / KIT.audio ignores");
  for (const l of all) assert.ok(l.length <= 200 && !l.includes("\n") && /\(fix: /.test(l), `one short line with a fix: ${l}`);
  // each finding names the right thing, not just the code
  const has = (code, re) => assert.ok(all.some((l) => l.startsWith(code + ":") && re.test(l)), `${code} ~ ${re}:\n${all.filter((l) => l.startsWith(code)).join("\n")}`);
  has("linked_clips_out_of_sync", new RegExp(ids[0])); has("linked_clip_orphan", /ghost/); has("linked_clip_orphan", new RegExp(ids[1]));
  has("studio_missing_editable_id", /bad id/); has("studio_missing_editable_id", /used twice/);
  has("audio_group_no_members", /bass/); has("audio_group_no_members", /nobody/); has("composition_exceeds_inspection_viewport_cap", /9000/);
  has("nested_clip_never_visible", /nv/); has("system_font_will_alias", /Arial/); has("clip_ends_past_root_duration", /late/); has("clip_ends_past_root_duration", /a\.wav/);
  has("root_path_missing_in_preview", /\/assets/); has("gsap_animates_clip_element", /clip/); has("media_runtime_src_mutation", /clip/); has("speed_ramp_on_non_media", /ramp/);
  has("missing_data_no_timeline", /host-demo/); has("caption_transcript_not_inline", /caption-demo/);
  // a clean picture of each rule's own condition: the checks are not "always on"
  assert.deepEqual(projectChecks(f.dir, { ...P }).filter((l) => /^(studio_missing|audio_group|composition_exceeds)/.test(l)), []);

  // the qa plug-in is opt-in and now carries them too
  assert.deepEqual(await plug(page, { DIR: f.dir, P }), [], "off unless qa.native-lint is true");
  assert.ok(codes(await plug(page, { DIR: f.dir, P: bad })).includes("video_missing_muted"), "on with qa.native-lint");

  // the command prints them as warnings and still exits 0 (no upstream ERROR)
  const rc = f.run("lint", "@", "--no-browser");
  assert.equal(rc.status, 0, rc.stdout); assert.match(rc.stdout, /WARN  root_path_missing_in_preview/);
  console.log(`lint-ports: ok (${PORTED.length} ported rules tripped, ${nc.length} with no counterpart, ${got.length} codes on the broken film)`);
} finally { await browser?.close(); f.rm(); }
