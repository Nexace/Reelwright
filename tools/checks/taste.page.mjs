// tools/checks/taste.page.mjs — WARN-only "taste" plug-in for `reelwright qa` (tools/qa_page.mjs loads it): reads DOM
// geometry of the live film page, no pixels, and returns lines like `motion 3.40s: "#card" stops dead from 2.1 H/s`.
//   motion    bounding-box centres of visible leaf-ish elements in #stage, sampled at ≤ 30 fps (H/s = screen heights
//             per second): one-frame speed spikes (a teleport or jitter) and hard stops/starts (a fast move next to a
//             still frame: no easing). Frames at a cut and elements appearing/disappearing are skipped
//   balance   every 0.5 s: the area-weighted centroid of visible content sits far off the frame centre for ≥ 1 s
//   empty     every 0.5 s: content covers < 2% of the frame (near-empty) or > 75% (cramped) for > 1.5 s
//   contrast  every 0.5 s: WCAG contrast of visible text (captions excluded: qa gates them) vs. what is behind it
//   pacing    VO lines spoken faster than 3.3 words/s, and > 4 s where nothing on screen moves, fades or changes text
// Pre-render, standalone: node tools/checks/taste.page.mjs <project>   (prints the lines, exits 0)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const kind = "warn";

const T = {
  STEP_FPS: 30,       // motion sampled at ≤ 30 fps: finer costs time and shows nothing an eye would
  MAX_TRACK: 300,     // tracked elements: more than any frame shows at once, bounded cost on big films
  SPIKE_X: 3,         // a one-frame speed this many times both neighbours is a jump, not a move
  SPIKE_MIN: 0.8,     // H/s: smaller spikes are sub-pixel noise or too small to notice
  STOP_MIN: 1.0,      // H/s: a move this fast that ends (or starts) within one frame reads as a jolt
  STOP_RATIO: 0.05,   // …next to a frame under 5% of that speed (an eased move tapers far more gradually)
  CUT_FRAC: 0.5,      // more than half the tracked elements toggling visibility at once is a cut, not motion
  SAMPLE: 0.5,        // s between balance / empty / contrast samples: each sample stands for 0.5 s of film
  BG_FRAC: 0.9,       // a box covering ≥ 90% of the frame is a background, not content
  BAL_OFF: 0.28,      // centroid off-centre by > 28% of width/height: everything is bunched on one side
  BAL_SPAN: 1,        // s: a passing off-centre moment (a move across the frame) is fine
  GRID: [48, 27],     // coverage grid: coarse enough to be cheap, fine enough for a 40 px label
  EMPTY_MIN: 0.02,    // < 2% covered: next to nothing on screen
  CRAMP_MAX: 0.85,    // > 85% covered by content (not background): past the title-safe box (74% of a 16x9 frame),
                      // which KIT.layout grids fill by design, into the margins
  EMPTY_SPAN: 1.5,    // s: a beat of emptiness (a scene change, an end card fade) is fine
  LARGE_BOLD: 24,     // px × KIT.u: bold text this big counts as large (WCAG 3:1)
  LARGE: 32,          // px × KIT.u: any text this big counts as large
  CONTRAST_LARGE: 3, CONTRAST: 4.5,   // WCAG AA minimums for large / normal text
  WPS: 6.5,           // words/s over a line's spoken span: edge-tts's normal delivery measures 2.3–5.9 on short lines
                      // (one-syllable words, no pauses), so only a sped-up voice or a crammed line passes 6.5
  STILL: 4,           // s: a frame frozen longer than this looks like the film stalled
  MAX_LINES: 12,      // output cap: a taste check is advice, not a wall of text
  PER_ELEMENT: 2,     // motion lines per element: its worst moments are enough
};

