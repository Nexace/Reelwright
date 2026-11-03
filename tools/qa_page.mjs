// node tools/qa_page.mjs <project>  — the page half of `reelwright qa` (tools/qa.py runs it and prints the result).
// Opens the film page (film/index.html, or hf/index.html for renderer "hyperframes"), seeks with window.render(t)
// and prints JSON { captions: [problems], illustrative: [times], hasCaptions }:
//   captions      at each VO line's middle and end: the caption row sits inside KIT.safe horizontally and inside the
//                 frame, wraps to ≤ 2 lines, and its said/now words reach WCAG contrast 4.5 against what's behind them
//   illustrative  every 0.5 s: when visible text outside the captions shows a data-like number (%, currency, ×, k/M,
//                 1,200, 4.8), an "Illustrative data" label is visible too. A visible <img data-qa-text="…"> (a
//                 screenshot, with the text it shows) counts the same, but there a "Source: …" credit also passes:
//                 real numbers from a real site, credited
// plus WARN-only checks, every 0.5 s, over visible text outside the captions (qa.py prints them; they never fail):
//   overlap   two texts whose boxes overlap by more than a sliver (both at least 60% opaque, so a crossfade passes)
//   tiny-text rendered font size below 24 px × KIT.u (24 px on a 1080 short side)
//   wordy     more than 6 words, mostly the words of the VO line playing: a label that repeats the narration
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "./browser.mjs";

const DIR = path.resolve(process.argv[2]);
const P = JSON.parse(fs.readFileSync(path.join(DIR, "project.json"), "utf8"));
const [W, H] = (process.env.REELWRIGHT_SIZE || `${P.width || 1920}x${P.height || 1080}`).split("x").map(Number);
const page = path.join(DIR, P.renderer === "hyperframes" ? "hf/index.html" : "film/index.html");

