// tools/math3d.js: Manim-style 3D scenes on Three.js, driven by render(t). Axes, a checkerboard saddle, a helix drawing on,
// primitives, a polyhedron and glow dots; the camera orients, then rotates on its own. check(): coordinate mapping, camera state
// (order independent, and the Three camera really sits where the Manim angles say), surface vertex count, helix drawRange.
import assert from "node:assert/strict";

export default {
  scripts: ["tools/runtimes.js", "tools/math3d.js"],
  dur: 6,
  film: `
const rnd = KIT.math3d.rng(7), cloud = Array.from({ length: 120 }, () => [(rnd() - 0.5) * 5, (rnd() - 0.5) * 5, rnd() * 2 + 0.5]);
window.s3 = KIT.math3d.scene(KIT.el('div', 'scene', S), (a) => {
  const ax = a.axes({ name: 'ax', x: [-3, 3, 1], y: [-3, 3, 1], z: [-2, 2, 1], labels: true });
  const sd = a.surface((u, v) => [u, v, (u * u - v * v) / 4], { name: 'saddle', u: [-2.5, 2.5], v: [-2.5, 2.5], resolution: [16, 12],
    checkerboard: ['#3366cc', '#7aa2e8'], wire: true });
  const hx = a.curve((t) => [1.2 * Math.cos(t), 1.2 * Math.sin(t), t / 2.5], { name: 'helix', t: [-2, 3 * Math.PI], samples: 120, width: 0.04 });
  const pr = [a.sphere({ r: 0.4, at: [-2, -2, 1.6], color: '#e0503a' }), a.cube({ side: 0.7, at: [2, -2, 1.6], color: '#2f9e6b' }),
    a.cone({ r: 0.4, h: 0.9, at: [-2, 2, 1.6], color: '#e0a030' }), a.torus({ R: 0.45, r: 0.15, at: [0, -2.4, 1.6], color: '#9b59b6' }),
    a.polyhedron('icosahedron', { r: 0.5, at: [2, 2, 1.6], color: '#3366cc' }), a.arrow([0, 0, 0], [0, 0, 2.2], { color: '#c0392b' }),
    a.dot([0, 0, 0.6], { r: 0.12 }), a.cylinder({ r: 0.25, h: 0.9, at: [0, 2.4, 1.6], dir: [1, 0, 0], color: '#16a085' })];
  const gl = a.points(cloud, { size: 7, color: '#ffb000' });
  a.each((t) => {
    ax.show(t, { in: 0, grow: true }); sd.show(t, { in: 0.4, dur: 0.8 }); hx.show(t, { in: 1, dur: 2, draw: true });
    pr.forEach((h, i) => h.show(t, { in: 2 + i * 0.25, grow: true })); gl.show(t, { in: 3.5, dur: 1 });
  });
}, { phi: 65, theta: -60, theme: { ink: '#1d1b16', accent: '#3366cc', accent2: '#c0392b' } });
s3.camera.orient(1.5, 3.5, { phi: 80, theta: -20, zoom: 1.15 }); s3.camera.ambient({ rate: 15, from: 3.5 });
KIT.start({ dur: 6, render: (t) => s3.set(t) });`,
  async check(page) {
    const r = await page.evaluate(() => {
      const M = KIT.math3d, s = window.s3, T = s.three.THREE, cam = s.three.camera;
      const pts = [[1, 2, 3], [-4, 0.5, 7], [0, 0, 0]];
      const roundTrip = pts.every((p) => M.fromThree(M.toThree(p)).every((v, i) => Math.abs(v - p[i]) < 1e-12));
      const times = [0, 0.7, 1.5, 2.2, 3.5, 4.4, 5.9];
      const shuf = [3.5, 0, 5.9, 2.2, 1.5, 4.4, 0.7, 5.9, 0];
      const rec = (order) => { const o = {}; for (const t of order) { s.set(t); o[t] = JSON.stringify([s.camera.state(t), cam.position.toArray(), cam.quaternion.toArray(), cam.zoom]); } return o; };
      const A = rec(times), B = rec(shuf);
      const same = times.every((t) => A[t] === B[t]);
      // at t = 0: phi 65, theta -60 from distance 15 in Manim space → Three (x, z, -y); camera up is Three +y (Manim +z)
      s.set(0); const th = -60 * Math.PI / 180, ph = 65 * Math.PI / 180;
      const want = M.toThree([15 * Math.sin(ph) * Math.cos(th), 15 * Math.sin(ph) * Math.sin(th), 15 * Math.cos(ph)]);
      const posOk = want.every((v, i) => Math.abs(v - cam.position.getComponent(i)) < 1e-4);
      const fwd = new T.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), up = new T.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
      const lookOk = fwd.dot(cam.position.clone().normalize()) < -0.9999 && up.y > 0.3;
      const sd = s.handles.saddle.mesh.geometry, hx = s.handles.helix;
      hx.draw(0); const d0 = hx.obj.geometry.drawRange.count; hx.draw(1); const d1 = hx.obj.geometry.drawRange.count;
      return { roundTrip, same, posOk, lookOk, verts: sd.attributes.position.count, d0, d1, total: hx.total,
        moves: JSON.stringify(s.camera.state(2.5)) !== JSON.stringify(s.camera.state(0)), end: s.camera.state(3.5) };
    });
    assert.ok(r.roundTrip, "Manim → Three → Manim coordinates round-trip");
    assert.ok(r.same, "camera state/pose identical when evaluated in shuffled order");
    assert.ok(r.posOk && r.lookOk, "Three camera sits at the Manim (phi, theta) point, looks at the origin, z up");
    assert.equal(r.verts, 17 * 13, "surface vertices = (nu+1)(nv+1)");
    assert.equal(r.d0, 0, "helix drawRange at p = 0"); assert.equal(r.d1, r.total, "helix drawRange at p = 1");
    assert.ok(r.moves && r.end.phi === 80 && r.end.theta === -20 && r.end.zoom === 1.15, "orient window ends exactly on its target");
    const ax = await page.evaluate(() => new Promise((ok) => { setTimeout(() => ok('build never ran'), 10000); KIT.math3d.scene(KIT.el('div', 'scene', KIT.stage), (a) => { try {   // review: { axes } option
      const A = a.axes({ x: [-2, 2, 1], y: [-2, 2, 1], z: [-1, 1, 1] }), d = a.dot([1, 1, 0.5], { axes: A }), s = a.surface((u, v) => [u, v, 0], { axes: A, resolution: [2, 2] });
      const arr = [...d.obj.position.toArray()]; s.obj.traverse((o) => { if (o.geometry) arr.push(...o.geometry.attributes.position.array); }); ok(arr.length > 6 && arr.every(Number.isFinite)); } catch (e) { ok('threw: ' + e.message); } }); })); 
    assert.equal(ax, true, "objects built with { axes } have finite positions");
    console.log("      math3d check: mapping, camera order-independence, 17x13 vertices, helix drawRange 0/" + r.total + " OK");
  },
};
