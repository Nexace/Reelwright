// The original renderer: Playwright pages call window.render(t) from <project>/film/index.html.
// Env: PAGES=6 (more = faster, more RAM), FPS (default project.json fps or 60), BROWSER=chrome|chromium
// frames: cached in <project>/.cache/frames/ by what each frame shows (see fingerprint); REELWRIGHT_NO_CACHE=1
// (--no-cache) renders every frame; REELWRIGHT_FRAMES_DIR renders into another folder (verify).
// project.json "output" ({format, alpha, hdr, prores, crf, gifFps, scale}, see encode) and "motionBlur" ({shutter, samples}
// or true) are opt-in: with neither set, frames and the mp4 are exactly what they were. alpha: frames are PNGs with a
// transparent page (the film must not paint a stage background); motionBlur: each frame is the average of `samples`
// sub-frames rendered across the shutter (docs/playbook/motion-blur.md, output-formats.md).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { launch } from "../browser.mjs";
import { pagesMedia, mediaMix } from "./media.mjs";

const SHOT = { type: "jpeg", quality: 94 };
const SHOT_ALPHA = { type: "png", omitBackground: true };
// html/body and the kit's #stage (the theme paints its background there) transparent for alpha output, injected
// after load so the film's own CSS stays untouched; anything else the film paints stays in the frame
export const TRANSPARENT = "html, body, #stage { background: transparent !important; background-image: none !important; }";
// project.json "motionBlur": true | {shutter (deg, default 180), samples (default 8)} → null when off
export const blurOf = (P) => { const m = P.motionBlur; if (!m) return null;
  return { shutter: Number(m.shutter ?? 180), samples: Math.max(2, Math.round(Number(m.samples ?? 8))) }; };
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
// What a frame shows, in the page after render(t): the DOM (render(t) sets inline styles) minus what can't paint,
// video times, scroll offsets and canvas pixels. null (never cached) when a canvas can't be read.
function fingerprint() {
  const d = document, out = [d.head.outerHTML, ...[...d.documentElement.attributes].map((a) => a.name + "=" + a.value), scrollX, scrollY];
  const shown = (e) => getComputedStyle(e).visibility !== "hidden";
  const walk = (n) => {
    if (n.nodeType === 3) return out.push(n.data);
    if (n.nodeType !== 1) return;
    const cs = getComputedStyle(n);
    // hidden and out of flow, so it moves nothing else: a caption shown later doesn't key every frame. What a hidden
    // subtree can still lend to visible content stays in: <style> rules, and anything with an id (an SVG <symbol>,
    // gradient, clipPath or filter used through <use href> or url(#…)).
    if (cs.display === "none" || /^(absolute|fixed)$/.test(cs.position) &&
      (cs.opacity === "0" || cs.visibility === "hidden" && ![...n.querySelectorAll("*")].some(shown))) {
      for (const e of [n, ...n.querySelectorAll("style, [id]")]) if (e.tagName === "STYLE" || e.id) out.push(e.outerHTML);
      return;
    }
    out.push("<" + n.tagName + [...n.attributes].map((a) => ` ${a.name}="${a.value}"`).join("") + ">");
    if (n.tagName === "VIDEO") out.push(n.currentTime);
    if (n.tagName === "CANVAS") out.push(n.toDataURL());
    if (n.scrollTop || n.scrollLeft) out.push(`scroll ${n.scrollTop},${n.scrollLeft}`);
    for (const c of n.childNodes) walk(c);
    if (n.shadowRoot) for (const c of n.shadowRoot.childNodes) walk(c);
    out.push("</>");
  };
  try { walk(d.body); } catch { return null; }   // a tainted canvas
  return out.join("\n");
}

