// p5-doodle.js: hand-drawn pieces built on doodle.js + doodle2.js (+ layouts.js for kinetic). Load after those. Pure functions of t.
//   D.callout({ anchor, cam, label, in, dx, dy, size, style, out, parent }) → { el, at(t), set(t) }
//     A dot lands on `anchor` (a [x, y] in world px, or t → [x, y]) at `in` (overshoot pop, 0.22 s), a leader line is drawn from it to the
//     label (0.35 s), then the label is written in pen lettering (upper case; letters in D.glyphs). `cam` (t → cam3 state, e.g. a
//     KIT.shot.keys / tour) makes the anchor follow the camera: the callout moves with the point, at constant on-screen size.
//     [dx, dy] is the label's offset from the anchor in px (default up and to the right; a negative dx writes the label to the left).
//   D.steps(marks, t0, t1, o) → { score, phases, steps, still(parent), sheet(parent, o) }
//     One drawing score, three products. `score` is D.score (the film); `still` is the finished picture (score.set(t1)); `phases` are the
//     teaching phases in order (mark.phase, default: the marks split evenly over o.phaseNames = block-in, outline, detail, finish) and
//     `steps` [{ n, phase, ids, t }] where t is the time the phase's last mark is finished; sheet(parent, { cols, cell }) lays out one cell
//     per step, each showing the picture exactly as it stands at that step plus a "STEP n: phase" caption (copies of the marks, the
//     film's marks are untouched). marks with `el` are cloned, `pts` marks are redrawn.
//   KIT.layout.kinetic({ style: 'drawn', line, accent, in, out, draw })   (wraps the layouts.js one)
//     Every word of VO line `line` is written stroke by stroke by the pen as it is spoken (D.letters), the letters pop 1 → 1.08 → 1 as the
//     word lands, accent words in --kit-accent. Characters the pen font lacks are dropped. KIT.layout.kineticDrawn is the same function.
'use strict';
(function () {
  const K = window.KIT, D = K && K.doodle, SVG = 'http://www.w3.org/2000/svg';
  if (!D || !D.letters || !D.score) throw new Error('p5-doodle.js: load tools/doodle.js and tools/doodle2.js first');
  if (!K.project) throw new Error('p5-doodle.js: load tools/p5-camera.js first (KIT.project)');
  const u = K.u, f2 = (v) => +v.toFixed(2);
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const overlay = (parent) => {
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    return mk('svg', { width: K.W_, height: K.H_, viewBox: `0 0 ${K.W_} ${K.H_}`, style: 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none' }, parent);
  };
  const penWidth = (text, size) => { let w = 0; for (const ch of String(text).toUpperCase()) { const g = D.glyphs[ch]; if (!g) throw new Error(`doodle: no pen glyph for "${ch}"`); w += g[0]; } return (w * size) / 1000; };

  let calls = 0;
  D.callout = ({ anchor, cam, label, in: t0, dx = 150 * u, dy = -110 * u, size = 46 * u, style = 'marker', out, parent = K.stage, id } = {}) => {
    if (!Number.isFinite(t0)) throw new Error('callout: give `in` (seconds, from W()/V()/KIT.snap())');
    if (!label) throw new Error('callout: give a label');
    const n = id || 'callout-' + calls++, svg = overlay(parent), root = mk('g', {}, svg), at0 = typeof anchor === 'function' ? anchor : () => anchor;
    const wid = penWidth(label, size), lx = dx >= 0 ? dx + 14 * u : dx - 14 * u - wid;
    const dotR = 9 * u, dot = mk('circle', { cx: 0, cy: 0, r: dotR, style: 'fill:var(--kit-accent)' }, root);
    // leader: anchor → just short of the label's near end, with a slight bend (a hand-drawn line is never ruled)
    const ex = dx >= 0 ? dx : dx, ey = dy, leader = D.stroke(root, [[0, 0], [ex * 0.45, ey * 0.2 + 6 * u], [ex, ey]], { id: n + ':leader', style, color: 'var(--kit-ink)', w: 4 * u, in: t0 + 0.12, draw: 0.35, out });
    const text = D.letters(root, label, { id: n + ':label', size, x: lx, y: ey + size * 0.3, style, color: 'var(--kit-ink)', in: t0 + 0.42, out });
    const T0 = t0 + 0.12, T1 = T0 + 0.35;   // the leader's window
    const pos = (t) => { const a = at0(t); return cam ? K.project(cam(t), a) : a; };
    return { el: svg, at: pos, leaderEnd: T1, labelStart: t0 + 0.42, set(t) {
      const [x, y] = pos(t), p = K.seg(t, t0, t0 + 0.22), pop = p <= 0 ? 0 : K.E.outBack(p), fade = out == null ? 1 : 1 - K.easeIn(K.seg(t, out - K.dur(0.45), out));
      root.setAttribute('transform', `translate(${f2(x)} ${f2(y)})`);
      dot.setAttribute('r', f2(dotR * pop)); dot.style.opacity = String(fade);
      leader.set(t); text.set(t);
    } };
  };

  // ── one score → still, timelapse, step sheet ─────────────────────────────
  D.steps = (marks, t0, t1, o = {}) => {
    const score = D.score(marks, t0, t1, o), names = o.phaseNames || ['block-in', 'outline', 'detail', 'finish'];
    const kept = score.order.map((id) => marks.find((m) => m.id === id));
    const ph = (m, i) => m.phase ?? names[Math.min(names.length - 1, Math.floor((i / kept.length) * names.length))];
    const phases = [];
    kept.forEach((m, i) => { const p = ph(m, i); if (!phases.includes(p)) phases.push(p); });
    const steps = phases.map((p, n) => {
      const ids = kept.filter((m, i) => ph(m, i) === p).map((m) => m.id);
      return { n: n + 1, phase: p, ids, t: Math.max(...ids.map((id) => score.windows[id][1])) };
    });
    const copy = (parentG) => marks.map((m) => {
      if (m.el) { const c = m.el.cloneNode(true); parentG.appendChild(c); return { ...m, el: c }; }
      return { ...m, parent: parentG };
    });
    return { score, phases, steps,
      still: () => score.set(t1),
      sheet(parent = K.stage, { cols = Math.min(4, steps.length), cell = { w: 420 * u, h: 340 * u }, gap = 16 * u, scale = 1 } = {}) {
        const rows = Math.ceil(steps.length / cols), box = K.el('div', 'kit-stepsheet', parent);
        K.css(box, { position: 'absolute', left: '0px', top: '0px', width: cols * (cell.w + gap) + 'px', height: rows * (cell.h + gap) + 'px' });
        const cells = steps.map((s, i) => {
          const c = K.el('div', 'kit-stepcell', box), svg = mk('svg', { width: cell.w, height: cell.h, viewBox: `0 0 ${cell.w / scale} ${cell.h / scale}`, style: 'overflow:hidden' }, c);
          K.css(c, { position: 'absolute', left: (i % cols) * (cell.w + gap) + 'px', top: Math.floor(i / cols) * (cell.h + gap) + 'px', width: cell.w + 'px', height: cell.h + 'px' });
          const g = mk('g', {}, svg), sc = D.score(copy(g), t0, t1, { ...o, parent: g });
          const cap = K.el('div', 'kit-stepcap', c); cap.textContent = `STEP ${s.n}: ${s.phase.toUpperCase()}`;
          K.css(cap, { position: 'absolute', left: 8 * u + 'px', bottom: 6 * u + 'px', font: `600 ${20 * u}px var(--kit-font, sans-serif)` });
          return { sc, t: s.t };
        });
        return { el: box, cells: steps.length, set(t) { for (const c of cells) c.sc.set(c.t); } };   // each cell is its step's picture, held
      } };
  };

  // ── drawn kinetic type ───────────────────────────────────────────────────
  const L = K.layout;
  if (L && L.kinetic) {
    const plain = L.kinetic, norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    const clean = (w) => [...w.toUpperCase()].filter((c) => D.glyphs[c]).join('');
    L.kineticDrawn = (o) => {
      const el = K.el('div', 'kit-lay kit-lay-kinetic kit-fmt-' + K.fmt, o.parent || K.stage), svg = overlay(el);
      const toks = K.V(o.line).text.split(/\s+/).map((w) => ({ w, c: clean(w) })), times = K.align(o.line);
      const items = toks.map((x, i) => ({ ...x, t: times[i] })).filter((x) => x.c);
      if (!items.length) throw new Error(`kinetic drawn: line "${o.line}" has no letters the pen font has`);
      const box = K.safe, space = 300, accent = (o.accent || []).map(norm);
      // largest size at which the wrapped words fit the safe box (line height 1.25 em, the space glyph's 300 units between words)
      const layout = (size) => {
        const lines = [[]]; let x = 0;
        for (const it of items) {
          const w = penWidth(it.c, size);
          if (x && x + w > box.w) { lines.push([]); x = 0; }
          lines[lines.length - 1].push({ it, x, w }); x += w + (space * size) / 1000;
        }
        return lines;
      };
      let size = 260 * u;
      while (size > 16 * u && layout(size).length * size * 1.25 > box.h) size *= 0.93;
      const lines = layout(size), top = box.y + (box.h - lines.length * size * 1.25) / 2, nib = o.draw ?? 0.45;
      const words = [];
      lines.forEach((ln, li) => {
        const tot = ln[ln.length - 1].x + ln[ln.length - 1].w, x0 = box.x + (box.w - tot) / 2;
        for (const { it, x, w } of ln) {
          const g = mk('g', {}, svg), y = top + li * size * 1.25 + size * 0.95;
          const hand = D.letters(g, it.c, { id: `${o.line}:${words.length}`, x: x0 + x, y, size, style: o.penStyle || 'marker', color: accent.includes(norm(it.w)) ? 'var(--kit-accent)' : 'var(--kit-ink)', in: it.t - 0.06, draw: nib });
          words.push({ g, hand, cx: x0 + x + w / 2, cy: y - size * 0.35, t: it.t - 0.06 + nib });
        }
      });
      return { el, words, set(t) {
        const z = o.out == null ? 0 : K.easeIn(K.seg(t, o.out - K.dur(0.45), o.out));
        K.show(el, t < o.in ? 0 : 1 - z);
        for (const w of words) {
          w.hand.set(t);
          const p = K.seg(t, w.t, w.t + 0.18), s = 1 + 0.08 * Math.sin(Math.PI * p);   // pops as the last stroke lands
          w.g.setAttribute('transform', `translate(${f2(w.cx)} ${f2(w.cy)}) scale(${+s.toFixed(4)}) translate(${f2(-w.cx)} ${f2(-w.cy)})`);
        }
      } };
    };
    L.kinetic = (o) => (o && o.style === 'drawn' ? L.kineticDrawn(o) : plain(o));
  }
})();
