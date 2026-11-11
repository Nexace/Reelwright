// node tools/selfcheck/manim.mjs — the optional Manim renderer's Node half (tools/manim.mjs, tools/manim.js) without Manim:
// kit.json from a synthetic project, the cache hash (stable; moves with the scene, an imported helper, a VO word, fps,
// theme), render() through a FAKE python (REELWRIGHT_MANIM_PYTHON = a node script that makes scene.mov with ffmpeg
// testsrc2), cache hits, verify(), and KIT.manim playback in pvk and HyperFrames under shuffled seeks (same frames, frames
// move, hidden outside the window, the HyperFrames frame equals the pvk frame), plus stale detection. With a real venv
// (<repo>/.venv-manim or REELWRIGHT_MANIM_VENV) it also renders python/reelwright_manim/examples/hello.py.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { launch } from "../browser.mjs";
import { copyKit } from "../kit_files.mjs";
import { createFileServer } from "@hyperframes/producer";
import * as M from "../manim.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const url = (...p) => pathToFileURL(path.join(ROOT, ...p)).href;
const W = 320, H = 180, FPS = 30, DUR = 2, N = 12;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "manim-"));
const DIR = path.join(tmp, "proj"), log = path.join(tmp, "calls.log");
const pass = (m) => console.log("PASS  " + m);
const quiet = () => {};

// ── the fake interpreter: `-m reelwright_manim render|doctor …` ─────────────────────────────────────────────
const FAKE = path.join(tmp, "fake-python.mjs");
fs.writeFileSync(FAKE, `import fs from "node:fs"; import path from "node:path"; import { spawnSync } from "node:child_process";
const a = process.argv.slice(2), o = (k) => a[a.indexOf("--" + k) + 1];
if (a[1] !== "reelwright_manim") process.exit(2);
if (a[2] === "doctor") { console.log(JSON.stringify({ ok: true, python: "fake", engine: o("engine"), manim: "fake", typst: false, alpha: true, frames: 1, problems: [] })); process.exit(0); }
fs.appendFileSync(${JSON.stringify(log)}, o("class") + "\\n");
const fps = +o("fps"), dur = +o("dur"), t0 = +o("t0"), n = Math.round(dur * fps), out = o("out");
JSON.parse(fs.readFileSync(o("kit"), "utf8"));   // the kit must be valid JSON
const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=" + o("size") + ":rate=" + fps, "-frames:v", String(n),
  "-c:v", "qtrle", "-pix_fmt", "argb", path.join(out, "scene.mov")], { stdio: "inherit" });
if (r.status) process.exit(1);
fs.writeFileSync(path.join(out, "marks.json"), JSON.stringify({ frames: n, fps, t0, marks: { pop: +(t0 + dur / 2).toFixed(3) }, illustrative: false }));
`);
process.env.REELWRIGHT_MANIM_PYTHON = FAKE;
const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8").split("\n").filter(Boolean).length : 0);

// ── a synthetic project (both renderers' data files; P.renderer picks one) ─────────────────────────────────
const VO = { L1: { start: 0.5, end: 1.5, text: "hello there", words: [{ w: "hello", t: 0.5, d: 0.4 }, { w: "there", t: 1.0, d: 0.5 }] } };
const P = { title: "manim check", fps: FPS, width: W, height: H, manim: { engine: "ce", scenes: [{ id: "proof", file: "manim/proof.py", class: "Proof", anchor: "L1", pre: 0.2 }] } };
const data = (vo) => `window.PROJECT={"fps":${FPS},"width":${W},"height":${H},"speechEnd":1.5,"tail":0.5};\nwindow.VO=${JSON.stringify(vo)};\nwindow.MUSIC={"bpm":120,"beat":0.5,"bar":2,"t0":0};\n`;
const THEME = ':root { --kit-bg: #112233; --kit-accent-2: #abcdef; --kit-font-display: "Archivo", sans-serif; }\n';
for (const d of ["film", "hf", "manim"]) fs.mkdirSync(path.join(DIR, d), { recursive: true });
const write = (f, s) => fs.writeFileSync(path.join(DIR, f), s);
write("project.json", JSON.stringify(P, null, 2));
write("film/data.js", data(VO)); write("hf/kit-data.js", data(VO));
write("film/theme.css", THEME); write("hf/theme.css", THEME);
write("manim/proof.py", "from helper import dot\nimport math\nclass Proof:\n    pass\n");
write("manim/helper.py", "def dot():\n    return 1\n");

