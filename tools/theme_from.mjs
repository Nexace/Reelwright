// Draft theme tokens from a page's facts (tools/capture_site.mjs) or an image's colours.
//   draftTheme(facts) → { base, tokens: { "<token>": value }, fonts: { display|text|mono: family }, notes: [..] }
//   imageFacts(file)  → facts with colours only (fonts can't be read from pixels)
//   themeCss(name, source, draft) → a themes/<name>.css: the base theme's file plus a :root block of drafted tokens
// Fonts that aren't bundled map to the nearest bundled SIL OFL family in fonts/ (name table, else the stack's generic).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./browser.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const FONTS = path.join(ROOT, "fonts"), THEMES = path.join(ROOT, "themes");
const slug = (f) => f.toLowerCase().replace(/\s+/g, "-");

// ── colour ──
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
const lum = (h) => { const l = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
export const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, p) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * p));   // p of b into a
const chroma = (h) => (Math.max(...rgb(h)) - Math.min(...rgb(h))) / 255;
const hue = (h) => {
  const [r, g, b] = rgb(h).map((v) => v / 255), mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  if (!d) return 0;
  return (60 * (mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) + 360) % 360;
};
const rotate = (h, deg) => {   // hue rotation in RGB (Rodrigues about the grey axis), enough for a second accent
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), k = (1 - c) / 3, q = Math.sqrt(1 / 3) * s;
  const [r, g, b] = rgb(h);
  return hex([r * (c + k) + g * (k - q) + b * (k + q), r * (k + q) + g * (c + k) + b * (k - q), r * (k - q) + g * (k + q) + b * (c + k)]);
};
const best = (on, ...cs) => cs.sort((x, y) => ratio(y, on) - ratio(x, on))[0];   // the colour that reads best on `on`

// ── fonts ──
const NEAR = [
  [/mono|code|consol|menlo|monaco|courier/i, "JetBrains Mono"],
  [/garamond|caslon|baskerville|didot|bodoni|cormorant/i, "Cormorant Garamond"],
  [/playfair|tiempos|canela|freight|recoleta|display serif/i, "Playfair Display"],
  [/(^|[^-])serif|georgia|times|merriweather|lora|charter|cambria|spectral|crimson|literata|newsreader/i, "Source Serif 4"],
  [/grotesk|grotesque|aeonik|satoshi|general sans|neue haas|haas grot/i, "Space Grotesk"],
  [/montserrat|gotham|proxima|avenir|futura|poppins|nexa|circular|gilroy|sofia|century gothic|raleway/i, "Montserrat"],
  [/manrope|dm sans|jakarta|outfit|urbanist|lexend|figtree|onest|sora/i, "Manrope"],
  [/rounded|nunito|varela|comfortaa|mulish/i, "Nunito"],
  [/quicksand/i, "Quicksand"], [/fredoka|baloo|chewy/i, "Fredoka"], [/syne|unbounded|clash/i, "Syne"],
  [/work sans|karla|rubik|archivo(?! black)|chivo/i, "Work Sans"],
  [/black|heavy|impact|anton|bebas|oswald|league gothic/i, "Archivo Black"],
];
const weights = (fam) => fs.readdirSync(path.join(FONTS, slug(fam))).filter((f) => f.endsWith(".woff2")).map((f) => +f.slice(0, -6));
export function mapFont(stack, role) {
  const fams = stack.split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  const first = fams[0] || "";
  if (first && fs.existsSync(path.join(FONTS, slug(first)))) return { family: first, why: "bundled" };
  const hit = NEAR.find(([re]) => re.test(first));
  if (hit) return { family: hit[1], why: "nearest bundled" };
  const g = fams.includes("monospace") ? "JetBrains Mono" : fams.includes("serif") ? (role === "display" ? "Playfair Display" : "Source Serif 4")
    : role === "display" ? "Inter Tight" : role === "mono" ? "JetBrains Mono" : "Inter";
  return { family: g, why: "nearest bundled, by generic family" };
}

