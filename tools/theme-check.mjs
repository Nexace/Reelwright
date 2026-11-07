// node tools/theme-check.mjs [theme ...]   static check of themes/*.css (all, or those named); exit 1 on a FAIL.
// Resolves each theme over kit.css's defaults and checks, with no browser:
// FAIL (a broken theme):
//   tokens    every --kit-* token kit.css defines is set by the theme itself (a theme is a whole look, not a patch)
//   palette   bg, ink, muted, accent, surface are #hex (tools/look.mjs measures looks from them)
//   fonts     the first family of every --kit-font-* / --kit-label-font is bundled in fonts/ (offline, same on every OS)
// WARN (legible, but check the stills): WCAG contrast of the token pairs the layouts draw text with — ink on bg and on
//   surface ≥ 4.5 (titles, small labels); muted on bg and on surface ≥ 3 (body copy, ≥ 26 px × KIT.u); accent on bg ≥ 3
//   (kickers, icons); on-accent on accent ≥ 3 (hero tiles). Captions are measured on real pixels by `qa` instead
//   (a theme's .kit-subrow rules can change their ground). Colours it can't parse (color-mix, gradients) are skipped.
// tools/selfcheck/themes.mjs runs it in CI; tools/theme-gallery.mjs renders every theme.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), "utf8");
const tokens = (css) => Object.fromEntries([...css.matchAll(/--kit-([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const KIT = tokens(read("tools", "kit.css").match(/:root\s*{([^}]*)}/)[1]);
const SKIP = new Set(["logo", "boil", "sub-now"]);   // optional: kit.css defaults are right for almost every look
const slug = (f) => f.toLowerCase().replace(/\s+/g, "-");

// "#rgb", "#rrggbb", "rgb(a)(r,g,b[,a])", "transparent" → [r,g,b,a] (0-255, a 0-1); else null
export function rgba(c) {
  c = String(c || "").trim();
  if (c === "transparent") return [0, 0, 0, 0];
  let m = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(c);
  if (m) { const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join("") : m[1]; return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1); }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(c);
  if (!m) return null;
  const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4];
  return [+m[1], +m[2], +m[3], a];
}
const over = (f, b) => [0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3])).concat(1);
const lum = (c) => c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
  .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

export function checkTheme(name) {
  const css = read("themes", name + ".css"), own = tokens(css), t = { ...KIT, ...own }, out = [], warn = [];
  const val = (k, d = 0) => { const v = t[k]; const r = v && /^var\(--kit-([\w-]+)\)$/.exec(v); return r && d < 4 ? val(r[1], d + 1) : v; };
  for (const k of Object.keys(KIT)) if (!SKIP.has(k) && !(k in own)) out.push(`token --kit-${k} not set`);
  for (const k of ["bg", "ink", "muted", "accent", "surface"]) if (!/^#[\da-f]{3}([\da-f]{3})?$/i.test(val(k) || "")) out.push(`--kit-${k} is not #hex: ${val(k)}`);
  for (const k of ["font-display", "font-text", "font-mono", "label-font"]) {
    const fam = (val(k) || "").split(",")[0].replace(/["']/g, "").trim();
    if (!fs.existsSync(path.join(ROOT, "fonts", slug(fam)))) out.push(`--kit-${k}: "${fam}" is not bundled in fonts/`);
  }
  const c = (k) => rgba(val(k)), bg = c("bg");
  const need = (fk, bk, min, f = c(fk), b = c(bk)) => {
    if (!f || !b) return;
    const r = contrast(over(f, over(b, bg || [255, 255, 255, 1])), over(b, bg || [255, 255, 255, 1]));
    if (r < min) warn.push(`contrast ${fk} on ${bk} ${r.toFixed(2)}:1 (needs ${min})`);
  };
  if (bg) {
    need("ink", "bg", 4.5); need("ink", "surface", 4.5); need("muted", "bg", 3); need("muted", "surface", 3);
    need("accent", "bg", 3); need("on-accent", "accent", 3);
  }
  return { fail: out, warn };
}

export const allThemes = () => fs.readdirSync(path.join(ROOT, "themes")).filter((f) => f.endsWith(".css")).map((f) => f.slice(0, -4)).sort();

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : allThemes();
  let bad = 0;
  for (const n of names) {
    const { fail, warn } = checkTheme(n);
    console.log(`${fail.length ? "FAIL" : warn.length ? "WARN" : "PASS"} ${n}` +
      fail.map((x) => "\n     FAIL " + x).join("") + warn.map((x) => "\n     WARN " + x).join(""));
    bad += fail.length > 0;
  }
  console.log(`${names.length - bad}/${names.length} themes pass`);
  process.exit(bad ? 1 : 0);
}
