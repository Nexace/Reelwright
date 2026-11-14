// node tools/selfcheck/p5-tools.mjs — the Phase 11 P5 node-side pieces, offline, nothing installed, no paid call:
//   deck       tools/p5-deck.mjs: 46 moves in 8 groups, every `kit` path and transition type resolves in a real page with the modules loaded
//   gate       tools/p5-gate.mjs: a pure film passes, a film that remembers the last frame FAILS (so the gate can fail), a static film is refused
//   checks     tools/checks/p5-*.page.mjs on small films (readtime, caption-tight, dead-air, safe-zone, facts, motionscan) and p5-av-sync.py on real mp4s
//   narrate    tools/p5-narrate.mjs: WER, cache by hash, `say` (macOS), stub piper / kokoro / whisper-cli on PATH, cloud adapters against an injected fetch
//   brand      tools/p5-brand.mjs inventory + check
//   blur       tools/p5-blur.mjs: linear-light average (black + white = 186, not 127), alpha, blurSpec
//   formats    tools/p5-formats.mjs + the gif / webm / apng encodes of tools/renderers/pvk.mjs and a 1200x628 mp4
//   animimg    tools/p5-animimg.mjs: real frame times from a variable-delay GIF, and the `animimg` command
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p5-tools-"));
const url = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const imp = (rel) => import(url(rel));
const ff = (...a) => { const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...a], { encoding: "utf8" }); assert.equal(r.status, 0, "ffmpeg: " + r.stderr); };
const probe = (f, entries, stream = "v:0") => JSON.parse(spawnSync("ffprobe", ["-v", "error", "-select_streams", stream, "-show_entries", entries, "-of", "json", f], { encoding: "utf8" }).stdout);
const ok = (name, extra = "") => console.log(`PASS  ${name}${extra ? "  " + extra : ""}`);
const CLI = (...args) => spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), ...args], { cwd: ROOT, encoding: "utf8" });

// a small pvk film page: engine.js + modules, #stage, K.start(dur, render)
function filmPage(name, { w = 640, h = 360, dur = 6, vo = {}, scripts = [], body }) {
  const dir = path.join(tmp, name); fs.mkdirSync(dir, { recursive: true });
  const css = `<style>body{margin:0}#stage{position:absolute;left:0;top:0;width:${w}px;height:${h}px;overflow:hidden;background:#f6f4ef;color:#1d1b16;font:600 28px Arial}#stage div{position:absolute;white-space:nowrap}</style>`;
  fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${url("tools/kit.css")}">${css}</head><body><div id="stage"></div>` +
    `<script>window.PROJECT={fps:30,width:${w},height:${h},speechEnd:${dur},tail:0};window.VO=${JSON.stringify(vo)};window.MUSIC={};</script>` +
    ["tools/engine.js", ...scripts].map((s) => `<script src="${url(s)}"></script>`).join("") + `<script>'use strict';const S=KIT.stage;\n${body}\n</script></body></html>`);
  return { file: path.join(dir, "index.html"), w, h };
}
async function withPage(film, fn) {
  const b = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  try {
    const p = await b.newPage({ viewport: { width: film.w, height: film.h } }), errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(pathToFileURL(film.file).href);
    assert.ok(await p.evaluate(() => window.READY), "READY false: " + errs.join("; "));
    return await fn(p);
  } finally { await b.close(); }
}

// ── deck ────────────────────────────────────────────────────────────────────
{
  const { DECK, find, deal } = await imp("tools/p5-deck.mjs");
  assert.equal(DECK.length, 46, "the deck has 46 moves");
  const cats = Object.fromEntries([...new Set(DECK.map((m) => m.cat))].map((c) => [c, DECK.filter((m) => m.cat === c).length]));
  assert.deepEqual(Object.keys(cats), ["open", "seam", "cam", "reveal", "type", "act", "emph", "close"]);
  assert.equal(new Set(DECK.map((m) => m.cat + "/" + m.name)).size, 46, "names are unique within a group");
  assert.ok(DECK.every((m, i) => m.n === i + 1 && m.call && m.numbers && m.load), "every move has n, call, numbers, load");
  const mods = ["tools/shots.js", "tools/shots2.js", "tools/p5-camera.js", "tools/p5-time.js", "tools/p5-morph.js", "tools/doodle.js", "tools/doodle2.js", "tools/layouts.js", "tools/transitions.js", "tools/motion.js", "tools/p5-text.js", "tools/p5-doodle.js"];
  const film = filmPage("deck", { scripts: mods, body: "KIT.start({ dur: 1, render() {} });" });
  const missing = await withPage(film, (p) => p.evaluate((deck) => {
    const out = [];
    for (const m of deck) {
      let o = window.KIT; for (const k of m.kit.split(".")) o = o && o[k];
      if (typeof o !== "function") out.push(`${m.name}: KIT.${m.kit} is not a function`);
      if (m.type && !KIT.transition.names.includes(m.type)) out.push(`${m.name}: no transition type ${m.type}`);
    }
    return out;
  }, DECK));
  assert.deepEqual(missing, [], "every deck move resolves to a KIT function");
  assert.ok(find("crash zoom").length === 1 && find("dolly zoom").length === 2 && find("drawn").length >= 1 && find("nothing like this").length === 0, "find matches every word in name/call/numbers");
  assert.equal(JSON.stringify(deal({ seed: "x" })), JSON.stringify(deal({ seed: "x" })), "deal is seeded");
  assert.notEqual(JSON.stringify(deal({ seed: "x" })), JSON.stringify(deal({ seed: "y" })), "another seed deals another hand");
  assert.equal(deal({ seed: "x" }).length, 8, "one move per group");
  const r = CLI("deck", "find", "crash"); assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /crash-zoom/);
  assert.match(CLI("deck", "deal", "--seed", "q").stdout, /hand for seed "q"/);
  ok("deck", `46 moves, ${Object.entries(cats).map(([c, n]) => c + " " + n).join(", ")}`);
}

