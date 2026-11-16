// node tools/selfcheck/make.mjs — `reelwright make`: offline, no render, no network (the from-url --yes case needs a headless browser and is skipped without one).
//   1. sample briefs route to the right template; script text is sentence-split; placeholders match the requested length
//   2. a dry run creates nothing (projects/ and themes/ are unchanged); --yes creates a valid project that passes `sched`
//   3. bad input is refused with a message: empty brief, unknown flag, name clash, --voice with --music-only, bad --length, missing folder, bad URL
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs, plan, sentences, skeleton, spoken } from "../make.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const bin = path.join(ROOT, "bin/reelwright.mjs"), PY = process.platform === "win32" ? "python" : "python3";
const make = (...a) => spawnSync(process.execPath, [bin, "make", ...a], { cwd: ROOT, encoding: "utf8" });
const P = (...a) => plan(parseArgs(a), ROOT);
const snap = () => ["projects", "themes"].map((d) => fs.readdirSync(path.join(ROOT, d)).sort().join("|")).join("\n");
const made = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "make-"));
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const fixtureVo = (name, lines) => {   // word times as the voiceover step would write them, so `sched` runs without edge-tts
  const dir = path.join(ROOT, "projects", name, "vo"); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "lines.json"), JSON.stringify(Object.fromEntries(lines.map((l) => [l.id,
    { words: l.text.split(/\s+/).map((w, i) => ({ w, t: +(i * 0.4).toFixed(2), d: 0.35 })) }]))));
};
const sched = (name) => spawnSync(PY, [path.join(ROOT, "tools/sched.py"), path.join("projects", name)], { cwd: ROOT, encoding: "utf8", env: { ...process.env, PYTHONUTF8: "1" } });
const project = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, "projects", name, "project.json"), "utf8").replace(/\r/g, ""));
const refused = (args, re) => {
  const before = snap(), r = make(...args);
  assert.equal(r.status, 1, `make ${args.join(" ")} should be refused`); assert.match(r.stderr, re);
  assert.equal(snap(), before, "a refusal creates nothing");
};

