// studio [project] [--port N] [--edit-source] [--open|--no-open] [--force-new]   local editor on http://localhost:4175 (PORT=… or --port): the film in the player, a timeline
//                  of VO lines, scenes (gaps), beats and SFX cues, an inspector for each line's text and gap, the style,
//                  title and fps, raw project.json / brand.json editors, stills at the playhead, taste and embed.
//                  Edits project.json and brand.json only (never film.js); runs sched first and after each save.
//                  Listens on 127.0.0.1 and writes only inside the project. See docs/playbook/studio.md.
//                  Panels (right side): undo/redo, audio FX rack, blur, variables, renders queue, lint, assets, catalog, captions, slideshow, source.
//                  --edit-source lets the source panel save text files inside the project (film.js, hf/*.html …); off by default.
//                  --open opens the page in your browser once it is up; --no-open (Remotion Studio's flag, and what happens without
//                  either) leaves that to you. --force-new: if the port is busy (another studio, usually), start this one on the
//                  next free port (up to 20 further) instead of stopping.
// studio [project] look|inspect|select|set-style|frame|state [--port N] …   talk to a running studio (Remotion Studio's WebMCP tools, without MCP):
//                  look [--t S | --frame N] [--selector CSS] [--out f.png] [--format png|jpeg] screenshot of the film (or one element); inspect --selector CSS [--t S]
//                  box, text and computed style of the first match; select --line ID | --selector CSS | --clear; frame --t S | --frame N moves the playhead of
//                  open tabs; set-style --selector CSS --set prop=value … | --reset an unsaved overlay, or with --edit-source (and a studio started with it)
//                  appended to the film's own <style>; state. Prints JSON. docs/playbook/studio.md
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { startStudio } from "../studio/server.mjs";

// the OS's own opener, no shell: the argument is the studio's own http://localhost:PORT/ address
export const openCommand = (url, platform = process.platform) =>
  platform === "darwin" ? ["open", [url]] : platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];

// ── the client of POST /__agent (tools/studio/agent.mjs): a running studio, on 127.0.0.1, with its own Host and Origin ──
export const SUBS = ["look", "inspect", "select", "set-style", "frame", "state"];
export const callAgent = (port, body) => new Promise((ok, no) => {
  const o = `http://localhost:${port}`, data = JSON.stringify(body);
  const r = http.request({ host: "127.0.0.1", port, path: "/__agent", method: "POST", headers: { host: `localhost:${port}`, origin: o, "content-type": "application/json", "content-length": Buffer.byteLength(data) } }, (res) => {
    let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => { try { ok({ status: res.statusCode, json: JSON.parse(b) }); } catch { ok({ status: res.statusCode, json: { error: b.slice(0, 200) } }); } });
  });
  r.on("error", no); r.end(data);
});
async function client(sub, args) {
  const take = (f) => { const k = args.indexOf(f); return k >= 0 ? args.splice(k, 2)[1] : undefined; };
  const has = (f) => { const k = args.indexOf(f); return k >= 0 && !!args.splice(k, 1); };
  const die = (m) => { console.error(m); process.exit(1); };
  const port = Number(take("--port") ?? process.env.PORT ?? 4175);
  const n = (f) => { const v = take(f); if (v === undefined) return undefined; if (!/^\d+(\.\d+)?$/.test(v)) die(`${f} takes a number, not "${v}"`); return Number(v); };
  const body = { cmd: sub, t: n("--t"), frame: n("--frame"), selector: take("--selector") };
  if (sub === "select") { body.line = take("--line"); body.clear = has("--clear") || undefined; }
  let out;
  if (sub === "look") { body.format = take("--format")?.replace("jpg", "jpeg"); out = take("--out"); }
  if (sub === "set-style") {
    body.reset = has("--reset") || undefined; body.persist = has("--edit-source") || undefined; body.styles = {};
    for (let v; (v = take("--set")) !== undefined;) { const i = v.indexOf("="); if (i < 1) die(`--set takes prop=value, not "${v}"`); body.styles[v.slice(0, i).trim()] = v.slice(i + 1).trim(); }
    if (!body.reset && !Object.keys(body.styles).length) die("set-style needs --selector CSS and one or more --set prop=value (or --reset)");
  }
  if (args.length) die(`studio ${sub}: unexpected ${args.join(" ")}`);
  let r;
  try { r = await callAgent(port, body); } catch { die(`no studio on port ${port}: start one with reelwright studio <project> --port ${port}`); }
  if (r.status !== 200) die(`studio ${sub}: ${r.json.error || r.status}`);
  const j = r.json, img = j.png || j.jpeg;
  if (img) {
    const file = path.resolve(out || `studio-look-${j.t}.${j.format === "jpeg" ? "jpg" : "png"}`);
    fs.writeFileSync(file, Buffer.from(img, "base64"));
    console.log(JSON.stringify({ file, t: j.t, frame: j.frame, width: j.width, height: j.height, clip: j.clip }));
  } else console.log(JSON.stringify(j, null, 2));
}

export default async ({ proj, args, ROOT, py, step }) => {
  if (SUBS.includes(args[0])) return client(args.shift(), args);
  const flag = (f) => { const k = args.indexOf(f); return k >= 0 && !!args.splice(k, 1); };
  const editSource = flag("--edit-source"), open = flag("--open"), noOpen = flag("--no-open"), forceNew = flag("--force-new");
  if (open && noOpen) { console.error("--open and --no-open together: pick one"); process.exit(1); }
  const i = args.indexOf("--port");
  const raw = i >= 0 ? args.splice(i, 2)[1] : process.env.PORT || "4175";
  const port = Number(raw);
  if (!/^\d+$/.test(String(raw)) || port > 65535) { console.error(`--port takes a number from 0 to 65535, not "${raw}"`); process.exit(1); }
  step("sched"); py("sched.py");   // the page needs the film's data (hf/kit-data.js); exits with sched's error if it fails
  let s, use = port;
  if (forceNew && port) {   // the first port from here that accepts a listener (probed, so a failed start leaves nothing behind)
    const free = (p) => new Promise((ok) => { const t = net.createServer().once("error", () => ok(false)).listen(p, "127.0.0.1", () => t.close(() => ok(true))); });
    for (use = port; use < Math.min(65535, port + 20) && !(await free(use)); use++);
  }
  try { s = await startStudio({ ROOT, DIR: path.resolve(proj), port: use, editSource }); }
  catch (e) {
    console.error(e.code === "EADDRINUSE" ? `port ${use} is busy: reelwright studio ${path.basename(proj)} --port <n>` : e.message);
    process.exit(1);
  }
  if (use !== port) console.log(`port ${port} was busy: started a new studio on ${s.port}`);
  console.log(`studio of ${path.basename(proj)}: ${s.url}  (ctrl-c to stop)`);
  if (open) { const [bin, a] = openCommand(s.url); spawn(bin, a, { stdio: "ignore", detached: true }).on("error", (e) => console.error(`--open: could not run ${bin}: ${e.message}`)).unref(); }
  // however it ends, a running job (and its render children) ends with it
  process.on("exit", () => s.close());
  process.on("SIGINT", () => process.exit(0));
  process.on("SIGTERM", () => process.exit(0));
};
