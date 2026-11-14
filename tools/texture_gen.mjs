// tools/texture_gen.mjs — procedural greyscale PNG textures, generated locally and deterministically (same name, same bytes).
//   texturePng(name, size = 512) → Buffer      textureKind(name) → "wood" | "marble" | "brick" | …
// HyperFrames' texture components (caption-texture, texture-mask-text) cut or fill text with luminance maps from ambientCG (CC0).
// Those photos are not in this repo and cannot be fetched at build time, so `reelwright add` writes these STAND-INS under the
// same file names: same role (a luminance map: bright = shows), a recognisable material, not the photograph. The family comes from
// the name (lava, wood-066, bricks-104, metal-046-b …); the variant number seeds the pattern. Pure JS, no dependencies.
import zlib from "node:zlib";

// ── hashing, noise ──
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const fade = (t) => t * t * (3 - 2 * t);
const vnoise = (x, y, s) => {
  const xi = Math.floor(x), yi = Math.floor(y), fx = fade(x - xi), fy = fade(y - yi);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const fbm = (x, y, s, oct = 5) => { let v = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += a * vnoise(x * f, y * f, s + i * 17); a /= 2; f *= 2; } return v / 0.96875; };
const voronoi = (x, y, s) => {   // → [distance to nearest point, distance to second nearest]
  const xi = Math.floor(x), yi = Math.floor(y); let d1 = 9, d2 = 9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const px = xi + i + hash(xi + i, yi + j, s), py = yi + j + hash(xi + i, yi + j, s + 91), d = Math.hypot(px - x, py - y);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return [d1, d2];
};
const clamp = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => fade(clamp((v - a) / (b - a)));

const KINDS = [["lava", /^lava/], ["wood", /^wood/], ["marble", /^(marble|onyx|travertine)/], ["brick", /^brick/], ["tile", /^(tiles?|paving|diamond)/],
  ["rock", /^(rock|ground)/], ["metal", /^metal/], ["grass", /^grass/], ["bark", /^bark/], ["fabric", /^(fabric|carpet|leather)/], ["snow", /^snow/],
  ["concrete", /^(concrete|plaster|painted|asphalt|road)/]];
export const textureKind = (name) => (KINDS.find(([, re]) => re.test(name)) || ["concrete"])[0];
const seedOf = (name) => [...name].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7) >>> 0 & 0xffff;

const FN = {   // (u, v in 0..8, seed) → 0..1
  lava: (u, v, s) => { const [a, b] = voronoi(u * 0.9, v * 0.9, s), crack = 1 - smooth(0.02, 0.16, b - a); return clamp(0.12 + crack * (0.75 + 0.25 * fbm(u * 3, v * 3, s))); },
  wood: (u, v, s) => { const r = (v * 2.2 + fbm(u * 0.35, v * 0.25, s) * 6) * 3.1; return clamp(0.5 + 0.28 * Math.sin(r) + 0.16 * (fbm(u * 6, v * 1.2, s + 3) - 0.5)); },
  marble: (u, v, s) => { const w = (u + v) * 0.9 + fbm(u * 0.6, v * 0.6, s) * 6; return clamp(0.82 - 0.7 * Math.pow(Math.abs(Math.sin(w * 1.4)), 6) + 0.12 * fbm(u * 3, v * 3, s + 5)); },
  brick: (u, v, s) => {
    const row = Math.floor(v * 1.1), x = u * 0.55 + (row % 2) * 0.5, fx = x - Math.floor(x), fy = v * 1.1 - row, id = Math.floor(x) + row * 31;
    const mortar = smooth(0.04, 0.09, fx) * smooth(0.04, 0.09, 1 - fx) * smooth(0.06, 0.14, fy) * smooth(0.06, 0.14, 1 - fy);
    return clamp(0.12 + mortar * (0.55 + 0.25 * hash(id, row, s) + 0.18 * fbm(u * 5, v * 5, s)));
  },
  tile: (u, v, s) => {
    const fx = (u * 0.5) % 1, fy = (v * 0.5) % 1, id = Math.floor(u * 0.5) + 17 * Math.floor(v * 0.5);
    const g = smooth(0.0, 0.05, fx) * smooth(0, 0.05, 1 - fx) * smooth(0, 0.05, fy) * smooth(0, 0.05, 1 - fy);
    return clamp(0.1 + g * (0.6 + 0.2 * hash(id, 3, s) + 0.15 * fbm(u * 4, v * 4, s)));
  },
  rock: (u, v, s) => { const [a, b] = voronoi(u * 0.7, v * 0.7, s); return clamp(0.25 + 0.5 * smooth(0, 0.35, b - a) + 0.45 * (fbm(u * 2.5, v * 2.5, s + 9) - 0.4)); },
  metal: (u, v, s) => clamp(0.55 + 0.3 * (vnoise(u * 0.2, v * 40, s) - 0.5) + 0.2 * (fbm(u * 0.5, v * 3, s + 4) - 0.5)),
  grass: (u, v, s) => clamp(0.15 + 0.85 * Math.pow(vnoise(u * 22, v * 1.6, s), 1.6) * (0.55 + 0.6 * fbm(u * 1.5, v * 1.5, s))),
  bark: (u, v, s) => clamp(0.2 + 0.7 * smooth(0.15, 0.85, fbm(u * 7, v * 0.5, s)) * (0.6 + 0.5 * vnoise(u * 3, v * 9, s + 2))),
  fabric: (u, v, s) => { const a = Math.sin(u * 20.1) * Math.sin(v * 20.1); return clamp(0.5 + 0.25 * a + 0.2 * (fbm(u * 8, v * 8, s) - 0.5)); },
  snow: (u, v, s) => clamp(0.8 + 0.3 * (fbm(u * 3, v * 3, s) - 0.5) + 0.12 * (hash(Math.floor(u * 90), Math.floor(v * 90), s) > 0.985 ? 1 : 0)),
  concrete: (u, v, s) => clamp(0.5 + 0.45 * (fbm(u * 1.4, v * 1.4, s) - 0.5) + 0.22 * (fbm(u * 18, v * 18, s + 1) - 0.5) - (hash(Math.floor(u * 40), Math.floor(v * 40), s + 6) > 0.992 ? 0.35 : 0)),
};

export function texturePng(name, size = 512) {
  const kind = textureKind(name), f = FN[kind], s = seedOf(name), raw = Buffer.alloc((size + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size + 1)] = 0;   // PNG filter: none
    for (let x = 0; x < size; x++) raw[y * (size + 1) + 1 + x] = Math.round(clamp(f((x / size) * 8, (y / size) * 8, s)) * 255);
  }
  const chunk = (type, data) => {
    const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, "latin1"); data.copy(b, 8);
    b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length); return b;
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 0;   // 8-bit greyscale
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
const TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = TABLE[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