export default async function pvk(DIR, P, mode, [a3, a4] = []) {
  const FPS = Number(process.env.FPS || P.fps || 60);
  const N = Number(process.env.PAGES || 4);
  const WIDTH = P.width || 1920, HEIGHT = P.height || 1080;
  const ALPHA = !!P.output?.alpha, EXT = ALPHA ? "png" : "jpg", MB = blurOf(P);
  if (P.output?.hdr) { console.error("HDR needs the hyperframes renderer (project.json \"renderer\": \"hyperframes\")"); process.exit(1); }
  const SHOTOPT = ALPHA ? SHOT_ALPHA : SHOT;

  async function openPages(n, alpha = false) {
    const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
    const pages = [], loaded = new Set();   // every file a page requested (frame cache key)
    let errors = 0;
    for (let i = 0; i < n; i++) {
      const p = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
      p.on("request", (r) => loaded.add(r.url()));
      p.on("pageerror", (e) => { errors++; console.error("PAGE ERROR:", e.message); });
      p.on("console", (m) => { if (m.type() === "error") { errors++; console.error("CONSOLE ERROR:", m.text()); } });
      await p.goto(pathToFileURL(path.join(DIR, "film/index.html")).href);
      const ok = await p.evaluate(() => window.READY).catch((e) => { console.error(e.message); return false; });
      if (!ok || errors) { await browser.close(); console.error("film/index.html failed to load — fix the errors above"); process.exit(1); }
      if (alpha) await p.addStyleTag({ content: TRANSPARENT });
      await pagesMedia(DIR, p, FPS, path.join(DIR, "film"), { frames: mode !== "info" });   // KIT.video / KIT.audio (tools/media.js)
      pages.push(p);
    }
    return { browser, pages, loaded };
  }
  // Everything a frame depends on besides its fingerprint: the files the pages loaded, the stylesheets as parsed, this
  // renderer's own code, the frame size, platform, browser and screenshot settings. The film's own scripts are left
  // out (what they do shows up in the DOM, so a film.js edit re-renders only what it changes); shared scripts such as
  // tools/engine.js are in, since they can change pixels without changing the DOM.
  async function globalKey(browser, page, loaded) {
    const own = [fileURLToPath(import.meta.url), fileURLToPath(new URL("../browser.mjs", import.meta.url))];
    const files = [...loaded, ...own.map((f) => pathToFileURL(f).href)].sort().flatMap((u) => {
      if (!u.startsWith("file:")) return [u];
      const f = fileURLToPath(u);
      if (/\.m?js$/.test(f) && f.startsWith(DIR + path.sep)) return [];
      return [path.relative(DIR, f).split(path.sep).join("/") + " " + (fs.existsSync(f) ? sha(fs.readFileSync(f)) : "missing")];
    });
    const css = await page.evaluate(() => [...document.styleSheets].map((s) => {
      try { return [...s.cssRules].map((r) => r.cssText).join("\n"); } catch { return s.href; }
    }).join("\n"));
    return sha(JSON.stringify({ files, css: sha(css), size: [WIDTH, HEIGHT], platform: `${process.platform}-${process.arch}`,
      browser: process.env.BROWSER || "", version: browser.version(), shot: SHOTOPT }));
  }
  async function shot(p, t, file) {
    await p.evaluate((t) => window.render(t), t);
    fs.writeFileSync(file, await p.screenshot(SHOT));
  }
  // frames-mode screenshot (alpha-aware); with motionBlur: `samples` sub-frames spread over the shutter, averaged by ffmpeg
  async function frameShot(p, f, file) {
    if (!MB) { await p.evaluate((t) => window.render(t), f / FPS); return fs.writeFileSync(file, await p.screenshot(SHOTOPT)); }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelwright-mb-"));
    try {
      for (let i = 0; i < MB.samples; i++) {
        const t = Math.max(0, f / FPS + (i / MB.samples - 0.5) * MB.shutter / 360 / FPS);
        await p.evaluate((t) => window.render(t), t);
        fs.writeFileSync(path.join(tmp, `s${String(i).padStart(2, "0")}.${EXT}`), await p.screenshot(SHOTOPT));
      }
      const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-framerate", "1", "-i", path.join(tmp, `s%02d.${EXT}`),
        "-vf", `${ALPHA ? "premultiply=inplace=1," : ""}tmix=frames=${MB.samples}${ALPHA ? ",unpremultiply=inplace=1" : ""},select=eq(n\\,${MB.samples - 1})`, "-frames:v", "1", "-update", "1",
        ...(ALPHA ? [] : ["-q:v", "2"]), file], { stdio: "inherit" });
      if (r.status !== 0) { console.error("motion blur: ffmpeg failed"); process.exit(r.status || 1); }
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  if (mode === "info") {
    const { browser, pages } = await openPages(1);
    const film = await pages[0].evaluate(() => window.FILM);
    await browser.close();
    fs.writeFileSync(path.join(DIR, "timeline.json"), JSON.stringify(film, null, 1));
    console.log(`timeline.json: ${film.DUR}s, ${film.cues.length} SFX cues, ${Object.keys(film.VO || {}).length} VO lines`);
  } else if (mode === "stills") {
    const { browser, pages } = await openPages(1);
    const dur = await pages[0].evaluate(() => window.FILM.DUR);
    const ts = a3 ? a3.split(",").map(Number) : Array.from({ length: 12 }, (_, i) => +((i + 0.5) * dur / 12).toFixed(2));
    const out = path.join(DIR, "stills");
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });
    try { for (const t of ts) await shot(pages[0], t, path.join(out, "t" + t.toFixed(2).padStart(6, "0") + ".jpg")); }
    finally { await browser.close(); }
    console.log("stills →", out, ts.join(", "));
  } else if (mode === "frames") {
    const { browser, pages, loaded } = await openPages(N, ALPHA);
    const dur = await pages[0].evaluate(() => window.FILM.DUR);
    const from = Number(a3 || 0), to = Number(a4 || Math.ceil(dur * FPS));
    const out = process.env.REELWRIGHT_FRAMES_DIR || path.join(DIR, "frames");   // verify renders elsewhere
    const name = (f) => path.join(out, "f" + String(f).padStart(5, "0") + "." + EXT);
    fs.mkdirSync(out, { recursive: true });
    // a full render of a film that got shorter: drop the old tail, so frames/ holds exactly this film
    if (!a3 && !a4) for (const f of fs.readdirSync(out)) if (new RegExp(`^f\\d{5}\\.${EXT}$`).test(f) && Number(f.slice(1, 6)) >= to) fs.rmSync(path.join(out, f));
    const t0 = Date.now();
    let done = 0, todo = [];
    // each page takes a contiguous run of the list (frames rendered in order, like a single page would)
    const split = (list, fn) => { const span = Math.ceil(list.length / N);
      return Promise.all(pages.map(async (p, k) => { for (const f of list.slice(k * span, (k + 1) * span)) await fn(p, f); })); };
    const progress = () => { if (++done % 300 === 0) {
      const s = (Date.now() - t0) / 1000;
      console.log(`frame ${done}/${todo.length}  ${s.toFixed(0)}s elapsed, ~${(s / done * (todo.length - done)).toFixed(0)}s left`);
    } };
    const all = Array.from({ length: to - from }, (_, i) => from + i);
    try {
      // shortcut: motion blur skips the frame cache (the fingerprint sees one instant, not the shutter window);
      // key it on the shutter + samples if blurred films get long
      if (process.env.REELWRIGHT_NO_CACHE || MB) {
        todo = all;
        await split(all, async (p, f) => { await frameShot(p, f, name(f)); progress(); });
      } else {
        // fingerprint what each frame shows; a frame whose key is cached is copied, the rest are screenshotted
        const fp = {};
        await split(all, async (p, f) => { await p.evaluate((t) => window.render(t), f / FPS); fp[f] = await p.evaluate(fingerprint); });
        const global = await globalKey(browser, pages[0], loaded);
        const CACHE = path.join(DIR, ".cache", "frames");
        fs.mkdirSync(CACHE, { recursive: true });
        const key = (f) => fp[f] != null && path.join(CACHE, sha(global + sha(fp[f])).slice(0, 40) + "." + EXT);
        todo = all.filter((f) => !key(f) || !fs.existsSync(key(f)));
        await split(todo, async (p, f) => {
          await frameShot(p, f, name(f));
          if (key(f)) { fs.copyFileSync(name(f), key(f) + ".tmp"); fs.renameSync(key(f) + ".tmp", key(f)); }
          progress();
        });
        const miss = new Set(todo);
        for (const f of all) if (!miss.has(f)) fs.copyFileSync(key(f), name(f));
      }
    } finally { await browser.close(); }
    const shots = [];   // runs of consecutive re-rendered frames
    for (const f of todo) { const s = shots[shots.length - 1]; if (s && s[1] === f - 1) s[1] = f; else shots.push([f, f]); }
    const list = shots.slice(0, 8).map(([a, b]) => `${a}–${b} (${(a / FPS).toFixed(2)}–${((b + 1) / FPS).toFixed(2)} s)`).join(", ");
    console.log(`frames ${from}–${to} done in ${((Date.now() - t0) / 1000).toFixed(0)}s: ${todo.length} rendered in ` +
      `${shots.length} shot${shots.length === 1 ? "" : "s"}${shots.length ? ": " + list + (shots.length > 8 ? ", …" : "") : ""}` +
      `, ${all.length - todo.length} from cache${process.env.REELWRIGHT_NO_CACHE ? " (--no-cache)" : MB ? " (motion blur: no cache)" : ""}`);
  } else if (mode === "encode") {
    encode(DIR, P, FPS, `frames/f%05d.${EXT}`, 0);
  } else {
    console.log("unknown mode", mode); process.exit(1);
  }
}

