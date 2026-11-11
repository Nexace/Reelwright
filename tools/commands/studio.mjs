// studio [project] [--port N]   local editor on http://localhost:4175 (PORT=… or --port): the film in the player, a timeline
//                  of VO lines, scenes (gaps), beats and SFX cues, an inspector for each line's text and gap, the style,
//                  title and fps, raw project.json / brand.json editors, stills at the playhead, taste and embed.
//                  Edits project.json and brand.json only (never film.js); runs sched first and after each save.
//                  Listens on 127.0.0.1 and writes only inside the project. See docs/playbook/studio.md.
import path from "node:path";
import { startStudio } from "../studio/server.mjs";

export default async ({ proj, args, ROOT, py, step }) => {
  const i = args.indexOf("--port");
  const raw = i >= 0 ? args.splice(i, 2)[1] : process.env.PORT || "4175";
  const port = Number(raw);
  if (!/^\d+$/.test(String(raw)) || port > 65535) { console.error(`--port takes a number from 0 to 65535, not "${raw}"`); process.exit(1); }
  step("sched"); py("sched.py");   // the page needs the film's data (hf/kit-data.js); exits with sched's error if it fails
  let s;
  try { s = await startStudio({ ROOT, DIR: path.resolve(proj), port }); }
  catch (e) {
    console.error(e.code === "EADDRINUSE" ? `port ${port} is busy: reelwright studio ${path.basename(proj)} --port <n>` : e.message);
    process.exit(1);
  }
  console.log(`studio of ${path.basename(proj)}: ${s.url}  (ctrl-c to stop)`);
  // however it ends, a running job (and its render children) ends with it
  process.on("exit", () => s.close());
  process.on("SIGINT", () => process.exit(0));
  process.on("SIGTERM", () => process.exit(0));
};
