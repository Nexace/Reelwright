// Shotcards B, data: 5 video-shotcraft cards (11 helpers) as pure functions of t (ideas and tuned numbers only; the code is ours).
// Loaded after tools/engine.js (pvk: ../../../tools/shotcards/data.js; HyperFrames: kit/shotcards/data.js).
// KIT.shotcards.<name>({ parent = KIT.stage, box = KIT.safe, at = 0, dur, ... }) → { el, end, set(t) }. DOM is built once; set(t) only
// writes styles from t (no clocks, no Math.random: seeded rng at build, no state between calls). Build after fonts and layout.
//   scrollBrake             a list scrolls fast and brakes (closed-form decel) onto one row; variant 'reticle' locks a reticle on it
//   beforeAfterSlider       two layers and a persistent divider that scrubs and rests at the split
//   oscilloscopeStream / unitDotSwarmRegroup / axisRescaleShock   live chart moves
//   needleSweepSelftest / tapeScrollFixedPointer                  gauge readouts
//   timelineTravel          a camera travelling a long timeline, dwelling on each event
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('shotcards/data.js: load tools/engine.js first');
  const S = (K.shotcards = K.shotcards || {});
  const rng = (s) => () => { s = (s + 0x6D2B79F5) | 0; let z = Math.imul(s ^ (s >>> 15), 1 | s); z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z; return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
  const mk = (parent, css, html, tag) => { const e = K.el(tag || 'div', '', parent || K.stage, html || ''); e.style.position = 'absolute'; K.css(e, css || {}); return e; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const ez = (e) => (typeof e === 'function' ? e : e ? K.easing(e) : K.ease);
  const n3 = (v) => +v.toFixed(3);
  const px = (v) => n3(v) + 'px';
  const area = (o) => o.box || K.safe;
  const wrap = (parent) => mk(parent, { left: 0, top: 0, width: K.W_ + 'px', height: K.H_ + 'px', pointerEvents: 'none' });
  const NS = 'http://www.w3.org/2000/svg';
  const svgBox = (parent) => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('width', K.W_); s.setAttribute('height', K.H_); s.style.cssText = 'position:absolute;left:0;top:0;overflow:visible'; parent.appendChild(s); return s; };
  const se = (parent, tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  const txt = (size, extra) => Object.assign({ fontFamily: 'var(--kit-font-text)', fontWeight: 600, fontSize: size + 'px', color: 'var(--kit-ink)', whiteSpace: 'nowrap', lineHeight: 1.15 }, extra);
  const COLORS = ['#6ee7b7', '#93c5fd', '#fca5a5', '#fcd34d', '#c4b5fd', '#f9a8d4'];

  // ── scrollBrake: rows = [text | { tag, text }] scroll up through a window at constant speed, then brake with a power-n decel that stops
  // exactly with row `target` on the centre line. The cruise speed and the decel start speed are matched (closed form: a = n·c / (n·c + 1 − c)
  // is the share of the distance covered while cruising up to fraction c of dur). Motion blur follows the speed. variant 'changelog': the
  // landing row grows and gets the accent; variant 'reticle': a bracket reticle wanders wide and snaps onto it as the scroll slows.
  S.scrollBrake = (o) => {
    const R = o.rows, n = R.length, a = area(o), target = o.target ?? n - 3, at = o.at ?? 0, dur = o.dur ?? K.dur(2.4), c = o.cruise ?? 0.55, pw = o.power ?? 3, variant = o.variant ?? 'changelog';
    const w = o.w ?? Math.min(a.w, 760 * K.u), h = o.rowH ?? 86 * K.u, gap = h * 0.12, win = o.h ?? a.h * 0.8, X = o.x ?? K.W_ / 2, Y = (o.y ?? K.H_ / 2) - win / 2, D = target * (h + gap);
    const f0 = (pw * c) / (pw * c + 1 - c), root = wrap(o.parent);
    const prog = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : p < c ? (f0 * p) / c : f0 + (1 - f0) * (1 - Math.pow(1 - (p - c) / (1 - c), pw)));
    const vel = (p) => (p <= 0 || p >= 1 ? 0 : (p < c ? f0 / c : ((1 - f0) * pw * Math.pow(1 - (p - c) / (1 - c), pw - 1)) / (1 - c)));   // d prog / d p
    const clip = mk(root, { left: px(X - w / 2), top: px(Y), width: px(w), height: px(win), overflow: 'hidden', maskImage: 'linear-gradient(transparent, #000 15%, #000 85%, transparent)', webkitMaskImage: 'linear-gradient(transparent, #000 15%, #000 85%, transparent)' });
    const list = mk(clip, { left: 0, top: 0, width: '100%', height: px(n * (h + gap)) });
    const rows = R.map((r, i) => { const e = mk(list, txt(h * 0.34, { left: 0, top: px(i * (h + gap)), width: '100%', height: px(h), lineHeight: px(h), padding: `0 ${px(h * 0.4)}`, boxSizing: 'border-box', background: 'var(--kit-surface)', borderRadius: 'var(--kit-radius)' }));
      e.innerHTML = (r.tag ? `<span style="color:var(--kit-accent);font-weight:800;margin-right:${h * 0.3}px">${esc(r.tag)}</span>` : '') + esc(r.text ?? r); return e; });
    const rw = w * 1.04, ret = variant === 'reticle' ? mk(root, { left: px(X - rw / 2), top: px(Y + win / 2 - h / 2), width: px(rw), height: px(h), border: `${Math.max(2, 3 * K.u)}px solid var(--kit-accent)`, borderRadius: 'var(--kit-radius)', boxSizing: 'border-box' }) : null;
    const lock = K.spring({ mass: 1, damping: 12, stiffness: 220 }), tLock = at + dur * 0.93, v0 = D / dur;
    return { el: root, end: at + dur + 0.5, velocity: (t) => vel(K.seg(t, at, at + dur)) * v0, set(t) {
      const p = K.seg(t, at, at + dur), y = D * prog(p), v = vel(p) * v0, centre = win / 2 - h / 2;
      list.style.transform = `translateY(${px(centre - y)})`; list.style.filter = `blur(${n3(Math.min(8, v * 0.004) * K.u)}px)`;
      const land = K.seg(t, at + dur * 0.97, at + dur * 0.97 + 0.4);
      rows.forEach((e, i) => { const hit = i === target ? K.E.out(land) : 0; e.style.transform = `scale(${n3(1 + 0.05 * hit)})`; e.style.background = i === target && land > 0 ? `color-mix(in srgb, var(--kit-accent) ${n3(25 * hit)}%, var(--kit-surface))` : 'var(--kit-surface)'; });
      if (ret) { const s = t < tLock ? 1.5 + 0.6 * Math.sin((t - at) * 9) * (1 - K.seg(t, at + dur * 0.6, tLock)) : 1 + 0.5 * (1 - lock(t - tLock));
        ret.style.transform = `scaleX(${n3(1 + 0.04 * (s - 1))}) scaleY(${n3(s)})`; ret.style.opacity = n3(K.seg(t, at, at + 0.3) * (t < tLock ? 0.45 : 1)); }
    } };
  };

  // ── beforeAfterSlider: before / after = an element, an HTML string, or { color, label }; they fill `box`. A divider with a knob
  // scrubs along keys = [[t, p], …] (p = 0 left … 1 right, default: rest at 50 %, flick left, right, settle at 50 %); left of it shows
  // BEFORE, right of it AFTER. The divider rests at its split after the last key, so a film can sit on it.
  S.beforeAfterSlider = (o) => {
    const a = area(o), at = o.at ?? 0, root = wrap(o.parent), sw = Math.max(3, 4 * K.u);
    const keys = o.keys ?? [[at, 0.5], [at + K.dur(0.5), 0.5], [at + K.dur(1.2), 0.1], [at + K.dur(2.2), 0.9], [at + K.dur(3), 0.5]], eases = keys.slice(1).map(() => K.easing('power2.inOut'));
    const layer = (src, def) => { const l = mk(root, { left: px(a.x), top: px(a.y), width: px(a.w), height: px(a.h), overflow: 'hidden', borderRadius: 'var(--kit-radius)' });
      if (src && src.nodeType) l.appendChild(src); else if (typeof src === 'string') l.innerHTML = src; else { const d = src ?? def; K.css(l, { background: d.color }); mk(l, txt(a.h * 0.1, { left: 0, top: '42%', width: '100%', textAlign: 'center', color: '#0f1115', fontWeight: 800 }), esc(d.label)); } return l; };
    const before = layer(o.before, { color: '#475569', label: 'BEFORE' }), after = layer(o.after, { color: COLORS[0], label: 'AFTER' });
    const line = mk(root, { top: px(a.y), width: px(sw), height: px(a.h), background: '#fff', marginLeft: px(-sw / 2) }), kd = 56 * K.u;
    const knob = mk(root, txt(kd * 0.4, { top: px(a.y + a.h / 2 - kd / 2), width: px(kd), height: px(kd), marginLeft: px(-kd / 2), borderRadius: '50%', background: '#fff', color: '#0f1115', textAlign: 'center', lineHeight: px(kd) }), '&#8644;');
    const pos = (t) => K.keys(t, keys, eases);
    return { el: root, end: keys[keys.length - 1][0], pos, set(t) {
      const p = pos(t); after.style.clipPath = `inset(0 0 0 ${n3(100 * p)}%)`; line.style.left = knob.style.left = px(a.x + a.w * p); line.style.opacity = 1;
    } };
  };

  // ── oscilloscope-stream: a green trace scrolling left at `speed` screens/s (two summed sines plus a seeded burst), a faint phosphor trail
  // from earlier t, a graticule; y(x, t) is closed form so every frame is independent.
  S.oscilloscopeStream = (o) => {
    const a = area(o), root = wrap(o.parent), sv = svgBox(root), N = o.points ?? 180, amp = o.amp ?? a.h * 0.28, speed = o.speed ?? 0.35, r = rng(o.seed ?? 21), at = o.at ?? 0, dur = o.dur ?? K.dur(3), col = o.color ?? 'var(--kit-accent)';
    for (let i = 0; i <= 8; i++) se(sv, 'line', { x1: a.x + (a.w * i) / 8, x2: a.x + (a.w * i) / 8, y1: a.y, y2: a.y + a.h, stroke: 'var(--kit-muted)', 'stroke-opacity': 0.25, 'stroke-width': 1 });
    for (let i = 0; i <= 4; i++) se(sv, 'line', { y1: a.y + (a.h * i) / 4, y2: a.y + (a.h * i) / 4, x1: a.x, x2: a.x + a.w, stroke: 'var(--kit-muted)', 'stroke-opacity': 0.25, 'stroke-width': 1 });
    const ph = [r() * 6.28, r() * 6.28], bursts = Array.from({ length: 4 }, () => ({ c: r() * 3, w: 0.15 + r() * 0.2 }));
    const trace = (t, x) => { const s = x - speed * t, env = 0.55 + bursts.reduce((m, b) => Math.max(m, Math.exp(-Math.pow(((((s - b.c) % 3) + 4.5) % 3) - 1.5, 2) / (b.w * b.w))), 0) * 0.9;
      return env * (Math.sin(2 * Math.PI * (s * 3) + ph[0]) + 0.45 * Math.sin(2 * Math.PI * (s * 7.3) + ph[1])) / 1.6; };
    const mkTrace = (op, wd) => se(sv, 'polyline', { fill: 'none', stroke: col, 'stroke-width': wd, 'stroke-opacity': op, 'stroke-linejoin': 'round' });
    const lines = [[0.18, 0.12, 6], [0.3, 0.06, 3], [1, 0, 1]].map(([op, lag, wd]) => ({ e: mkTrace(op, Math.max(1.5, wd * K.u)), lag }));
    lines[2].e.style.filter = `drop-shadow(0 0 ${6 * K.u}px ${col})`;
    return { el: root, end: at + dur, trace, set(t) { for (const l of lines) l.e.setAttribute('points', Array.from({ length: N + 1 }, (_, i) => `${n3(a.x + (a.w * i) / N)},${n3(a.y + a.h / 2 - amp * trace(t - at - l.lag, i / N))}`).join(' ')); } };
  };

  // ── unitDotSwarmRegroup: `total` dots (default the sum of groups[].count) drift as a seeded swarm, then regroup into one stack of dots
  // per group (groups = [{ label, count, color }]), each dot leaving in turn with its own ease; labels fade in under the stacks.
  S.unitDotSwarmRegroup = (o) => {
    const G = o.groups, a = area(o), root = wrap(o.parent), r = rng(o.seed ?? 17), at = o.at ?? 0, regroup = o.regroupAt ?? at + K.dur(1), per = o.per ?? K.dur(0.8), d = o.dot ?? 22 * K.u, ease = ez(o.ease ?? 'power3.inOut');
    const total = G.reduce((s, g) => s + g.count, 0); if (total > 400) throw new Error('unitDotSwarmRegroup: ' + total + ' dots is too many (max 400)');
    const colW = a.w / G.length, perRow = Math.max(1, Math.floor((colW * 0.8) / (d * 1.4))), dots = []; let k = 0;
    G.forEach((g, gi) => { for (let i = 0; i < g.count; i++, k++) {
      const e = mk(root, { width: px(d), height: px(d), borderRadius: '50%', background: g.color ?? COLORS[gi % 6] }), sw = [a.x + r() * a.w, a.y + r() * a.h * 0.85];
      dots.push({ e, sw, to: [a.x + colW * (gi + 0.5) + ((i % perRow) - (perRow - 1) / 2) * d * 1.4, a.y + a.h * 0.8 - Math.floor(i / perRow) * d * 1.4], ph: r() * 6.28, d: (k / total) * K.dur(0.6) }); } });
    const labs = G.map((g, gi) => mk(root, txt(d * 1.1, { left: px(a.x + colW * gi), width: px(colW), top: px(a.y + a.h * 0.86), textAlign: 'center' }), esc(`${g.label ?? ''} ${g.count}`)));
    return { el: root, end: regroup + per + K.dur(0.6), set(t) {
      for (const p of dots) { const e = ease(K.seg(t, regroup + p.d, regroup + p.d + per)), wob = 1 - e, x = K.lerp(p.sw[0] + Math.sin(t * 1.3 + p.ph) * 18 * K.u * wob, p.to[0], e), y = K.lerp(p.sw[1] + Math.cos(t * 1.1 + p.ph) * 18 * K.u * wob, p.to[1], e);
        p.e.style.transform = `translate(${px(x - d / 2)},${px(y - d / 2)})`; p.e.style.opacity = n3(K.seg(t, at, at + 0.2)); }
      labs.forEach((l) => { l.style.opacity = n3(K.seg(t, regroup + per * 0.8, regroup + per * 1.3)); });
    } };
  };

  // ── axisRescaleShock: bars drawn against an axis of max `max[0]`; at `shockAt` the axis jumps to `max[1]` (an outlier arrived): the tick
  // labels re-count, every bar rescales on an underdamped spring, the axis line flashes and the whole chart gets a decaying shake.
  S.axisRescaleShock = (o) => {
    const V = o.values, a = area(o), root = wrap(o.parent), [m0, m1] = o.max ?? [Math.max(...V.slice(0, -1)) * 1.2, Math.max(...V) * 1.1], at = o.at ?? 0, shockAt = o.shockAt ?? at + K.dur(1.2), n = V.length;
    const W = a.w * 0.8, H = a.h * 0.7, x0 = a.x + (a.w - W) / 2, y0 = a.y + a.h * 0.85, bw = (W / n) * 0.62, sp = K.spring({ mass: 1, damping: 8, stiffness: 120 }), shake = o.shake ?? 10 * K.u;
    const stage = mk(root, { left: 0, top: 0, width: K.W_ + 'px', height: K.H_ + 'px' });
    const ticks = Array.from({ length: 5 }, (_, i) => ({ line: mk(stage, { left: px(x0), width: px(W), height: '1px', background: 'var(--kit-muted)', opacity: 0.35 }), lab: mk(stage, txt(18 * K.u, { left: px(x0 - 70 * K.u), width: px(60 * K.u), textAlign: 'right', color: 'var(--kit-muted)' })) }));
    const axis = mk(stage, { left: px(x0), top: px(y0), width: px(W), height: px(Math.max(2, 3 * K.u)), background: 'var(--kit-ink)' });
    const bars = V.map((v, i) => ({ e: mk(stage, { left: px(x0 + (W / n) * (i + 0.19)), width: px(bw), background: i === n - 1 ? 'var(--kit-accent)' : COLORS[1], borderRadius: `${px(6 * K.u)} ${px(6 * K.u)} 0 0` }), v }));
    const tt = (t) => (t < shockAt ? 0 : sp((t - shockAt) * 3));   // 0 → 1 with overshoot
    return { el: root, end: shockAt + 1.2, axisMax: (t) => K.lerp(m0, m1, tt(t)), set(t) {
      const m = K.lerp(m0, m1, tt(t)), ent = K.E.out(K.seg(t, at, at + K.dur(0.7))), dec = Math.exp(-(t - shockAt) * 5) * (t >= shockAt ? 1 : 0);
      stage.style.transform = `translate(${px(Math.sin((t - shockAt) * 60) * shake * dec)},${px(Math.cos((t - shockAt) * 47) * shake * 0.6 * dec)})`;
      ticks.forEach((k, i) => { const f = i / 4; k.line.style.top = px(y0 - H * f); k.lab.style.top = px(y0 - H * f - 12 * K.u); k.lab.textContent = Math.round(m * f).toLocaleString('en-US'); });
      bars.forEach((b, i) => { const h = Math.max(0, (b.v / m) * H * (i === n - 1 ? K.E.out(K.seg(t, shockAt - 0.05, shockAt + 0.15)) : ent)); b.e.style.top = px(y0 - h); b.e.style.height = px(h); });
      axis.style.background = dec > 0.2 ? 'var(--kit-accent)' : 'var(--kit-ink)';
    } };
  };

  // ── needleSweepSelftest: a dial (-120° … +120°) with ticks and a numeric readout. The needle self-tests like an instrument at power-on:
  // sweeps to full scale, back to zero, then springs to `value` and overshoots once. The readout follows the needle.
  S.needleSweepSelftest = (o) => {
    const a = area(o), R = o.radius ?? Math.min(a.w, a.h) * 0.38, C = { x: o.x ?? K.W_ / 2, y: o.y ?? K.H_ / 2 }, min = o.min ?? 0, max = o.max ?? 100, value = o.value ?? 72, at = o.at ?? 0, root = wrap(o.parent), sv = svgBox(root);
    const ang = (v) => K.lerp(-120, 120, (v - min) / (max - min)), pol = (deg, r) => ({ x: C.x + r * Math.sin((deg * Math.PI) / 180), y: C.y - r * Math.cos((deg * Math.PI) / 180) });
    se(sv, 'path', { d: `M ${pol(-120, R).x} ${pol(-120, R).y} A ${R} ${R} 0 1 1 ${pol(120, R).x} ${pol(120, R).y}`, fill: 'none', stroke: 'var(--kit-muted)', 'stroke-opacity': 0.4, 'stroke-width': 10 * K.u, 'stroke-linecap': 'round' });
    for (let i = 0; i <= 20; i++) { const d = -120 + (240 * i) / 20, p1 = pol(d, R * 0.9), p2 = pol(d, R * (i % 5 ? 0.95 : 0.82)); se(sv, 'line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: 'var(--kit-ink)', 'stroke-width': (i % 5 ? 2 : 4) * K.u }); }
    const needle = se(sv, 'line', { x1: C.x, y1: C.y, x2: C.x, y2: C.y - R * 0.88, stroke: 'var(--kit-accent)', 'stroke-width': 6 * K.u, 'stroke-linecap': 'round' }); se(sv, 'circle', { cx: C.x, cy: C.y, r: 14 * K.u, fill: 'var(--kit-accent)' });
    const read = mk(root, txt(R * 0.35, { left: px(C.x - R), width: px(2 * R), top: px(C.y + R * 0.3), textAlign: 'center', fontWeight: 800, fontFamily: 'var(--kit-font-mono)' }));
    const up = K.dur(0.7), hold = K.dur(0.25), down = K.dur(0.7), pause = K.dur(0.2), sp = K.spring({ mass: 1, damping: 9, stiffness: 150 }), tS = at + up + hold + down + pause;
    const val = (t) => (t < tS ? K.keys(t, [[at, min], [at + up, max], [at + up + hold, max], [at + up + hold + down, min]], [K.easing('power2.inOut'), (p) => p, K.easing('power2.inOut')]) : K.lerp(min, value, sp(t - tS)));
    return { el: root, end: tS + 1.4, value: val, set(t) { const v = val(t); needle.setAttribute('transform', `rotate(${n3(ang(v))} ${C.x} ${C.y})`); read.textContent = String(Math.round(K.clamp(v, min - 5, max + 5))).padStart(3, '0') + (o.unit ?? ''); } };
  };

  // ── tapeScrollFixedPointer: a horizontal tape of ticks and numbers slides under a pointer that never moves; the value under the
  // pointer runs from → to (decelerating) and the readout shows it. step = value per labelled tick.
  S.tapeScrollFixedPointer = (o) => {
    const a = area(o), from = o.from ?? 0, to = o.to ?? 240, step = o.step ?? 20, pitch = o.pitch ?? 90 * K.u, at = o.at ?? 0, dur = o.dur ?? K.dur(2.2), root = wrap(o.parent), X = o.x ?? K.W_ / 2, Y = o.y ?? K.H_ / 2, ease = ez(o.ease ?? 'power4.out');
    const span = (to - from) / step; if (span > 400) throw new Error('tapeScrollFixedPointer: ' + span + ' labelled ticks is too many (max 400)');
    const w = Math.min(a.w, 1100 * K.u), clip = mk(root, { left: px(X - w / 2), top: px(Y - 70 * K.u), width: px(w), height: px(140 * K.u), overflow: 'hidden', background: 'var(--kit-surface)', borderRadius: 'var(--kit-radius)', maskImage: 'linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)', webkitMaskImage: 'linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)' });
    const tape = mk(clip, { left: 0, top: 0, height: '100%', width: px((span + 4) * pitch + w) });
    for (let i = 0; i <= span + 4; i++) { const x = w / 2 + (i - 2) * pitch; mk(tape, { left: px(x), top: '8%', width: px(Math.max(2, 3 * K.u)), height: '30%', background: 'var(--kit-ink)' }); mk(tape, txt(26 * K.u, { left: px(x - pitch / 2), width: px(pitch), top: '48%', textAlign: 'center', fontFamily: 'var(--kit-font-mono)' }), String(from + (i - 2) * step)); }
    const ptr = mk(root, { left: px(X - 12 * K.u), top: px(Y - 90 * K.u), width: 0, height: 0, borderLeft: `${px(12 * K.u)} solid transparent`, borderRight: `${px(12 * K.u)} solid transparent`, borderTop: `${px(26 * K.u)} solid var(--kit-accent)` });
    const read = mk(root, txt(70 * K.u, { left: px(X - 200 * K.u), width: px(400 * K.u), top: px(Y + 90 * K.u), textAlign: 'center', fontWeight: 800, fontFamily: 'var(--kit-font-mono)' }));
    const value = (t) => K.lerp(from, to, ease(K.seg(t, at, at + dur)));
    return { el: root, end: at + dur, value, set(t) { const v = value(t); tape.style.transform = `translateX(${px(-((v - from) / step) * pitch)})`; read.textContent = Math.round(v) + (o.unit ?? ''); } };
  };

  // ── timelineTravel: events = [{ label, date }] on a long strip (even spacing `spacing` px apart); the camera travels from event to event
  // (inOut flights, zooming out while it moves and in while it dwells) and the event it is over lights up and lifts. Closed form from
  // KIT.keys: flight i starts at at + i·(flight + dwell).
  S.timelineTravel = (o) => {
    const E = o.events, n = E.length, a = area(o), at = o.at ?? 0, flight = o.flight ?? K.dur(0.9), dwell = o.dwell ?? K.dur(0.8), spacing = o.spacing ?? a.w * 0.5, root = wrap(o.parent), Y = o.y ?? K.H_ / 2, X = K.W_ / 2;
    const world = mk(root, { left: 0, top: 0, width: px(spacing * (n + 1)), height: px(K.H_), transformOrigin: `${X}px ${Y}px` });
    mk(world, { left: 0, top: px(Y), width: px(spacing * (n + 1) + K.W_), height: px(Math.max(3, 4 * K.u)), background: 'var(--kit-muted)', opacity: 0.6, marginLeft: px(-K.W_ / 2) });
    for (let i = 0; i < n * 8; i++) mk(world, { left: px((i * spacing) / 4 + spacing / 2 - spacing * 0.0), top: px(Y - (i % 4 ? 8 : 16) * K.u), width: '2px', height: px((i % 4 ? 16 : 32) * K.u), background: 'var(--kit-muted)', opacity: 0.5 });
    const ev = E.map((e, i) => { const x = (i + 1) * spacing, g = mk(world, { left: px(x), top: px(Y) }), dot = mk(g, { left: px(-12 * K.u), top: px(-12 * K.u), width: px(24 * K.u), height: px(24 * K.u), borderRadius: '50%', background: 'var(--kit-muted)' });
      const lab = mk(g, txt(40 * K.u, { left: px(-spacing * 0.4), width: px(spacing * 0.8), top: px((i % 2 ? 40 : -110) * K.u), textAlign: 'center', fontWeight: 700 }), esc(e.label)), dt = mk(g, txt(24 * K.u, { left: px(-spacing * 0.4), width: px(spacing * 0.8), top: px((i % 2 ? 90 : -60) * K.u), textAlign: 'center', color: 'var(--kit-muted)' }), esc(e.date ?? ''));
      return { x, g, dot, lab, dt, ta: at + i * (flight + dwell) + flight }; });
    const pts = []; ev.forEach((e, i) => { pts.push([e.ta, e.x], [e.ta + dwell, e.x]); }); pts.unshift([at, ev[0].x - spacing * 0.8]);
    const zpts = []; ev.forEach((e) => { zpts.push([e.ta, 1.15], [e.ta + dwell, 1.15]); }); zpts.unshift([at, 0.8]);
    const cam = (t) => K.keys(t, pts, pts.slice(1).map((_, i) => (i % 2 ? (p) => p : K.easing('power2.inOut')))), zoom = (t) => K.keys(t, zpts, zpts.slice(1).map((_, i) => (i % 2 ? (p) => p : K.easing('power2.inOut'))));
    return { el: root, end: ev[n - 1].ta + dwell, cam, set(t) {
      const cx = cam(t), z = zoom(t); world.style.transform = `translateX(${px(X - cx)}) scale(${n3(z)})`;
      ev.forEach((e) => { const on = K.seg(t, e.ta - 0.15, e.ta + 0.1) * (1 - K.seg(t, e.ta + dwell - 0.05, e.ta + dwell + 0.25)); e.dot.style.background = on > 0.01 ? 'var(--kit-accent)' : 'var(--kit-muted)'; e.dot.style.transform = `scale(${n3(1 + on * 0.8)})`; e.lab.style.opacity = n3(0.4 + 0.6 * on); e.dt.style.opacity = n3(0.4 + 0.6 * on); e.g.style.transform = `translateY(${px(-on * 12 * K.u)})`; });
    } };
  };
})();
