// Manim 3D extras, native: fixed-in-frame HUD, fixed-orientation (billboard) labels, FullScreenRectangle, lights and shading, TexturedSurface and
// ThreeDModel (.obj, own parser). Load after tools/runtimes.js and tools/math3d.js (Three.js r187 is vendored; its loaders are not, so the OBJ
// reader here is ours: no new library). Semantics follow Manim Community Edition (MIT) three_d_scene.py (add_fixed_in_frame_mobjects,
// add_fixed_orientation_mobjects) and ManimGL (MIT) types/surface.py (TexturedSurface), shaders and light_source, mobject/three_d (ThreeDModel
// via trimesh / pywavefront). No Manim code is copied. Coordinates are Manim's (x right, y deep, z up); every .set(t) is a pure function of t.
//   KIT.math3d.sceneExt(el, build, opts) → same as KIT.math3d.scene (and the same opts), with api extended by:
//     api.model(obj | id, { at, height, scale, up = 'z' | 'y', center = true, color, flat, name })   ThreeDModel from OBJ text (or the id in window.MODEL
//         written by `reelwright code <project> model file.obj`); v, vt, vn, f (v, v/vt, v//vn, v/vt/vn, negative indices, any polygon) → handle
//     api.texturedSurface(f(u, v) → [x, y, z], image, { u: [0, 1], v: [0, 1], resolution: [24, 24], opacity, name })   image = HTMLImageElement /
//         HTMLCanvasElement / ImageBitmap (already loaded), or a data: / file URL (decoded asynchronously: pass a loaded image for exact frame 0)
//     api.canvasTexture(draw(ctx, w, h), w = 256, h = 256) → THREE.CanvasTexture, a procedural image for texturedSurface
//     api.lightSource(at | fn(t) → [x, y, z], { color, intensity = 80, marker = true, ambient = 0.15 }) → { light, marker, at(t) }   GL light_source
//     api.shade(handle, { reflectiveness = 0, gloss = 0.3, shadow = 0, flat }) → handle   GL set_shading, mapped onto MeshStandardMaterial:
//         metalness = reflectiveness, roughness = 1 − gloss, base colour darkened by shadow (a fraction)
//     api.billboard(at | fn(t) → [x, y, z], text | element, { dx, dy, size, color, anchor, box }) → { el, set(t) }   fixed-orientation label: a DOM
//         element that stays upright and the same size and sits on the projected 3D point (it follows the camera, so call .set(t) each frame)
//   KIT.math3d.project(state, distance, aspect, p) → [ndcX, ndcY, depth]   the pinhole the scene's camera uses (fov 30 degrees, zoom from state)
//   KIT.math3d.fixInFrame(el | [el], { z = 10 }) → els   add_fixed_in_frame_mobjects: HUD elements are DOM above the WebGL canvas, so they
//        never move with the camera; this just lifts them above it
//   KIT.math3d.fullScreenRect({ color, opacity = 1, in, dur, out, parent, z = 9 }) → { el, set(t) }   FullScreenRectangle, fixed in frame, fades in / out
//   KIT.math3d.parseObj(text) → { positions, normals, uvs, count, bbox: { min, max } }   per-corner arrays (Float32Array), triangles = count / 3
'use strict';
(function () {
  const K = window.KIT, M3 = K.math3d;
  if (!M3) throw new Error('tools/manim-3d.js: load tools/runtimes.js and tools/math3d.js first');
  const smooth = (p) => p * p * (3 - 2 * p), f2 = (v) => +v.toFixed(2);

  // ── OBJ ──────────────────────────────────────────────────────────────────
  M3.parseObj = (text) => {
    const V = [], T = [], N = [], corners = [];
    const idx = (s, n) => { const i = parseInt(s, 10); return i < 0 ? n + i : i - 1; };
    String(text).split(/\r?\n/).forEach((raw, ln) => {
      const line = raw.replace(/#.*/, '').trim();
      if (!line) return;
      const w = line.split(/\s+/), k = w[0], num = (a) => a.map(Number);
      if (k === 'v') V.push(num(w.slice(1, 4)));
      else if (k === 'vt') T.push(num(w.slice(1, 3)));
      else if (k === 'vn') N.push(num(w.slice(1, 4)));
      else if (k === 'f') {
        if (w.length < 4) throw new Error(`KIT.math3d.parseObj: line ${ln + 1}: a face needs at least 3 vertices`);
        const c = w.slice(1).map((tok) => {
          const [a, b, n] = tok.split('/'), vi = idx(a, V.length);
          if (!(vi >= 0 && vi < V.length)) throw new Error(`KIT.math3d.parseObj: line ${ln + 1}: vertex ${a} does not exist (${V.length} so far)`);
          return { v: vi, t: b ? idx(b, T.length) : -1, n: n ? idx(n, N.length) : -1 };
        });
        for (let i = 1; i + 1 < c.length; i++) corners.push(c[0], c[i], c[i + 1]);   // fan
      }
    });
    if (!corners.length) throw new Error('KIT.math3d.parseObj: no faces (f lines) in the OBJ text');
    const count = corners.length, positions = new Float32Array(count * 3), normals = new Float32Array(count * 3);
    const hasUV = corners.every((c) => c.t >= 0), uvs = hasUV ? new Float32Array(count * 2) : null;
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], acc = V.map(() => [0, 0, 0]);
    corners.forEach((c, i) => {
      const p = V[c.v]; positions.set(p, i * 3);
      for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], p[a]); max[a] = Math.max(max[a], p[a]); }
      if (hasUV) uvs.set(T[c.t], i * 2);
    });
    for (let i = 0; i < count; i += 3) {   // face normals; vertices sharing a position share the average (smooth) unless the file gave vn
      const p = [0, 1, 2].map((j) => V[corners[i + j].v]), a = p[1].map((v, k) => v - p[0][k]), b = p[2].map((v, k) => v - p[0][k]);
      const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) acc[corners[i + j].v][k] += n[k];
    }
    corners.forEach((c, i) => {
      const n = c.n >= 0 ? N[c.n] : acc[c.v], l = Math.hypot(...n) || 1;
      normals.set([n[0] / l, n[1] / l, n[2] / l], i * 3);
    });
    return { positions, normals, uvs, count, bbox: { min, max } };
  };

  // ── projection ───────────────────────────────────────────────────────────
  M3.project = (state, distance, aspect, p) => {
    const s = M3.pose(state, distance), q = M3.toThree(p).map((v, i) => v - s.pos[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const x = dot(q, s.right), y = dot(q, s.up), z = dot(q, s.back), th = Math.tan((30 * Math.PI) / 360) / state.zoom;
    return [x / -z / (th * aspect), y / -z / th, -z];
  };

  M3.fixInFrame = (els, { z = 10 } = {}) => {
    const list = [].concat(els);
    for (const e of list) { if (getComputedStyle(e).position === 'static') e.style.position = 'absolute'; e.style.zIndex = String(z); e.setAttribute('data-fixed-in-frame', ''); }
    return list;
  };
  M3.fullScreenRect = (o = {}) => {
    const el = K.el('div', 'kit-fullscreen-rect', o.parent || K.stage), t0 = o.in ?? 0, dur = o.dur ?? K.dur(0.6);
    K.css(el, { position: 'absolute', left: '0', top: '0', width: K.W_ + 'px', height: K.H_ + 'px', background: o.color || 'var(--kit-bg)', pointerEvents: 'none', zIndex: String(o.z ?? 9), visibility: 'hidden' });
    return { el, set(t) {
      const a = K.ease(K.seg(t, t0, t0 + dur)), b = o.out == null ? 0 : K.ease(K.seg(t, o.out, o.out + dur));
      K.show(el, (o.opacity ?? 1) * a * (1 - b));
    } };
  };

  // ── scene with extras ────────────────────────────────────────────────────
  M3.sceneExt = (el, build, opts = {}) => {
    let handle = null;
    const distance = opts.distance ?? 15, billboards = [];
    const h = M3.scene(el, (api) => {
      const { THREE, scene } = api, m2t = M3.toThree, V = (p) => new THREE.Vector3(...m2t(p));
      const mkHandle = (obj, mats, extra = {}) => {
        mats = [...new Set(mats)]; const base = mats.map((m) => m.opacity);
        const hd = { obj, mats, ...extra, show(t, { in: t0 = 0, out, dur = K.dur(0.5), grow = false } = {}) {
          const a = K.seg(t, t0, t0 + dur), b = out == null ? 0 : K.seg(t, out, out + dur), o = smooth(a) * (1 - smooth(b));
          mats.forEach((m, i) => { const tr = o < 1 || base[i] < 1; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = base[i] * o; });
          if (grow) obj.scale.setScalar(Math.max(1e-4, smooth(a)) * (hd.scale || 1));
          obj.visible = o > 0; return hd;
        } };
        scene.add(obj); if (extra.name) h.handles[extra.name] = hd;
        return hd;
      };
      const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color: color || '#3b82f6', roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide, opacity: o.opacity ?? 1, transparent: (o.opacity ?? 1) < 1, flatShading: !!o.flat, map: o.map || null });

      api.model = (src, o = {}) => {
        const text = typeof src === 'string' && !/^\s*(v |f |#|o |g )/m.test(src) ? (window.MODEL || {})[src] : src;
        if (!text) throw new Error(`api.model: "${src}" is neither OBJ text nor an id in window.MODEL (run \`reelwright code <project> model file.obj\`)`);
        const P = M3.parseObj(text), yUp = o.up === 'y', fix = (x, y, z) => (yUp ? [x, -z, y] : [x, y, z]);
        const lo = fix(...P.bbox.min), hi = fix(...P.bbox.max), a = lo.map((v, i) => Math.min(v, hi[i])), b = lo.map((v, i) => Math.max(v, hi[i]));
        const size = [0, 1, 2].map((i) => b[i] - a[i]), ctr = o.center === false ? [0, 0, 0] : [0, 1, 2].map((i) => (a[i] + b[i]) / 2);
        const k = o.scale ?? (o.height ? o.height / (size[2] || Math.max(...size)) : 1), pos = new Float32Array(P.count * 3), nor = new Float32Array(P.count * 3);
        for (let i = 0; i < P.count; i++) {
          const p = fix(P.positions[i * 3], P.positions[i * 3 + 1], P.positions[i * 3 + 2]).map((v, j) => (v - ctr[j]) * k), n = fix(P.normals[i * 3], P.normals[i * 3 + 1], P.normals[i * 3 + 2]);
          pos.set(m2t(p), i * 3); nor.set(m2t(n), i * 3);
        }
        const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)).setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        if (P.uvs) geo.setAttribute('uv', new THREE.BufferAttribute(P.uvs, 2));
        geo.computeBoundingBox();
        const mat = std(o.color, o), mesh = new THREE.Mesh(geo, mat), g = new THREE.Group();
        g.add(mesh); g.position.copy(V(o.at || [0, 0, 0]));
        return mkHandle(g, [mat], { mesh, name: o.name, triangles: P.count / 3 });
      };

      api.canvasTexture = (draw, w = 256, hh = 256) => {
        const cv = document.createElement('canvas'); cv.width = w; cv.height = hh; draw(cv.getContext('2d'), w, hh);
        const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
      };
      api.texturedSurface = (f, image, o = {}) => {
        const [u0, u1] = o.u || [0, 1], [v0, v1] = o.v || [0, 1], [nu, nv] = o.resolution || [24, 24];
        const pos = new Float32Array((nu + 1) * (nv + 1) * 3), uv = new Float32Array((nu + 1) * (nv + 1) * 2), idx = [];
        for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
          const n = i * (nv + 1) + j; pos.set(m2t(f(u0 + ((u1 - u0) * i) / nu, v0 + ((v1 - v0) * j) / nv)), n * 3); uv.set([i / nu, j / nv], n * 2);
        }
        for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
        const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)).setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setIndex(idx); geo.computeVertexNormals();
        let tex = image;
        if (!(image && image.isTexture)) {
          tex = typeof image === 'string' ? new THREE.Texture() : new THREE.Texture(image);
          tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = !!tex.image;
          if (typeof image === 'string') { const im = new Image(); im.src = image; im.decode().then(() => { tex.image = im; tex.needsUpdate = true; }, () => console.error('api.texturedSurface: image failed to load: ' + image.slice(0, 80))); }
        }
        const mat = std('#ffffff', { ...o, map: tex }), mesh = new THREE.Mesh(geo, mat);
        return mkHandle(mesh, [mat], { mesh, texture: tex, name: o.name });
      };

      api.lightSource = (at, o = {}) => {
        const posAt = typeof at === 'function' ? at : () => at, color = o.color || '#ffffff';
        const light = new THREE.PointLight(color, o.intensity ?? 80, 0, 2); scene.add(light);
        if ((o.ambient ?? 0.15) > 0) scene.add(new THREE.AmbientLight(color, o.ambient ?? 0.15));
        let marker = null;
        if (o.marker ?? true) { marker = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color })); scene.add(marker); }
        const place = (t) => { const p = V(posAt(t)); light.position.copy(p); if (marker) marker.position.copy(p); };
        place(0); api.each(place);
        return { light, marker, at: posAt };
      };
      api.shade = (hd, { reflectiveness = 0, gloss = 0.3, shadow = 0, flat } = {}) => {
        for (const m of hd.mats) {
          m.metalness = K.clamp(reflectiveness); m.roughness = K.clamp(1 - gloss, 0.05, 1);
          if (shadow) m.color.multiplyScalar(1 - 0.5 * K.clamp(shadow));
          if (flat != null) { m.flatShading = !!flat; m.needsUpdate = true; }
        }
        return hd;
      };

      api.billboard = (at, content, bo = {}) => {
        const e = content instanceof Element ? content : K.el('div', 'kit-billboard', K.stage);
        if (!(content instanceof Element)) { e.textContent = String(content); e.style.fontSize = (bo.size ?? 34) * K.u + 'px'; e.style.fontFamily = 'var(--kit-font-text)'; e.style.color = bo.color || 'var(--kit-ink)'; e.style.whiteSpace = 'nowrap'; }
        K.css(e, { position: 'absolute', left: '0', top: '0', zIndex: '10', pointerEvents: 'none' });
        const posAt = typeof at === 'function' ? at : () => at, anchor = bo.anchor || [0.5, 0.5];
        let box = null;
        const b = { el: e, at: posAt, set(t) {
          if (!handle) return;
          box ||= bo.box || (() => { const r = el.getBoundingClientRect(), s = K.stage.getBoundingClientRect(), k = s.width / K.W_; return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k }; })();
          const [nx, ny, z] = M3.project(handle.camera.state(t), distance, box.w / box.h, posAt(t));
          const px = box.x + ((nx + 1) / 2) * box.w + (bo.dx ?? 0) * K.u, py = box.y + ((1 - ny) / 2) * box.h + (bo.dy ?? 0) * K.u;
          K.css(e, { transform: `translate(${f2(px - e.offsetWidth * anchor[0])}px, ${f2(py - e.offsetHeight * anchor[1])}px)`, visibility: z > 0 ? 'visible' : 'hidden' });
        } };
        billboards.push(b); return b;
      };
      return build(api);
    }, opts);
    handle = h;
    const set = h.set;
    h.set = (t) => { set(t); billboards.forEach((b) => b.set(t)); };
    return h;
  };
})();