// ── gate ────────────────────────────────────────────────────────────────────
{
  const { determinismGate } = await imp("tools/p5-gate.mjs");
  const pure = filmPage("gate-pure", { dur: 4, body: `const b = KIT.el('div', '', S); KIT.css(b, { top: '40px', width: '60px', height: '60px', background: '#36c' });
    KIT.start({ dur: 4, render: (t) => { b.style.left = (40 + t * 100).toFixed(2) + 'px'; } });` });
  const leaky = filmPage("gate-leaky", { dur: 4, body: `const b = KIT.el('div', '', S); KIT.css(b, { top: '40px', width: '60px', height: '60px', background: '#36c' });
    let x = 0; KIT.start({ dur: 4, render: (t) => { x += 7; b.style.left = (40 + (x % 300)).toFixed(2) + 'px'; } });` });   // carries x from the last frame
  const still = filmPage("gate-still", { dur: 4, body: `const b = KIT.el('div', '', S); KIT.css(b, { left: '40px', top: '40px', width: '60px', height: '60px', background: '#36c' }); KIT.start({ dur: 4, render: () => {} });` });
  const a = await determinismGate(pure.file, { W: 640, H: 360, n: 8 }), b = await determinismGate(leaky.file, { W: 640, H: 360, n: 8 }), c = await determinismGate(still.file, { W: 640, H: 360, n: 8 });
  assert.ok(a.ok && a.distinct >= 7 && !a.bad.length, "a pure film passes: " + JSON.stringify(a.bad));
  assert.ok(!b.ok && b.bad.length > 0, "a film that carries state from frame to frame must FAIL the gate");
  assert.ok(new Set(b.bad.map((x) => x.pair)).size >= 1);
  assert.ok(!c.ok && c.distinct === 1 && !c.bad.length, "a film that never changes is refused (distinct = 1)");
  ok("gate", `pure ok, leaky fails (${b.bad.length} mismatches: ${[...new Set(b.bad.map((x) => x.pair))].join(", ")}), static refused`);
}

