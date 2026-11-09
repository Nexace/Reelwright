// 3D math scenes on Three.js: KIT.math3d. Loaded after engine.js and tools/runtimes.js (KIT.three imports vendor/three, r187).
// Semantics follow Manim Community (MIT): ThreeDScene.set_camera_orientation / move_camera / begin_ambient_camera_rotation,
// ThreeDAxes, Surface, ParametricFunction, Line3D, Arrow3D, Dot3D, Sphere/Cube/Prism/Cone/Cylinder/Torus, Polyhedra, and ManimGL's
// DotCloud/GlowDots. Coordinates are Manim's (x right, y deep, z up, right-handed, units = scene units); built geometry is mapped
// to Three's y-up as (x, y, z) → (x, z, -y), so a Manim position is passed everywhere and Three never shows through.
//   scene(el, build, { phi=70, theta=-45, gamma=0, zoom=1, distance=15, background, lights=true, theme:{ink,accent,accent2,muted} })
//       → { set(t), camera, handles, three }   set(t) is called from render(t); build(api) runs once, after Three has loaded
//       camera.orient(t0, t1, { phi, theta, gamma, zoom, ease })  move_camera: smooth from the value the previous move ended on
//       camera.ambient({ rate, from, to })                        begin_ambient_camera_rotation: theta += rate °/s from `from`
//       camera.state(t) → { phi, theta, gamma, zoom } in degrees; handles = every object built with { name } ; three = KIT.three's handle
//   api = { THREE, scene, each(fn(t)), light(o), axes(o), surface(f, o), curve(f, o), line(a, b, o), arrow(a, b, o), dot(p, o),
//           sphere(o), cube(o), prism(o), cone(o), cylinder(o), torus(o), polyhedron(name, o), points(list, o) }
//   axes({ x:[min,max,step], y, z, length:n|[lx,ly,lz], ticks=true, labels, color })   → { c2p(x,y,z) }; labels: true | ['x','y','z']
//   surface(f(u,v)→[x,y,z], { u:[0,1], v:[0,1], resolution:[24,24], checkerboard:[A,B], fillByValue:{ axis:'z', colors, range }, wire, axes })
//       (nu+1)(nv+1) vertices; colors = [color…] spread over range, or [[value, color]…]
//   curve(f(t)→[x,y,z], { t:[0,1], samples=200, width=0.03, axes })     → h.draw(p) shows the first p of its length (drawRange)
//   line(a, b, { width }) · arrow(a, b, { width, tip }) · dot(p, { r })   Line3D / Arrow3D / Dot3D (thin cylinders, cone, sphere)
//   sphere({ r }) cube({ side }) prism({ size:[dx,dy,dz] }) cone({ r, h, dir }) cylinder({ r, h, dir }) torus({ R, r }) — all take
//       { at:[x,y,z], color, opacity, edges }; polyhedron('tetrahedron'|'octahedron'|'icosahedron'|'dodecahedron', { r, at, … })
//   points(list, { size=6, color, colors })                             additive glow sprites (GlowDots)
//   light({ type:'directional'|'point'|'ambient', at, color, intensity })
//   Every handle: { obj, show(t, { in=0, out, dur, grow, draw }) } — opacity fades in over dur (default KIT.dur(0.5)) from `in`, out
//   from `out`; grow also scales it up from its own origin; draw (curves) draws it on instead of fading. All pure in t.
//   KIT.math3d.toThree / fromThree / rng(seed) are the mapping and a seeded generator (no Math.random: render(t) is pure).
// Limits: tick labels use sans-serif canvas text (not the theme font); curve() does not break at non-finite points; no OBJ/GLTF
// models or textures.
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.three) throw new Error('tools/math3d.js: load tools/engine.js and tools/runtimes.js first');
  const M = (K.math3d = {});
  const rad = Math.PI / 180, smooth = (p) => p * p * (3 - 2 * p);
  const m2t = ([x, y, z]) => [x, z, -y], t2m = ([x, y, z]) => [x, -z, y];
  M.toThree = m2t; M.fromThree = t2m;
  M.rng = (s) => () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  // ── camera: keyed windows, evaluated from t alone ───────────────────────
  const KEYS = ['phi', 'theta', 'gamma', 'zoom'];
  const camera = (init) => {
    const wins = [], amb = [];
    const c = {
      orient(t0, t1, to) { wins.push({ t0, t1, to }); wins.sort((a, b) => a.t0 - b.t0); return c; },
      ambient({ rate = 6, from = 0, to = Infinity } = {}) { amb.push({ rate, from, to }); return c; },
      state(t) {
        const s = { ...init };
        for (const w of wins) {
          if (t < w.t0) break;
          const e = w.to.ease ? K.easing(w.to.ease) : smooth, p = e(K.seg(t, w.t0, w.t1));
          for (const k of KEYS) if (w.to[k] != null) s[k] = init_(s[k], w.to[k], p, t >= w.t1);
        }
        for (const a of amb) s.theta += a.rate * (Math.min(Math.max(t, a.from), a.to) - a.from);
        return s;
      },
    };
    // a finished move leaves exactly its target; the next move starts from it
    const init_ = (a, b, p, done) => (done ? b : a + (b - a) * p);
    return c;
  };
  // camera pose in Three space: position, and a right/up/back basis (Manim: looking at the origin, +z up; gamma rolls)
  M.pose = (s, d) => {
    const ph = s.phi * rad, th = s.theta * rad, g = s.gamma * rad;
    const dir = [Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph)], f = dir.map((v) => -v);
    const r0 = [-Math.sin(th), Math.cos(th), 0], u0 = cross(r0, f);
    const r = r0.map((v, i) => v * Math.cos(g) + u0[i] * Math.sin(g)), u = r0.map((v, i) => -v * Math.sin(g) + u0[i] * Math.cos(g));
    return { pos: m2t(dir.map((v) => v * d)), right: m2t(r), up: m2t(u), back: m2t(dir) };
  };

  // ── scene ───────────────────────────────────────────────────────────────
  M.scene = (el, build, { phi = 70, theta = -45, gamma = 0, zoom = 1, distance = 15, background, lights = true, theme = {} } = {}) => {
    const cam = camera({ phi, theta, gamma, zoom }), handles = {};
    const tok = (n, d) => theme[n] || getComputedStyle(document.documentElement).getPropertyValue('--kit-' + (n === 'accent2' ? 'accent-2' : n)).trim() || d;
    const col = { ink: tok('ink', '#1d1b16'), accent: tok('accent', '#3b82f6'), accent2: tok('accent2', '#f59e0b'), muted: tok('muted', '#888888') };
    const h = K.three(el, (THREE, renderer, { w, h: ht }) => {
      const scene = new THREE.Scene(), camera3 = new THREE.PerspectiveCamera(30, w / ht, 0.1, 400), frame = [];
      if (background) scene.background = new THREE.Color(background);
      const V = (p) => new THREE.Vector3(...m2t(p));
      const light = ({ type = 'directional', at = [3, -4, 6], color = '#ffffff', intensity } = {}) => {
        const l = type === 'ambient' ? new THREE.AmbientLight(color, intensity ?? 0.9)
          : type === 'point' ? new THREE.PointLight(color, intensity ?? 60) : new THREE.DirectionalLight(color, intensity ?? 2.2);
        if (type !== 'ambient') l.position.copy(V(at));
        scene.add(l); return l;
      };
      if (lights) { light({ type: 'ambient' }); light(); }

      // handle: show(t, opts) fades (and optionally grows or draws) the object as a pure function of t
      const handle = (name, obj, mats, extra = {}) => {
        mats = [...new Set(mats.flat())]; const base = mats.map((m) => m.opacity), tr0 = mats.map((m) => m.transparent);
        const hd = { obj, mats, ...extra, show(t, { in: t0 = 0, out, dur = K.dur(0.5), grow = false, draw = false } = {}) {
          const a = K.seg(t, t0, t0 + dur), b = out == null ? 0 : K.seg(t, out, out + dur);
          const o = (draw ? (a > 0 ? 1 : 0) : smooth(a)) * (1 - smooth(b));
          mats.forEach((m, i) => {
            const tr = o < 1 || base[i] < 1 || tr0[i];
            if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
            m.opacity = base[i] * o;
          });
          if (draw && hd.draw) hd.draw(smooth(a));
          if (grow) obj.scale.setScalar(Math.max(1e-4, smooth(a)));
          obj.visible = o > 0;
          return hd;
        } };
        scene.add(obj); if (name) handles[name] = hd;
        return hd;
      };
      const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color: color || col.accent, roughness: 0.55, metalness: 0.05,
        side: THREE.DoubleSide, opacity: o.opacity ?? 1, transparent: (o.opacity ?? 1) < 1, ...o.mat });
      const lineMat = (c = col.ink, opacity = 1) => new THREE.LineBasicMaterial({ color: c, opacity, transparent: opacity < 1 });
      const edgesOf = (geo, c = col.ink) => new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), lineMat(c, 0.7));
      const map = (o) => (o.axes ? o.axes.c2p : (p) => p);
      const tex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
      const label = (text, size = 0.4) => {
        const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
        const g = cv.getContext('2d'); g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = col.ink; g.fillText(text, 64, 34);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(cv), transparent: true, depthTest: false }));
        sp.scale.set(size * 2, size, 1); sp.renderOrder = 10; return sp;
      };
      // a mesh from geometry built in Three space (Y up), placed at a Manim point, with optional edges
      const solid = (name, geo, o, edges = false, dir) => {
        const mat = std(o.color, o), g = new THREE.Group(), m = new THREE.Mesh(geo, mat);
        g.add(m); const mats = [mat];
        if (o.edges ?? edges) { const e = edgesOf(geo); g.add(e); mats.push(e.material); }
        if (dir) g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), V(dir).normalize());
        g.position.copy(V(o.at || [0, 0, 0]));
        return handle(name, g, mats, { mesh: m });
      };
      // thin cylinder from a to b (Manim Line3D)
      const between = (a, b, width, color, o, name) => {
        const pa = V(a), pb = V(b), len = pa.distanceTo(pb), mat = std(color, o);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(width, width, len, 8), mat);
        m.position.copy(pa).add(pb).multiplyScalar(0.5);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pb.clone().sub(pa).normalize());
        return { m, mat };
      };

      const api = { THREE, scene, light, each: (fn) => frame.push(fn),
        axes(o = {}) {
          const rg = [o.x || [-3, 3, 1], o.y || [-3, 3, 1], o.z || [-3, 3, 1]], L = [].concat(o.length ?? []);
          const sc = rg.map((r, i) => (L.length ? L[L.length === 1 ? 0 : i] : r[1] - r[0]) / (r[1] - r[0]));
          const c2p = (x, y = 0, z = 0) => [x * sc[0], y * sc[1], z * sc[2]];
          const g = new THREE.Group(), pos = [], tip = std(o.color || col.ink), lm = lineMat(o.color || col.ink), mats = [lm, tip];
          const names = Array.isArray(o.labels) ? o.labels : ['x', 'y', 'z'], perp = [[0, 1, 0], [1, 0, 0], [1, 0, 0]];
          rg.forEach(([a, b, s], d) => {
            const at = (v) => { const p = [0, 0, 0]; p[d] = v * sc[d]; return p; };
            pos.push(...m2t(at(a)), ...m2t(at(b)));
            if (o.ticks !== false) for (let v = Math.ceil(a / s - 1e-9) * s; v <= b + 1e-9; v += s) {
              if (Math.abs(v) < 1e-9) continue;
              const p = at(v), q = perp[d].map((u, i) => p[i] + u * 0.07), r = perp[d].map((u, i) => p[i] - u * 0.07);
              pos.push(...m2t(q), ...m2t(r));
              if (o.labels) { const sp = label(String(+v.toFixed(6)), 0.22); sp.position.set(...m2t(p.map((c, i) => c - perp[d][i] * 0.28))); g.add(sp); mats.push(sp.material); }
            }
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 12), tip);   // arrow tip at the max end
            cone.position.set(...m2t(at(b))); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), V(at(1).map((v, i) => (i === d ? 1 : 0))).normalize());
            g.add(cone);
            if (o.labels) { const sp = label(names[d], 0.36); sp.position.set(...m2t(at(b + 0.55 / sc[d]))); g.add(sp); mats.push(sp.material); }
          });
          const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          g.add(new THREE.LineSegments(geo, lm));
          return handle(o.name, g, mats, { c2p });
        },
        surface(f, o = {}) {
          const [u0, u1] = o.u || [0, 1], [v0, v1] = o.v || [0, 1], [nu, nv] = o.resolution || [24, 24], mp = map(o);
          const P = [], pos = new Float32Array((nu + 1) * (nv + 1) * 3);
          for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
            const p = mp(f(u0 + ((u1 - u0) * i) / nu, v0 + ((v1 - v0) * j) / nv)); P.push(p);
            pos.set(m2t(p), (i * (nv + 1) + j) * 3);
          }
          const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3));
          const quads = [[], []];   // checkerboard = two index groups (two materials), so the vertex count stays (nu+1)(nv+1)
          for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
            const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1;
            quads[o.checkerboard ? (i + j) & 1 : 0].push(a, c, b, b, c, d);
          }
          geo.setIndex([...quads[0], ...quads[1]]);
          let mat;
          if (o.checkerboard) {
            geo.addGroup(0, quads[0].length, 0); geo.addGroup(quads[0].length, quads[1].length, 1);
            mat = o.checkerboard.map((c) => std(o.fillByValue ? '#ffffff' : c, o));
            if (o.fillByValue) mat[1].color.set('#cfcfcf');
          } else mat = [std(o.fillByValue ? '#ffffff' : o.color, o)];
          const fv = o.fillByValue;
          if (fv) {   // set_fill_by_value: colour each vertex from one coordinate
            const ax = { x: 0, y: 1, z: 2 }[fv.axis || 'z'], vals = P.map((p) => p[ax]);
            const [lo, hi] = fv.range || [Math.min(...vals), Math.max(...vals)];
            const stops = fv.colors.map((c, i) => (Array.isArray(c) ? [c[0], new THREE.Color(c[1])] : [lo + ((hi - lo) * i) / (fv.colors.length - 1), new THREE.Color(c)]));
            const rgb = new Float32Array(vals.length * 3), tmp = new THREE.Color();
            vals.forEach((v, n) => {
              let k = 0; while (k < stops.length - 2 && v > stops[k + 1][0]) k++;
              const [a, ca] = stops[k], [b, cb] = stops[k + 1];
              tmp.lerpColors(ca, cb, K.clamp((v - a) / (b - a || 1))); tmp.toArray(rgb, n * 3);
            });
            geo.setAttribute('color', new THREE.BufferAttribute(rgb, 3)); mat.forEach((m) => { m.vertexColors = true; });
          }
          geo.computeVertexNormals();
          mat.forEach((m) => { m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 1; });
          const g = new THREE.Group(), mesh = new THREE.Mesh(geo, mat.length > 1 ? mat : mat[0]), mats = [...mat];
          g.add(mesh);
          if (o.wire) {   // grid lines through the vertices (Manim's surface stroke)
            const idx = [];
            for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
              const a = i * (nv + 1) + j;
              if (j < nv) idx.push(a, a + 1);
              if (i < nu) idx.push(a, a + nv + 1);
            }
            const wg = new THREE.BufferGeometry(); wg.setAttribute('position', geo.attributes.position); wg.setIndex(idx);
            const wl = new THREE.LineSegments(wg, lineMat(o.wire === true ? col.ink : o.wire, 0.45)); g.add(wl); mats.push(wl.material);
          }
          return handle(o.name, g, mats, { mesh });
        },
        curve(f, o = {}) {
          const [t0, t1] = o.t || [0, 1], n = o.samples || 200, rs = 8, mp = map(o);
          class C extends THREE.Curve { getPoint(u, t = new THREE.Vector3()) { return t.set(...m2t(mp(f(t0 + (t1 - t0) * u)))); } }
          const geo = new THREE.TubeGeometry(new C(), n, o.width ?? 0.03, rs, false), mat = std(o.color || col.accent2, o);
          const m = new THREE.Mesh(geo, mat), total = geo.index.count;
          return handle(o.name, m, [mat], { mesh: m, draw(p) { geo.setDrawRange(0, Math.round(K.clamp(p) * n) * rs * 6); }, total });
        },
        line(a, b, o = {}) { const { m, mat } = between(a, b, o.width ?? 0.025, o.color || col.ink, o); return handle(o.name, m, [mat]); },
        arrow(a, b, o = {}) {
          const w = o.width ?? 0.025, tip = o.tip ?? 0.28, pa = V(a), pb = V(b), dir = pb.clone().sub(pa), len = dir.length();
          dir.normalize(); const sh = pa.clone().addScaledVector(dir, len - tip), g = new THREE.Group();
          const s = between(a, t2m(sh.toArray()), w, o.color || col.ink, o), mat = s.mat;
          const cone = new THREE.Mesh(new THREE.ConeGeometry(w * 3.2, tip, 16), mat);
          cone.position.copy(pb).addScaledVector(dir, -tip / 2); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          g.add(s.m, cone); return handle(o.name, g, [mat]);
        },
        dot(p, o = {}) { return solid(o.name, new THREE.SphereGeometry(o.r ?? 0.08, 24, 16), { color: col.accent2, ...o, at: map(o)(p) }); },
        sphere(o = {}) { return solid(o.name, new THREE.SphereGeometry(o.r ?? 1, 48, 32), o); },
        cube(o = {}) { const s = o.side ?? 2; return solid(o.name, new THREE.BoxGeometry(s, s, s), o, true); },
        prism(o = {}) { const [x, y, z] = o.size || [3, 2, 1]; return solid(o.name, new THREE.BoxGeometry(x, z, y), o, true); },
        cone(o = {}) { return solid(o.name, new THREE.ConeGeometry(o.r ?? 1, o.h ?? 2, 48), o, false, o.dir); },
        cylinder(o = {}) { return solid(o.name, new THREE.CylinderGeometry(o.r ?? 1, o.r ?? 1, o.h ?? 2, 48), o, false, o.dir); },
        torus(o = {}) { return solid(o.name, new THREE.TorusGeometry(o.R ?? 3, o.r ?? 1, 24, 64).rotateX(-Math.PI / 2), o); },
        polyhedron(kind, o = {}) {
          const G = { tetrahedron: THREE.TetrahedronGeometry, octahedron: THREE.OctahedronGeometry, icosahedron: THREE.IcosahedronGeometry, dodecahedron: THREE.DodecahedronGeometry }[kind];
          if (!G) throw new Error('KIT.math3d.polyhedron: unknown "' + kind + '" (tetrahedron, octahedron, icosahedron, dodecahedron)');
          return solid(o.name, new G(o.r ?? 1, 0), { mat: { flatShading: true }, ...o }, true);   // flat faces, like Manim's
        },
        points(list, o = {}) {
          const mp = map(o), pos = new Float32Array(list.length * 3), rgb = o.colors && new Float32Array(list.length * 3), c = new THREE.Color();
          list.forEach((p, i) => { pos.set(m2t(mp(p)), i * 3); if (rgb) c.set(o.colors[i % o.colors.length]).toArray(rgb, i * 3); });
          const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3));
          if (rgb) geo.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
          const cv = document.createElement('canvas'); cv.width = cv.height = 64;
          const g = cv.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
          rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,255,255,0.45)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
          const mat = new THREE.PointsMaterial({ color: rgb ? '#ffffff' : o.color || col.accent, size: o.size ?? 6, sizeAttenuation: false, map: tex(cv),
            vertexColors: !!rgb, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
          return handle(o.name, new THREE.Points(geo, mat), [mat]);
        } };

      build(api);
      return { scene, camera: camera3, update(t) {
        const s = cam.state(t), p = M.pose(s, distance);
        camera3.position.set(...p.pos); camera3.zoom = s.zoom; camera3.updateProjectionMatrix();
        camera3.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...p.right), new THREE.Vector3(...p.up), new THREE.Vector3(...p.back)));
        for (const fn of frame) fn(t);
      } };
    });
    return { set: (t) => h.set(t), camera: cam, handles, three: h };
  };
})();
