// tools/manim-3d.js (Phase 11 P4): fixed-in-frame HUD, fixed-orientation (billboard) label, FullScreenRectangle, a moving light source and
// shading, a textured surface (procedural canvas), an OBJ model. check(): the projection equals Three's own, the billboard sits on the
// projected point, the HUD does not move with the camera, the light changes which side of a sphere is bright (read back from the WebGL
// canvas), the OBJ model is centred and sized, texture and shading settings landed. The harness proves render(t) is pure in both renderers.
import assert from "node:assert/strict";

const OBJ = "# tetrahedron\nv 0 0 0\nv 2 0 0\nv 0 2 0\nv 0 0 2\nf 1 3 2\nf 1 2 4\nf 2 3 4\nf 3 1 4\n";

const film = () => {
  const M3 = KIT.math3d;
  const light = (t) => [-6 + 12 * KIT.seg(t, 0, 5), -3, 3];
  window.s3 = M3.sceneExt(KIT.el("div", "scene", S), (a) => {
    const ls = a.lightSource(light, { intensity: 90, ambient: 0.12 });
    const sp = a.shade(a.sphere({ r: 1.1, at: [-2.6, 0, 0.2], color: "#cccccc" }), { gloss: 0.5, reflectiveness: 0.1 });
    const md = a.model("tetra", { at: [2.6, 0, 0.3], height: 2, color: "#e0a030", name: "tetra" });
    const tex = a.canvasTexture((g, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? "#cc3333" : "#33aa55"; g.fillRect(i * w / 8, j * h / 8, w / 8, h / 8); } });
    const ts = a.texturedSurface((u, v) => [u, v, -1.4 + 0.15 * Math.sin(2 * u) * Math.cos(2 * v)], tex, { u: [-1.5, 1.5], v: [-1.5, 1.5], resolution: [12, 12], name: "ts" });
    const pt = a.dot([1.2, 0, 1.6], { r: 0.1, color: "#222222" });
    const bb = a.billboard([1.2, 0, 1.6], "pt", { dy: -24, size: 40 });
    window.X3 = { ls, sp, md, ts, tex, bb, pt, light };
    a.each(() => {});
  }, { phi: 72, theta: -90, lights: false, theme: { ink: "#1d1b16", accent: "#3366cc", accent2: "#c0392b" } });
  s3.camera.orient(1.5, 3.5, { theta: -65, zoom: 1.1 });
  const hud = KIT.el("div", "hud", S); Object.assign(hud.style, { left: "20px", top: "14px", font: "700 22px Arial", color: "#222" }); hud.textContent = "HUD";
  M3.fixInFrame(hud);
  const fs = M3.fullScreenRect({ color: "#000000", opacity: 0.5, in: 4.5, dur: 0.3 });
  window.HUD = hud; window.FS = fs;
  KIT.start({ dur: 5, render(t) { s3.set(t); fs.set(t); } });
};

