// node tools/selfcheck/studio.mjs — `reelwright studio` on a copy of projects/example-hf (tracked files, plus a fake
// vo/lines.json with word timings so sched runs offline; no mix.wav) in a temp folder, driven with Playwright: the page
// loads, the vendored player becomes ready, the timeline shows the 4 VO lines; a gap edited in the UI is saved to
// project.json and the timeline moves; a style change rewrites theme.css; "Still at playhead" returns an image; and the
// trust boundary holds: POST without the studio's Origin (403), a foreign Host (403), path traversal (403), raw JSON that
// is not an object (refused, project.json unchanged). Needs python3, ffmpeg and a browser, no VO and no internet.
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "studio-")));
const dir = path.join(tmp, "film"), pj = path.join(dir, "project.json"), css = path.join(dir, "hf", "theme.css");
let server = null, browser = null, t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const freePort = () => new Promise((ok) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });

// one request with full control of the method, path, Host and headers (fetch won't let a script set Host)
const request = (port, { method = "GET", p = "/", host = `localhost:${port}`, headers = {}, body }) => new Promise((ok, no) => {
  const r = http.request({ host: "127.0.0.1", port, method, path: p, headers: { host, ...headers } }, (res) => {
    let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => ok({ status: res.statusCode, body: b }));
  });
  r.on("error", no); r.end(body);
});

