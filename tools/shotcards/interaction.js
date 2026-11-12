// Shotcards B, interaction: 7 video-shotcraft cards (11 helpers) as pure functions of t (ideas and tuned numbers only; the code is ours).
// Loaded after tools/engine.js (pvk: ../../../tools/shotcards/interaction.js; HyperFrames: kit/shotcards/interaction.js).
// KIT.shotcards.<name>({ parent = KIT.stage, box = KIT.safe, at = 0, dur, ... }) → { el, end, set(t) }. DOM is built once; set(t) only
// writes styles from t (no clocks, no Math.random: seeded rng at build, no state between calls). Build after fonts and layout.
//   panelToCanvas / diagramCascade        canvas materialize moves
//   themeSwitch                           'sweep' (toggle, then a diagonal wipe) and 'ripple' (palette swatch, then a circular reveal) that swap --kit-* vars
//   voiceWaveform                         bars driven by a 30 fps audio envelope (tools/shotcards/envelope.mjs writes it)
//   collabCursors                         labelled multi-cursor ensemble with dotted trails
//   pickerCarousel                        a picker whose highlight moves while a feature carousel cycles with it
//   segmentedThumb                        a segmented control with a spring thumb driving a hero panel
//   typeAndFilter                         a search box typing while a list filters per character
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('shotcards/interaction.js: load tools/engine.js first');
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
  const card = (parent, w, h, css) => mk(parent, Object.assign({ width: px(w), height: px(h), background: 'var(--kit-surface)', borderRadius: 'var(--kit-radius)', boxSizing: 'border-box', border: `${Math.max(1, 2 * K.u)}px solid rgba(255,255,255,.1)` }, css));
  const COLORS = ['#6ee7b7', '#93c5fd', '#fca5a5', '#fcd34d', '#c4b5fd', '#f9a8d4'];
  const ring = (i, r, n) => { const d = (((i - r) % n) + n) % n; return d > n / 2 ? d - n : d; };
  const reelPos = (t, at, every, move, ease, last) => { const j = Math.floor((t - at) / every); return j < 0 ? 0 : j >= last ? last : j + ease(K.seg(t - at - j * every, every - move, every)); };

  // ── panelToCanvas: a card panel at `from` (rect, default a small card) grows to fill the `box` (the canvas), its corners squaring off,
  // while a dot grid materialises across the canvas from the centre outwards and the panel's title fades into a canvas label.
  S.panelToCanvas = (o) => {
    const a = area(o), from = o.from ?? { x: K.W_ / 2 - 150 * K.u, y: K.H_ / 2 - 100 * K.u, w: 300 * K.u, h: 200 * K.u }, at = o.at ?? 0, dur = o.dur ?? K.dur(1), root = wrap(o.parent), ease = ez(o.ease ?? 'power3.inOut'), g = o.grid ?? 36 * K.u;
    const canvas = mk(root, { left: px(a.x), top: px(a.y), width: px(a.w), height: px(a.h), borderRadius: 'var(--kit-radius)', overflow: 'hidden' }), dots = mk(canvas, { left: 0, top: 0, width: '100%', height: '100%', backgroundImage: 'radial-gradient(var(--kit-muted) 1.5px, transparent 2px)', backgroundSize: `${px(g)} ${px(g)}` });
    const panel = card(root, from.w, from.h, { left: 0, top: 0, padding: px(from.h * 0.1), boxShadow: 'var(--kit-shadow)' }), title = mk(panel, txt(from.h * 0.14, { left: px(from.h * 0.1), top: px(from.h * 0.1) }), esc(o.title ?? 'Untitled'));
    const cap = mk(root, txt(26 * K.u, { left: px(a.x + 24 * K.u), top: px(a.y + 20 * K.u), color: 'var(--kit-muted)' }), esc(o.title ?? 'Untitled'));
    return { el: root, end: at + dur + K.dur(0.5), set(t) {
      const p = ease(K.seg(t, at, at + dur)), q = K.seg(t, at + dur * 0.4, at + dur + K.dur(0.5));
      panel.style.width = px(K.lerp(from.w, a.w, p)); panel.style.height = px(K.lerp(from.h, a.h, p)); panel.style.transform = `translate(${px(K.lerp(from.x, a.x, p))},${px(K.lerp(from.y, a.y, p))})`; panel.style.borderRadius = p > 0.98 ? '0px' : px(K.lerp(14 * K.u, 2 * K.u, p));
      panel.style.background = `color-mix(in srgb, var(--kit-surface) ${n3(100 * (1 - K.seg(p, 0.5, 1)))}%, transparent)`; panel.style.borderColor = p > 0.9 ? 'transparent' : 'rgba(255,255,255,.1)'; panel.style.boxShadow = p > 0.5 ? 'none' : 'var(--kit-shadow)'; title.style.opacity = n3(1 - K.seg(p, 0.1, 0.4));
      const m = `radial-gradient(circle ${px(Math.max(1, q * Math.hypot(a.w, a.h) * 0.6))} at 50% 50%, #000 40%, transparent 100%)`; dots.style.maskImage = dots.style.webkitMaskImage = m; dots.style.opacity = n3(q); cap.style.opacity = n3(K.seg(q, 0.4, 1));
    } };
  };
  // diagramCascade: nodes = [{ label, x, y }] (fractions of the box) and edges = [[from, to], …]. Node 0 appears first; every edge then draws
  // out of its source and the node it leads to pops when the edge arrives, so the diagram cascades outwards (arrival = parent + hop).
  S.diagramCascade = (o) => {
    const a = area(o), N = o.nodes ?? [{ label: 'Input', x: 0.5, y: 0.1 }, { label: 'Parse', x: 0.25, y: 0.4 }, { label: 'Plan', x: 0.75, y: 0.4 }, { label: 'Render', x: 0.15, y: 0.8 }, { label: 'Encode', x: 0.5, y: 0.8 }, { label: 'Ship', x: 0.85, y: 0.8 }];
    const E = o.edges ?? [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5]], at = o.at ?? 0, hop = o.hop ?? K.dur(0.45), root = wrap(o.parent), sv = svgBox(root), w = 150 * K.u, h = 56 * K.u, pop = K.easing('back.out(2)');
    const arr = N.map(() => Infinity); arr[0] = at; for (let k = 0; k < N.length; k++) for (const [f, to] of E) if (arr[f] + hop < arr[to]) arr[to] = arr[f] + hop;
    const P = (i) => ({ x: a.x + a.w * N[i].x, y: a.y + a.h * N[i].y });
    const sg = (t, a, b) => (Number.isFinite(a) ? K.seg(t, a, b) : 0);   // a node no edge leads to never appears
    const edges = E.map(([f, to]) => ({ line: se(sv, 'line', { x1: P(f).x, y1: P(f).y, x2: P(to).x, y2: P(to).y, stroke: 'var(--kit-muted)', 'stroke-width': Math.max(2, 3 * K.u), pathLength: 1, 'stroke-dasharray': '1 1' }), s: arr[f] + hop * 0.1, e: arr[to] }));
    const nodes = N.map((nd, i) => ({ e: card(root, w, h, txt(h * 0.36, { left: px(P(i).x - w / 2), top: px(P(i).y - h / 2), textAlign: 'center', lineHeight: px(h), borderColor: COLORS[i % 6] }), 0), a: arr[i] })); nodes.forEach((n, i) => { n.e.innerHTML = esc(N[i].label); });
    return { el: root, end: Math.max(...arr.filter(Number.isFinite)) + 0.5, arrivals: arr, set(t) {
      edges.forEach((e) => e.line.setAttribute('stroke-dashoffset', n3(1 - K.E.out(sg(t, e.s, e.e)))));
      nodes.forEach((n) => { const s = pop(sg(t, n.a, n.a + 0.3)); n.e.style.transform = `scale(${n3(s)})`; n.e.style.opacity = s > 0 ? 1 : 0; });
    } };
  };

  // ── themeSwitch: the film's own scene is built twice, by build(parent) → { set(t)? }: once in `base`, once in `alt` with `theme` ({ '--kit-bg':
  // '#fff', … }) set on it, so everything using var(--kit-*) re-colours there. alt is revealed over base from `from` = { x, y } (stage px):
  // kind 'ripple' grows a circle (a palette swatch row at `from` shows the pick first: palette = [colours], pick = index); kind 'sweep'
  // slides a diagonal wipe after a toggle switch at `from` flips. build's set(t) (if any) is called for both copies.
  S.themeSwitch = (o) => {
    const kind = o.kind ?? 'sweep', at = o.at ?? 0, dur = o.dur ?? K.dur(0.9), root = wrap(o.parent), from = o.from ?? { x: K.W_ * 0.9, y: K.H_ * 0.1 }, lead = o.lead ?? K.dur(0.5), ease = ez(o.ease ?? 'power2.inOut');
    const layer = () => mk(root, { left: 0, top: 0, width: K.W_ + 'px', height: K.H_ + 'px', overflow: 'hidden' }), base = layer(), alt = layer();
    for (const k in (o.theme ?? {})) alt.style.setProperty(k, o.theme[k]);
    alt.style.background = 'var(--kit-bg)'; base.style.background = 'var(--kit-bg)';
    const A = o.build(base) || {}, B = o.build(alt) || {}, tS = at + lead, far = Math.max(Math.hypot(from.x, from.y), Math.hypot(K.W_ - from.x, from.y), Math.hypot(from.x, K.H_ - from.y), Math.hypot(K.W_ - from.x, K.H_ - from.y));
    const ui = mk(root, { left: 0, top: 0 });
    let thumb = null, sw = [];
    if (kind === 'sweep') { const tw = 120 * K.u, th = 60 * K.u, tr = mk(ui, { left: px(from.x - tw / 2), top: px(from.y - th / 2), width: px(tw), height: px(th), borderRadius: px(th / 2), background: 'var(--kit-muted)' }); thumb = mk(tr, { left: px(5 * K.u), top: px(5 * K.u), width: px(th - 10 * K.u), height: px(th - 10 * K.u), borderRadius: '50%', background: '#fff' }); thumb.travel = tw - th; ui.tr = tr; }
    else sw = (o.palette ?? COLORS.slice(0, 4)).map((c, i, arr) => mk(ui, { left: px(from.x + (i - (arr.length - 1) / 2) * 56 * K.u - 20 * K.u), top: px(from.y - 20 * K.u), width: px(40 * K.u), height: px(40 * K.u), borderRadius: '50%', background: c, border: `${Math.max(2, 3 * K.u)}px solid transparent`, boxSizing: 'border-box' }));
    const pick = o.pick ?? 1, ctr = sw[pick] ? { x: from.x + (pick - (sw.length - 1) / 2) * 56 * K.u, y: from.y } : from;
    return { el: root, base, alt, end: tS + dur + 0.3, set(t) {
      A.set && A.set(t); B.set && B.set(t); const p = ease(K.seg(t, tS, tS + dur));
      if (kind === 'ripple') { const r = (p * far * 1.05); alt.style.clipPath = `circle(${px(r)} at ${px(ctr.x)} ${px(ctr.y)})`; sw.forEach((e, i) => { const on = i === pick ? K.seg(t, at, at + lead) : 0; e.style.transform = `scale(${n3(1 + 0.45 * on)})`; e.style.borderColor = on > 0.5 ? '#fff' : 'transparent'; }); }
      else { alt.style.clipPath = `polygon(0 0, ${n3(130 * p)}% 0, ${n3(130 * p - 30)}% 100%, 0 100%)`; thumb.style.transform = `translateX(${px(thumb.travel * K.E.out(K.seg(t, at, tS)))})`; ui.tr.style.background = K.seg(t, at, tS) > 0.5 ? 'var(--kit-accent)' : 'var(--kit-muted)'; }
      ui.style.opacity = n3(1 - K.seg(t, tS + dur, tS + dur + 0.3));
    } };
  };

  // ── voiceWaveform: env = a 30 fps loudness envelope (0..1) as an array, or { fps, rms } (what tools/shotcards/envelope.mjs prints).
  // mode 'mirror' (default): bars radiate from the centre, the middle bar is "now" and the bars outwards show the recent past;
  // 'history': one scrolling strip, newest at the right. Heights smooth between samples. S.voiceWaveform.synth(seed, seconds) makes a
  // speech-like envelope for demos or music-only films.
  S.voiceWaveform = (o) => {
    const e = o.env, rms = Array.isArray(e) ? e : e.rms, fps = Array.isArray(e) ? (o.fps ?? 30) : (e.fps ?? 30), a = area(o), n = o.bars ?? 41, at = o.at ?? 0, lag = o.lag ?? 1 / fps, root = wrap(o.parent), mode = o.mode ?? 'mirror';
    const w = o.w ?? Math.min(a.w, 900 * K.u), H = o.h ?? a.h * 0.5, bw = (w / n) * 0.62, X = o.x ?? K.W_ / 2, Y = o.y ?? K.H_ / 2, col = o.color ?? 'var(--kit-accent)';
    const samp = (t) => { const f = t * fps, i = Math.floor(f), q = f - i, g = (k) => (k < 0 || k >= rms.length ? 0 : rms[k]); return g(i) * (1 - q) + g(i + 1) * q; };
    const bars = Array.from({ length: n }, (_, i) => mk(root, { left: px(X - w / 2 + (w / n) * (i + 0.19)), width: px(bw), background: col, borderRadius: px(bw / 2) }));
    return { el: root, end: at + rms.length / fps, level: (t) => samp(t - at), set(t) { bars.forEach((b, i) => { const k = mode === 'mirror' ? Math.abs(i - (n - 1) / 2) : n - 1 - i, v = samp(t - at - k * lag * 3) * (mode === 'mirror' ? 1 - 0.4 * (k / (n / 2)) : 1), h = Math.max(bw, v * H);
      b.style.top = px(Y - h / 2); b.style.height = px(h); b.style.opacity = n3(0.35 + 0.65 * K.clamp(v * 1.5)); }); } };
  };
  // a speech-like envelope: syllable bursts (about 4/s) inside phrases with pauses; closed form in the array it returns
  S.voiceWaveform.synth = (seed = 1, seconds = 4, fps = 30) => { const r = rng(seed), out = [], ph = Array.from({ length: Math.ceil(seconds * 3) }, () => [r(), r()]); for (let i = 0; i < seconds * fps; i++) { const t = i / fps, phr = Math.floor(t / 1.1), inP = ((t % 1.1) / 1.1) < 0.78 ? 1 : 0.04, syl = 0.5 + 0.5 * Math.sin(2 * Math.PI * (3.8 + ph[phr % ph.length][0]) * t + ph[phr % ph.length][1] * 6.28); out.push(+(inP * (0.15 + 0.85 * Math.pow(syl, 1.5)) * (0.6 + 0.4 * ph[phr % ph.length][0])).toFixed(3)); } return out; };

  // ── collabCursors: cursors = [{ name, color, pts: [[t, x, y], …] }] fly between their waypoints (inOut per leg, resting between), each
  // with a name flag and `trail` dots following on its own recent path; a click ring pops at every waypoint of a cursor that has click: true.
  S.collabCursors = (o) => {
    const C = o.cursors, trail = o.trail ?? 6, root = wrap(o.parent), ease = K.easing('power2.inOut'), at = o.at ?? 0, size = 26 * K.u;
    const pos = (c, t) => { const P = c.pts; if (t <= P[0][0]) return { x: P[0][1], y: P[0][2] }; for (let i = 1; i < P.length; i++) if (t < P[i][0]) { const p = ease(K.seg(t, P[i - 1][0], P[i][0])); return { x: K.lerp(P[i - 1][1], P[i][1], p), y: K.lerp(P[i - 1][2], P[i][2], p) }; } const l = P[P.length - 1]; return { x: l[1], y: l[2] }; };
    const items = C.map((c, i) => { const col = c.color ?? COLORS[i % 6], g = mk(root, { left: 0, top: 0, width: px(size), height: px(size) });
      g.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="position:absolute;left:0;top:0"><path d="M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.6 L11 13.2 L18 13 Z" fill="${col}" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
      const flag = mk(g, txt(18 * K.u, { left: px(size * 0.7), top: px(size * 0.9), padding: `${px(4 * K.u)} ${px(10 * K.u)}`, borderRadius: px(12 * K.u), background: col, color: '#0f1115', fontWeight: 700 }), esc(c.name ?? ''));
      const dots = Array.from({ length: trail }, () => mk(root, { width: px(8 * K.u), height: px(8 * K.u), borderRadius: '50%', background: col })), rings = c.click ? c.pts.map(() => mk(root, { width: px(2), height: px(2), borderRadius: '50%', border: `${Math.max(2, 3 * K.u)}px solid ${col}` })) : [];
      return { c, g, flag, dots, rings, col }; });
    const lag = o.lag ?? 0.045;
    return { el: root, end: Math.max(...C.map((c) => c.pts[c.pts.length - 1][0])) + 0.4, pos, set(t) { for (const it of items) {
      const p = pos(it.c, t); it.g.style.transform = `translate(${px(p.x)},${px(p.y)})`;
      it.dots.forEach((d, k) => { const q = pos(it.c, t - (k + 1) * lag), moving = Math.hypot(q.x - p.x, q.y - p.y) > 1; d.style.transform = `translate(${px(q.x - 4 * K.u)},${px(q.y - 4 * K.u)})`; d.style.opacity = n3(moving ? 0.7 * (1 - k / trail) : 0); });
      it.rings.forEach((r, k) => { const s = it.c.pts[k][0], q = K.seg(t, s, s + 0.4), rad = 8 + 40 * K.E.out(q) * K.u; K.css(r, { left: px(it.c.pts[k][1]), top: px(it.c.pts[k][2]), width: px(2 * rad), height: px(2 * rad), marginLeft: px(-rad), marginTop: px(-rad), opacity: n3(t >= s && k > 0 ? 1 - q : 0) }); }); } } };
  };

  // ── pickerCarousel: options = [label] as chips in a row; a highlight pill moves to the next option every `every` seconds (spring) and the
  // content card (contents = [{ title, body, color }]) cycles in step: the old card slides out, the new one in. Loops by default.
  S.pickerCarousel = (o) => {
    const O = o.options, n = O.length, a = area(o), at = o.at ?? 0, every = o.every ?? K.dur(1.3), move = Math.min(o.move ?? K.dur(0.5), every), ease = ez(o.ease ?? 'back.out(1.2)'), root = wrap(o.parent), last = o.loop === false ? n - 1 : Infinity;
    const C = o.contents ?? O.map((l, i) => ({ title: l, body: 'Feature ' + (i + 1), color: COLORS[i % 6] })), cw = Math.min(a.w, 700 * K.u), ch = a.h * 0.5, X = K.W_ / 2, chipW = Math.min(150 * K.u, cw / n), chipH = 54 * K.u, py = a.y + a.h * 0.08;
    const pill = mk(root, { top: px(py), width: px(chipW), height: px(chipH), borderRadius: px(chipH / 2), background: 'var(--kit-accent)' });
    const chips = O.map((l, i) => mk(root, txt(chipH * 0.38, { left: px(X - (n * chipW) / 2 + i * chipW), width: px(chipW), top: px(py), height: px(chipH), textAlign: 'center', lineHeight: px(chipH) }), esc(l)));
    const cards = C.map((c) => { const e = card(root, cw, ch, { left: px(X - cw / 2), top: px(a.y + a.h * 0.28), overflow: 'hidden', background: `linear-gradient(135deg, var(--kit-surface), ${c.color}44)` }); e.innerHTML = `<div style="padding:${ch * 0.1}px"><div style="font:800 ${ch * 0.16}px var(--kit-font-display);color:var(--kit-ink)">${esc(c.title)}</div><div style="margin-top:${ch * 0.05}px;font:500 ${ch * 0.09}px var(--kit-font-text);color:var(--kit-muted);white-space:normal">${esc(c.body ?? '')}</div></div>`; return e; });
    return { el: root, end: at + n * every, set(t) {
      const r = reelPos(t, at, every, move, ease, last);
      const j = Math.floor(r), pp = K.lerp(j % n, (j + 1) % n, r - j);   // a loop's last step sweeps back to the first chip
      pill.style.transform = `translateX(${px(X - (n * chipW) / 2 + pp * chipW)})`;
      chips.forEach((c, i) => { c.style.color = Math.abs(ring(i, r, n)) < 0.5 ? 'var(--kit-on-accent)' : 'var(--kit-ink)'; });
      cards.forEach((c, i) => { const d = ring(i, r, n); c.style.opacity = n3(Math.max(0, 1 - Math.abs(d) * 1.2)); c.style.transform = `translateX(${px(d * cw * 0.7)}) scale(${n3(1 - 0.08 * Math.min(1, Math.abs(d)))})`; });
    } };
  };

  // ── segmentedThumb: a segmented control (segments = [label]) whose thumb springs to the selection in sel = [[t, index], …] (starts on
  // index 0); a hero panel below shows the selected segment's content (heroes = [{ title, color }]) with a slide and fade on each change.
  S.segmentedThumb = (o) => {
    const Sg = o.segments, n = Sg.length, a = area(o), sel = o.sel ?? Sg.map((_, i) => [(o.at ?? 0) + K.dur(0.6) + i * K.dur(1.1), i]).slice(1), root = wrap(o.parent), X = K.W_ / 2, w = Math.min(a.w, 640 * K.u), h = 70 * K.u, sw = w / n, Y = a.y + a.h * 0.15;
    const sp = K.spring({ mass: 1, damping: 13, stiffness: 240 }), H = o.heroes ?? Sg.map((s, i) => ({ title: s, color: COLORS[i % 6] }));
    const track = mk(root, { left: px(X - w / 2), top: px(Y), width: px(w), height: px(h), borderRadius: px(h / 2), background: 'var(--kit-surface)' }), thumb = mk(root, { top: px(Y + 5 * K.u), width: px(sw - 10 * K.u), height: px(h - 10 * K.u), borderRadius: px(h / 2), background: 'var(--kit-accent)' });
    const labs = Sg.map((s, i) => mk(root, txt(h * 0.36, { left: px(X - w / 2 + i * sw), width: px(sw), top: px(Y), height: px(h), textAlign: 'center', lineHeight: px(h) }), esc(s)));
    const hh = a.h * 0.55, hero = H.map((c) => { const e = card(root, w, hh, txt(hh * 0.18, { left: px(X - w / 2), top: px(a.y + a.h * 0.15 + h + 40 * K.u), textAlign: 'center', lineHeight: px(hh), fontWeight: 800, background: `linear-gradient(135deg, ${c.color}, var(--kit-surface))` })); e.innerHTML = esc(c.title); return e; });
    const pos = (t) => { let from = 0, p = 0; for (const [ts, idx] of sel) { if (t < ts) break; p = K.lerp(from, idx, sp((t - ts) * 2.2)); from = idx; } return p; };
    const sel_prev = (ts) => { let q = 0; for (const [s, idx] of sel) { if (s >= ts) break; q = idx; } return q; };
    const cur = (t) => { let c = 0, ts = -1; for (const [s, idx] of sel) if (t >= s) { c = idx; ts = s; } return { c, ts }; };
    return { el: root, end: (sel.length ? sel[sel.length - 1][0] : 0) + 1, pos, set(t) {
      const p = pos(t); thumb.style.transform = `translateX(${px(X - w / 2 + 5 * K.u + p * sw)})`; const { c, ts } = cur(t);
      labs.forEach((l, i) => { l.style.color = i === c ? 'var(--kit-on-accent)' : 'var(--kit-ink)'; });
      hero.forEach((e, i) => { const prev = ts < 0 ? -1 : sel_prev(ts), enter = ts < 0 ? 1 : K.E.out(K.seg(t, ts, ts + 0.45)), on = i === c ? enter : i === prev ? 1 - enter : 0;
        e.style.opacity = n3(on); e.style.transform = `translateX(${px(i === c ? (1 - enter) * 80 * K.u : i === prev ? -enter * 80 * K.u : 0)}) scale(${n3(0.96 + 0.04 * on)})`; });
    } };
  };

  // ── typeAndFilter: a search box types `query` (cps characters a second, from `at`); a list of rows = [text] filters as it goes: a row
  // that stops matching the typed prefix (case-insensitive substring) collapses and fades the moment that character lands, and the
  // matching letters of the rows that stay are highlighted. Closed form: each row's hide time is the time of the first char that breaks it.
  S.typeAndFilter = (o) => {
    const R = o.rows, q = o.query, at = o.at ?? 0, cps = o.cps ?? 7, a = area(o), w = o.w ?? Math.min(a.w, 620 * K.u), h = o.rowH ?? 64 * K.u, gap = 8 * K.u, X = K.W_ / 2, root = wrap(o.parent), Y = a.y + a.h * 0.1, fh = 66 * K.u;
    const tc = (k) => at + k / cps, hide = R.map((r) => { for (let k = 1; k <= q.length; k++) if (!r.toLowerCase().includes(q.slice(0, k).toLowerCase())) return tc(k - 1); return Infinity; });
    const box = card(root, w, fh, { left: px(X - w / 2), top: px(Y), background: 'var(--kit-bg)', borderColor: 'var(--kit-accent)' }), field = mk(box, txt(fh * 0.4, { left: px(fh * 0.4), top: 0, lineHeight: px(fh), fontFamily: 'var(--kit-font-mono)' })), caret = mk(box, { top: px(fh * 0.22), width: px(Math.max(2, 3 * K.u)), height: px(fh * 0.56), background: 'var(--kit-accent)' });
    const rows = R.map((r) => { const e = card(root, w, h, txt(h * 0.36, { left: px(X - w / 2), lineHeight: px(h), padding: `0 ${px(h * 0.4)}`, overflow: 'hidden' })); e.innerHTML = esc(r); return { e, r }; });
    const mw = (s) => s.length * fh * 0.4 * 0.6;
    return { el: root, end: at + q.length / cps + 0.6, hideTimes: hide, set(t) {
      const typed = t < at ? '' : q.slice(0, Math.min(q.length, Math.floor((t - at) * cps) + 1));
      field.textContent = typed; caret.style.left = px(fh * 0.4 + mw(typed) + 4 * K.u); caret.style.opacity = Math.floor((t - at) * 2) % 2 && typed.length === q.length ? 0 : 1;
      let y = Y + fh + 16 * K.u;
      rows.forEach((x, i) => { const p = Number.isFinite(hide[i]) ? K.easing('power2.inOut')(K.seg(t, hide[i], hide[i] + K.dur(0.3))) : 0, vis = 1 - p, hh = h * vis, ent = K.E.out(K.seg(t, at - 0.3 + i * 0.04, at + 0.2 + i * 0.04));
        x.e.style.top = px(y); x.e.style.height = px(Math.max(0, hh)); x.e.style.opacity = n3(vis * ent); x.e.style.visibility = hh < 1 ? 'hidden' : 'visible'; x.e.style.lineHeight = px(h); y += (hh + gap * vis) * 1;
        if (typed && vis > 0.5) { const j = x.r.toLowerCase().indexOf(typed.toLowerCase()); x.e.innerHTML = j < 0 ? esc(x.r) : `${esc(x.r.slice(0, j))}<span style="color:var(--kit-accent)">${esc(x.r.slice(j, j + typed.length))}</span>${esc(x.r.slice(j + typed.length))}`; } else x.e.textContent = x.r; });
    } };
  };
})();