// ── page checks ─────────────────────────────────────────────────────────────
{
  const run = async (file, film, ctx = {}) => withPage(film, async (p) => (await imp(`tools/checks/${file}.page.mjs`)).default(p, { P: {}, W: film.w, H: film.h, ...ctx }));
  const words = "one two three four five six seven eight nine ten".split(" ");
  // readtime + caption-tight
  const rt = filmPage("readtime", { dur: 6, vo: { a: { text: words.join(" "), start: 0, end: 1.5, words: words.map((w, i) => ({ w, t: i * 0.15, d: 0.12 })) } },
    body: `const mk = (txt, x, y) => { const e = KIT.el('div', '', S, txt); KIT.css(e, { left: x + 'px', top: y + 'px', fontSize: '20px' }); return e; };
      const long = mk('This label stays up the whole film', 20, 100), flash = mk('flash of words here now', 20, 160), ok1 = mk('read me for three seconds please', 20, 220);
      KIT.start({ dur: 6, render: (t) => { KIT.show(flash, t >= 1 && t < 1.4 ? 1 : 0); KIT.show(ok1, t >= 2 && t < 5 ? 1 : 0); } });` });
  const lines = await run("p5-readtime", rt);
  assert.ok(lines.some((l) => /^readtime .*flash of words here now.*is up 0\.4\d s, needs 1\.50 s/.test(l)), "flags the flash: " + lines.join(" | "));
  assert.ok(!lines.some((l) => /stays up the whole film|read me for three seconds/.test(l)), "does not flag text that is up long enough");
  assert.ok(lines.some((l) => /^caption-tight 0\.00s .*TOO TIGHT/.test(l)), "flags the ten words in 1.5 s: " + lines.join(" | "));
  // dead-air
  const moving = (name, still) => filmPage(name, { dur: 8, body: `const b = KIT.el('div', '', S); KIT.css(b, { top: '40px', width: '60px', height: '60px', background: '#36c' });
    KIT.start({ dur: 8, render: (t) => { b.style.left = (40 + Math.max(0, t - ${still}) * 60).toFixed(2) + 'px'; } });` });
  const da = await run("p5-dead-air", moving("dead", 5)), da0 = await run("p5-dead-air", moving("alive", 0));
  assert.ok(da.length === 1 && /^dead-air 0\.00–5\.00s: nothing changes for 5\.0 s/.test(da[0]), "dead air found: " + da.join(" | "));
  assert.deepEqual(da0, [], "a film that always moves has no dead air");
  const da1 = await run("p5-dead-air", moving("hold1", 1), { P: { qa: { "p5-dead-air": { maxHold: 1 } } } }); assert.ok(da1.length === 1, "maxHold tightens it: " + da1.join("|"));
  // safe-zone
  const sz = filmPage("safezone", { w: 360, h: 640, dur: 2, body: `const mk = (txt, x, y) => { const e = KIT.el('div', '', S, txt); KIT.css(e, { left: x + 'px', top: y + 'px', fontSize: '22px' }); return e; };
    mk('Top handle row', 20, 20); mk('Middle is safe', 20, 300); mk('Rail', 310, 330); mk('Lower third', 20, 560); KIT.start({ dur: 2, render: () => {} });` });
  const zl = await run("p5-safe-zone", sz);
  assert.deepEqual(zl.map((l) => l.match(/in the (\w+) UI zone/)[1]).sort(), ["bottom", "rail", "top"], "safe-zone: " + zl.join(" | "));
  assert.ok(!zl.some((l) => /Middle is safe/.test(l)));
  assert.deepEqual(await run("p5-safe-zone", filmPage("safe-h", { dur: 2, body: `const e = KIT.el('div', '', S, 'Top'); KIT.css(e, { left: '10px', top: '5px' }); KIT.start({ dur: 2, render: () => {} });` })), [], "horizontal films are not checked");
  // facts
  const fk = (label) => filmPage("facts-" + label, { dur: 3, vo: { a: { text: "Loved by users.", start: 0, end: 1, words: [{ w: "Loved", t: 0, d: 0.3 }, { w: "by", t: 0.3, d: 0.2 }, { w: "users", t: 0.5, d: 0.3 }] } },
    body: `const mk = (txt, y) => { const e = KIT.el('div', '', S, txt); KIT.css(e, { left: '20px', top: y + 'px', fontSize: '20px' }); return e; };
      mk('Rated 4.8 stars', 60); mk('12,000 users', 120); ${label === "labelled" ? "mk('Illustrative data', 200);" : ""} KIT.start({ dur: 3, render: () => {} });` });
  const P = { facts: [{ claim: "4.8 stars" }, { claim: "ghost claim", source: "nowhere" }] };
  const fl = await run("p5-facts", fk("plain"), { P });
  assert.ok(fl.includes('facts: "4.8 stars" has no source'), "no source: " + fl.join(" | "));
  assert.ok(fl.some((l) => /"ghost claim" is on no screen/.test(l)), "stale claim");
  assert.ok(fl.some((l) => /"12,000" on screen .* is not in the facts ledger/.test(l)) && !fl.some((l) => /"4\.8/.test(l) && /not in the facts ledger/.test(l)), "unledgered number only: " + fl.join(" | "));
  assert.ok(!(await run("p5-facts", fk("labelled"), { P })).some((l) => /not in the facts ledger/.test(l)), "an Illustrative data label silences the number lines");
  assert.deepEqual(await run("p5-facts", fk("none"), { P: {} }), [], "no facts array, no output");
  // motionscan
  const ms = (name, cut) => filmPage(name, { dur: 12, body: `const mk = (txt, y) => { const e = KIT.el('div', '', S, txt); KIT.css(e, { left: '30px', top: y + 'px' }); return e; };
    const A = [mk('Slide A', 30), mk('More about A', 70)], B = [mk('Slide B', 30), mk('More about B', 70)], c = mk('Caption', 300);
    KIT.start({ dur: 12, render: (t) => { const k = ${cut ? "Math.floor(t / 1.5) % 2" : "0"}; A.forEach((e) => KIT.show(e, k === 0 ? 1 : 0)); B.forEach((e) => KIT.show(e, k === 1 ? 1 : 0)); KIT.show(c, 1); } });` });
  const sl = await run("p5-motionscan", ms("slides", true));
  assert.ok(sl.some((l) => /hard cuts, one every 1\.5 s/.test(l)) && sl.some((l) => /near-equal intervals/.test(l)), "slide rhythm found: " + sl.join(" | "));
  assert.deepEqual(await run("p5-motionscan", ms("calm", false)), [], "no cuts, no lines");
  // a check that cannot run says so instead of throwing (qa would turn a throw into a FAIL)
  const dead = await withPage(filmPage("nofilm", { body: "KIT.start({ dur: 1, render() {} }); delete window.FILM;" }), async (p) => (await imp("tools/checks/p5-readtime.page.mjs")).default(p, {}));
  assert.ok(dead.length === 1 && /skipped/.test(dead[0]), "a broken page gives one 'skipped' line: " + dead.join("|"));
  // av-sync on real files
  const A = path.join(tmp, "av"); fs.mkdirSync(A);
  ff("-f", "lavfi", "-i", "testsrc=d=3:s=64x48:r=10", "-f", "lavfi", "-i", "sine=d=3", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", path.join(A, "good.mp4"));
  ff("-f", "lavfi", "-i", "testsrc=d=3:s=64x48:r=10", "-itsoffset", "0.6", "-f", "lavfi", "-i", "sine=d=2.4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", path.join(A, "late.mp4"));
  ff("-f", "lavfi", "-i", "testsrc=d=3:s=64x48:r=10", "-f", "lavfi", "-i", "sine=d=1", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", path.join(A, "short.mp4"));
  ff("-f", "lavfi", "-i", "testsrc=d=1:s=64x48:r=10", "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(A, "silent.mp4"));
  fs.writeFileSync(path.join(A, "mix.wav"), "x");
  const av = (f) => JSON.parse(spawnSync(process.platform === "win32" ? "python" : "python3", ["-I", "-c", "import importlib.util,sys,json\ns=importlib.util.spec_from_file_location('c',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nprint(json.dumps(m.check({'mp4':sys.argv[2],'proj':sys.argv[3]})))", path.join(ROOT, "tools/checks/p5-av-sync.py"), path.join(A, f), A], { encoding: "utf8" }).stdout);
  assert.deepEqual(av("good.mp4"), [], "in-sync file: no findings");
  assert.ok(av("late.mp4").some((l) => /audio starts at 0\.5\d/.test(l)), "late audio start: " + av("late.mp4"));
  assert.ok(av("short.mp4").some((l) => /differ by/.test(l)), "audio short of the picture: " + av("short.mp4"));
  assert.deepEqual(av("silent.mp4"), ["av-sync: the mp4 has no audio stream"], "mix.wav exists but the mp4 is silent");
  ok("checks", "readtime, caption-tight, dead-air, safe-zone, facts, motionscan, av-sync");
}

// ── narrate ─────────────────────────────────────────────────────────────────
{
  const N = await imp("tools/p5-narrate.mjs"), dir = path.join(tmp, "narr"), noop = () => {};
  assert.equal(N.wer("the quick brown fox", "the quick brown fox"), 0);
  assert.equal(N.wer("The quick, brown fox!", "the QUICK brown fox"), 0, "case and punctuation fold");
  assert.equal(N.wer("a b c d", "a x c d"), 0.25); assert.equal(N.wer("a b c d", "a b"), 0.5); assert.equal(N.wer("", ""), 0); assert.equal(N.wer("", "x"), 1);
  assert.notEqual(N.keyOf("say", "hi"), N.keyOf("piper", "hi")); assert.notEqual(N.keyOf("say", "hi", { voice: "a" }), N.keyOf("say", "hi", { voice: "b" })); assert.notEqual(N.keyOf("say", "hi", { rate: 1 }), N.keyOf("say", "hi", { rate: 1.2 }));
  assert.equal(N.keyOf("say", "hi", { voice: "a", rate: 1 }), N.keyOf("say", "hi", { voice: "a", rate: 1 }), "the key is stable");
  await assert.rejects(() => N.synth("nope", "x", { dir }), /no provider/); await assert.rejects(() => N.synth("say", " ", { dir }), /no text/);
  const wavInfo = (f) => probe(f, "stream=sample_rate,channels,duration", "a:0").streams[0];
  let did = [];
  if (N.providers.say.available()) {   // macOS: the real thing, nothing installed
    const a = await N.synth("say", "Hello from Reelwright.", { dir, log: noop }), b = await N.synth("say", "Hello from Reelwright.", { dir, log: noop });
    assert.ok(!a.cached && b.cached && a.file === b.file, "the second take is the cached one");
    const i = wavInfo(a.file); assert.equal(i.sample_rate, "24000"); assert.equal(i.channels, 1); assert.ok(Number(i.duration) > 0.5);
    did.push("say");
  }
  if (process.platform !== "win32") {   // stub piper, kokoro-tts, whisper-cli on PATH: the adapters' contract (args, stdin, files) without any model
    const bin = path.join(tmp, "bin"); fs.mkdirSync(bin);
    const stub = (n, body) => { fs.writeFileSync(path.join(bin, n), "#!/bin/sh\n" + body + "\n"); fs.chmodSync(path.join(bin, n), 0o755); };
    stub("piper", 'out=""; while [ $# -gt 0 ]; do [ "$1" = "--output_file" ] && out="$2"; shift; done; cat > "$out.in"; ffmpeg -y -v error -f lavfi -i sine=d=1 "$out"; echo "$out.in" > "' + path.join(tmp, "piper.seen") + '"');
    stub("kokoro-tts", 'ffmpeg -y -v error -f lavfi -i sine=d=1 "$2"; echo "$@" > "' + path.join(tmp, "kokoro.args") + '"; cat "$1" > "' + path.join(tmp, "kokoro.text") + '"');
    stub("whisper-cli", 'echo "hello world"');
    const saved = { PATH: process.env.PATH, PIPER_MODEL: process.env.PIPER_MODEL, WHISPER_MODEL: process.env.WHISPER_MODEL };
    Object.assign(process.env, { PATH: bin + path.delimiter + process.env.PATH, PIPER_MODEL: "/models/en.onnx", WHISPER_MODEL: "/models/ggml.bin" });
    try {
      assert.ok(N.providers.piper.available() && N.providers.kokoro.available() && N.asrAvailable());
      const p = await N.synth("piper", "spoken by piper", { dir, log: noop }); assert.equal(wavInfo(p.file).sample_rate, "24000");
      assert.ok(fs.existsSync(path.join(tmp, "piper.seen")), "piper ran with the text on stdin");
      const k = await N.synth("kokoro", "spoken by kokoro", { dir, voice: "am_adam", rate: 1.1, log: noop });
      assert.match(fs.readFileSync(path.join(tmp, "kokoro.args"), "utf8"), /--voice am_adam --speed 1\.1/); assert.equal(fs.readFileSync(path.join(tmp, "kokoro.text"), "utf8"), "spoken by kokoro"); assert.ok(fs.existsSync(k.file));
      const good = N.check(p.file, "Hello, world!"), bad = N.check(p.file, "hello there world", { maxWer: 0.1 });
      assert.ok(good.ok && good.wer === 0 && good.heard === "hello world"); assert.ok(!bad.ok && bad.wer === 0.333 && bad.missing.join() === "there", "the word that did not come back is named: " + JSON.stringify(bad));
      assert.match(CLI("narrate", "check", p.file, "hello there world").stdout + CLI("narrate", "check", p.file, "hello there world").stderr, /FAIL\s+WER 0\.333/);
      const prov = CLI("narrate", "providers").stdout; assert.match(prov, /piper\s+local/);
      did.push("piper", "kokoro", "whisper-cli");
    } finally { for (const [k, v] of Object.entries(saved)) v === undefined ? delete process.env[k] : (process.env[k] = v); }
    // cloud adapters against an injected fetch (never the network): the request shape, the key, the paid-call guard
    const mp3 = path.join(tmp, "tone.mp3"), wav = path.join(tmp, "tone.wav"), pcm = path.join(tmp, "tone.pcm");
    ff("-f", "lavfi", "-i", "sine=d=1", "-ar", "24000", "-ac", "1", mp3); ff("-f", "lavfi", "-i", "sine=d=1", "-ar", "24000", "-ac", "1", wav); ff("-i", wav, "-f", "s16le", pcm);
    const calls = [], fake = (body, json) => async (u, init) => { calls.push({ u, init }); return { ok: true, status: 200, arrayBuffer: async () => body, json: async () => json, text: async () => "" }; };
    const buf = (f) => { const b = fs.readFileSync(f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); };
    process.env.OPENAI_API_KEY = "k-openai"; process.env.ELEVENLABS_API_KEY = "k-eleven"; process.env.GEMINI_API_KEY = "k-gemini";
    try {
      await assert.rejects(() => N.synth("openai", "paid", { dir, fetch: fake(buf(wav)) }), /paid cloud call \(4 characters\)/);
      assert.equal(calls.length, 0, "no request without yes");
      const o = await N.synth("openai", "Hello openai", { dir, yes: true, voice: "nova", fetch: fake(buf(wav)), log: noop });
      assert.equal(calls[0].u, "https://api.openai.com/v1/audio/speech"); assert.equal(calls[0].init.headers.Authorization, "Bearer k-openai");
      assert.deepEqual(JSON.parse(calls[0].init.body), { model: "gpt-4o-mini-tts", voice: "nova", input: "Hello openai", response_format: "wav" }); assert.equal(wavInfo(o.file).sample_rate, "24000");
      const e = await N.synth("elevenlabs", "Hello eleven", { dir, yes: true, voice: "VOICEID", fetch: fake(buf(mp3)), log: noop });
      assert.match(calls[1].u, /text-to-speech\/VOICEID\?output_format=mp3_44100_128$/); assert.equal(calls[1].init.headers["xi-api-key"], "k-eleven"); assert.equal(JSON.parse(calls[1].init.body).text, "Hello eleven"); assert.ok(fs.existsSync(e.file));
      const g = await N.synth("gemini", "Hello gemini", { dir, yes: true, fetch: fake(null, { candidates: [{ content: { parts: [{ inlineData: { data: fs.readFileSync(pcm).toString("base64") } }] } }] }), log: noop });
      assert.match(calls[2].u, /gemini-2\.5-flash-preview-tts:generateContent$/); assert.equal(calls[2].init.headers["x-goog-api-key"], "k-gemini");
      assert.equal(JSON.parse(calls[2].init.body).contents[0].parts[0].text, "Hello gemini"); assert.ok(Number(wavInfo(g.file).duration) > 0.9);
      const again = await N.synth("openai", "Hello openai", { dir, yes: true, voice: "nova", fetch: async () => { throw new Error("cached takes must not call out"); }, log: noop }); assert.ok(again.cached);
      await assert.rejects(() => N.synth("gemini", "x", { dir, yes: true, fetch: fake(null, {}) , log: noop }), /no audio in the response/);
      did.push("openai", "elevenlabs", "gemini (injected fetch)");
    } finally { for (const k of ["OPENAI_API_KEY", "ELEVENLABS_API_KEY", "GEMINI_API_KEY"]) delete process.env[k]; }
  }
  ok("narrate", did.join(", "));
}

// ── brand ───────────────────────────────────────────────────────────────────
{
  const { inventory, check } = await imp("tools/p5-brand.mjs"), D = path.join(tmp, "brand"); fs.mkdirSync(path.join(D, "assets"), { recursive: true });
  assert.match(check(D)[0], /no brand\.json/);
  fs.writeFileSync(path.join(D, "brand.json"), JSON.stringify({ colors: { bg: "#777777", ink: "#888888", accent: "#zzz" }, logos: [{ file: "assets/gone-logo.svg", role: "icon" }] }));
  fs.writeFileSync(path.join(D, "assets", "wordmark.svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><rect width="400" height="100"/></svg>');
  ff("-f", "lavfi", "-i", "color=c=red:s=100x50", "-frames:v", "1", "-pix_fmt", "rgb24", path.join(D, "assets", "logo-small.png"));
  ff("-f", "lavfi", "-i", "color=c=red:s=600x300", "-frames:v", "1", path.join(D, "assets", "logo-photo.jpg"));
  const bad = check(D).join("\n");
  for (const re of [/ink on bg is contrast 1\.\d : 1/, /colors\.accent "#zzz"/, /wordmark\.svg: svg without a viewBox/, /logo-small\.png: 100px wide is too small/, /logo-small\.png: no transparency/, /logo-photo\.jpg: no transparency/, /lists assets\/gone-logo\.svg/]) assert.match(bad, re);
  const inv = inventory(D), by = (f) => inv.find((x) => x.file.endsWith(f));
  assert.equal(by("logo-photo.jpg").w, 600); assert.equal(by("logo-photo.jpg").h, 300); assert.equal(by("logo-photo.jpg").role, "lockup"); assert.equal(by("wordmark.svg").role, "wordmark"); assert.equal(by("logo-small.png").alpha, false); assert.equal(by("wordmark.svg").w, 400);
  // a good brand passes
  const G = path.join(tmp, "brand-good"); fs.mkdirSync(path.join(G, "brand"), { recursive: true });
  fs.writeFileSync(path.join(G, "brand.json"), JSON.stringify({ colors: { bg: "#ffffff", ink: "#111111", accent: "#e33" } }));
  fs.writeFileSync(path.join(G, "brand", "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>');
  ff("-f", "lavfi", "-i", "color=c=red@0.5:s=512x512,format=rgba", "-frames:v", "1", path.join(G, "brand", "mark.png"));
  assert.deepEqual(check(G), [], "a good brand has no problems: " + check(G));
  assert.equal(inventory(G).find((x) => x.file.endsWith("mark.png")).alpha, true); assert.equal(inventory(G).find((x) => x.file.endsWith("mark.png")).role, "icon");
  const c1 = CLI("brand", G, "check"), c2 = CLI("brand", D, "check"); assert.equal(c1.status, 0, c1.stdout + c1.stderr); assert.equal(c2.status, 1); assert.match(CLI("brand", G, "inventory").stdout, /icon\s+brand\/mark\.png/);
  ok("brand", `${inv.length} logos inventoried, 7 problem kinds found, good brand passes`);
}

// ── blur ────────────────────────────────────────────────────────────────────
{
  const B = await imp("tools/p5-blur.mjs"), d = path.join(tmp, "blur"); fs.mkdirSync(d);
  const px = (f) => spawnSync("ffmpeg", ["-v", "error", "-i", f, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgba", "-"], { encoding: "buffer" }).stdout;
  ff("-f", "lavfi", "-i", "color=black:s=8x8", "-frames:v", "1", path.join(d, "s1.png")); ff("-f", "lavfi", "-i", "color=white:s=8x8", "-frames:v", "1", path.join(d, "s2.png"));
  B.averageFrames(path.join(d, "s%d.png"), 2, path.join(d, "lin.png"), { linear: true }); B.averageFrames(path.join(d, "s%d.png"), 2, path.join(d, "gam.png"), { linear: false });
  const lin = px(path.join(d, "lin.png"))[0], gam = px(path.join(d, "gam.png"))[0];
  assert.ok(Math.abs(lin - 186) <= 2 && Math.abs(gam - 127) <= 2, `black + white: linear ${lin} (want 186), gamma ${gam} (the old 127)`);
  // alpha: an opaque black frame and a fully transparent white one average to black at alpha 128 (premultiplied, so the transparent white adds no colour)
  ff("-f", "lavfi", "-i", "color=black:s=8x8,format=rgba", "-frames:v", "1", path.join(d, "a1.png")); ff("-f", "lavfi", "-i", "color=white@0.0:s=8x8,format=rgba", "-frames:v", "1", path.join(d, "a2.png"));
  B.averageFrames(path.join(d, "a%d.png"), 2, path.join(d, "alpha.png"), { alpha: true, linear: true });
  const a = px(path.join(d, "alpha.png")); assert.ok(a[0] <= 2 && a[1] <= 2 && Math.abs(a[3] - 128) <= 3, `alpha average: ${[...a.slice(0, 4)]}`);
  // 8 samples of a sweep: a white box moving over black gets the sensor-like streak (the middle of its smear is brighter than gamma's)
  assert.deepEqual(B.blurSpec({}, "auto"), { shutter: 180, samples: 8, linear: true }); assert.deepEqual(B.blurSpec({}, "5"), { shutter: 180, samples: 5, linear: true });
  assert.throws(() => B.blurSpec({}, "1"), /--blur takes auto/); assert.throws(() => B.blurSpec({}, "x"), /--blur takes auto/);
  assert.equal(B.blurSpec({}), null); assert.deepEqual(B.blurSpec({ motionBlur: true }), { shutter: 180, samples: 8, linear: true }); assert.equal(B.blurSpec({ motionBlur: { linear: false } }).linear, false);
  assert.deepEqual(B.blurSpec({ motionBlur: { shutter: 90, samples: 4 } }), { shutter: 90, samples: 4, linear: true });
  assert.match(B.linearBlurFilter(8), /tmix=frames=8.*select=eq\(n\\,7\)/);
  ok("blur", `black + white: linear ${lin}, gamma ${gam}; alpha ${a[3]}`);
}

// ── formats + encodes ───────────────────────────────────────────────────────
{
  const F = await imp("tools/p5-formats.mjs"), { encode } = await imp("tools/renderers/pvk.mjs");
  assert.equal(F.sizeOf("9x16"), "1080x1920"); assert.equal(F.sizeOf("1200x628"), "1200x628"); assert.equal(F.sizeOf("4x5"), "1080x1350");
  assert.deepEqual(F.parseFormats("16x9,1200x628,1x1"), [{ name: "16x9", size: "1920x1080" }, { name: "1200x628", size: "1200x628" }, { name: "1x1", size: "1080x1080" }]);
  for (const bad of ["1201x628", "1200x627", "7x7", "9000x9000", "wide", "1200x", "12x"]) assert.throws(() => F.sizeOf(bad), /format|even|16 to 8192/, bad);
  const D = path.join(tmp, "enc"); fs.mkdirSync(path.join(D, "frames"), { recursive: true });
  ff("-f", "lavfi", "-i", "testsrc=d=1:s=1200x628:r=10", path.join(D, "frames", "frame_%05d.png"));
  fs.writeFileSync(path.join(D, "timeline.json"), JSON.stringify({ captions: [] }));
  const FPS = 10, made = {}, cwd = process.cwd();
  const P = { out: "out/film.mp4", output: { gifFps: 10 } };
  const old = process.env.REELWRIGHT_OUT_FORMAT;
  try {
    for (const fmt of ["mp4", "gif", "webm", "apng"]) { process.env.REELWRIGHT_OUT_FORMAT = fmt; encode(D, P, FPS, "frames/frame_%05d.png", 1); }
  } finally { old === undefined ? delete process.env.REELWRIGHT_OUT_FORMAT : (process.env.REELWRIGHT_OUT_FORMAT = old); process.chdir(cwd); }
  const info = (f) => { const s = probe(path.join(D, "out", f), "stream=codec_name,width,height,nb_frames,pix_fmt").streams[0]; made[f] = s; return s; };
  assert.equal(info("film.mp4").codec_name, "h264"); assert.equal(made["film.mp4"].width, 1200); assert.equal(made["film.mp4"].height, 628, "an arbitrary 1200x628 frame encodes to H.264");
  assert.equal(info("film.gif").codec_name, "gif"); assert.equal(made["film.gif"].width, 1200);
  assert.equal(info("film.webm").codec_name, "vp9"); assert.equal(made["film.webm"].height, 628);
  assert.equal(info("film.apng").codec_name, "apng"); assert.equal(made["film.apng"].width, 1200);
  // alpha: webm (yuva420p) and apng (rgba) keep a transparent corner
  ff("-f", "lavfi", "-i", "color=c=red@0.0:s=64x48:r=10,format=rgba,drawbox=x=8:y=8:w=24:h=24:color=blue@1:t=fill", "-t", "1", path.join(D, "a_%05d.png"));
  fs.mkdirSync(path.join(D, "aframes")); for (let i = 1; i <= 10; i++) fs.renameSync(path.join(D, `a_${String(i).padStart(5, "0")}.png`), path.join(D, "aframes", `frame_${String(i).padStart(5, "0")}.png`));
  const PA = { out: "outa/film.mp4", output: { alpha: true } };
  try { for (const fmt of ["webm", "apng", "gif"]) { process.env.REELWRIGHT_OUT_FORMAT = fmt; encode(D, PA, FPS, "aframes/frame_%05d.png", 1); } } finally { old === undefined ? delete process.env.REELWRIGHT_OUT_FORMAT : (process.env.REELWRIGHT_OUT_FORMAT = old); }
  const corner = (f) => spawnSync("ffmpeg", ["-v", "error", ...(f.endsWith(".webm") ? ["-c:v", "libvpx-vp9"] : []), "-i", path.join(D, "outa", f), "-frames:v", "1", "-vf", "crop=2:2:60:44", "-f", "rawvideo", "-pix_fmt", "rgba", "-"], { encoding: "buffer" }).stdout;
  for (const f of ["film.webm", "film.apng", "film.gif"]) assert.ok(corner(f)[3] < 40, `${f}: the transparent corner stays transparent (alpha ${corner(f)[3]})`);
  ok("formats", `named + WxH parse, 1200x628 mp4 ${made["film.mp4"].width}x${made["film.mp4"].height}, gif, webm (vp9), apng, alpha webm/apng/gif`);
}

// ── animimg ─────────────────────────────────────────────────────────────────
{
  const { extractAnimation } = await imp("tools/p5-animimg.mjs"), D = path.join(tmp, "anim"); fs.mkdirSync(D);
  for (const [i, c] of ["red", "green", "blue"].entries()) ff("-f", "lavfi", "-i", `color=c=${c}:s=48x32`, "-frames:v", "1", path.join(D, `f${i}.png`));
  fs.writeFileSync(path.join(D, "list.txt"), ["f0.png", "duration 0.1", "f1.png", "duration 0.3", "f2.png", "duration 0.2", "f2.png"].map((l, i) => (i % 2 ? l : `file '${l}'`)).join("\n"));
  ff("-f", "concat", "-safe", "0", "-i", path.join(D, "list.txt"), "-fps_mode", "vfr", path.join(D, "var.gif"));
  const m = extractAnimation(path.join(D, "var.gif"), path.join(D, "out"));
  // the container's own delays (a GIF stores them in 1/100 s and ffmpeg's concat muxing shifts the first by a frame tick): the point is that they come back unequal and in order
  assert.ok(m.frames.length >= 3 && m.frames.length === m.durations.length, JSON.stringify(m)); assert.ok(m.durations[1] > 2 * m.durations[0], "the 0.3 s frame is longer than the 0.1 s one: " + m.durations);
  assert.ok(Math.abs(m.durations[2] - 0.2) < 0.03 && Math.abs(m.total - 0.64) < 0.1, "frame 3 is 0.2 s, total about 0.6 s: " + JSON.stringify(m.durations));
  assert.equal(m.w, 48); assert.equal(m.h, 32); assert.ok(m.frames.every((f) => fs.existsSync(path.join(D, "out", f))));
  const thin = extractAnimation(path.join(D, "var.gif"), path.join(D, "out2"), { fps: 10, width: 24 }); assert.ok(thin.frames.length >= 5 && thin.durations.every((d) => d === 0.1), "fps thins/resamples: " + JSON.stringify(thin.durations));
  assert.throws(() => extractAnimation(path.join(D, "var.gif"), path.join(D, "out3"), { maxFrames: 2 }), /frames \(max 2\)/); assert.throws(() => extractAnimation(path.join(D, "nope.gif"), path.join(D, "o")), /no file/);
  const r = CLI("animimg", path.join(D, "var.gif"), path.join(D, "cli")); assert.equal(r.status, 0, r.stderr + r.stdout); assert.match(r.stdout, /\d frames, 0\.\d+s, 48x32/);
  assert.ok(fs.existsSync(path.join(D, "cli", "var.frames.json")));
  ok("animimg", `variable delays ${JSON.stringify(m.durations)}, fps/width thinning, CLI`);
}

// ── ship + gate commands on a tiny project ─────────────────────────────────
{
  const film = filmPage("proj-src", { dur: 4, body: `const b = KIT.el('div', '', S); KIT.css(b, { top: '40px', width: '60px', height: '60px', background: '#36c' }); const c = KIT.el('div', '', S, 'Read this for a moment ok'); KIT.css(c, { left: '30px', top: '200px' });
    KIT.start({ dur: 4, render: (t) => { b.style.left = (40 + t * 100).toFixed(2) + 'px'; } });` });
  const D = path.join(tmp, "proj"); fs.mkdirSync(path.join(D, "film"), { recursive: true }); fs.mkdirSync(path.join(D, "out"));
  fs.copyFileSync(film.file, path.join(D, "film", "index.html"));
  fs.writeFileSync(path.join(D, "project.json"), JSON.stringify({ width: 640, height: 360, renderer: "pvk", out: "out/film.mp4" }));
  ff("-f", "lavfi", "-i", "testsrc=d=2:s=64x48:r=10", "-f", "lavfi", "-i", "sine=d=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", path.join(D, "out", "film.mp4"));
  const g = CLI("gate", D, "--n", "6"); assert.equal(g.status, 0, g.stdout + g.stderr); assert.match(g.stdout, /PASS\s+determinism/); assert.match(g.stdout, /PASS\s+dead air/);
  let r = CLI("ship", D); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /unsigned/);
  let L = JSON.parse(fs.readFileSync(path.join(D, "ship.json"), "utf8"));
  assert.deepEqual(Object.keys(L.checks).sort(), ["p5-av-sync", "p5-dead-air", "p5-facts", "p5-motionscan", "p5-readtime", "p5-safe-zone"]); assert.equal(L.sha256.length, 64); assert.deepEqual(L.review, []);
  r = CLI("ship", D, "--sign", "Ann"); L = JSON.parse(fs.readFileSync(path.join(D, "ship.json"), "utf8")); assert.deepEqual(L.review, [{ by: "Ann", sha256: L.sha256 }]);
  r = CLI("ship", D); L = JSON.parse(fs.readFileSync(path.join(D, "ship.json"), "utf8")); assert.equal(L.review.length, 1, "a sign-off survives while the mp4 is the same bytes");
  ff("-f", "lavfi", "-i", "testsrc=d=2:s=64x48:r=10", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-y", path.join(D, "out", "film.mp4"));
  r = CLI("ship", D); L = JSON.parse(fs.readFileSync(path.join(D, "ship.json"), "utf8")); assert.deepEqual(L.review, [], "a re-render voids the sign-off");
  fs.rmSync(path.join(D, "out", "film.mp4")); assert.equal(CLI("ship", D).status, 1, "no mp4: exit 1");
  const stillFilm = filmPage("proj-still", { dur: 4, body: "KIT.start({ dur: 4, render() {} });" }); fs.copyFileSync(stillFilm.file, path.join(D, "film", "index.html"));
  assert.equal(CLI("gate", D, "--n", "4").status, 1, "a static film fails the gate command");
  ok("ship + gate commands", "ledger with sha256, sign-off valid only for the same bytes, gate exit codes");
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log("p5 tools self-check: ok");
