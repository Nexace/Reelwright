// HyperFrames renderer: <project>/hf/index.html is a HyperFrames composition, rendered by the vendored
// @hyperframes/producer (vendor/hyperframes). The composition loads hf/kit-data.js (tools/sched.py) and
// hf/kit/engine.js (copied from tools/ on every run), so KIT.start registers render(t) as its timeline and
// all timing comes from kit data, same as a pvk film.
// Env: PAGES (render workers, default 4), FPS, HYPERFRAMES_BROWSER_PATH (default Playwright's headless shell),
// PRODUCER_BROWSER_GPU_MODE (default software, so frames match across machines).
// project.json (all opt-in, docs/playbook/output-formats.md + motion-blur.md): "output".alpha stamps a transparent
// html/body for the render; "output".hdr renders through the producer's own mp4 path (frames/hdr.mp4) and encode muxes
// mix.wav into it; "motionBlur" is the producer's sub-frame blur ({shutterAngle, samplesPerFrame}).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { launch } from "../browser.mjs";
import { pagesMedia, mediaMix } from "./media.mjs";
import { encode, blurOf, TRANSPARENT } from "./pvk.mjs";
import { copyKit } from "../kit_files.mjs";

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
  copyKit(HF);   // the kit travels with the composition: HyperFrames serves only the composition folder
  Object.assign(process.env, { DO_NOT_TRACK: "1", HYPERFRAMES_NO_TELEMETRY: "1" });
  process.env.PRODUCER_BROWSER_GPU_MODE ||= "software";
  process.env.HYPERFRAMES_BROWSER_PATH ||= headlessShell();

  const ALPHA = !!P.output?.alpha, HDR = !!P.output?.hdr, MB = blurOf(P);
  const hdrFile = path.join(DIR, "frames", "hdr.mp4");

  // film = true for frames (alpha, blur, hdr apply); stills stay opaque, sdr and sharp
  async function hfRender(out, fps, film = false) {
    fs.rmSync(out, { recursive: true, force: true });
    // The producer takes the frame size from index.html's static root data-width/height, not the live DOM, so
    // stamp P's size (project.json or --formats) in for the render and put the file back after, even on exit.
    const idx = path.join(HF, "index.html"), src = fs.readFileSync(idx, "utf8");
    let sized = src.replace(/<[^>]*data-composition-id[^>]*>/, (tag) => tag
      .replace(/data-width="\d+"/, `data-width="${P.width || 1920}"`).replace(/data-height="\d+"/, `data-height="${P.height || 1080}"`));
    if (film && ALPHA) sized = sized.replace("</head>", () => `<style>${TRANSPARENT}</style>\n</head>`);
    const restore = () => fs.writeFileSync(idx, src);
    const interrupted = () => { restore(); process.exit(130); };
    if (sized !== src) { fs.writeFileSync(idx, sized); process.once("exit", restore); process.once("SIGINT", interrupted); }
    try { return await produce(out, fps, film); }
    finally { if (sized !== src) { restore(); process.off("exit", restore); process.off("SIGINT", interrupted); } }
  }
  async function produce(out, fps, film) {
    const { createRenderRequest, createRenderJob, renderConfigFromRequest, executeRenderJob, createConsoleLogger } =
      await import("@hyperframes/producer");
    const hdr = film && HDR;
    const req = createRenderRequest({ projectDir: HF, outputPath: out,
      options: { fps: { num: fps, den: 1 }, format: hdr ? "mp4" : "png-sequence", quality: "high", workers: Number(process.env.PAGES || 4),
        ...(hdr && { hdrMode: "force-hdr" }),
        // not in the request schema, but it passes through to the job config (sub-frame seeks reach the KIT shim)
        ...(film && MB && { motionBlur: { shutterAngle: MB.shutter, samplesPerFrame: MB.samples } }) } });
    const job = createRenderJob(renderConfigFromRequest(req, { logger: createConsoleLogger("warn") }));
    await executeRenderJob(job, HF, out);
    if (job.status !== "complete") { console.error("hyperframes render failed:", job.error || job.status); process.exit(1); }
    return hdr ? [out] : fs.readdirSync(out).filter((f) => f.endsWith(".png")).sort();   // frame_000001.png = t 0
  }

  // the producer's HDR mp4 (frames/hdr.mp4) + mix.wav → the mp4 at "out", video copied untouched
  function hdrMux() {
    const outFile = path.join(DIR, P.out || "out/film.mp4"), audio = mediaMix(DIR) || path.join(DIR, "mix.wav");
    if (!fs.existsSync(hdrFile)) { console.error("no frames/hdr.mp4 — run frames first"); process.exit(1); }
    if ((process.env.REELWRIGHT_OUT_FORMAT || P.output.format || "mp4") !== "mp4") console.log("HDR is mp4 only — other output formats ignored");
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    const has = fs.existsSync(audio);
    const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-i", hdrFile, ...(has ? ["-i", audio] : []), "-map", "0:v", ...(has ? ["-map", "1:a"] : []),
      "-c:v", "copy", ...(has ? ["-c:a", "aac", "-b:a", "256k", "-shortest"] : []), "-movflags", "+faststart", outFile], { stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status || 1);
    console.log("→", outFile);
  }

  if (mode === "info") {
    // window.FILM (duration, SFX cues, VO) straight from the page, without the HyperFrames runtime
    const browser = await launch(["--allow-file-access-from-files"]);
    const p = await browser.newPage();
    let errors = 0;
    p.on("pageerror", (e) => { errors++; console.error("PAGE ERROR:", e.message); });
    await p.goto(pathToFileURL(path.join(HF, "index.html")).href);
    const film = await p.evaluate(async () => (await window.READY) && window.FILM).catch((e) => { console.error(e.message); });
    if (film && !errors) await pagesMedia(DIR, p, FPS, HF, { frames: false });   // KIT.audio / KIT.video sound → .cache/media-audio.json
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
    if (HDR) fs.mkdirSync(path.dirname(hdrFile), { recursive: true });
    const n = (await hfRender(HDR ? hdrFile : process.env.REELWRIGHT_FRAMES_DIR || path.join(DIR, "frames"), FPS, true)).length;
    console.log(HDR ? `HDR mp4 in ${((Date.now() - t0) / 1000).toFixed(0)}s` : `${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } else if (mode === "encode") {
    if (HDR) hdrMux();
    else encode(DIR, P, FPS, "frames/frame_%06d.png", 1);
  } else {
    console.log("unknown mode", mode); process.exit(1);
  }
}
