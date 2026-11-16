// Shotcards B, typography: 14 video-shotcraft cards as pure functions of t (ideas and tuned numbers only; the code is ours).
// Loaded after tools/engine.js (pvk: ../../../tools/shotcards/typography.js; HyperFrames: kit/shotcards/typography.js).
// Every helper is KIT.shotcards.<name>({ parent = KIT.stage, at = 0, dur, ... }) → { el, end, set(t) }: the DOM is built once here,
// set(t) only writes styles from t (no clocks, no Math.random: seeded rng at build, no state between calls). Build after fonts load.
//   textColumnConverge   columns of lines slide in from both sides toward the centre
//   titleDemoteToLabel   a title shrinks, moves and recolours into a label (variant 'A' morph, 'B' hand-over)
//   countdownArcScatter  n..1 inside a draining arc; the last beat scatters
//   flyingWords          words fly along z past the camera (perspective tunnel)
//   gradientWordSweep    a gradient band sweeps word after word
//   leadWordZoomAssemble the lead word fills the frame, then settles while the rest assembles around it
//   outlineWordFill      live text drawn as an outline, then washed with fill
//   pillSlotCycle        a pill whose word rolls through a reel
//   chipRail             several slot chips that settle one by one into a "handled" state
//   splitTextStagger / driftAssembly / textOnPath   type assembly
//   letterDrop           letters fall and bounce (closed form)
//   fontWeightPump / karaokeFill   type that follows beats / spoken words
//   verticalWordRoll     word-level roll with blur through a multi-option cycle
//   wordRelayFilmstrip   words handed along a filmstrip with a fast throw and snap
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('shotcards/typography.js: load tools/engine.js first');
  const S = (K.shotcards = K.shotcards || {});
  const rng = (s) => () => { s = (s + 0x6D2B79F5) | 0; let z = Math.imul(s ^ (s >>> 15), 1 | s); z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z; return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
  const mk = (parent, css, html, tag) => { const e = K.el(tag || 'div', '', parent || K.stage, html || ''); e.style.position = 'absolute'; K.css(e, css || {}); return e; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const sg = (t, a, b, e) => (e || K.ease)(K.seg(t, a, b));
  const ez = (e) => (typeof e === 'function' ? e : e ? K.easing(e) : K.ease);
  const n3 = (v) => +v.toFixed(3);
  const sizeOf = (o) => o.size || 96 * K.u;
  const cx = (o) => o.x ?? K.W_ / 2, cy = (o) => o.y ?? K.H_ / 2;
  const rgb = (c) => (Array.isArray(c) ? c : [1, 3, 5].map((i) => parseInt(String(c).replace('#', '').padEnd(6, '0').slice(i - 1, i + 1), 16)));
  const mixc = (a, b, p) => `rgb(${rgb(a).map((v, i) => Math.round(K.lerp(v, rgb(b)[i], p))).join(',')})`;
  const meas = (parent, text, css) => { const m = mk(parent, Object.assign({ whiteSpace: 'nowrap', visibility: 'hidden' }, css), esc(text)); const w = m.offsetWidth; m.remove(); return w; };
  // signed distance of item i from the reel position r on a ring of n (-n/2 … n/2): an endless carousel
  const ring = (i, r, n) => { const d = (((i - r) % n) + n) % n; return d > n / 2 ? d - n : d; };
  const wrap = (parent) => mk(parent, { left: 0, top: 0, width: K.W_ + 'px', height: K.H_ + 'px', pointerEvents: 'none' });
  const txt = (size) => ({ fontFamily: 'var(--kit-font-display)', fontWeight: 'var(--kit-display-weight)', fontSize: size + 'px', color: 'var(--kit-ink)', whiteSpace: 'nowrap', lineHeight: 1.1 });
  const mid = (o, extra) => Object.assign(txt(sizeOf(o)), { left: cx(o) + 'px', top: cy(o) + 'px', transform: 'translate(-50%,-50%)' }, extra);
  // reel position (in words) at t: step j rolls from word j to word j + 1 during the last `move` seconds of its `every`; stops at `last`
  const reelPos = (t, at, every, move, ease, last) => {
    const j = Math.floor((t - at) / every);
    if (j < 0) return 0;
    if (j >= last) return last;
    return j + ease(K.seg(t - at - j * every, every - move, every));
  };

  // ── textColumnConverge: columns: [[line, …], …]. Left half comes from the left, right half from the right, a middle column
  // rises from below; every column ends side by side around the centre. Lines stagger by KIT.staggerStep.
  S.textColumnConverge = (o) => {
    const cols = o.columns, n = cols.length, size = sizeOf(o) * 0.45, root = wrap(o.parent), at = o.at ?? 0, dur = o.dur ?? K.dur(0.9);
    const colW = o.colW ?? Math.min(K.W_ * 0.9 / n, 420 * K.u), gap = o.gap ?? 24 * K.u, step = o.stagger ?? K.staggerStep, ease = ez(o.ease);
    const x0 = cx(o) - (n * colW + (n - 1) * gap) / 2, lh = size * 1.5, y0 = cy(o) - Math.max(...cols.map((c) => c.length)) * lh / 2;
    const items = cols.flatMap((lines, c) => lines.map((l, i) => {
      const side = c < (n - 1) / 2 ? -1 : c > (n - 1) / 2 ? 1 : 0;
      const e = mk(root, Object.assign(txt(size), { left: x0 + c * (colW + gap) + 'px', top: y0 + i * lh + 'px', width: colW + 'px', textAlign: 'center', fontWeight: 500 }), esc(l));
      return { e, side, a: at + (side ? 0 : step * 2) + i * step };
    }));
    return { el: root, end: Math.max(...items.map((it) => it.a)) + dur, set(t) {
      for (const it of items) {
        const p = ease(K.seg(t, it.a, it.a + dur));
        it.e.style.opacity = n3(p); it.e.style.transform = it.side ? `translateX(${n3((1 - p) * it.side * K.W_ * 0.55)}px)` : `translateY(${n3((1 - p) * 120 * K.u)}px)`;
      }
    } };
  };

  // ── titleDemoteToLabel: from / to = { x, y, size, color } (centre point, font px, colour); measure both boxes once with
  // getBoundingClientRect and pass them in. 'A' morphs one element (translate, size, colour); 'B' hands over: the title drifts up
  // and out while a separate label (opts.label) settles at `to`. A rule under the label draws at the end.
  S.titleDemoteToLabel = (o) => {
    const root = wrap(o.parent), at = o.at ?? 0, dur = o.dur ?? K.dur(0.7), ease = ez(o.ease), F = o.from, T = o.to, B = o.variant === 'B', ruleW = o.rule ?? 120 * K.u;
    const a = mk(root, Object.assign(txt(F.size), { transform: 'translate(-50%,-50%)' }), esc(o.text));
    const b = B ? mk(root, Object.assign(txt(T.size), { color: T.color, transform: 'translate(-50%,-50%)', opacity: 0, letterSpacing: '0.12em', textTransform: 'uppercase' }), esc(o.label ?? o.text)) : null;
    const rule = mk(root, { height: Math.max(2, 3 * K.u) + 'px', background: T.color });
    return { el: root, end: at + dur, set(t) {
      const p = ease(K.seg(t, at, at + dur));
      if (!B) K.css(a, { left: n3(K.lerp(F.x, T.x, p)) + 'px', top: n3(K.lerp(F.y, T.y, p)) + 'px', fontSize: n3(K.lerp(F.size, T.size, p)) + 'px', color: mixc(F.color, T.color, p) });
      else {
        K.css(a, { left: F.x + 'px', top: n3(F.y - p * 0.5 * F.size) + 'px', opacity: n3(1 - K.seg(p, 0, 0.5)), transform: `translate(-50%,-50%) scale(${n3(1 - 0.15 * p)})` });
        K.css(b, { left: T.x + 'px', top: n3(K.lerp(T.y + T.size, T.y, p)) + 'px', opacity: n3(K.seg(p, 0.4, 1)) });
      }
      K.css(rule, { left: T.x - ruleW / 2 + 'px', top: T.y + T.size * 0.8 + 'px', width: n3(ruleW * K.seg(p, 0.7, 1)) + 'px', opacity: n3(K.seg(p, 0.7, 0.8)) });
    } };
  };

  // ── countdownArcScatter: from..1 (or opts.steps strings), `per` seconds each, a ring draining around each digit; after the last,
  // opts.exit (default 'GO') pops, holds a beat, and then every letter and 28 dots scatter outward (seeded).
  S.countdownArcScatter = (o) => {
    const steps = o.steps || Array.from({ length: o.from ?? 3 }, (_, i) => String((o.from ?? 3) - i)), per = o.per ?? K.dur(1), at = o.at ?? 0;
    const size = sizeOf(o) * 1.6, R = o.radius ?? 190 * K.u, root = wrap(o.parent), exit = o.exit ?? 'GO', r = rng(o.seed ?? 5), X = cx(o), Y = cy(o);
    const NS = 'http://www.w3.org/2000/svg', C = 2 * Math.PI * R;
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', 2 * R + 40); svg.setAttribute('height', 2 * R + 40); svg.style.cssText = `position:absolute;left:${X - R - 20}px;top:${Y - R - 20}px;overflow:visible`;
    const track = document.createElementNS(NS, 'circle'), arc = document.createElementNS(NS, 'circle');
    for (const [c, col, op] of [[track, 'var(--kit-muted)', 0.25], [arc, 'var(--kit-accent)', 1]]) { c.setAttribute('cx', R + 20); c.setAttribute('cy', R + 20); c.setAttribute('r', R); c.setAttribute('fill', 'none'); c.setAttribute('stroke', col); c.setAttribute('stroke-width', 10 * K.u); c.setAttribute('opacity', op); svg.appendChild(c); }
    arc.setAttribute('stroke-dasharray', C); arc.setAttribute('transform', `rotate(-90 ${R + 20} ${R + 20})`); arc.setAttribute('stroke-linecap', 'round'); root.appendChild(svg);
    const at0 = { left: X + 'px', top: Y + 'px' };
    const digits = steps.map((s) => mk(root, Object.assign(txt(size), at0, { transform: 'translate(-50%,-50%)' }), esc(s)));
    const exitEl = mk(root, Object.assign(txt(size), at0, { transform: 'translate(-50%,-50%)', display: 'flex' }), '');
    const letters = [...exit].map((ch, i, a) => ({ e: K.el('span', '', exitEl, esc(ch)), dx: (r() - 0.5) * K.W_ * 0.9 + (i - a.length / 2) * 40, dy: (r() - 0.5) * K.H_ * 0.8, rot: (r() - 0.5) * 540 }));
    letters.forEach((l) => { l.e.style.display = 'inline-block'; });
    const dots = Array.from({ length: 28 }, () => ({ e: mk(root, Object.assign({ width: 14 * K.u + 'px', height: 14 * K.u + 'px', borderRadius: '50%', background: 'var(--kit-accent)' }, at0)), a: r() * 6.283, d: (0.3 + r() * 0.7) * K.W_ * 0.45 }));
    const tEx = at + steps.length * per, hold = o.hold ?? per * 0.8, sc = o.scatter ?? K.dur(0.8), pop = K.easing('back.out(2)');
    return { el: root, end: tEx + hold + sc, set(t) {
      const k = Math.min(steps.length - 1, Math.max(0, Math.floor((t - at) / per))), loc = (t - at) / per - k, live = t >= at && t < tEx;
      arc.setAttribute('stroke-dashoffset', n3(C * K.clamp(live ? loc : t < at ? 0 : 1)));
      svg.style.opacity = n3(t < tEx ? 1 : 1 - K.seg(t, tEx, tEx + 0.25));
      digits.forEach((d, i) => { const on = live && i === k, p = K.E.out(K.seg(loc, 0, 0.25)); d.style.opacity = on ? n3(p) : 0; d.style.transform = `translate(-50%,-50%) scale(${n3(on ? 1.35 - 0.35 * p : 1)})`; });
      const q = K.E.out(K.seg(t, tEx + hold, tEx + hold + sc));
      exitEl.style.opacity = t >= tEx ? n3(1 - K.seg(q, 0.4, 1)) : 0; exitEl.style.transform = `translate(-50%,-50%) scale(${n3(pop(K.seg(t, tEx, tEx + 0.18)))})`;
      for (const l of letters) l.e.style.transform = `translate(${n3(l.dx * q)}px,${n3(l.dy * q)}px) rotate(${n3(l.rot * q)}deg)`;
      for (const d of dots) { d.e.style.opacity = t >= tEx + hold ? n3(1 - q) : 0; d.e.style.transform = `translate(${n3(Math.cos(d.a) * d.d * q)}px,${n3(Math.sin(d.a) * d.d * q)}px)`; }
    } };
  };

  // ── flyingWords: words travel along z towards the camera in perspective and pass it (a word tunnel). Each word is offset to a
  // seeded spot off the centre line; it fades in far away and out as it passes. gap = seconds between words, travel = seconds per word.
  S.flyingWords = (o) => {
    const words = o.words, at = o.at ?? 0, gap = o.gap ?? K.dur(0.25), travel = o.travel ?? K.dur(1.6), size = sizeOf(o), r = rng(o.seed ?? 11), persp = o.persp ?? K.W_ * 0.9;
    const root = mk(o.parent, { left: 0, top: 0, width: K.W_ + 'px', height: K.H_ + 'px', perspective: persp + 'px', perspectiveOrigin: '50% 50%' });
    const zFar = o.zFar ?? -persp * 6;
    const its = words.map((w, i) => ({ e: mk(root, Object.assign(txt(size), { left: '50%', top: '50%' }), esc(w)), x: (i % 2 ? 1 : -1) * (0.12 + r() * 0.3) * K.W_, y: (r() - 0.5) * K.H_ * 0.5, a: at + i * gap }));
    return { el: root, end: at + (words.length - 1) * gap + travel, set(t) {
      for (const it of its) {
        const p = K.seg(t, it.a, it.a + travel), z = K.lerp(zFar, persp * 0.85, p * p * 0.35 + p * 0.65);
        it.e.style.opacity = n3(K.seg(p, 0, 0.12) * (1 - K.seg(p, 0.85, 1)) * (t >= it.a ? 1 : 0));
        it.e.style.transform = `translate3d(${n3(it.x)}px,${n3(it.y)}px,${n3(z)}px) translate(-50%,-50%)`;
      }
    } };
  };

  // ── gradientWordSweep: text = 'a sentence'; a bright band crosses word i during [at + i·stagger, + per], leaving the `end` colour.
  S.gradientWordSweep = (o) => {
    const words = o.text.split(/\s+/), root = mk(o.parent, mid(o, { display: 'flex', gap: sizeOf(o) * 0.28 + 'px' }));
    const at = o.at ?? 0, per = o.per ?? K.dur(0.5), st = o.stagger ?? K.dur(0.22), base = o.base ?? 'var(--kit-muted)', hi = o.hilite ?? '#fff', end = o.end ?? 'var(--kit-ink)';
    const sp = words.map((w) => { const e = K.el('span', '', root, esc(w)); K.css(e, { color: 'transparent', webkitBackgroundClip: 'text', backgroundClip: 'text', backgroundSize: '300% 100%',
      backgroundImage: `linear-gradient(90deg, ${end} 0%, ${end} 33%, ${hi} 48%, ${o.accent ?? 'var(--kit-accent)'} 52%, ${base} 66%, ${base} 100%)` }); return e; });
    const ease = K.easing('power1.inOut');
    return { el: root, end: at + (words.length - 1) * st + per, set(t) { sp.forEach((e, i) => { e.style.backgroundPosition = n3(100 * (1 - sg(t, at + i * st, at + i * st + per, ease))) + '% 0'; }); } };
  };

  // ── leadWordZoomAssemble: words = [lead, …rest]. The lead fills the frame (scale `zoom`), holds, then settles into its place in the
  // sentence while the rest assemble around it from seeded directions. Geometry is measured once at build (after fonts).
  S.leadWordZoomAssemble = (o) => {
    const words = o.words, size = sizeOf(o), at = o.at ?? 0, hold = o.hold ?? K.dur(0.5), dur = o.dur ?? K.dur(0.8), r = rng(o.seed ?? 3), zoom = o.zoom ?? 3.2;
    const root = mk(o.parent, mid(o, { display: 'flex', gap: size * 0.28 + 'px' }));
    const sp = words.map((w) => { const e = K.el('span', '', root, esc(w)); e.style.display = 'inline-block'; return e; });
    const R = root.getBoundingClientRect(), lr = sp[0].getBoundingClientRect(), dx = R.left + R.width / 2 - (lr.left + lr.width / 2);   // lead's offset to the centre of the line
    const fly = sp.map((e, i) => (i ? [(r() - 0.5) * K.W_ * 0.9, (r() > 0.5 ? 1 : -1) * (0.3 + r() * 0.3) * K.H_] : [0, 0]));
    const ease = K.easing('power3.inOut');
    return { el: root, end: at + hold + dur + words.length * K.staggerStep, set(t) {
      const p = sg(t, at + hold, at + hold + dur, ease);
      sp[0].style.opacity = n3(K.seg(t, at, at + 0.15)); sp[0].style.transform = `translate(${n3(dx * (1 - p))}px,0) scale(${n3(K.lerp(zoom, 1, p))})`;
      sp.forEach((e, i) => { if (!i) return; const q = sg(t, at + hold + (i - 1) * K.staggerStep, at + hold + dur + (i - 1) * K.staggerStep);
        e.style.opacity = n3(q); e.style.transform = `translate(${n3(fly[i][0] * (1 - q))}px,${n3(fly[i][1] * (1 - q))}px) scale(${n3(0.6 + 0.4 * q)})`; });
    } };
  };

  // ── outlineWordFill: live text as a stroke-only outline (revealed left to right), then a fill wash left to right. Any font.
  S.outlineWordFill = (o) => {
    const size = sizeOf(o), at = o.at ?? 0, dOut = o.outline ?? K.dur(0.6), dFill = o.fill ?? K.dur(0.7), gapT = o.gap ?? K.dur(0.15), sw = o.strokeW ?? Math.max(2, size * 0.03);
    const root = mk(o.parent, mid(o)), line = K.el('span', '', root, esc(o.text)), fill = mk(root, { left: 0, top: 0 }, esc(o.text));
    K.css(line, { display: 'inline-block', color: 'transparent', webkitTextStroke: `${sw}px ${o.stroke ?? 'var(--kit-ink)'}` });
    K.css(fill, { color: 'transparent', webkitBackgroundClip: 'text', backgroundClip: 'text' });
    const col = o.color ?? 'var(--kit-accent)', e1 = K.easing('power2.out'), e2 = K.easing('power2.inOut');
    return { el: root, end: at + dOut + gapT + dFill, set(t) {
      const a = sg(t, at, at + dOut, e1), b = sg(t, at + dOut + gapT, at + dOut + gapT + dFill, e2);
      line.style.clipPath = `inset(-20% ${n3(100 * (1 - a))}% -20% 0)`;
      fill.style.backgroundImage = `linear-gradient(90deg, ${col} 0%, ${col} ${n3(b * 100)}%, transparent ${n3(b * 100)}%, transparent 100%)`;
    } };
  };

  // slot reel shared by pillSlotCycle and chipRail: words stacked in a clipped pill (a first word repeated at the end when looping)
  const reel = (parent, words, o) => {
    const size = o.size ?? 64 * K.u, h = size * 1.35, w = o.width ?? Math.max(...words.map((x) => meas(parent, x, txt(size)))) + size * 0.9;
    const pill = mk(parent, { left: (o.x ?? 0) + 'px', top: (o.y ?? 0) + 'px', width: w + 'px', height: h + 'px', borderRadius: h / 2 + 'px', overflow: 'hidden', background: 'var(--kit-surface)', border: `${Math.max(2, 3 * K.u)}px solid var(--kit-muted)`, boxSizing: 'border-box' });
    const strip = mk(pill, { left: 0, top: 0, width: '100%' });
    (o.loop ? words.concat(words[0]) : words).forEach((x, i) => mk(strip, Object.assign(txt(size), { top: i * h + 'px', width: '100%', height: h + 'px', textAlign: 'center', lineHeight: h + 'px', fontWeight: 600 }), esc(x)));
    return { pill, strip, w, h };
  };
  // pillSlotCycle: words roll through one pill; every = seconds per word, loop wraps back to the first word, else it stops on the last.
  S.pillSlotCycle = (o) => {
    const root = wrap(o.parent), words = o.words, n = words.length, loop = o.loop ?? false, at = o.at ?? 0, every = o.every ?? K.dur(0.9), move = Math.min(o.move ?? K.dur(0.45), every), ease = ez(o.ease ?? 'back.out(1.4)');
    const R = reel(root, words, { size: o.size, width: o.width, loop }), last = loop ? n : n - 1;
    K.css(R.pill, { left: cx(o) - R.w / 2 + 'px', top: cy(o) - R.h / 2 + 'px' });
    return { el: root, end: at + last * every, set(t) { R.strip.style.transform = `translateY(${n3(-R.h * reelPos(t, at, every, move, ease, last))}px)`; } };
  };
  // chipRail: chips = [[words…], …] side by side; chip i rolls through its words (starting i·stagger later) and settles on its last one.
  // A settled chip is "handled": accent border and a tick badge pop in.
  S.chipRail = (o) => {
    const root = wrap(o.parent), chips = o.chips, size = o.size ?? 56 * K.u, gapPx = size * 0.5, at = o.at ?? 0, every = o.every ?? K.dur(0.5), move = Math.min(o.move ?? K.dur(0.35), every), st = o.stagger ?? K.dur(0.5), ease = ez(o.ease ?? 'back.out(1.4)');
    const Rs = chips.map((w) => reel(root, w, { size, width: o.width }));
    let x = cx(o) - (Rs.reduce((s, r) => s + r.w, 0) + gapPx * (chips.length - 1)) / 2;
    const info = Rs.map((r, i) => {
      const y = cy(o) - r.h / 2; K.css(r.pill, { left: x + 'px', top: y + 'px' });
      const badge = mk(root, { left: x + r.w - size * 0.45 + 'px', top: y - size * 0.25 + 'px', width: size * 0.7 + 'px', height: size * 0.7 + 'px', borderRadius: '50%', background: 'var(--kit-accent)', color: 'var(--kit-on-accent)', textAlign: 'center', lineHeight: size * 0.7 + 'px', fontSize: size * 0.45 + 'px', fontWeight: 700 }, '&#10003;');
      x += r.w + gapPx; return { r, badge, a: at + i * st, last: chips[i].length - 1 };
    });
    const settleAt = (c) => c.a + c.last * every, pop = K.easing('back.out(2.5)');
    return { el: root, end: Math.max(...info.map(settleAt)) + 0.4, set(t) {
      for (const c of info) {
        c.r.strip.style.transform = `translateY(${n3(-c.r.h * reelPos(t, c.a, every, move, ease, c.last))}px)`;
        const s = K.seg(t, settleAt(c), settleAt(c) + 0.3);
        c.r.pill.style.borderColor = s > 0 ? 'var(--kit-accent)' : 'var(--kit-muted)'; c.badge.style.transform = `scale(${n3(pop(s))})`; c.badge.style.opacity = s > 0 ? 1 : 0;
      }
    } };
  };

  // ── type assembly. splitTextStagger: chars (or words, by: 'word') rise and unblur one after another.
  const pieces = (root, text, by) => (by === 'word' ? text.split(/\s+/).map((w, i, a) => w + (i < a.length - 1 ? ' ' : '')) : [...text]).map((s) => { const e = K.el('span', '', root, esc(s)); e.style.display = 'inline-block'; e.style.whiteSpace = 'pre'; return e; });
  S.splitTextStagger = (o) => {
    const root = mk(o.parent, mid(o)), sp = pieces(root, o.text, o.by || 'char');
    const at = o.at ?? 0, per = o.per ?? K.dur(0.5), st = o.stagger ?? K.dur(0.04), rise = o.rise ?? sizeOf(o) * 0.6, ease = ez(o.ease ?? 'power3.out');
    return { el: root, end: at + (sp.length - 1) * st + per, set(t) { sp.forEach((e, i) => { const p = ease(K.seg(t, at + i * st, at + i * st + per)); e.style.opacity = n3(p); e.style.transform = `translateY(${n3((1 - p) * rise)}px)`; e.style.filter = p < 1 ? `blur(${n3((1 - p) * 6)}px)` : 'none'; }); } };
  };
  // driftAssembly: chars start scattered (seeded offsets, rotation, scale) and drift into the line with a long ease.
  S.driftAssembly = (o) => {
    const root = mk(o.parent, mid(o)), sp = pieces(root, o.text, o.by || 'char'), r = rng(o.seed ?? 9);
    const at = o.at ?? 0, per = o.per ?? K.dur(1.1), spread = o.spread ?? K.W_ * 0.35, jit = o.jitter ?? 0.25, ease = ez(o.ease ?? 'power3.out');
    const f = sp.map(() => ({ x: (r() - 0.5) * 2 * spread, y: (r() - 0.5) * 2 * spread * 0.6, rot: (r() - 0.5) * 120, s: 0.5 + r() * 1.5, d: r() * jit }));
    return { el: root, end: at + per + jit, set(t) { sp.forEach((e, i) => { const q = ease(K.seg(t, at + f[i].d, at + f[i].d + per)); e.style.opacity = n3(K.seg(q, 0, 0.3));
      e.style.transform = `translate(${n3(f[i].x * (1 - q))}px,${n3(f[i].y * (1 - q))}px) rotate(${n3(f[i].rot * (1 - q))}deg) scale(${n3(K.lerp(f[i].s, 1, q))})`; }); } };
  };
  // textOnPath: any font, via SVG <textPath>. d = the path in stage px (default: a gentle arc across the frame). mode 'slide': the text
  // runs onto the path from its far end (startOffset keyed 100% → 0%); mode 'reveal': glyphs fade in one by one along it.
  let pid = 0;
  S.textOnPath = (o) => {
    const NS = 'http://www.w3.org/2000/svg', size = sizeOf(o), W = K.W_, H = K.H_, d = o.d ?? `M ${W * 0.08} ${H * 0.7} C ${W * 0.3} ${H * 0.2}, ${W * 0.7} ${H * 0.2}, ${W * 0.92} ${H * 0.7}`;
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', W); svg.setAttribute('height', H); svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
    const id = 'kit-top-' + pid++, path = document.createElementNS(NS, 'path'); path.setAttribute('id', id); path.setAttribute('d', d); path.setAttribute('fill', 'none'); path.setAttribute('stroke', o.guide ? 'var(--kit-muted)' : 'none'); svg.appendChild(path);
    const text = document.createElementNS(NS, 'text'), tp = document.createElementNS(NS, 'textPath'); text.setAttribute('font-size', size); text.setAttribute('fill', 'var(--kit-ink)'); text.style.fontFamily = 'var(--kit-font-display)'; text.style.fontWeight = 'var(--kit-display-weight)';
    tp.setAttribute('href', '#' + id);
    const mode = o.mode || 'slide', spans = mode === 'reveal' ? [...o.text].map((c) => { const s = document.createElementNS(NS, 'tspan'); s.textContent = c; tp.appendChild(s); return s; }) : (tp.textContent = o.text, []);
    text.appendChild(tp); svg.appendChild(text); (o.parent || K.stage).appendChild(svg);
    const at = o.at ?? 0, dur = o.dur ?? K.dur(1.4), ease = ez(o.ease ?? 'power3.out');
    return { el: svg, end: at + dur, set(t) {
      const p = ease(K.seg(t, at, at + dur));
      if (mode === 'slide') tp.setAttribute('startOffset', n3(100 * (1 - p)) + '%');
      else spans.forEach((s, i) => s.setAttribute('opacity', n3(K.seg(p * (spans.length + 3), i, i + 3))));
    } };
  };

  // ── letterDrop: each letter falls from `drop` px above and bounces to rest (closed-form bounce.out), squashing on first contact.
  S.letterDrop = (o) => {
    const root = mk(o.parent, mid(o)), sp = pieces(root, o.text, 'char');
    const at = o.at ?? 0, fall = o.fall ?? K.dur(0.9), st = o.stagger ?? K.dur(0.06), drop = o.drop ?? K.H_ * 0.5, bounce = K.easing('bounce.out'), tc = fall / 2.75;
    return { el: root, end: at + (sp.length - 1) * st + fall, set(t) { sp.forEach((e, i) => {
      const a = at + i * st, p = bounce(K.seg(t, a, a + fall)), sq = t >= a + tc ? Math.max(0, 1 - (t - a - tc) / 0.1) : 0;
      e.style.opacity = t >= a ? 1 : 0; e.style.transformOrigin = '50% 100%';
      e.style.transform = `translateY(${n3((p - 1) * drop)}px) scale(${n3(1 + 0.18 * sq)},${n3(1 - 0.25 * sq)})`; }); } };
  };

  // ── fontWeightPump: weight jumps to `hi` on each beat time and decays to `lo` (rate `decay`/s); each letter lags by `lag` seconds for a
  // wave. Variable fonts get the smooth weight; static fonts snap to the nearest face.
  S.fontWeightPump = (o) => {
    const root = mk(o.parent, mid(o)), sp = pieces(root, o.text, 'char');
    const beats = o.beats.slice().sort((a, b) => a - b), lo = o.lo ?? 300, hi = o.hi ?? 900, decay = o.decay ?? 7, lag = o.lag ?? 0.02;
    const pump = (t) => { let b = -1; for (const x of beats) if (x <= t) b = x; return b < 0 ? 0 : Math.exp(-decay * (t - b)); };
    return { el: root, end: beats[beats.length - 1] + 0.6, pump, set(t) { sp.forEach((e, i) => { const w = Math.round(K.lerp(lo, hi, pump(t - i * lag))); e.style.fontWeight = w; e.style.fontVariationSettings = `"wght" ${w}`; }); } };
  };
  // karaokeFill: words (array) with times = [[start, end], …] (e.g. from KIT.align) fill with colour left to right as spoken.
  S.karaokeFill = (o) => {
    const words = o.words, size = sizeOf(o), root = mk(o.parent, mid(o, { display: 'flex', gap: size * 0.28 + 'px' }));
    const times = o.times ?? words.map((_, i) => [(o.at ?? 0) + i * 0.4, (o.at ?? 0) + i * 0.4 + 0.4]), base = o.base ?? 'var(--kit-muted)', col = o.color ?? 'var(--kit-accent)';
    const sp = words.map((w) => { const e = K.el('span', '', root, esc(w)); K.css(e, { color: 'transparent', webkitBackgroundClip: 'text', backgroundClip: 'text' }); return e; });
    return { el: root, end: times[times.length - 1][1], set(t) { sp.forEach((e, i) => { const p = n3(100 * K.seg(t, times[i][0], times[i][1]));
      e.style.backgroundImage = `linear-gradient(90deg, ${col} 0%, ${col} ${p}%, ${base} ${p}%, ${base} 100%)`; }); } };
  };

  // ── verticalWordRoll: words roll up through one slot, each blurring and fading as it leaves and unblurring as it arrives; an endless
  // carousel (loop) or a run that stops on the last word. every = seconds per word, move = seconds the roll takes.
  S.verticalWordRoll = (o) => {
    const words = o.words, n = words.length, size = sizeOf(o), at = o.at ?? 0, every = o.every ?? K.dur(0.9), move = Math.min(o.move ?? K.dur(0.5), every), ease = ez(o.ease ?? 'power3.inOut');
    const dist = o.dist ?? size * 1.25, blur = o.blur ?? 14 * K.u, loop = o.loop ?? true, last = loop ? Infinity : n - 1;
    const root = wrap(o.parent), cells = words.map((w) => mk(root, mid(o), esc(w)));
    return { el: root, end: at + (loop ? n : n - 1) * every, set(t) {
      const r = reelPos(t, at, every, move, ease, last);
      cells.forEach((e, i) => { const d = ring(i, r, n), a = Math.min(1, Math.abs(d)); e.style.opacity = n3(Math.max(0, 1 - a * 1.4)); e.style.filter = `blur(${n3(a * blur)}px)`; e.style.transform = `translate(-50%,-50%) translateY(${n3(d * dist)}px)`; });
    } };
  };

  // ── wordRelayFilmstrip: a strip of framed words with sprocket holes; every `every` seconds the strip is thrown one cell along with an
  // overshoot and snaps, the word at the centre lighting up and growing: the baton is handed on word to word.
  S.wordRelayFilmstrip = (o) => {
    const words = o.words, n = words.length, size = sizeOf(o) * 0.7, cell = o.cell ?? size * 4, at = o.at ?? 0, every = o.every ?? K.dur(0.8), move = Math.min(o.move ?? K.dur(0.4), every), ease = ez(o.ease ?? 'back.out(1.6)');
    const root = wrap(o.parent), Y = cy(o), X = cx(o), h = size * 2, hole = size * 0.25, pitch = size * 0.9, nh = Math.ceil(K.W_ / pitch) + 2;
    mk(root, { left: 0, width: K.W_ + 'px', height: h * 1.4 + 'px', top: Y - h * 0.7 + 'px', background: 'var(--kit-surface)' });
    const holes = Array.from({ length: nh }, () => [Y - h * 0.62, Y + h * 0.62 - hole].map((y) => mk(root, { width: size * 0.4 + 'px', height: hole + 'px', background: 'var(--kit-bg)', borderRadius: '3px', top: y + 'px' })));
    const cells = words.map((w) => { const c = mk(root, { width: cell * 0.86 + 'px', height: h + 'px', border: `${Math.max(2, 3 * K.u)}px solid var(--kit-muted)`, borderRadius: 8 * K.u + 'px', top: Y - h / 2 + 'px', boxSizing: 'border-box' });
      mk(c, Object.assign(txt(size), { left: 0, width: '100%', top: '50%', transform: 'translateY(-50%)', textAlign: 'center' }), esc(w)); return c; });
    const last = o.loop === false ? n - 1 : Infinity, period = nh * pitch;
    return { el: root, end: at + n * every, set(t) {
      const r = reelPos(t, at, every, move, ease, last);
      holes.forEach((hh, i) => { const x = ((((i * pitch - r * cell) % period) + period) % period) - pitch; hh[0].style.left = hh[1].style.left = n3(x) + 'px'; });
      cells.forEach((c, i) => { const d = ring(i, r, n), a = 1 - Math.min(1, Math.abs(d)); c.style.left = n3(X + d * cell - cell * 0.43) + 'px';
        c.style.transform = `scale(${n3(0.82 + 0.28 * a)})`; c.style.borderColor = a > 0.6 ? 'var(--kit-accent)' : 'var(--kit-muted)'; c.style.background = a > 0.6 ? 'var(--kit-bg)' : 'transparent'; });
    } };
  };
})();
