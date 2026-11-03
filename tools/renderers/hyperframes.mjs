// HyperFrames renderer: <project>/hf/index.html is a HyperFrames composition, rendered by the vendored
// @hyperframes/producer (vendor/hyperframes). The composition loads hf/kit-data.js (tools/sched.py) and
// hf/kit/engine.js (copied from tools/ on every run), so KIT.start registers render(t) as its timeline and
// all timing comes from kit data, same as a pvk film.
// Env: PAGES (render workers, default 4), FPS, HYPERFRAMES_BROWSER_PATH (default Playwright's headless shell),
// PRODUCER_BROWSER_GPU_MODE (default software, so frames match across machines).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { launch } from "../browser.mjs";
import { encode } from "./pvk.mjs";

const TOOLS = new URL("..", import.meta.url);

// Playwright ships chromium-NNNN and chromium_headless_shell-NNNN side by side; HyperFrames wants the shell.
export function headlessShell() {
  const full = chromium.executablePath();
  const m = full.match(/^(.*[\\/])chromium-(\d+)[\\/]/);
  const dir = m && path.join(m[1], `chromium_headless_shell-${m[2]}`);
  for (const sub of (dir && fs.existsSync(dir) ? fs.readdirSync(dir) : [])) {
    for (const exe of ["chrome-headless-shell", "chrome-headless-shell.exe"]) {
      const f = path.join(dir, sub, exe);
      if (fs.existsSync(f)) return f;
    }
  }
  return full;
}

export default async function hyperframes(DIR, P, mode, [a3] = []) {
  const FPS = Number(process.env.FPS || P.fps || 60);
  const HF = path.join(DIR, "hf");
  // the kit travels with the composition: HyperFrames serves only the composition folder
  fs.mkdirSync(path.join(HF, "kit"), { recursive: true });
  for (const f of ["engine.js", "kit.css", "layouts.js", "shots.js", "doodle.js", "math.js"]) fs.copyFileSync(new URL(f, TOOLS), path.join(HF, "kit", f));
  fs.cpSync(new URL("../vendor/katex", TOOLS), path.join(HF, "kit", "katex"), { recursive: true });   // KIT.math.equation; css finds fonts/ beside it
  Object.assign(process.env, { DO_NOT_TRACK: "1", HYPERFRAMES_NO_TELEMETRY: "1" });
  process.env.PRODUCER_BROWSER_GPU_MODE ||= "software";
  process.env.HYPERFRAMES_BROWSER_PATH ||= headlessShell();

  async function hfRender(out, fps) {
    fs.rmSync(out, { recursive: true, force: true });
    // The producer takes the frame size from index.html's static root data-width/height, not the live DOM, so
    // stamp P's size (project.json or --formats) in for the render and put the file back after, even on exit.
    const idx = path.join(HF, "index.html"), src = fs.readFileSync(idx, "utf8");
    const sized = src.replace(/<[^>]*data-composition-id[^>]*>/, (tag) => tag
      .replace(/data-width="\d+"/, `data-width="${P.width || 1920}"`).replace(/data-height="\d+"/, `data-height="${P.height || 1080}"`));
    const restore = () => fs.writeFileSync(idx, src);
    const interrupted = () => { restore(); process.exit(130); };
    if (sized !== src) { fs.writeFileSync(idx, sized); process.once("exit", restore); process.once("SIGINT", interrupted); }
    try { return await produce(out, fps); }
    finally { if (sized !== src) { restore(); process.off("exit", restore); process.off("SIGINT", interrupted); } }
  }
  async function produce(out, fps) {
    const { createRenderRequest, createRenderJob, renderConfigFromRequest, executeRenderJob, createConsoleLogger } =
      await import("@hyperframes/producer");
    const req = createRenderRequest({ projectDir: HF, outputPath: out,
      options: { fps: { num: fps, den: 1 }, format: "png-sequence", quality: "high", workers: Number(process.env.PAGES || 4) } });
    const job = createRenderJob(renderConfigFromRequest(req, { logger: createConsoleLogger("warn") }));
    await executeRenderJob(job, HF, out);
    if (job.status !== "complete") { console.error("hyperframes render failed:", job.error || job.status); process.exit(1); }
    return fs.readdirSync(out).filter((f) => f.endsWith(".png")).sort();   // frame_000001.png = t 0
  }

  if (mode === "info") {
    // window.FILM (duration, SFX cues, VO) straight from the page, without the HyperFrames runtime
    const browser = await launch(["--allow-file-access-from-files"]);
    const p = await browser.newPage();
    let errors = 0;
    p.on("pageerror", (e) => { errors++; console.error("PAGE ERROR:", e.message); });
    await p.goto(pathToFileURL(path.join(HF, "index.html")).href);
    const film = await p.evaluate(async () => (await window.READY) && window.FILM).catch((e) => { console.error(e.message); });
    await browser.close();
    if (!film || errors) { console.error("hf/index.html failed to load — fix the errors above"); process.exit(1); }
    fs.writeFileSync(path.join(DIR, "timeline.json"), JSON.stringify(film, null, 1));
    console.log(`timeline.json: ${film.DUR}s, ${film.cues.length} SFX cues, ${Object.keys(film.VO || {}).length} VO lines`);
  } else if (mode === "stills") {
    // shortcut: renders the whole film at 10 fps and keeps the nearest frames (±0.05 s); add a
    // single-frame capture if stills of long films get slow
    const SF = 10, out = path.join(DIR, "stills");
    fs.rmSync(out, { recursive: true, force: true });
    const seq = await hfRender(path.join(out, "_seq"), SF);
    const dur = seq.length / SF;
    const ts = a3 ? a3.split(",").map(Number) : Array.from({ length: 12 }, (_, i) => +((i + 0.5) * dur / 12).toFixed(2));
    for (const t of ts) {
      const f = seq[Math.min(seq.length - 1, Math.round(t * SF))];
      spawnSync("ffmpeg", ["-y", "-v", "error", "-i", path.join(out, "_seq", f), "-q:v", "2",
        path.join(out, "t" + t.toFixed(2).padStart(6, "0") + ".jpg")], { stdio: "inherit" });
    }
    fs.rmSync(path.join(out, "_seq"), { recursive: true, force: true });
    console.log("stills →", out, ts.join(", "));
  } else if (mode === "frames") {
    if (a3) console.log("hyperframes renders the whole film; frame range ignored");
    const t0 = Date.now();
    const n = (await hfRender(process.env.REELWRIGHT_FRAMES_DIR || path.join(DIR, "frames"), FPS)).length;
    console.log(`${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } else if (mode === "encode") {
    encode(DIR, P, FPS, "frames/frame_%06d.png", 1);
  } else {
    console.log("unknown mode", mode); process.exit(1);
  }
}
