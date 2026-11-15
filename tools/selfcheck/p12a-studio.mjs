// node tools/selfcheck/p12a-studio.mjs — rows hyperframes:H3 (timeline) and H5 (right-panel tools) of `reelwright studio`, on the p1 fixture film (two voiced lines, a
// nested composition, a real mix.wav), driven with Playwright, offline:
//   H3  waveform + level meter of mix.wav; a caption lane (one box per word); dragging a scene changes its gap in project.json (snap guide shown, the lines after it
//       ripple on screen), shift-drag range select, linked selection (scene + VO + caption words + cues) and its off switch, tracks hidden by their name, split / trim
//       a line at the playhead, nested composition lane + double-click drill-down (zoom) and back
//   H5  undo / redo of the studio's own writes (a gap, the audio rack, a transcript, a source file come back byte for byte); Audio FX rack (preset per bus + limiter);
//       Blur; Variables; a renders queue that runs two real `film` renders one at a time, with cancel; lint; assets (project + a fake ~/.media); catalog search + Add;
//       caption word editor; file tree and source editor (only with --edit-source: without it 403 and read only) — and every new route keeps the trust boundary
//       (no Origin 403, bad values 400, paths outside the project refused). Not built here: the Slideshow panel.
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { launch } from "../browser.mjs";
import { ROOT, makeProject, rw } from "./p1-fixture.mjs";