try {
  const src = path.join(ROOT, "projects", "example-hf");
  fs.mkdirSync(path.join(dir, "hf"), { recursive: true }); fs.mkdirSync(path.join(dir, "vo"));
  fs.copyFileSync(path.join(src, "project.json"), pj);
  for (const f of ["index.html", "film.js", "blocks"]) fs.cpSync(path.join(src, "hf", f), path.join(dir, "hf", f), { recursive: true });
  // what tools/vo.py would write (tools/sched.py reads text and words): each line spoken at 0.3 s a word
  const P0 = JSON.parse(fs.readFileSync(pj, "utf8")), voiced = {};
  for (const l of P0.lines) {
    const words = l.text.split(" ").map((w, i) => ({ w, t: +(i * 0.3).toFixed(2), d: 0.25 }));
    voiced[l.id] = { text: l.text, key: "fake", dur: +(words.length * 0.3).toFixed(2), words };
  }
  fs.writeFileSync(path.join(dir, "vo", "lines.json"), JSON.stringify(voiced));

  // the real command: sched first, then the server
  const port = await freePort(), origin = `http://localhost:${port}`;
  server = spawn(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "studio", dir, "--port", String(port)], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  let out = ""; server.stdout.on("data", (d) => (out += d)); server.stderr.on("data", (d) => (out += d));
  for (let i = 0; i < 300 && !out.includes(origin); i++) { assert.equal(server.exitCode, null, `studio exited:\n${out}`); await new Promise((r) => setTimeout(r, 100)); }
  assert.ok(out.includes(origin), `studio did not start:\n${out}`);
  log("server up");

  // ── trust boundary (no browser needed) ──
  const same = fs.readFileSync(pj, "utf8");
  const json = { "content-type": "application/json" }, ok = JSON.stringify({ file: "project", text: same });
  assert.equal((await request(port, { method: "POST", p: "/__save", headers: json, body: ok })).status, 403, "POST without Origin");
  assert.equal((await request(port, { method: "POST", p: "/__save", headers: { ...json, origin: "http://evil.com" }, body: ok })).status, 403, "POST from another Origin");
  assert.equal((await request(port, { method: "POST", p: "/__run", headers: { ...json, origin: "http://evil.com" }, body: JSON.stringify({ cmd: "audio" }) })).status, 403, "job from another Origin");
  assert.equal((await request(port, { method: "POST", p: "/__save", headers: { origin, "content-type": "text/plain" }, body: ok })).status, 415, "POST as text/plain");
  assert.equal((await request(port, { method: "GET", p: "/__save" })).status, 405, "GET on a write route");
  assert.equal((await request(port, { host: "evil.com" })).status, 403, "Host evil.com");
  assert.equal((await request(port, { host: `localhost.evil.com:${port}`, p: "/__studio" })).status, 403, "Host localhost.evil.com");
  assert.equal((await request(port, { p: "/..%2f..%2f..%2f..%2f..%2f..%2f..%2fetc%2fpasswd" })).status, 403, "path traversal");
  assert.equal((await request(port, { p: "/tools/..%2f..%2f..%2f..%2f..%2f..%2f..%2f..%2fetc%2fpasswd" })).status, 403, "path traversal below tools/");
  assert.equal((await request(port, { p: "/.git/config" })).status, 403, "dot folder");
  // same-origin JSON that is not a project: refused with a reason, nothing written
  for (const text of ["[1,2,3]", "7", "null", "{\"lines\": 3}", "{\"lines\": [{\"id\": \"../x\", \"text\": \"a\"}]}", "{nope"]) {
    const r = await request(port, { method: "POST", p: "/__save", headers: { ...json, origin }, body: JSON.stringify({ file: "project", text }) });
    assert.equal(r.status, 400, `project.json = ${text} → ${r.status} ${r.body}`);
  }
  assert.equal((await request(port, { method: "POST", p: "/__save", headers: { ...json, origin }, body: JSON.stringify({ file: "brand", text: "[]" }) })).status, 400, "brand.json array");
  assert.equal((await request(port, { method: "POST", p: "/__save", headers: { ...json, origin }, body: JSON.stringify({ file: "../x", text: "{}" }) })).status, 400, "file outside the allow-list");
  assert.equal((await request(port, { method: "POST", p: "/__run", headers: { ...json, origin }, body: JSON.stringify({ cmd: "sh" }) })).status, 400, "command outside the allow-list");
  assert.equal((await request(port, { method: "POST", p: "/__run", headers: { ...json, origin }, body: JSON.stringify({ cmd: "stills", t: "1; rm -rf /" }) })).status, 400, "non-numeric t");
  assert.equal(fs.readFileSync(pj, "utf8"), same, "project.json changed by a refused request");
  assert.ok(!fs.existsSync(path.join(dir, "brand.json")), "brand.json written by a refused request");
  log("security: ok");

  // ── the page ──
  browser = await launch(["--force-device-scale-factor=1"]);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], foreign = new Set();
  let navs = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => { if (!r.url().startsWith(origin)) foreign.add(r.url()); });
  page.on("load", () => navs++);
  const loaded = () => page.waitForFunction(() => window.studioReady === true, null, { timeout: 30000 });
  // a save reloads the page when sched is done; give a second reload (there must not be one) time to show
  const reloads = async (action) => { const nav = page.waitForEvent("load", { timeout: 30000 }); await action(); await nav; await loaded(); await page.waitForTimeout(800); await loaded(); };
  await page.goto(origin + "/"); await loaded();
  assert.equal(await page.evaluate(() => document.getElementById("film").ready), true, "player ready");
  assert.equal(await page.locator("#tl-vo .box").count(), 4, "4 VO boxes");
  assert.ok(await page.locator("#tl-beats .tick").count() > 10, "beat ticks");
  assert.ok(await page.locator("#tl-sfx .tick").count() > 0, "SFX cues");
  assert.equal(await page.locator("#tl-scenes .box").count(), 4, "4 scenes");
  const start = async (id) => Number(await page.locator(`#tl-vo .box[data-id="${id}"]`).getAttribute("data-start"));
  const before = await start("chart"), hookBefore = await start("hook");
  log(`page ready, chart starts at ${before}`);

  // seek: click the timeline, then one frame with the arrow key
  const lanes = await page.locator("#lanes").boundingBox();
  await page.mouse.click(lanes.x + lanes.width * 0.5, lanes.y + 8);
  const clock = () => page.locator("#clock").textContent();
  const c1 = await clock(); assert.ok(/frame (1[6-9]\d|[2-9]\d\d)/.test(c1) || c1.includes("frame"), c1);
  await page.keyboard.press("ArrowRight");
  const frame = (s) => Number(/frame (\d+)/.exec(s)[1]);
  assert.equal(frame(await clock()), frame(c1) + 1, "ArrowRight is one frame");

  // edit a line's gap and text in the inspector, save: project.json changes, the timeline moves, "re-voice" shows
  await page.locator('#tl-vo .box[data-id="chart"]').click();
  await page.fill("#sel-gap", "2");
  await page.fill("#sel-text", "Every chart grows on the beat, twice.");
  await reloads(() => page.click("#save-inspector"));
  const P1 = JSON.parse(fs.readFileSync(pj, "utf8")), chart = P1.lines.find((l) => l.id === "chart");
  assert.equal(chart.gap, 2, "gap saved"); assert.equal(chart.text, "Every chart grows on the beat, twice.");
  assert.equal(P1.lines.length, 4); assert.equal(P1.style, "dark-tech", "other fields kept");
  const after = await start("chart");
  assert.ok(after > before + 1, `timeline moved: ${before} → ${after}`);
  assert.equal(await start("hook"), hookBefore, "earlier lines stay put");
  assert.equal(await page.locator("#revoice").isVisible(), true, "re-voice offered after a text change");
  assert.equal(await page.locator("#btn-audio").isEnabled(), true);
  assert.match(await page.locator("#btn-audio").textContent(), /network/, "the audio button says it needs the network");
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith(".tmp")), [], "no tmp file left behind");
  log(`gap/text saved, chart now at ${after}`);

  // style: theme.css is rewritten
  const css0 = fs.readFileSync(css, "utf8");
  const options = await page.locator("#style option").evaluateAll((o) => o.map((x) => x.value));
  const other = options.find((s) => s && s !== P1.style);
  await page.selectOption("#style", other);
  await reloads(() => page.click("#save-inspector"));
  assert.equal(JSON.parse(fs.readFileSync(pj, "utf8")).style, other);
  assert.notEqual(fs.readFileSync(css, "utf8"), css0, "theme.css changed with the style");
  log(`style → ${other}`);

  // raw JSON that is not an object: refused in the page, file untouched
  const keep = fs.readFileSync(pj, "utf8");
  await page.fill("#raw-project", "[1, 2, 3]");
  await page.click("#save-raw-project");
  await page.waitForFunction(() => /must be a JSON object/.test(document.getElementById("status").textContent));
  assert.equal(fs.readFileSync(pj, "utf8"), keep, "project.json unchanged after a refused raw save");

  // still at the playhead: an image comes back, and the render's own file writes don't reload the page
  const n = navs;
  await page.click("#btn-still");
  await page.waitForFunction(() => document.getElementById("stillbox").classList.contains("show") && document.getElementById("still").naturalWidth > 0, null, { timeout: 150000 });
  const img = await page.locator("#still").getAttribute("src");
  const r = await request(port, { p: img });
  assert.equal(r.status, 200); assert.ok(/^\/__p\/stills\/t[\d.]+\.jpg/.test(img), img);
  await page.waitForTimeout(1200);
  assert.equal(navs, n, "the page reloaded during a still");
  log(`still: ${img}`);

  assert.deepEqual(errors, [], "page errors");
  assert.deepEqual([...foreign], [], "requests outside the studio (the player must not fetch its runtime)");
  console.log("studio self-check: ok");
} catch (e) {
  console.error("studio self-check FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  if (server && server.exitCode === null) { server.kill(); await new Promise((r) => setTimeout(r, 300)); }
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  log("done");
}