// Output formats other than mp4 (project.json "output".format, or --as): written ALONGSIDE the mp4, never instead of it,
// because qa (loudness), the manifest and `all`'s final path all read the mp4 at "out". Extra file = "out" with the
// extension swapped (png: a folder <out-base>-png/).
const PRORES = { proxy: 0, lt: 1, "422": 2, hq: 3, "4444": 4, "4444xq": 5 };
const FORMATS = ["mp4", "webm", "mov", "gif", "apng", "png"];

// the audio inputs of one encode: the one place that decides what is mixed in (mix.wav today)
function audioInputs(DIR) {
  const audio = mediaMix(DIR) || path.join(DIR, "mix.wav");   // mix.wav + KIT.audio clips, when the film has any
  if (!fs.existsSync(audio)) return { args: [], has: false };
  return { args: ["-i", audio], has: true };
}

// frames + mix.wav → the mp4 at project.json "out" (H.264 + AAC), plus the extra format asked for in "output". Shared with the other renderers.
export function encode(DIR, P, FPS, pattern, start) {
  const o = { ...P.output }, fmt = process.env.REELWRIGHT_OUT_FORMAT || o.format || "mp4";
  if (!FORMATS.includes(fmt)) { console.error(`output format "${fmt}" is not one of ${FORMATS.join(", ")}`); process.exit(1); }
  const outFile = path.join(DIR, P.out || "out/film.mp4");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const base = outFile.replace(/\.mp4$/, "");
  const frames = ["-framerate", String(FPS), "-start_number", String(start), "-i", path.join(DIR, pattern)];
  const aud = audioInputs(DIR);
  if (!aud.has) console.log("no mix.wav — encoding silent video");
  const ff = (...a) => { const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...a], { stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status || 1); };
  const crf = String(o.crf ?? 16);
  ff(...frames, ...aud.args, "-c:v", "libx264", "-preset", "slow", "-crf", crf, "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-movflags", "+faststart", ...(aud.has ? ["-c:a", "aac", "-b:a", "256k", "-shortest"] : []), outFile);
  console.log("→", outFile);
  if (fmt !== "mp4") extra(fmt, o, base, frames, aud, ff);
  subtitles(DIR, outFile);
}

