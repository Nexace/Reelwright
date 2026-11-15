// node tools/selfcheck/p15-studio-agent.mjs — remotion:2.8.1, the MCP-free equivalent of Remotion Studio's WebMCP tools: POST /__agent on the studio server and
// `reelwright studio <project> look|inspect|select|set-style|frame|state`. Offline, a tiny example-hf copy (fake voiceover), a real studio server and browser:
//   frame moves the agent's playhead (an open tab follows it); look is a real PNG at that time, differing between two times, or one element's box; inspect gives
//   box + computed style + the script line; select by line / selector; set-style is an overlay that shows in look and inspect and in an open tab, is not saved,
//   and is cleared by --reset; with --edit-source (studio and command) it appends one rule to the film's <style>, undoable; and the studio's trust boundary
//   holds for the new route (Host, Origin, JSON, a fixed cmd list, values validated, no url() / braces, GET refused).
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { tinyFilm, ROOT } from "../p13_fixture.mjs";
import { launch } from "../browser.mjs";
import { callAgent, SUBS } from "../commands/studio.mjs";
import { CMDS } from "../studio/agent.mjs";

assert.deepEqual([...SUBS].sort(), [...CMDS].sort(), "the CLI and the route know the same commands");
const f = tinyFilm(), servers = [];
const freePort = () => new Promise((ok) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
async function start(...extra) {
  const port = await freePort(), c = spawn(process.execPath, [path.join(ROOT, "bin/reelwright.mjs"), "studio", f.dir, "--port", String(port), ...extra], { cwd: ROOT });
  let out = ""; servers.push(c); c.stdout.on("data", (d) => (out += d)); c.stderr.on("data", (d) => (out += d));
  for (let i = 0; i < 300 && !out.includes(`localhost:${port}`); i++) { assert.equal(c.exitCode, null, out); await new Promise((r) => setTimeout(r, 100)); }
  return { port, c };
}
const cli = (port, ...a) => spawnSync(process.execPath, [path.join(ROOT, "bin/reelwright.mjs"), "studio", f.dir, ...a, "--port", String(port)], { cwd: ROOT, encoding: "utf8" });
const json = (r) => { assert.equal(r.status, 0, r.stdout + r.stderr); return JSON.parse(r.stdout); };
const raw = (port, { method = "POST", headers = {}, body = "{}" } = {}) => new Promise((ok, no) => {
  const r = http.request({ host: "127.0.0.1", port, method, path: "/__agent", headers: { host: `localhost:${port}`, ...headers } }, (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => ok({ status: res.statusCode, body: b })); });
  r.on("error", no); r.end(body);
});
let browser;
try {
  const { port } = await start();
  const O = `http://localhost:${port}`, JSONH = { origin: O, "content-type": "application/json" };

  // ── frame, state ──
  const s0 = json(cli(port, "state"));
  assert.equal(s0.fps, 10); assert.equal(s0.t, 0); assert.deepEqual(s0.overlay, []); assert.equal(s0.editSource, false);
  assert.equal(json(cli(port, "frame", "--t", "2")).t, 2);
  const fr = json(cli(port, "frame", "--frame", "35")); assert.equal(fr.t, 3.5); assert.equal(fr.frame, 35);
  const far = cli(port, "frame", "--t", "9999"); assert.equal(far.status, 1); assert.match(far.stderr, /inside the film/);

  // ── look: a real PNG; the film changes between two times; one element's box ──
  const a = path.join(f.dir, "a.png"), b = path.join(f.dir, "b.png"), c = path.join(f.dir, "c.png");
  const la = json(cli(port, "look", "--t", "0.5", "--out", a)); assert.equal(la.width, 480); assert.equal(la.height, 270);
  json(cli(port, "look", "--t", "4", "--out", b));
  assert.deepEqual([...fs.readFileSync(a).subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], "a PNG");
  assert.notDeepEqual(fs.readFileSync(a), fs.readFileSync(b), "the picture follows t");
  const lc = json(cli(port, "look", "--t", "0.5", "--selector", ".pulse", "--out", c)); assert.ok(lc.width < 480 && lc.width >= 1, `an element's box: ${lc.width}x${lc.height}`);
  assert.equal(json(cli(port, "state")).t, 0.5, "look leaves the agent's playhead where it looked");
  const bad = cli(port, "look", "--selector", ".nope-nothing"); assert.equal(bad.status, 1); assert.match(bad.stderr, /nothing matches/);

  // ── inspect, select ──
  const ins = json(cli(port, "inspect", "--selector", ".pulse", "--t", "1"));
  assert.ok(ins.matches >= 1 && ins.box.width > 0 && ins.style["background-color"] && ins.style.display, JSON.stringify(ins));
  assert.ok(ins.line && ins.line.id, "the line spoken at t"); assert.equal(ins.t, 1);
  assert.equal(json(cli(port, "inspect", "--selector", ".nope-nothing")).matches, 0);
  assert.equal(cli(port, "inspect", "--selector", "[[").status, 1, "a selector the browser refuses");
  const line0 = f.P.lines[1].id;
  assert.deepEqual(json(cli(port, "select", "--line", line0)).select, { line: line0 });
  assert.equal(cli(port, "select", "--line", "nope").status, 1);
  assert.ok(json(cli(port, "select", "--selector", ".pulse", "--t", "1")).select.selector === ".pulse");
  assert.equal(json(cli(port, "select", "--clear")).select, null);

  // ── set-style: an overlay, seen by inspect and look, not saved, cleared by --reset ──
  const idx = path.join(f.dir, "hf/index.html"), before = fs.readFileSync(idx, "utf8");
  const ss = json(cli(port, "set-style", "--selector", ".pulse", "--set", "background-color=rgb(1, 2, 3)", "--set", "opacity=0.5"));
  assert.ok(ss.matched >= 1); assert.equal(ss.overlay[0].styles.opacity, "0.5");
  const ins2 = json(cli(port, "inspect", "--selector", ".pulse", "--t", "1")); assert.equal(ins2.style["background-color"], "rgb(1, 2, 3)"); assert.equal(ins2.style.opacity, "0.5");
  assert.equal(fs.readFileSync(idx, "utf8"), before, "an overlay writes nothing");
  json(cli(port, "set-style", "--reset")); assert.notEqual(json(cli(port, "inspect", "--selector", ".pulse", "--t", "1")).style["background-color"], "rgb(1, 2, 3)");
  for (const v of ["background=url(http://x/y.png)", "color=red; } body { display:none", "color=red}", "color=@import"]) assert.equal(cli(port, "set-style", "--selector", ".pulse", "--set", v).status, 1, v);
  assert.equal(cli(port, "set-style", "--selector", ".a { x", "--set", "color=red").status, 1, "a selector cannot close the rule");
  assert.equal(cli(port, "set-style", "--selector", ".pulse", "--set", "bad name=red").status, 1);
  const np = cli(port, "set-style", "--selector", ".pulse", "--set", "opacity=0.4", "--edit-source");
  assert.equal(np.status, 1); assert.match(np.stderr, /--edit-source/); assert.equal(fs.readFileSync(idx, "utf8"), before, "a studio without --edit-source never writes the source");

  // ── the trust boundary of the new route ──
  const ok = { headers: JSONH, body: JSON.stringify({ cmd: "state" }) };
  assert.equal((await raw(port, ok)).status, 200);
  assert.equal((await raw(port, { ...ok, headers: { "content-type": "application/json" } })).status, 403, "no Origin");
  assert.equal((await raw(port, { ...ok, headers: { ...JSONH, origin: "http://evil.example" } })).status, 403, "another site's Origin");
  assert.equal((await raw(port, { ...ok, headers: { ...JSONH, host: "evil.example" } })).status, 403, "a Host that is not the studio's");
  assert.equal((await raw(port, { ...ok, headers: { origin: O, "content-type": "text/plain" } })).status, 415);
  assert.equal((await raw(port, { headers: JSONH, body: JSON.stringify({ cmd: "rm" }) })).status, 400, "a fixed list of commands");
  assert.equal((await raw(port, { headers: JSONH, body: JSON.stringify({ cmd: "look", t: -1 }) })).status, 400);
  assert.equal((await raw(port, { headers: JSONH, body: "not json" })).status, 400);
  assert.equal((await raw(port, { method: "GET" })).status, 405);
  assert.equal((await callAgent(port, { cmd: "state" })).status, 200, "the client's own call is the same thing");

  // ── an open tab follows the agent: playhead and overlay ──
  browser = await launch(["--force-device-scale-factor=1"]);
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }), errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(`${O}/`);
  await page.waitForFunction(() => window.studioReady === true, null, { timeout: 60000 }).catch(() => assert.fail(`the studio page did not come up: ${errs.join("; ")}`));
  json(cli(port, "frame", "--t", "2.5"));
  await page.waitForFunction(() => /2\.500 s/.test(document.getElementById("clock").textContent), null, { timeout: 15000 });
  json(cli(port, "select", "--line", line0));
  await page.waitForFunction((id) => document.getElementById("sel-id").value === id, line0, { timeout: 15000 });
  json(cli(port, "set-style", "--selector", ".pulse", "--set", "background-color=rgb(9, 8, 7)"));
  await page.waitForFunction(() => { const w = document.getElementById("film").iframeElement.contentWindow, e = w.document.querySelector(".pulse"); return getComputedStyle(e).backgroundColor === "rgb(9, 8, 7)"; }, null, { timeout: 15000 });
  json(cli(port, "set-style", "--reset"));
  await page.close();

  // ── --edit-source: one rule appended to the film's <style>, and undo puts the file back ──
  const e = await start("--edit-source");
  assert.equal(json(cli(e.port, "state")).editSource, true);
  const w = json(cli(e.port, "set-style", "--selector", ".pulse", "--set", "opacity=0.4", "--edit-source")); assert.equal(w.persisted, "hf/index.html");
  const after = fs.readFileSync(idx, "utf8");
  assert.ok(after.includes("/* reelwright studio set-style */\n.pulse { opacity: 0.4 }"), "the rule is in the film's <style>"); assert.equal(after.length > before.length, true);
  assert.equal((await raw(e.port, { headers: { origin: `http://localhost:${e.port}`, "content-type": "application/json" }, body: "{}" , method: "POST" })).status, 400);
  const undo = await new Promise((ok2) => { const r = http.request({ host: "127.0.0.1", port: e.port, method: "POST", path: "/__undo", headers: { host: `localhost:${e.port}`, origin: `http://localhost:${e.port}`, "content-type": "application/json" } }, (res) => { res.resume(); res.on("end", () => ok2(res.statusCode)); }); r.end("{}"); });
  assert.equal(undo, 200); assert.equal(fs.readFileSync(idx, "utf8"), before, "undo restores the source byte for byte");
  console.log("p15-studio-agent: ok");
} finally { await browser?.close(); for (const c of servers) c.kill(); await new Promise((r) => setTimeout(r, 300)); f.rm(); }