try {
  // ── kit.json ──
  {
    const K = M.kit(DIR, P);
    assert.deepEqual([K.fps, K.width, K.height, K.dur], [FPS, W, H, 2]);
    assert.deepEqual(K.VO.L1, { start: 0.5, end: 1.5, words: VO.L1.words });
    assert.equal(K.MUSIC.bpm, 120);
    assert.equal(K.theme.bg, "#112233"); assert.equal(K.theme.accent2, "#abcdef"); assert.equal(K.theme.ink, "#f4f1ea");
    assert.equal(K.theme.fontDisplay, "Archivo");
    assert.ok(K.fonts.some((f) => f.endsWith(path.join("archivo", "400.woff2"))), "Archivo font files listed: " + K.fonts);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(DIR, ".cache/manim/kit.json"), "utf8")), K);
    fs.renameSync(path.join(DIR, "film/theme.css"), path.join(DIR, "film/theme.off"));
    assert.equal(M.kit(DIR, P, { write: false }).theme.bg, "#0f1115", "no theme.css → kit.css defaults");
    fs.renameSync(path.join(DIR, "film/theme.off"), path.join(DIR, "film/theme.css"));
    pass("kit.json: fps/size/VO/MUSIC from film/data.js, theme from theme.css over kit.css, fonts, defaults without theme.css");
  }

  // ── hash ──
  {
    const h = () => { const K = M.kit(DIR, P, { write: false }); return M.hash(DIR, P, P.manim.scenes[0], K); };
    const base = h();
    assert.equal(h(), base, "hash stable");
    const moves = (label, change, undo) => { change(); const x = h(); undo(); assert.notEqual(x, base, label + " must change the hash"); assert.equal(h(), base); };
    const edit = (f, a, b) => () => write(f, fs.readFileSync(path.join(DIR, f), "utf8").replace(a, b));
    moves("scene file", edit("manim/proof.py", "pass", "pass  # x"), edit("manim/proof.py", "pass  # x", "pass"));
    moves("imported helper", edit("manim/helper.py", "return 1", "return 2"), edit("manim/helper.py", "return 2", "return 1"));
    const vo2 = structuredClone(VO); vo2.L1.words[1].t = 1.05;
    moves("VO word time", () => write("film/data.js", data(vo2)), () => write("film/data.js", data(VO)));
    moves("fps", () => { P.manim.scenes[0].fps = 24; }, () => { delete P.manim.scenes[0].fps; });
    moves("theme", () => write("film/theme.css", THEME.replace("#112233", "#112234")), () => write("film/theme.css", THEME));
    pass("hash: stable across runs; changes with the scene file, an imported helper, a VO word time, fps and theme");
  }

  // ── install plan (never downloads without --yes) ──
  {
    const lines = []; const r = M.install(DIR, "ce", { yes: false, log: (l) => lines.push(l) });
    assert.ok(lines.join("\n").includes('uv pip install --python') && !fs.existsSync(M.venvDir(DIR, "ce")), lines.join("\n"));
    pass(`install without --yes: prints the plan${r.ok ? "" : " (and a missing prerequisite)"}, creates nothing`);
    // an existing healthy venv: install downloads nothing even with --yes (a stub venv whose python imports the pinned dist)
    const fake = path.join(tmp, "venv-stub"), bin = path.join(fake, ...(process.platform === "win32" ? ["Scripts"] : ["bin"]));
    fs.mkdirSync(bin, { recursive: true });
    const exe = path.join(bin, process.platform === "win32" ? "python.exe" : "python");
    if (process.platform === "win32") fs.copyFileSync(process.execPath, exe);
    else { fs.writeFileSync(exe, "#!/bin/sh\nexit 0\n"); fs.chmodSync(exe, 0o755); }
    const saved = { v: process.env.REELWRIGHT_MANIM_VENV, p: process.env.REELWRIGHT_MANIM_PYTHON };
    process.env.REELWRIGHT_MANIM_VENV = fake; delete process.env.REELWRIGHT_MANIM_PYTHON;
    try {
      const ls = []; const r2 = M.install(DIR, "ce", { yes: true, log: (l) => ls.push(l) });
      if (process.platform !== "win32") assert.ok(r2.existing && /nothing downloaded/.test(ls.join("\n")), "existing healthy venv must skip the download: " + ls.join("\n"));
      const d = M.doctor(DIR, "ce");
      assert.ok(d.venv === fake.split("\\").join("/") || d.venv.endsWith("venv-stub"), "doctor reports the venv path: " + JSON.stringify(d));
      assert.equal(typeof d.venvMB, "number", "doctor reports the venv size");
    } finally { for (const [k, v] of [["REELWRIGHT_MANIM_VENV", saved.v], ["REELWRIGHT_MANIM_PYTHON", saved.p]]) v === undefined ? delete process.env[k] : (process.env[k] = v); }
    pass("install with an existing healthy venv: skips the download; doctor reports the venv path and size");
  }

  // ── render with the fake python, cache, verify ──
  const frames = Math.round((VO.L1.end - VO.L1.start + 0.2) * FPS);
  let rendered;
  {
    const r1 = M.render(DIR, P, { log: quiet });
    assert.equal(r1[0].cached, false); assert.equal(calls(), 1);
    const fd = path.join(r1[0].dir, "frames");
    assert.equal(fs.readdirSync(fd).filter((f) => f.endsWith(".png")).length, frames);
    assert.ok(fs.existsSync(path.join(fd, "00000.png")) && fs.existsSync(path.join(fd, String(frames - 1).padStart(5, "0") + ".png")));
    const meta = JSON.parse(fs.readFileSync(path.join(r1[0].dir, "meta.json"), "utf8"));
    assert.equal(meta.frames, frames); assert.equal(meta.marks.pop, 0.9);
    const js = fs.readFileSync(path.join(DIR, ".cache/manim/data.js"), "utf8");
    assert.ok(js.includes(`"dir":"../.cache/manim/proof-${r1[0].hash.slice(0, 12)}/frames/"`), js);
    assert.equal(M.render(DIR, P, { log: quiet })[0].cached, true); assert.equal(calls(), 1, "second run is a cache hit");
    write("manim/helper.py", "def dot():\n    return 3\n");
    const r3 = M.render(DIR, P, { log: quiet });
    assert.equal(r3[0].cached, false); assert.equal(calls(), 2);
    assert.ok(!fs.existsSync(r1[0].dir), "the old proof-* dir is removed");
    assert.deepEqual(M.verify(DIR, P), []);
    const bad = path.join(r3[0].dir, "frames", "00003.png"), keep = bad + ".keep";
    fs.renameSync(bad, keep);
    assert.match(M.verify(DIR, P).join("\n"), /frame files/);
    fs.renameSync(keep, bad);
    write("manim/helper.py", "def dot():\n    return 4\n");
    assert.match(M.verify(DIR, P).join("\n"), /stale/);
    rendered = M.render(DIR, P, { log: quiet });
    assert.deepEqual(M.verify(DIR, P), []);
    pass(`render (fake python): ${frames} frames extracted and counted, data.js written, cache hit, re-render on change, old dir removed, verify clean then flags a missing frame and a stale input`);
  }

  // ── playback ──
  const hfP = { ...P, renderer: "hyperframes" };
  M.render(DIR, hfP, { log: quiet });
  assert.ok(fs.existsSync(path.join(DIR, "hf/kit/manim/data.js")));
  copyKit(path.join(DIR, "hf"));
  const STYLE = `<style>body{margin:0;background:#f6f4ef}#stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;background:#f6f4ef}</style>`;
  const FILM = `<script>'use strict'; const mn = window.mn = KIT.manim('proof'); KIT.start({ dur: ${DUR}, render: (t) => mn.set(t) });</script>`;
  fs.writeFileSync(path.join(DIR, "film/index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${url("tools", "kit.css")}">${STYLE}</head>` +
    `<body><div id="stage"></div><script src="data.js"></script><script src="${url("tools", "engine.js")}"></script>` +
    `<script src="../.cache/manim/data.js"></script><script src="${url("tools", "manim.js")}"></script>${FILM}</body></html>`);
  fs.writeFileSync(path.join(DIR, "hf/index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="kit/kit.css">${STYLE}</head>` +
    `<body><div id="root" data-composition-id="main" data-width="${W}" data-height="${H}"><div id="stage"></div></div>` +
    `<script src="kit-data.js"></script><script src="kit/engine.js"></script><script src="kit/manim/data.js"></script><script src="kit/manim.js"></script>${FILM}</body></html>`);

  const times = Array.from({ length: N }, (_, i) => +(DUR * i / (N - 1)).toFixed(4));
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const shuffled = times.slice().sort(() => rnd() - 0.5);
  const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);
  const t0 = 0.3, end = t0 + frames / FPS;
  const closers = [];
  async function shoot(renderer, order) {
    const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
    try {
      const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
      const errs = [];
      p.on("pageerror", (e) => errs.push(e.message));
      p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
      const server = renderer === "pvk" ? null : await createFileServer({ projectDir: path.join(DIR, "hf"), fps: FPS });
      closers.push(() => server && server.close());
      await p.goto(server ? server.url + "/index.html" : pathToFileURL(path.join(DIR, "film/index.html")).href);
      if (renderer === "pvk") assert.ok(await p.evaluate(() => window.READY), "READY was false: " + errs.join("; "));
      else {
        const ready = () => p.evaluate(() => !!window.__hf && typeof window.__hf.seek === "function" && window.__hf.duration > 0);
        for (let i = 0; !(await ready()); i++) { assert.ok(i < 300, "HyperFrames runtime never became ready: " + errs.join("; ")); await new Promise((r) => setTimeout(r, 100)); }
      }
      const out = {};
      for (const t of order) {
        if (renderer === "pvk") await p.evaluate((t) => window.render(t), t);
        else await p.evaluate(async (t) => { window.__hf.seek(t); await window.__hfWaitForSeekCompletion?.(); }, t);
        out[t] = { png: await p.screenshot({ type: "png" }), vis: await p.evaluate(() => getComputedStyle(window.mn.el).visibility) };
      }
      assert.deepEqual(errs, [], `page errors in ${renderer}`);
      for (const t of order) out[t].sha = sha(out[t].png);
      out.frameAt = await p.evaluate((ts) => ts.map((t) => window.mn.frameAt(t)), times);
      out.pop = await p.evaluate(() => window.mn.markAt("pop"));
      return out;
    } finally { await browser.close(); while (closers.length) closers.pop()(); }
  }
  const NOISE = 2, MAX_PIXELS = 64;   // .github/framediff.py: HyperFrames' software-raster noise
  let cmp;
  async function offPixels(x, y) {
    cmp ||= await (await launch()).newPage();
    return cmp.evaluate(async ([x, y, n]) => {
      const px = async (b64) => { const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
        const c = new OffscreenCanvas(im.width, im.height), g = c.getContext("2d"); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
      const [a, b] = [await px(x), await px(y)];
      let off = 0;
      for (let i = 0; i < a.length; i += 4) if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > n) off++;
      return off;
    }, [x.toString("base64"), y.toString("base64"), NOISE]);
  }
  try {
    const shots = {};
    for (const renderer of ["pvk", "hyperframes"]) {
      const a = await shoot(renderer, times), b = await shoot(renderer, shuffled);
      shots[renderer] = a;
      const diff = [];
      for (const t of times.filter((t) => a[t].sha !== b[t].sha)) {
        const off = renderer === "pvk" ? Infinity : await offPixels(a[t].png, b[t].png);
        if (off > MAX_PIXELS) diff.push(t);
      }
      assert.deepEqual(diff, [], `${renderer}: shuffled seeks differ at t = ${diff.join(", ")}`);
      const inside = times.filter((t) => t >= t0 && t <= end), outside = times.filter((t) => t < t0 || t > end);
      for (const t of times) assert.equal(a[t].vis, inside.includes(t) ? "visible" : "hidden", `${renderer}: visibility at t = ${t}`);
      assert.equal(new Set(outside.map((t) => a[t].sha)).size, 1, `${renderer}: frames outside the window should all be the empty stage`);
      const moving = new Set(inside.map((t) => a[t].sha)).size;
      assert.equal(moving, inside.length, `${renderer}: every in-window seek should show a different frame (${moving}/${inside.length})`);
      assert.deepEqual(a.frameAt, times.map((t) => Math.min(frames - 1, Math.max(0, Math.floor((t - t0) * FPS + 1e-6)))));
      assert.equal(a.pop, 0.9);
      pass(`playback ${renderer.padEnd(11)} ${N}/${N} shuffled seeks match${renderer === "pvk" ? " byte for byte" : ` (≤ ${MAX_PIXELS} px off by > ${NOISE}/255)`}, ` +
        `${moving} distinct in-window frames, hidden at ${outside.length} times outside [${t0}, ${end.toFixed(2)}], frameAt + markAt right`);
    }
    // the canvas path draws the same pixels as the <img> path: HyperFrames shows the right frame, not a blank/stale one
    const far = [];
    for (const t of times) { const off = await offPixels(shots.pvk[t].png, shots.hyperframes[t].png); if (off > MAX_PIXELS) far.push(`${t} (${off} px)`); }
    assert.deepEqual(far, [], "HyperFrames frames differ from pvk frames at t = " + far.join(", "));
    pass("playback hyperframes == pvk at every seek (within raster noise): preloaded frames drawn on a canvas are right without awaiting decodes");
  } finally { if (cmp) await cmp.context().browser().close(); }

  // ── stale: the VO anchor moved after the render ──
  {
    const vo2 = structuredClone(VO); vo2.L1.start = 0.6;
    write("film/data.js", data(vo2));
    const browser = await launch(["--allow-file-access-from-files"]);
    try {
      const p = await browser.newPage(), errs = [];
      p.on("pageerror", (e) => errs.push(e.message));
      await p.goto(pathToFileURL(path.join(DIR, "film/index.html")).href);
      await p.waitForTimeout(200);
      assert.match(errs.join("\n"), /stale .*re-run `reelwright manim <project> render`/, errs.join("\n"));
    } finally { await browser.close(); }
    assert.match(M.verify(DIR, P).join("\n"), /stale/);
    write("film/data.js", data(VO));
    pass("stale: KIT.manim throws when the VO anchor moved after the render; verify() flags it too");
  }

  // ── real Manim, when installed ──
  {
    delete process.env.REELWRIGHT_MANIM_PYTHON;
    const venv = process.env.REELWRIGHT_MANIM_VENV || [path.join(ROOT, ".venv-manim")].find((d) => fs.existsSync(d));
    const hello = path.join(ROOT, "python/reelwright_manim/examples/hello.py");
    if (!venv) console.log("SKIP  real Manim render (not installed: reelwright manim <p> install ce)");
    else if (!fs.existsSync(hello)) console.log("SKIP  real Manim render (python/reelwright_manim/examples/hello.py missing)");
    else {
      process.env.REELWRIGHT_MANIM_VENV = venv;
      const d = M.doctor(DIR, "ce");
      assert.ok(d.ok, "doctor: " + JSON.stringify(d));
      fs.copyFileSync(hello, path.join(DIR, "manim/hello.py"));
      const RP = { ...P, manim: { engine: "ce", scenes: [{ id: "hello", file: "manim/hello.py", class: "Hello", anchor: "L1" }] } };
      const r = M.render(DIR, RP, { log: quiet });
      const n = fs.readdirSync(path.join(r[0].dir, "frames")).length;
      assert.equal(n, Math.round((VO.L1.end - VO.L1.start) * FPS));
      assert.deepEqual(M.verify(DIR, RP), []);
      pass(`real Manim (${venv}): doctor ok, hello.py rendered ${n} frames`);
    }
  }

  // ── the Python package's own self-test ──
  {
    if (!fs.existsSync(path.join(ROOT, "python/reelwright_manim/__main__.py"))) console.log("SKIP  python -m reelwright_manim selftest (python/reelwright_manim/__main__.py not there yet)");
    else {
      const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
      const r = spawnSync(PY, ["-m", "reelwright_manim", "selftest"], { encoding: "utf8", env: { ...process.env, PYTHONPATH: path.join(ROOT, "python"), PYTHONUTF8: "1" } });
      assert.equal(r.status, 0, "python -m reelwright_manim selftest:\n" + r.stdout + r.stderr);
      pass("python -m reelwright_manim selftest");
    }
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log("manim self-check: driver, cache, verify and KIT.manim playback (pvk + hyperframes) all pass");