function extra(fmt, o, base, frames, aud, ff) {
  const alpha = !!o.alpha, sc = o.scale && o.scale !== 1 ? [`scale=trunc(iw*${o.scale}/2)*2:-2`] : [];
  const vf = (...f) => { const l = [...sc, ...f]; return l.length ? ["-vf", l.join(",")] : []; };
  const sound = (...c) => (aud.has ? [...c, "-shortest"] : []);
  const file = base + "." + fmt;
  if (fmt === "webm") {
    ff(...frames, ...aud.args, ...vf(), "-c:v", "libvpx-vp9", "-crf", String(o.crf ?? 24), "-b:v", "0", "-row-mt", "1",
      "-pix_fmt", alpha ? "yuva420p" : "yuv420p", ...(alpha ? ["-auto-alt-ref", "0"] : []), ...sound("-c:a", "libopus", "-b:a", "160k"), file);
  } else if (fmt === "mov") {
    const prof = String(o.prores ?? (alpha ? "4444" : "hq"));
    if (!(prof in PRORES)) { console.error(`output.prores "${prof}" is not one of ${Object.keys(PRORES).join(", ")}`); process.exit(1); }
    const p4 = PRORES[prof] >= 4;
    ff(...frames, ...aud.args, ...vf(), "-c:v", "prores_ks", "-profile:v", String(PRORES[prof]),
      "-pix_fmt", p4 ? (alpha ? "yuva444p10le" : "yuv444p10le") : "yuv422p10le", "-vendor", "apl0", ...sound("-c:a", "pcm_s16le"), file);
  } else if (fmt === "gif") {
    const g = [`fps=${o.gifFps ?? 15}`, ...sc].join(",");
    ff(...frames, "-an", "-filter_complex",
      `[0:v]${g},split[a][b];[a]palettegen=reserve_transparent=${alpha ? 1 : 0}[p];[b][p]paletteuse${alpha ? "=alpha_threshold=128" : ""}`,
      "-loop", "0", file);
  } else if (fmt === "apng") {
    ff(...frames, "-an", ...vf(), "-plays", "0", "-pix_fmt", alpha ? "rgba" : "rgb24", "-f", "apng", file);
  } else {   // png: a folder of numbered stills
    const dir = base + "-png";
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    ff(...frames, "-an", ...vf(), path.join(dir, "frame_%05d.png"));
    return console.log("→", dir + path.sep);
  }
  console.log("→", file);
}

// timeline.json captions (KIT.captionCues) → <out>.srt and <out>.vtt beside the mp4
function subtitles(DIR, outFile) {
  const cues = JSON.parse(fs.readFileSync(path.join(DIR, "timeline.json"), "utf8")).captions || [];
  if (!cues.length) return;
  const ts = (s, sep) => new Date(Math.round(s * 1000)).toISOString().slice(11, 23).replace(".", sep);
  const body = (sep) => cues.map((c, i) => `${i + 1}\n${ts(c.t, sep)} --> ${ts(c.end, sep)}\n${c.text}\n`).join("\n");
  const base = outFile.replace(/\.mp4$/, "");
  fs.writeFileSync(base + ".srt", body(","));
  fs.writeFileSync(base + ".vtt", "WEBVTT\n\n" + body("."));
  console.log("→", base + ".srt", "+ .vtt,", cues.length, "cues");
}
