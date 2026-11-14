// tools/checks/layout.audit.mjs — the engine of `reelwright check` (and, renamed to layout.page.mjs, a WARN plug-in for `reelwright qa`; kept
// under this name so qa output on existing films stays as it is until the owner turns it on): a per-frame layout and occlusion audit
// of the live film page (DOM geometry, no pixels), the in-page audit upstream HyperFrames runs in `check`. At each sampled time it flags
//   frame         visible text whose box runs outside the frame by more than 4 px (the frame-check)
//   clip          visible text cut by an overflow:hidden/clip ancestor (partly inside, partly out; fully outside is a hidden slide-in)
//   occluded      visible text whose centre is covered by another element (not its ancestor or child) at that frame
//   caption-zone  a caption row (.kit-subrow) overlapping other on-screen text: the caption zone must be clear (the caption-zone gate)
// Times: every 0.5 s by default; REELWRIGHT_CHECK_AT="1.5,4" only those; REELWRIGHT_CHECK_RANGE="2,6" every 0.5 s inside; REELWRIGHT_CHECK_TRANSITIONS=1
// adds ±0.1 s around every whoosh cue (the film's transitions). Skip with project.json "qa": {"layout": false}.
// Standalone: node tools/checks/layout.audit.mjs <project>
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const kind = "warn";

export async function audit(page, o = {}) {
  return page.evaluate(async (o) => {
    const F = window.FILM, W = innerWidth, H = innerHeight, STEP = 0.5, TOL = 4;
    if (!F || typeof window.render !== "function") return [];
    let times = [];
    if (o.at && o.at.length) times = o.at.slice();
    else { const [a, b] = o.range || [0, F.DUR]; for (let t = a; t <= Math.min(b, F.DUR) + 1e-6; t += STEP) times.push(+t.toFixed(3)); }
    if (o.transitions) for (const c of F.cues || []) if (/^whoosh/.test(c.kind)) for (const d of [-0.1, 0, 0.1]) times.push(+Math.min(F.DUR, Math.max(0, c.t + d)).toFixed(3));
    times = [...new Set(times)].sort((a, b) => a - b);
    const visible = (e) => {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      let op = 1;
      for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === "none" || s.visibility === "hidden") return false; op *= Number(s.opacity); }
      return op > 0.05;
    };
    const own = (e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    const label = (e) => `"${(e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28)}"`;
    const name = (e) => e.tagName.toLowerCase() + (e.id ? "#" + e.id : e.classList[0] ? "." + e.classList[0] : "");
    const seen = new Map(), out = [];
    const flag = (key, t, msg) => { if (!seen.has(key)) { seen.set(key, { t, msg, n: 1 }); out.push(seen.get(key)); } else seen.get(key).n++; };
    for (const t of times) {
      await window.render(t);
      const texts = [...document.querySelectorAll("body *")].filter((e) => !["SCRIPT", "STYLE", "I"].includes(e.tagName) && own(e) && visible(e));
      const rows = texts.filter((e) => e.closest(".kit-subrow"));
      for (const e of texts) {
        const r = e.getBoundingClientRect(), k = label(e);
        if (r.right < 0 || r.bottom < 0 || r.left > W || r.top > H) continue;   // entirely off-screen: waiting to slide in
        if (r.left < -TOL || r.top < -TOL || r.right > W + TOL || r.bottom > H + TOL)
          flag("frame" + k, t, `${k} runs outside the frame (${Math.round(Math.max(-r.left, -r.top, r.right - W, r.bottom - H))} px)`);
        for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
          const s = getComputedStyle(a);
          if (s.overflow === "visible" && s.overflowX === "visible" && s.overflowY === "visible") continue;
          const ar = a.getBoundingClientRect(), cut = Math.max(ar.left - r.left, r.right - ar.right, ar.top - r.top, r.bottom - ar.bottom);
          const inside = r.right > ar.left && r.left < ar.right && r.bottom > ar.top && r.top < ar.bottom;
          if (inside && cut > TOL) { flag("clip" + k, t, `${k} is cut by ${name(a)} (${Math.round(cut)} px)`); break; }
        }
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx >= 0 && cy >= 0 && cx <= W && cy <= H) {
          const hit = document.elementFromPoint(cx, cy);
          if (hit && !e.contains(hit) && !hit.contains(e) && visible(hit) && !(e.closest(".kit-subrow") && hit.closest(".kit-subrow"))) flag("occ" + k + name(hit), t, `${k} is covered by ${name(hit)}`);
        }
      }
      for (const row of rows.length ? [rows[0].closest(".kit-subrow")] : []) {
        const cr = row.getBoundingClientRect();
        for (const e of texts) {
          if (e.closest(".kit-subs")) continue;
          const r = e.getBoundingClientRect();
          if (Math.min(r.right, cr.right) - Math.max(r.left, cr.left) > 2 && Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top) > 2) flag("zone" + label(e), t, `caption zone: ${label(e)} overlaps the caption row`);
        }
      }
    }
    return out.slice(0, 16).map((x) => `${x.t.toFixed(2)}s ${x.msg}${x.n > 1 ? ` (and ${x.n - 1} more samples)` : ""}`);
  }, o);
}

const fromEnv = () => {
  const num = (s) => (s || "").split(",").map(Number).filter((n) => Number.isFinite(n));
  const r = num(process.env.REELWRIGHT_CHECK_RANGE);
  return { at: num(process.env.REELWRIGHT_CHECK_AT), range: r.length === 2 ? r : null, transitions: !!process.env.REELWRIGHT_CHECK_TRANSITIONS };
};
export default async (page) => { try { return await audit(page, fromEnv()); } catch (e) { return [`layout check skipped: ${String((e && e.message) || e).split("\n")[0]}`]; } };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.argv[2]) { console.error("usage: node tools/checks/layout.audit.mjs <project>"); process.exit(2); }
  const { launch } = await import("../browser.mjs");
  const DIR = path.resolve(process.argv[2]);
  const P = JSON.parse(fs.readFileSync(path.join(DIR, "project.json"), "utf8"));
  const file = path.join(DIR, P.renderer === "hyperframes" ? "hf/index.html" : "film/index.html");
  if (!fs.existsSync(file)) { console.error(`layout: no film page ${file} (build the project first)`); process.exit(1); }
  const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  try {
    const p = await browser.newPage({ viewport: { width: P.width || 1920, height: P.height || 1080 } });
    const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(pathToFileURL(file).href);
    if (!(await p.evaluate(() => window.READY).catch(() => false))) { console.error(`${file} failed to load: ${errs.join("; ") || "READY never resolved"}`); process.exitCode = 1; }
    else { const lines = await audit(p, fromEnv()); console.log(lines.length ? lines.join("\n") : "layout: no problems"); }
  } finally { await browser.close(); }
}
