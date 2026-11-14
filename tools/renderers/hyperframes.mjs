// HyperFrames renderer: <project>/hf/index.html is a HyperFrames composition, rendered by the vendored
// @hyperframes/producer (vendor/hyperframes). The composition loads hf/kit-data.js (tools/sched.py) and
// hf/kit/engine.js (copied from tools/ on every run), so KIT.start registers render(t) as its timeline and
// all timing comes from kit data, same as a pvk film.
// Env: PAGES (render workers, default 4), FPS, HYPERFRAMES_BROWSER_PATH (default Playwright's headless shell),
// PRODUCER_BROWSER_GPU_MODE (default software, so frames match across machines).
// project.json (all opt-in, docs/playbook/output-formats.md + motion-blur.md): "output".alpha stamps a transparent
// html/body for the render; "output".hdr renders through the producer's own mp4 path (frames/hdr.mp4) and encode muxes
// mix.wav into it; "motionBlur" is the producer's sub-frame blur ({shutterAngle, samplesPerFrame}).
// Opt-in flags (bin/reelwright.mjs → env): --resolution 4k|portrait-4k|square-4k (the producer's outputResolution; frames are 2x/4x the layout,
// KIT.shader windows follow); `frames <from> <to>` renders only that range (the film page is shifted in time, tools/renderers/hf_range.mjs);
// --cache / --resume keep every frame by content hash in .cache/frames-hf/ and re-render only the changed ones, in segments of --segment N frames
// (default 240) that are cached as they finish, so an interrupted render picks up where it stopped; --strict / --best-effort set the producer's
// strictness; --max-render SECONDS aborts a render that would take longer; the producer's own timeouts come from --browser-timeout,
// --player-ready-timeout and --protocol-timeout (env PRODUCER_*, set in bin/reelwright.mjs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { launch } from "../browser.mjs";
import { pagesMedia, mediaMix } from "./media.mjs";
import { encode, blurOf, TRANSPARENT } from "./pvk.mjs";
import { copyKit } from "../kit_files.mjs";
import { shaderPass } from "./shader_pass.mjs";
import { autoWorkers } from "../render_opts.mjs";
import { producerResolution, rangeShim, runsOf, frameKeys } from "./hf_range.mjs";

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

