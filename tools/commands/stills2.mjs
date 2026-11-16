// stills2 [project] [t,t,..] [--at t,t] [--frames N] [--range a-b[:step]] [--zoom <selector>] [--pad px] [--against ref.mp4] [--min-ssim x]
//                    stills with more than `stills`: times as a list (--at), N evenly spaced (--frames), or a range (--range 2-6:0.5,
//                    or --range 2-6 --frames 5); --zoom crops every still to the selector's box (union of the visible matches) at that
//                    moment → stills/zoom-t*.jpg + zoom-sheet.png; --against compares each still (or crop) with the same moment of a
//                    reference video: SSIM, a difference image and a ref | still | diff sheet → stills/against.json, against-sheet.png
//                    (a time past the reference's end holds its last frame). --min-ssim x: exit 1 when any moment scores lower.
//                    --variables / --variables-file work as on film. hyperframes stills are the nearest 10 fps frame (±0.05 s).
// compare <variant> <variant>.. --at t,t [--labels a,b] [--out f.png]   N variants (project[@style], a video, a folder of stills) → one PNG
// grade-compare <image|video> [--at t] [--presets a,b|all] [--out f.png]   one picture through HyperFrames colour-grading presets, labelled
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { launch } from "../browser.mjs";
import { applyVariables } from "./batch.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const fail = (m) => { console.error(m); process.exit(1); };
const ff = (...a) => spawnSync("ffmpeg", ["-y", "-v", "error", ...a], { encoding: "utf8" });
const num = (t) => "t" + Number(t).toFixed(2).padStart(6, "0");   // the name stills/ gives a time (tools/renderers/hyperframes.mjs)

// ── which moments ───────────────────────────────────────────────────────────
// opts: { at: "1,2.5", frames: N, range: "a-b[:step]", list: "1,2" } and the film length → sorted unique times inside [0, dur]
export function pickTimes({ at, list, frames, range }, dur) {
  const nums = (s) => String(s).split(",").map((x) => Number(x.trim())).filter((x) => x === x);
  let ts;
  if (range) {
    const m = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)(?::(\d+(?:\.\d+)?))?$/.exec(range);
    if (!m || Number(m[2]) <= Number(m[1])) throw new Error(`--range "${range}": use a-b or a-b:step with b > a, in seconds`);
    const [a, b] = [Number(m[1]), Math.min(Number(m[2]), dur)];
    if (m[3] && Number(m[3]) <= 0) throw new Error("--range step must be above 0");
    if (m[3]) { ts = []; for (let t = a; t <= b + 1e-9; t += Number(m[3])) ts.push(t); }
    else { const n = frames ?? 5; ts = n === 1 ? [(a + b) / 2] : Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1)); }
  } else if (at || list) ts = nums(at || list);
  else { const n = frames ?? 12; ts = Array.from({ length: n }, (_, i) => (i + 0.5) * dur / n); }
  if (!ts.length) throw new Error("no times given");
  ts = ts.map((t) => +Math.min(Math.max(t, 0), dur).toFixed(2));
  return [...new Set(ts)].sort((x, y) => x - y);
}

