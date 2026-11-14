// Output formats by name or by size. `--formats 16x9,9x16,1200x628` takes the five named shapes and ANY WxH (both even, 16 to 8192:
// H.264 wants even sides). The size of a format is what tools/sched.py, render.mjs and qa read from REELWRIGHT_SIZE.
//   NAMED                       the named shapes → "WxH"
//   sizeOf(name)                "WxH" for a named shape or a literal WxH; throws on anything else (with the allowed names)
//   parseFormats(list)          "16x9,1200x628" → [{ name, size }]; throws one clear error for the first bad entry
// Note: a literal WxH whose name equals a named shape ("1920x1080") is the same frame, so its output suffix is the name you typed.
export const NAMED = { "16x9": "1920x1080", "9x16": "1080x1920", "1x1": "1080x1080", "4x5": "1080x1350", "16x10": "1920x1200" };

export function sizeOf(name) {
  if (Object.hasOwn(NAMED, name)) return NAMED[name];
  const m = /^(\d{2,4})x(\d{2,4})$/.exec(String(name));
  if (!m) throw new Error(`format "${name}" is not one of ${Object.keys(NAMED).join(", ")} or a WxH size like 1200x628`);
  const [w, h] = [Number(m[1]), Number(m[2])];
  if (w < 16 || h < 16 || w > 8192 || h > 8192) throw new Error(`format ${name}: each side must be 16 to 8192 px`);
  if (w % 2 || h % 2) throw new Error(`format ${name}: both sides must be even (H.264 cannot encode odd sizes); use ${w + (w % 2)}x${h + (h % 2)}`);
  return name;
}
export const parseFormats = (list) => String(list || "").split(",").filter(Boolean).map((name) => ({ name, size: sizeOf(name) }));
