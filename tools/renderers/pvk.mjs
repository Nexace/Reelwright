// The original renderer: Playwright pages call window.render(t) from <project>/film/index.html.
// Env: PAGES=6 (more = faster, more RAM), FPS (default project.json fps or 60), BROWSER=chrome|chromium
// frames: cached in <project>/.cache/frames/ by what each frame shows (see fingerprint); REELWRIGHT_NO_CACHE=1
// (--no-cache) renders every frame; REELWRIGHT_FRAMES_DIR renders into another folder (verify).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { launch } from "../browser.mjs";

const SHOT = { type: "jpeg", quality: 94 };
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

  async function openPages(n) {
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
      browser: process.env.BROWSER || "", version: browser.version(), shot: SHOT }));
  }
  async function shot(p, t, file) {
    await p.evaluate((t) => window.render(t), t);
    fs.writeFileSync(file, await p.screenshot(SHOT));
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
    const { browser, pages, loaded } = await openPages(N);
    const dur = await pages[0].evaluate(() => window.FILM.DUR);
    const from = Number(a3 || 0), to = Number(a4 || Math.ceil(dur * FPS));
    const out = process.env.REELWRIGHT_FRAMES_DIR || path.join(DIR, "frames");   // verify renders elsewhere
    const name = (f) => path.join(out, "f" + String(f).padStart(5, "0") + ".jpg");
    fs.mkdirSync(out, { recursive: true });
    // a full render of a film that got shorter: drop the old tail, so frames/ holds exactly this film
    if (!a3 && !a4) for (const f of fs.readdirSync(out)) if (/^f\d{5}\.jpg$/.test(f) && Number(f.slice(1, 6)) >= to) fs.rmSync(path.join(out, f));
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
      if (process.env.REELWRIGHT_NO_CACHE) {
        todo = all;
        await split(all, async (p, f) => { await shot(p, f / FPS, name(f)); progress(); });
      } else {
        // fingerprint what each frame shows; a frame whose key is cached is copied, the rest are screenshotted
        const fp = {};
        await split(all, async (p, f) => { await p.evaluate((t) => window.render(t), f / FPS); fp[f] = await p.evaluate(fingerprint); });
        const global = await globalKey(browser, pages[0], loaded);
        const CACHE = path.join(DIR, ".cache", "frames");
        fs.mkdirSync(CACHE, { recursive: true });
        const key = (f) => fp[f] != null && path.join(CACHE, sha(global + sha(fp[f])).slice(0, 40) + ".jpg");
        todo = all.filter((f) => !key(f) || !fs.existsSync(key(f)));
        await split(todo, async (p, f) => {
          await shot(p, f / FPS, name(f));
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
      `, ${all.length - todo.length} from cache${process.env.REELWRIGHT_NO_CACHE ? " (--no-cache)" : ""}`);
  } else if (mode === "encode") {
    encode(DIR, P, FPS, "frames/f%05d.jpg", 0);
  } else {
    console.log("unknown mode", mode); process.exit(1);
  }
}

// frames + mix.wav → the mp4 at project.json "out" (H.264 + AAC). Shared with the other renderers.
export function encode(DIR, P, FPS, pattern, start) {
  const outFile = path.join(DIR, P.out || "out/film.mp4");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const audio = path.join(DIR, "mix.wav");
  const args = ["-y", "-v", "error", "-framerate", String(FPS), "-start_number", String(start), "-i", path.join(DIR, pattern)];
  if (fs.existsSync(audio)) args.push("-i", audio); else console.log("no mix.wav — encoding silent video");
  args.push("-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart");
  if (fs.existsSync(audio)) args.push("-c:a", "aac", "-b:a", "256k", "-shortest");
  args.push(outFile);
  const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
  console.log("→", outFile);
  subtitles(DIR, outFile);
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
