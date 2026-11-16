// node tools/selfcheck/studio-flags.mjs — remotion:2.8.1, the launch flags of `reelwright studio` (WebMCP stays out by repo rule): without a flag a busy port is
// still the old error (exit 1) and no browser is opened; --force-new starts a second studio on the next free port; --no-open is accepted and opens nothing;
// --open runs the OS opener with exactly the studio's own http://localhost:PORT/ (a fake `open` / `xdg-open` first on PATH records it); --open with --no-open
// is refused. Offline: a tiny example-hf copy with a fake voiceover.
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { tinyFilm, ROOT } from "../tiny-film.mjs";
import { openCommand } from "../commands/studio.mjs";

assert.deepEqual(openCommand("http://localhost:1/", "darwin"), ["open", ["http://localhost:1/"]]);
assert.deepEqual(openCommand("http://localhost:1/", "linux"), ["xdg-open", ["http://localhost:1/"]]);
assert.equal(openCommand("http://localhost:1/", "win32")[0], "cmd");

const f = tinyFilm(), bin = path.join(f.dir, "fakebin"), log = path.join(f.dir, "opened.txt"), children = [];
const fakeOpener = process.platform !== "win32";   // win32 opens with `cmd /c start`, which no PATH stub can stand in for
const freePort = () => new Promise((ok) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
const launch = (args) => new Promise((ok) => {   // → { out, exit(), code } once the studio printed its address or exited
  const c = spawn(process.execPath, [path.join(ROOT, "bin/reelwright.mjs"), "studio", f.dir, ...args], { cwd: ROOT, env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH } });
  let out = ""; children.push(c);
  const done = () => ok({ get out() { return out; }, c, code: c.exitCode });
  c.stdout.on("data", (d) => { out += d; if (/studio of .*http:\/\/localhost:\d+\//.test(out)) done(); }); c.stderr.on("data", (d) => (out += d));
  c.on("close", done);
});
const up = (port) => new Promise((ok) => http.get({ host: "127.0.0.1", port, path: "/", headers: { host: `localhost:${port}` } }, (r) => { r.resume(); ok(r.statusCode); }).on("error", () => ok(0)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  fs.mkdirSync(bin);
  if (fakeOpener) for (const n of process.platform === "darwin" ? ["open"] : ["xdg-open"]) { fs.writeFileSync(path.join(bin, n), `#!/bin/sh\necho "$@" >> "${log}"\n`); fs.chmodSync(path.join(bin, n), 0o755); }
  const port = await freePort();
  const a = await launch(["--port", String(port)]);   // the default: no browser
  assert.match(a.out, new RegExp(`http://localhost:${port}/`)); await wait(500);
  assert.ok(await up(port) >= 200); assert.ok(!fs.existsSync(log), "no flag: nothing is opened");

  const busy = await launch(["--port", String(port)]);   // same port, no flag: the old error
  for (let i = 0; i < 100 && busy.c.exitCode === null; i++) await wait(100);
  assert.equal(busy.c.exitCode, 1); assert.match(busy.out, new RegExp(`port ${port} is busy: reelwright studio ${path.basename(f.dir)} --port <n>`));

  const b = await launch(["--port", String(port), "--force-new", "--no-open"]);
  const m = /studio of .*http:\/\/localhost:(\d+)\//.exec(b.out); assert.ok(m, b.out);
  assert.ok(+m[1] > port && +m[1] <= port + 20, `a second studio on the next free port: ${m[1]}`); assert.match(b.out, new RegExp(`port ${port} was busy: started a new studio on ${m[1]}`));
  await wait(500); assert.ok(await up(+m[1]) >= 200); assert.ok(await up(port) >= 200, "the first studio is still up");
  assert.ok(!fs.existsSync(log), "--no-open: nothing is opened");

  const o = await launch(["--port", "0", "--open"]);
  const mo = /studio of .*(http:\/\/localhost:\d+\/)/.exec(o.out); assert.ok(mo, o.out);
  if (fakeOpener) {
    for (let i = 0; i < 50 && !fs.existsSync(log); i++) await wait(100);
    assert.equal(fs.readFileSync(log, "utf8").trim(), mo[1], "--open runs the OS opener with the studio's own address");
  }

  const bad = await launch(["--open", "--no-open"]);
  for (let i = 0; i < 50 && bad.c.exitCode === null; i++) await wait(100);
  assert.equal(bad.c.exitCode, 1); assert.match(bad.out, /pick one/);
  console.log("studio-flags: ok");
} finally { for (const c of children) c.kill(); await wait(300); f.rm(); }