// facts.colors: { bg, ink, accent: [[hex, weight], ...] } sorted by weight; facts.fonts / facts.buttons optional
export function draftTheme(facts) {
  const C = facts.colors, notes = [];
  const bg = C.bg[0]?.[0] || "#ffffff", dark = lum(bg) < 0.2;
  const inks = C.ink.map(([h]) => h);
  // ink: the strongest of the main readable text colours (headings), muted: the commonest softer one (body copy)
  const readable = inks.filter((h) => ratio(h, bg) >= 4.5).slice(0, 4);
  const ink = readable.length ? best(bg, ...readable) : best(bg, "#111111", "#ffffff");
  const muted = inks.find((h) => h !== ink && ratio(h, bg) >= 3 && ratio(h, bg) < ratio(ink, bg) - 1) || mix(ink, bg, 0.4);
  const accs = C.accent.map(([h]) => h).filter((h) => chroma(h) > 0.25 && ratio(h, bg) >= 1.8);
  const tokens = { bg, "bg-image": "none", ink, muted };
  const surface = dark ? mix(bg, "#ffffff", 0.07) : mix(bg, "#ffffff", 0.7);
  if (accs.length) {
    const accent = accs[0];
    const a2 = accs.find((h) => Math.min(Math.abs(hue(h) - hue(accent)), 360 - Math.abs(hue(h) - hue(accent))) > 25) || rotate(accent, 40);
    Object.assign(tokens, { accent, "accent-2": a2, "on-accent": best(accent, bg, ink) });
  } else notes.push("no saturated colour found: accent kept from the base theme");
  const sayInk = ratio(ink, surface) >= 4.5 ? ink : best(surface, "#111111", "#ffffff");
  Object.assign(tokens, { surface, "sub-bg": surface, "sub-ink": hex(rgb(sayInk)) + "73",
    "sub-said": tokens.accent && ratio(tokens.accent, surface) >= 4.5 ? tokens.accent : sayInk, "sub-now": sayInk });
  const btn = (facts.buttons || []).find((b) => b.radius > 0);
  if (btn) tokens.radius = Math.round(Math.min(28, btn.radius * 1.5)) + "px";   // cards are a bit rounder than buttons

  const fonts = {};
  for (const role of ["display", "text", "mono"]) {
    const f = facts.fonts?.[role];
    if (!f) continue;
    const m = mapFont(f.stack, role), site = f.stack.split(",")[0].trim();
    fonts[role] = m.family;
    notes.push(`${role}: ${site} → ${m.family} (${m.why})`);
    if (role === "display") {
      const w = weights(m.family).sort((a, b) => Math.abs(a - f.weight) - Math.abs(b - f.weight))[0];
      tokens["display-weight"] = w;
    }
  }
  return { base: dark ? "dark-tech" : "clean", tokens, fonts, notes };
}

// colours of an image: a 4-bit-per-channel histogram of a ≤ 256 px copy, drawn in the browser
export async function imageFacts(file) {
  const type = { ".png": "png", ".jpg": "jpeg", ".jpeg": "jpeg", ".webp": "webp" }[path.extname(file).toLowerCase()];
  if (!type) throw new Error(`${file}: use a .png, .jpg or .webp image`);
  const src = `data:image/${type};base64,` + fs.readFileSync(file).toString("base64");
  const b = await launch();
  try {
    const p = await b.newPage();
    const buckets = await p.evaluate(async (src) => {
      const im = new Image(); im.src = src; await im.decode();
      const k = Math.min(1, 256 / Math.max(im.width, im.height)), w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
      const cv = Object.assign(document.createElement("canvas"), { width: w, height: h }), g = cv.getContext("2d");
      g.drawImage(im, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data, m = new Map();
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue;
        const key = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4, s = m.get(key) || [0, 0, 0, 0];
        s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; s[3]++; m.set(key, s);
      }
      return [...m.values()].map(([r, g2, b2, n]) => [[r / n, g2 / n, b2 / n], n / (w * h)]);
    }, src);
    const list = buckets.map(([c, n]) => [hex(c), n]).sort((a, b) => b[1] - a[1]);
    const acc = list.filter(([h, n]) => n > 0.005 && chroma(h) > 0.25).map(([h, n]) => [h, chroma(h) * Math.sqrt(n)]).sort((a, b) => b[1] - a[1]);
    return { colors: { bg: list.slice(0, 6), ink: list.filter(([, n]) => n > 0.002).slice(0, 12), accent: acc.slice(0, 6) } };
  } finally { await b.close(); }
}

export function themeCss(name, source, d) {
  const v = Object.entries(d.tokens).map(([k, x]) => `--kit-${k}: ${x};`);
  for (const [role, fam] of Object.entries(d.fonts))
    v.push(`--kit-font-${role}: "${fam}", ${role === "mono" ? "monospace" : /serif|garamond|playfair/i.test(fam) ? "serif" : "sans-serif"};`);
  const base = fs.readFileSync(path.join(THEMES, d.base + ".css"), "utf8");
  return `/* ${name}: drafted by \`reelwright theme-from ${source}\` on the ${d.base} theme — a starting point, edit freely.\n` +
    d.notes.map((n) => `   ${n}\n`).join("") + `   Below: the ${d.base} theme as it was, then the drafted tokens, which win. */\n` +
    base + `\n/* drafted from ${source} */\n:root {\n  --kit-theme: "${name}";\n  ${v.join("\n  ")}\n}\n`;
}
