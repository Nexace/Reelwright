// Manim animations, native: Broadcast, TracedPath / TracingTail / AnimatedBoundary, Create / Uncreate, letter and word typing with a
// cursor, PhaseFlow, ZoomedScene. Load after engine.js, doodle.js, math.js and motion.js (math2.js / plot2.js are only needed for the
// helpers that name them). Semantics follow Manim Community Edition (MIT): animation/specialized.py (Broadcast), mobject/changing.py
// (TracedPath, AnimatedBoundary), animation/creation.py (Create, Uncreate, AddTextLetterByLetter, TypeWithCursor), animation/
// movement.py (PhaseFlow), scene/zoomed_scene.py. No Manim code is copied. Everything is built once at load; every .set(t) is a pure
// function of t (no clocks, no random, nothing kept between calls). Coordinates are stage px. Row ids: manim:m4.3, m5.8, m3.1, m3.5,
// m5.5, m9.2 (docs/playbook/manim-native.md has the Manim -> KIT table).
//   KIT.indicate.broadcast(el | null, { at, dur = KIT.dur(1.6), x, y, n = 5, r0 = 0, radius, lag = 0.2, color, width = 3, finalOpacity = 0, parent })
//        → { set(t) }   n concentric rings grow from r0 to `radius` (default: a fifth of the short side) from el's centre (or stage px
//        {x, y}); ring i starts i·lag of a ring-time later; opacity 1 → finalOpacity, linear. Hidden outside at…at+dur.
//   KIT.math.trace(fn(t) → [x, y], { in = 0, out, tail = 1.5, fade = true, taper = false, width = 5, color, samples, dissipate })
//        → { el, set(t), pointAt(t) }   TracedPath / TracingTail: the path fn drew over the last `tail` seconds (tail Infinity: all of it
//        since `in`, one polyline of `samples` points). fade = older stretches thin out in opacity; taper = in width too (TracingTail).
//   KIT.math.animatedBoundary(target, { colors, cycleRate = 0.5, maxWidth = 3, backAndForth = true, pad, radius, in, out })
//        → { el, set(t) }   AnimatedBoundary around an element / {x, y, w, h} / a path d string: a coloured stretch of the outline grows
//        while the last one fades, cycling through colors (Manim's update rule, closed form in t).
//   KIT.math.lagWindows(n, lag) → [[a, b]] per item in 0..1   lag_ratio windows: lag 0 all at once, 1 one after another
//   KIT.math.create(items, { in = 0, dur = KIT.dur(1.2), lag = 1 / n-ish default 0.35, fill = true, mode = 'create' | 'uncreate', out, ease })
//        → { items, set(t) }   Create / Uncreate over a group: items = SVG shape elements, KIT.math.mob results, or an <svg>/<g> whose
//        shapes are collected. Strokes draw on item after item (lag ratio); a fill fades in as its stroke ends. Uncreate runs the
//        reverse (last item retracts first, hidden at the end). Items are owned by it: do not also .set a mob that is passed in.
//   KIT.type(el, text, { at = 0, cps = 10, by = 'char' | 'word', wps = 4, mode = 'type' | 'untype', cursor = 'bar' | 'block' | false,
//        leaveCursor = true, color, textFrom = 0 }) → { set(t), end, shown(t) → string }   AddTextLetterByLetter / AddTextWordByWord /
//        TypeWithCursor and the Remove… / Untype… versions (mode 'untype' deletes a whole text from the end). The cursor follows the text.
//   KIT.math.phaseFlow(ax, F(x, y) → [u, v], { from: [x, y] | el, in = 0, dur = KIT.dur(2), virtualTime = 1, rate, dt, r, color, trail })
//        → { el, at(t) → [x, y] math coords, pointAt(t) → px, set(t) }   PhaseFlow: a dot carried along the vector field F for
//        `virtualTime` units of flow time (RK4, fixed dt, table built once at load via KIT.sim). `from` can be an element to carry
//        (positioned by its centre). trail: true draws the path so far.
//   KIT.zoomInset(src, dst, { layer = KIT.stage, in = 0, grow = KIT.dur(0.8), out, frameColor, displayColor, link = true, skip, parent, scale })
//        → { el, frame, set(t) }   ZoomedScene: src = the rectangle {x, y, w, h} (or fn(t) → rect) that is magnified; dst = where the
//        magnified display sits. A frame marks src; from `in` the display grows from src to dst over `grow`. The display holds a deep
//        clone of `layer`'s children (re-cloned each set(t), so it follows whatever the film wrote that frame; canvases are copied
//        pixel for pixel, WebGL canvases too if the context keeps its drawing buffer). CALL set(t) AFTER every other layer's set(t).
//        Elements with class `kit-zoom` (the inset itself) are never cloned.
'use strict';
(function () {
  const K = window.KIT, M = K.math, SVG = 'http://www.w3.org/2000/svg', u = K.u;
  if (!M || !K.doodle || !K.indicate || !K.sim) throw new Error('tools/manim-fx.js: load tools/math.js (and engine.js, doodle.js) and tools/motion.js first');
  const f2 = (v) => +v.toFixed(2);
  const svgEl = (tag, parent, style = {}, attrs = {}) => {
    const e = document.createElementNS(SVG, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    Object.assign(e.style, style);
    if (parent) parent.appendChild(e);
    return e;
  };
  const layer = (parent) => parent instanceof SVGElement ? svgEl('g', parent) :
    svgEl('svg', parent || K.stage, { position: 'absolute', left: '0', top: '0', overflow: 'visible', pointerEvents: 'none' }, { width: K.W_, height: K.H_ });
  const boxOf = (t) => {
    if (!t.getBoundingClientRect) return { cx: t.x + t.w / 2, cy: t.y + t.h / 2, ...t };
    const r = t.getBoundingClientRect(), s = K.stage.getBoundingClientRect(), k = s.width / K.W_;
    const b = { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k };
    return { ...b, cx: b.x + b.w / 2, cy: b.y + b.h / 2 };
  };
  const fade = (o, t) => (o.out == null ? 1 : 1 - K.easeIn(K.seg(t, o.out - K.dur(0.45), o.out)));
  const smooth = (p) => p * p * (3 - 2 * p);

  // ── Broadcast ────────────────────────────────────────────────────────────
  K.indicate.broadcast = (el, { at = 0, dur = K.dur(1.6), x, y, n = 5, r0 = 0, radius, lag = 0.2, color = 'var(--kit-accent)', width = 3, finalOpacity = 0, parent } = {}) => {
    const c = el ? boxOf(el) : { cx: x ?? K.W_ / 2, cy: y ?? K.H_ / 2 }, R = radius ?? Math.min(K.W_, K.H_) / 5;
    const svg = layer(parent), ringT = 1 / (1 + (n - 1) * lag);   // each ring takes ringT of the window; ring i starts i·lag·ringT in
    svg.style.visibility = 'hidden';
    const rings = Array.from({ length: n }, () => svgEl('circle', svg, { fill: 'none', stroke: color, strokeWidth: width * u }, { cx: f2(c.cx), cy: f2(c.cy), r: 0 }));
    return { set(t) {
      const p = K.seg(t, at, at + dur);
      svg.style.visibility = p > 0 && p < 1 ? 'visible' : 'hidden';
      rings.forEach((r, i) => {
        const q = K.seg(p, i * lag * ringT, i * lag * ringT + ringT);
        r.setAttribute('r', f2(K.lerp(r0, R, q)));
        r.style.opacity = String(K.lerp(1, finalOpacity, q));
        r.style.visibility = q > 0 && q < 1 ? 'visible' : 'hidden';
      });
    } };
  };

  // ── TracedPath / TracingTail ─────────────────────────────────────────────
  M.trace = (fn, o = {}) => {
    const t0 = o.in ?? 0, tail = o.tail ?? 1.5, fadeOut = o.fade ?? true, taper = o.taper ?? false, w = (o.width ?? 5) * u;
    const color = o.color || 'var(--kit-accent)', parent = o.parent, svg = layer(parent), finite = tail === Infinity;
    const n = o.samples ?? (finite ? 120 : 30);
    const st = { fill: 'none', stroke: color, strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: w };
    const poly = finite ? svgEl('path', svg, st) : null;
    const segs = finite ? [] : Array.from({ length: n }, () => svgEl('path', svg, st));
    const pointAt = (t) => fn(Math.max(t, t0));
    return { el: svg, pointAt, set(t) {
      K.show(svg, t > t0 ? fade(o, t) : 0);
      if (finite) {
        let d = '';
        for (let i = 0; i <= n; i++) { const q = fn(K.lerp(t0, Math.max(t0, t), i / n)); d += (i ? 'L' : 'M') + f2(q[0]) + ' ' + f2(q[1]); }
        poly.setAttribute('d', d); return;
      }
      segs.forEach((s, k) => {   // k = 0 is the newest piece; piece k covers [t - tail(k+1)/n, t - tail k/n]
        const tb = t - (tail * k) / n, ta = Math.max(t0, t - (tail * (k + 1)) / n);
        if (tb <= t0 || ta >= tb) { s.style.visibility = 'hidden'; return; }
        const a = fn(ta), b = fn(tb), life = 1 - k / n;
        s.style.visibility = 'visible';
        s.setAttribute('d', `M${f2(a[0])} ${f2(a[1])}L${f2(b[0])} ${f2(b[1])}`);
        s.style.opacity = String(fadeOut ? life : 1);
        s.style.strokeWidth = taper ? w * life : w;
      });
    } };
  };

  // ── AnimatedBoundary ─────────────────────────────────────────────────────
  const roundedD = (b, r) => {
    r = Math.min(r, b.w / 2, b.h / 2);
    const a = (px, py) => `A${f2(r)} ${f2(r)} 0 0 1 ${f2(px)} ${f2(py)}`;
    return `M${f2(b.x + r)} ${f2(b.y)}H${f2(b.x + b.w - r)}${a(b.x + b.w, b.y + r)}V${f2(b.y + b.h - r)}${a(b.x + b.w - r, b.y + b.h)}H${f2(b.x + r)}${a(b.x, b.y + b.h - r)}V${f2(b.y + r)}${a(b.x + r, b.y)}Z`;
  };
  M.animatedBoundary = (target, o = {}) => {
    const colors = o.colors || ['var(--kit-accent)', 'var(--kit-accent-2)', 'var(--kit-ink)'], rate = o.cycleRate ?? 0.5, back = o.backAndForth ?? true;
    const msw = (o.maxWidth ?? 3) * u, t0 = o.in ?? 0;
    let d = typeof target === 'string' ? target : null;
    if (!d) { const b = boxOf(target), pad = o.pad ?? 10 * u; d = roundedD({ x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad }, o.radius ?? 8 * u); }
    const svg = layer(o.parent);
    const mk = () => svgEl('path', svg, { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }, { d, pathLength: '1' });
    const growing = mk(), fading = mk();
    // the visible stretch [a, b] of a pathLength-1 outline: dash b−a, then a gap that reaches past the end
    const part = (el, a, b) => { el.style.strokeDasharray = `${Math.max(b - a, 0.0001)} 2`; el.style.strokeDashoffset = String(-a); el.style.visibility = b - a > 1e-6 ? '' : 'hidden'; };
    return { el: svg, set(t) {
      const time = Math.max(0, t - t0) * rate, idx = Math.floor(time) % colors.length, alpha = time % 1;
      const drawA = smooth(alpha), fadeA = smooth(alpha), bounds = back && Math.floor(time) % 2 === 1 ? [1 - drawA, 1] : [0, drawA];
      K.show(svg, t >= t0 ? fade(o, t) : 0);
      part(growing, ...bounds); growing.style.stroke = colors[idx]; growing.style.strokeWidth = msw;
      if (time >= 1) {
        part(fading, ...bounds); fading.style.stroke = colors[(idx - 1 + colors.length) % colors.length]; fading.style.strokeWidth = (1 - fadeA) * msw;
      } else fading.style.visibility = 'hidden';
    } };
  };

  // ── Create / Uncreate ────────────────────────────────────────────────────
  M.lagWindows = (n, lag) => {
    const w = 1 / (1 + (n - 1) * lag);
    return Array.from({ length: n }, (_, i) => [i * lag * w, i * lag * w + w]);
  };
  const SHAPES = 'path, line, circle, ellipse, rect, polyline, polygon';
  const collect = (it) => {
    if (it && it.path && it.path.setAttribute) return [it.path];   // a KIT.math.mob
    if (it && it.el && !(it instanceof Element)) return collect(it.el);
    if (it instanceof Element) return /^(svg|g)$/i.test(it.tagName) ? [...it.querySelectorAll(SHAPES)] : [it];
    throw new Error('KIT.math.create: items must be SVG elements, KIT.math.mob results or an <svg>/<g>');
  };
  M.create = (items, o = {}) => {
    const els = [].concat(items).flatMap(collect), mode = o.mode || 'create', t0 = o.in ?? 0, dur = o.dur ?? K.dur(1.2), ease = o.ease || K.ease;
    if (!els.length) throw new Error('KIT.math.create: no shapes to draw');
    const win = M.lagWindows(els.length, o.lag ?? (els.length > 1 ? 0.35 : 0));
    const fillOp = els.map((e) => parseFloat(e.style.fillOpacity || '1') || 1);
    return { items: els, set(t) {
      let p = K.seg(t, t0, t0 + dur);
      if (mode === 'uncreate') p = 1 - p;
      els.forEach((e, i) => {
        const q = K.seg(p, win[i][0], win[i][1]), s = ease(q);
        K.doodle.drawOn(e, s);
        if (o.fill !== false) e.style.fillOpacity = String(fillOp[i] * K.seg(q, 0.6, 1));
        if (mode === 'uncreate' && s <= 0) e.style.visibility = 'hidden';
      });
    } };
  };

  // ── typing ───────────────────────────────────────────────────────────────
  K.type = (el, text, o = {}) => {
    const { at = 0, cps = 10, by = 'char', wps = 4, mode = 'type', cursor = 'bar', leaveCursor = true } = o;
    const units = by === 'word' ? text.match(/\S+\s*/g) || [] : Array.from(text), n = units.length, rate = by === 'word' ? wps : cps;
    const prefix = [''];   // prefix[k] = the first k units
    units.forEach((x, i) => prefix.push(prefix[i] + x));
    const end = at + n / rate, count = (t) => Math.min(n, Math.max(0, Math.floor((t - at) * rate + 1e-9)));
    el.textContent = ''; el.style.whiteSpace = 'pre-wrap';
    const node = document.createTextNode(''); el.appendChild(node);
    let cur = null;
    if (cursor) {
      cur = K.el('span', '', el);
      K.css(cur, { display: 'inline-block', width: cursor === 'block' ? '0.55em' : '0.07em', height: cursor === 'block' ? '1.05em' : '1em',
        marginLeft: '0.04em', verticalAlign: '-0.12em', background: o.color || 'currentColor' });
    }
    const shown = (t) => { const k = count(t); return mode === 'untype' ? prefix[n - k] : prefix[k]; };
    const set = (t) => {
      node.data = shown(t);
      if (cur) {   // the cursor shows while the text moves and, with leaveCursor, afterwards; an untyped text keeps it at the start
        const live = t >= at && (t < end || leaveCursor);
        cur.style.visibility = live || (t < at && mode === 'untype') ? 'visible' : 'hidden';
      }
    };
    set(-1e9);
    return { set, end, shown };
  };

  // ── PhaseFlow ────────────────────────────────────────────────────────────
  M.phaseFlow = (ax, F, o = {}) => {
    const t0 = o.in ?? 0, dur = o.dur ?? K.dur(2), vt = o.virtualTime ?? 1, rate = o.rate || ((p) => p), dt = o.dt ?? 1 / 120;
    const carry = o.from instanceof Element ? o.from : null, from = carry ? ax.p2c(boxOf(carry).cx, boxOf(carry).cy) : o.from || [0, 0];
    const rk = (s, h) => {   // RK4 on flow time, h = step in flow time
      const k1 = F(s[0], s[1]), k2 = F(s[0] + (h / 2) * k1[0], s[1] + (h / 2) * k1[1]), k3 = F(s[0] + (h / 2) * k2[0], s[1] + (h / 2) * k2[1]);
      const k4 = F(s[0] + h * k3[0], s[1] + h * k3[1]);
      return [s[0] + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), s[1] + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
    };
    const steps = Math.ceil(dur / dt - 1e-9), h = vt / Math.max(1, steps);   // dur/dt table samples; sample k is flow time k·h
    const sim = K.sim((s) => rk(s, h), from, { dt, dur });
    const at = (t) => sim.at(K.clamp(rate(K.seg(t, t0, t0 + dur)), 0, 1) * dur);
    const pointAt = (t) => ax.c2p(...at(t));
    let el = carry;
    if (!el) el = svgEl('circle', ax.el, { fill: o.color || 'var(--kit-accent-2)' }, { r: f2((o.r ?? 9) * u) });
    const trail = o.trail ? svgEl('path', ax.el, { fill: 'none', stroke: o.color || 'var(--kit-accent-2)', strokeWidth: 3 * u, strokeLinecap: 'round' }) : null;
    const set = (t) => {
      const q = pointAt(t);
      if (carry) {
        const b = [carry.offsetWidth, carry.offsetHeight];
        carry.style.transform = `translate(${f2(q[0] - b[0] / 2)}px, ${f2(q[1] - b[1] / 2)}px)`;
      } else { el.setAttribute('cx', f2(q[0])); el.setAttribute('cy', f2(q[1])); el.style.opacity = t >= t0 ? '1' : '0'; }
      if (trail) {
        const p = K.clamp(rate(K.seg(t, t0, t0 + dur))), m = 60;
        trail.setAttribute('d', Array.from({ length: m + 1 }, (_, i) => { const r = ax.c2p(...sim.at(p * dur * (i / m))); return (i ? 'L' : 'M') + f2(r[0]) + ' ' + f2(r[1]); }).join(''));
      }
    };
    return { el, at, pointAt, set, sim };
  };

  // ── ZoomedScene ──────────────────────────────────────────────────────────
  K.zoomInset = (src, dst, o = {}) => {
    const lay = o.layer || K.stage, parent = o.parent || K.stage, t0 = o.in ?? 0, grow = o.grow ?? K.dur(0.8);
    const rectOf = typeof src === 'function' ? src : () => src;
    const fc = o.frameColor || 'var(--kit-accent-2)', dc = o.displayColor || 'var(--kit-accent)';
    const svg = layer(parent); svg.classList.add('kit-zoom');
    const frame = svgEl('rect', svg, { fill: 'none', stroke: fc, strokeWidth: 3 * u });
    const links = o.link === false ? [] : [0, 1].map(() => svgEl('path', svg, { fill: 'none', stroke: fc, strokeWidth: 1.5 * u, strokeDasharray: `${6 * u} ${6 * u}` }));
    const box = K.el('div', 'kit-zoom', parent);
    K.css(box, { position: 'absolute', overflow: 'hidden', border: `${3 * u}px solid ${dc}`, boxSizing: 'border-box', background: 'var(--kit-bg)', visibility: 'hidden' });
    const inner = K.el('div', 'kit-zoom-inner', box);
    K.css(inner, { position: 'absolute', left: '0', top: '0', width: K.W_ + 'px', height: K.H_ + 'px', transformOrigin: '0 0' });
    const skip = (e) => e.classList && (e.classList.contains('kit-zoom') || (o.skip && e.matches(o.skip)));
    const copyCanvases = (from, to) => {
      const a = from.querySelectorAll('canvas'), b = to.querySelectorAll('canvas');
      a.forEach((c, i) => { b[i].width = c.width; b[i].height = c.height; try { b[i].getContext('2d').drawImage(c, 0, 0); } catch { /* tainted */ } });
    };
    const rectAt = (t) => {
      const s = rectOf(t), p = smooth(K.seg(t, t0, t0 + grow));
      return { s, d: { x: K.lerp(s.x, dst.x, p), y: K.lerp(s.y, dst.y, p), w: K.lerp(s.w, dst.w, p), h: K.lerp(s.h, dst.h, p) }, p };
    };
    return { el: box, frame, rectAt, set(t) {
      const { s, d, p } = rectAt(t), vis = t >= t0 ? fade(o, t) : 0;
      frame.setAttribute('x', f2(s.x)); frame.setAttribute('y', f2(s.y)); frame.setAttribute('width', f2(s.w)); frame.setAttribute('height', f2(s.h));
      K.show(svg, vis);
      links.forEach((l, i) => {   // the frame's top-right / bottom-left corners to the display's: the dashed "zoom" lines
        const a = i ? [s.x, s.y + s.h] : [s.x + s.w, s.y], b = i ? [d.x, d.y + d.h] : [d.x + d.w, d.y];
        l.setAttribute('d', `M${f2(a[0])} ${f2(a[1])}L${f2(b[0])} ${f2(b[1])}`); l.style.opacity = String(p);
      });
      K.css(box, { left: f2(d.x) + 'px', top: f2(d.y) + 'px', width: f2(d.w) + 'px', height: f2(d.h) + 'px' });
      K.show(box, vis);
      if (vis <= 0.001) return;
      const k = o.scale ?? d.w / s.w;   // magnification of the display (contain: width decides)
      inner.style.transform = `translate(${f2(-s.x * k)}px, ${f2(-s.y * k)}px) scale(${k})`;
      const live = [...lay.children].filter((e) => !skip(e));
      inner.replaceChildren(...live.map((e) => e.cloneNode(true)));
      [...inner.children].forEach((c, i) => copyCanvases(live[i], c));
    } };
  };
})();