export default async function hyperframes(DIR, P, mode, [a3, a4] = []) {
  const FPS = Number(process.env.FPS || P.fps || 60);
  const HF = path.join(DIR, "hf");
  copyKit(HF);   // the kit travels with the composition: HyperFrames serves only the composition folder
  Object.assign(process.env, { DO_NOT_TRACK: "1", HYPERFRAMES_NO_TELEMETRY: "1" });
  process.env.PRODUCER_BROWSER_GPU_MODE ||= "software";
  process.env.HYPERFRAMES_BROWSER_PATH ||= headlessShell();

  const STARTED = Date.now();
  const ALPHA = !!P.output?.alpha, HDR = !!P.output?.hdr, MB = blurOf(P);
  const RES = process.env.REELWRIGHT_RESOLUTION ? producerResolution(P, process.env.REELWRIGHT_RESOLUTION) : null, SCALE = RES ? RES.scale : 1;
  const E = process.env, STRICTNESS = E.REELWRIGHT_STRICT && E.REELWRIGHT_BEST_EFFORT ? null : E.REELWRIGHT_STRICT ? "strict" : E.REELWRIGHT_BEST_EFFORT ? "best-effort" : undefined;
  if (STRICTNESS === null) { console.error("--strict and --best-effort together: pick one"); process.exit(1); }
  const hdrFile = path.join(DIR, "frames", "hdr.mp4");

  // film = true for frames (alpha, blur, hdr apply); stills stay opaque, sdr and sharp
  async function hfRender(out, fps, film = false, range = null) {   // range: { from, n } frames of film time, shifted to 0 (tools/renderers/hf_range.mjs)
    fs.rmSync(out, { recursive: true, force: true });
    // The producer takes the frame size from index.html's static root data-width/height, not the live DOM, so
    // stamp P's size (project.json or --formats) in for the render and put the file back after, even on exit.
    const idx = path.join(HF, "index.html"), src = fs.readFileSync(idx, "utf8");
    let sized = src.replace(/<[^>]*data-composition-id[^>]*>/, (tag) => tag
      .replace(/data-width="\d+"/, `data-width="${P.width || 1920}"`).replace(/data-height="\d+"/, `data-height="${P.height || 1080}"`));
    if (film && ALPHA) sized = sized.replace("</head>", () => `<style>${TRANSPARENT}</style>\n</head>`);
    if (range) sized = sized.replace(/<head[^>]*>/i, (h) => h + rangeShim(range.from, range.n, fps));
    const restore = () => fs.writeFileSync(idx, src);
    const interrupted = () => { restore(); process.exit(130); };
    if (sized !== src) { fs.writeFileSync(idx, sized); process.once("exit", restore); process.once("SIGINT", interrupted); }
    try { return await produce(out, fps, film, range); }
    finally { if (sized !== src) { restore(); process.off("exit", restore); process.off("SIGINT", interrupted); } }
  }
  async function produce(out, fps, film, range) {
    const { createRenderRequest, createRenderJob, renderConfigFromRequest, executeRenderJob, createConsoleLogger } =
      await import("@hyperframes/producer");
    const hdr = film && HDR;
    const req = createRenderRequest({ projectDir: HF, outputPath: out,
      options: { fps: { num: fps, den: 1 }, format: hdr ? "mp4" : "png-sequence", quality: "high", workers: Number(process.env.PAGES) || autoWorkers({ lowMemory: !!process.env.REELWRIGHT_LOW_MEMORY }),
        ...(RES && { outputResolution: RES.preset }),   // 4k | portrait-4k | square-4k → the producer's canvas preset, aspect must match
        ...(STRICTNESS && { strictness: STRICTNESS }),
        ...(Number(E.REELWRIGHT_MAX_RENDER) > 0 && { maxRenderMs: Math.round(Number(E.REELWRIGHT_MAX_RENDER) * 1000) }),
        ...(hdr && { hdrMode: "force-hdr" }),
        // not in the request schema, but it passes through to the job config (sub-frame seeks reach the KIT shim)
        ...(film && MB && { motionBlur: { shutterAngle: MB.shutter, samplesPerFrame: MB.samples } }) } });
    if (!range) { if (STRICTNESS) console.log(`producer strictness: ${STRICTNESS}`); if (E.REELWRIGHT_MAX_RENDER) console.log(`producer max render: ${E.REELWRIGHT_MAX_RENDER} s`); }
    const job = createRenderJob(renderConfigFromRequest(req, { logger: createConsoleLogger("warn") }));
    // --timeout S: the whole command's budget, shared by every producer run of it; the producer is aborted (it closes its browsers), exit 124
    const left = Number(E.REELWRIGHT_TIMEOUT) > 0 ? Number(E.REELWRIGHT_TIMEOUT) * 1000 - (Date.now() - STARTED) : 0, ac = new AbortController();
    const cap = E.REELWRIGHT_TIMEOUT && setTimeout(() => ac.abort(), Math.max(1, left));
    try { await executeRenderJob(job, HF, out, undefined, ac.signal); } catch (e) { if (!ac.signal.aborted) throw e; } finally { clearTimeout(cap); }
    if (ac.signal.aborted) { console.error(`hyperframes: stopped after --timeout ${E.REELWRIGHT_TIMEOUT} s`); process.exit(124); }
    if (job.status !== "complete") { console.error("hyperframes render failed:", job.error || job.status); process.exit(1); }
    return hdr ? [out] : fs.readdirSync(out).filter((f) => f.endsWith(".png")).sort();   // frame_000001.png = t 0
  }

  // frames <from> <to> and/or the frame cache (.cache/frames-hf/, key = what the frame shows + everything it depends on, tools/renderers/hf_range.mjs).
  // Only the frames the cache lacks are rendered, in runs of at most --segment frames; each run is cached as it finishes, so a render that was
  // stopped (ctrl-c, a crash, --max-render, --timeout) is finished by running the same command again (--resume).
  async function framesPartial(a3, a4, cache) {
    const t0 = Date.now(), fdir = E.REELWRIGHT_FRAMES_DIR || path.join(DIR, "frames"), tl = path.join(DIR, "timeline.json");
    if (!fs.existsSync(tl)) { console.error("no timeline.json: run `info` first (film and all do)"); process.exit(1); }
    const total = Math.ceil(JSON.parse(fs.readFileSync(tl, "utf8")).DUR * FPS), from = a3 == null ? 0 : Number(a3), to = a4 == null ? total : Math.min(total, Number(a4));
    if (!(Number.isInteger(from) && Number.isInteger(to) && from >= 0 && from < to)) { console.error(`frames <from> <to>: whole frame numbers, from < to <= ${total}`); process.exit(1); }
    const { keys, media } = await frameKeys({ launch, DIR, HF, P, FPS, from, to, scale: SCALE, fingerprints: cache,
      extra: { alpha: ALPHA, strictness: STRICTNESS, res: RES && RES.preset, browser: process.env.HYPERFRAMES_BROWSER_PATH, producer: JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.resolve("@hyperframes/producer"))), "..", "package.json"), "utf8")).version } });
    if (media) { console.error("frame ranges and the frame cache don't work with KIT.video clips (the producer extracts a video's frames by its own clock): render the whole film"); process.exit(1); }
    const name = (f) => path.join(fdir, `frame_${String(f + 1).padStart(6, "0")}.png`), cdir = path.join(DIR, ".cache", "frames-hf");
    const ck = (f) => cache && keys.get(f) ? path.join(cdir, keys.get(f) + ".png") : null;
    const all = Array.from({ length: to - from }, (_, i) => from + i);
    fs.mkdirSync(fdir, { recursive: true }); if (cache) fs.mkdirSync(cdir, { recursive: true });
    if (from === 0 && to === total) for (const f of fs.readdirSync(fdir)) if (/^frame_\d{6}\.png$/.test(f) && Number(f.slice(6, 12)) > total) fs.rmSync(path.join(fdir, f));   // a film that got shorter
    const todo = all.filter((f) => !ck(f) || !fs.existsSync(ck(f)));
    if (cache && E.REELWRIGHT_RESUME) console.log(`resume: ${all.length - todo.length} of ${all.length} frames are already done`);
    const runs = runsOf(todo, { gap: cache ? 12 : 0, seg: Number(E.REELWRIGHT_SEGMENT) || (cache ? 240 : Number.MAX_SAFE_INTEGER) }), done = new Set();
    for (const [a, b] of runs) {
      const tmp = path.join(DIR, ".cache", "hf-seg", String(a)), seq = await hfRender(tmp, FPS, true, { from: a, n: b - a });
      if (seq.length !== b - a) { console.error(`hyperframes: ${b - a} frames expected for ${a}–${b}, the producer wrote ${seq.length}`); process.exit(1); }
      seq.forEach((f, i) => {
        fs.copyFileSync(path.join(tmp, f), name(a + i)); done.add(a + i);
        if (ck(a + i)) { fs.copyFileSync(name(a + i), ck(a + i) + ".tmp"); fs.renameSync(ck(a + i) + ".tmp", ck(a + i)); }   // the cache holds the frame before any shader window
      });
      fs.rmSync(tmp, { recursive: true, force: true });
      console.log(`segment ${a}–${b} done (${done.size} of ${todo.length} frames)`);
    }
    for (const f of all) if (!done.has(f)) fs.copyFileSync(ck(f), name(f));
    await shaderPass(path.join(HF, "index.html"), P.width || 1920, P.height || 1080, all.map((f) => ({ t: f / FPS, file: name(f) })), SCALE);
    console.log(`frames ${from}–${to} in ${((Date.now() - t0) / 1000).toFixed(0)}s: ${done.size} rendered in ${runs.length} segment${runs.length === 1 ? "" : "s"}, ${all.length - done.size} from cache`);
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
    await shaderPass(path.join(HF, "index.html"), P.width || 1920, P.height || 1080, seq.map((f, i) => ({ t: i / SF, file: path.join(out, "_seq", f) })), SCALE);
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
    const t0 = Date.now(), CACHE = (E.REELWRIGHT_HF_CACHE || E.REELWRIGHT_RESUME) && !E.REELWRIGHT_NO_CACHE;
    if (!HDR && (a3 != null || CACHE)) return framesPartial(a3, a4, CACHE && !MB);   // opt-in: a range, or the content-hash cache (--cache / --resume)
    if (a3 != null) console.log("a frame range needs the HyperFrames SDR path; HDR renders the whole film");
    if (HDR) fs.mkdirSync(path.dirname(hdrFile), { recursive: true });
    const fdir = HDR ? hdrFile : process.env.REELWRIGHT_FRAMES_DIR || path.join(DIR, "frames"), seq = await hfRender(fdir, FPS, true), n = seq.length;
    // KIT.shader windows (not on the HDR path: that mp4 comes straight from the producer)
    if (!HDR) await shaderPass(path.join(HF, "index.html"), P.width || 1920, P.height || 1080, seq.map((f, i) => ({ t: i / FPS, file: path.join(fdir, f) })), SCALE);
    console.log(HDR ? `HDR mp4 in ${((Date.now() - t0) / 1000).toFixed(0)}s` : `${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } else if (mode === "encode") {
    if (HDR) hdrMux();
    else encode(DIR, P, FPS, "frames/frame_%06d.png", 1);
  } else {
    console.log("unknown mode", mode); process.exit(1);
  }
}
