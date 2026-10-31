// Scene layouts: KIT.layout.<name>(opts) → { el, set(t) }. Loaded after engine.js.
// Each builds its DOM once inside the title-safe box (KIT.safe), adapts to KIT.fmt through CSS (.kit-fmt-*), and
// in set(t) enters after opts.in and leaves before opts.out with the theme's motion (KIT.ease, KIT.dur) — pure in t.
// Callers compute in/out from W()/V()/KIT.snap(). opts.note adds a small label under the box ("Illustrative data").
// Styles: tools/kit.css, "layouts" section — theme tokens only, sized in --kit-u.
'use strict';
(function () {
  const K = window.KIT, L = {};
  const px = (n) => n * K.u + 'px';
  // eased 0→1 entrance starting `delay` s (theme tempo) after t0
  const ent = (t, t0, delay = 0, d = 0.7) => K.ease(K.seg(t, t0 + K.dur(delay), t0 + K.dur(delay + d)));
  const rise = (els, t, t0, delay = 0, step = 0.08, dy = 40) => els.forEach((e, i) => {
    const p = ent(t, t0, delay + i * step);
    e.style.opacity = p; e.style.transform = `translateY(${px(dy * (1 - p))})`;
  });
  // shared root on the safe box: hidden before `in`, fades and lifts out over the last 0.45 s before `out`
  const root = (name, o) => {
    const el = K.el('div', `kit-lay kit-lay-${name} kit-fmt-${K.fmt}`, o.parent || K.stage);
    if (o.note) K.el('div', 'kit-lay-note', el).textContent = o.note;
    return { el, frame(t) {
      const z = o.out == null ? 0 : K.ease(K.seg(t, o.out - K.dur(0.45), o.out));
      K.show(el, t < o.in ? 0 : 1 - z);
      el.style.transform = `translateY(${px(-30 * z)})`;
    } };
  };
  // largest font size ≤ max px at which el's text fits w×h. Measured on a clone without per-frame transforms, and
  // again once fonts are in (before READY / HyperFrames' first seek), so every render page gets the same size.
  const fit = (el, w, h, max) => {
    const go = () => {
      const c = el.cloneNode(true);
      for (const s of c.querySelectorAll('[style]')) s.removeAttribute('style');
      c.style.cssText = `position:absolute;visibility:hidden;left:0;top:0;width:${w}px`;
      el.parentNode.appendChild(c);
      let lo = 8, hi = max;
      for (let i = 0; i < 16; i++) {
        const m = (lo + hi) / 2; c.style.fontSize = m + 'px';
        if (c.scrollWidth <= w && c.scrollHeight <= h) lo = m; else hi = m;
      }
      c.remove(); el.style.fontSize = Math.floor(lo) + 'px';
    };
    go(); document.fonts.ready.then(go);
  };
  const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const accent = (spans, list = []) => spans.forEach((s) => {
    if (list.some((w) => norm(w) === norm(s.textContent))) s.classList.add('kit-lay-accent');
  });
  // kicker / title / body stack (HTML allowed) shared by split, bento and tiltedDevice
  const textStack = (parent, o) => {
    const box = K.el('div', 'kit-lay-text', parent);
    return [o.kicker && K.el('div', 'kit-lay-kicker', box, o.kicker), o.title && K.el('div', 'kit-lay-title kit-lay-disp', box, o.title),
      o.body && K.el('div', 'kit-lay-body', box, o.body)].filter(Boolean);
  };

  // split({ kicker, title, body, media, flip, in, out }) → { el, media, set }: text panel beside a media card
  // (`media` = its HTML, or fill .media yourself). Side by side in 16x9 (flip puts media left), text over media otherwise.
  L.split = (o) => {
    const r = root('split', o); if (o.flip) r.el.classList.add('flip');
    const parts = textStack(r.el, o);
    const media = K.el('div', 'kit-lay-media kit-lay-card', r.el, o.media || '');
    const side = K.fmt === '16x9' ? (o.flip ? -1 : 1) : 0;
    return { el: r.el, media, set(t) {
      r.frame(t); rise(parts, t, o.in);
      const p = ent(t, o.in, 0.15, 0.9);
      media.style.opacity = p;
      media.style.transform = `translate(${px(side * 90 * (1 - p))}, ${px((side ? 0 : 70) * (1 - p))}) scale(${0.96 + 0.04 * p})`;
    } };
  };

  // fullBleed({ text, accent: [words], in, out }): one display line as big as the safe box allows, words rising in turn
  L.fullBleed = (o) => {
    const r = root('full', o);
    const box = K.el('div', 'kit-lay-disp', r.el);
    const ws = o.text.split(/\s+/).map((w) => { const s = K.el('span', 'kit-word', box); s.textContent = w + ' '; return s; });
    accent(ws, o.accent); fit(box, K.safe.w, K.safe.h, 420 * K.u);
    return { el: r.el, set(t) {
      r.frame(t);
      ws.forEach((s, i) => { const p = ent(t, o.in, i * 0.07, 0.6); s.style.opacity = p; s.style.transform = `translateY(${0.35 * (1 - p)}em)`; });
    } };
  };

  // kinetic({ line, accent: [words], in, out }): VO line `line` set huge, each word landing as it is spoken (KIT.align)
  L.kinetic = (o) => {
    const r = root('kinetic', o);
    const box = K.el('div', 'kit-lay-disp', r.el);
    const ws = K.words(box, o.line).spans, ts = K.align(o.line);
    accent(ws, o.accent); fit(box, K.safe.w, K.safe.h, 260 * K.u);
    return { el: r.el, set(t) {
      r.frame(t);
      ws.forEach((s, i) => {
        const p = K.ease(K.seg(t, ts[i] - 0.06, ts[i] - 0.06 + K.dur(0.35)));
        s.style.opacity = p; s.style.transform = `translateY(${0.25 * (1 - p)}em) scale(${0.9 + 0.1 * p})`;
      });
    } };
  };

  // bento({ kicker, title, tiles: [{ icon, title, body, wide, hero }], step, in, out }): feature tiles on a grid —
  // 4 columns in 16x9, 2 otherwise (wide tiles span 2; hero = accent fill) — one popping in per `step`
  // (default a quarter beat, so with a snapped `in` every tile lands on the grid).
  L.bento = (o) => {
    const r = root('bento', o);
    const head = o.kicker || o.title ? textStack(r.el, o) : [];
    const grid = K.el('div', 'kit-lay-grid', r.el);
    const tiles = o.tiles.map((x) => K.el('div', 'kit-lay-tile kit-lay-card' + (x.wide ? ' wide' : '') + (x.hero ? ' hero' : ''), grid,
      (x.icon ? `<div class="kit-lay-icon">${x.icon}</div>` : '') + `<div class="kit-lay-ttitle kit-lay-disp">${x.title}</div>` +
      (x.body ? `<div class="kit-lay-tbody">${x.body}</div>` : '')));
    const step = o.step || K.MUSIC.beat / 4, t0 = o.in + (head.length ? 2 * step : 0);
    return { el: r.el, tiles, set(t) {
      r.frame(t); rise(head, t, o.in);
      tiles.forEach((e, i) => {
        const p = K.ease(K.seg(t, t0 + i * step, t0 + i * step + K.dur(0.6)));
        e.style.opacity = p; e.style.transform = `translateY(${px(50 * (1 - p))}) scale(${0.92 + 0.08 * p})`;
      });
    } };
  };

  // tiltedDevice({ kicker, title, body, screen, aspect, in, out }) → { el, screen, set }: a framed screen (`screen` =
  // its HTML, or fill .screen yourself; aspect = width/height, default 16/10) tilted in 3D that settles flat,
  // caption beside it in 16x9 and below otherwise.
  L.tiltedDevice = (o) => {
    const r = root('tilted', o), a = o.aspect || 16 / 10, wide = K.fmt === '16x9';
    const dev = K.el('div', 'kit-lay-device', r.el);
    const bw = K.safe.w * (wide ? 0.6 : 1), bh = K.safe.h * (wide ? 1 : 0.62), w = Math.min(bw, bh * a);
    K.css(dev, { width: w + 'px', height: w / a + 'px' });
    const screen = K.el('div', 'kit-lay-screen', dev, o.screen || '');
    const parts = textStack(r.el, o);
    return { el: r.el, screen, set(t) {
      r.frame(t);
      const p = ent(t, o.in, 0, 1.4), q = 1 - p;
      dev.style.opacity = K.clamp(p * 3);
      dev.style.transform = `perspective(${px(2200)}) translateY(${px(90 * q)}) rotateX(${24 * q}deg) rotateY(${-30 * q}deg) rotateZ(${5 * q}deg)`;
      rise(parts, t, o.in, 0.45);
    } };
  };

  // stat({ value, prefix, suffix, decimals, label, at, in, out }): a big number counting up (KIT.count) from `at`
  // (default `in`; put it on the spoken number) with a label under it
  L.stat = (o) => {
    const r = root('stat', o), d = o.decimals || 0;
    const num = K.el('div', 'kit-lay-num kit-lay-disp', r.el);
    const lab = K.el('div', 'kit-lay-label', r.el, o.label || '');
    const f = (v) => (o.prefix || '') + v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) + (o.suffix || '');
    num.textContent = f(o.value); fit(num, K.safe.w, K.safe.h * 0.55, 380 * K.u);   // sized for the final value
    const at = o.at == null ? o.in : o.at, c = K.count(num, o.value, at, at + K.dur(1.4), f);
    return { el: r.el, set(t) { r.frame(t); c.set(t); rise([num], t, o.in, 0, 0, 30); rise([lab], t, o.in, 0.25); } };
  };

  // quote({ text, author, role, in, out }): a quote card — accent quote mark, the quote, the author line
  L.quote = (o) => {
    const r = root('quote', o);
    const card = K.el('div', 'kit-lay-qcard kit-lay-card', r.el);
    const parts = [K.el('div', 'kit-lay-qmark kit-lay-disp', card, '“'), K.el('div', 'kit-lay-qtext kit-lay-disp', card, o.text),
      K.el('div', 'kit-lay-qby', card, `<b>${o.author}</b>${o.role ? `<span>${o.role}</span>` : ''}`)];
    return { el: r.el, set(t) {
      r.frame(t);
      const p = ent(t, o.in, 0, 0.8);
      card.style.opacity = p; card.style.transform = `translateY(${px(60 * (1 - p))}) scale(${0.97 + 0.03 * p})`;
      rise(parts, t, o.in, 0.15, 0.15, 24);
    } };
  };

  K.layout = L;
})();
