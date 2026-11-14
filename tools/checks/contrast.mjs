// tools/checks/contrast.mjs — WCAG AA contrast audit with a suggested colour (HyperFrames `check` contrast audit, G4).
//   contrastAudit(page, { times, minNormal = 4.5, minLarge = 3 }) → [ 'contrast 2.40s #grey "Low…": 1.4:1 < 4.5 (#777777 on #666666) → try #ffffff' ]
// For each time: seeks with window.render(t), lists the visible text (colour × opacity chain, size, weight, boxes),
// hides the text and screenshots the frame so the background is what is really drawn (gradients, images, video), samples it
// under each text box and takes the worst sample. One line per element, at its worst time. Large text (≥ 24 px, or ≥ 18.66 px
// bold) needs 3:1, the rest 4.5:1. The suggestion keeps the text colour's hue and saturation and moves its lightness the
// least that reaches the bar (white or black when no lightness does). Gradient-clipped text is skipped (no single colour).
// Pure helpers (ratio, suggestColour, hex) are exported for tests; the browser part needs only `page` (Playwright).

const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
export const hex = (c) => "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
const toHsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const fromHsl = ([h, s, l]) => {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};
// the colour nearest `fg` (same hue and saturation, lightness moved) that reaches `target`:1 on `bg`; a hex string
export function suggestColour(fg, bg, target = 4.5) {
  if (ratio(fg, bg) >= target) return hex(fg);
  const toward = ratio([255, 255, 255], bg) >= ratio([0, 0, 0], bg) ? 1 : 0;   // lighten or darken, whichever the background favours
  const [h, s, l0] = toHsl(fg), ok = (l) => ratio(fromHsl([h, s, l]).map(Math.round), bg) >= target;
  if (!ok(toward)) return toward ? "#ffffff" : "#000000";   // no lightness of this hue reaches it: the best extreme
  let lo = l0, hi = toward;   // lo fails, hi passes: bisect to the least change
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; }
  return hex(fromHsl([h, s, hi]).map(Math.round));
}

const IN_PAGE_LIST = () => {   // visible text boxes at the current frame
  const rgba = (c) => { const m = c.match(/[\d.]+/g) || [0, 0, 0, 0]; return m.length < 4 ? [...m.map(Number), 1] : m.map(Number); };
  const out = [];
  const sel = (e) => {
    if (e.id) return `#${e.id}`;
    const c = [...e.classList].filter((x) => !/^kit-/.test(x))[0] || [...e.classList][0];
    const p = e.parentElement, sib = p ? [...p.children].filter((x) => x.tagName === e.tagName) : [];
    return e.tagName.toLowerCase() + (c ? "." + c : "") + (sib.length > 1 ? `:nth-of-type(${sib.indexOf(e) + 1})` : "");
  };
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    const text = n.textContent.trim(), e = n.parentElement;
    if (!text || !e || /^(script|style|noscript)$/i.test(e.tagName)) continue;
    let op = 1, hidden = false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) {
      const s = getComputedStyle(x);
      if (s.display === "none" || s.visibility === "hidden") { hidden = true; break; }
      op *= Number(s.opacity);
    }
    if (hidden || op < 0.05) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const boxes = [...r.getClientRects()].map((b) => ({ x: Math.max(0, b.left), y: Math.max(0, b.top), w: Math.min(innerWidth, b.right) - Math.max(0, b.left), h: Math.min(innerHeight, b.bottom) - Math.max(0, b.top) }))
      .filter((b) => b.w > 2 && b.h > 2);
    if (!boxes.length) continue;
    const s = getComputedStyle(e);
    if (s.backgroundClip === "text" || s.webkitBackgroundClip === "text") continue;
    const c = rgba(s.color);
    out.push({ sel: sel(e), text: text.slice(0, 30), fg: c.slice(0, 3), a: c[3] * op, px: parseFloat(s.fontSize), wt: parseInt(s.fontWeight) || 400, boxes });
  }
  return out;
};

const DECODE = async ({ png, items, iw }) => {   // the pixel under each text box, 6 × 3 per box
  const img = new Image(); img.src = "data:image/png;base64," + png; await img.decode();
  const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(img, 0, 0);
  const k = img.width / iw;   // device pixels per CSS pixel (1 here, but don't assume)
  return items.map((it) => it.boxes.flatMap((b) => {
    const out = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
      const x = Math.min(img.width - 1, Math.max(0, Math.round((b.x + (b.w * (i + 0.5)) / 6) * k)));
      const y = Math.min(img.height - 1, Math.max(0, Math.round((b.y + (b.h * (j + 0.5)) / 3) * k)));
      out.push([...cx.getImageData(x, y, 1, 1).data].slice(0, 3));
    }
    return out;
  }));
};

export async function contrastAudit(page, { times, minNormal = 4.5, minLarge = 3 } = {}) {
  const dec = page;   // the decode draws on a detached canvas: the film's DOM stays untouched
  const worst = new Map();
  {
    for (const t of times) {
      await page.evaluate((t) => window.render(t), t);
      const items = await page.evaluate(IN_PAGE_LIST);
      if (!items.length) continue;
      const style = await page.addStyleTag({ content: "*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}" });
      const png = (await page.screenshot({ type: "png" })).toString("base64");
      await style.evaluate((n) => n.remove());
      const samples = await dec.evaluate(DECODE, { png, items, iw: await page.evaluate(() => innerWidth) });
      items.forEach((it, i) => {
        const large = it.px >= 24 || (it.px >= 18.66 && it.wt >= 700), need = large ? minLarge : minNormal;
        let w = null;
        for (const bg of samples[i]) {
          const eff = it.fg.map((v, k) => v * it.a + bg[k] * (1 - it.a));
          const r = ratio(eff, bg);
          if (!w || r < w.r) w = { r, bg, eff };
        }
        const cur = worst.get(it.sel);
        if (w.r < need && (!cur || w.r < cur.r)) worst.set(it.sel, { ...w, need, t, it });
      });
    }
  }
  return [...worst.values()].sort((a, b) => a.t - b.t).map(({ r, bg, need, t, it }) =>
    `contrast ${t.toFixed(2)}s ${it.sel} "${it.text}": ${r.toFixed(1)}:1 < ${need} (${hex(it.fg)} on ${hex(bg)}) → try ${suggestColour(it.fg, bg, need)}`);
}
