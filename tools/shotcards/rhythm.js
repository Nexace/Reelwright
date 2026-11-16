// Shotcards, rhythm: KIT.shotcards.<name>. Load after engine.js and shots.js (jumpCut returns a KIT.shot-style state function; trailerBumper
// uses KIT.shake). HyperFrames: kit/shotcards/rhythm.js; pvk: ../../../tools/shotcards/rhythm.js. Pure functions of t. Beat times come
// from the caller (KIT.snap / KIT.beat / W() / V()), never from here. Each object helper returns { set(t), at(t) }.
//   stepList({ root, items, beats, themes })          list steps on each beat and the whole panel flips to the next theme
//   comicPanels({ layout, gutter, t0, t1 })           multi-panel split: gutters first, panels revealed in turn
//   quadSplit({ gap, offsets, t0 })                   four sub-stages, each a full-frame element on its own clock
//   jumpCut({ beats, zooms, xs })                     (t) => state: hard cuts to punched-in framings on the beat
//   steppedTime(t, cadence) / sakugaTime({ shifts, holds })   quantise time onto twos/threes, shift cadence, hold key poses
//   trailerBumper({ steps, at })                      cards, slams, flashes and dead air in trailer order
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.shot || !K.shake) throw new Error('shotcards/rhythm.js: load engine.js and shots.js first');
  const C = (K.shotcards = K.shotcards || {}), n4 = (v) => +v.toFixed(4), n1 = (v) => +v.toFixed(1), E = (n) => K.easing(n), W = K.W_, H = K.H_;
  const need = (ok, msg) => { if (!ok) throw new Error(msg); };

  // beat-step-list-theme-cycle: item j enters on beats[j] (rise + fade, 0.18 s) with a scale pulse; the newest item takes the theme's accent,
  // older ones dim to 0.4; `root` flips to themes[(step - 1) % themes.length] = { bg, ink, accent } on every beat (a hard cut: it is a
  // beat, not a fade). Writes root's background, color and --kit-accent, and the items' opacity, transform and color.
  C.stepList = ({ root, items, beats, themes } = {}) => {
    need(root && items && beats && themes && themes.length && beats.length >= items.length, 'stepList: need { root, items, beats (>= items), themes }');
    const step = (t) => beats.filter((b) => b <= t).length;
    const at = (t) => {
      const k = step(t), th = themes[Math.max(0, k - 1) % themes.length];
      return { step: k, theme: th, items: items.map((_, j) => {
        if (j >= k) return { op: 0, y: 14 * K.u, s: 1, on: false };
        const d = t - beats[j], ent = E('power3.out')(K.seg(d, 0, 0.18)), on = j === k - 1;
        return { op: on ? n4(ent) : 0.4, y: n1(14 * K.u * (1 - ent)), s: on ? n4(1 + 0.06 * Math.exp(-d / 0.12)) : 1, on };
      }) };
    };
    const set = (t) => {
      const a = at(t);
      root.style.background = a.theme.bg; root.style.color = a.theme.ink; root.style.setProperty('--kit-accent', a.theme.accent);
      a.items.forEach((m, j) => { const e = items[j]; K.show(e, m.op); e.style.transform = 'translateY(' + m.y + 'px) scale(' + m.s + ')'; e.style.color = m.on ? a.theme.accent : ''; });
    };
    return { set, at, step };
  };

  // panel-grid-moves / comic-panel-split: layout is rows of column weights ([[1, 1], [2, 1]] = two rows, the second 2:1); panels are
  // equal-height rows split by `gutter` inside `margin`; the stage shows through the gutters. They wipe in one by one in `order`
  // (default reading order), the direction cycling left, up, right, down (clip-path inset + a 1.05 -> 1 scale). Put content in panels[i].el.
  C.comicPanels = ({ parent = K.stage, layout, gutter = 14 * K.u, margin = 24 * K.u, t0, t1, order, dur = K.dur(0.35) } = {}) => {
    need(layout && layout.length && t1 - t0 >= dur, 'comicPanels: need { layout, t0, t1 } with t1 - t0 >= dur');
    const n = layout.reduce((a, r) => a + r.length, 0), seq = order || Array.from({ length: n }, (_, i) => i);
    need(seq.length === n && new Set(seq).size === n, 'comicPanels: order must list every panel once');
    const rh = (H - 2 * margin - (layout.length - 1) * gutter) / layout.length, panels = [];
    layout.forEach((cols, r) => {
      const sum = cols.reduce((a, b) => a + b, 0), room = W - 2 * margin - (cols.length - 1) * gutter; let x = margin;
      cols.forEach((w) => {
        const pw = room * w / sum, el = K.el('div', 'kit-panel', parent);
        K.css(el, { position: 'absolute', left: n1(x) + 'px', top: n1(margin + r * (rh + gutter)) + 'px', width: n1(pw) + 'px', height: n1(rh) + 'px', overflow: 'hidden', border: n1(3 * K.u) + 'px solid var(--kit-ink)', boxSizing: 'border-box', background: 'color-mix(in srgb, var(--kit-ink) 10%, var(--kit-bg))' });
        panels.push({ el, x: n1(x), y: n1(margin + r * (rh + gutter)), w: n1(pw), h: n1(rh) }); x += pw + gutter;
      });
    });
    const rank = [];
    seq.forEach((p, k) => { rank[p] = k; });
    const inset = [(q) => '0 ' + q + '% 0 0', (q) => '0 0 ' + q + '% 0', (q) => '0 0 0 ' + q + '%', (q) => q + '% 0 0 0'];
    const at = (t) => panels.map((_, i) => { const a = t0 + K.stagger(rank[i], n, t1 - t0 - dur); return n4(E('power3.out')(K.seg(t, a, a + dur))); });
    const set = (t) => at(t).forEach((p, i) => { const e = panels[i].el; K.show(e, p > 0 ? 1 : 0); e.style.clipPath = p >= 1 ? 'none' : 'inset(' + inset[rank[i] % 4](n4(100 * (1 - p))) + ')'; e.style.transform = 'scale(' + n4(1.05 - 0.05 * p) + ')'; });
    return { set, at, panels };
  };

  // quad-split-parallel-scenes: four cells (2 x 2, `gap` apart); each holds `inner`, a full-frame (W x H) element scaled to fit the cell, so
  // a sub-scene built with parent: inner uses the film's own coordinates. Each runs on its own clock: local(i, t) = t - offsets[i]. The
  // cells pop in (scale .92 -> 1, fade) K.stagger apart from t0. Build the sub-scene's set(local(i, t)) yourself in render(t).
  C.quadSplit = ({ parent = K.stage, gap = 12 * K.u, margin = 0, offsets = [0, 0.4, 0.8, 1.2], t0 = 0 } = {}) => {
    const cw = (W - 2 * margin - gap) / 2, ch = (H - 2 * margin - gap) / 2, s = Math.min(cw / W, ch / H), cells = [];
    for (let i = 0; i < 4; i++) {
      const x = margin + (i % 2) * (cw + gap), y = margin + Math.floor(i / 2) * (ch + gap), el = K.el('div', 'kit-quad-cell', parent), inner = K.el('div', 'kit-quad-inner', el);
      K.css(el, { position: 'absolute', left: n1(x) + 'px', top: n1(y) + 'px', width: n1(cw) + 'px', height: n1(ch) + 'px', overflow: 'hidden' });
      K.css(inner, { position: 'absolute', left: n1((cw - W * s) / 2) + 'px', top: n1((ch - H * s) / 2) + 'px', width: W + 'px', height: H + 'px', transformOrigin: '0 0', transform: 'scale(' + n4(s) + ')' });
      cells.push({ el, inner, x: n1(x), y: n1(y), w: n1(cw), h: n1(ch) });
    }
    const local = (i, t) => t - offsets[i], at = (t) => cells.map((_, i) => n4(E('power3.out')(K.seg(t, t0 + K.stagger(i, 4, 0.3), t0 + K.stagger(i, 4, 0.3) + 0.35))));
    const set = (t) => at(t).forEach((p, i) => { K.show(cells[i].el, p); cells[i].el.style.transform = 'scale(' + n4(0.92 + 0.08 * p) + ')'; });
    return { set, at, cells, local };
  };

  // rhythm-interrupt-moves, jump-cut-punch-in: (t) => state like a KIT.shot preset (feed KIT.shoot or KIT.shot.track). Before beats[0] it
  // holds zooms[0]; at beats[k] it cuts, with no travel, to zooms[(k + 1) % len] about the focal point xs[(k + 1) % len] x W, punched
  // `punch` deeper and settling over `decay` (power2.out). Hard cuts are the move: pair them with a sound hit on the beat.
  C.jumpCut = ({ beats, zooms = [1, 1.25, 1.12], xs = [0, -0.14, 0.14], punch = 0.06, decay = K.dur(0.25) } = {}) => {
    need(beats && beats.length, 'jumpCut: need { beats }');
    const fn = (t) => {
      const k = beats.filter((b) => b <= t).length, z = zooms[k % zooms.length], d = k ? t - beats[k - 1] : Infinity;
      return K.cam3({ z: z + (k ? punch * (1 - E('power2.out')(K.seg(d, 0, decay))) : 0), x: W / 2 + xs[k % xs.length] * W, y: H / 2 });
    };
    fn.cuts = beats;
    return fn;
  };

  // sakuga-timing-shift: time on twos or threes. steppedTime(t, cadence = 2, fps = 30) holds each pose for `cadence` frames (the value
  // at the start of its block; cadence <= 1 = smooth). sakugaTime({ shifts: [{ at, cadence }], holds: [{ at, dur }], fps }) is a (t) => t'
  // for the whole film: holds freeze the clock for dur s (a key pose, an impact frame; later time lags by the sum), and the cadence
  // changes at each shift (the latest with at <= t). Feed t' to the animation you want stepped; leave the camera on t.
  C.steppedTime = (t, cadence = 2, fps = 30) => (cadence <= 1 ? t : Math.floor(t * fps / cadence + 1e-6) * cadence / fps);
  C.sakugaTime = ({ shifts = [{ at: 0, cadence: 1 }], holds = [], fps = 30 } = {}) => {
    const sh = shifts.slice().sort((a, b) => a.at - b.at);
    return (t) => {
      const u = t - holds.reduce((s, h) => s + Math.min(Math.max(t - h.at, 0), h.dur), 0);
      let c = 1; for (const x of sh) if (x.at <= t) c = x.cadence;
      return C.steppedTime(u, c, fps);
    };
  };

  // trailer-grammar-moves: steps run back to back from `at`: { kind: 'card', text, sub?, dur } (calm title card: fade in 0.3 s, slow 4 %
  // push, fade out 0.2 s), 'slam' (headline lands from 1.7 x on outExpo in 0.14 s with a white impact flash and a KIT.shake), 'flash' (a
  // white flash cut, peak at the middle) and 'black' (dead air). The black bed shows from `at` to `end`. Owns its own elements only.
  C.trailerBumper = ({ parent = K.stage, steps, at: t0 = 0, bg = '#000', ink = '#fff' } = {}) => {
    need(steps && steps.length, 'trailerBumper: need { steps }');
    let s = t0; const starts = steps.map((st) => { const a = s; s += st.dur; return a; }), end = s;
    const bed = K.el('div', 'kit-bumper', parent), flash = K.el('div', 'kit-bumper-flash', parent);
    K.css(bed, { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', background: bg, zIndex: 10 });
    K.css(flash, { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', background: '#fff', zIndex: 12, pointerEvents: 'none' });
    const els = steps.map((st) => {
      if (st.kind !== 'card' && st.kind !== 'slam') return null;
      const e = K.el('div', 'kit-bumper-text', parent, st.text + (st.sub ? '<div style="position:static;font-size:' + n1((st.kind === 'slam' ? 0.04 : 0.028) * H) + 'px;font-weight:500;opacity:.7;margin-top:.5em">' + st.sub + '</div>' : ''));
      K.css(e, { position: 'absolute', left: '0px', top: '0px', width: W + 'px', height: H + 'px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: ink, fontWeight: 800, fontSize: n1((st.kind === 'slam' ? 0.13 : 0.07) * H) + 'px', zIndex: 11 });
      return e;
    });
    const at = (t) => {
      let fl = 0; const out = steps.map((st, i) => {
        const d = t - starts[i], on = d >= 0 && d < st.dur;
        if (!on) return { on: false, op: 0, s: 1, x: 0, y: 0 };
        if (st.kind === 'flash') { fl = Math.max(fl, 1 - Math.abs(1 - 2 * d / st.dur)); return { on, op: 0, s: 1, x: 0, y: 0 }; }
        if (st.kind === 'black') return { on, op: 0, s: 1, x: 0, y: 0 };
        if (st.kind === 'card') return { on, op: n4(Math.min(K.seg(d, 0, 0.3), 1 - K.seg(d, st.dur - 0.2, st.dur))), s: n4(1 + 0.04 * d / st.dur), x: 0, y: 0 };
        fl = Math.max(fl, 0.7 * (1 - K.seg(d, 0, 0.12)));
        const sh = K.shake(d, 0, 10 * K.u, 0.06);
        return { on, op: n4(1 - K.seg(d, st.dur - 0.08, st.dur)), s: n4(K.lerp(1.7, 1, E('outExpo')(K.seg(d, 0, 0.14)))), x: n1(sh.x), y: n1(sh.y) };
      });
      return { bed: t >= t0 && t < end ? 1 : 0, flash: n4(fl), steps: out };
    };
    const set = (t) => {
      const a = at(t); K.show(bed, a.bed); K.show(flash, a.flash);
      a.steps.forEach((m, i) => { const e = els[i]; if (e) { K.show(e, m.on ? m.op : 0); e.style.transform = 'translate(' + m.x + 'px,' + m.y + 'px) scale(' + m.s + ')'; } });
    };
    return { set, at, end, starts };
  };
})();
