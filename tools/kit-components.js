// KIT.components: five small film components (each is a pure function of t: build the DOM once, write styles in set(t)).
// Load after tools/engine.js; flashCut needs tools/transitions.js too. Rewritten from the video-shotcraft card names.
//   infoStrip(parent, { items: [{ k, v }], at, dur, bottom })      caption info-strip: key/value chips in a bar, staggered in
//   digitRoll(parent, { to, from, at, dur, digits, prefix, suffix, size })   odometer: columns roll, tens only move at 9 → 0
//   flashCut({ from, to, at, dur, color, cue })                    a hard cut hidden in a white flash (KIT.transition('flash'))
//   verticalTicker(parent, { items, at, step, tick, rows, loop, rowH })   rows scroll up one per step, the middle row in focus
//   clipCard(parent, { clip, src, w, h, title, sub, at, dur, x, y })      a recorded clip (KIT.clip result) as a card's hero
// Every component returns { el, set(t) } (flashCut returns the transition: { set(t), … }; clipCard's set(t) also takes the
// clip time as its second argument if you do not pass `clip`). Nothing reads a clock: seek in any order.
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.start) throw new Error('tools/kit-components.js: load tools/engine.js first');
  const u = (n) => n * K.u;
  const C = {};

  // ── caption info-strip ──────────────────────────────────────────────────────────────────────────
  C.infoStrip = (parent, { items, at = 0, dur = 0.5, bottom = 0.08, size = 30 } = {}) => {
    if (!items || !items.length) throw new Error('infoStrip: items is empty');
    const el = K.el('div', 'kit-infostrip', parent);
    K.css(el, { left: '50%', bottom: Math.round(K.H_ * bottom) + 'px', display: 'flex', gap: u(28) + 'px', padding: `${u(14)}px ${u(30)}px`,
      borderRadius: u(16) + 'px', background: 'rgba(12,14,20,.78)', color: '#f4f1ea', font: `600 ${u(size)}px/1.2 var(--kit-font, system-ui, sans-serif)`, whiteSpace: 'nowrap' });
    const cells = items.map((it) => K.el('div', '', el, `<span style="opacity:.6;margin-right:${u(10)}px">${it.k}</span><span>${it.v}</span>`));
    cells.forEach((c) => { c.style.position = 'static'; });
    return { el, cells, set(t) {
      const n = cells.length, total = Math.min(0.4, 0.08 * (n - 1)), end = at + dur;
      cells.forEach((c, i) => {
        const p = K.E.out(K.seg(t, at + K.stagger(i, n, total), at + K.stagger(i, n, total) + dur));
        c.style.opacity = p; c.style.transform = `translateY(${(1 - p) * u(18)}px)`;
      });
      K.show(el, K.seg(t, at, at + 0.15) > 0 ? 1 : 0);
      el.style.transform = `translateX(-50%) translateY(${(1 - K.E.out(K.seg(t, at, end))) * u(24)}px)`;
    } };
  };

  // ── digit roll (odometer) ───────────────────────────────────────────────────────────────────────
  C.digitRoll = (parent, { to, from = 0, at = 0, dur = 1.4, digits = String(Math.abs(to)).length, prefix = '', suffix = '', size = 120, ease = 'out' } = {}) => {
    const e = typeof ease === 'function' ? ease : K.easing(ease === 'out' ? 'expo.out' : ease);
    const el = K.el('div', 'kit-digitroll', parent);
    K.css(el, { display: 'flex', alignItems: 'center', font: `700 ${u(size)}px/1.1 var(--kit-font, system-ui, sans-serif)`, fontVariantNumeric: 'tabular-nums' });
    if (prefix) K.el('span', '', el, prefix).style.position = 'static';
    const cols = [];
    for (let k = digits - 1; k >= 0; k--) {
      const col = K.el('div', '', el); K.css(col, { position: 'relative', width: '0.62em', height: '1.1em', overflow: 'hidden' });
      const strip = K.el('div', '', col, Array.from({ length: 11 }, (_, i) => `<div style="position:static;height:1.1em;text-align:center">${i % 10}</div>`).join(''));
      strip.style.position = 'absolute'; strip.style.left = '0'; strip.style.width = '100%';
      cols[k] = { col, strip };
    }
    if (suffix) K.el('span', '', el, suffix).style.position = 'static';
    const value = (t) => K.lerp(from, to, e(K.seg(t, at, at + dur)));
    return { el, value, set(t) {
      const v = Math.max(0, value(t));
      cols.forEach(({ col, strip }, k) => {
        const x = v / 10 ** k + 1e-9, fl = Math.floor(x), f = x - fl;
        const r = k ? Math.min(1, Math.max(0, (f - 0.9) / 0.1)) : f, pos = (fl % 10) + (k ? r * r * (3 - 2 * r) : r);
        strip.style.transform = `translateY(${-pos * 1.1}em)`;
        col.style.opacity = k && fl === 0 ? 0 : 1;   // no leading zeros
      });
    } };
  };

  // ── flash cut ───────────────────────────────────────────────────────────────────────────────────
  C.flashCut = ({ from, to, at, dur = 0.2, color = '#fff', cue } = {}) => {
    if (!K.transition) throw new Error('flashCut: load tools/transitions.js first');
    return K.transition('flash', { from, to, at, dur, color, ...(cue ? { cue } : {}) });
  };

  // ── vertical ticker ─────────────────────────────────────────────────────────────────────────────
  C.verticalTicker = (parent, { items, at = 0, step = 0.9, tick = 0.3, rows = 3, loop = true, rowH = 70, size = 44 } = {}) => {
    if (!items || items.length < 2) throw new Error('verticalTicker: need at least 2 items');
    const n = items.length, h = u(rowH), mid = (rows - 1) / 2;
    const el = K.el('div', 'kit-vticker', parent);
    K.css(el, { height: rows * h + 'px', overflow: 'hidden', font: `600 ${u(size)}px/${h}px var(--kit-font, system-ui, sans-serif)` });
    const list = K.el('div', '', el); list.style.position = 'absolute'; list.style.left = '0'; list.style.top = '0';
    const all = loop ? [...items, ...items.slice(0, rows)] : items;
    const row = all.map((s) => { const r = K.el('div', '', list, s); K.css(r, { position: 'static', height: h + 'px', whiteSpace: 'nowrap' }); return r; });
    const pos = (t) => {
      const x = Math.max(0, (t - at) / step), k = Math.floor(x + 1e-9), w = (x - k) * step;
      const p = k + K.E.inOut(K.seg(w, step - tick, step));
      return loop ? p % n : Math.min(p, n - rows);
    };
    return { el, pos, set(t) {
      const p = pos(t);
      list.style.transform = `translateY(${-p * h}px)`;
      row.forEach((r, i) => { r.style.opacity = 1 - 0.65 * Math.min(1, Math.abs(i - (p + mid)) / (mid || 1)); });
    } };
  };

  // ── clip card ───────────────────────────────────────────────────────────────────────────────────
  C.clipCard = (parent, { clip, src, w = 760, h = 520, title = '', sub = '', at = 0, dur = 0.6, x, y, radius = 28 } = {}) => {
    const el = K.el('div', 'kit-clipcard', parent);
    K.css(el, { width: u(w) + 'px', height: u(h) + 'px', left: (x ?? (K.W_ - u(w)) / 2) + 'px', top: (y ?? (K.H_ - u(h)) / 2) + 'px', borderRadius: u(radius) + 'px',
      overflow: 'hidden', background: '#10131a', boxShadow: '0 30px 80px rgba(0,0,0,.45)', color: '#f4f1ea', transformOrigin: '50% 60%' });
    const cap = u(title || sub ? 124 : 0);
    const hero = K.el('img', '', el); K.css(hero, { left: '0', top: '0', width: '100%', height: `calc(100% - ${cap}px)`, objectFit: 'cover' });
    if (title || sub) K.el('div', '', el, `<b style="font:700 ${u(34)}px var(--kit-font,system-ui,sans-serif)">${title}</b><br><span style="opacity:.65;font:500 ${u(24)}px var(--kit-font,system-ui,sans-serif)">${sub}</span>`)
      .style.cssText += `;position:absolute;left:${u(28)}px;bottom:${u(20)}px;width:calc(100% - ${u(56)}px)`;
    const frame = src || (clip && ((t) => clip.frameAt(clip.clipAt(t))));
    if (!frame) throw new Error('clipCard: pass clip (KIT.clip result) or src(t)');
    return { el, hero, set(t) {
      const p = K.E.out(K.seg(t, at, at + dur));
      K.show(el, p);
      el.style.transform = `translateY(${(1 - p) * u(60)}px) scale(${0.92 + 0.08 * p})`;
      K.img(hero, frame(t));
    } };
  };

  K.components = C;
})();
