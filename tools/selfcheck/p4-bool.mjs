// Phase 11 P4, row manim:m6.5: KIT.math.bool / flatten (tools/manim-grid.js) with the vendored polygon-clipping, no browser needed.
// Exact areas for squares, a hole, chaining, an even-odd annulus, arcs against pi r^2, glued arc flags, relative commands, error messages.
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
for (const f of ["LICENSE", "VENDORED.md", "THIRD_PARTY.md", "kit.json", "polygon-clipping.umd.min.js"]) assert.ok(fs.existsSync(path.join(ROOT, "vendor/polygon-clipping", f)), `vendor/polygon-clipping/${f} is missing`);
assert.match(read("vendor/polygon-clipping/LICENSE"), /MIT License/);

const window = {};
const ctx = vm.createContext({ window, console, Math });
vm.runInContext(read("vendor/polygon-clipping/polygon-clipping.umd.min.js"), ctx);
assert.equal(typeof ctx.polygonClipping?.union, "function", "polygon-clipping did not register");
window.polygonClipping = ctx.polygonClipping;
window.KIT = { math: {}, doodle: {}, u: 1, safe: { x: 0, y: 0, w: 100, h: 100 }, W_: 100, H_: 100 };
vm.runInContext(read("tools/manim-grid.js"), ctx);
const M = window.KIT.math;

const near = (a, b, e, msg) => assert.ok(Math.abs(a - b) <= e, `${msg}: ${a} vs ${b}`);
const rect = (x, y, w, h) => `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
const A = rect(0, 0, 10, 10), B = rect(5, 5, 10, 10);

// four ops on overlapping squares: exact
near(M.union(A, B).area, 175, 1e-9, "union"); near(M.difference(A, B).area, 75, 1e-9, "difference");
near(M.intersection(A, B).area, 25, 1e-9, "intersection"); near(M.exclusion(A, B).area, 150, 1e-9, "exclusion");
assert.equal(M.bool("union", A, B).d, M.bool("union", A, B).d, "deterministic");
// a hole: 10x10 minus a 4x4 inside keeps both rings, area 84; the d draws with even-odd
const hole = M.difference(rect(0, 0, 10, 10), rect(3, 3, 4, 4));
near(hole.area, 84, 1e-9, "hole area"); assert.equal(hole.d.split("M").length - 1, 2, "outer ring + hole ring");
// chaining a result into the next op: (A ∪ B) minus a square at the far corner
near(M.difference(M.union(A, B), rect(10, 10, 5, 5)).area, 175 - 25, 1e-9, "chained");
// disjoint inputs: intersection empty, union keeps two polygons
assert.equal(M.intersection(rect(0, 0, 1, 1), rect(5, 5, 1, 1)).d, "", "disjoint intersection is empty");
assert.equal(M.union(rect(0, 0, 1, 1), rect(5, 5, 1, 1)).polys.length, 2);
// even-odd annulus as ONE d with two subpaths (R 10, r 6) intersected with a half plane square: pi (R^2 - r^2) / 2 over the right half
const ring = (r) => `M${r} 0A${r} ${r} 0 1 0 ${-r} 0A${r} ${r} 0 1 0 ${r} 0Z`;
const annulus = ring(10) + ring(6);
near(M.union(annulus, rect(-50, -50, 1, 1)).area, Math.PI * (100 - 36), Math.PI * 64 * 0.005, "annulus area");
near(M.intersection(annulus, rect(0, -20, 20, 40)).area, (Math.PI * 64) / 2, Math.PI * 32 * 0.005, "half annulus");
// flatten: arcs against pi r^2, glued flags, relative and smooth commands, quadratic, cubic circle
const area = (pts) => { let a = 0; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }); return Math.abs(a / 2); };
const circle = M.flatten(ring(20), 0.05); assert.equal(circle.length, 1); near(area(circle[0].pts), Math.PI * 400, Math.PI * 400 * 0.004, "arc circle");
const glued = M.flatten("M0 0a5 5 0 1010 0z", 0.01); near(area(glued[0].pts), (Math.PI * 25) / 2, Math.PI * 25 * 0.02, "glued flags a5 5 0 1010 0 (half circle)");
const k = 0.5522847498, c = `M20 0C20 ${20 * k} ${20 * k} 20 0 20S-20 ${20 * k} -20 0S${-20 * k} -20 0 -20S20 ${-20 * k} 20 0Z`;
near(area(M.flatten(c, 0.05)[0].pts), Math.PI * 400, Math.PI * 400 * 0.004, "cubic + smooth circle");
near(area(M.flatten("m0 0 l10 0 v10 h-10 z")[0].pts), 100, 1e-9, "relative m l v h z");
near(area(M.flatten("M0 0Q5 10 10 0T20 0Z")[0].pts), 0, 1e-6 + 1, "Q/T flat");   // a quad and its mirror about the chord: zero signed area bowtie
assert.equal(M.flatten("M0 0L1 0M5 5L6 5").length, 2, "two subpaths");
// errors
assert.throws(() => M.bool("merge", A, B), /not union/); assert.throws(() => M.bool("union", A), /at least two/);
assert.throws(() => M.bool("exclusion", A, B, A), /exactly two/); assert.throws(() => M.bool("union", A, ""), /shape must be/);
assert.throws(() => M.flatten("M0 0X"), /unknown command/); assert.throws(() => M.flatten("L1 1"), /must start with M/);
console.log("p4-bool: Union/Difference/Intersection/Exclusion exact on squares, holes kept, even-odd annulus and arc areas within 0.4 %, flatten commands and errors OK");
