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
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { startStudio } from "../studio/server.mjs";

// the OS's own opener, no shell: the argument is the studio's own http://localhost:PORT/ address
export const openCommand = (url, platform = process.platform) =>
  platform === "darwin" ? ["open", [url]] : platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];

export default async ({ proj, args, ROOT, py, step }) => {
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
