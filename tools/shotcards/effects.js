// Shotcards B, effects: 14 video-shotcraft cards (24 helpers) as pure functions of t (ideas and tuned numbers only; the code is ours).
// Loaded after tools/engine.js (pvk: ../../../tools/shotcards/effects.js; HyperFrames: kit/shotcards/effects.js).
// KIT.shotcards.<name>({ parent = KIT.stage, box = KIT.safe, at = 0, dur, ... }) → { el, end, set(t) }. DOM is built once; set(t) only
// writes styles from t (no clocks, no Math.random: seeded rng at build, no state between calls). Colours given by the caller are hex.
//   assembleThenTypeFlyin   skeleton blocks fly together into a panel, then a headline types in with 3D per-letter fly-in
//   risoPrintHits           multiply-blended ink layers that misregister on each hit
//   scanlineAssembleFlyin   a scanline sweeps; each item flies in as the line reaches it
//   auroraBloomBgFlip       aurora background; a bloom flips the palette
//   fuiHud                  corner brackets, flickering readouts, a reticle that locks on
//   glowOrbAmbient / flylineArc / orbFlylineRelay   glow orbs and fly-lines
//   attentionBounce / iconMorph                      icon performance
//   hitCounter / animeImpact                         impact feedback
//   spotlightSweep / sheenSweep                      light play
//   radialRipplePhoneChips  chips radiate from a phone on ripple rings
//   scanBracketSweep        a scan band sweeping a bracketed subject
//   scanlineAnnotateFocus   scanline pass, then focus, connector and callout
//   kanadaPerspectiveSnap / scoreSlam / impactBurst  slam entrances
//   glowWakeSleepPanel / slideSpotlightPan / cornerSpotlightReveal   spotlight moves
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('shotcards/effects.js: load tools/engine.js first');
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
  const txt = (size, extra) => Object.assign({ fontFamily: 'var(--kit-font-display)', fontWeight: 'var(--kit-display-weight)', fontSize: size + 'px', color: 'var(--kit-ink)', whiteSpace: 'nowrap', lineHeight: 1.1 }, extra);
  const card = (parent, w, h, css) => mk(parent, Object.assign({ width: px(w), height: px(h), background: 'var(--kit-surface)', borderRadius: 'var(--kit-radius)', boxSizing: 'border-box', border: `${Math.max(1, 2 * K.u)}px solid rgba(255,255,255,.1)` }, css));
  const COLORS = ['#6ee7b7', '#93c5fd', '#fca5a5', '#fcd34d', '#c4b5fd', '#f9a8d4'];
  const rgb = (c) => [1, 3, 5].map((i) => parseInt(String(c).replace('#', '').padEnd(6, '0').slice(i - 1, i + 1), 16));
  const mixc = (a, b, p) => `rgb(${rgb(a).map((v, i) => Math.round(K.lerp(v, rgb(b)[i], K.clamp(p)))).join(',')})`;
  const decay = (t, t0, k) => (t < t0 ? 0 : Math.exp(-(t - t0) * k));
  const bump = (t, t0, k, f) => (t < t0 ? 0 : Math.exp(-(t - t0) * k) * Math.cos((t - t0) * f));   // decaying oscillation: 1 → 0
  const quad = (a, c, b, p) => ({ x: (1 - p) * (1 - p) * a.x + 2 * (1 - p) * p * c.x + p * p * b.x, y: (1 - p) * (1 - p) * a.y + 2 * (1 - p) * p * c.y + p * p * b.y });
  const arcCtl = (a, b, h) => ({ x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - h });

  // ── assembleThenTypeFlyin: `bars` skeleton blocks (rows of different widths) fly in from seeded offsets and assemble into a panel
  // (K.staggerStep apart); then `text` types in above it, each letter flying from depth (rotateX and translateZ) in perspective.
  S.assembleThenTypeFlyin = (o) => {
    const a = area(o), w = o.w ?? Math.min(a.w, 640 * K.u), h = o.h ?? 320 * K.u, X = o.x ?? K.W_ / 2, Y = o.y ?? K.H_ / 2 + 40 * K.u, n = o.bars ?? 5, at = o.at ?? 0, per = o.per ?? K.dur(0.6), r = rng(o.seed ?? 14), ease = ez(o.ease ?? 'power3.out');
    const root = wrap(o.parent), panel = card(root, w, h, { left: px(X - w / 2), top: px(Y - h / 2) });
    const bars = Array.from({ length: n }, (_, i) => ({ e: mk(panel, { left: px(w * 0.06), top: px(h * 0.1 + i * (h * 0.8) / n), width: px(w * (i % 2 ? 0.6 : 0.88)), height: px((h * 0.8) / n * 0.62), borderRadius: px(8 * K.u), background: i === 0 ? 'var(--kit-accent)' : 'rgba(255,255,255,.14)' }), dx: (r() - 0.5) * K.W_, dy: (r() > 0.5 ? 1 : -1) * (0.3 + r() * 0.4) * K.H_, rot: (r() - 0.5) * 80 }));
    const tAs = at + (n - 1) * K.staggerStep + per, size = o.size ?? 64 * K.u, head = mk(root, txt(size, { left: px(X - w / 2), width: px(w), top: px(Y - h / 2 - size * 1.5), textAlign: 'center', perspective: px(size * 8), whiteSpace: 'pre' }));
    const ch = [...(o.text ?? 'Assembled')].map((c) => { const e = K.el('span', '', head, esc(c)); e.style.display = 'inline-block'; return e; });
    const st = o.stagger ?? K.dur(0.05), fly = o.fly ?? K.dur(0.5), out = K.easing('back.out(1.2)');
    return { el: root, end: tAs + ch.length * st + fly, set(t) {
      bars.forEach((b, i) => { const p = ease(K.seg(t, at + i * K.staggerStep, at + i * K.staggerStep + per)); b.e.style.opacity = n3(K.seg(p, 0, 0.3)); b.e.style.transform = `translate(${px(b.dx * (1 - p))},${px(b.dy * (1 - p))}) rotate(${n3(b.rot * (1 - p))}deg)`; });
      panel.style.opacity = n3(K.seg(t, at, at + per * 0.8));
      ch.forEach((e, i) => { const p = K.seg(t, tAs + i * st, tAs + i * st + fly), q = out(p); e.style.opacity = n3(K.seg(p, 0, 0.2)); e.style.transform = `translateZ(${px((1 - q) * -size * 6)}) rotateX(${n3((1 - q) * -80)}deg)`; });
    } };
  };

  // ── risoPrintHits: `text` printed as `inks` (default two) stacked copies in multiply blend on a paper ground; at rest each copy sits a
  // pixel or two off register (seeded); on every hit time (hits = [s…]) every copy is thrown a seeded distance and settles with a decaying wobble.
  S.risoPrintHits = (o) => {
    const inks = o.inks ?? ['#ff4fa3', '#00b2ff'], hits = o.hits ?? [0.3, 1.1, 1.9], size = o.size ?? 200 * K.u, r = rng(o.seed ?? 31), root = wrap(o.parent), X = o.x ?? K.W_ / 2, Y = o.y ?? K.H_ / 2;
    const paper = mk(root, { left: 0, top: 0, width: K.W_ + 'px', height: K.H_ + 'px', background: o.paper ?? '#f3efe4', isolation: 'isolate' });
    const rest = inks.map(() => [(r() - 0.5) * 6 * K.u, (r() - 0.5) * 6 * K.u]), thr = hits.map(() => inks.map(() => [(r() - 0.5) * 40 * K.u, (r() - 0.5) * 40 * K.u, (r() - 0.5) * 6]));
    const L = inks.map((c) => mk(paper, txt(size, { left: px(X), top: px(Y), color: c, mixBlendMode: 'multiply', fontWeight: 900 }), esc(o.text ?? 'PRINT')));
    return { el: root, end: Math.max(...hits) + 1, set(t) { L.forEach((e, i) => {
      let x = rest[i][0], y = rest[i][1], rot = 0; hits.forEach((h, k) => { const b = bump(t, h, 7, 26) * (t >= h ? 1 : 0); x += thr[k][i][0] * b; y += thr[k][i][1] * b; rot += thr[k][i][2] * b; });
      e.style.transform = `translate(-50%,-50%) translate(${px(x)},${px(y)}) rotate(${n3(rot)}deg)`; }); } };
  };

  // ── scanlineAssembleFlyin: items = [text | { text, color }] laid out on a grid; a glowing scanline sweeps from the top down; each item
  // flies in (from the side, blurred) as the line reaches its row, so the layout assembles in the order the line passes.
  S.scanlineAssembleFlyin = (o) => {
    const I = o.items, n = I.length, a = area(o), cols = o.cols ?? Math.ceil(Math.sqrt(n * 1.6)), rows = Math.ceil(n / cols), at = o.at ?? 0, dur = o.dur ?? K.dur(2), gap = 16 * K.u, cw = (a.w - gap * (cols - 1)) / cols, ch = Math.min((a.h - gap * (rows - 1)) / rows, cw * 0.7), root = wrap(o.parent), fly = o.fly ?? K.dur(0.5), ease = ez(o.ease ?? 'power3.out');
    const y0 = a.y + (a.h - (rows * ch + (rows - 1) * gap)) / 2, tot = rows * ch + (rows - 1) * gap;
    const els = I.map((it, i) => { const c = i % cols, rr = Math.floor(i / cols), e = card(root, cw, ch, txt(ch * 0.22, { left: px(a.x + c * (cw + gap)), top: px(y0 + rr * (ch + gap)), textAlign: 'center', lineHeight: px(ch), background: `linear-gradient(135deg, var(--kit-surface), ${(it.color ?? COLORS[i % 6])}33)` })); e.innerHTML = esc(it.text ?? it); return { e, a: at + (((rr + 0.5) * (ch + gap)) / tot) * dur, side: (c % 2 ? 1 : -1) }; });
    const line = mk(root, { left: px(a.x), width: px(a.w), height: px(Math.max(3, 4 * K.u)), background: 'var(--kit-accent)', boxShadow: `0 0 ${24 * K.u}px var(--kit-accent)` });
    return { el: root, end: at + dur + fly, set(t) {
      const p = K.seg(t, at, at + dur); line.style.top = px(y0 - 10 * K.u + (tot + 20 * K.u) * p); line.style.opacity = n3(t >= at && t <= at + dur ? 1 : 0);
      for (const it of els) { const q = ease(K.seg(t, it.a, it.a + fly)); it.e.style.opacity = n3(K.seg(q, 0, 0.4)); it.e.style.filter = q < 1 ? `blur(${n3((1 - q) * 10)}px)` : 'none'; it.e.style.transform = `translateX(${px(it.side * (1 - q) * 140 * K.u)})`; }
    } };
  };

  // ── auroraBloomBgFlip: a full-frame background of three blurred colour blobs drifting on sines; at `flipAt` a bloom (a white radial
  // burst) peaks and the palette flips (palettes = [[c1, c2, c3], [d1, d2, d3]], hex) under it. Put your content above `el`.
  S.auroraBloomBgFlip = (o) => {
    const P = o.palettes ?? [['#1e3a8a', '#6d28d9', '#0ea5e9'], ['#9a3412', '#db2777', '#f59e0b']], at = o.at ?? 0, flipAt = o.flipAt ?? at + K.dur(1.5), bloom = o.bloom ?? K.dur(0.8), root = mk(o.parent, { left: 0, top: 0, width: K.W_ + 'px', height: K.H_ + 'px', overflow: 'hidden', background: '#05060a' });
    const S_ = Math.max(K.W_, K.H_), blobs = [0, 1, 2].map((i) => mk(root, { width: px(S_ * 0.7), height: px(S_ * 0.7), borderRadius: '50%', filter: `blur(${S_ * 0.08}px)`, opacity: 0.85 })), glow = mk(root, { left: px(K.W_ / 2 - S_ * 0.4), top: px(K.H_ / 2 - S_ * 0.4), width: px(S_ * 0.8), height: px(S_ * 0.8), borderRadius: '50%', background: 'radial-gradient(#fff, rgba(255,255,255,0) 65%)' });
    return { el: root, end: flipAt + bloom, set(t) {
      const f = K.E.inOut(K.seg(t, flipAt - bloom * 0.1, flipAt + bloom * 0.5)), b = Math.sin(Math.PI * K.seg(t, flipAt - bloom * 0.5, flipAt + bloom * 0.7));
      blobs.forEach((e, i) => { const w = 0.35 + i * 0.13, x = K.W_ * (0.2 + 0.3 * i) + Math.sin(t * w + i * 2) * K.W_ * 0.15, y = K.H_ * (0.3 + 0.2 * i) + Math.cos(t * w * 1.3 + i) * K.H_ * 0.15;
        e.style.transform = `translate(${px(x - S_ * 0.35)},${px(y - S_ * 0.35)}) scale(${n3(1 + 0.15 * b)})`; e.style.background = mixc(P[0][i], P[1][i], f); });
      glow.style.opacity = n3(0.9 * b * b); glow.style.transform = `scale(${n3(0.4 + 1.6 * K.seg(t, flipAt - bloom * 0.5, flipAt + bloom * 0.7))})`;
    } };
  };

  // ── fuiHud: four corner brackets over `rect` (default: the middle of the area) draw in and tighten; `readouts` = [{ label, base, amp, unit }]
  // tick in a column (value = base ± amp, re-rolled 12×/s from a seeded hash so it flickers but replays); a reticle spins in from
  // large, locks at `lockAt` with a flash, and "LOCK" blinks.
  S.fuiHud = (o) => {
    const a = area(o), rc = o.rect ?? { x: a.x + a.w * 0.2, y: a.y + a.h * 0.15, w: a.w * 0.6, h: a.h * 0.7 }, at = o.at ?? 0, lockAt = o.lockAt ?? at + K.dur(1.4), root = wrap(o.parent), sw = Math.max(3, 4 * K.u), L = 34 * K.u, col = o.color ?? 'var(--kit-accent)';
    const R = o.readouts ?? [{ label: 'ALT', base: 3200, amp: 40, unit: ' m' }, { label: 'SPD', base: 240, amp: 6, unit: ' km/h' }, { label: 'TMP', base: 21, amp: 2, unit: ' C' }];
    const corners = [[0, 0, 1, 1], [1, 0, -1, 1], [0, 1, 1, -1], [1, 1, -1, -1]].map(([cx, cy, sx, sy]) => ({ e: mk(root, { width: px(L), height: px(L), borderStyle: 'solid', borderColor: col, borderWidth: `${sy > 0 ? sw : 0}px ${sx < 0 ? sw : 0}px ${sy < 0 ? sw : 0}px ${sx > 0 ? sw : 0}px` }), cx, cy, sx, sy }));
    const hash = (i, k) => { let h = (i * 374761393 + k * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const rd = R.map((r, i) => mk(root, txt(22 * K.u, { left: px(rc.x + 20 * K.u), top: px(rc.y + 20 * K.u + i * 34 * K.u), fontFamily: 'var(--kit-font-mono)', color: col, fontWeight: 500 })));
    const cr = Math.min(rc.w, rc.h) * 0.22, C = { x: rc.x + rc.w / 2, y: rc.y + rc.h / 2 }, ret = mk(root, { left: px(C.x - cr), top: px(C.y - cr), width: px(2 * cr), height: px(2 * cr), borderRadius: '50%', border: `${sw}px solid ${col}` });
    mk(ret, { left: '50%', top: '-12%', width: px(sw), height: '124%', background: col, marginLeft: px(-sw / 2) }); mk(ret, { top: '50%', left: '-12%', height: px(sw), width: '124%', background: col, marginTop: px(-sw / 2) });
    const lab = mk(root, txt(24 * K.u, { left: px(C.x - 60 * K.u), width: px(120 * K.u), top: px(C.y + cr + 14 * K.u), textAlign: 'center', fontFamily: 'var(--kit-font-mono)', color: col, letterSpacing: '0.2em' }), 'LOCK'), flash = mk(root, { left: px(C.x - cr), top: px(C.y - cr), width: px(2 * cr), height: px(2 * cr), borderRadius: '50%', background: col });
    const ease = K.easing('power3.out');
    return { el: root, end: lockAt + 1, set(t) {
      const p = ease(K.seg(t, at, at + K.dur(0.6))), pad = (1 - p) * 40 * K.u;
      corners.forEach((c) => { c.e.style.opacity = n3(p); c.e.style.left = px(rc.x + c.cx * rc.w - (c.cx ? L : 0) - c.sx * pad); c.e.style.top = px(rc.y + c.cy * rc.h - (c.cy ? L : 0) - c.sy * pad); });
      rd.forEach((e, i) => { const v = R[i].base + (hash(i, Math.floor((t - at) * 12)) - 0.5) * 2 * R[i].amp; e.textContent = `${R[i].label} ${Math.round(v)}${R[i].unit ?? ''}`; e.style.opacity = n3(K.seg(t, at + 0.1 * i, at + 0.4 + 0.1 * i)); });
      const lp = K.easing('power3.inOut')(K.seg(t, at + K.dur(0.3), lockAt)); ret.style.transform = `scale(${n3(K.lerp(2.6, 1, lp))}) rotate(${n3(K.lerp(180, 0, lp))}deg)`; ret.style.opacity = n3(K.seg(t, at + 0.1, at + 0.4));
      flash.style.opacity = n3(0.5 * decay(t, lockAt, 9)); lab.style.opacity = t >= lockAt ? (Math.floor((t - lockAt) * 5) % 2 ? 0.25 : 1) : 0;
    } };
  };

  // ── glowOrbAmbient: `orbs` blurred glowing orbs breathing and drifting on closed-form loops (seeded phases) inside `box`.
  S.glowOrbAmbient = (o) => {
    const a = area(o), n = o.orbs ?? 5, r = rng(o.seed ?? 40), root = wrap(o.parent), at = o.at ?? 0;
    const orbs = Array.from({ length: n }, (_, i) => { const d = (60 + r() * 120) * K.u; return { e: mk(root, { width: px(d), height: px(d), borderRadius: '50%', background: `radial-gradient(${o.colors?.[i % o.colors.length] ?? COLORS[i % 6]}, transparent 70%)`, mixBlendMode: 'screen' }), d, x: r(), y: r(), w: 0.3 + r() * 0.5, ph: r() * 6.28, bw: 0.6 + r() }; });
    return { el: root, end: at + K.dur(4), set(t) { orbs.forEach((b) => { const s = 1 + 0.25 * Math.sin(t * b.bw * 2 + b.ph), x = a.x + a.w * (b.x + 0.08 * Math.sin(t * b.w + b.ph)), y = a.y + a.h * (b.y + 0.08 * Math.cos(t * b.w * 1.2 + b.ph));
      b.e.style.transform = `translate(${px(x - b.d / 2)},${px(y - b.d / 2)}) scale(${n3(s)})`; b.e.style.opacity = n3(0.55 + 0.35 * Math.sin(t * b.bw + b.ph) * K.seg(t, at, at + 0.5)); }); } };
  };
  // flylineArc: an arc from → to (stage px points) drawn on by a glowing orb that carries a tail; `height` lifts the control point.
  const arcLine = (root, sv, from, to, o) => { const c = arcCtl(from, to, o.height ?? Math.abs(to.x - from.x) * 0.35), col = o.color ?? 'var(--kit-accent)', sw = Math.max(2, 3 * K.u);
    const path = se(sv, 'path', { d: `M ${from.x} ${from.y} Q ${c.x} ${c.y} ${to.x} ${to.y}`, fill: 'none', stroke: col, 'stroke-width': sw, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1', opacity: 0.55 });
    const orb = mk(root, { width: px(22 * K.u), height: px(22 * K.u), borderRadius: '50%', background: '#fff', boxShadow: `0 0 ${24 * K.u}px ${col}, 0 0 ${60 * K.u}px ${col}` });
    return { set(p, vis) { const q = quad(from, c, to, p); path.setAttribute('stroke-dashoffset', n3(1 - p)); path.setAttribute('opacity', n3(0.55 * vis)); orb.style.transform = `translate(${px(q.x - 11 * K.u)},${px(q.y - 11 * K.u)}) scale(${n3(p > 0 && p < 1 ? 1 : 0)})`; }, c }; };
  S.flylineArc = (o) => {
    const a = area(o), from = o.from ?? { x: a.x + a.w * 0.1, y: a.y + a.h * 0.75 }, to = o.to ?? { x: a.x + a.w * 0.9, y: a.y + a.h * 0.6 }, at = o.at ?? 0, dur = o.dur ?? K.dur(1.4), root = wrap(o.parent), sv = svgBox(root), line = arcLine(root, sv, from, to, o), ease = ez(o.ease ?? 'power2.inOut');
    return { el: root, end: at + dur, set(t) { line.set(ease(K.seg(t, at, at + dur)), 1); } };
  };
  // orbFlylineRelay: nodes = [{ x, y, label }] (default: five across the area); an orb hops node to node along arcs (hop seconds each), each
  // node ringing and lighting as the orb lands, the arcs staying drawn behind it.
  S.orbFlylineRelay = (o) => {
    const a = area(o), N = o.nodes ?? Array.from({ length: 5 }, (_, i) => ({ x: a.x + a.w * (0.1 + 0.2 * i), y: a.y + a.h * (i % 2 ? 0.35 : 0.65), label: String(i + 1) })), at = o.at ?? 0, hop = o.hop ?? K.dur(0.8), root = wrap(o.parent), sv = svgBox(root), ease = ez(o.ease ?? 'power2.inOut');
    const arcs = N.slice(1).map((n, i) => arcLine(root, sv, N[i], n, o)), d = 54 * K.u;
    const nodes = N.map((n) => ({ dot: mk(root, txt(d * 0.4, { left: px(n.x - d / 2), top: px(n.y - d / 2), width: px(d), height: px(d), borderRadius: '50%', background: 'var(--kit-surface)', border: `${Math.max(2, 3 * K.u)}px solid var(--kit-muted)`, textAlign: 'center', lineHeight: px(d), boxSizing: 'border-box' }), esc(n.label ?? '')), ring: mk(root, { left: px(n.x - d / 2), top: px(n.y - d / 2), width: px(d), height: px(d), borderRadius: '50%', border: `${Math.max(2, 3 * K.u)}px solid var(--kit-accent)` }) }));
    return { el: root, end: at + (N.length - 1) * hop + 0.6, set(t) {
      arcs.forEach((l, i) => { const s = at + i * hop, p = ease(K.seg(t, s, s + hop)); l.set(p, 1); });
      nodes.forEach((n, i) => { const arr = at + i * hop - (i ? 0 : -0), lit = i === 0 ? t >= at : t >= at + (i - 1) * hop + hop, rp = K.seg(t, at + (i ? (i - 1) * hop + hop : 0), at + (i ? (i - 1) * hop + hop : 0) + 0.5);
        n.dot.style.borderColor = lit ? 'var(--kit-accent)' : 'var(--kit-muted)'; n.ring.style.transform = `scale(${n3(1 + 1.6 * K.E.out(rp))})`; n.ring.style.opacity = n3(lit ? 0.9 * (1 - rp) : 0); });
    } };
  };

  // ── icon performance. attentionBounce({ el }): el hops `n` times with decaying height and squash-and-stretch, then a short wiggle.
  // It owns el's transform. iconMorph({ a, b }): glyph a squeezes, spins and blurs into glyph b on a springy beat (strings or HTML).
  S.attentionBounce = (o) => {
    const el = o.el, n = o.n ?? 3, hgt = o.height ?? 90 * K.u, at = o.at ?? 0, per = o.per ?? K.dur(0.5), root = el, wig = o.wiggle !== false;
    return { el: root, end: at + n * per + (wig ? 0.6 : 0), set(t) {
      const k = Math.min(n - 1, Math.max(0, Math.floor((t - at) / per))), f = K.clamp(((t - at) - k * per) / per), live = t >= at && t < at + n * per, amp = Math.pow(0.62, k), y = live ? 4 * f * (1 - f) * hgt * amp : 0;
      const sq = live ? (f < 0.12 || f > 0.88 ? 1 : 0) * 0.18 * amp : 0, st = live ? 0.1 * amp * Math.sin(Math.PI * f) : 0, tw = wig ? bump(t, at + n * per, 7, 34) * 10 : 0;
      el.style.transformOrigin = '50% 100%'; el.style.transform = `translateY(${px(-y)}) scale(${n3(1 + sq * -0.5 + st * 0.6)},${n3(1 - sq + st)}) rotate(${n3(tw)}deg)`;
    } };
  };
  S.iconMorph = (o) => {
    const size = o.size ?? 140 * K.u, at = o.at ?? 0, dur = o.dur ?? K.dur(0.6), root = wrap(o.parent), X = o.x ?? K.W_ / 2, Y = o.y ?? K.H_ / 2, sp = K.spring({ mass: 1, damping: 10, stiffness: 170 });
    const g = (s) => mk(root, txt(size, { left: px(X - size), width: px(2 * size), top: px(Y - size * 0.6), textAlign: 'center', fontWeight: 400 }), s);
    const A = g(o.a ?? '&#9654;'), B = g(o.b ?? '&#10003;');
    return { el: root, end: at + dur + 0.5, set(t) {
      const p = K.seg(t, at, at + dur), s = t < at ? 0 : sp((t - at) / dur * 2), sw = Math.sin(Math.PI * p);
      A.style.opacity = n3(1 - K.seg(p, 0.3, 0.6)); A.style.transform = `scale(${n3(1 - 0.5 * s)}) rotate(${n3(-90 * K.clamp(s))}deg)`; A.style.filter = `blur(${n3(sw * 6 * K.u)}px)`;
      B.style.opacity = n3(K.seg(p, 0.4, 0.7)); B.style.transform = `scale(${n3(0.5 + 0.5 * s)}) rotate(${n3(90 * (1 - K.clamp(s)))}deg)`; B.style.filter = `blur(${n3(sw * 6 * K.u)}px)`;
    } };
  };

  // ── hitCounter: a big count that goes up on every hit time (hits = [s…]); each hit pops it (damped oscillation), shakes it and sends a
  // ring out; label under it. animeImpact: one hit of anime impact: speed lines burst from the centre for a few frames, a white flash, the
  // word slams in from huge, and the frame shakes (shake(t) → { x, y }, applied to opts.shakeEl if given).
  S.hitCounter = (o) => {
    const hits = (o.hits ?? [0.3, 0.7, 1.0, 1.5, 1.8]).slice().sort((a, b) => a - b), size = o.size ?? 180 * K.u, root = wrap(o.parent), X = o.x ?? K.W_ / 2, Y = o.y ?? K.H_ / 2;
    const num = mk(root, txt(size, { left: px(X - size * 2), width: px(size * 4), top: px(Y - size * 0.6), textAlign: 'center', fontWeight: 900, fontFamily: 'var(--kit-font-mono)' }), '0'), lab = mk(root, txt(size * 0.2, { left: px(X - size * 2), width: px(size * 4), top: px(Y + size * 0.55), textAlign: 'center', color: 'var(--kit-muted)', letterSpacing: '0.2em' }), esc(o.label ?? 'HITS'));
    const rings = hits.map(() => mk(root, { left: px(X - size * 0.5), top: px(Y - size * 0.1), width: px(size), height: px(size * 0.2), borderRadius: '50%', border: `${Math.max(2, 3 * K.u)}px solid var(--kit-accent)` }));
    return { el: root, end: hits[hits.length - 1] + 0.8, set(t) {
      let last = -1, cnt = 0; hits.forEach((h, i) => { if (h <= t) { last = i; cnt++; } });
      const b = last < 0 ? 0 : bump(t, hits[last], 9, 30), sh = last < 0 ? 0 : decay(t, hits[last], 12) * Math.sin((t - hits[last]) * 90);
      num.textContent = String(cnt); num.style.transform = `translate(${px(sh * 10 * K.u)},0) scale(${n3(1 + 0.4 * b)})`; num.style.color = b > 0.3 ? 'var(--kit-accent)' : 'var(--kit-ink)';
      rings.forEach((e, i) => { const p = K.seg(t, hits[i], hits[i] + 0.4); e.style.opacity = n3(t >= hits[i] ? 0.8 * (1 - p) : 0); e.style.transform = `scale(${n3(1 + 3 * K.E.out(p))})`; });
    } };
  };
  S.animeImpact = (o) => {
    const at = o.at ?? 0, r = rng(o.seed ?? 3), root = wrap(o.parent), sv = svgBox(root), X = o.x ?? K.W_ / 2, Y = o.y ?? K.H_ / 2, n = o.lines ?? 40, R0 = Math.min(K.W_, K.H_) * 0.18, R1 = Math.hypot(K.W_, K.H_) / 2, size = o.size ?? 220 * K.u;
    const L = Array.from({ length: n }, () => { const ang = r() * 6.283, w = (2 + r() * 8) * K.u, a0 = R0 * (1 + r() * 0.8); return se(sv, 'line', { x1: X + Math.cos(ang) * a0, y1: Y + Math.sin(ang) * a0, x2: X + Math.cos(ang) * R1, y2: Y + Math.sin(ang) * R1, stroke: r() > 0.3 ? '#fff' : 'var(--kit-accent)', 'stroke-width': w, 'stroke-linecap': 'round' }); });
    const flash = mk(root, { left: 0, top: 0, width: K.W_ + 'px', height: K.H_ + 'px', background: '#fff' }), word = mk(root, txt(size, { left: px(X - K.W_), width: px(2 * K.W_), top: px(Y - size * 0.55), textAlign: 'center', fontWeight: 900, fontStyle: 'italic', webkitTextStroke: `${Math.max(2, 4 * K.u)}px #000`, color: 'var(--kit-accent)' }), esc(o.text ?? 'BAM!'));
    const shake = (t) => { const d = decay(t, at, 10); return { x: Math.sin((t - at) * 120) * 14 * K.u * d, y: Math.cos((t - at) * 97) * 10 * K.u * d }; }, slam = K.easing('expo.out');
    return { el: root, end: at + 1, shake, set(t) {
      const p = K.seg(t, at, at + 0.22); sv.style.opacity = t >= at ? n3(1 - K.seg(t, at + 0.12, at + 0.3)) : 0; sv.style.transform = `scale(${n3(0.6 + 0.6 * K.E.out(p))})`; sv.style.transformOrigin = `${X}px ${Y}px`;
      flash.style.opacity = n3(0.85 * decay(t, at, 28)); const s = slam(K.seg(t, at, at + 0.25)); word.style.opacity = t >= at ? n3(1 - K.seg(t, at + 0.7, at + 1)) : 0; word.style.transform = `scale(${n3(K.lerp(3.2, 1, s))}) rotate(-6deg)`;
      if (o.shakeEl) { const q = shake(t); o.shakeEl.style.transform = `translate(${px(q.x)},${px(q.y)})`; }
    } };
  };

  // ── light play. spotlightSweep: the area is dark except a soft round spotlight that moves along `path` = [[fx, fy], …] (fractions of the
  // area, default left → right across the middle) over dur, easing between points. sheenSweep: a diagonal band of light crosses `rect`
  // (clipped to its rounded corners) once per `every` seconds (or once).
  S.spotlightSweep = (o) => {
    const a = area(o), at = o.at ?? 0, dur = o.dur ?? K.dur(2), path = o.path ?? [[0.1, 0.5], [0.5, 0.45], [0.9, 0.55]], rad = o.radius ?? Math.min(a.w, a.h) * 0.3, dim = o.dim ?? 0.82, root = mk(o.parent, { left: 0, top: 0, width: K.W_ + 'px', height: K.H_ + 'px', pointerEvents: 'none' });
    const keys = (k) => path.map((p, i) => [at + (dur * i) / (path.length - 1), p[k]]), ex = path.slice(1).map(() => K.easing('power2.inOut'));
    return { el: root, end: at + dur, set(t) {
      const x = a.x + a.w * K.keys(t, keys(0), ex), y = a.y + a.h * K.keys(t, keys(1), ex), on = K.seg(t, at - 0.2, at + 0.2) * (1 - K.seg(t, at + dur - 0.1, at + dur + 0.3));
      root.style.background = `radial-gradient(circle ${px(rad)} at ${px(x)} ${px(y)}, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,${n3(dim * on)}) 100%)`; root.style.backgroundColor = `rgba(0,0,0,0)`;
      root.style.boxShadow = 'none';
    } };
  };
  S.sheenSweep = (o) => {
    const a = area(o), rc = o.rect ?? { x: a.x + a.w * 0.2, y: a.y + a.h * 0.3, w: a.w * 0.6, h: a.h * 0.4 }, at = o.at ?? 0, dur = o.dur ?? K.dur(0.9), every = o.every ?? 0, n = o.times ?? (every ? 3 : 1), root = wrap(o.parent), ease = ez(o.ease ?? 'power2.inOut');
    const clip = mk(root, { left: px(rc.x), top: px(rc.y), width: px(rc.w), height: px(rc.h), overflow: 'hidden', borderRadius: o.radius ?? 'var(--kit-radius)', pointerEvents: 'none' }), band = mk(clip, { top: '-50%', width: px(rc.w * 0.35), height: '200%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)', mixBlendMode: 'overlay' });
    return { el: root, end: at + (n - 1) * every + dur, set(t) {
      const k = every ? Math.min(n - 1, Math.max(0, Math.floor((t - at) / every))) : 0, p = ease(K.seg(t - k * every, at, at + dur));
      band.style.transform = `translateX(${px(K.lerp(-rc.w * 0.4, rc.w * 1.1, p))}) rotate(20deg)`; band.style.opacity = t >= at && p < 1 ? 1 : 0;
    } };
  };

  // ── radialRipplePhoneChips: a phone (opts.phone element, or a drawn placeholder) in the middle emits ripple rings; chips = [text] fly out
  // from the phone along their own ray to a ring of radius `radius`, each leaving when a ripple passes, and then hover in a slow orbit.
  S.radialRipplePhoneChips = (o) => {
    const L = o.chips ?? ['Mail', 'Chat', 'Maps', 'Pay', 'Photos', 'Music', 'Notes', 'Cal'], n = L.length, a = area(o), C = { x: o.x ?? K.W_ / 2, y: o.y ?? K.H_ / 2 }, at = o.at ?? 0, per = o.per ?? K.dur(0.35), R = o.radius ?? Math.min(a.w, a.h) * 0.4, root = wrap(o.parent), chip = o.chip ?? 64 * K.u;
    const pw = 110 * K.u, ph = pw * 2, rings = [0, 1, 2].map(() => mk(root, { left: px(C.x), top: px(C.y), width: px(2), height: px(2), borderRadius: '50%', border: `${Math.max(2, 3 * K.u)}px solid var(--kit-accent)` }));
    const phone = o.phone ?? card(root, pw, ph, { left: px(C.x - pw / 2), top: px(C.y - ph / 2), borderRadius: px(18 * K.u), background: 'var(--kit-bg)', border: `${Math.max(2, 4 * K.u)}px solid var(--kit-ink)` });
    const P = L.map((l, i) => { const ang = -Math.PI / 2 + (2 * Math.PI * i) / n, e = mk(root, txt(chip * 0.3, { width: px(2 * chip), height: px(chip), borderRadius: px(chip / 2), background: COLORS[i % 6], color: '#0f1115', textAlign: 'center', lineHeight: px(chip), fontFamily: 'var(--kit-font-text)', fontWeight: 700 }), esc(l)); return { e, ang, a: at + K.dur(0.3) + i * per }; });
    const out = K.easing('back.out(1.4)'), fly = o.fly ?? K.dur(0.7);
    return { el: root, end: at + K.dur(0.3) + n * per + fly, set(t) {
      rings.forEach((e, i) => { const p = ((t - at - i * 0.5) / 1.5), q = K.clamp(p % 1), live = p > 0, r = (live ? q : 0) * R * 1.4; K.css(e, { width: px(2 * r), height: px(2 * r), marginLeft: px(-r), marginTop: px(-r), opacity: n3(live ? 0.7 * (1 - q) : 0) }); });
      for (const c of P) { const p = out(K.seg(t, c.a, c.a + fly)), ang = c.ang + 0.1 * Math.sin(t * 0.8 + c.ang) * K.seg(t, c.a + fly, c.a + fly + 0.5), r = R * p, x = C.x + Math.cos(ang) * r * 1.25, y = C.y + Math.sin(ang) * r;
        c.e.style.transform = `translate(${px(x - chip)},${px(y - chip / 2)}) scale(${n3(p)})`; c.e.style.opacity = n3(K.seg(t, c.a, c.a + 0.1)); }
    } };
  };

  // ── scanBracketSweep: four corner brackets close from wide onto `rect` (the subject) while a scan band sweeps down through it and back
  // up, a percent readout counting with the band; outside the box the frame is dimmed.
  S.scanBracketSweep = (o) => {
    const a = area(o), rc = o.rect ?? { x: a.x + a.w * 0.3, y: a.y + a.h * 0.2, w: a.w * 0.4, h: a.h * 0.6 }, at = o.at ?? 0, close = o.close ?? K.dur(0.6), dur = o.dur ?? K.dur(1.8), root = wrap(o.parent), sw = Math.max(3, 5 * K.u), L = Math.min(rc.w, rc.h) * 0.2, col = o.color ?? 'var(--kit-accent)';
    const dimmer = mk(root, { left: px(rc.x), top: px(rc.y), width: px(rc.w), height: px(rc.h), boxShadow: '0 0 0 9999px rgba(0,0,0,.55)' });
    const cs = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([cx, cy]) => mk(root, { width: px(L), height: px(L), borderColor: col, borderStyle: 'solid', borderWidth: `${cy ? 0 : sw}px ${cx ? sw : 0}px ${cy ? sw : 0}px ${cx ? 0 : sw}px` }));
    const clip = mk(root, { left: px(rc.x), top: px(rc.y), width: px(rc.w), height: px(rc.h), overflow: 'hidden' }), band = mk(clip, { left: 0, width: '100%', height: px(rc.h * 0.35), background: `linear-gradient(transparent, ${o.bandColor ?? 'rgba(110,231,183,.5)'}, transparent)` });
    const ro = mk(root, txt(24 * K.u, { left: px(rc.x), width: px(rc.w), top: px(rc.y + rc.h + 14 * K.u), textAlign: 'center', fontFamily: 'var(--kit-font-mono)', color: col, letterSpacing: '0.15em' }));
    const tS = at + close;
    return { el: root, end: tS + dur, set(t) {
      const c = K.easing('power3.out')(K.seg(t, at, at + close)), pad = (1 - c) * 120 * K.u, s = K.seg(t, tS, tS + dur), tri = s < 0.5 ? s * 2 : 2 - s * 2, y = K.lerp(-rc.h * 0.35, rc.h, K.easing('power1.inOut')(tri));
      cs.forEach((e, i) => { const cx = i % 2, cy = i >> 1; K.css(e, { opacity: n3(c), left: px(rc.x + cx * rc.w - (cx ? L : 0) + (cx ? pad : -pad)), top: px(rc.y + cy * rc.h - (cy ? L : 0) + (cy ? pad : -pad)) }); });
      dimmer.style.opacity = n3(c); band.style.transform = `translateY(${px(y)})`; band.style.opacity = t >= tS && t <= tS + dur ? 1 : 0; ro.textContent = 'SCAN ' + String(Math.round(100 * (t >= tS ? K.seg(t, tS, tS + dur) : 0))).padStart(3, '0') + '%'; ro.style.opacity = n3(c);
    } };
  };

  // ── scanlineAnnotateFocus: a scanline sweeps down `rect` (the subject); then the rest of the frame dims, a connector (elbow line) draws
  // from `anchor` (a fraction of rect, default its right edge) to a callout pill with opts.label, which pops.
  S.scanlineAnnotateFocus = (o) => {
    const a = area(o), rc = o.rect ?? { x: a.x + a.w * 0.12, y: a.y + a.h * 0.2, w: a.w * 0.36, h: a.h * 0.6 }, at = o.at ?? 0, sweep = o.sweep ?? K.dur(1), root = wrap(o.parent), sv = svgBox(root), col = o.color ?? 'var(--kit-accent)';
    const an = o.anchor ?? [1, 0.35], A = { x: rc.x + rc.w * an[0], y: rc.y + rc.h * an[1] }, T = o.target ?? { x: a.x + a.w * 0.72, y: A.y - a.h * 0.12 }, elbow = { x: T.x - 60 * K.u, y: T.y };
    const focus = mk(root, { left: px(rc.x), top: px(rc.y), width: px(rc.w), height: px(rc.h), boxShadow: '0 0 0 9999px rgba(0,0,0,.6)', borderRadius: 'var(--kit-radius)', border: `${Math.max(2, 3 * K.u)}px solid ${col}` });
    const scan = mk(root, { left: px(rc.x), width: px(rc.w), height: px(Math.max(3, 4 * K.u)), background: col, boxShadow: `0 0 ${20 * K.u}px ${col}` });
    const conn = se(sv, 'polyline', { points: `${A.x},${A.y} ${elbow.x},${elbow.y} ${T.x},${T.y}`, fill: 'none', stroke: col, 'stroke-width': Math.max(2, 3 * K.u), pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-linejoin': 'round' });
    const pill = mk(root, txt(30 * K.u, { left: px(T.x), top: px(T.y), padding: `${px(10 * K.u)} ${px(22 * K.u)}`, borderRadius: '99px', background: col, color: 'var(--kit-on-accent)', fontFamily: 'var(--kit-font-text)', fontWeight: 700, transformOrigin: 'left center' }), esc(o.label ?? 'Focus here'));
    const tF = at + sweep, pop = K.easing('back.out(2)');
    return { el: root, end: tF + K.dur(1), set(t) {
      scan.style.top = px(rc.y + rc.h * K.seg(t, at, at + sweep)); scan.style.opacity = t >= at && t < tF ? 1 : 0;
      const f = K.E.out(K.seg(t, tF, tF + K.dur(0.4))); focus.style.opacity = n3(f); conn.setAttribute('stroke-dashoffset', n3(1 - K.E.out(K.seg(t, tF + 0.2, tF + 0.2 + K.dur(0.5))))); const s = pop(K.seg(t, tF + 0.6, tF + 0.6 + K.dur(0.4)));
      pill.style.transform = `translateY(-50%) scale(${n3(s)})`; pill.style.opacity = s > 0 ? 1 : 0;
    } };
  };

  // ── slam entrances. kanadaPerspectiveSnap: a word starts hugely foreshortened (rotateY, rotateX, skew, scale) and snaps flat on a stiff
  // spring with a little overshoot. scoreSlam: a number counts up fast, then slams from huge with a shockwave ring and a shaking frame.
  // impactBurst: shards, a ring and a flash around (x, y), reusable on any beat.
  S.kanadaPerspectiveSnap = (o) => {
    const size = o.size ?? 200 * K.u, at = o.at ?? 0, root = mk(o.parent, { left: 0, top: 0, width: K.W_ + 'px', height: K.H_ + 'px', perspective: px(size * 6), perspectiveOrigin: '50% 50%' }), sp = K.spring({ mass: 1, damping: 14, stiffness: 260 });
    const w = mk(root, txt(size, { left: 0, width: '100%', top: px((o.y ?? K.H_ / 2) - size * 0.55), textAlign: 'center', fontWeight: 900 }), esc(o.text ?? 'SNAP'));
    return { el: root, end: at + 1, set(t) { const p = t < at ? 0 : sp((t - at) * 2.4), u = 1 - p;
      w.style.opacity = t >= at ? n3(K.seg(t, at, at + 0.06)) : 0; w.style.filter = `blur(${n3(Math.max(0, u) * 10 * K.u)}px)`; w.style.transform = `rotateY(${n3(u * 75)}deg) rotateX(${n3(u * -25)}deg) skewX(${n3(u * -18)}deg) scale(${n3(1 + u * 1.2)})`; } };
  };
  S.scoreSlam = (o) => {
    const size = o.size ?? 260 * K.u, at = o.at ?? 0, count = o.count ?? K.dur(0.7), value = o.value ?? 9850, X = o.x ?? K.W_ / 2, Y = o.y ?? K.H_ / 2, root = wrap(o.parent), tS = at + count, slam = K.easing('expo.out');
    const num = mk(root, txt(size, { left: px(X - K.W_), width: px(2 * K.W_), top: px(Y - size * 0.55), textAlign: 'center', fontWeight: 900, fontFamily: 'var(--kit-font-mono)' })), ring = mk(root, { left: px(X - size), top: px(Y - size), width: px(2 * size), height: px(2 * size), borderRadius: '50%', border: `${Math.max(3, 6 * K.u)}px solid var(--kit-accent)` });
    const lab = mk(root, txt(size * 0.14, { left: px(X - K.W_), width: px(2 * K.W_), top: px(Y + size * 0.55), textAlign: 'center', color: 'var(--kit-muted)', letterSpacing: '0.3em' }), esc(o.label ?? 'SCORE'));
    const shake = (t) => { const d = decay(t, tS, 9); return { x: Math.sin((t - tS) * 110) * 16 * K.u * d, y: Math.cos((t - tS) * 83) * 12 * K.u * d }; };
    return { el: root, end: tS + 1, shake, set(t) {
      const c = K.easing('power3.out')(K.seg(t, at, tS)), s = slam(K.seg(t, tS, tS + 0.22)), v = t < tS ? value * c : value;
      num.textContent = Math.round(v).toLocaleString('en-US'); num.style.opacity = n3(K.seg(t, at, at + 0.1)); num.style.transform = `scale(${n3(t < tS ? 0.7 + 0.2 * c : K.lerp(2.4, 1, s))})`; num.style.color = t >= tS && t < tS + 0.25 ? 'var(--kit-accent)' : 'var(--kit-ink)';
      const p = K.seg(t, tS, tS + 0.5); ring.style.transform = `scale(${n3(K.E.out(p))})`; ring.style.opacity = t >= tS ? n3(1 - p) : 0; lab.style.opacity = n3(K.seg(t, tS + 0.1, tS + 0.4));
      if (o.shakeEl) { const q = shake(t); o.shakeEl.style.transform = `translate(${px(q.x)},${px(q.y)})`; }
    } };
  };
  S.impactBurst = (o) => {
    const at = o.at ?? 0, n = o.shards ?? 16, X = o.x ?? K.W_ / 2, Y = o.y ?? K.H_ / 2, R = o.radius ?? Math.min(K.W_, K.H_) * 0.4, r = rng(o.seed ?? 7), root = wrap(o.parent), dur = o.dur ?? K.dur(0.7);
    const flash = mk(root, { left: px(X - R * 0.5), top: px(Y - R * 0.5), width: px(R), height: px(R), borderRadius: '50%', background: 'radial-gradient(#fff, transparent 70%)' }), ring = mk(root, { left: px(X - R / 2), top: px(Y - R / 2), width: px(R), height: px(R), borderRadius: '50%', border: `${Math.max(3, 6 * K.u)}px solid var(--kit-accent)` });
    const sh = Array.from({ length: n }, (_, i) => ({ e: mk(root, { width: px((6 + r() * 10) * K.u), height: px((30 + r() * 60) * K.u), background: i % 3 ? '#fff' : 'var(--kit-accent)', borderRadius: '3px' }), ang: (2 * Math.PI * i) / n + (r() - 0.5) * 0.3, d: R * (0.6 + r() * 0.7) }));
    return { el: root, end: at + dur, set(t) {
      const p = K.seg(t, at, at + dur), e = K.easing('power4.out')(p); flash.style.opacity = n3(t >= at ? 1 - K.seg(p, 0, 0.25) : 0); flash.style.transform = `scale(${n3(0.5 + e)})`; ring.style.transform = `scale(${n3(0.3 + 1.7 * K.E.out(p))})`; ring.style.opacity = t >= at ? n3(1 - p) : 0;
      sh.forEach((s) => { const x = X + Math.cos(s.ang) * s.d * e, y = Y + Math.sin(s.ang) * s.d * e; s.e.style.opacity = t >= at ? n3(1 - K.seg(p, 0.5, 1)) : 0; s.e.style.transform = `translate(${px(x)},${px(y)}) rotate(${n3((s.ang * 180) / Math.PI + 90)}deg) scaleY(${n3(1 - 0.6 * p)})`; });
    } };
  };

  // ── spotlight moves. glowWakeSleepPanel: a panel sleeps (dim, grey, no glow), wakes at `wakeAt` (brightness, a spreading glow, a pulse) and
  // goes back to sleep at `sleepAt`. slideSpotlightPan: columns of a slide; a spotlight pans from one to the next every `every` s while the
  // others dim. cornerSpotlightReveal: content (html) is revealed by a radial light growing out of a corner.
  S.glowWakeSleepPanel = (o) => {
    const w = o.w ?? 520 * K.u, h = o.h ?? 300 * K.u, X = o.x ?? K.W_ / 2, Y = o.y ?? K.H_ / 2, at = o.at ?? 0, wakeAt = o.wakeAt ?? at + K.dur(0.5), sleepAt = o.sleepAt ?? wakeAt + K.dur(2), root = wrap(o.parent), col = o.color ?? 'var(--kit-accent)', up = K.dur(0.6);
    const glow = mk(root, { left: px(X - w * 0.7), top: px(Y - h * 0.9), width: px(w * 1.4), height: px(h * 1.8), borderRadius: '50%', background: `radial-gradient(${col}, transparent 65%)`, filter: `blur(${30 * K.u}px)` }), p = card(root, w, h, txt(h * 0.16, { left: px(X - w / 2), top: px(Y - h / 2), textAlign: 'center', lineHeight: px(h) }));
    p.innerHTML = esc(o.text ?? 'Awake');
    return { el: root, end: sleepAt + up, set(t) {
      const a = K.easing('power2.out')(K.seg(t, wakeAt, wakeAt + up)) * (1 - K.easing('power2.inOut')(K.seg(t, sleepAt, sleepAt + up))), pulse = bump(t, wakeAt, 5, 18) * (t >= wakeAt ? 1 : 0);
      glow.style.opacity = n3(0.75 * a); glow.style.transform = `scale(${n3(0.6 + 0.4 * a + 0.05 * pulse)})`; p.style.opacity = n3(0.4 + 0.6 * a); p.style.filter = `grayscale(${n3(1 - a)}) brightness(${n3(0.8 + 0.4 * a)})`; p.style.borderColor = a > 0.5 ? col : 'rgba(255,255,255,.1)';
      p.style.transform = `scale(${n3(0.97 + 0.03 * a + 0.02 * pulse)})`;
    } };
  };
  S.slideSpotlightPan = (o) => {
    const C = o.columns, n = C.length, a = area(o), at = o.at ?? 0, every = o.every ?? K.dur(1.2), move = Math.min(o.move ?? K.dur(0.5), every), root = wrap(o.parent), gap = 24 * K.u, cw = (a.w - gap * (n - 1)) / n, ch = a.h * 0.6, y = a.y + (a.h - ch) / 2, ease = ez(o.ease ?? 'power3.inOut');
    const cols = C.map((c, i) => { const e = card(root, cw, ch, txt(ch * 0.1, { left: px(a.x + i * (cw + gap)), top: px(y), padding: px(ch * 0.08), whiteSpace: 'normal', fontFamily: 'var(--kit-font-text)', fontWeight: 600 })); e.innerHTML = esc(c); return e; });
    const beam = mk(root, { left: 0, top: px(y - ch * 0.15), width: px(cw * 1.3), height: px(ch * 1.3), borderRadius: '50%', background: 'radial-gradient(var(--kit-accent), transparent 70%)', opacity: 0.35, mixBlendMode: 'screen', filter: `blur(${20 * K.u}px)` });
    return { el: root, end: at + n * every, set(t) {
      const j = Math.min(n - 1, Math.max(0, Math.floor((t - at) / every))), f = ease(K.seg(t - at - j * every, every - move, every)), pos = Math.min(n - 1, j + (j < n - 1 ? f : 0));
      beam.style.transform = `translateX(${px(a.x + pos * (cw + gap) - cw * 0.15)})`; cols.forEach((e, i) => { const l = Math.max(0, 1 - Math.abs(i - pos)); e.style.opacity = n3(0.35 + 0.65 * l); e.style.transform = `scale(${n3(0.96 + 0.06 * l)})`; e.style.borderColor = l > 0.7 ? 'var(--kit-accent)' : 'rgba(255,255,255,.1)'; });
    } };
  };
  S.cornerSpotlightReveal = (o) => {
    const a = area(o), at = o.at ?? 0, dur = o.dur ?? K.dur(1.4), corner = o.corner ?? [0, 0], root = wrap(o.parent), cxp = a.x + a.w * corner[0], cyp = a.y + a.h * corner[1], Rm = Math.hypot(a.w, a.h) * 1.05;
    const box = mk(root, { left: px(a.x), top: px(a.y), width: px(a.w), height: px(a.h) }), content = mk(box, { left: 0, top: 0, width: '100%', height: '100%' }, o.html ?? ''), lamp = mk(root, { left: px(cxp - Rm * 0.15), top: px(cyp - Rm * 0.15), width: px(Rm * 0.3), height: px(Rm * 0.3), borderRadius: '50%', background: 'radial-gradient(#fff, var(--kit-accent) 35%, transparent 70%)', filter: `blur(${10 * K.u}px)` });
    const ease = ez(o.ease ?? 'power2.inOut');
    return { el: root, content, end: at + dur, set(t) {
      const p = ease(K.seg(t, at, at + dur)), r = Rm * p, m = `radial-gradient(circle ${px(Math.max(1, r))} at ${px(cxp - a.x)} ${px(cyp - a.y)}, #000 ${n3(60)}%, transparent 100%)`;
      content.style.maskImage = content.style.webkitMaskImage = m; lamp.style.opacity = n3(0.9 * (1 - K.seg(p, 0.6, 1))); lamp.style.transform = `scale(${n3(0.5 + 4 * p)})`;
    } };
  };
})();
