// copyKit(hfDir): the kit travels with a HyperFrames composition (HyperFrames serves only that folder).
// Copies every tools/*.js and tools/kit.css into <hf>/kit/, and every vendor/<lib>/ that has a kit.json manifest
// into <hf>/kit/<lib>/. A new kit module or library is a new file, not an edit to a list.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

export function kitFiles() {
  return fs.readdirSync(path.join(ROOT, "tools")).filter((f) => f.endsWith(".js") || f === "kit.css").sort();
}
export function kitLibs() {
  const V = path.join(ROOT, "vendor");
  return fs.readdirSync(V).filter((d) => fs.existsSync(path.join(V, d, "kit.json"))).sort();
}
export function copyKit(hf) {
  const kit = path.join(hf, "kit");
  fs.mkdirSync(kit, { recursive: true });
  for (const f of kitFiles()) fs.copyFileSync(path.join(ROOT, "tools", f), path.join(kit, f));
  for (const d of kitLibs()) fs.cpSync(path.join(ROOT, "vendor", d), path.join(kit, d), { recursive: true });
}