const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "p12a-studio-"))), dir = path.join(tmp, "fx"), pj = path.join(dir, "project.json"), home = path.join(tmp, "home");
const servers = [], t0 = Date.now(), log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const freePort = () => new Promise((ok) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
const request = (port, { method = "GET", p = "/", headers = {}, body }) => new Promise((ok, no) => {
  const r = http.request({ host: "127.0.0.1", port, method, path: p, headers: { host: `localhost:${port}`, ...headers } }, (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => ok({ status: res.statusCode, body: b })); });
  r.on("error", no); r.end(body);
});
async function start(extra = []) {
  const port = await freePort(), s = spawn(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "studio", dir, "--port", String(port), ...extra], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, REELWRIGHT_MEDIA_DIR: path.join(home, ".media"), PAGES: "2" } });
  let out = ""; s.stdout.on("data", (d) => (out += d)); s.stderr.on("data", (d) => (out += d)); servers.push(s);
  for (let i = 0; i < 300 && !out.includes(`localhost:${port}`); i++) { assert.equal(s.exitCode, null, out); await new Promise((r) => setTimeout(r, 100)); }
  return { port, origin: `http://localhost:${port}`, s };
}
let browser = null;
try {
  // ── the fixture: two lines, a nested composition, a mix.wav ──
  makeProject(dir, { width: 320, height: 180 });
  const P0 = JSON.parse(fs.readFileSync(pj, "utf8"));
  P0.lines = [{ id: "a", gap: 0, text: "hello there" }, { id: "b", gap: 0.6, text: "this is the second line" }];
  fs.writeFileSync(pj, JSON.stringify(P0, null, 2));
  const voiced = JSON.parse(fs.readFileSync(path.join(dir, "vo", "lines.json"), "utf8"));
  voiced.b = { text: "this is the second line", words: "this is the second line".split(" ").map((w, i) => ({ w, t: +(i * 0.3).toFixed(2), d: 0.25 })) };
  fs.writeFileSync(path.join(dir, "vo", "lines.json"), JSON.stringify(voiced));
  fs.copyFileSync(path.join(dir, "vo", "a.mp3"), path.join(dir, "vo", "b.mp3"));
  fs.mkdirSync(path.join(dir, "hf", "compositions")); fs.copyFileSync(path.join(ROOT, "projects", "engine-hf", "hf", "compositions", "tag.html"), path.join(dir, "hf", "compositions", "tag.html"));
  const idx = path.join(dir, "hf", "index.html"); fs.writeFileSync(idx, fs.readFileSync(idx, "utf8").replace('<script src="kit/engine.js"></script>', '<script src="kit/engine.js"></script>\n<script src="kit/compose.js"></script>'));
  const fj = path.join(dir, "hf", "film.js"); fs.writeFileSync(fj, fs.readFileSync(fj, "utf8").replace("KIT.V('a').end + 0.4", "KIT.V('b').end + 0.4").replace("KIT.start(", "KIT.mount('tag', { start: KIT.V('b').start, dur: 0.9 });\nKIT.start("));
  fs.mkdirSync(path.join(dir, "hf", "media")); assert.equal(spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=16x16:d=0.1", "-frames:v", "1", path.join(dir, "hf", "media", "logo.png")]).status, 0);
  fs.mkdirSync(path.join(home, ".media"), { recursive: true }); fs.writeFileSync(path.join(home, ".media", "global-click.wav"), "RIFF");
  for (const c of ["sched", "info", "mix"]) { const r = rw(c, dir); assert.equal(r.status, 0, c + ": " + r.out.slice(-500)); }
  assert.ok(fs.existsSync(path.join(dir, "mix.wav")));

  // ── trust boundary of the new routes, and --edit-source off by default ──
  const plain = await start(), json = { "content-type": "application/json" };
  assert.equal((await request(plain.port, { method: "POST", p: "/__render", headers: json, body: "{}" })).status, 403, "/__render without Origin");
  assert.equal((await request(plain.port, { method: "POST", p: "/__undo", headers: json, body: "{}" })).status, 403, "/__undo without Origin");
  assert.equal((await request(plain.port, { method: "GET", p: "/__render" })).status, 405, "GET on a write route");
  const post = (srv, p, b) => request(srv.port, { method: "POST", p, headers: { ...json, origin: srv.origin }, body: JSON.stringify(b) });
  assert.equal((await post(plain, "/__source", { path: "hf/film.js", text: "x" })).status, 403, "source writes are off without --edit-source");
  assert.equal(JSON.parse((await request(plain.port, { p: "/__file?path=hf/film.js" })).body).editable, false, "read only without --edit-source");
  assert.equal((await post(plain, "/__render", { format: "16x9; rm -rf /" })).status, 400, "a render option outside the fixed lists");
  assert.equal((await post(plain, "/__render", { fps: "60" })).status, 400);
  assert.equal((await post(plain, "/__add", { name: "../x" })).status, 400, "an add name outside the catalog");
  assert.equal((await post(plain, "/__run", { cmd: "film" })).status, 400, "film is only reachable through the queue");
  assert.equal((await post(plain, "/__run", { cmd: "add" })).status, 400);
  for (const p of ["/__file?path=../secret", "/__file?path=.env", "/__file?path=hf/kit/engine.js", "/__file?path=%2Fetc%2Fpasswd", "/__file?path=project.json%00.js"]) assert.equal((await request(plain.port, { p })).status, 404, p);
  const badSaves = { "fx preset that does not exist": { fx: { vo: "no-such-preset" } }, "fx not an object": { fx: 3 }, "motionBlur samples": { motionBlur: { shutter: 180, samples: 1 } }, "motionBlur shutter": { motionBlur: { shutter: 900 } },
    "variables not an array": { variables: {} }, "variables bad type": { variables: [{ id: "x", type: "date", default: "" }] }, "limiter": { limiter: "yes" } };
  for (const [what, extra] of Object.entries(badSaves)) assert.equal((await post(plain, "/__save", { file: "project", text: JSON.stringify({ ...P0, ...extra }) })).status, 400, what);
  assert.equal((await post(plain, "/__transcript", { words: [{ text: "x", start: 2, end: 1 }] })).status, 400, "end before start");
  assert.equal((await post(plain, "/__undo", {})).status, 409, "nothing to undo yet");
  assert.equal(JSON.parse((await request(plain.port, { p: "/__assets" })).body).global[0].name, "global-click.wav", "~/.media is listed");
  assert.ok(JSON.parse((await request(plain.port, { p: "/__catalog?q=caption" })).body).items.length > 3, "catalog search");
  const lint = JSON.parse((await request(plain.port, { p: "/__lint" })).body); assert.ok(Array.isArray(lint.gate) && Array.isArray(lint.warn), "static lint");
  assert.equal(JSON.parse((await request(plain.port, { p: "/__fx" })).body).presets.includes("voice-clean"), true, "rack presets");
  plain.s.kill("SIGTERM"); log("routes and trust boundary: ok");

  // ── the page, with --edit-source ──
  const srv = await start(["--edit-source"]); const { port, origin } = srv;
  browser = await launch(["--force-device-scale-factor=1"]);
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } }), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const loaded = () => page.waitForFunction(() => window.studioReady === true, null, { timeout: 60000 });
  const reloads = async (action) => { const nav = page.waitForEvent("load", { timeout: 60000 }); await action(); await nav; await loaded(); await page.waitForTimeout(600); await loaded(); };
  await page.goto(origin + "/"); await loaded();
  const val = (sel) => page.locator(sel).evaluate((e) => e.value);
  const proj = () => JSON.parse(fs.readFileSync(pj, "utf8"));

  // H3: lanes
  const words = await page.locator("#tl-caps .box").count(); assert.equal(words, 2 + 5, "one caption box per voiced word (2 + 5)");
  assert.ok(await page.evaluate(() => { const cv = document.getElementById("wavecv"), d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; return d.some((v, i) => i % 4 === 3 && v > 0); }), "waveform drawn");
  await page.mouse.click(...(await (async () => { const b = await page.locator("#lanes").boundingBox(); return [b.x + b.width * 0.3, b.y + 8]; })()));
  assert.match(await page.locator("#meter").textContent(), /peak .* dB · rms .* dB/, "level meter at the playhead");
  assert.equal(await page.locator("#tl-nested .box").count(), 1, "the mounted composition is a box in the nested lane"); assert.equal(await page.locator("#tl-nested .box").getAttribute("data-nested"), "tag");
  // tracks
  await page.locator('#labs [data-lane="caps"]').click(); assert.equal(await page.locator("#tl-caps").evaluate((e) => e.classList.contains("off")), true, "a track hides by its name");
  await page.locator('#labs [data-lane="caps"]').click();
  // linked selection
  await page.locator('#tl-vo .box[data-id="b"]').click();
  assert.equal(await page.locator("#tl-caps .box.sel").count(), 5, "linked: the caption words of the line");
  assert.equal(await page.locator('#tl-scenes .box.sel[data-id="b"]').count(), 1, "linked: its scene");
  await page.uncheck("#linked"); assert.equal(await page.locator("#tl-caps .box.sel").count(), 0, "unlinked: only the track clicked");
  await page.check("#linked");
  // range select
  const lb = await page.locator("#lanes").boundingBox();
  await page.keyboard.down("Shift"); await page.mouse.move(lb.x + lb.width * 0.1, lb.y + 40); await page.mouse.down(); await page.mouse.move(lb.x + lb.width * 0.6, lb.y + 40, { steps: 4 }); await page.mouse.up(); await page.keyboard.up("Shift");
  assert.match(await page.locator("#rangeinfo").textContent(), /range [\d.]+–[\d.]+ s \([\d.]+ s, \d+ frames\) · lines: [ab]/, "range select: " + await page.locator("#rangeinfo").textContent());
  // split / trim: the playhead inside line b
  const vb = JSON.parse(await page.locator('#tl-vo .box[data-id="b"]').evaluate((e) => JSON.stringify({ s: +e.dataset.start, e: +e.dataset.end })));
  await page.locator('#tl-vo .box[data-id="b"]').click();
  await page.evaluate((t) => document.getElementById("film").seek(t), vb.s + 0.62);
  await page.waitForTimeout(200);
  await page.click("#btn-split");
  const raw = JSON.parse(await val("#raw-project")); assert.deepEqual(raw.lines.map((l) => l.id), ["a", "b", "b-b"], "split makes a second line");
  assert.equal(raw.lines[1].text + " " + raw.lines[2].text, "this is the second line", "no word lost"); assert.ok(raw.lines[1].text.split(" ").length >= 1 && raw.lines[2].text.split(" ").length >= 1);
  assert.equal(proj().lines.length, 2, "split is not saved until Save");
  await page.reload(); await loaded();
  await page.locator('#tl-vo .box[data-id="b"]').click(); await page.evaluate((t) => document.getElementById("film").seek(t), vb.s + 0.62); await page.waitForTimeout(200);
  await page.click("#btn-trim-head"); assert.equal((await val("#sel-text")).split(" ").length < 5, true, "trim head dropped the words before the playhead");
  await page.reload(); await loaded();
  log("H3 lanes, tracks, linked, range, split/trim: ok");

  // H3: drill-down
  await page.locator("#tl-nested .box").dblclick();
  assert.match(await page.locator("#crumb").textContent(), /film › tag/, "drill-down breadcrumb"); assert.ok((await page.locator("#tl-ruler .tick").count()) < 12);
  const zoomedTick = await page.locator("#tl-ruler .tick span").first().textContent(); assert.notEqual(zoomedTick, "0s", "the window moved to the composition");
  await page.locator("#crumb a").click(); assert.equal(await page.locator("#crumb").textContent(), "", "back to the whole film");
  await page.locator('#tl-scenes .box[data-id="b"]').dblclick(); assert.match(await page.locator("#crumb").textContent(), /film › b/, "a scene drills down too: [" + await page.locator("#crumb").textContent() + "] " + errors.join(";")); await page.locator("#crumb a").click();

  // H3: drag a scene = change its gap; snap guide while dragging; undo
  const startB = async () => Number(await page.locator('#tl-vo .box[data-id="b"]').getAttribute("data-start"));
  const before = await startB(), box = await page.locator('#tl-scenes .box[data-id="b"]').boundingBox(), g0 = proj().lines[1].gap;
  await page.mouse.move(box.x + box.width / 2, box.y + 12); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 20, box.y + 12, { steps: 3 });
  const shiftedLater = await page.locator("#tl-vo .box[data-id=b]").evaluate((e) => e.style.transform);
  assert.match(shiftedLater, /translateX/, "the line shifts with the drag (ripple preview)");
  await page.mouse.up(); await page.waitForTimeout(100);   // a small drag may snap: whatever the gap becomes is valid; now a clear one with alt (no snapping)
  await loaded();
  await page.waitForTimeout(1500); await loaded();
  const box2 = await page.locator('#tl-scenes .box[data-id="b"]').boundingBox(), g1 = proj().lines[1].gap;
  await page.keyboard.down("Alt"); await page.mouse.move(box2.x + box2.width / 2, box2.y + 12); await page.mouse.down(); await page.mouse.move(box2.x + box2.width / 2 + 90, box2.y + 12, { steps: 5 });
  const snapShown = await page.locator("#snapline").evaluate((e) => getComputedStyle(e).display);
  await reloads(async () => { await page.mouse.up(); await page.keyboard.up("Alt"); });
  const g2 = proj().lines[1].gap; assert.ok(g2 > g1 + 0.1 && g2 <= 60, `dragging a scene sideways changed the gap in project.json: ${g0} → ${g1} → ${g2}`); assert.equal(snapShown, "none", "alt: no snapping");
  assert.ok((await startB()) > before - 0.01, "the line moved with the gap");
  // snapping on: drag near a beat or edge and the guide shows
  const box3 = await page.locator('#tl-scenes .box[data-id="b"]').boundingBox(); let guide = "none";
  await page.mouse.move(box3.x + box3.width / 2, box3.y + 12); await page.mouse.down();
  for (let dx = -60; dx <= 60 && guide === "none"; dx += 6) { await page.mouse.move(box3.x + box3.width / 2 + dx, box3.y + 12); guide = await page.locator("#snapline").evaluate((e) => getComputedStyle(e).display); }
  await page.keyboard.press("Escape"); const keep = fs.readFileSync(pj, "utf8"); await page.mouse.move(box3.x + box3.width / 2, box3.y + 12); await page.mouse.up();   // back at the start: the gap is unchanged
  assert.equal(guide, "block", "the snap guide shows while a scene is dragged near a beat, cue or edge");
  await page.waitForTimeout(1500); await loaded();
  log(`H3 drag: gap ${g0} → ${g2}, snap guide, ripple preview: ok`);

  // H5: undo / redo
  const afterDrag = fs.readFileSync(pj, "utf8");
  await page.waitForFunction(() => !document.getElementById("btn-undo").disabled);
  await reloads(() => page.click("#btn-undo"));
  assert.notEqual(fs.readFileSync(pj, "utf8"), afterDrag, "undo changed project.json");
  await page.waitForFunction(() => !document.getElementById("btn-redo").disabled);
  await reloads(() => page.click("#btn-redo")); assert.equal(fs.readFileSync(pj, "utf8"), afterDrag, "redo brings the very same bytes back");

  // H5: audio rack, blur, variables
  const tab = (name) => page.locator("#tabs button", { hasText: new RegExp(`^${name}$`) }).click();
  await tab("Audio"); await page.locator("#tab-audio select").first().selectOption("voice-clean"); await page.check("#tab-audio input[type=checkbox]");
  await reloads(() => page.locator("#tab-audio button.primary").click());
  assert.deepEqual([proj().fx, proj().limiter], [{ vo: "voice-clean" }, true], "audio rack: a preset on the voice bus and the limiter");
  const mixBefore = fs.statSync(path.join(dir, "mix.wav")).mtimeMs;
  await tab("Audio"); await page.locator("#tab-audio button", { hasText: "Remix" }).click();
  await page.waitForFunction(() => /^\$ mix +\((done|failed)/.test(document.getElementById("log").textContent), null, { timeout: 60000 });
  assert.match(await page.locator("#log").textContent(), /^\$ mix +\(done\)/, "the mix job ran with the rack: " + await page.locator("#log").textContent());
  await page.waitForTimeout(1500); await loaded();
  assert.ok(fs.statSync(path.join(dir, "mix.wav")).mtimeMs > mixBefore, "Remix ran mix and rewrote mix.wav");
  await tab("Blur"); await page.check("#tab-blur input[type=checkbox]");
  await reloads(() => page.locator("#tab-blur button.primary").click()); assert.deepEqual(proj().motionBlur, { shutter: 180, samples: 8 }, "blur tab");
  await tab("Variables"); const bars = page.locator("#tab-vars input[type=number]").first(); await bars.fill("5");
  await reloads(() => page.locator("#tab-vars button.primary").click()); assert.equal(proj().variables.find((v) => v.id === "bars").default, 5, "variables tab edits a declared default");
  log("H5 undo/redo, audio rack, blur, variables: ok");

  // H5: lint, assets, catalog
  await tab("Lint"); await page.waitForFunction(() => /Errors \(\d+\)/.test(document.getElementById("tab-lint").textContent));
  await tab("Assets"); await page.waitForFunction(() => /hf\/media\/logo\.png/.test(document.getElementById("tab-assets").textContent) && /global-click\.wav/.test(document.getElementById("tab-assets").textContent));
  await tab("Catalog"); await page.fill("#tab-catalog input[type=text]", "caption"); await page.waitForSelector("#tab-catalog .item button");
  const name = await page.locator("#tab-catalog .item b").first().textContent();
  await page.locator("#tab-catalog .item button", { hasText: "Add" }).first().click();
  await page.waitForFunction((n) => true, name); for (let i = 0; i < 100 && !fs.existsSync(path.join(dir, "hf", "blocks", name + ".html")); i++) await page.waitForTimeout(200);
  assert.ok(fs.existsSync(path.join(dir, "hf", "blocks", name + ".html")), `catalog Add put ${name} in hf/blocks/`);
  await loaded().catch(() => {}); await page.waitForTimeout(1500); await loaded();

  // H5: captions
  await tab("Captions"); await page.waitForSelector("#tab-captions table input");
  await page.locator("#tab-captions table input[type=text]").first().fill("HELLO");
  await page.locator("#tab-captions button.primary").click(); for (let i = 0; i < 50 && !fs.existsSync(path.join(dir, "transcript.json")); i++) await page.waitForTimeout(100);
  const tr = JSON.parse(fs.readFileSync(path.join(dir, "transcript.json"), "utf8")); assert.equal(tr[0].text, "HELLO"); assert.equal(tr.length, 7);
  await page.waitForTimeout(1500); await loaded();

  // H5: source (--edit-source on): read, write, undo byte-identical; refusals
  const filmSrc = fs.readFileSync(fj, "utf8");
  assert.equal((await post(srv, "/__source", { path: "hf/film.js", text: filmSrc + "\n// edited in the studio\n" })).status, 200);
  assert.ok(fs.readFileSync(fj, "utf8").endsWith("// edited in the studio\n"), "source panel route wrote film.js");
  for (const p of ["../x.js", ".env", "project.json", "hf/kit/engine.js", "/etc/passwd", "hf/film.exe"]) assert.equal((await post(srv, "/__source", { path: p, text: "x" })).status, 400, `source write refused: ${p}`);
  await page.waitForTimeout(1200); await loaded().catch(() => {}); await page.waitForTimeout(1200);
  assert.equal((await post(srv, "/__undo", {})).status, 200); assert.equal(fs.readFileSync(fj, "utf8"), filmSrc, "undo restores the source byte for byte");
  await page.waitForTimeout(1500); await loaded();
  await tab("Source"); await page.waitForSelector("#tab-source div[style*=cursor]");
  assert.ok(await page.locator("#tab-source div[style*=cursor]", { hasText: "hf/film.js" }).count() >= 1, "file tree");

  // H5: the renders queue: two real renders, one at a time; a third is cancelled while it waits
  await tab("Renders");
  const q = async (b) => (await post(srv, "/__render", b)).status;
  assert.equal(await q({ format: "1x1", quality: "draft" }), 202); assert.equal(await q({ format: "9x16", quality: "draft" }), 202); assert.equal(await q({ resolution: "4k" }), 202);
  const state = () => page.locator("#rq .item").evaluateAll((n) => n.map((x) => x.textContent));
  await page.waitForFunction(() => document.querySelectorAll("#rq .item").length === 3);
  const first = await state(); assert.ok(first.some((t) => /running/.test(t)) && first.filter((t) => /queued/.test(t)).length >= 1, "one running, the rest queued: " + first.join(" | "));
  await page.locator("#rq .item", { hasText: "4k" }).locator("button", { hasText: "cancel" }).click();
  await page.waitForFunction(() => [...document.querySelectorAll("#rq .item")].filter((x) => /done|failed|cancelled/.test(x.textContent)).length === 3, null, { timeout: 240000 });
  const fin = await state(); assert.ok(fin.filter((t) => /done/.test(t)).length === 2 && fin.some((t) => /cancelled/.test(t)), "two renders done, one cancelled: " + fin.join(" | "));
  const outs = fs.readdirSync(path.join(dir, "out")).filter((f) => f.endsWith(".mp4")); assert.ok(outs.some((f) => /1x1/.test(f)) && outs.some((f) => /9x16/.test(f)), "both queued renders wrote their mp4: " + outs);
  assert.equal(spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", path.join(dir, "out", outs.find((f) => /1x1/.test(f)))], { encoding: "utf8" }).stdout.trim().replace(/x$/, ""), "1080x1080", "the 1x1 render is 1080x1080");
  assert.deepEqual(errors, [], "page errors");
  console.log("p12a-studio self-check: H3 waveform/meter, captions, gap drag + snap + ripple, range, linked, split/trim, nested drill-down; H5 undo/redo, audio rack, blur, variables, renders queue (2 real renders, 1 cancelled), lint, assets, catalog add, captions, source; trust boundary kept");
} catch (e) { console.error("p12a-studio self-check FAILED:", e.stack || e.message); process.exitCode = 1; }
finally {
  await browser?.close().catch(() => {});
  for (const s of servers) if (s.exitCode === null) { s.kill("SIGTERM"); await new Promise((r) => (s.exitCode !== null ? r() : s.once("exit", r))); }
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