// ── one labelled picture of many ────────────────────────────────────────────
// cells [{ label, sub?, file, grading? }] → PNG. A cell with `grading` (a data-color-grading object) makes the page a HyperFrames
// composition, drawn by the HyperFrames runtime under the producer's file server, so the grade is the real one.
// layout: true also writes <out>.json with each cell's label and its x, y, w, h in the PNG.
export async function sheet(cells, { out, cols = 3, cellW = 480, layout = false }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reelwright-sheet-"));
  const graded = cells.some((c) => c.grading);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const body = cells.map((c, i) => {
    const name = `c${i}${path.extname(c.file) || ".png"}`;
    fs.copyFileSync(c.file, path.join(dir, name));
    return `<figure><figcaption>${esc(c.label)}${c.sub ? `<small>${esc(c.sub)}</small>` : ""}</figcaption>` +
      `<img id="g${i}" src="${name}"${c.grading ? ` data-color-grading="${esc(JSON.stringify(c.grading))}"` : ""}></figure>`;
  }).join("");
  const width = cols * (cellW + 14) + 14;
  // page height from the pictures' own sizes (the HyperFrames root clips at its data-height)
  const hs = cells.map((c) => { const [w, h] = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", c.file], { encoding: "utf8" }).stdout.trim().split(",").map(Number); return w > 0 ? cellW * h / w : cellW; });
  let height = 14;
  for (let i = 0; i < cells.length; i += cols) height += Math.max(...hs.slice(i, i + cols)) + 14 + 40;
  height = Math.ceil(height) + 40;
  const page = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#1b1b1b;color:#eee;font:600 18px/1.3 -apple-system,Helvetica,Arial,sans-serif}
.g{display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:14px;padding:14px;align-items:start}
figure{margin:0}figcaption{padding:0 2px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}figcaption small{font-weight:400;color:#aaa;margin-left:10px}
img{display:block;width:${cellW}px;height:auto}</style></head><body>` +
    (graded ? `<div id="root" data-composition-id="main" data-width="${width}" data-height="${height}">` : "<div>") + `<div class="g">${body}</div></div>` +
    (graded ? `<script>window.__timelines={main:{duration:()=>1,time:()=>0,seek(){},pause(){},play(){}}};</script>` : "") + `</body></html>`;
  fs.writeFileSync(path.join(dir, "index.html"), page);
  const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  let server, rects;
  try {
    const p = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    if (graded) {
      const { createFileServer } = await import("@hyperframes/producer");
      server = await createFileServer({ projectDir: dir, fps: 30 });
      await p.goto(server.url + "/index.html");
      const ready = () => p.evaluate(() => !!window.__hf && typeof window.__hf.seek === "function").catch(() => false);
      for (let i = 0; !(await ready()); i++) { if (i > 150) throw new Error("the HyperFrames runtime never became ready"); await new Promise((r) => setTimeout(r, 100)); }
      await p.evaluate(async () => { window.__hf.seek(0); await window.__hfWaitForSeekCompletion?.(); });
      const want = cells.filter((c) => c.grading && c.grading.intensity !== 0).length;   // intensity 0 is "off": the runtime draws nothing
      for (let i = 0; (await p.evaluate(() => document.querySelectorAll('canvas[id^="__hf_color_grading_"]').length)) < want; i++) {
        if (i > 100) throw new Error("the colour grading never drew"); await new Promise((r) => setTimeout(r, 100));
      }
      await new Promise((r) => setTimeout(r, 300));
    } else {
      await p.goto(pathToFileURL(path.join(dir, "index.html")).href);
      await p.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
    }
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    // where each picture sits in the PNG (screenshot origin = the grid's top-left), for callers that look at pixels
    rects = await p.evaluate(() => { const o = document.querySelector(".g").getBoundingClientRect(); return [...document.images].map((i) => { const r = i.getBoundingClientRect(); return { x: Math.round(r.left - o.left), y: Math.round(r.top - o.top), w: Math.round(r.width), h: Math.round(r.height) }; }); });
    await p.locator(".g").screenshot({ path: out, type: "png" });
  } finally { await browser.close(); server && server.close(); fs.rmSync(dir, { recursive: true, force: true }); }
  if (layout) fs.writeFileSync(out.replace(/\.png$/i, "") + ".json", JSON.stringify({ png: path.resolve(out), cells: cells.map((c, i) => ({ label: c.label, sub: c.sub || "", ...rects[i] })) }, null, 2) + "\n");
  return { out, rects };
}

// ── frames from a reference video ───────────────────────────────────────────
function duration(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  const d = Number(r.stdout);
  if (!(d > 0)) throw new Error(`cannot read the duration of ${file}`);
  return d;
}
// the frame at t as a png of size w×h (letterboxed); past the end, the last frame is held → { held }
export function videoFrame(file, t, out, w, h, crop) {
  const d = duration(file), held = t > d - 0.02;
  const vf = [`scale=${w}:${h}:force_original_aspect_ratio=decrease`, `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`, ...(crop ? [`crop=${crop}`] : [])].join(",");
  const r = ff(...(held ? ["-sseof", "-0.1"] : ["-ss", String(t)]), "-i", file, "-vf", vf, "-frames:v", "1", "-update", "1", out);
  if (r.status !== 0 || !fs.existsSync(out)) throw new Error(`ffmpeg could not read a frame at ${t}s from ${file}: ${r.stderr}`);
  return { held };
}
// SSIM (1 = identical) between two same-size images, and a difference image (differences ×4)
export function ssim(a, b, diffOut) {
  const r = spawnSync("ffmpeg", ["-v", "info", "-i", a, "-i", b, "-lavfi", "ssim", "-f", "null", "-"], { encoding: "utf8" });
  const m = /All:([\d.]+)/.exec(r.stderr);
  if (!m) throw new Error("ffmpeg ssim failed: " + r.stderr.slice(-300));
  if (diffOut) ff("-i", a, "-i", b, "-lavfi", "blend=all_mode=difference,lutrgb=r=val*4:g=val*4:b=val*4", "-frames:v", "1", "-update", "1", diffOut);
  return Number(m[1]);
}

// ── the command ─────────────────────────────────────────────────────────────
export default async function stills2({ proj, args, ROOT: R, render, step, project }) {
  const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const sw = args.indexOf("--strict-variables"), strict = sw >= 0 && !!args.splice(sw, 1);
  const vj = flag("--variables"), vf = flag("--variables-file");
  if (vj || vf) applyVariables(proj, { json: vj, file: vf, strict });
  const opt = { at: flag("--at"), frames: flag("--frames"), range: flag("--range") };
  if (opt.frames !== undefined) opt.frames = Math.max(1, Math.round(Number(opt.frames)));
  const zoom = flag("--zoom"), pad = Number(flag("--pad") ?? 24), against = flag("--against"), minSsim = flag("--min-ssim");
  opt.list = args.find((a) => /^[\d.,]+$/.test(a));
  if (against && !fs.existsSync(against)) fail(`--against: no such file ${against}`);

  const P = project(), tl = path.join(proj, "timeline.json");
  if (!fs.existsSync(tl)) { step("info"); render("info"); }
  const dur = JSON.parse(fs.readFileSync(tl, "utf8")).DUR;
  let ts;
  try { ts = pickTimes(opt, dur); } catch (e) { fail(e.message); }

  step("stills"); render("stills", ts.join(","));
  const dir = path.join(proj, "stills"), still = (t) => path.join(dir, num(t) + ".jpg");
  const [W, H] = [P.width || 1920, P.height || 1080];
  let boxes = null;
  if (zoom) {
    boxes = await boxesAt(proj, P, zoom, ts);
    const cells = [];
    for (const t of ts) {
      const b = boxes[t], x = Math.max(0, Math.floor(b.x - pad)), y = Math.max(0, Math.floor(b.y - pad));
      const w = Math.min(W - x, Math.ceil(b.w + 2 * pad)), h = Math.min(H - y, Math.ceil(b.h + 2 * pad));
      b.crop = `${w - (w % 2)}:${h - (h % 2)}:${x}:${y}`;
      const o = path.join(dir, "zoom-" + num(t) + ".jpg");
      // enlarged to at least 960 px wide, so small elements are easy to read
      const sc = Math.min(3, Math.max(1, 960 / w));
      const r = ff("-i", still(t), "-vf", `crop=${b.crop},scale=iw*${sc}:ih*${sc}:flags=lanczos`, "-q:v", "2", "-frames:v", "1", "-update", "1", o);
      if (r.status !== 0) fail("zoom crop failed: " + r.stderr);
      cells.push({ label: `t=${t.toFixed(2)}s`, sub: zoom, file: o });
    }
    await sheet(cells, { out: path.join(dir, "zoom-sheet.png"), cols: Math.min(3, cells.length), cellW: 480 });
    console.log("zoom →", path.join(dir, "zoom-sheet.png"), `(${zoom})`);
  }
  if (against) {
    const rows = [], cells = [];
    for (const t of ts) {
      const c = boxes?.[t].crop, mine = path.join(dir, "mine-" + num(t) + ".png"), ref = path.join(dir, "ref-" + num(t) + ".png"), diff = path.join(dir, "diff-" + num(t) + ".png");
      const r1 = ff("-i", still(t), ...(c ? ["-vf", `crop=${c}`] : []), "-frames:v", "1", "-update", "1", mine);
      if (r1.status !== 0) fail("against: " + r1.stderr);
      const { held } = videoFrame(against, t, ref, W, H, c);
      const s = +ssim(mine, ref, diff).toFixed(4);
      rows.push({ t, ssim: s, held, ref: ref, still: mine, diff });
      const sub = `ssim ${s.toFixed(3)}${held ? " · ref frame held" : ""}`;
      cells.push({ label: `ref t=${t.toFixed(2)}s`, file: ref }, { label: "this film", sub, file: mine }, { label: "difference ×4", file: diff });
    }
    await sheet(cells, { out: path.join(dir, "against-sheet.png"), cols: 3, cellW: 400 });
    fs.writeFileSync(path.join(dir, "against.json"), JSON.stringify({ against: path.resolve(against), zoom: zoom || null, moments: rows.map((r) => ({ t: r.t, ssim: r.ssim, held: r.held })) }, null, 2) + "\n");
    for (const r of rows) console.log(`t=${r.t.toFixed(2)}s  ssim ${r.ssim.toFixed(4)}${r.held ? "  (reference frame held)" : ""}`);
    console.log("against →", path.join(dir, "against-sheet.png"));
    if (minSsim !== undefined && rows.some((r) => r.ssim < Number(minSsim))) fail(`${rows.filter((r) => r.ssim < Number(minSsim)).length} moment(s) below --min-ssim ${minSsim}`);
  }
  if (!zoom && !against) {
    const py = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
    spawnSync(py, [path.join(R || ROOT, "tools", "sheet.py"), proj], { stdio: "inherit" });
  }
  console.log("stills →", dir, ts.join(", "));
}

// the box of a selector at each time: open the film's own page, render(t), union of the visible matches → { t: {x,y,w,h} }
async function boxesAt(proj, P, selector, ts) {
  const page = path.join(path.resolve(proj), P.renderer === "hyperframes" ? "hf" : "film", "index.html");
  const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  try {
    const p = await browser.newPage({ viewport: { width: P.width || 1920, height: P.height || 1080 }, deviceScaleFactor: 1 });
    p.on("pageerror", (e) => fail("PAGE ERROR: " + e.message));
    await p.goto(pathToFileURL(page).href);
    if (!(await p.evaluate(() => window.READY).catch(() => false))) fail(`${page} did not become ready`);
    const out = {};
    for (const t of ts) {
      const b = await p.evaluate(async ([t, sel]) => {
        await window.render(t);
        const r = [...document.querySelectorAll(sel)].map((e) => [e, e.getBoundingClientRect(), getComputedStyle(e)])
          .filter(([, b, s]) => b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0).map(([, b]) => b);
        if (!r.length) return null;
        const x0 = Math.min(...r.map((b) => b.left)), y0 = Math.min(...r.map((b) => b.top));
        return { x: x0, y: y0, w: Math.max(...r.map((b) => b.right)) - x0, h: Math.max(...r.map((b) => b.bottom)) - y0 };
      }, [t, selector]);
      if (!b) fail(`--zoom ${selector}: nothing visible matches at t=${t}s`);
      out[t] = b;
    }
    return out;
  } finally { await browser.close(); }
}
