// node tools/selfcheck/p13-slideshow-panel.mjs — hyperframes:H5 (Slideshow), the studio half: the Slideshow tab of `reelwright studio` lists the
// project's folders of images and clips, builds slideshows/<name>/ through the `slideshow` command as a job (a click in a real browser),
// and the route keeps the trust boundary (no Origin 403, folder/name/transition/numbers outside their patterns 400, an existing name 409,
// nothing written outside the project). Offline: tiny example-hf copy with a fake voiceover.
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { tinyFilm, ROOT } from "../p13_fixture.mjs";
import { launch } from "../browser.mjs";

const f = tinyFilm(), dir = f.dir;
const freePort = () => new Promise((ok) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
const request = (port, { method = "GET", p = "/", headers = {}, body }) => new Promise((ok, no) => {
  const r = http.request({ host: "127.0.0.1", port, method, path: p, headers: { host: `localhost:${port}`, ...headers } }, (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => ok({ status: res.statusCode, body: b })); });
  r.on("error", no); r.end(body);
});
let server, browser;
try {
  fs.mkdirSync(path.join(dir, "photos")); fs.mkdirSync(path.join(dir, "empty"));
  for (const c of ["red", "green"]) assert.equal(spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", `color=c=${c}:s=160x90:d=1`, "-frames:v", "1", path.join(dir, "photos", `${c}.png`)]).status, 0);
  const port = await freePort(), origin = `http://localhost:${port}`;
  server = spawn(process.execPath, [path.join(ROOT, "bin/reelwright.mjs"), "studio", dir, "--port", String(port)], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PAGES: "2" } });
  let out = ""; server.stdout.on("data", (d) => (out += d)); server.stderr.on("data", (d) => (out += d));
  for (let i = 0; i < 300 && !out.includes(origin); i++) { assert.equal(server.exitCode, null, out); await new Promise((r) => setTimeout(r, 100)); }
  assert.ok(out.includes(origin), out);

  // the list: only folders that hold media, none of the film's own
  const list = JSON.parse((await request(port, { p: "/__slideshow" })).body);
  assert.deepEqual(list.folders, [{ name: "photos", images: 2, clips: 0 }]); assert.equal(list.size, "480x270"); assert.ok(list.transitions.includes("fade"));

  // trust boundary
  const json = { "content-type": "application/json" }, post = (b, h = { origin }) => request(port, { method: "POST", p: "/__slideshow", headers: { ...json, ...h }, body: JSON.stringify(b) });
  const ok = { folder: "photos", seconds: 1, tdur: 0.3, transition: "fade", name: "trip" };
  assert.equal((await post(ok, {})).status, 403, "no Origin");
  assert.equal((await post(ok, { origin: "http://evil.example" })).status, 403, "foreign Origin");
  assert.equal((await request(port, { method: "POST", p: "/__slideshow", headers: { origin }, body: JSON.stringify(ok) })).status, 415, "not application/json");
  for (const [what, patch] of Object.entries({ "path out of the project": { folder: "../" }, "absolute path": { folder: "/etc" }, "nested path": { folder: "photos/x" }, "dot folder": { folder: ".git" },
    "the film itself": { folder: "hf" }, "a folder with no media is fine to list but not a path": { folder: "no-such" }, "transition not in the list": { transition: "fade; rm -rf /" },
    "name with a slash": { name: "a/b" }, "name upper case": { name: "Trip" }, "seconds a string": { seconds: "1" }, "seconds too short": { seconds: 0.1 }, "tdur not shorter": { tdur: 1 }, "tdur negative": { tdur: -1 } }))
    assert.equal((await post({ ...ok, ...patch })).status, 400, what);
  assert.ok(!fs.existsSync(path.join(dir, "slideshows")), "nothing written by the refusals");

  // the real click: the tab, the form, the job, the files
  browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 800 } });
  await page.goto(origin);
  await page.waitForFunction(() => window.studioReady === true, null, { timeout: 60000 });
  await page.click('#tabs button[data-tab="slideshow"]');
  await page.waitForSelector("#ss-build");
  assert.match(await page.textContent("#tab-slideshow"), /photos \(2 images, 0 clips\)/);
  await page.fill('#tab-slideshow input[pattern]', "trip");
  await page.click("#ss-build");
  const made = path.join(dir, "slideshows", "trip");
  for (let i = 0; i < 200 && !fs.existsSync(path.join(made, "hf/film.js")); i++) await new Promise((r) => setTimeout(r, 100));
  assert.ok(fs.existsSync(path.join(made, "hf/film.js")), "the job built slideshows/trip");
  assert.deepEqual(fs.readdirSync(path.join(made, "hf/slides")), ["001-green.png", "002-red.png"]);
  assert.equal(JSON.parse(fs.readFileSync(path.join(made, "project.json"), "utf8")).width, 480, "the studio project's size is used");
  await page.waitForFunction(() => /created .*trip/.test(document.getElementById("log").textContent), null, { timeout: 30000 });
  assert.equal((await post(ok)).status, 409, "an existing name is refused");   // 409 either way: exists, or busy while the job ends
  assert.equal(fs.existsSync(path.join(dir, "photos", "trip")), false);
  assert.ok(!fs.readdirSync(path.dirname(dir)).some((n) => /trip/.test(n)), "nothing outside the project");
  console.log("p13-slideshow-panel: ok");
} finally { await browser?.close(); server?.kill(); await new Promise((r) => setTimeout(r, 300)); f.rm(); }
