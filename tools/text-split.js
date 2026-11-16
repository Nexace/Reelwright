// text-split.js: the typographic system — one split at load, many seek-pure reveals. Load after engine.js. Everything here
// measures text once, at build time (after document.fonts.ready, which K.start waits for); set(t) only writes transforms,
// clip boxes and font settings, so render(t) never measures and the same t always gives the same frame.
//
//   KIT.text.split(str, { font, size, weight = 400, style = 'normal', tracking = 0, lineHeight = 1.2, maxWidth = Infinity })
//     → { lines: [{ text, x, y, width, glyphs: [{ ch, x, w }] }], width, height,
//         lineHeight, ascent, descent, font, size, weight, style, tracking }
//     Breaks on "\n" and at maxWidth on spaces, then into words and glyphs with measureText. y is the line's baseline
//     (i·lineHeight·size + half-leading + ascent), x is its left edge, glyph x/w are advances from the line's left edge with
//     tracking included (per glyph: no pair kerning, which is what tracked display type is). Cached by every input, so a
//     second call with the same arguments measures nothing. A declared @font-face family whose face for this call (document.fonts.check of weight, style, size) is not loaded throws (a fallback
//     face would silently change every box), as does a size of 0. tracking is em as a number, or '0.04em' / '2px'.
//
//   KIT.text.reveal(host, split, { by = 'lines'|'words'|'chars', mask = true, stagger = 0.04, from = 'start'|'center'|'edges',
//                                  dur = 0.5, ease = 'outExpo', at = 0, tracking = [fromEm, toEm], axes = { wght: [400, 700] },
//                                  color }) → { set(t), end }
//     A masked reveal wipes each line up from behind its line box: one span per line with clip-path: inset(0), inner units
//     translated down by the clip height at p = 0 (so nothing shows) and 0 at p = 1 (so nothing is clipped). The clip is
//     lineHeight · 1.15 tall — enough for descenders. `mask: false` fades and rises instead (no clip). from: 'center' starts
//     in the middle, 'edges' at both ends; 'chars' makes each glyph an inline-block, so ligatures and pair kerning go (that is
//     per-glyph motion). A <canvas> host gets the same reveal as clipped strips drawn from the split's
//     glyphs. `tracking: [0.04, 0]` animates letter-spacing per line over the entrance (never per glyph: spacing stays even);
//     `axes` animates font-variation-settings the same way (see KIT.text.axes) and needs a DOM host: a <canvas> host draws
//     through ctx.font, where font-variation-settings do not apply, so axes on a canvas throws. end = at + dur + the last
//     unit's stagger.
//
//   KIT.text.axes(font, axes, { variable = false }) → (p) => 'font-variation-settings' string
//     Validates the axes once, then interpolates them. An axis tag must be a real OpenType axis; a family whose @font-face
//     declarations are all single weights is not variable and throws instead of animating an axis that does nothing.
//     font-optical-sizing: auto already picks opsz from the size — animate opsz only when you mean to, and the reveal sets
//     font-optical-sizing: none so the setting is not overridden. GRAD adds weight without changing advance widths.
//     Never fake weight by scaling text: that blurs the glyphs and changes the spacing. Animate wght / GRAD / opsz.
//
//   KIT.text.maskLines(el, { lineHeight, pad = 0, apply = true }) → { lines: [{ x, y, width, height }], clip }
//     For a static element that only needs its line boxes: measures one box per rendered line (Range rects, stage px) and,
//     when apply, sets clip-path: path(…) to their union (padded by pad, a number or { x, y }). Measure at load, not per frame.
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('text-split.js: load tools/engine.js first');
  const T = (K.text = K.text || {});
  const ctx = document.createElement('canvas').getContext('2d');

  // em as a number or '0.04em'; anything else is px ('2px', 2px worth). `null`/undefined is 0.
  const emOf = (v) => (typeof v === 'number' ? v : /em$/.test(String(v)) ? parseFloat(v) : null);
  const trackPx = (v, size) => { if (v == null) return 0; const e = emOf(v); return e != null ? e * size : parseFloat(String(v)) || 0; };
  const family = (f) => String(f || 'sans-serif').replace(/["']/g, '').split(',')[0].trim();
  const faces = (f) => [...document.fonts].filter((x) => x.family.replace(/["']/g, '') === family(f));
  const faceList = (list) => list.map((f) => `${f.weight} ${f.style} → ${f.status}`).join(', ');

  // ── split ────────────────────────────────────────────────────────────────
  const cache = new Map();   // key = every input, so the same call never measures twice
  const fontOf = (o, size) => `${o.style || 'normal'} ${o.weight || 400} ${size}px ${o.font || 'sans-serif'}`;
  const measure = (o, size) => { ctx.font = fontOf(o, size); ctx.letterSpacing = trackPx(o.tracking, size) + 'px'; };

  const split = (str, o = {}) => {
    const size = o.size;
    if (!(size > 0)) throw new Error('KIT.text.split: size is required');
    const key = JSON.stringify([String(str), o.font || '', size, o.weight || 400, o.style || 'normal', o.tracking || 0, o.lineHeight || 1.2, o.maxWidth || 0]);
    const hit = cache.get(key);
    if (hit) return hit;
    const list = faces(o.font);
    if (list.length && !document.fonts.check(fontOf(o, size))) throw new Error(`KIT.text.split: the face of font "${family(o.font)}" this call uses (${fontOf(o, size)}) is not loaded (faces: ${faceList(list)}); build the split after document.fonts.ready, never in render(t)`);
    measure(o, size);
    const lh = size * (o.lineHeight || 1.2), maxW = o.maxWidth > 0 ? o.maxWidth : Infinity;
    const adv = new Map();   // one char measured once per (font, size, tracking)
    const w1 = (ch) => { let w = adv.get(ch); if (w == null) adv.set(ch, (w = ctx.measureText(ch).width)); return w; };
    const width = (text) => { let w = 0; for (const ch of Array.from(text)) w += w1(ch); return w; };
    const texts = [];
    for (const para of String(str).split('\n')) {
      let cur = '';
      for (const tok of para.match(/\S+\s*|\s+/g) || ['']) {
        if (cur && maxW < Infinity && width(cur + tok) > maxW + 1e-9) { texts.push(cur.replace(/\s+$/, '')); cur = tok.replace(/^\s+/, ''); }
        else cur += tok;
      }
      texts.push(cur.replace(/\s+$/, ''));
    }
    const m = ctx.measureText('Hg');   // font metrics: independent of the string
    const ascent = m.fontBoundingBoxAscent ?? size * 0.8, descent = m.fontBoundingBoxDescent ?? size * 0.2;
    const half = (lh - ascent - descent) / 2;
    const lines = texts.map((text, i) => {
      let x = 0;
      const glyphs = Array.from(text).map((ch) => { const w = w1(ch), g = { ch, x, w }; x += w; return g; });
      return { text, x: 0, y: i * lh + half + ascent, width: x, glyphs };
    });
    const out = { lines, width: Math.max(0, ...lines.map((l) => l.width)), height: lines.length * lh,
      lineHeight: lh, ascent, descent, font: o.font || 'sans-serif', size, weight: o.weight || 400, style: o.style || 'normal', tracking: o.tracking || 0 };
    if (cache.size > 400) cache.clear();   // a film splits a handful of strings; this only bounds a long-lived page
    cache.set(key, out);
    return out;
  };

  // ── variable-font axes ───────────────────────────────────────────────────
  // The browser exposes no axis list, so Reelwright checks what it can prove: the tag is a registered OpenType axis, and the
  // family is declared variable (a @font-face with a weight or style range). Both errors are typos or a static font, not taste.
  const STD = ['wght', 'wdth', 'ital', 'slnt', 'opsz'];
  const CUSTOM = ['GRAD', 'XOPQ', 'YOPQ', 'XTRA', 'YTRA', 'YTAS', 'YTDE', 'YTFI', 'YTLC', 'YTUC',
    'CASL', 'CRSV', 'MONO', 'FILL', 'SOFT', 'WONK', 'BNCE', 'INFM', 'SPAC'];
  const axisCss = (axes, p) => Object.entries(axes).map(([k, [a, b]]) => `"${k}" ${K.lerp(a, b, p).toFixed(2)}`).join(', ');
  T.axes = (font, axes, { variable = false } = {}) => {
    if (!axes || typeof axes !== 'object') throw new Error('KIT.text.axes: pass { axis: [from, to], … }');
    const known = [...STD, ...CUSTOM], list = faces(font);
    if (list.length && !list.some((f) => f.status === 'loaded')) throw new Error(`KIT.text.axes: no face of font "${family(font)}" is loaded (faces: ${faceList(list)}); call this after document.fonts.ready`);
    if (!variable && list.length && !list.some((f) => /\s/.test(f.weight) || /\s/.test(f.style))) {
      throw new Error(`KIT.text.axes: font "${family(font)}" is not variable (faces: ${[...new Set(list.map((f) => f.weight))].join(', ')}); ` +
        'ship one variable file and declare font-weight: 100 900, or pass { variable: true } to set the axes anyway');
    }
    for (const [k, v] of Object.entries(axes)) {
      if (!known.includes(k)) throw new Error(`KIT.text.axes: unknown axis "${k}"; not an OpenType axis tag (known: ${known.join(', ')})`);
      if (!Array.isArray(v) || v.length !== 2 || !v.every(Number.isFinite)) throw new Error(`KIT.text.axes: "${k}" wants [from, to] numbers, got ${JSON.stringify(v)}`);
    }
    return (p) => axisCss(axes, p);
  };

  // ── reveal ───────────────────────────────────────────────────────────────
  // units in reading order; 'center' and 'edges' only change each unit's delay, never its place in the text
  const delays = (n, from, stagger) => Array.from({ length: n }, (_, i) =>
    (from === 'center' ? Math.abs(i - (n - 1) / 2) : from === 'edges' ? Math.min(i, n - 1 - i) : i) * stagger);
  const words = (text) => text.match(/\S+\s*|\s+/g) || [''];

  T.reveal = (host, parts, o = {}) => {
    const { by = 'lines', mask = true, stagger = 0.04, from = 'start', dur = 0.5, ease = 'outExpo', at = 0, tracking = null, axes = null, color = null } = o;
    if (!['lines', 'words', 'chars'].includes(by)) throw new Error(`KIT.text.reveal: by must be lines, words or chars, not "${by}"`);
    const S = parts && parts.lines ? parts : { lines: parts };
    const lines = S.lines;
    if (!Array.isArray(lines) || !lines.length) throw new Error('KIT.text.reveal: pass the object KIT.text.split returns');
    const size = S.size, lh = S.lineHeight;
    if (!(size > 0) || !(lh > 0)) throw new Error('KIT.text.reveal: the split result needs size and lineHeight (pass the whole KIT.text.split result)');
    const isCanvas = typeof HTMLCanvasElement !== 'undefined' && host instanceof HTMLCanvasElement;
    if (!isCanvas && !(host instanceof Element)) throw new Error('KIT.text.reveal: host must be an element or a <canvas>');
    const e = typeof ease === 'function' ? ease : K.easing(ease), maskH = lh * 1.15;
    if (isCanvas && axes) throw new Error('KIT.text.reveal: axes need a DOM host: canvas text cannot take font-variation-settings');
    const axis = axes ? T.axes(S.font, axes) : null;   // validated once, here, not per frame
    const track = tracking ? [emOf(tracking[0]) ?? 0, emOf(tracking[1]) ?? 0] : null;
    const units = [], lineEls = [], g = isCanvas ? host.getContext('2d') : null, fontCss = fontOf(S, size);

    if (isCanvas) {
      lines.forEach((L, li) => {
        const groups = by === 'lines' ? [L.glyphs]
          : by === 'chars' ? L.glyphs.map((gl) => [gl])
            : (() => { const out = []; let cur = null;   // words: a space ends a word and stays with it
              for (const gl of L.glyphs) { if (!cur || /\s/.test(cur.at(-1).ch)) { cur = []; out.push(cur); } cur.push(gl); }
              return out; })();
        for (const glyphs of groups) units.push({ glyphs, line: li });
      });
    } else {
      host.textContent = '';
      lines.forEach((L, li) => {
        const box = document.createElement('div'), line = document.createElement('div');
        K.css(box, { position: 'relative', display: 'block', width: 'max-content', height: maskH + 'px', marginBottom: -(maskH - lh) + 'px' });
        K.css(line, { position: 'relative', display: 'block', whiteSpace: 'pre', height: lh + 'px', lineHeight: lh + 'px', font: fontCss,
          letterSpacing: trackPx(S.tracking, size) + 'px' });
        if (mask) box.style.clipPath = 'inset(0px)';   // the line box is the mask; units translate behind it
        if (axis) { line.style.fontVariationSettings = axis(1); if (axes.opsz) line.style.fontOpticalSizing = 'none'; }
        box.appendChild(line); host.appendChild(box);
        lineEls.push(line);
        if (by === 'lines') { line.textContent = L.text; units.push({ el: line, line: li }); return; }
        for (const piece of by === 'chars' ? Array.from(L.text) : words(L.text)) {
          const sp = document.createElement('span');
          sp.textContent = piece;
          K.css(sp, { display: 'inline-block', whiteSpace: 'pre' });
          line.appendChild(sp);
          units.push({ el: sp, line: li });
        }
      });
    }

    const d = delays(units.length, from, stagger), end = at + dur + Math.max(0, ...d);
    units.forEach((u, i) => { u.delay = d[i]; });

    const set = (t) => {
      const q = e(K.seg(t, at, end));   // the entrance envelope: tracking and axes settle with the last unit
      const dpx = track ? (K.lerp(track[0], track[1], q) - trackPx(S.tracking, size) / size) * size : 0;   // extra px per glyph
      if (track) { const v = K.lerp(track[0], track[1], q) * size; lineEls.forEach((el) => { el.style.letterSpacing = v.toFixed(3) + 'px'; }); }
      if (axis) { const css = axis(q); lineEls.forEach((el) => { el.style.fontVariationSettings = css; }); }
      if (g) {
        g.clearRect(0, 0, host.width, host.height);
        g.font = fontCss; g.textBaseline = 'alphabetic'; g.fillStyle = color || '#fff';
        if (axis) g.fontVariationSettings = axis(q);
      }
      for (const u of units) {
        const p = e(K.seg(t, at + u.delay, at + u.delay + dur));
        if (!g) {
          u.el.style.transform = 'translateY(' + ((1 - p) * (mask ? maskH + 2 : 0.3 * size)).toFixed(3) + 'px)';
          if (!mask) u.el.style.opacity = p.toFixed(4);
          continue;
        }
        const L = lines[u.line], asc = S.ascent ?? 0.8 * size, desc = S.descent ?? 0.2 * size;
        const top = L.y - asc - (lh - asc - desc) / 2;   // the line box's top edge
        const w = L.width + (u.glyphs.length - 1) * dpx + 2, ty = (1 - p) * (mask ? maskH + 2 : 0.3 * size);
        g.save(); g.beginPath(); g.rect(0, top, Math.max(w, 1), maskH); g.clip();
        u.glyphs.forEach((gl, i) => g.fillText(gl.ch, L.x + gl.x + i * dpx, L.y + ty));
        g.restore();
      }
    };
    set(-1e9);   // hidden before its time, even if render never runs
    return { set, end };
  };

  // ── line boxes of a static element ───────────────────────────────────────
  T.maskLines = (el, { lineHeight = null, pad = 0, apply = true } = {}) => {
    const r0 = el.getBoundingClientRect(), sx = r0.width / (el.offsetWidth || r0.width) || 1, sy = r0.height / (el.offsetHeight || r0.height) || 1;
    const p = typeof pad === 'number' ? { x: pad, y: pad } : { x: pad?.x ?? 0, y: pad?.y ?? 0 };
    const range = document.createRange(); range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5).sort((a, b) => a.top - b.top || a.left - b.left);
    const groups = [];
    for (const r of rects) {   // one group per rendered line: a rect whose middle is inside the last group belongs to it
      const g = groups.at(-1), mid = (r.top + r.bottom) / 2;
      if (g && mid > g.top && mid < g.bottom) { g.left = Math.min(g.left, r.left); g.right = Math.max(g.right, r.right); g.top = Math.min(g.top, r.top); g.bottom = Math.max(g.bottom, r.bottom); }
      else groups.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
    }
    const lines = groups.map((g) => {
      const h = (g.bottom - g.top) / sy, x = (g.left - r0.left) / sx, y = (g.top - r0.top) / sy, hh = lineHeight ?? h;
      return { x: x - p.x, y: y + (h - hh) / 2 - p.y, width: (g.right - g.left) / sx + 2 * p.x, height: hh + 2 * p.y };
    });
    const r3 = (v) => +v.toFixed(3);
    const clip = 'path("' + lines.map((l) => `M ${r3(l.x)} ${r3(l.y)} H ${r3(l.x + l.width)} V ${r3(l.y + l.height)} H ${r3(l.x)} Z`).join(' ') + '")';
    if (apply) el.style.clipPath = clip;
    return { lines, clip };
  };

  T.split = split;
})();