async function check(page) {
  return page.evaluate(async (T) => {
    const K = window.KIT, F = window.FILM, W = innerWidth, H = innerHeight;
    const stage = (K && K.stage) || document.getElementById('stage');
    if (!F || !stage) return [];
    const step = 1 / Math.min(F.FPS || 30, T.STEP_FPS), n = Math.floor(F.DUR / step) + 1;
    const every = Math.max(1, Math.round(T.SAMPLE / step)), u = (K && K.u) || Math.min(W, H) / 1080;
    const t2 = (t) => t.toFixed(2);
    // any computed colour (rgb(), color(srgb …) from color-mix, oklch(), …) → [r, g, b, a] via a 1×1 canvas; null when
    // the canvas can't parse it (assigning an unknown colour leaves fillStyle at the sentinel)
    const cx1 = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
    cx1.globalCompositeOperation = 'copy';
    const cols = new Map();
    const rgba = (c) => {
      c = String(c); if (cols.has(c)) return cols.get(c);
      cx1.fillStyle = '#010203'; cx1.fillStyle = c; const f1 = cx1.fillStyle;
      cx1.fillStyle = '#040506'; cx1.fillStyle = c;
      let v = null;
      if (f1 !== '#010203' || cx1.fillStyle !== '#040506') { cx1.fillRect(0, 0, 1, 1); const d = cx1.getImageData(0, 0, 1, 1).data; v = [d[0], d[1], d[2], d[3] / 255]; }
      cols.set(c, v); return v;
    };
    const lum = (c) => { const l = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, q) => q - m); return (x + 0.05) / (y + 0.05); };
    const over = (top, a, bot) => top.slice(0, 3).map((v, i) => v * a + bot[i] * (1 - a));
    const direct = (e) => [...e.childNodes].some((c) => c.nodeType === 3 && /[\p{L}\p{N}]/u.test(c.textContent));
    const SHAPES = /^(path|line|polyline|polygon|rect|circle|ellipse|text|image|use|foreignObject)$/;
    const caption = (e) => e.closest('.kit-subs, .kit-subrow');

    // leaf-ish: what a viewer sees as a thing (text, media, an svg, a painted box); built once, the DOM is static
    const els = [...stage.querySelectorAll('*')].filter((e) => {
      if (caption(e) || /^(SCRIPT|STYLE|TEMPLATE)$/i.test(e.tagName)) return false;
      // svg: its drawn shapes, not the root (a chart's root svg is often the whole frame, which reads as background)
      if (e instanceof SVGElement) return SHAPES.test(e.tagName) && !e.closest('defs, clipPath, mask, symbol, marker');
      if (/^(IMG|CANVAS|VIDEO)$/.test(e.tagName) || direct(e)) return true;
      const s = getComputedStyle(e);
      return (rgba(s.backgroundColor) || [0, 0, 0, 1])[3] > 0 || s.backgroundImage !== 'none' || parseFloat(s.borderTopWidth) + parseFloat(s.borderLeftWidth) > 0;
    }).slice(0, T.MAX_TRACK);
    const N = els.length, text = els.map((e) => !(e instanceof SVGElement) && direct(e)), shape = els.map((e) => e instanceof SVGElement);
    const name = (e) => {
      const s = (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24);
      return e.id ? `"#${e.id}"` : e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '') + (s ? ` "${s}"` : '');
    };

    let memo;   // effective opacity chain (0 under display:none), per frame
    const opOf = (e) => {
      if (!e || e.nodeType !== 1) return 1;
      let v = memo.get(e); if (v !== undefined) return v;
      const s = getComputedStyle(e);
      v = s.display === 'none' ? 0 : Number(s.opacity) * opOf(e.parentElement);
      memo.set(e, v); return v;
    };
    const base = (() => { for (const e of [document.body, document.documentElement]) { const c = rgba(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) return c; } return [255, 255, 255, 1]; })();   // unpainted page: the browser's white
    // what's behind text e at (x, y): every layer under it, composited down to the page background; null when an
    // image or gradient is in the way (unknowable from the DOM: no line rather than a guess)
    const backOf = (e, x, y) => {
      const st = document.elementsFromPoint(x, y), i = st.indexOf(e);
      const layers = i < 0 ? [] : [e, ...st.slice(i + 1)];
      if (i < 0) for (let a = e; a && a.nodeType === 1; a = a.parentElement) layers.push(a);
      const keep = [];
      for (const l of layers) {
        const s = getComputedStyle(l);
        if (s.backgroundImage !== 'none' || /^(IMG|CANVAS|VIDEO|svg)$/i.test(l.tagName)) { if (opOf(l) > 0.05) return null; continue; }
        const c = rgba(s.backgroundColor); if (!c) return null;
        const a = c[3] * opOf(l);
        if (a > 0.01) keep.push([c, a]);
        if (a >= 0.99) break;
      }
      return keep.reduceRight((bot, [c, a]) => over(c, a, bot), base);
    };

    // a canvas's look: its pixels shrunk to 8×8; a canvas we can't read (tainted) counts as changing every frame
    const px8 = Object.assign(document.createElement('canvas'), { width: 8, height: 8 }).getContext('2d', { willReadFrequently: true });
    const pixels = (e, i) => { try { if (!e.width || !e.height) return ''; px8.clearRect(0, 0, 8, 8); px8.drawImage(e, 0, 0, 8, 8); return px8.getImageData(0, 0, 8, 8).data.join(); } catch { return 'unreadable ' + i; } };
    const vis = [], X = [], Y = [], SW = [], SH = [], OP = [], changed = new Uint8Array(n), samples = [];
    let prevText = [];
    for (let i = 0; i < n; i++) {
      const t = i * step;
      await window.render(t);
      memo = new Map();
      const v = new Uint8Array(N), x = new Float32Array(N), y = new Float32Array(N), w = new Float32Array(N), h = new Float32Array(N), op = new Float32Array(N), txt = [];
      for (let k = 0; k < N; k++) {
        const e = els[k], r = e.getBoundingClientRect(), o = opOf(e);
        op[k] = o; x[k] = r.left + r.width / 2; y[k] = r.top + r.height / 2; w[k] = r.width; h[k] = r.height;
        v[k] = r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < W && r.top < H && o > 0.05 && getComputedStyle(e).visibility !== 'hidden' ? 1 : 0;
        if (text[k]) txt[k] = e.textContent;
        else if (shape[k]) { const c = getComputedStyle(e); txt[k] = e.getAttribute('d') + c.strokeDashoffset + c.strokeDasharray; }   // draw-on and morphs keep the box
        else if (e.tagName === 'VIDEO') txt[k] = e.currentTime + ':' + e.paused;   // footage plays inside a fixed box
        else if (e.tagName === 'CANVAS') txt[k] = pixels(e, i);
      }
      if (i) for (let k = 0; k < N && !changed[i]; k++) {
        const p = i - 1;
        if (v[k] !== vis[p][k] || (v[k] && (Math.abs(x[k] - X[p][k]) > 0.5 || Math.abs(y[k] - Y[p][k]) > 0.5 || Math.abs(w[k] - SW[p][k]) > 0.5 ||
          Math.abs(h[k] - SH[p][k]) > 0.5 || Math.abs(op[k] - OP[p][k]) > 0.01 || txt[k] !== prevText[k]))) changed[i] = 1;
      }
      vis.push(v); X.push(x); Y.push(y); SW.push(w); SH.push(h); OP.push(op); prevText = txt;

      if (i % every) continue;
      // content boxes: text by its glyph extent (a full-width text block is mostly empty), the rest by its box
      const boxes = [], low = [], svgs = new Map();   // an svg's shapes read as one thing (a chart, an icon): one union box
      for (let k = 0; k < N; k++) {
        if (!v[k]) continue;
        const e = els[k]; let r = e.getBoundingClientRect();
        if (text[k]) { const rg = document.createRange(); rg.selectNodeContents(e); const b = rg.getBoundingClientRect(); if (b.width && b.height) r = b; }
        const L = Math.max(0, r.left), R = Math.min(W, r.right), Tp = Math.max(0, r.top), B = Math.min(H, r.bottom);
        if (R <= L - 1 || B <= Tp - 1 || (R - L) * (B - Tp) >= T.BG_FRAC * W * H) continue;   // a hairline axis has ~0 height: keep it
        if (shape[k]) { const g = e.ownerSVGElement, u0 = svgs.get(g); svgs.set(g, u0 ? [Math.min(u0[0], L), Math.min(u0[1], Tp), Math.max(u0[2], R), Math.max(u0[3], B)] : [L, Tp, R, B]); continue; }
        boxes.push([L, Tp, R, B]);
        if (text[k] && op[k] >= 0.9) {
          if (/^\s*illustrative\b/i.test(e.textContent)) continue;   // the required, deliberately muted label (as qa_page's tiny-text)
          const s = getComputedStyle(e), fg = rgba(s.color);
          if (!fg || fg[3] < 0.1) continue;   // unparsed colour, or gradient / clipped-background text: its colour isn't the ink
          const back = backOf(e, (L + R) / 2, (Tp + B) / 2);
          if (!back) continue;
          const sc = e.offsetWidth ? e.getBoundingClientRect().width / e.offsetWidth : 1, px = parseFloat(s.fontSize) * (sc || 1);
          const large = px >= T.LARGE * u || (px >= T.LARGE_BOLD * u && parseInt(s.fontWeight) >= 700);
          const c = ratio(over(fg, fg[3], back), back), need = large ? T.CONTRAST_LARGE : T.CONTRAST;
          if (c < need) low.push({ key: name(e), c, need });
        }
      }
      for (const b of svgs.values()) if ((b[2] - b[0]) * (b[3] - b[1]) < T.BG_FRAC * W * H) boxes.push(b);
      let a = 0, cx = 0, cy = 0, cov = 0;
      for (const [L, Tp, R, B] of boxes) { const s = (R - L) * (B - Tp); a += s; cx += s * (L + R) / 2; cy += s * (Tp + B) / 2; }
      const [gx, gy] = T.GRID;
      for (let j = 0; j < gy; j++) for (let q = 0; q < gx; q++) {
        const x0 = q * W / gx, y0 = j * H / gy, x1 = x0 + W / gx, y1 = y0 + H / gy;   // a cell any content touches counts: glyphs are narrower than a cell
        if (boxes.some(([L, Tp, R, B]) => L < x1 && R > x0 && Tp < y1 && B > y0)) cov++;
      }
      samples.push({ t, off: a ? [Math.abs(cx / a / W - 0.5), Math.abs(cy / a / H - 0.5)] : null, cov: cov / (gx * gy), low });
    }

    const out = [];   // { cat, a, b, sev, text }
    const add = (cat, a, b, sev, text) => out.push({ cat, a, b, sev, text });
    const spanTxt = (a, b) => (b > a + 1e-6 ? `${t2(a)}–${t2(b)}s` : `${t2(a)}s`);

    // ── motion ──
    const cut = new Uint8Array(n);
    for (let i = 1; i < n; i++) {
      let any = 0, flip = 0;
      for (let k = 0; k < N; k++) if (vis[i][k] || vis[i - 1][k]) { any++; if (vis[i][k] !== vis[i - 1][k]) flip++; }
      cut[i] = any >= 2 && flip > T.CUT_FRAC * any ? 1 : 0;
    }
    const V = (i, k) => (i > 0 && i < n && !cut[i] && vis[i][k] && vis[i - 1][k] ? Math.hypot(X[i][k] - X[i - 1][k], Y[i][k] - Y[i - 1][k]) / step / H : null);
    const groups = new Map();   // same moment + kind across elements (a camera move) → one line
    for (let k = 0; k < N; k++) {
      const ev = [], used = new Set();
      for (let i = 1; i < n; i++) {
        const a = V(i - 1, k), b = V(i, k), c = V(i + 1, k);
        if (b == null || b < T.SPIKE_MIN) continue;
        if (a != null && c != null && b > T.SPIKE_X * a && b > T.SPIKE_X * c) { ev.push({ i, kind: 'spike', s: b }); used.add(i); continue; }
        // out-and-back in one frame: two big speeds, back where it was, still on both sides
        const d = V(i + 2, k);
        if (a != null && c != null && d != null && c >= T.SPIKE_MIN && b > T.SPIKE_X * a && c > T.SPIKE_X * d &&
          Math.hypot(X[i + 1][k] - X[i - 1][k], Y[i + 1][k] - Y[i - 1][k]) < 0.25 * b * step * H) { ev.push({ i, kind: 'spike', s: b }); used.add(i).add(i + 1); i++; }
      }
      for (let i = 1; i < n; i++) {
        if (used.has(i)) continue;
        const a = V(i - 1, k), b = V(i, k), c = V(i + 1, k);
        if (b == null || b < T.STOP_MIN) continue;
        if (c != null && c < T.STOP_RATIO * b && !used.has(i + 1)) ev.push({ i, kind: 'stop', s: b });
        else if (a != null && a < T.STOP_RATIO * b && !used.has(i - 1)) ev.push({ i, kind: 'start', s: b });
      }
      const runs = [];   // repeats within 0.5 s merge into one span
      for (const e of ev.sort((p, q) => p.i - q.i)) {
        const r = runs.find((x) => x.kind === e.kind && e.i * step - x.b <= 0.5);
        if (r) { r.b = e.i * step; r.s = Math.max(r.s, e.s); } else runs.push({ kind: e.kind, a: e.i * step, b: e.i * step, s: e.s });
      }
      for (const r of runs.sort((p, q) => q.s - p.s).slice(0, T.PER_ELEMENT)) {
        const key = r.kind + '|' + spanTxt(r.a, r.b), g = groups.get(key);
        if (g) { g.more++; if (r.s > g.s) Object.assign(g, { s: r.s, k }); } else groups.set(key, { ...r, k, more: 0 });
      }
    }
    for (const g of groups.values()) {
      const what = { spike: `jumps for one frame at ${g.s.toFixed(1)} H/s (teleport/jitter)`, stop: `stops dead from ${g.s.toFixed(1)} H/s (no ease-out)`, start: `starts at full speed ${g.s.toFixed(1)} H/s (no ease-in)` }[g.kind];
      add('motion', g.a, g.b, g.s / (g.kind === 'spike' ? T.SPIKE_MIN : T.STOP_MIN) + (g.kind === 'spike' ? 1 : 0),
        `${name(els[g.k])} ${what}${g.more ? ` (+${g.more} more with it)` : ''}`);
    }

    // ── balance / empty / contrast: runs of consecutive samples, each standing for SAMPLE seconds ──
    const runsOf = (flag, cb) => {
      let r = null;
      for (const s of [...samples, null]) {
        const f = s && flag(s);
        if (f && r && f.key === r.key) { r.b = s.t; r.vals.push(f.v); continue; }
        if (r) cb(r);
        r = f ? { key: f.key, a: s.t, b: s.t, vals: [f.v] } : null;
      }
    };
    runsOf((s) => s.off && s.cov >= T.EMPTY_MIN && (s.off[0] > T.BAL_OFF || s.off[1] > T.BAL_OFF) && { key: 1, v: Math.max(...s.off) }, (r) => {
      if (r.vals.length * T.SAMPLE < T.BAL_SPAN) return;
      const m = Math.max(...r.vals);
      add('balance', r.a, r.b, m / T.BAL_OFF, `content bunched off-centre (centroid ${Math.round(m * 100)}% of the frame from the middle)`);
    });
    runsOf((s) => (s.cov < T.EMPTY_MIN ? { key: 'e', v: s.cov } : s.cov > T.CRAMP_MAX ? { key: 'c', v: s.cov } : null), (r) => {
      if (r.vals.length * T.SAMPLE <= T.EMPTY_SPAN) return;
      const d = r.vals.length * T.SAMPLE;
      if (r.key === 'e') add('empty', r.a, r.b, d / T.EMPTY_SPAN, `near-empty frame (${(Math.max(...r.vals) * 100).toFixed(1)}% covered) for ${d.toFixed(1)} s`);
      else add('empty', r.a, r.b, d / T.EMPTY_SPAN, `cramped frame (${Math.round(Math.min(...r.vals) * 100)}% covered) for ${d.toFixed(1)} s`);
    });
    const lowRuns = new Map();   // text → spans over samples
    samples.forEach((s, j) => { for (const l of s.low) {
      const rs = lowRuns.get(l.key) || []; lowRuns.set(l.key, rs);
      const r = rs[rs.length - 1];
      if (r && r.j >= j - 1) {   // two same-named texts in one sample share a run
        r.j = j; r.b = s.t; r.c = Math.min(r.c, l.c); } else rs.push({ j, a: s.t, b: s.t, c: l.c, need: l.need });
    } });
    for (const [key, rs] of lowRuns) for (const r of rs) add('contrast', r.a, r.b, r.need / r.c, `${key} ${r.c.toFixed(2)}:1 (needs ${r.need})`);

    // ── pacing ──
    for (const [id, v] of Object.entries(F.VO || window.VO || {})) {
      const words = (v.words && v.words.length) || String(v.text || '').split(/\s+/).filter(Boolean).length, d = v.end - v.start;
      if (d > 0 && words / d > T.WPS) add('pacing', v.start, v.end, words / d / T.WPS, `VO line "${id}" at ${(words / d).toFixed(1)} words/s (max ${T.WPS})`);
    }
    for (let i = 1, s = 0; i <= n; i++) {
      if (i < n && !changed[i]) continue;
      const d = (i - 1 - s) * step;
      if (d > T.STILL) add('pacing', s * step, (i - 1) * step, d / T.STILL, `nothing moves for ${d.toFixed(1)} s (static frame)`);
      s = i;
    }

    // most severe first, capped; the worst line of every category always makes the cut
    out.sort((p, q) => q.sev - p.sev);
    const keep = [...new Set(out.map((o) => o.cat))].map((c) => out.find((o) => o.cat === c));
    for (const o of out) if (keep.length < T.MAX_LINES && !keep.includes(o)) keep.push(o);
    return keep.sort((p, q) => q.sev - p.sev).slice(0, T.MAX_LINES).map((o) => `${o.cat} ${spanTxt(o.a, o.b)}: ${o.text}`);
  }, T);
}

