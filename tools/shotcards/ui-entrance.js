// Shotcards B, UI entrance: 17 video-shotcraft cards (18 helpers) as pure functions of t (ideas and tuned numbers only; the code is ours).
// Loaded after tools/engine.js (pvk: ../../../tools/shotcards/ui-entrance.js; HyperFrames: kit/shotcards/ui-entrance.js).
// KIT.shotcards.<name>({ parent = KIT.stage, box = KIT.safe, at = 0, dur, ... }) → { el, end, set(t) }. DOM is built once; set(t) only
// writes styles from t (no clocks, no Math.random: seeded rng at build, no state between calls). Build after fonts and layout.
//   avatarBracketCarousel   avatars on a carousel, [ ] brackets snapping onto the centre one
//   bezierConverge          sources fly along Béziers and merge into one node
//   cardStack               a fanned stack whose top card is flung off and goes to the bottom
//   clonerDepthEcho         an element and time-lagged, shrinking, fading echoes of it
//   deckDealFlyin           a pile deals out with accelerating gaps, then the deck orbits open
//   contactShadowLift       an element lifts and its contact shadow grows soft
//   integrationHubMap       logo tiles around a hub, connectors drawn, tiles lit in order
//   listStackPress          list rows compress and release under a press
//   neonFrameForerun        a bright runner circles a frame, the neon outline trailing it
//   neonFrameOrbitDrop      a dot orbits a frame, then drops into the middle and lights it
//   pageWaterfallWall       columns of cards scrolling at different speeds and directions
//   productCardProgressive  a skeleton card filled in part by part
//   radialWave              a ripple from the centre pops a ring of chips as it passes them
//   researchCardStackScroll a card stack that spreads into a list and scrolls
//   rowEmbed                a list row grows to embed a card
//   valueStaggerGradient    values count up in turn, colour following the value
//   bentoLightUp / wireframeDrawOn   wall reveals
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('shotcards/ui-entrance.js: load tools/engine.js first');
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
  const card = (parent, w, h, css) => mk(parent, Object.assign({ width: px(w), height: px(h), background: 'var(--kit-surface)', borderRadius: 'var(--kit-radius)', boxSizing: 'border-box', border: `${Math.max(1, 2 * K.u)}px solid rgba(255,255,255,.1)`, boxShadow: 'var(--kit-shadow)' }, css));
  const ring = (i, r, n) => { const d = (((i - r) % n) + n) % n; return d > n / 2 ? d - n : d; };
  const reelPos = (t, at, every, move, ease, last) => { const j = Math.floor((t - at) / every); return j < 0 ? 0 : j >= last ? last : j + ease(K.seg(t - at - j * every, every - move, every)); };
  const COLORS = ['#6ee7b7', '#93c5fd', '#fca5a5', '#fcd34d', '#c4b5fd', '#f9a8d4', '#86efac', '#fdba74'];
  const hsl = (h, s, l) => `hsl(${n3(h)},${n3(s)}%,${n3(l)}%)`;
  const pa = (a, c) => ({ x: a.x + a.w * c[0], y: a.y + a.h * c[1] });   // fractional point in an area

  // ── avatarBracketCarousel: avatars = [{ label, color }]; every `every` seconds the row moves one place (ring carousel, overshoot), the
  // centre avatar grows and the two [ ] brackets pinch in on it and settle open again.
  S.avatarBracketCarousel = (o) => {
    const A = o.avatars, n = A.length, d = o.size ?? 130 * K.u, pitch = d * 1.35, at = o.at ?? 0, every = o.every ?? K.dur(0.9), move = Math.min(o.move ?? K.dur(0.5), every), ease = ez(o.ease ?? 'back.out(1.3)');
    const root = wrap(o.parent), X = o.x ?? K.W_ / 2, Y = o.y ?? K.H_ / 2, last = o.loop === false ? n - 1 : Infinity;
    const els = A.map((a, i) => mk(root, Object.assign(txt(d * 0.38, { width: px(d), height: px(d), borderRadius: '50%', textAlign: 'center', lineHeight: px(d), background: a.color ?? COLORS[i % COLORS.length], color: '#0f1115' }), { top: px(Y - d / 2) }), esc(a.label ?? String(i + 1))));
    const br = [-1, 1].map((s) => mk(root, Object.assign(txt(d * 1.3, { color: 'var(--kit-accent)', fontWeight: 300 }), { top: px(Y - d * 0.78) }), s < 0 ? '[' : ']'));
    return { el: root, end: at + n * every, set(t) {
      const r = reelPos(t, at, every, move, ease, last), j = Math.floor((t - at) / every), loc = (t - at) - j * every;
      els.forEach((e, i) => { const dd = ring(i, r, n), a = 1 - Math.min(1, Math.abs(dd)); e.style.left = px(X + dd * pitch - d / 2); e.style.transform = `scale(${n3(0.7 + 0.5 * a)})`; e.style.opacity = Math.abs(dd) > 3.2 ? 0 : n3(1 - 0.25 * (1 - a)); });
      const pinch = j >= 0 && j < last ? Math.sin(Math.PI * K.seg(loc, every - move, every)) : 0, gap = d * 0.72 - pinch * d * 0.1;
      br.forEach((e, k) => { e.style.left = px(X + (k ? gap : -gap) - d * 0.2); });
    } };
  };

  // ── bezierConverge: sources = [{ x, y, label }] (default: four around the area) each send a chip along its own curve (a Bézier whose
  // control point is pushed sideways by `curve` × the distance) to `target`; the trails draw, the chips shrink into the target, a ring
  // pulses and the merged result (opts.result) pops.
  S.bezierConverge = (o) => {
    const a = area(o), T = o.target ?? pa(a, [0.5, 0.5]), at = o.at ?? 0, dur = o.dur ?? K.dur(1), st = o.stagger ?? K.dur(0.12), curve = o.curve ?? 0.3, size = o.size ?? 56 * K.u, ease = ez(o.ease ?? 'power2.inOut');
    const src = o.sources ?? [[0.08, 0.15], [0.1, 0.85], [0.9, 0.15], [0.92, 0.85]].map((c, i) => Object.assign(pa(a, c), { label: ['A', 'B', 'C', 'D'][i] }));
    const root = wrap(o.parent), sv = svgBox(root), C = (s, k) => ({ x: (s.x + T.x) / 2 - (T.y - s.y) * curve * k, y: (s.y + T.y) / 2 + (T.x - s.x) * curve * k });
    const P = src.map((s, i) => { const c = C(s, i % 2 ? 1 : -1);
      return { s, c, path: se(sv, 'path', { d: `M ${s.x} ${s.y} Q ${c.x} ${c.y} ${T.x} ${T.y}`, fill: 'none', stroke: COLORS[i % 8], 'stroke-width': Math.max(2, 3 * K.u), pathLength: 1, 'stroke-dasharray': '1 1', opacity: 0.8 }),
        chip: mk(root, txt(size * 0.45, { width: px(size), height: px(size), borderRadius: '50%', background: COLORS[i % 8], color: '#0f1115', textAlign: 'center', lineHeight: px(size) }), esc(s.label ?? '')), a: at + i * st }; });
    const tM = at + (src.length - 1) * st + dur, rp = mk(root, { left: px(T.x), top: px(T.y), width: px(size * 3), height: px(size * 3), marginLeft: px(-size * 1.5), marginTop: px(-size * 1.5), borderRadius: '50%', border: `${Math.max(2, 3 * K.u)}px solid var(--kit-accent)` });
    const res = mk(root, txt(size * 0.5, { left: px(T.x), top: px(T.y), padding: `${size * 0.3}px ${size * 0.6}px`, borderRadius: size + 'px', background: 'var(--kit-accent)', color: 'var(--kit-on-accent)', fontWeight: 700 }), esc(o.result ?? 'Merged'));
    const pop = K.easing('back.out(2)');
    return { el: root, end: tM + 0.6, set(t) {
      for (const q of P) {
        const p = ease(K.seg(t, q.a, q.a + dur)), u = 1 - p, x = u * u * q.s.x + 2 * u * p * q.c.x + p * p * T.x, y = u * u * q.s.y + 2 * u * p * q.c.y + p * p * T.y;
        q.path.setAttribute('stroke-dashoffset', n3(1 - p)); q.path.setAttribute('opacity', n3(0.8 * (1 - K.seg(t, tM, tM + 0.3))));
        q.chip.style.left = px(x - size / 2); q.chip.style.top = px(y - size / 2); q.chip.style.opacity = n3(K.seg(t, q.a, q.a + 0.1) * (1 - K.seg(p, 0.9, 1))); q.chip.style.transform = `scale(${n3(1 - 0.4 * p)})`;
      }
      const r = K.seg(t, tM, tM + 0.5); rp.style.transform = `scale(${n3(K.E.out(r))})`; rp.style.opacity = n3(t >= tM ? 1 - r : 0);
      const s = pop(K.seg(t, tM, tM + 0.4)); res.style.transform = `translate(-50%,-50%) scale(${n3(s)})`; res.style.opacity = s > 0 ? 1 : 0;
    } };
  };

  // ── cardStack: cards = [text]; a fanned stack (each card a little lower, smaller and tilted); every `every` seconds the top card is
  // thrown to the right and slips under the stack while the rest move up one place.
  S.cardStack = (o) => {
    const C = o.cards, n = C.length, w = o.w ?? 460 * K.u, h = o.h ?? 280 * K.u, at = o.at ?? 0, every = o.every ?? K.dur(1), move = Math.min(o.move ?? K.dur(0.7), every), ease = ez(o.ease ?? 'power3.inOut');
    const root = wrap(o.parent), X = o.x ?? K.W_ / 2, Y = o.y ?? K.H_ / 2, r = rng(o.seed ?? 4), dx = w * 0.04, dy = h * 0.07;
    const els = C.map((c, i) => { const e = card(root, w, h, txt(h * 0.14, { padding: px(h * 0.12), whiteSpace: 'normal', background: `linear-gradient(135deg, var(--kit-surface), ${COLORS[i % 8]}22)` })); e.innerHTML = esc(c); return { e, tilt: (r() - 0.5) * 6 }; });
    return { el: root, end: at + n * every, set(t) {
      const k = Math.floor((t - at) / every), f = k < 0 ? 0 : ease(K.seg(t - at - k * every, every - move, every)), kk = Math.max(0, k);
      els.forEach((c, i) => {
        const s = (((i - kk) % n) + n) % n;   // slot at the start of the step; 0 = top
        let q = s - (s ? f : 0), x = 0, rot = c.tilt * Math.min(q, 1), z = n - s;
        if (!s) { q = f < 0.5 ? 0 : (n - 1) * K.seg(f, 0.5, 1); x = Math.sin(Math.PI * f) * w * 0.9; rot = Math.sin(Math.PI * f) * 14; z = f < 0.5 ? n + 1 : 0; }
        c.e.style.zIndex = z; c.e.style.opacity = n3(1 - 0.5 * K.seg(q, 3, 5));
        c.e.style.transform = `translate(${px(X - w / 2 + x + q * dx)},${px(Y - h / 2 + q * dy)}) scale(${n3(1 - 0.05 * q)}) rotate(${n3(rot)}deg)`;
        c.e.style.left = 0; c.e.style.top = 0;
      });
    } };
  };

  // ── clonerDepthEcho: el (absolutely positioned) is the lead; `echoes` deep clones follow the same pose(t) = { x, y, s, r } (offsets in
  // px, scale, degrees) lagged by `lag` seconds each, smaller, softer and fainter with depth. pose defaults to a figure-eight drift.
  S.clonerDepthEcho = (o) => {
    const lead = o.el, n = o.echoes ?? 5, lag = o.lag ?? 0.09, par = lead.parentNode, at = o.at ?? 0, dur = o.dur ?? K.dur(2);
    const pose = o.pose ?? ((t) => { const p = K.seg(t, at, at + dur) * 2 * Math.PI; return { x: Math.sin(p) * K.W_ * 0.18, y: Math.sin(2 * p) * K.H_ * 0.12, s: 1, r: Math.sin(p) * 8 }; });
    const cl = Array.from({ length: n }, (_, i) => { const c = lead.cloneNode(true); c.removeAttribute('id'); par.insertBefore(c, lead); return c; });
    const put = (e, p, i) => { e.style.transform = `translate(${px(p.x)},${px(p.y)}) rotate(${n3(p.r)}deg) scale(${n3(p.s * (1 - 0.07 * i))})`; e.style.opacity = n3(Math.pow(1 - i / (n + 1), 1.6)); e.style.filter = i ? `blur(${n3(i * 1.2 * K.u)}px)` : 'none'; };
    return { el: lead, echoes: cl, end: at + dur + n * lag, set(t) { put(lead, pose(t), 0); cl.forEach((c, i) => put(c, pose(t - (i + 1) * lag), i + 1)); } };
  };

  // ── deckDealFlyin: `cards` (a count or labels) sit in a pile; they are dealt to a grid with accelerating gaps (each gap × `accel`),
  // each flipping face-up and landing with a little overshoot; then the deck orbits open into a rotating ring (`orbit: false` to stay in the grid).
  S.deckDealFlyin = (o) => {
    const L = Array.isArray(o.cards) ? o.cards : Array.from({ length: o.cards ?? 8 }, (_, i) => String(i + 1)), n = L.length, a = area(o), w = o.w ?? 130 * K.u, h = w * 1.4, at = o.at ?? 0;
    const gap0 = o.gap ?? K.dur(0.35), accel = o.accel ?? 0.82, fly = o.fly ?? K.dur(0.6), root = wrap(o.parent), r = rng(o.seed ?? 6), ease = ez(o.ease ?? 'back.out(1.1)'), orbit = o.orbit !== false;
    const pile = o.pile ?? pa(a, [0.12, 0.5]), cols = o.cols ?? Math.ceil(n / 2), rows = Math.ceil(n / cols), cell = [(a.w * 0.8) / cols, Math.min(h * 1.15, (a.h * 0.9) / rows)];
    const gridPt = (i) => ({ x: a.x + a.w * 0.14 + (i % cols + 0.5) * cell[0] + a.w * 0.06, y: a.y + a.h / 2 + (Math.floor(i / cols) - (rows - 1) / 2) * cell[1] });
    const times = []; let tt = at; for (let i = 0; i < n; i++) { times.push(tt); tt += gap0 * Math.pow(accel, i); }
    const tOrbit = tt + fly, orbDur = o.open ?? K.dur(1.2), R = Math.min(a.w, a.h) * 0.4, C = pa(a, [0.5, 0.5]);
    const jit = L.map(() => [(r() - 0.5) * 8, (r() - 0.5) * 8, (r() - 0.5) * 8]);
    const els = L.map((l, i) => { const e = card(root, w, h, txt(w * 0.4, { textAlign: 'center', lineHeight: px(h), background: `linear-gradient(160deg, ${COLORS[i % 8]}, var(--kit-surface))`, left: 0, top: 0 })); e.innerHTML = esc(l); return e; });
    return { el: root, end: tOrbit + (orbit ? orbDur : 0), set(t) {
      const spin = orbit ? 2 * Math.PI * 0.12 * Math.max(0, t - tOrbit) : 0, eo = orbit ? K.easing('power3.inOut')(K.seg(t, tOrbit, tOrbit + orbDur)) : 0;
      els.forEach((e, i) => {
        const p = ease(K.seg(t, times[i], times[i] + fly)), g = gridPt(i), ang = (2 * Math.PI * i) / n + spin, rp = { x: C.x + R * Math.cos(ang), y: C.y + R * Math.sin(ang) * 0.7 };
        const px_ = K.lerp(pile.x + jit[i][0], K.lerp(g.x, rp.x, eo), p), py_ = K.lerp(pile.y + jit[i][1], K.lerp(g.y, rp.y, eo), p) - Math.sin(Math.PI * K.clamp(p)) * h * 0.4;
        e.style.zIndex = n - i; e.style.transform = `translate(${px(px_ - w / 2)},${px(py_ - h / 2)}) rotateY(${n3(180 * (1 - K.clamp(p * 1.4)))}deg) rotate(${n3(K.lerp(jit[i][2], (i % 3 - 1) * 4, p))}deg)`;
        e.style.backfaceVisibility = 'hidden'; e.style.opacity = t >= times[i] - 0.001 || i === 0 ? 1 : 0.999;
      });
    } };
  };

  // ── contactShadowLift: an element (opts.el, or a default card) lifts `lift` px, hangs, and settles back with a bounce; its contact
  // shadow (a flat ellipse under it) spreads, softens and fades as the height grows, and sharpens again on landing.
  S.contactShadowLift = (o) => {
    const root = wrap(o.parent), w = o.w ?? 300 * K.u, h = o.h ?? 180 * K.u, X = o.x ?? K.W_ / 2, Y = o.y ?? K.H_ / 2, lift = o.lift ?? 90 * K.u, at = o.at ?? 0, up = o.up ?? K.dur(0.5), hang = o.hang ?? K.dur(0.5), down = o.down ?? K.dur(0.7);
    const sh = mk(root, { left: px(X - w / 2), top: px(Y + h / 2 - h * 0.08), width: px(w), height: px(h * 0.16), borderRadius: '50%', background: '#000' });
    const el = o.el ?? card(root, w, h, txt(h * 0.2, { textAlign: 'center', lineHeight: px(h) })), bounce = K.easing('bounce.out'), out = K.easing('power3.out');
    if (!o.el) { el.textContent = o.text ?? 'Lift'; K.css(el, { left: px(X - w / 2), top: px(Y - h / 2) }); }
    const height = (t) => lift * (K.seg(t, at, at + up) < 1 ? out(K.seg(t, at, at + up)) : 1 - bounce(K.seg(t, at + up + hang, at + up + hang + down)));
    return { el: root, end: at + up + hang + down, height, set(t) {
      const hh = height(t), q = hh / lift;
      el.style.transform = `translateY(${px(-hh)}) scale(${n3(1 + 0.04 * q)})`;
      K.css(sh, { transform: `scale(${n3(1 - 0.25 * q)},${n3(1 - 0.15 * q)})`, filter: `blur(${n3((6 + 22 * q) * K.u)}px)`, opacity: n3(0.55 - 0.3 * q) });
    } };
  };

  // ── integrationHubMap: a hub tile in the middle, `nodes` ([{ label, color }]) on a circle around it; connectors draw from the hub, the
  // tile pops and lights (accent border + glow) at its time. times = [s…] (e.g. KIT.W of the narration) or evenly spaced from `at`.
  S.integrationHubMap = (o) => {
    const N = o.nodes, n = N.length, a = area(o), C = pa(a, [0.5, 0.5]), R = o.radius ?? Math.min(a.w, a.h) * 0.38, at = o.at ?? 0, per = o.per ?? K.dur(0.35), tile = o.tile ?? 96 * K.u;
    const times = o.times ?? N.map((_, i) => at + K.dur(0.5) + i * per), root = wrap(o.parent), sv = svgBox(root), pop = K.easing('back.out(2)');
    const hub = mk(root, txt(tile * 0.3, { left: px(C.x - tile * 0.75), top: px(C.y - tile * 0.75), width: px(tile * 1.5), height: px(tile * 1.5), borderRadius: '50%', background: 'var(--kit-accent)', color: 'var(--kit-on-accent)', textAlign: 'center', lineHeight: px(tile * 1.5), fontWeight: 800 }), esc(o.hub ?? 'Hub'));
    const P = N.map((nd, i) => { const ang = -Math.PI / 2 + (2 * Math.PI * i) / n, x = C.x + R * Math.cos(ang) * 1.25, y = C.y + R * Math.sin(ang);
      const line = se(sv, 'line', { x1: C.x, y1: C.y, x2: x, y2: y, stroke: 'var(--kit-muted)', 'stroke-width': Math.max(2, 3 * K.u), pathLength: 1, 'stroke-dasharray': '1 1' });
      const t = card(root, tile, tile, txt(tile * 0.2, { left: px(x - tile / 2), top: px(y - tile / 2), textAlign: 'center', lineHeight: px(tile), background: nd.color ?? COLORS[i % 8], color: '#0f1115' })); t.innerHTML = esc(nd.label ?? '');
      return { line, t, a: times[i] }; });
    return { el: root, end: Math.max(...times) + 0.6, set(t) {
      hub.style.transform = `scale(${n3(pop(K.seg(t, at, at + 0.4)))})`;
      for (const p of P) {
        p.line.setAttribute('stroke-dashoffset', n3(1 - K.E.out(K.seg(t, p.a - 0.25, p.a + 0.1)))); const s = pop(K.seg(t, p.a, p.a + 0.35)), lit = 1 - K.seg(t, p.a + 0.3, p.a + 0.9);
        p.line.setAttribute('stroke', t >= p.a ? 'var(--kit-accent)' : 'var(--kit-muted)');
        p.t.style.transform = `scale(${n3(s)})`; p.t.style.opacity = s > 0 ? 1 : 0; p.t.style.boxShadow = `0 0 ${n3(36 * lit * K.u)}px var(--kit-accent)`;
      }
    } };
  };

  // ── listStackPress: rows = [text] stacked; at `pressAt` a finger dot taps row `row`: that row sinks (scale), its neighbours are drawn
  // towards it and squash (the stack compresses), then everything springs back with an overshoot (a closed-form spring).
  S.listStackPress = (o) => {
    const R = o.rows, n = R.length, w = o.w ?? 600 * K.u, h = o.rowH ?? 84 * K.u, gap = h * 0.14, X = o.x ?? K.W_ / 2, Y = (o.y ?? K.H_ / 2) - (n * (h + gap)) / 2, row = o.row ?? 1, at = o.at ?? 0, hold = o.hold ?? K.dur(0.5), inT = K.dur(0.18);
    const root = wrap(o.parent), sp = K.spring({ mass: 1, damping: 9, stiffness: 160 }), tPress = at + K.dur(0.4), tRel = tPress + inT + hold;
    const els = R.map((r, i) => { const e = card(root, w, h, txt(h * 0.34, { left: px(X - w / 2), padding: `0 ${px(h * 0.4)}`, lineHeight: px(h) })); e.innerHTML = esc(r); return e; });
    const fing = mk(root, { width: px(h * 0.7), height: px(h * 0.7), borderRadius: '50%', background: 'rgba(255,255,255,.35)', border: '2px solid #fff' });
    return { el: root, end: tRel + 0.8, set(t) {
      const dn = K.E.out(K.seg(t, tPress, tPress + inT)), rel = t < tRel ? 0 : sp((t - tRel) * 4), p = t < tRel ? dn : 1 - rel;   // 1 = fully pressed, springs past 0 on release
      els.forEach((e, i) => { const d = i - row, near = Math.exp(-Math.abs(d) * 0.9);
        const enter = K.E.out(K.seg(t, at + i * K.staggerStep, at + i * K.staggerStep + K.dur(0.4)));
        e.style.top = px(Y + i * (h + gap) - (1 - enter) * 30 * K.u + (d ? -Math.sign(d) * p * h * 0.1 * near : 0) * 1); e.style.opacity = n3(enter);
        e.style.transform = `scale(${n3(1 - p * (d ? 0.03 * near : 0.07))},${n3(1 - p * (d ? 0.05 * near : 0.12))})`; });
      const fy = Y + row * (h + gap) + h / 2, fp = K.seg(t, at + K.dur(0.1), tPress);
      K.css(fing, { left: px(X + w * 0.28 - h * 0.35), top: px(fy - h * 0.35 + (1 - K.E.out(fp)) * h * 0.9), opacity: n3(fp * (1 - K.seg(t, tRel, tRel + 0.25))), transform: `scale(${n3(1 - 0.3 * dn)})` });
    } };
  };

  // rounded-rect perimeter parameter p (0..1, clockwise from the top-left) → point
  const onRect = (rc, p) => { const per = 2 * (rc.w + rc.h), s = (((p % 1) + 1) % 1) * per; if (s < rc.w) return { x: rc.x + s, y: rc.y }; if (s < rc.w + rc.h) return { x: rc.x + rc.w, y: rc.y + s - rc.w }; if (s < 2 * rc.w + rc.h) return { x: rc.x + rc.w - (s - rc.w - rc.h), y: rc.y + rc.h }; return { x: rc.x, y: rc.y + rc.h - (s - 2 * rc.w - rc.h) }; };
  const frameBox = (o) => { const a = area(o), w = a.w * 0.5, h = a.h * 0.5; return o.rect ?? { x: a.x + (a.w - w) / 2, y: a.y + (a.h - h) / 2, w, h }; };
  const neon = (root, rc, color, r) => {
    const sv = svgBox(root); sv.style.filter = `drop-shadow(0 0 ${8 * K.u}px ${color}) drop-shadow(0 0 ${20 * K.u}px ${color})`;
    const mkr = (stroke, sw) => se(sv, 'rect', { x: rc.x, y: rc.y, width: rc.w, height: rc.h, rx: r, fill: 'none', stroke, 'stroke-width': sw, pathLength: 1, 'stroke-linecap': 'round' });
    return { sv, mkr };
  };
  // neonFrameForerun: a short bright runner circles the frame once (rect, default: the middle of the area); the neon outline is drawn
  // behind it with a lag, and once closed it pulses once.
  S.neonFrameForerun = (o) => {
    const rc = frameBox(o), color = o.color ?? 'var(--kit-accent)', at = o.at ?? 0, dur = o.dur ?? K.dur(1.6), lag = o.lag ?? 0.12, root = wrap(o.parent), sw = Math.max(3, 5 * K.u), { sv, mkr } = neon(root, rc, color, 12 * K.u);
    const trail = mkr(color, sw), head = mkr('#fff', sw * 1.3), ease = K.easing('power2.inOut');
    return { el: root, end: at + dur + 0.5, set(t) {
      const h = ease(K.seg(t, at, at + dur)), tr = ease(K.seg(t, at + lag, at + dur)), len = 0.04;
      trail.setAttribute('stroke-dasharray', `${n3(tr)} 1`); head.setAttribute('stroke-dasharray', `${len} 1`); head.setAttribute('stroke-dashoffset', n3(-(h - len)));
      head.setAttribute('opacity', h > 0 && h < 1 ? 1 : 0); sv.style.opacity = n3(K.seg(t, at, at + 0.05) * (1 + 0.25 * Math.sin(Math.PI * K.seg(t, at + dur, at + dur + 0.5))));
    } };
  };
  // neonFrameOrbitDrop: a dot orbits the frame `laps` times (a fading tail behind it), then drops into the middle with a bounce; the frame
  // lights up in full when it lands.
  S.neonFrameOrbitDrop = (o) => {
    const rc = frameBox(o), color = o.color ?? 'var(--kit-accent)', at = o.at ?? 0, laps = o.laps ?? 2, orbit = o.orbit ?? K.dur(1.8), drop = o.drop ?? K.dur(0.7), root = wrap(o.parent), sw = Math.max(3, 5 * K.u), { sv, mkr } = neon(root, rc, color, 12 * K.u);
    const frame = mkr(color, sw), tail = mkr('#fff', sw * 1.2), dot = mk(root, { width: px(24 * K.u), height: px(24 * K.u), borderRadius: '50%', background: '#fff', boxShadow: `0 0 ${20 * K.u}px ${color}` });
    const C = { x: rc.x + rc.w / 2, y: rc.y + rc.h / 2 }, tD = at + orbit, bounce = K.easing('bounce.out'), lin = K.easing('power1.inOut');
    return { el: root, end: tD + drop + 0.5, set(t) {
      const p = laps * lin(K.seg(t, at, tD)), q = p % 1, on = t >= at && t < tD, d = K.seg(t, tD, tD + drop), pt = onRect(rc, p);
      tail.setAttribute('stroke-dasharray', '0.2 1'); tail.setAttribute('stroke-dashoffset', n3(-(q - 0.2))); tail.setAttribute('opacity', on ? 0.9 : 0);
      frame.setAttribute('opacity', n3(0.15 + 0.85 * K.seg(t, tD + drop * 0.6, tD + drop + 0.25))); sv.style.opacity = n3(K.seg(t, at, at + 0.1));
      const x = on ? pt.x : C.x, y = on ? pt.y : K.lerp(pt.y, C.y, bounce(d)); K.css(dot, { left: px(x - 12 * K.u), top: px(y - 12 * K.u), transform: `scale(${n3(t >= tD + drop ? 1 + 1.5 * Math.max(0, 1 - (t - tD - drop) / 0.2) : 1)})`, opacity: n3(K.seg(t, at, at + 0.1)) });
    } };
  };

  // ── pageWaterfallWall: `cols` columns of tall cards scrolling endlessly, even columns up and odd ones down at different speeds
  // (px/s, seeded), the whole wall tilted; columns enter one after another. seed changes heights and speeds, never frame to frame.
  S.pageWaterfallWall = (o) => {
    const a = o.box ?? { x: 0, y: 0, w: K.W_, h: K.H_ }, cols = o.cols ?? 5, gap = 18 * K.u, cw = (a.w * 1.15 - gap * (cols - 1)) / cols, at = o.at ?? 0, r = rng(o.seed ?? 8), root = wrap(o.parent);
    const clip = mk(root, { left: px(a.x), top: px(a.y), width: px(a.w), height: px(a.h), overflow: 'hidden' }), wall = mk(clip, { left: 0, top: 0, width: '100%', height: '100%', transform: `rotate(${o.tilt ?? -6}deg) scale(1.2)` });
    const C = Array.from({ length: cols }, (_, c) => {
      const hs = Array.from({ length: 6 }, () => (0.18 + r() * 0.22) * a.h), total = hs.reduce((s, h) => s + h + gap, 0), reps = Math.ceil((a.h * 1.6) / total) + 1, col = mk(wall, { left: px(c * (cw + gap) - a.w * 0.1), top: 0, width: px(cw), height: px(total * reps) });
      for (let k = 0; k < reps * 6; k++) { const i = k % 6, y = Math.floor(k / 6) * total + hs.slice(0, i).reduce((s, h) => s + h + gap, 0); card(col, cw, hs[i], { top: px(y), background: `linear-gradient(160deg, ${COLORS[(c * 2 + i) % 8]}55, var(--kit-surface))` }); }
      return { col, total, v: (o.speed ?? 70 * K.u) * (0.6 + r() * 0.8) * (c % 2 ? 1 : -1), a: at + c * K.dur(0.12) };
    });
    return { el: root, end: at + (o.dur ?? K.dur(3)), set(t) { C.forEach((c) => {
      const y = (((c.v * (t - at)) % c.total) + c.total) % c.total - c.total; c.col.style.transform = `translateY(${px(y)})`; const e = K.E.out(K.seg(t, c.a, c.a + K.dur(0.5))); c.col.style.opacity = n3(e); c.col.style.marginTop = px((1 - e) * 80 * K.u * (c.v < 0 ? 1 : -1)); }); } };
  };

  // ── productCardProgressive: a skeleton card (grey blocks with a moving shimmer) is filled part by part: image wipes in from the top,
  // the title types on, the price pops, the button fills. parts = { title, price, button }.
  S.productCardProgressive = (o) => {
    const w = o.w ?? 420 * K.u, h = w * 1.25, X = o.x ?? K.W_ / 2, Y = o.y ?? K.H_ / 2, at = o.at ?? 0, per = o.per ?? K.dur(0.5), gapT = o.gap ?? K.dur(0.35), root = wrap(o.parent), pad = w * 0.06;
    const c = card(root, w, h, { left: px(X - w / 2), top: px(Y - h / 2), overflow: 'hidden' }), sk = 'rgba(255,255,255,.08)';
    const blocks = (rc) => { const b = mk(c, Object.assign({ background: sk, borderRadius: px(10 * K.u), overflow: 'hidden' }, rc)); const sh = mk(b, { top: 0, left: 0, width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent)' }); return { b, sh }; };
    const img = blocks({ left: px(pad), top: px(pad), width: px(w - 2 * pad), height: px(h * 0.52) }), title = blocks({ left: px(pad), top: px(h * 0.52 + pad * 1.6), width: px(w * 0.7), height: px(h * 0.07) }),
      price = blocks({ left: px(pad), top: px(h * 0.52 + pad * 1.6 + h * 0.1), width: px(w * 0.3), height: px(h * 0.07) }), btn = blocks({ left: px(pad), top: px(h - pad - h * 0.1), width: px(w - 2 * pad), height: px(h * 0.1) });
    const fillImg = mk(img.b, { left: 0, top: 0, width: '100%', height: '100%', background: `linear-gradient(135deg, ${COLORS[1]}, ${COLORS[4]})` });
    const fillTitle = mk(title.b, txt(h * 0.055, { left: 0, top: 0, width: '100%', lineHeight: px(h * 0.07), background: 'var(--kit-surface)' }), esc(o.title ?? 'Aurora lamp'));
    const fillPrice = mk(price.b, txt(h * 0.055, { left: 0, top: 0, width: '100%', lineHeight: px(h * 0.07), color: 'var(--kit-accent)', background: 'var(--kit-surface)', fontWeight: 800 }), esc(o.price ?? '$49'));
    const fillBtn = mk(btn.b, txt(h * 0.04, { left: 0, top: 0, width: '100%', height: '100%', textAlign: 'center', lineHeight: px(h * 0.1), background: 'var(--kit-accent)', color: 'var(--kit-on-accent)', fontWeight: 800 }), esc(o.button ?? 'Add to cart'));
    const T = [0, 1, 2, 3].map((i) => at + K.dur(0.5) + i * gapT), pop = K.easing('back.out(2)'), ease = ez(o.ease ?? 'power2.out');
    return { el: root, end: T[3] + per, set(t) {
      for (const b of [img, title, price, btn]) b.sh.style.transform = `translateX(${n3(-100 + 350 * ((((t - at) / 1.2) % 1 + 1) % 1))}%)`;
      fillImg.style.clipPath = `inset(0 0 ${n3(100 * (1 - ease(K.seg(t, T[0], T[0] + per))))}% 0)`;
      fillTitle.style.clipPath = `inset(0 ${n3(100 * (1 - ease(K.seg(t, T[1], T[1] + per))))}% 0 0)`;
      fillPrice.style.transform = `scale(${n3(pop(K.seg(t, T[2], T[2] + per * 0.6)))})`; fillPrice.style.opacity = t >= T[2] ? 1 : 0;
      fillBtn.style.transform = `translateX(${n3(-100 * (1 - ease(K.seg(t, T[3], T[3] + per))))}%)`;
    } };
  };

  // ── radialWave: a ripple expands from the centre at `speed` px/s (three rings, each a beat behind); each chip on the ring of radius
  // `radius` pops when the front reaches it, so chips at different angles/radii arrive in order of distance.
  S.radialWave = (o) => {
    const L = o.items ?? Array.from({ length: o.count ?? 12 }, (_, i) => String(i + 1)), n = L.length, a = area(o), C = o.center ?? pa(a, [0.5, 0.5]), at = o.at ?? 0, speed = o.speed ?? Math.max(a.w, a.h) * 0.45 / K.dur(1), chip = o.chip ?? 78 * K.u;
    const root = wrap(o.parent), rings = [0, 1, 2].map((i) => mk(root, { left: px(C.x), top: px(C.y), width: px(2), height: px(2), borderRadius: '50%', border: `${Math.max(2, 3 * K.u)}px solid var(--kit-accent)` })), pop = K.easing('back.out(2)');
    const R = o.radius ?? Math.min(a.w, a.h) * 0.36, rs = o.rings ?? [R]; const P = L.map((l, i) => { const rad = rs[i % rs.length] * (o.ellipse ?? 1.2), ang = (2 * Math.PI * Math.floor(i / rs.length)) / Math.ceil(n / rs.length) + (i % rs.length) * 0.3 - Math.PI / 2;
      const x = C.x + rad * Math.cos(ang), y = C.y + rad * Math.sin(ang) * 0.85, e = mk(root, txt(chip * 0.34, { left: px(x - chip / 2), top: px(y - chip / 2), width: px(chip), height: px(chip), borderRadius: '30%', background: COLORS[i % 8], color: '#0f1115', textAlign: 'center', lineHeight: px(chip), fontWeight: 800 }), esc(l));
      return { e, a: at + Math.hypot(x - C.x, y - C.y) / speed }; });
    return { el: root, end: Math.max(...P.map((p) => p.a)) + 0.6, set(t) {
      rings.forEach((e, i) => { const r = Math.max(0, (t - at - i * 0.18) * speed), op = t > at + i * 0.18 ? 0.8 * (1 - K.seg(r, 0, Math.max(a.w, a.h) * 0.7)) : 0; K.css(e, { width: px(2 * r), height: px(2 * r), marginLeft: px(-r), marginTop: px(-r), opacity: n3(op) }); });
      for (const p of P) { const s = pop(K.seg(t, p.a, p.a + 0.35)); p.e.style.transform = `scale(${n3(s)})`; p.e.style.opacity = s > 0 ? 1 : 0; }
    } };
  };

  // ── researchCardStackScroll: cards = [{ title, body }] start as one stack; at `spreadAt` they fan out into a column, then the column
  // scrolls up at `speed` px/s (after the spread, cards leaving the top fade). Phase times default to at + 0.5 and spread + 1.2 s.
  S.researchCardStackScroll = (o) => {
    const C = o.cards, n = C.length, w = o.w ?? 560 * K.u, h = o.h ?? 150 * K.u, gap = h * 0.18, X = o.x ?? K.W_ / 2, at = o.at ?? 0, spreadAt = o.spreadAt ?? at + K.dur(0.6), sd = o.spreadDur ?? K.dur(0.9);
    const scrollAt = o.scrollAt ?? spreadAt + sd, speed = o.speed ?? (h + gap) * 0.9, Y0 = K.H_ * 0.2, root = wrap(o.parent), r = rng(o.seed ?? 2), ease = ez(o.ease ?? 'power3.inOut');
    const els = C.map((c, i) => { const e = card(root, w, h, { left: px(X - w / 2), top: 0, padding: px(h * 0.12) }); e.innerHTML = `<div style="font:700 ${h * 0.22}px var(--kit-font-text);color:var(--kit-ink)">${esc(c.title)}</div><div style="margin-top:${h * 0.08}px;font:500 ${h * 0.15}px var(--kit-font-text);color:var(--kit-muted);white-space:normal">${esc(c.body ?? '')}</div>`; return { e, tilt: (r() - 0.5) * 6 }; });
    return { el: root, end: scrollAt + n * 1.2, set(t) { els.forEach((c, i) => {
      const e = ease(K.seg(t, spreadAt + i * K.staggerStep, spreadAt + i * K.staggerStep + sd)), sy = K.H_ / 2 - h / 2 - (n - 1 - i) * 6 * K.u, ly = Y0 + i * (h + gap) - speed * Math.max(0, t - scrollAt);
      const y = K.lerp(sy, ly, e), enter = K.E.out(K.seg(t, at + i * 0.05, at + i * 0.05 + 0.4));
      c.e.style.zIndex = n - i; c.e.style.opacity = n3(enter * (t > scrollAt ? K.clamp((y + h) / (h * 0.8)) : 1)); c.e.style.top = px(y);
      c.e.style.transform = `rotate(${n3(c.tilt * (1 - e))}deg) scale(${n3(K.lerp(1 - 0.03 * (n - 1 - i), 1, e))})`; }); } };
  };

  // ── rowEmbed: rows = [text]; at `at` row `row` grows by the embedded card's height and the card (opts.embed = { title, body }) scales
  // and fades in inside it, pushing the rows below it down; `close: true` shrinks it back after `hold`.
  S.rowEmbed = (o) => {
    const R = o.rows, n = R.length, w = o.w ?? 640 * K.u, h = o.rowH ?? 80 * K.u, eh = o.embedH ?? 170 * K.u, gap = 10 * K.u, row = o.row ?? 1, X = o.x ?? K.W_ / 2, at = o.at ?? 0, dur = o.dur ?? K.dur(0.7), hold = o.hold ?? K.dur(1);
    const total = n * (h + gap) + eh, Y = (o.y ?? K.H_ / 2) - total / 2, root = wrap(o.parent), ease = ez(o.ease ?? 'power3.out'), E = o.embed ?? { title: 'Embedded card', body: 'Grows inside the row.' };
    const els = R.map((r) => { const e = card(root, w, h, txt(h * 0.32, { left: px(X - w / 2), padding: `0 ${px(h * 0.4)}`, lineHeight: px(h), overflow: 'hidden' })); e.innerHTML = esc(r); return e; });
    const emb = card(root, w - h * 0.6, eh - h * 0.2, { left: px(X - w / 2 + h * 0.3), background: 'var(--kit-bg)', padding: px(h * 0.2), overflow: 'hidden' });
    emb.innerHTML = `<div style="font:700 ${h * 0.3}px var(--kit-font-text);color:var(--kit-accent)">${esc(E.title)}</div><div style="margin-top:${h * 0.1}px;font:500 ${h * 0.24}px var(--kit-font-text);color:var(--kit-ink);white-space:normal">${esc(E.body)}</div>`;
    return { el: root, end: at + dur + (o.close ? hold + dur : 0), set(t) {
      const g = ease(K.seg(t, at, at + dur)) * (o.close ? 1 - ease(K.seg(t, at + dur + hold, at + dur + hold + dur)) : 1); let y = Y;
      els.forEach((e, i) => { const hh = h + (i === row ? eh * g : 0); e.style.top = px(y); e.style.height = px(hh); e.style.lineHeight = px(h); if (i === row) K.css(emb, { top: px(y + h + eh * 0.05), opacity: n3(K.seg(g, 0.3, 1)), transform: `scale(${n3(0.92 + 0.08 * g)})`, transformOrigin: 'top center' }); y += hh + gap; });
    } };
  };

  // ── valueStaggerGradient: values = [{ label, value, max }] count up one after another (K.staggerStep apart) as tiles; each tile's
  // colour is read from a ramp (opts.ramp, default red → amber → green) at its *current* value, so the colour climbs with the number.
  S.valueStaggerGradient = (o) => {
    const V = o.values, n = V.length, a = area(o), ramp = o.ramp ?? [[8, 85, 62], [45, 90, 58], [150, 70, 52]], at = o.at ?? 0, dur = o.dur ?? K.dur(1.2), st = o.stagger ?? K.dur(0.25), root = wrap(o.parent), ease = ez(o.ease ?? 'outExpo');
    const cw = Math.min(a.w / n - 20 * K.u, 260 * K.u), h = o.h ?? a.h * 0.5, x0 = a.x + (a.w - n * cw - (n - 1) * 20 * K.u) / 2;
    const col = (p) => { const s = K.clamp(p) * (ramp.length - 1), i = Math.min(ramp.length - 2, Math.floor(s)), f = s - i; return hsl(...[0, 1, 2].map((k) => K.lerp(ramp[i][k], ramp[i + 1][k], f))); };
    const T = V.map((v, i) => { const c = card(root, cw, h, { left: px(x0 + i * (cw + 20 * K.u)), top: px(a.y + (a.h - h) / 2), overflow: 'hidden' });
      const bar = mk(c, { left: 0, bottom: 0, width: '100%', height: '100%', transformOrigin: 'bottom' }), num = mk(c, txt(cw * 0.3, { left: 0, top: '12%', width: '100%', textAlign: 'center', fontWeight: 800, color: '#0f1115' })), lab = mk(c, txt(cw * 0.11, { left: 0, bottom: px(h * 0.05), width: '100%', textAlign: 'center', color: '#0f1115' }), esc(v.label ?? ''));
      return { bar, num, lab, a: at + i * st, v: v.value, m: v.max ?? Math.max(...V.map((x) => x.value)) }; });
    return { el: root, end: at + (n - 1) * st + dur, set(t) { for (const c of T) { const p = ease(K.seg(t, c.a, c.a + dur)), val = c.v * p;
      c.bar.style.transform = `scaleY(${n3(Math.max(0.0001, (val / c.m) * 0.85))})`; c.bar.style.background = col(val / c.m); c.num.textContent = Math.round(val).toLocaleString('en-US') + (o.suffix ?? ''); } } };
  };

  // ── wall reveals. bentoLightUp: a grid of cells (cells = [{ c, r, cs, rs }] on cols × rows, default a 4×3 bento) dim at first and
  // light up in an order ('radial' from the middle, 'row', or 'seed'), each flashing the accent then settling to a tint.
  S.bentoLightUp = (o) => {
    const a = area(o), cols = o.cols ?? 4, rows = o.rows ?? 3, gap = 14 * K.u, cw = (a.w - gap * (cols - 1)) / cols, rh = (a.h - gap * (rows - 1)) / rows, at = o.at ?? 0, per = o.per ?? K.dur(0.5), st = o.stagger ?? K.dur(0.1), root = wrap(o.parent), r = rng(o.seed ?? 12);
    const cells = o.cells ?? [{ c: 0, r: 0, cs: 2, rs: 2 }, { c: 2, r: 0, cs: 1, rs: 1 }, { c: 3, r: 0, cs: 1, rs: 2 }, { c: 2, r: 1, cs: 1, rs: 1 }, { c: 0, r: 2, cs: 1, rs: 1 }, { c: 1, r: 2, cs: 2, rs: 1 }, { c: 3, r: 2, cs: 1, rs: 1 }];
    const order = o.order ?? 'radial', mid = [cols / 2, rows / 2];
    const key = (c) => (order === 'row' ? c.r * cols + c.c : order === 'seed' ? r() : Math.hypot(c.c + c.cs / 2 - mid[0], c.r + c.rs / 2 - mid[1]));
    const items = cells.map((c, i) => ({ c, k: key(c), e: card(root, c.cs * cw + (c.cs - 1) * gap, c.rs * rh + (c.rs - 1) * gap, { left: px(a.x + c.c * (cw + gap)), top: px(a.y + c.r * (rh + gap)), boxShadow: 'none' }), col: COLORS[i % 8] }));
    const rank = items.map((it) => it.k).sort((x, y) => x - y);
    return { el: root, end: at + items.length * st + per, set(t) { for (const it of items) {
      const s = at + rank.indexOf(it.k) * st, p = K.seg(t, s, s + per), flash = Math.sin(Math.PI * Math.min(1, p * 1.6)) * (p < 1 ? 1 : 0);
      it.e.style.background = p <= 0 ? 'rgba(255,255,255,.04)' : `color-mix(in srgb, ${it.col} ${n3(18 + 60 * flash)}%, var(--kit-surface))`; it.e.style.borderColor = p > 0 ? it.col : 'rgba(255,255,255,.08)';
      it.e.style.boxShadow = flash > 0 ? `0 0 ${n3(40 * flash * K.u)}px ${it.col}` : 'none'; it.e.style.transform = `scale(${n3(1 + 0.03 * flash)})`; } } };
  };
  // wireframeDrawOn: boxes = [{ x, y, w, h, lines? }] (default: a page: header, hero, three cards) are drawn as outlines one after another
  // (each rect's stroke runs on via pathLength), their text-placeholder lines draw in, then the whole wireframe washes with colour.
  S.wireframeDrawOn = (o) => {
    const a = area(o), at = o.at ?? 0, per = o.per ?? K.dur(0.45), st = o.stagger ?? K.dur(0.18), root = wrap(o.parent), sv = svgBox(root), sw = Math.max(2, 3 * K.u);
    const B = o.boxes ?? [[0, 0, 1, 0.12, 0], [0, 0.16, 1, 0.44, 2], [0, 0.64, 0.31, 0.36, 3], [0.345, 0.64, 0.31, 0.36, 3], [0.69, 0.64, 0.31, 0.36, 3]].map(([x, y, w, h, l]) => ({ x: a.x + x * a.w, y: a.y + y * a.h, w: w * a.w, h: h * a.h, lines: l }));
    const P = B.map((b, i) => { const rc = se(sv, 'rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 8 * K.u, fill: COLORS[i % 8], 'fill-opacity': 0, stroke: 'var(--kit-ink)', 'stroke-width': sw, pathLength: 1, 'stroke-dasharray': '1 1' });
      const ls = Array.from({ length: b.lines ?? 0 }, (_, k) => se(sv, 'line', { x1: b.x + b.w * 0.08, x2: b.x + b.w * (k ? 0.5 : 0.8), y1: b.y + b.h * (0.3 + k * 0.2), y2: b.y + b.h * (0.3 + k * 0.2), stroke: 'var(--kit-muted)', 'stroke-width': sw, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1' }));
      return { rc, ls, a: at + i * st }; });
    const tW = at + (B.length - 1) * st + per * 1.5, ease = K.easing('power2.out');
    return { el: root, end: tW + K.dur(0.7), set(t) { for (const p of P) {
      p.rc.setAttribute('stroke-dashoffset', n3(1 - ease(K.seg(t, p.a, p.a + per)))); p.rc.setAttribute('fill-opacity', n3(0.5 * K.E.out(K.seg(t, tW, tW + K.dur(0.7)))));
      p.ls.forEach((l, k) => l.setAttribute('stroke-dashoffset', n3(1 - ease(K.seg(t, p.a + per * 0.7 + k * 0.1, p.a + per * 1.4 + k * 0.1))))); } } };
  };
})();
