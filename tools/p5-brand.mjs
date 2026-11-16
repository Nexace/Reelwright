// Brand import, the offline half: a logo inventory and a brand check over a project's brand.json (palette `colors`, `fonts`, optional
// `logos: [{ file, role }]`) and the logo files it ships (<project>/assets, <project>/brand, anything brand.json lists).
//   inventory(dir) → [{ file, format, w, h, bytes, alpha, role, listed }]   role: wordmark (wider than 2.2 : 1), icon (near square), lockup
//   check(dir) → problems [string]   missing or blurry logos, no transparency, unusable palette, ink/bg contrast under 4.5 (the same
//                                   WCAG ratio qa uses), a listed logo that is not on disk. Figma frames come in through tools/figma_export.py.
import fs from "node:fs";
import path from "node:path";

const IMG = /\.(svg|png|jpe?g|webp)$/i, LOGO = /logo|mark|wordmark|icon|brand/i;
const walk = (d, out = []) => { if (!fs.existsSync(d)) return out; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); e.isDirectory() ? walk(f, out) : out.push(f); } return out; };

function dims(file, buf) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png" && buf.length > 29 && buf.toString("ascii", 1, 4) === "PNG") {
    const ct = buf[25], trns = buf.includes(Buffer.from("tRNS"));
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), alpha: ct === 4 || ct === 6 || trns };
  }
  if (ext === ".svg") {
    const s = buf.toString("utf8", 0, 4000), vb = /viewBox\s*=\s*"([^"]+)"/.exec(s), n = (k) => { const m = new RegExp(`\\b${k}\\s*=\\s*"([\\d.]+)`).exec(s); return m ? Number(m[1]) : 0; };
    const v = vb ? vb[1].trim().split(/[\s,]+/).map(Number) : null;
    return { w: v ? v[2] : n("width"), h: v ? v[3] : n("height"), alpha: true, viewBox: !!vb };
  }
  if (/\.jpe?g$/.test(ext)) {   // SOFn marker
    for (let i = 2; i + 9 < buf.length; ) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), alpha: false };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return { w: 0, h: 0, alpha: ext === ".webp" ? undefined : false };   // webp: size not read here
}

export function inventory(dir) {
  const bf = path.join(dir, "brand.json"), brand = fs.existsSync(bf) ? JSON.parse(fs.readFileSync(bf, "utf8")) : {};
  const listed = new Map((brand.logos || []).map((l) => [path.resolve(dir, l.file), l]));
  const files = new Set([...walk(path.join(dir, "assets")), ...walk(path.join(dir, "brand"))].filter((f) => IMG.test(f) && LOGO.test(path.basename(f))).map((f) => path.resolve(f)));
  for (const f of listed.keys()) files.add(f);
  return [...files].sort().map((f) => {
    const l = listed.get(f);
    if (!fs.existsSync(f)) return { file: path.relative(dir, f), missing: true, listed: !!l };
    const buf = fs.readFileSync(f), d = dims(f, buf), ratio = d.h ? d.w / d.h : 0;
    return { file: path.relative(dir, f), format: path.extname(f).slice(1).toLowerCase(), ...d, bytes: buf.length, role: l?.role || (ratio > 2.2 ? "wordmark" : ratio && ratio < 1.4 ? "icon" : "lockup"), listed: !!l };
  });
}

const lum = (hex) => { const m = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(hex || ""); if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join("") : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

export function check(dir) {
  const bf = path.join(dir, "brand.json"), out = [];
  if (!fs.existsSync(bf)) return ["no brand.json (palette and fonts live there; `reelwright theme-from <url>` drafts one)"];
  let brand; try { brand = JSON.parse(fs.readFileSync(bf, "utf8")); } catch (e) { return [`brand.json is not valid JSON: ${e.message.split("\n")[0]}`]; }
  const colors = brand.colors || {};
  for (const [k, v] of Object.entries(colors)) if (typeof v === "string" && /^#/.test(v) && lum(v) == null) out.push(`brand.json colors.${k} "${v}" is not a #rgb / #rrggbb colour`);
  const bg = lum(colors.bg), ink = lum(colors.ink);
  if (bg != null && ink != null) { const [a, b] = [bg, ink].sort((x, y) => y - x), r = (a + 0.05) / (b + 0.05); if (r < 4.5) out.push(`brand ink on bg is contrast ${r.toFixed(1)} : 1 (needs 4.5)`); }
  const inv = inventory(dir);
  if (!inv.length) out.push("no logo found: put one in assets/ or brand/ (a file named *logo*, *mark* or *wordmark*), or list it in brand.json logos");
  for (const l of inv) {
    if (l.missing) { out.push(`brand.json lists ${l.file}, which is not on disk`); continue; }
    if (l.format === "svg" && !l.viewBox) out.push(`${l.file}: svg without a viewBox (it will not scale)`);
    if (l.format !== "svg" && l.w && l.w < 256 && l.role !== "icon") out.push(`${l.file}: ${l.w}px wide is too small for a 1080p frame (use an svg or 512px+)`);
    if (l.format !== "svg" && l.w && l.w < 128) out.push(`${l.file}: ${l.w}px wide is too small even as an icon`);
    if (l.alpha === false) out.push(`${l.file}: no transparency (${l.format}): it will show as a box on a themed background; export a PNG with alpha or an svg`);
  }
  return out;
}
