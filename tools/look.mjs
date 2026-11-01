// A film's resolved look (kit.css defaults ← themes/<style>.css ← brand.json: palette and fonts) and the
// KIT.layout.<name> calls in its film code. Used by `reelwright remix` (furthest themes) and the variety check.
//   node tools/look.mjs <project>   → one qa line: WARN when another film in projects/ uses the same theme, or the
//                                     same fonts + a palette within ΔE 10 + the same layouts (never fails the build)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { themes } from "./theme.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const PALETTE = ["bg", "ink", "muted", "accent", "surface"];
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "");
const tokens = (css) => Object.fromEntries([...css.matchAll(/--kit-([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const KIT = tokens(read(path.join(ROOT, "tools", "kit.css")).match(/:root\s*{([^}]*)}/)[1]);

// #hex → CIE Lab (D65), for ΔE76
function lab(c) {
  const m = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(c || "");
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join("") : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const [x, y, z] = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883].map(f);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function look(dir, style, env = true) {   // style: a theme to try instead; env: honour --style
  const P = JSON.parse(read(path.join(dir, "project.json")));
  style ||= (env && process.env.REELWRIGHT_STYLE) || P.style || null;
  const t = { ...KIT, ...(style ? tokens(read(path.join(ROOT, "themes", style + ".css"))) : {}) };
  const bf = path.join(dir, "brand.json"), brand = fs.existsSync(bf) ? JSON.parse(read(bf)) : null;
  for (const [k, v] of Object.entries(brand?.colors || {})) t[k.replace(/^--(kit-)?/, "")] = v;
  for (const [k, v] of Object.entries(brand?.fonts || {})) t["font-" + k] = `"${typeof v === "string" ? v : v.family}"`;
  const font = (k) => { let v = t["font-" + k] || ""; for (let i = 0; i < 3 && /^var\(--kit-/.test(v); i++) v = t[v.slice(10, -1)] || "";
    return v.split(",")[0].replace(/["']/g, "").trim(); };
  const code = ["film/film.js", "hf/film.js"].map((f) => read(path.join(dir, f))).join("\n");
  const alias = [...code.matchAll(/(\w+)\s*=\s*KIT\.layout\b/g)].map((m) => m[1]);
  const layouts = new Set([...code.matchAll(new RegExp(`\\b(?:KIT\\.layout${alias.map((a) => "|" + a).join("")})\\.(\\w+)\\(`, "g"))].map((m) => m[1]));
  return { style, brand: !!brand, palette: PALETTE.map((k) => lab(t[k])), fonts: [font("display"), font("text")], layouts: [...layouts].sort() };
}

// mean ΔE over the palette tokens both sides define
export function paletteDE(a, b) {
  const d = a.palette.map((x, i) => x && b.palette[i] && dE(x, b.palette[i])).filter((x) => typeof x === "number");
  return d.length ? d.reduce((s, x) => s + x, 0) / d.length : 0;
}
// palette distance plus a step for each font family that differs
const distance = (a, b) => paletteDE(a, b) + (a.fonts[0] !== b.fonts[0] ? 25 : 0) + (a.fonts[1] !== b.fonts[1] ? 15 : 0);

// the n themes furthest from the project's own look
export function furthest(dir, n = 3) {
  const own = look(dir);
  return themes().filter((s) => s !== own.style).map((s) => [s, distance(own, look(dir, s))]).sort((a, b) => b[1] - a[1]).slice(0, n).map((x) => x[0]);
}

// variety: [status, message] against every other project in projects/
export function variety(dir) {
  const own = look(dir);
  if (!own.style && !own.brand) return ["SKIP", "(no theme or brand.json: the look is in the film's own CSS)"];
  const warn = [];
  const others = fs.readdirSync(path.join(ROOT, "projects")).map((p) => path.join(ROOT, "projects", p))
    .filter((p) => path.resolve(p) !== path.resolve(dir) && fs.existsSync(path.join(p, "project.json")));
  for (const o of others) {
    const b = look(o, null, false), name = path.relative(ROOT, o).split(path.sep).join("/");
    if (!b.style && !b.brand) continue;
    if (own.style && own.style === b.style) warn.push(`same theme "${own.style}" as ${name}`);
    else if (own.fonts.join() === b.fonts.join() && paletteDE(own, b) < 10 && own.layouts.join() === b.layouts.join())
      warn.push(`same fonts (${own.fonts.join(", ")}), palette ΔE ${paletteDE(own, b).toFixed(1)} and layouts as ${name}`);
  }
  return warn.length ? ["WARN", warn.join("; ")] : ["PASS", `(differs from ${others.length} other films)`];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [s, msg] = variety(path.resolve(process.argv[2] || "projects/example"));
  console.log(`  ${s.padEnd(4)}  variety  ${msg}`);
}
