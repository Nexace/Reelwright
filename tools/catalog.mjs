// catalog(ROOT) → every HyperFrames registry item reelwright has: components (vendor/hyperframes/registry/components/*/registry-item.json)
// and blocks (registry/blocks/index.json, supported ones; the unsupported ones carry status "unsupported" and their reason).
// search(items, { type, tag, q, supported }) filters; byTag(items, name) is what `add captions` resolves. Pure over the files; offline.
import fs from "node:fs";
import path from "node:path";

export function catalog(ROOT) {
  const reg = path.join(ROOT, "vendor", "hyperframes", "registry"), out = [];
  const comps = path.join(reg, "components");
  if (fs.existsSync(comps)) for (const n of fs.readdirSync(comps).sort()) {
    const f = path.join(comps, n, "registry-item.json");
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    const files = (j.files || []).map((x) => x.path);
    out.push({ name: n, type: "component", title: j.title || n, description: j.description || "", tags: j.tags || [],
      status: files.length === 1 && files[0].endsWith(".html") ? "supported" : "assets", files });
  }
  const bi = path.join(reg, "blocks", "index.json");
  if (fs.existsSync(bi)) for (const [n, b] of Object.entries(JSON.parse(fs.readFileSync(bi, "utf8")).blocks).sort(([a], [b]) => a < b ? -1 : 1))
    out.push({ name: n, type: "block", title: b.title || n, description: b.description || "", tags: b.tags || [], status: b.status,
      reason: b.reason, duration: b.duration, size: b.width && `${b.width}x${b.height}` });
  return out;
}

export function search(items, { type, tag, q, supported = true } = {}) {
  const words = (q || "").toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((i) => (!type || i.type === type) && (!tag || i.tags.includes(tag)) && (!supported || i.status === "supported") &&
    words.every((w) => `${i.name} ${i.title} ${i.description} ${i.tags.join(" ")}`.toLowerCase().includes(w)));
}

// `add captions` → the items whose tag is `captions` (or `caption-style`); an exact item name wins
export function byTag(items, name) {
  const exact = items.find((i) => i.name === name);
  return exact ? [exact] : items.filter((i) => i.status === "supported" && i.tags.includes(name));
}
