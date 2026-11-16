// Shotcards, openings: KIT.shotcards.<name>. Load after engine.js, shots.js and shots2.js (path.js / doodle2.js only for the recipes that
// pair with them). HyperFrames: kit/shotcards/opening.js; pvk: ../../../tools/shotcards/opening.js.
// All pure functions of t: DOM is built once at creation, set(t) only writes styles from t, a seed and the options; no clocks, no
// Math.random, no state between calls. Each returns { set(t), at(t) } (at = the numbers set writes). Elements you hand in are
// positioned absolutely by the helper (it owns their transform/opacity/filter/clip-path). Timings are our choices.
//   datavizLandscapeOpen({ cols, rows, seed, t0, t1, colors, pitch, yaw, zoom })       bars rise on a 3D surface while the camera orients
//   fracture({ source, to, at, dur, seed, cols, rows, spread })                        the source layer shatters into seeded triangles
//   inkBloom({ x, y, r, color, t0, t1, seed, blobs })                                  gooey ink bleed behind a pen-drawn mark
//   craneRise({ layer, rows, t0, t1, lift, zoom, tilt, width, scale })                 S.craneRise + rows pulse as the camera crosses them
//   iconField({ items, cols, x, y, w, h, t0, t1, order })                              a grid of icons going grayscale -> colour, staggered
//   letterspace(el, { t0, t1, from, to })                                              tracking-in: letter-spacing + rise + blur
//   orbitRingTitle({ nucleus, satellites, cx, cy, rx, ry, t0, t1 })                    satellites orbit a nucleus title on a drawn ring
//   heroPush({ t0, t1, x, y }) / spotlightHero({ layer, hero, t0, t1 })                 z 0.78 -> 2.6 tour (ry 34 -> 0) and a spotlight that follows
//   textMask({ text, media, x, y, w, h, t0, t1 })                                      media seen only through the letters
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.shot || !K.shot.tour) throw new Error('shotcards/opening.js: load engine.js, shots.js and shots2.js first');
  const C = (K.shotcards = K.shotcards || {}), S = K.shot, n4 = (v) => +v.toFixed(4), n1 = (v) => +v.toFixed(1);
  const E = (n) => K.easing(n), W = K.W_, H = K.H_;
  const hash = (s) => { let h = 0x811c9dc5; for (const c of unescape(encodeURIComponent(String(s)))) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0; return h; };
  const rng = (seed) => { let a = hash(seed) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const need = (ok, msg) => { if (!ok) throw new Error(msg); };
  const abs = (e) => K.css(e, { position: 'absolute', left: '0px', top: '0px' });
  const hex = (c) => { const m = /^#([0-9a-f]{6})$/i.exec(c); need(m, 'colors must be #rrggbb hex, got ' + c); const v = parseInt(m[1], 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
  const mixc = (a, b, p, k = 1) => 'rgb(' + [0, 1, 2].map((i) => Math.round(K.lerp(a[i], b[i], p) * k)).join(',') + ')';

  // dataviz-landscape-open: an SVG bar landscape projected by hand (pitch from the horizon, yaw about the vertical, orthographic).
  // pitch 90 = looking straight down. The camera orients pitch[0] -> pitch[1], yaw[0] -> yaw[1], zoom[0] -> zoom[1] (power2.inOut over
  // t0..t1) while bars rise in a diagonal stagger (K.stagger over half the window). Colours are #rrggbb: bar height blends colors[0] -> [1].
  C.datavizLandscapeOpen = ({ parent = K.stage, cols = 9, rows = 7, seed = 1, t0, t1, colors = ['#2b6cff', '#ff5a3c'], pitch = [90, 34], yaw = [-8, -38], zoom = [1.6, 1], height = 0.55, cx = W / 2, cy = H * 0.55, size = 0.28 } = {}) => {
    need(t1 > t0, 'datavizLandscapeOpen: t1 must be > t0');
    const r = rng('land:' + seed), ph = [r() * 6.28, r() * 6.28], [ca, cb] = colors.map(hex), D = t1 - t0, bars = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const X = -1 + (i + 0.5) * 2 / cols, Y = -1 + (j + 0.5) * 2 / rows, jit = r();
      const h = Math.min(1, Math.max(0.12, (0.5 + 0.25 * Math.sin(X * 2.3 + ph[0]) + 0.25 * Math.cos(Y * 2.9 + ph[1])) * (0.7 + 0.3 * jit)));
      bars.push({ X, Y, h, d: (i + j) / (cols + rows - 2) });
    }
    const root = K.el('div', 'kit-landscape', parent);
    K.css(root, { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', pointerEvents: 'none' });
    const camE = E('power2.inOut'), up = E('power3.out'), wx = 1 / cols * 0.36, wy = 1 / rows * 0.36;
    const at = (t) => {
      const q = camE(K.seg(t, t0, t1)), th = K.lerp(pitch[0], pitch[1], q) * Math.PI / 180, ps = K.lerp(yaw[0], yaw[1], q) * Math.PI / 180;
      return { pitch: n4(K.lerp(pitch[0], pitch[1], q)), yaw: n4(K.lerp(yaw[0], yaw[1], q)), zoom: n4(K.lerp(zoom[0], zoom[1], q)), th, ps,
        heights: bars.map((b) => n4(b.h * up(K.seg(t, t0 + b.d * 0.5 * D, t0 + b.d * 0.5 * D + 0.5 * D)))) };
    };
    const set = (t) => {
      const a = at(t), sc = size * W * a.zoom, cs = Math.cos(a.ps), sn = Math.sin(a.ps), sp = Math.sin(a.th), cp = Math.cos(a.th);
      const P = (X, Y, Z) => { const x1 = X * cs - Y * sn, y1 = X * sn + Y * cs; return [cx + sc * x1, cy + sc * (y1 * sp - Z * height * cp), y1]; };
      const poly = (pts, fill) => '<polygon points="' + pts.map((p) => n1(p[0]) + ',' + n1(p[1])).join(' ') + '" fill="' + fill + '"/>';
      let out = poly([P(-1, -1, 0), P(1, -1, 0), P(1, 1, 0), P(-1, 1, 0)], 'rgba(127,127,127,.12)');
      const order = bars.map((b, i) => ({ b, z: a.heights[i] })).sort((m, n) => P(m.b.X, m.b.Y, 0)[2] - P(n.b.X, n.b.Y, 0)[2]);
      for (const { b, z } of order) {
        if (z < 0.002) continue;
        const col = mixc(ca, cb, b.h), cn = [[-wx, -wy], [wx, -wy], [wx, wy], [-wx, wy]];
        const side = [0, 1, 2, 3].map((k) => { const p = cn[k], q = cn[(k + 1) % 4];
          return { pts: [P(b.X + p[0], b.Y + p[1], 0), P(b.X + q[0], b.Y + q[1], 0), P(b.X + q[0], b.Y + q[1], z * b.h), P(b.X + p[0], b.Y + p[1], z * b.h)], k }; });
        side.forEach((s) => { s.z = (s.pts[0][2] + s.pts[1][2]) / 2; });
        side.sort((m, n) => m.z - n.z);
        for (const s of side) out += poly(s.pts, mixc(ca, cb, b.h, [0.62, 0.8, 0.5, 0.7][s.k]));
        out += poly(cn.map((p) => P(b.X + p[0], b.Y + p[1], z * b.h)), col);
      }
      root.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + out + '</svg>';
    };
    return { set, at: (t) => { const a = at(t); delete a.th; delete a.ps; return a; }, el: root };
  };

  // fracture: `source` (a frame-sized, static layer: clones are taken now, at creation) shatters into cols x rows x 2 seeded triangles that
  // drift apart from the impact point (x, y) and fade over [at, at + dur] (power2.in); `to` (optional, the layer behind) shows through.
  // The helper owns source/to/shard visibility and z-index (to 1, source 2, shards 3). After the window only `to` is left.
  C.fracture = ({ source, to = null, at, dur = K.dur(0.9), seed = 1, cols = 6, rows = 4, spread = 0.6, x = W / 2, y = H / 2 } = {}) => {
    need(source && Number.isFinite(at), 'fracture: need { source, at }');
    const r = rng('fracture:' + seed), pts = [], ez = E('power2.in'), eo = E('power3.out');
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const edge = i === 0 || j === 0 || i === cols || j === rows;
      pts.push([i * W / cols + (edge ? 0 : (r() - 0.5) * 0.7 * W / cols), j * H / rows + (edge ? 0 : (r() - 0.5) * 0.7 * H / rows)]);
    }
    const tris = [], at2 = (i, j) => pts[j * (cols + 1) + i];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = at2(i, j), b = at2(i + 1, j), c = at2(i + 1, j + 1), d = at2(i, j + 1);
      for (const t of r() < 0.5 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]]) tris.push(t);
    }
    const maxd = Math.hypot(W, H), shards = tris.map((t) => {
      const gx = (t[0][0] + t[1][0] + t[2][0]) / 3, gy = (t[0][1] + t[1][1] + t[2][1]) / 3, d = Math.hypot(gx - x, gy - y) || 1;
      const el = source.cloneNode(true);
      el.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
      source.parentNode.insertBefore(el, source.nextSibling);
      el.style.clipPath = 'polygon(' + t.map((p) => n1(p[0]) + 'px ' + n1(p[1]) + 'px').join(',') + ')';
      el.style.transformOrigin = n1(gx) + 'px ' + n1(gy) + 'px'; el.style.zIndex = 3; el.style.pointerEvents = 'none';
      return { el, ux: (gx - x) / d, uy: (gy - y) / d, dist: (0.12 + 0.5 * r()) * W * spread, rot: (r() - 0.5) * 50, delay: 0.3 * d / maxd };
    });
    source.style.zIndex = 2; if (to) to.style.zIndex = 1;
    const state = (t) => {
      const s = K.seg(t, at, at + dur), p = ez(s);
      return { s, shards: shards.map((h) => { const q = eo(K.seg(p, h.delay, h.delay + 0.7)); return { dx: n1(h.ux * h.dist * q), dy: n1(h.uy * h.dist * q), rot: n1(h.rot * q), op: n4(1 - K.seg(q, 0.55, 1)) }; }) };
    };
    const set = (t) => {
      const { s, shards: sh } = state(t), live = s > 0 && s < 1;
      K.show(source, s <= 0 ? 1 : 0); if (to) K.show(to, s > 0 ? 1 : 0);
      shards.forEach((h, i) => { K.show(h.el, live ? sh[i].op : 0); h.el.style.transform = 'translate(' + sh[i].dx + 'px,' + sh[i].dy + 'px) rotate(' + sh[i].rot + 'deg)'; });
    };
    return { set, at: state, shards: shards.map((h) => h.el) };
  };

  // brand-ink-open: gooey ink bleeding out of (x, y) behind a mark you draw yourself (doodle2 stroke/letters/drawSVG, drawn on top).
  // A core circle of radius r grows, `blobs` smaller ones travel outward and merge through an SVG goo filter (blur + alpha contrast).
  C.inkBloom = ({ parent = K.stage, x = W / 2, y = H / 2, r = 0.2 * H, color = 'var(--kit-accent)', t0, t1, seed = 1, blobs = 12 } = {}) => {
    need(t1 > t0, 'inkBloom: t1 must be > t0');
    const g = (C.inkBloom.n = (C.inkBloom.n || 0) + 1), rn = rng('ink:' + seed), D = t1 - t0, eo = E('power3.out');
    const items = Array.from({ length: blobs }, () => ({ a: rn() * 6.2832, dist: (0.5 + 1.1 * rn()) * r, R: (0.14 + 0.3 * rn()) * r, d: 0.1 + 0.5 * rn() }));
    const root = K.el('div', 'kit-inkbloom', parent);
    K.css(root, { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', pointerEvents: 'none' });
    const b = 0.06 * r;
    root.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '"><defs><filter id="kit-goo-' + g + '" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="' + n1(b) + '"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"/></filter></defs><g style="fill:' + color + '" filter="url(#kit-goo-' + g + ')">' +
      '<circle cx="' + x + '" cy="' + y + '" r="0"/>' + items.map(() => '<circle r="0"/>').join('') + '</g></svg>';
    const cs = root.querySelectorAll('circle');
    const at = (t) => [{ x, y, r: n1(r * 0.62 * eo(K.seg(t, t0, t0 + 0.6 * D))) }].concat(items.map((m) => {
      const p = eo(K.seg(t, t0 + m.d * D, t1));
      return { x: n1(x + Math.cos(m.a) * m.dist * p), y: n1(y + Math.sin(m.a) * m.dist * p), r: n1(m.R * p * (1.2 - 0.4 * p)) };
    }));
    const set = (t) => at(t).forEach((c, i) => { cs[i].setAttribute('cx', c.x); cs[i].setAttribute('cy', c.y); cs[i].setAttribute('r', c.r); });
    return { set, at, el: root };
  };

  // crane-rise-reveal rowPulse: S.craneRise flies `layer`; each row (an element of the layer, measured once at the first call from
  // offsetTop + offsetHeight / 2, or { el, y } with y in layer px) pulses (scale 1 -> 1 + scale, --kit-pulse 0..1) as the camera's
  // focal point crosses it, within `width` x the frame height. Rows' transform belongs to this helper.
  C.craneRise = ({ layer, rows, t0, t1, lift, zoom, tilt, width = 0.22, scale = 0.06 } = {}) => {
    need(layer && rows && rows.length, 'craneRise: need { layer, rows }');
    const cam = S.craneRise({ t0, t1, lift, zoom, tilt }); let ys;
    const at = (t) => {
      ys ||= rows.map((r) => (r.el ? r.y : r.offsetTop + r.offsetHeight / 2));
      const c = cam(t);
      return ys.map((y) => n4(Math.max(0, 1 - Math.abs(c.y - y) / (width * H)) ** 2));
    };
    const set = (t) => {
      K.shoot(layer, cam(t));
      at(t).forEach((p, i) => { const e = rows[i].el || rows[i]; e.style.transform = 'scale(' + n4(1 + scale * p) + ')'; e.style.setProperty('--kit-pulse', p); });
    };
    return { set, cam, at };
  };

  // icon-field-colorize: items (HTML strings or elements) in a cols-wide grid over { x, y, w, h }; each tile goes grayscale -> colour,
  // 0.55 -> 1 opacity, 0.9 -> 1 scale, starting K.stagger(rank) apart: order 'radial' (centre first), 'seed' (shuffled) or 'index'.
  C.iconField = ({ parent = K.stage, items, cols = 6, x = 0, y = 0, w = W, h = H, t0, t1, order = 'radial', seed = 1, dur = K.dur(0.5) } = {}) => {
    need(items && items.length && t1 - t0 >= dur, 'iconField: need { items } and t1 - t0 >= dur');
    const n = items.length, nr = Math.ceil(n / cols), cw = w / cols, ch = h / nr, r = rng('icons:' + seed);
    const key = items.map((_, i) => order === 'radial' ? Math.hypot(((i % cols) + 0.5) / cols - 0.5, (Math.floor(i / cols) + 0.5) / nr - 0.5) : order === 'seed' ? r() : i);
    const rank = key.map((k, i) => key.filter((m, j) => m < k || (m === k && j < i)).length);
    const tiles = items.map((it, i) => {
      const e = K.el('div', 'kit-icon', parent);
      K.css(e, { position: 'absolute', left: n1(x + (i % cols) * cw) + 'px', top: n1(y + Math.floor(i / cols) * ch) + 'px', width: n1(cw) + 'px', height: n1(ch) + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center' });
      if (typeof it === 'string') e.innerHTML = it; else e.appendChild(it);
      return e;
    });
    const at = (t) => tiles.map((_, i) => n4(K.ease(K.seg(t, t0 + K.stagger(rank[i], n, t1 - t0 - dur), t0 + K.stagger(rank[i], n, t1 - t0 - dur) + dur))));
    const set = (t) => at(t).forEach((k, i) => { tiles[i].style.filter = k >= 1 ? 'none' : 'grayscale(' + n4(1 - k) + ')'; tiles[i].style.opacity = n4(0.55 + 0.45 * k); tiles[i].style.transform = 'scale(' + n4(0.9 + 0.1 * k) + ')'; });
    return { set, at, tiles };
  };

  // letterspace-materialize: el (centred text) tracks in from `from` em of letter-spacing to `to`, rising `rise` em and unblurring.
  // padding-left = the spacing keeps the text centred (CSS adds the spacing after the last letter too). Owns letter-spacing, padding-left,
  // opacity, transform and filter of el.
  C.letterspace = (el, { t0, t1, from = 0.5, to = 0.04, rise = 0.25, blur = 6 } = {}) => {
    need(el && t1 > t0, 'letterspace: need (el, { t0, t1 > t0 })');
    const e = E('power3.out'), at = (t) => { const p = e(K.seg(t, t0, t1)); return { ls: n4(K.lerp(from, to, p)), op: n4(K.seg(p, 0, 0.5)), ty: n4(rise * (1 - p)), blur: n4(blur * (1 - p)) }; };
    el.style.whiteSpace = 'nowrap';
    const set = (t) => {
      const a = at(t);
      el.style.letterSpacing = a.ls + 'em'; el.style.paddingLeft = a.ls + 'em'; el.style.opacity = a.op; el.style.visibility = a.op > 0.001 ? 'visible' : 'hidden';
      el.style.transform = 'translateY(' + a.ty + 'em)'; el.style.filter = a.blur > 0.05 ? 'blur(' + a.blur + 'px)' : 'none';
    };
    return { set, at };
  };

  // orbit-ring-title-open: `nucleus` (the title) sits at (cx, cy); satellites circle it on an ellipse (rx, ry, tilted `tilt` degrees) that
  // draws itself, front half bigger and brighter and above the nucleus, back half smaller and under it. They turn `turns` revolutions
  // over t0..t1 (power2.out) and keep drifting at `drift` rad/s after. Entrance pops are staggered. The helper owns their transform.
  C.orbitRingTitle = ({ parent = K.stage, nucleus, satellites, cx = W / 2, cy = H / 2, rx = 0.34 * W, ry = 0.14 * H, tilt = -14, t0, t1, turns = 0.5, drift = 0.25, ring = true } = {}) => {
    need(nucleus && satellites && satellites.length && t1 > t0, 'orbitRingTitle: need { nucleus, satellites, t0, t1 }');
    [nucleus, ...satellites].forEach(abs); nucleus.style.zIndex = 2;
    const n = satellites.length, T = tilt * Math.PI / 180, e = E('power2.out'), eb = E('back.out(1.7)');
    let path = null;
    if (ring) {
      const root = K.el('div', 'kit-orbit-ring', parent);
      K.css(root, { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', pointerEvents: 'none', zIndex: 0 });
      root.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '"><ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + tilt + ' ' + cx + ' ' + cy + ')" fill="none" stroke="var(--kit-accent)" stroke-opacity=".55" stroke-width="' + n1(2 * K.u) + '" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>';
      path = root.querySelector('ellipse');
    }
    const at = (t) => {
      const phase = 2 * Math.PI * turns * e(K.seg(t, t0, t1)) + drift * Math.max(0, t - t1);
      return { draw: n4(e(K.seg(t, t0, t0 + 0.6 * (t1 - t0)))), nucleus: n4(eb(K.seg(t, t0, t0 + 0.4 * (t1 - t0)))), sats: satellites.map((_, i) => {
        const th = 2 * Math.PI * i / n - Math.PI / 2 + phase, ex = rx * Math.cos(th), ey = ry * Math.sin(th), d = Math.sin(th);
        const pop = eb(K.seg(t, t0 + 0.2 * (t1 - t0) + K.stagger(i, n, 0.4 * (t1 - t0)), t0 + 0.2 * (t1 - t0) + K.stagger(i, n, 0.4 * (t1 - t0)) + 0.4 * (t1 - t0)));
        return { x: n1(cx + ex * Math.cos(T) - ey * Math.sin(T)), y: n1(cy + ex * Math.sin(T) + ey * Math.cos(T)), s: n4((1 + 0.25 * d) * pop), op: n4((0.7 + 0.3 * d) * Math.min(1, pop * 2)), front: d > 0 };
      }) };
    };
    const place = (e2, x, y, s, op) => { e2.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(' + Math.max(0, s) + ')'; K.show(e2, Math.min(1, Math.max(0, op))); };
    const set = (t) => {
      const a = at(t); if (path) path.setAttribute('stroke-dashoffset', n4(1 - a.draw));
      place(nucleus, cx, cy, a.nucleus, K.seg(a.nucleus, 0, 0.3));
      a.sats.forEach((s, i) => { place(satellites[i], s.x, s.y, s.s, s.op); satellites[i].style.zIndex = s.front ? 3 : 1; });
    };
    return { set, at };
  };

  // spotlight-hero-card: heroPush is S.tour over two poses, z 0.78 -> 2.6 (expo.out) with ry 34 -> 0 (our choice: the card comes round to
  // frontal as it lands), about (x, y) in layer px. spotlightHero shoots `layer` with it and dims everything but a disc round the hero
  // (hero = { r } its radius in layer px; the disc sits at the screen centre, so x, y must be the hero's centre).
  C.heroPush = ({ t0, t1, x = W / 2, y = H / 2, z = [0.78, 2.6], ry = [34, 0], persp = 1100 } = {}) => {
    need(t1 > t0, 'heroPush: t1 must be > t0');
    return S.tour([{ t: t0, state: { z: z[0], ry: ry[0], x, y, persp } }, { t: t1, state: { z: z[1], ry: ry[1], x, y, persp }, ease: 'expo.out' }]);
  };
  C.spotlightHero = ({ parent = K.stage, layer, hero, t0, t1, x = W / 2, y = H / 2, dim = 0.7, cam } = {}) => {
    need(layer && hero && hero.r > 0, 'spotlightHero: need { layer, hero: { r } }');
    const shot = cam || C.heroPush({ t0, t1, x, y }), ov = K.el('div', 'kit-spotlight', parent);
    K.css(ov, { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', pointerEvents: 'none', zIndex: 20 });
    const at = (t) => { const c = shot(t), r = hero.r * c.z * 1.05; return { z: n4(c.z), r: n1(r), op: n4(K.seg(t, t0, t0 + 0.5 * (t1 - t0))) }; };
    const set = (t) => {
      K.shoot(layer, shot(t));
      const a = at(t);
      ov.style.background = 'radial-gradient(circle at ' + W / 2 + 'px ' + H / 2 + 'px, transparent ' + a.r + 'px, rgba(0,0,0,' + dim + ') ' + n1(a.r * 1.7) + 'px)';
      K.show(ov, a.op);
    };
    return { set, cam: shot, at };
  };

  // text-as-mask: `text` shown as a fill of `media` (any CSS background value: url(...), a gradient), via background-clip: text. The
  // media zooms zoom[0] -> zoom[1] and drifts while the letters wipe in left to right. Needs a bold, large font to read.
  C.textMask = ({ parent = K.stage, text, media, x = W / 2, y = H / 2, w = 0.8 * W, h = 0.4 * H, font = '900 ' + 0.3 * H + 'px sans-serif', t0, t1, zoom = [1.5, 1], drift = [-8, 8] } = {}) => {
    need(text && media && t1 > t0, 'textMask: need { text, media, t0, t1 }');
    const e = K.el('div', 'kit-textmask', parent, text);
    K.css(e, { position: 'absolute', left: n1(x - w / 2) + 'px', top: n1(y - h / 2) + 'px', width: n1(w) + 'px', height: n1(h) + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      font, whiteSpace: 'nowrap', backgroundImage: media, backgroundRepeat: 'no-repeat', backgroundPosition: '50% 50%', color: 'transparent' });
    e.style.webkitBackgroundClip = 'text'; e.style.backgroundClip = 'text'; e.style.webkitTextFillColor = 'transparent';
    const ez = E('power2.inOut'), at = (t) => { const p = ez(K.seg(t, t0, t1)); return { size: n4(100 * K.lerp(zoom[0], zoom[1], p)), pos: n4(50 + K.lerp(drift[0], drift[1], p)), wipe: n4(K.seg(t, t0, t0 + 0.6 * (t1 - t0))) }; };
    const set = (t) => {
      const a = at(t);
      e.style.backgroundSize = a.size + '% auto'; e.style.backgroundPosition = a.pos + '% 50%';
      e.style.clipPath = 'inset(0 ' + n4(100 * (1 - E('power3.out')(a.wipe))) + '% 0 0)'; K.show(e, a.wipe > 0 ? 1 : 0);
    };
    return { set, at, el: e };
  };
})();