// a WARN check must never throw (qa would turn it into a FAIL gate): an odd film gets one line instead
export default async (page) => { try { return await check(page); } catch (e) { return [`taste check skipped: ${String((e && e.message) || e).split('\n')[0]}`]; } };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.argv[2]) { console.error("usage: node tools/checks/taste.page.mjs <project>"); process.exit(2); }
  const { launch } = await import("../browser.mjs");
  const DIR = path.resolve(process.argv[2]);
  let P, file;
  try { P = JSON.parse(fs.readFileSync(path.join(DIR, "project.json"), "utf8")); }
  catch (e) { console.error(`taste: can't read ${path.join(DIR, "project.json")}: ${e.message.split("\n")[0]}`); process.exit(1); }
  file = path.join(DIR, P.renderer === "hyperframes" ? "hf/index.html" : "film/index.html");
  if (!fs.existsSync(file)) { console.error(`taste: no film page ${file} (build the project first)`); process.exit(1); }
  const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  try {
    const p = await browser.newPage({ viewport: { width: P.width || 1920, height: P.height || 1080 } });
    const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(pathToFileURL(file).href);
    if (!(await p.evaluate(() => window.READY).catch(() => false))) {
      console.error(`${file} failed to load: ${errs.join("; ") || "READY never resolved"}`); process.exitCode = 1;
    } else {
      let lines;
      try { lines = await check(p); } catch (e) { console.error(`taste: check failed: ${e.message.split("\n")[0]}`); process.exitCode = 1; }
      if (lines) console.log(lines.length ? lines.join("\n") : "taste: no problems");
    }
  } finally { await browser.close(); }
}
