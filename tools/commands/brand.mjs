// brand [project] inventory | check   the project's logos (assets/, brand/, brand.json "logos") as a table, and the brand check: palette
//                  colours valid, ink on bg contrast >= 4.5, every listed logo on disk, no raster logo too small or without
//                  transparency, svg with a viewBox. Exit 1 on any problem. Figma frames: tools/figma_export.py. tools/p5-brand.mjs.
import path from "node:path";
import { inventory, check } from "../p5-brand.mjs";

export default async ({ proj, args }) => {
  const [sub] = args, dir = path.resolve(proj);
  if (sub === "inventory") {
    const inv = inventory(dir);
    if (!inv.length) return console.log("no logos found");
    for (const l of inv) console.log(l.missing ? `MISSING  ${l.file}` : `${l.role.padEnd(8)} ${l.file}  ${l.format} ${l.w || "?"}x${l.h || "?"} ${l.alpha === false ? "no-alpha" : "alpha"} ${(l.bytes / 1024).toFixed(0)} KB${l.listed ? " (listed)" : ""}`);
    return;
  }
  if (sub === "check") {
    const p = check(dir);
    for (const x of p) console.log("  FAIL  " + x);
    console.log(p.length ? `brand: ${p.length} problem(s)` : "brand: ok");
    if (p.length) process.exit(1);
    return;
  }
  console.log("usage: reelwright brand <project> inventory | check");
  process.exit(1);
};