const folder = path.join(tmp, "shots"); fs.mkdirSync(folder);
["a.png", "b.png"].forEach((f) => fs.writeFileSync(path.join(folder, f), png));
try {
  // ── 1. routing ──
  const route = (brief, ...rest) => P(brief, "--name", "q6-route", ...rest).intent;
  assert.equal(route("Launch promo for Acme budgeting app"), "promo");
  assert.equal(route("a teaser for our new game"), "promo");
  assert.equal(route("app walkthrough of Tidy"), "walkthrough");
  assert.equal(route("a demo of the dashboard"), "walkthrough");
  assert.equal(route("explainer on how compound interest works"), "explainer");
  assert.equal(route("motion graphics intro for a podcast"), "explainer");
  assert.equal(route("promo for the Tidy app"), "promo", "promo beats app");
  assert.equal(route("explainer for the app"), "explainer", "explainer beats app");
  assert.equal(route("make something nice"), "explainer", "no keyword: the default");
  assert.equal(route("Show off https://example.com/ to investors"), "from-url");
  assert.equal(route("our week", "--url", "file:///x/y.html"), "from-url");
  assert.equal(route("a launch film", "--folder", folder), "slideshow", "a folder beats the promo keyword");
  assert.equal(route(`photos in ${folder}`), "slideshow");
  const pr = P("promo for Acme", "--name", "q6-route", "--voice");
  assert.equal(pr.lines.length, 0); assert.ok(pr.notes.some((n) => /music-only/.test(n)), "promo is music only and says so");
  assert.equal(P("walkthrough of Tidy", "--name", "q6-route", "--music-only").voice, false);
  // script text
  const s = P("walkthrough of Tidy. script: Meet Tidy. Add a task in one tap, e.g. by typing. Done!", "--name", "q6-route");
  assert.deepEqual(s.lines.map((l) => l.text), ["Meet Tidy.", "Add a task in one tap, e.g. by typing.", "Done!"]);
  assert.equal(P('demo of Tidy "Meet Tidy now.\r\nTick things off."', "--name", "q6-route").lines.length, 2, "quoted text, CRLF tolerated");
  assert.deepEqual(sentences("One. Two?\r\nThree"), ["One.", "Two?", "Three"]);
  // placeholders: N lines for the length, about 2.5 words per second, all marked
  for (const len of [15, 30, 60, 120]) {
    const q = P("explainer about tides", "--name", "q6-route", "--length", String(len));
    assert.ok(q.lines.every((l) => l.draft && l.text.startsWith("[DRAFT ")), "every placeholder is marked");
    assert.ok(Math.abs(spoken(q.lines) - len) <= 6, `${len} s asked, ${spoken(q.lines).toFixed(1)} s planned`);
  }
  assert.ok(skeleton(5).length >= 2 && skeleton(120).length > skeleton(30).length);
  assert.equal(parseArgs(["a demo", "--length", "2m"]).seconds, 120);

  // ── 2. dry run creates nothing ──
  const before = snap();
  for (const a of [["Launch promo for Acme budgeting app", "--name", "q6-dry"], ["walkthrough of Tidy", "--name", "q6-dry"], ["explainer on tides", "--name", "q6-dry"],
    ["our photos", "--folder", folder, "--name", "q6-dry"], ["our site https://example.com", "--name", "q6-dry"]]) {
    const r = make(...a);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /dry run: re-run with --yes to create projects\/q6-dry/);
    assert.match(r.stdout, /commands it will run:\n\s+1\. reelwright /);
    assert.equal(snap(), before, `dry run of ${a[0]} changed projects/ or themes/`);
  }
  const dry = make("walkthrough of the Tidy to-do app", "--name", "q6-dry").stdout;   // the plan names renderer, theme, template, lines, duration, commands
  for (const k of ["renderer:", "template:", "theme:", "script:", "duration:", "reelwright new q6-dry --agents"]) assert.ok(dry.includes(k), `plan shows ${k}`);

  // ── 2b. --yes: a valid project that passes sched offline ──
  const yes = (name, ...a) => {
    made.push(name);
    const r = make(...a, "--name", name, "--yes"); assert.equal(r.status, 0, r.stdout + r.stderr);
    for (const c of ["sched", "stills", "all"]) assert.match(r.stdout, new RegExp(`reelwright ${c} ${name}`));
  };
  const check = (name, renderer) => {
    const dir = path.join(ROOT, "projects", name), J = project(name);
    assert.equal(J.renderer || "pvk", renderer); assert.equal(J.out, `out/${name}.mp4`); assert.ok(J.brief && J.title);
    assert.equal(fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8").replace(/\r/g, ""), "@AGENTS.md\n");
    assert.match(fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8"), /## Rules/);
    assert.ok(!("langs" in J), "the starter's translations are dropped");
    for (const x of ["frames", "stills", "out", "mix.wav"]) assert.ok(!fs.existsSync(path.join(dir, x)), `no ${x}: nothing rendered`);
    return J;
  };
  yes("q6-walk", "30 second walkthrough of the Tidy app", "--audience", "busy parents");
  let J = check("q6-walk", "pvk");
  assert.ok(J.lines.length >= 4 && J.lines.every((l) => l.text.startsWith("[DRAFT ")));
  assert.ok(J.style && fs.existsSync(path.join(ROOT, "themes", J.style + ".css")), "the drafted theme was written and is the style");
  assert.match(J.brief, /busy parents/);
  fixtureVo("q6-walk", J.lines); let r = sched("q6-walk"); assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(fs.existsSync(path.join(ROOT, "projects/q6-walk/film/data.js")));

  yes("q6-expl", "explainer on tides", "--length", "20");
  J = check("q6-expl", "hyperframes");
  assert.ok(fs.existsSync(path.join(ROOT, "projects/q6-expl/hf/film.js")));
  fixtureVo("q6-expl", J.lines); r = sched("q6-expl"); assert.equal(r.status, 0, r.stdout + r.stderr);

  yes("q6-script", "demo of Tidy. script: Meet Tidy. Tick things off.");
  J = check("q6-script", "pvk"); assert.deepEqual(J.lines.map((l) => l.text), ["Meet Tidy.", "Tick things off."]);

  yes("q6-music", "explainer on tides", "--music-only", "--length", "24");
  J = check("q6-music", "hyperframes"); assert.deepEqual(J.lines, []); assert.equal(J.tail, 24);
  r = sched("q6-music"); assert.equal(r.status, 0, r.stdout + r.stderr);

  yes("q6-promo", "Launch promo for Acme budgeting app");
  J = check("q6-promo", "hyperframes"); assert.equal(J.lines.length, 0); assert.ok(J.arc.length >= 5, "the Ink Press arc came with it");
  assert.ok(fs.existsSync(path.join(ROOT, "projects/q6-promo/hf/content.js")));
  r = sched("q6-promo"); assert.equal(r.status, 0, r.stdout + r.stderr);

  yes("q6-slides", "our trip photos", "--folder", folder);
  J = check("q6-slides", "hyperframes"); assert.ok(fs.existsSync(path.join(ROOT, "projects/q6-slides/hf/slides.js")));
  r = sched("q6-slides"); assert.equal(r.status, 0, r.stdout + r.stderr);

  // from-url --yes: a local page, if a headless browser is available (the rest of this check never needs one)
  const page = path.join(tmp, "site.html");
  fs.writeFileSync(page, "<!doctype html><title>Tidy</title><h1>Your to-do list should not feel like a job.</h1><p>Tidy helps you finish what matters.</p>");
  made.push("q6-url");
  r = make("show off this page", "--url", pathToFileURL(page).href, "--name", "q6-url", "--yes");
  if (r.status === 0) { J = check("q6-url", "hyperframes"); assert.ok(J.lines.length >= 1); fixtureVo("q6-url", J.lines); r = sched("q6-url"); assert.equal(r.status, 0, r.stdout + r.stderr); }
  else { console.log("  (from-url --yes skipped: no headless browser here)"); assert.ok(!fs.existsSync(path.join(ROOT, "projects/q6-url")), "a failed make leaves nothing behind"); }

  // ── 3. refusals ──
  refused([], /brief is empty/);
  refused(["   "], /brief is empty/);
  refused(["a promo", "--bogus"], /unknown flag --bogus/);
  refused(["a promo", "--name", "q6-walk"], /projects\/q6-walk already exists/);
  refused(["a promo", "--voice", "--music-only"], /exclude each other/);
  refused(["a promo", "--length", "soon"], /--length/);
  refused(["a promo", "--length", "2"], /--length/);
  refused(["a promo", "--name", "bad name!"], /--name/);
  refused(["a promo", "--name"], /--name needs a value/);
  refused(["photos", "--folder", path.join(tmp, "nope")], /not a folder/);
  refused(["photos", "--folder", tmp, "--name", "q6-empty"], /no images or clips/);
  refused(["a site", "--url", "ftp://x"], /--url/);
  console.log("make: ok");
} finally {
  for (const n of made) { fs.rmSync(path.join(ROOT, "projects", n), { recursive: true, force: true }); fs.rmSync(path.join(ROOT, "themes", n + ".css"), { force: true }); }
  fs.rmSync(tmp, { recursive: true, force: true });
}
