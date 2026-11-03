// node tools/qa_page.mjs <project>  — the page half of `reelwright qa` (tools/qa.py runs it and prints the result).
// Opens the film page (film/index.html, or hf/index.html for renderer "hyperframes"), seeks with window.render(t)
// and prints JSON { captions: [problems], illustrative: [times], ai: [lines], hasCaptions }:
//   captions      at each VO line's middle and end: the caption row sits inside KIT.safe horizontally and inside the
//                 frame, wraps to ≤ 2 lines, and its said/now words reach WCAG contrast 4.5 against what's behind them
//   illustrative  every 0.5 s: when visible text outside the captions shows a data-like number (%, currency, ×, k/M,
//                 1,200, 4.8), an "Illustrative data" label is visible too. A visible <img data-qa-text="…"> (a
//                 screenshot, with the text it shows) counts the same, but there a "Source: …" credit also passes:
//                 real numbers from a real site, credited
//   ai            every 0.5 s: a visible <img>/<video> whose file is listed in <project>/assets/gen.json (written by
//                 `reelwright gen`) has a visible KIT.aiLabel (.kit-ai-label) or "AI-generated" text; no gen.json, no check
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "./browser.mjs";

const DIR = path.resolve(process.argv[2]);
const P = JSON.parse(fs.readFileSync(path.join(DIR, "project.json"), "utf8"));
const [W, H] = (process.env.REELWRIGHT_SIZE || `${P.width || 1920}x${P.height || 1080}`).split("x").map(Number);
const page = path.join(DIR, P.renderer === "hyperframes" ? "hf/index.html" : "film/index.html");

let gen = [];   // gen.json entries' files, e.g. "assets/hero.png"
try { gen = JSON.parse(fs.readFileSync(path.join(DIR, "assets/gen.json"), "utf8")).assets.map((a) => a.file); } catch {}

const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
try {
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(pathToFileURL(page).href);
  if (!(await p.evaluate(() => window.READY).catch(() => false)))
    throw new Error(`${path.relative(process.cwd(), page)} failed to load: ${errs.join("; ") || "READY never resolved"}`);
  const res = await p.evaluate(async (gen) => {
    const K = window.KIT, VO = window.VO || {}, out = { captions: [], illustrative: [], hasCaptions: false };
    out.ai = [];
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
    const dur = window.FILM.DUR, aiSeen = new Set();
    for (let t = 0; t < dur; t += 0.5) {
      await window.render(t);
      let num = null, aiLab = false, label = false, credit = false, shot = null;
      const walk = document.createTreeWalker(K.stage, NodeFilter.SHOW_TEXT);
      for (let n; (n = walk.nextNode());) {
        const s = n.textContent.trim(), e = n.parentElement;
        if (!s || e.closest('.kit-subs') || !visible(e)) continue;
        if (/\bAI[- ]generated\b/i.test(s) || e.closest('.kit-ai-label')) aiLab = true;
        if (/illustrative/i.test(s)) label = true;
        else if (/^source\b/i.test(s)) credit = true;
        else if (data(s)) num ??= s;
      }
      for (const im of K.stage.querySelectorAll('img[data-qa-text]')) if (!shot && visible(im)) shot = data(im.dataset.qaText);
      if (num && !label) out.illustrative.push(`${t2(t)}s "${num.slice(0, 30)}"`);
      if (shot && !label && !credit) out.illustrative.push(`${t2(t)}s "${shot}" in a screenshot (data-qa-text), no label or Source credit`);
      for (const m of gen.length && !aiLab ? K.stage.querySelectorAll('img, video') : []) {
        let src = (m.currentSrc || m.src || '').split(/[?#]/)[0]; try { src = decodeURIComponent(src); } catch {}   // a bare % (data: URIs) must not kill the page check
        const f = gen.find((g) => src.endsWith('/' + g));
        if (f && visible(m) && !aiSeen.has(f)) { aiSeen.add(f); out.ai.push(`${t2(t)}s ${f} on screen with no AI label`); }
      }
    }
    return out;
  }, gen);
  console.log(JSON.stringify(res));
} finally { await browser.close(); }