const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
try {
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(pathToFileURL(page).href);
  if (!(await p.evaluate(() => window.READY).catch(() => false)))
    throw new Error(`${path.relative(process.cwd(), page)} failed to load: ${errs.join("; ") || "READY never resolved"}`);
  const res = await p.evaluate(async () => {
    const K = window.KIT, VO = window.VO || {}, out = { captions: [], illustrative: [], hasCaptions: false, overlap: [], tiny: [], wordy: [], vo: Object.values(VO).map((v) => [v.start, v.end]) };
    const rgba = (c) => { const m = c.match(/[\d.]+/g) || [0, 0, 0, 0]; return m.length < 4 ? [...m.map(Number), 1] : m.map(Number); };
    const over = (top, bot) => top.slice(0, 3).map((v, i) => v * top[3] + bot[i] * (1 - top[3]));
    const lum = (c) => { const l = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const probe = document.createElement('i'); document.body.append(probe);
    const colour = (css) => { probe.style.color = css; return rgba(getComputedStyle(probe).color); };
    // shortcut: the stage's --kit-bg stands in for whatever the film shows behind a see-through caption; sample the frame if that misleads
    const stageBg = colour(K.token('bg') || '#000');
    const visible = (e) => {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return false;
      let op = 1;
      for (let x = e; x && x.nodeType === 1; x = x.parentElement) {
        const s = getComputedStyle(x);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
        op *= Number(s.opacity);
      }
      return op > 0.05;
    };
    const t2 = (t) => +t.toFixed(2);

    for (const id of Object.keys(VO)) {
      const v = VO[id];
      for (const t of [(v.start + v.end) / 2, v.end - 0.05]) {
        await window.render(t);
        const row = [...document.querySelectorAll('.kit-subrow')].find(visible);
        if (!row) continue;
        out.hasCaptions = true;
        const r = row.getBoundingClientRect(), S = K.safe;
        if (r.left < S.x - 1 || r.right > S.x + S.w + 1 || r.top < 0 || r.bottom > innerHeight)
          out.captions.push(`${t2(t)}s line "${id}": caption box ${Math.round(r.left)}–${Math.round(r.right)} px leaves the safe area ${S.x}–${S.x + S.w} px`);
        const tops = new Set([...row.children].map((s) => Math.round(s.getBoundingClientRect().top / 4)));
        if (tops.size > 2) out.captions.push(`${t2(t)}s line "${id}": caption wraps to ${tops.size} lines (max 2)`);
        const word = row.querySelector('.now') || row.querySelector('.said');
        if (word) {
          const back = over(rgba(getComputedStyle(word).backgroundColor), over(rgba(getComputedStyle(row).backgroundColor), stageBg));
          const c = ratio(over(rgba(getComputedStyle(word).color), back), back);
          if (c < 4.5) out.captions.push(`${t2(t)}s line "${id}": caption contrast ${c.toFixed(2)}:1 (needs 4.5)`);
        }
      }
    }

    // numbers that read as data need the label: 40%, $12, 3×, 2.5k, 1,200, 4.8 — not step numbers ("01"), clocks ("9:41")
    // or versions
    const DATA = /[$€£¥₹]\s?\d|\d\s?(%|×|x\b|[kKMB]\b)|\d{1,3}(,\d{3})+|\d\.\d/;
    const VER = /\bv?\d+(\.\d+){2,}\S*|\bv\d+(\.\d+)?\b/g;   // version numbers (v8.3.4, 3.10.2) aren't data
    const data = (s) => { const t = s.replace(VER, ''); return DATA.test(t) && ((t.match(/\S*\d\S*/g) || []).find((x) => DATA.test(x)) || t.match(DATA)[0]); };
    const dur = window.FILM.DUR;
    for (let t = 0; t < dur; t += 0.5) {
      await window.render(t);
      let num = null, label = false, credit = false, shot = null;
      const walk = document.createTreeWalker(K.stage, NodeFilter.SHOW_TEXT);
      for (let n; (n = walk.nextNode());) {
        const s = n.textContent.trim(), e = n.parentElement;
        if (!s || e.closest('.kit-subs') || !visible(e)) continue;
        if (/illustrative/i.test(s)) label = true;
        else if (/^source\b/i.test(s)) credit = true;
        else if (data(s)) num ??= s;
      }
      for (const im of K.stage.querySelectorAll('img[data-qa-text]')) if (!shot && visible(im)) shot = data(im.dataset.qaText);
      if (num && !label) out.illustrative.push(`${t2(t)}s "${num.slice(0, 30)}"`);
      if (shot && !label && !credit) out.illustrative.push(`${t2(t)}s "${shot}" in a screenshot (data-qa-text), no label or Source credit`);
    }

    // ── WARN checks (overlap, tiny-text, wordy) ──
    const opacity = (e) => { let o = 1; for (; e && e.nodeType === 1; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
    const words = (s) => (s.toLowerCase().match(/[\p{L}\p{N}']+/gu) || []);
    const runs = {};   // check -> key -> { first, last, detail }, so a stretch reports once
    const note = (check, key, t, detail) => { const r = ((runs[check] ??= {})[key] ??= { first: t, detail }); r.last = t; };
    const minPx = 24 * K.u;
    for (let t = 0; t < dur; t += 0.5) {
      await window.render(t);
      const items = [], walk = document.createTreeWalker(K.stage, NodeFilter.SHOW_TEXT);
      for (let n; (n = walk.nextNode());) {
        const s = n.textContent.replace(/\s+/g, ' ').trim(), e = n.parentElement;
        if (!/[\p{L}\p{N}]/u.test(s) || e.closest('.kit-subs, .kit-subrow, script, style') || !visible(e)) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        let b = rg.getBoundingClientRect(); if (!b.width || !b.height) continue;
        const lh = parseFloat(getComputedStyle(e).lineHeight);   // a tight line-height makes glyph boxes taller than the line the text sits in
        if (lh && lh < b.height) b = { left: b.left, right: b.right, width: b.width, top: b.top + (b.height - lh) / 2, bottom: b.bottom - (b.height - lh) / 2, height: lh };
        // shortcut: a clip-path / mask ancestor (a wipe) hides text without opacity; only there, shrink the box to the grid points that hit-test as this text. Other clipping (overflow) isn't checked
        let box = b;
        const clipped = (() => { for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const c = getComputedStyle(x); if ((c.clipPath && c.clipPath !== 'none') || (c.maskImage && c.maskImage !== 'none')) return true; } return false; })();
        if (clipped) {
          const cw = b.width / 8, ch = b.height / 4, xs = [], ys = [];
          for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
            const h = document.elementFromPoint(b.left + (i + 0.5) * cw, b.top + (j + 0.5) * ch);
            if (h && e.contains(h)) { xs.push(i); ys.push(j); }
          }
          if (!xs.length) continue;
          box = { left: b.left + Math.min(...xs) * cw, right: b.left + (Math.max(...xs) + 1) * cw, top: b.top + Math.min(...ys) * ch, bottom: b.top + (Math.max(...ys) + 1) * ch, width: 0, height: 0 };
          box.width = box.right - box.left; box.height = box.bottom - box.top;
        }
        items.push({ s, e, b: box, op: opacity(e) });
      }
      for (const { s, e, b } of items) {
        if (/^(illustrative|source\b)/i.test(s)) continue;   // the required small label / credit
        const sc = e.offsetWidth ? e.getBoundingClientRect().width / e.offsetWidth : 1;   // a scaled box shows a scaled font
        const px = parseFloat(getComputedStyle(e).fontSize) * (sc || 1);
        if (px < minPx - 0.5) note('tiny', s.slice(0, 30) + '|' + Math.round(px), t, `"${s.slice(0, 30)}" at ${px.toFixed(0)} px (min ${Math.round(minPx)})`);
      }
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        if (a.s === b.s || a.op < 0.6 || b.op < 0.6) continue;   // identical stacked text reads as one; a crossfade never has both above 0.6
        const ix = Math.min(a.b.right, b.b.right) - Math.max(a.b.left, b.b.left), iy = Math.min(a.b.bottom, b.b.bottom) - Math.max(a.b.top, b.b.top);
        if (ix < 6 * K.u || iy < 0.3 * Math.min(a.b.height, b.b.height)) continue;
        if (ix * iy < 0.15 * Math.min(a.b.width * a.b.height, b.b.width * b.b.height)) continue;
        // whoever is on top at the middle of the overlap must not be an opaque card (a wipe, a panel) hiding the other
        const h = document.elementFromPoint(Math.max(a.b.left, b.b.left) + ix / 2, Math.max(a.b.top, b.b.top) + iy / 2), top = h && (a.e.contains(h) ? a : b.e.contains(h) ? b : null);
        if (!top || (() => { const low = top === a ? b : a; for (let x = h; x && x !== K.stage && !x.contains(low.e); x = x.parentElement) if (rgba(getComputedStyle(x).backgroundColor)[3] > 0.9) return true; })()) continue;
        note('overlap', a.s + '|' + b.s, t, `"${a.s.slice(0, 24)}" over "${b.s.slice(0, 24)}"`);
      }
      const line = Object.values(VO).find((v) => t >= v.start && t < v.end);
      if (line) {
        const said = new Set(words(line.text));
        for (const { s } of items) {
          const w = words(s);
          if (w.length > 6 && w.filter((x) => said.has(x)).length / w.length >= 0.6)
            note('wordy', s, t, `"${s.slice(0, 40)}" repeats the VO line`);
        }
      }
    }
    const span = (r) => (r.last > r.first ? `${t2(r.first)}–${t2(r.last)}s` : `${t2(r.first)}s`);
    for (const [c, k] of [['tiny', 'tiny'], ['overlap', 'overlap'], ['wordy', 'wordy']])
      out[k] = Object.values(runs[c] || {}).map((r) => `${span(r)} ${r.detail}`);
    return out;
  });
  console.log(JSON.stringify(res));
} finally { await browser.close(); }
