// Phase 11 P4, row manim:m9.9: KIT.math3d.parseObj (tools/manim-3d.js), the OBJ reader for ThreeDModel, no browser needed.
// v / vt / vn, the four face forms, negative indices, quads and n-gons fanned into triangles, normals (given, or computed and smooth),
// bounding box, comments, and error messages that name the line.
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const window = { KIT: { math3d: {}, clamp: (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)) } };
vm.runInContext(fs.readFileSync(path.join(ROOT, "tools/manim-3d.js"), "utf8"), vm.createContext({ window, console, Math, document: {}, getComputedStyle: () => ({}) }));
const P = window.KIT.math3d.parseObj, near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

// a unit cube as 6 quads with uv: 12 triangles, 36 corners, bbox 0..1
const cube = ["v 0 0 0", "v 1 0 0", "v 1 1 0", "v 0 1 0", "v 0 0 1", "v 1 0 1", "v 1 1 1", "v 0 1 1", "vt 0 0", "vt 1 0", "vt 1 1", "vt 0 1",
  "f 1/1 4/4 3/3 2/2", "f 5/1 6/2 7/3 8/4", "f 1/1 2/2 6/3 5/4", "f 2/1 3/2 7/3 6/4", "f 3/1 4/2 8/3 7/4", "f 4/1 1/2 5/3 8/4"].join("\n");
const c = P(cube);
assert.equal(c.count, 36); assert.equal(c.positions.length, 108); assert.equal(c.uvs.length, 72);
assert.equal(JSON.stringify(c.bbox), JSON.stringify({ min: [0, 0, 0], max: [1, 1, 1] }));   // (other realm: compare as JSON)
// computed normals are unit and smooth: every corner at (0,0,0) carries the same normal
const at0 = []; for (let i = 0; i < c.count; i++) if (c.positions[i * 3] === 0 && c.positions[i * 3 + 1] === 0 && c.positions[i * 3 + 2] === 0) at0.push([...c.normals.slice(i * 3, i * 3 + 3)]);
assert.ok(at0.length >= 3 && at0.every((n) => near(Math.hypot(...n), 1, 1e-5) && n.every((v, k) => near(v, at0[0][k]))), "smooth unit normals");
// forms v//vn, v/vt/vn, negative indices, an n-gon (5 vertices -> 3 triangles), comments and blank lines
const o = P("# c\nv 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nv 0.5 1.5 0\n\nvn 0 0 1\nvt 0 0\nvt 1 0\nvt 1 1\nvt 0 1\nvt .5 2\nf 1//1 2//1 3//1 4//1 5//1 # pentagon\nf -5/-5/1 -4/-4/1 -3/-3/1\n");
assert.equal(o.count, 3 * 3 + 3); assert.deepEqual([...o.normals.slice(0, 3)], [0, 0, 1]); assert.equal(o.uvs, null, "uvs only when every corner has one");
const q = P("v 0 0 0\nv 1 0 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 0 1\nf -3/-3 -2/-2 -1/-1"); assert.deepEqual([...q.uvs], [0, 0, 1, 0, 0, 1]);
// winding gives the normal: counter-clockwise seen from +z points +z
assert.deepEqual([...P("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3").normals.slice(0, 3)], [0, 0, 1]);
// errors name the line
assert.throws(() => P("v 0 0 0\nf 1 2"), /line 2: a face needs at least 3/); assert.throws(() => P("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 9"), /line 4: vertex 9 does not exist/);
assert.throws(() => P("v 0 0 0\n"), /no faces/);
console.log("p4-obj: cube (12 triangles, bbox, uv, smooth unit normals), v//vn, negative indices, pentagon fan, winding, errors OK");