export default {
  scripts: ["tools/runtimes.js", "tools/math3d.js", "tools/manim-3d.js"],
  dur: 5,
  film: `window.MODEL = { tetra: ${JSON.stringify(OBJ)} };\n(${film.toString()})();`,
  async check(page) {
    const r = await page.evaluate(async () => {
      const M3 = KIT.math3d, s = window.s3, X = window.X3, out = {}, near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
      await window.render(2.5);
      const T = s.three.THREE, cam = s.three.camera, w = s.three.renderer.domElement.width, h = s.three.renderer.domElement.height;
      // projection: ours = Three's
      out.project = [[0, 0, 1.6], [-2.6, 0, 0.2], [2.6, 1, 0.3], [1, -2, -1]].every((p) => {
        const a = M3.project(s.camera.state(2.5), 15, w / h, p), b = new T.Vector3(...M3.toThree(p)).project(cam);
        return near(a[0], b.x, 1e-5) && near(a[1], b.y, 1e-5);
      });
      // billboard: its centre is on the projected point (+ the dy offset), upright, same size at two camera poses
      const st = document.getElementById("stage").getBoundingClientRect(), centre = (e) => { const r = e.getBoundingClientRect(); return [r.left - st.left + r.width / 2, r.top - st.top + r.height / 2, r.width]; };
      const want = (t) => { const n = M3.project(s.camera.state(t), 15, w / h, [1.2, 0, 1.6]); return [((n[0] + 1) / 2) * w, ((1 - n[1]) / 2) * h - 24 * KIT.u]; };
      const c1 = centre(X.bb.el), w1 = want(2.5);
      out.billboard = near(c1[0], w1[0], 0.6) && near(c1[1], w1[1], 0.6) && X.bb.el.style.transform.indexOf("rotate") < 0;
      await window.render(0.2); const c0 = centre(X.bb.el), w0 = want(0.2);
      out.billboardMoves = (near(c0[0], w0[0], 0.6) && Math.abs(c0[0] - c1[0]) > 1.5 && near(c0[2], c1[2], 0.01)) || JSON.stringify([c0, w0, c1, w1]);
      // HUD: DOM above the canvas, at the same px whatever the camera does
      await window.render(0.2); const h0 = window.HUD.getBoundingClientRect(); await window.render(3.4); const h1 = window.HUD.getBoundingClientRect();
      out.hud = h0.left === h1.left && h0.top === h1.top && +getComputedStyle(window.HUD).zIndex >= 10 && window.HUD.hasAttribute("data-fixed-in-frame");
      // FullScreenRect: nothing before, half dark after
      await window.render(1); const f0 = +window.FS.el.style.opacity; await window.render(4.9); out.fullScreen = f0 === 0 && near(+window.FS.el.style.opacity, 0.5, 1e-9) && window.FS.el.offsetWidth === KIT.W_;
      // light: with the source far left the sphere's left half is brighter, far right the right half (read back from the canvas)
      const lum = async (t) => {
        await window.render(t);
        const cv = s.three.renderer.domElement, c2 = document.createElement("canvas"); c2.width = w; c2.height = h; const g = c2.getContext("2d"); g.drawImage(cv, 0, 0);
        const n = M3.project(s.camera.state(t), 15, w / h, [-2.6, 0, 0.2]), cx = ((n[0] + 1) / 2) * w, cy = ((1 - n[1]) / 2) * h, R = 0.45 * (1.1 / 15) * h * 3.3;   // inner part of the disc
        const d = g.getImageData(0, 0, w, h).data; let L = 0, Rr = 0;
        for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue; const i = (y * w + x) * 4, v = d[i] + d[i + 1] + d[i + 2];
          if (x < cx) L += v; else Rr += v;
        }
        return [L, Rr];
      };
      const [l0, r0] = await lum(0.05), [l1, r1] = await lum(4.95);
      out.lightLeft = l0 > r0 * 1.15 || `left lit: ${l0} vs ${r0}`; out.lightRight = r1 > l1 * 1.15 || `right lit: ${r1} vs ${l1}`;
      const lp = M3.toThree(X.light(4.95)); out.lightPos = X.ls.light.position.toArray().every((v, k) => near(v, lp[k], 1e-6));
      // shading: gloss 0.5 → roughness 0.5, reflectiveness 0.1 → metalness 0.1
      out.shade = near(X.sp.mats[0].roughness, 0.5) && near(X.sp.mats[0].metalness, 0.1);
      // OBJ model: 4 triangles, centred on its own origin, 2 units tall (height option), then placed at `at`
      const gm = X.md.mesh.geometry; gm.computeBoundingBox(); const bb = gm.boundingBox, sz = bb.getSize(new T.Vector3()), ct = bb.getCenter(new T.Vector3());
      out.model = X.md.triangles === 4 && gm.attributes.position.count === 12 && near(sz.y, 2, 1e-6) && near(ct.x, 0, 1e-6) && near(ct.y, 0, 1e-6) && near(ct.z, 0, 1e-6)
        && near(X.md.obj.position.x, 2.6, 1e-6) && near(X.md.obj.position.y, 0.3, 1e-6);
      out.modelNormals = [...gm.attributes.normal.array].every((v) => Number.isFinite(v)) && near(Math.hypot(...gm.attributes.normal.array.slice(0, 3)), 1, 1e-5);
      // textured surface: grid vertices, uv in 0..1, the map is our canvas texture
      const ts = X.ts, uv = ts.mesh.geometry.attributes.uv.array;
      out.texture = ts.mats[0].map === X.tex && X.tex.image instanceof HTMLCanvasElement && ts.mesh.geometry.attributes.position.count === 13 * 13 && Math.min(...uv) === 0 && Math.max(...uv) === 1;
      return out;
    });
    for (const k in r) assert.ok(r[k] === true, `p4-3d check failed: ${k} = ${r[k]}`);
    console.log("      p4-3d check: projection = Three's, billboard on the projected point, HUD fixed, light flips the lit side, OBJ centred/sized, texture + shading set OK");
  },
};
