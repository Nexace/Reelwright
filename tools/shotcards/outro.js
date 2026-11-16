// Shotcards, outros: KIT.shotcards.<name>. Load after engine.js, shots.js and shots2.js. HyperFrames: kit/shotcards/outro.js;
// pvk: ../../../tools/shotcards/outro.js. Pure functions of t (DOM built once, set(t) only writes styles). Each returns { set(t), at(t) }.
// Elements you hand in are positioned absolutely by the helper (centre-based: left/top 0 + translate), and it owns their transform,
// opacity, visibility and clip-path. Timings are our choices. Measurements (offsetWidth / offsetLeft) are taken once, at the first set().
//   logoLockup({ logo, word, cx, cy, t0, t1 })                                logo shrinks and slides while the wordmark writes out beside it
//   neonMarquee({ rows, t0, t1, speeds, colors, y, pitch })                   three tilted neon rows running in alternating directions
//   groupLaunch({ wordmark, reps, cx, cy, rx, ry, t0, t1, seed })             representatives fly in from outside and ring the wordmark
//   uiStripAway({ items, logo, t0, t1 })                                       UI pieces exit outward in turn, then the logo lands
//   iconFlipBloom({ icon, logo, x, y, t0, t1 }) / inputMorphAssemble(...)      the two UI -> brand morphs
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.shot) throw new Error('shotcards/outro.js: load engine.js and shots.js first');
  const C = (K.shotcards = K.shotcards || {}), n4 = (v) => +v.toFixed(4), n1 = (v) => +v.toFixed(1), E = (n) => K.easing(n), W = K.W_, H = K.H_;
  const hash = (s) => { let h = 0x811c9dc5; for (const c of unescape(encodeURIComponent(String(s)))) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0; return h; };
  const rng = (seed) => { let a = hash(seed) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const need = (ok, msg) => { if (!ok) throw new Error(msg); };
  const abs = (e) => K.css(e, { position: 'absolute', left: '0px', top: '0px' });
  const at2 = (e, x, y, s = 1, rot = 0) => { e.style.transform = 'translate(' + n1(x) + 'px,' + n1(y) + 'px) translate(-50%,-50%) rotate(' + n1(rot) + 'deg) scale(' + n4(Math.max(0, s)) + ')'; };

  // logo-shrink-wordmark-lockup: `logo` starts alone at (cx, cy) at scale0 x, then (power3.inOut over 70 % of the window) shrinks to 1 x
  // and slides left to its place in the lockup [logo gap word] centred on (cx, cy), while `word` writes out from behind it
  // (clip-path inset + slide, power3.out, from 35 % of the window). Sizes are the elements' layout sizes (offsetWidth).
  C.logoLockup = ({ logo, word, cx = W / 2, cy = H / 2, gap = 24 * K.u, t0, t1, scale0 = 2.4 } = {}) => {
    need(logo && word && t1 > t0, 'logoLockup: need { logo, word, t0, t1 > t0 }');
    abs(logo); abs(word); let m;
    const D = t1 - t0, em = E('power3.inOut'), ew = E('power3.out');
    const at = (t) => {
      m ||= { lw: logo.offsetWidth, ww: word.offsetWidth };
      const tot = m.lw + gap + m.ww, lx = cx - tot / 2 + m.lw / 2, wx = cx - tot / 2 + m.lw + gap + m.ww / 2, p = em(K.seg(t, t0, t0 + 0.7 * D)), q = ew(K.seg(t, t0 + 0.35 * D, t1));
      return { logoX: n1(K.lerp(cx, lx, p)), logoS: n4(K.lerp(scale0, 1, p)), wordX: n1(wx - (1 - q) * 0.3 * m.ww), wordClip: n4(100 * (1 - q)), wordOp: n4(K.seg(q, 0, 0.3)) };
    };
    const set = (t) => {
      const a = at(t);
      at2(logo, a.logoX, cy, a.logoS); K.show(logo, 1);
      at2(word, a.wordX, cy); word.style.clipPath = 'inset(0 ' + a.wordClip + '% 0 0)'; K.show(word, a.wordOp);
    };
    return { set, at };
  };

  // neon-triple-marquee: rows (strings, three by default) of repeated text on a tilted plane (rotateX rx, rotateZ rz), each running at its
  // own speed in px/s x K.u (negative = the other way), seamless because the offset wraps by one repeat. Neon = layered text-shadow of the
  // row colour; the glow stutters for the first 0.5 s. The block fades in and out over 0.4 s at t0 and t1. Needs `reps` big enough to cover 3 frames.
  C.neonMarquee = ({ parent = K.stage, rows, t0, t1, speeds = [140, -190, 110], colors = ['#ff2d95', '#22e6ff', '#b6ff3b'], y = H / 2, pitch = 0.2 * H, size = 0.11 * H, gap = 0.08 * W, reps = 16, rx = 38, rz = -7 } = {}) => {
    need(rows && rows.length && t1 > t0, 'neonMarquee: need { rows, t0, t1 }');
    const root = K.el('div', 'kit-neon-marquee', parent);
    K.css(root, { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', pointerEvents: 'none', transform: 'perspective(1200px) rotateX(' + rx + 'deg) rotateZ(' + rz + 'deg)' });
    const els = rows.map((txt, i) => {
      const c = colors[i % colors.length], row = K.el('div', 'kit-neon-row', root);
      K.css(row, { position: 'absolute', left: '0px', top: n1(y + (i - (rows.length - 1) / 2) * pitch) + 'px', transform: 'translateY(-50%)', whiteSpace: 'nowrap', fontSize: n1(size) + 'px', fontWeight: 900, lineHeight: 1, color: '#fff' });
      row.innerHTML = Array.from({ length: reps }, () => '<span style="display:inline-block;margin-right:' + n1(gap) + 'px">' + txt + '</span>').join('');
      return { row, c };
    });
    let P;
    const at = (t) => {
      P ||= els.map((e) => e.row.firstChild.offsetWidth + gap);
      const flick = t < t0 + 0.5 ? ((hash('neon' + Math.floor((t - t0) * 14)) % 100) / 100 < 0.35 ? 0.5 : 1) : 1;
      return { op: n4(Math.min(K.seg(t, t0, t0 + 0.4), 1 - K.seg(t, t1 - 0.4, t1))), glow: flick, x: els.map((_, i) => n1((((speeds[i % speeds.length] * K.u * (t - t0)) % P[i]) + P[i]) % P[i] - P[i])) };
    };
    const set = (t) => {
      const a = at(t); K.show(root, a.op);
      els.forEach((e, i) => {
        const c = e.c, g = a.glow;
        e.row.style.transform = 'translate(' + a.x[i] + 'px,-50%)';
        e.row.style.textShadow = '0 0 ' + n1(4 * g) + 'px ' + c + ',0 0 ' + n1(14 * g) + 'px ' + c + ',0 0 ' + n1(34 * g) + 'px ' + c + ',0 0 ' + n1(70 * g) + 'px ' + c;
        e.row.style.color = '#fff';
      });
    };
    return { set, at, el: root };
  };

  // outro-group-photo-launch: reps (avatars, logos) fly in from seeded points beyond the frame edge to places round the wordmark on an
  // ellipse (rx, ry), starting K.stagger apart in a seeded order, landing with overshoot (outBack) and a seeded spin-out; after landing
  // each bobs 4 px x K.u. The wordmark pops at t0 + 25 % of the window. Owns transforms of wordmark and reps.
  C.groupLaunch = ({ wordmark, reps, cx = W / 2, cy = H / 2, rx = 0.34 * W, ry = 0.3 * H, t0, t1, seed = 1, flight = K.dur(0.7) } = {}) => {
    need(wordmark && reps && reps.length && t1 - t0 > flight, 'groupLaunch: need { wordmark, reps, t0, t1 } with t1 - t0 > flight');
    const r = rng('group:' + seed), n = reps.length, R = 0.75 * Math.hypot(W, H);
    [wordmark, ...reps].forEach(abs);
    const order = reps.map((_, i) => ({ i, k: r() })).sort((a, b) => a.k - b.k).map((o) => o.i), rank = [];
    order.forEach((i, k) => { rank[i] = k; });
    const items = reps.map((_, i) => { const a0 = r() * 6.2832, th = 2 * Math.PI * i / n - Math.PI / 2; return { sx: cx + Math.cos(a0) * R, sy: cy + Math.sin(a0) * R, tx: cx + rx * Math.cos(th), ty: cy + ry * Math.sin(th), spin: (r() - 0.5) * 140 }; });
    const eo = E('back.out(1.4)'), ew = E('back.out(2)');
    const at = (t) => ({ word: n4(ew(K.seg(t, t0 + 0.25 * (t1 - t0), t0 + 0.25 * (t1 - t0) + flight))), reps: items.map((m, i) => {
      const a = t0 + K.stagger(rank[i], n, t1 - t0 - flight), p = eo(K.seg(t, a, a + flight)), land = K.seg(t, a + flight, a + flight + 0.3);
      return { x: n1(K.lerp(m.sx, m.tx, p)), y: n1(K.lerp(m.sy, m.ty, p) + 4 * K.u * Math.sin(2 * Math.PI * (t * 0.45 + i / n)) * land), rot: n1(m.spin * (1 - p)), s: n4(0.35 + 0.65 * Math.min(1, p)) };
    }) });
    const set = (t) => {
      const a = at(t); at2(wordmark, cx, cy, a.word); K.show(wordmark, a.word > 0.01 ? 1 : 0);
      a.reps.forEach((m, i) => { at2(reps[i], m.x, m.y, m.s, m.rot); K.show(reps[i], K.seg(t, t0 + K.stagger(rank[i], n, t1 - t0 - flight), t0 + K.stagger(rank[i], n, t1 - t0 - flight) + 0.05)); });
    };
    return { set, at };
  };

  // ui-strip-away-outro: `items` (UI pieces; direct children of the stage, or { el, dx, dy } to give the exit direction) leave one by
  // one, outermost first, sliding outward 0.35 of the frame while shrinking to 0.7 and fading (power2.in); then `logo` lands at (cx, cy)
  // with outBack. Direction = from the stage centre to the item's centre (measured once). The first 70 % of the window strips, the rest lands.
  C.uiStripAway = ({ items, logo, cx = W / 2, cy = H / 2, t0, t1, dist = 0.35 * Math.max(W, H) } = {}) => {
    need(items && items.length && logo && t1 > t0, 'uiStripAway: need { items, logo, t0, t1 }');
    abs(logo); let dirs, rank; const D = t1 - t0, n = items.length, ei = E('power2.in'), eb = E('back.out(1.7)');
    const at = (t) => {
      if (!dirs) {
        dirs = items.map((it) => { if (it.el) return { el: it.el, dx: it.dx, dy: it.dy }; const dx = it.offsetLeft + it.offsetWidth / 2 - W / 2, dy = it.offsetTop + it.offsetHeight / 2 - H / 2, d = Math.hypot(dx, dy) || 1; return { el: it, dx: dx / d, dy: dy / d, far: d }; });
        const far = dirs.map((d, i) => d.far ?? i);
        rank = far.map((f, i) => far.filter((g, j) => g > f || (g === f && j < i)).length);
      }
      return { items: dirs.map((d, i) => { const a = t0 + K.stagger(rank[i], n, 0.45 * D), p = ei(K.seg(t, a, a + 0.25 * D)); return { x: n1(d.dx * dist * p), y: n1(d.dy * dist * p), s: n4(1 - 0.3 * p), op: n4(1 - p) }; }), logo: n4(eb(K.seg(t, t0 + 0.7 * D, t1))) };
    };
    const set = (t) => {
      const a = at(t);
      a.items.forEach((m, i) => { const e = dirs[i].el; e.style.transform = 'translate(' + m.x + 'px,' + m.y + 'px) scale(' + m.s + ')'; K.show(e, m.op); });
      at2(logo, cx, cy, 0.6 + 0.4 * a.logo); K.show(logo, Math.min(1, a.logo * 2));
    };
    return { set, at };
  };

  // ui-to-brand-morph, shot 1 icon-flip-bloom: `icon` turns edge-on (rotateY 0 -> 90) and `logo` turns up from -90 -> 0 with a pop, centred
  // on (x, y); a ring of `bloom` colour (radius r) blooms out and fades right after the flip. power2.inOut over 60 % of the window.
  C.iconFlipBloom = ({ parent = K.stage, icon, logo, x = W / 2, y = H / 2, r = 0.22 * H, bloom = 'var(--kit-accent)', t0, t1 } = {}) => {
    need(icon && logo && t1 > t0, 'iconFlipBloom: need { icon, logo, t0, t1 }');
    abs(icon); abs(logo);
    const ring = K.el('div', 'kit-bloom', parent);
    K.css(ring, { position: 'absolute', left: '0px', top: '0px', width: n1(2 * r) + 'px', height: n1(2 * r) + 'px', borderRadius: '50%', border: n1(3 * K.u) + 'px solid ' + bloom, boxShadow: '0 0 ' + n1(r * 0.3) + 'px ' + bloom, pointerEvents: 'none' });
    const D = t1 - t0, ef = E('power2.inOut'), eb = E('back.out(2)'), eo = E('power3.out');
    const at = (t) => { const p = ef(K.seg(t, t0, t0 + 0.6 * D)), q = eo(K.seg(t, t0 + 0.45 * D, t1));
      return { icon: n4(90 * K.seg(p, 0, 0.5)), logo: n4(-90 * (1 - K.seg(p, 0.5, 1))), pop: n4(0.7 + 0.3 * eb(K.seg(t, t0 + 0.3 * D, t0 + 0.8 * D))), ring: n4(0.3 + 0.7 * q), ringOp: n4(q > 0 ? 0.9 * (1 - q) : 0) }; };
    const set = (t) => {
      const a = at(t), f = (e, ry, s) => { e.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) perspective(900px) rotateY(' + ry + 'deg) scale(' + s + ')'; };
      f(icon, a.icon, 1); K.show(icon, a.icon < 89.9 ? 1 : 0);
      f(logo, a.logo, a.pop); K.show(logo, a.logo > -89.9 ? 1 : 0);
      at2(ring, x, y, a.ring); K.show(ring, a.ringOp);
    };
    return { set, at };
  };

  // ui-to-brand-morph, shot 2 input-morph-assemble: `box` (an input field, centred on (x, y); its text a child) morphs from `from` { w, h, r }
  // to `to` (the brand disc) in 55 % of the window (power3.inOut) while its text fades; `logo` pops in on the disc (back.out) and each of
  // `parts` (pieces of the mark) assembles from a seeded offset, staggered. Owns box width/height/radius and the parts' transform.
  C.inputMorphAssemble = ({ box, text = null, logo = null, parts = [], x = W / 2, y = H / 2, from, to, t0, t1, seed = 1 } = {}) => {
    need(box && from && to && t1 > t0, 'inputMorphAssemble: need { box, from, to, t0, t1 }');
    abs(box); if (logo) abs(logo); parts.forEach(abs);
    const r = rng('morph:' + seed), offs = parts.map(() => ({ dx: (r() - 0.5) * 0.5 * W, dy: (r() - 0.5) * 0.5 * H, rot: (r() - 0.5) * 120 }));
    const D = t1 - t0, em = E('power3.inOut'), eb = E('back.out(1.7)');
    const at = (t) => { const p = em(K.seg(t, t0, t0 + 0.55 * D));
      return { w: n1(K.lerp(from.w, to.w, p)), h: n1(K.lerp(from.h, to.h, p)), rad: n1(K.lerp(from.r, to.r, p)), text: n4(1 - K.seg(p, 0, 0.45)), logo: n4(eb(K.seg(t, t0 + 0.5 * D, t1))),
        parts: parts.map((_, i) => { const q = eb(K.seg(t, t0 + 0.45 * D + K.stagger(i, parts.length, 0.3 * D), t0 + 0.45 * D + K.stagger(i, parts.length, 0.3 * D) + 0.25 * D)); return { dx: n1(offs[i].dx * (1 - q)), dy: n1(offs[i].dy * (1 - q)), rot: n1(offs[i].rot * (1 - q)), op: Math.min(1, q * 2) }; }) }; };
    const set = (t) => {
      const a = at(t);
      K.css(box, { width: a.w + 'px', height: a.h + 'px', borderRadius: a.rad + 'px' }); at2(box, x, y);
      if (text) { text.style.opacity = a.text; text.style.transform = 'scale(' + n4(1 - 0.3 * (1 - a.text)) + ')'; }
      if (logo) { at2(logo, x, y, 0.4 + 0.6 * a.logo); K.show(logo, Math.min(1, a.logo * 2)); }
      parts.forEach((e, i) => { at2(e, x + a.parts[i].dx, y + a.parts[i].dy, 0.5 + 0.5 * a.parts[i].op, a.parts[i].rot); K.show(e, a.parts[i].op); });
    };
    return { set, at };
  };
})();
