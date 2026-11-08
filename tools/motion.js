// Motion helpers: KIT.rate, KIT.indicate, KIT.typewriter, KIT.sim. Loaded after engine.js (doodle.js is not needed).
// Everything is a pure function of t: DOM is built once at load, every .set(t) only writes from t (no Math.random, no clocks,
// no state kept between calls), so scrubbing, shuffled seeks and any fps give the same frame.
// Rate functions are Manim Community's utils/rate_functions.py (MIT) and ManimGL's overshoot; all take p in 0..1.
//   KIT.rate.linear / smooth(p, inflection = 10) / smoothstep / smootherstep      smooth is Manim's sigmoid ease; smoothstep is the
//                                                                                cubic 3p²−2p³ (= KIT.math.ease.smooth)
//   rushInto / rushFrom (p, inflection)   slowInto   doubleSmooth   thereAndBack(p, inflection)   lingering
//   thereAndBackWithPause(p, pause = 1/3)   runningStart(p, pull = -0.5) (dips below 0 first)   overshoot(p, pull = 1.5) (goes past 1)
//   wiggle(p, wiggles = 2)   exponentialDecay(p, halfLife = 0.1)
//   notQuiteThere(f = smooth, proportion = 0.7) → fn      squish(f, a = 0.4, b = 0.6) → fn   (f(0) before a, f(1) after b)
// KIT.indicate.<name>(el, { at, dur = KIT.dur(1), ...opts }) → { set(t) }   (at = start in s, default 0; hidden/at rest outside at…at+dur)
//   indicate(el, { scale = 1.2, color })              scale up + tint to the accent, there-and-back (uses the `scale` and `color` properties)
//   flash(el | null, { x, y, n = 12, r0, length, color })   radial lines burst from el's centre (or stage px {x, y})
//   focusOn(el, { dim, color })                       a dimming spotlight closes onto el, then lets go
//   circumscribe(el, { shape = 'rect' | 'circle', pad, color, width })   stroke drawn around el's box, then fades
//   wiggle(el, { n = 6, angle = 3, scale = 1.1 })     rotate/scale shake (the `rotate` and `scale` properties)
//   blink(el, { n = 3, off = 0 })                     opacity drops to `off` and back n times
//   applyWave(el, { amp, width = 0.4 })               a wave of lifted characters runs left to right; el must hold plain text
//   showPassingFlash(pathEl, { window = 0.3, width, color, thin })   a bright dash travels along an SVG <path>/<line>/… (a clone drawn over it)
//   Geometry (el box, path style) is measured once, when the effect is created: create effects after layout and fonts are in place,
//   with el un-transformed. Overlays go in opts.parent (default KIT.stage). Colours: --kit-accent (effect) / --kit-ink / --kit-bg.
//   Each effect owns the properties it writes on el, even at rest (indicate: scale, color; wiggle: rotate, scale; blink: opacity;
//   applyWave: el's children): the film must not set those on el. Wrap el to fade or tint it. Two effects on one el fight the same way.
// KIT.typewriter(el, text, { at, cps = 18, caret = true, mistakes = [], hold = 0.4, backspace = 2 * cps }) → { set(t), end }
//   The string shown is a function of t. mistakes: [{ index, wrong }] types `wrong` in place of text[index…], holds, deletes it,
//   then goes on. end = time (s) the text is complete. The caret (empty span, drawn with currentColor) is steady while typing, then blinks.
// KIT.sim(step, state0, { dt = 1/120, dur }) → { at(t), samples, dt, dur }
//   step(state, dt, i) → next state (no mutation; i = index of the state passed in) runs ONCE here for dur s; state is a plain
//   object / array tree of numbers. at(t) interpolates the two neighbouring samples (t clamped to 0…dur): physics you can seek.
'use strict';
(function () {
  const K = window.KIT;

  // ── rate functions ───────────────────────────────────────────────────────
  const sigmoid = (x) => 1 / (1 + Math.exp(-x));
  const smooth = (p, inflection = 10) => {
    const e = sigmoid(-inflection / 2);
    return K.clamp((sigmoid(inflection * (p - 0.5)) - e) / (1 - 2 * e));
  };
  const bezier = (pts) => (p) => {   // Bernstein form of Manim's bezier(points)
    const n = pts.length - 1;
    let s = 0, c = 1;
    for (let i = 0; i <= n; i++) { s += c * Math.pow(1 - p, n - i) * Math.pow(p, i) * pts[i]; c = (c * (n - i)) / (i + 1); }
    return s;
  };
  const thereAndBack = (p, inflection = 10) => smooth(p < 0.5 ? 2 * p : 2 * (1 - p), inflection);
  const squish = (f, a = 0.4, b = 0.6) => (p) => (a === b ? a : p < a ? f(0) : p > b ? f(1) : f((p - a) / (b - a)));
  const R = (K.rate = {
    linear: (p) => p,
    smooth,
    smoothstep: (p) => (p <= 0 ? 0 : p >= 1 ? 1 : 3 * p * p - 2 * p * p * p),
    smootherstep: (p) => (p <= 0 ? 0 : p >= 1 ? 1 : p * p * p * (6 * p * p - 15 * p + 10)),
    rushInto: (p, inflection = 10) => 2 * smooth(p / 2, inflection),
    rushFrom: (p, inflection = 10) => 2 * smooth(p / 2 + 0.5, inflection) - 1,
    slowInto: (p) => Math.sqrt(1 - (1 - p) * (1 - p)),
    doubleSmooth: (p) => (p < 0.5 ? 0.5 * smooth(2 * p) : 0.5 * (1 + smooth(2 * p - 1))),
    thereAndBack,
    thereAndBackWithPause: (p, pause = 1 / 3) => {
      const a = 2 / (1 - pause);   // Manim CE: reaches 1 at 0.5 - pause/2
      return p < 0.5 - pause / 2 ? smooth(a * p) : p < 0.5 + pause / 2 ? 1 : smooth(a - a * p);
    },
    runningStart: (p, pull = -0.5) => bezier([0, 0, pull, pull, 1, 1, 1])(p),
    overshoot: (p, pull = 1.5) => bezier([0, 0, pull, pull, 1, 1, 1])(p),
    notQuiteThere: (f = smooth, proportion = 0.7) => (p) => proportion * f(p),
    wiggle: (p, wiggles = 2) => thereAndBack(p) * Math.sin(wiggles * Math.PI * p),
    squish,
    lingering: squish((p) => p, 0, 0.8),
    exponentialDecay: (p, halfLife = 0.1) => 1 - Math.exp(-p / halfLife),
  });

  // ── indication ───────────────────────────────────────────────────────────
  const SVG = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, parent, attrs = {}, style = {}) => {
    const e = document.createElementNS(SVG, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    Object.assign(e.style, style);   // style, not attributes: those don't resolve var(--kit-…)
    if (parent) parent.appendChild(e);
    return e;
  };
  const overlay = (parent) => svgEl('svg', parent, { width: K.W_, height: K.H_ },
    { position: 'absolute', left: '0', top: '0', overflow: 'visible', pointerEvents: 'none', visibility: 'hidden' });
  // el's box in `parent` px, measured now
  const measure = (el, parent) => {
    const r = el.getBoundingClientRect(), s = parent.getBoundingClientRect(), k = s.width / (parent.offsetWidth || K.W_) || 1;
    const x = (r.left - s.left) / k, y = (r.top - s.top) / k, w = r.width / k, h = r.height / k;
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
  };
  // wrap draw(p, q) so it gets p = progress 0..1 of the window and the stage-parent; t outside the window is p = 0 / 1
  const effect = (draw) => (el, { at = 0, dur = K.dur(1), parent, ...o } = {}) => {
    const d = draw(el, parent || K.stage, o);
    const set = (t) => d(K.seg(t, at, at + dur));
    set(-1e9);   // rest state now; the first render(t) rewrites it from t
    return { set };
  };

  K.indicate = {
    indicate: effect((el, parent, { scale = 1.2, color = 'var(--kit-accent)' }) => {
      const base = getComputedStyle(el).color;
      return (p) => {
        const a = thereAndBack(p);
        el.style.scale = p <= 0 || p >= 1 ? '' : String(1 + (scale - 1) * a);
        el.style.color = p <= 0 || p >= 1 ? '' : `color-mix(in srgb, ${color} ${(a * 100).toFixed(2)}%, ${base})`;
      };
    }),

    flash: effect((el, parent, { x, y, n = 12, r0, length, color = 'var(--kit-accent)' }) => {
      const b = el ? measure(el, parent) : { cx: 0, cy: 0, w: 0, h: 0 };
      const cx = x ?? b.cx, cy = y ?? b.cy, inner = r0 ?? Math.max(b.w, b.h) / 2 + 12 * K.u, L = length ?? 110 * K.u;
      const svg = overlay(parent);
      const lines = Array.from({ length: n }, () => svgEl('line', svg, {}, { stroke: color, strokeWidth: 3 * K.u, strokeLinecap: 'round' }));
      return (p) => {
        svg.style.visibility = p > 0 && p < 1 ? 'visible' : 'hidden';
        svg.style.opacity = String(1 - K.seg(p, 0.6, 1));
        const head = inner + L * K.ease(K.seg(p, 0, 0.7)), tail = inner + L * K.ease(K.seg(p, 0.3, 1));
        lines.forEach((l, i) => {
          const c = Math.cos((i / n) * 2 * Math.PI), s = Math.sin((i / n) * 2 * Math.PI);
          l.setAttribute('x1', cx + c * tail); l.setAttribute('y1', cy + s * tail);
          l.setAttribute('x2', cx + c * head); l.setAttribute('y2', cy + s * head);
        });
      };
    }),

    focusOn: effect((el, parent, { dim = 78, color = 'var(--kit-bg)' }) => {
      const b = measure(el, parent), hole = Math.max(b.w, b.h) / 2 * 1.15 + 8 * K.u, big = Math.hypot(K.W_, K.H_), soft = 40 * K.u;
      const v = K.el('div', '', parent);
      K.css(v, { position: 'absolute', left: '0', top: '0', width: K.W_ + 'px', height: K.H_ + 'px', pointerEvents: 'none', visibility: 'hidden' });
      const shade = `color-mix(in srgb, ${color} ${dim}%, transparent)`;
      return (p) => {
        const r = K.lerp(big, hole, K.ease(K.seg(p, 0, 0.55)));
        v.style.background = `radial-gradient(circle at ${b.cx}px ${b.cy}px, transparent ${r}px, ${shade} ${r + soft}px)`;
        v.style.opacity = String(Math.min(K.seg(p, 0, 0.25), 1 - K.seg(p, 0.7, 1)));
        v.style.visibility = p > 0 && p < 1 ? 'visible' : 'hidden';
      };
    }),

    circumscribe: effect((el, parent, { shape = 'rect', pad = 10 * K.u, color = 'var(--kit-accent)', width = 4 * K.u }) => {
      const b = measure(el, parent), svg = overlay(parent);
      const st = { fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round', strokeDasharray: '1 2' };
      const m = shape === 'circle'
        ? svgEl('circle', svg, { cx: b.cx, cy: b.cy, r: Math.hypot(b.w, b.h) / 2 + pad, pathLength: 1 }, st)
        : svgEl('rect', svg, { x: b.x - pad, y: b.y - pad, width: b.w + 2 * pad, height: b.h + 2 * pad, rx: 8 * K.u, pathLength: 1 }, st);
      return (p) => {
        m.style.strokeDashoffset = String(1 - K.ease(K.seg(p, 0, 0.6)));
        svg.style.opacity = String(1 - K.seg(p, 0.7, 1));
        svg.style.visibility = p > 0 && p < 1 ? 'visible' : 'hidden';
      };
    }),

    wiggle: effect((el, parent, { n = 6, angle = 3, scale = 1.1 }) => (p) => {
      const a = thereAndBack(p), off = p <= 0 || p >= 1;
      el.style.rotate = off ? '' : `${(angle * a * Math.sin(n * 2 * Math.PI * p)).toFixed(4)}deg`;
      el.style.scale = off ? '' : String(1 + (scale - 1) * a);
    }),

    blink: effect((el, parent, { n = 3, off = 0 }) => (p) => {
      const f = (p * n) % 1, dark = p > 0 && p < 1 && f >= 0.25 && f < 0.75;
      el.style.opacity = dark ? String(off) : '';
    }),

    applyWave: effect((el, parent, { amp, width = 0.4 }) => {
      const text = el.textContent, a = amp ?? Math.max(10 * K.u, el.getBoundingClientRect().height * 0.3);
      const chars = [];
      el.textContent = '';
      text.split(/( )/).forEach((w) => {   // words stay unbroken, so wrapping is as before
        if (w === ' ') return el.appendChild(document.createTextNode(' '));
        const word = K.el('span', '', el);
        K.css(word, { display: 'inline-block', whiteSpace: 'nowrap' });
        for (const c of w) { const s = K.el('span', '', word); s.textContent = c; s.style.display = 'inline-block'; chars.push(s); }
      });
      return (p) => chars.forEach((s, i) => {
        const f = chars.length > 1 ? i / (chars.length - 1) : 0;
        s.style.translate = p <= 0 || p >= 1 ? '' : `0 ${(-a * thereAndBack(K.clamp((p - f * (1 - width)) / width))).toFixed(3)}px`;
      });
    }),

    showPassingFlash: effect((el, parent, { window: w = 0.3, width, color = 'var(--kit-accent)', thin = false }) => {
      const base = width ?? (parseFloat(getComputedStyle(el).strokeWidth) || 3 * K.u) * 1.6;
      const c = el.cloneNode(false);
      c.removeAttribute('id'); c.setAttribute('pathLength', '1');
      Object.assign(c.style, { fill: 'none', stroke: color, strokeLinecap: 'butt', strokeDasharray: `${w} 2`, visibility: 'hidden', pointerEvents: 'none' });
      el.parentNode.insertBefore(c, el.nextSibling);
      return (p) => {
        c.style.strokeDashoffset = String(-K.lerp(-w, 1, smooth(p)));
        c.style.strokeWidth = String(thin ? base * (1 - p) : base);
        c.style.visibility = p > 0 && p < 1 ? 'visible' : 'hidden';
      };
    }),
  };

  // ── typewriter ───────────────────────────────────────────────────────────
  // keystrokes are laid out once: ts[i] = seconds after `at` at which the visible string becomes ss[i]
  K.typewriter = (el, text, { at = 0, cps = 18, caret = true, mistakes = [], hold = 0.4, backspace = 2 * cps } = {}) => {
    const chars = Array.from(text), bad = new Map(mistakes.map((m) => [m.index, Array.from(m.wrong)]));
    const ts = [-Infinity], ss = [''];
    let t = -1 / cps, shown = [];   // the first key lands at `at`
    const key = (dt, s) => { t += dt; ts.push(t); ss.push(s); };
    for (let i = 0; i <= chars.length; i++) {
      const w = bad.get(i);
      if (w) {
        w.forEach((_, j) => key(1 / cps, shown.concat(w.slice(0, j + 1)).join('')));
        for (let j = w.length - 1; j >= 0; j--) key(j === w.length - 1 ? hold : 1 / backspace, shown.concat(w.slice(0, j)).join(''));
      }
      if (i < chars.length) { shown = shown.concat(chars[i]); key(1 / cps, shown.join('')); }
    }
    el.textContent = '';
    el.style.whiteSpace = 'pre-wrap';
    const node = document.createTextNode('');
    el.appendChild(node);
    const cur = caret ? K.el('span', '', el) : null;
    if (cur) K.css(cur, { display: 'inline-block', width: '0.07em', height: '1em', marginLeft: '0.06em', verticalAlign: '-0.12em', background: 'currentColor' });
    const set = (tt) => {
      const rel = tt - at;
      let lo = 0, hi = ts.length - 1;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ts[m] <= rel) lo = m; else hi = m - 1; }
      node.data = rel < 0 ? '' : ss[lo];
      if (cur) {
        const idle = rel - (lo ? ts[lo] : 0);   // seconds since the last keystroke
        cur.style.visibility = rel >= 0 && (idle < 0.5 || Math.floor((idle - 0.5) * 2) % 2 === 0) ? 'visible' : 'hidden';
      }
    };
    set(-1e9);
    return { set, end: at + t };
  };

  // ── seekable simulation ──────────────────────────────────────────────────
  const mapTree = (a, f) => (typeof a === 'number' ? f(a) : Array.isArray(a) ? a.map((v) => mapTree(v, f))
    : a && typeof a === 'object' ? Object.fromEntries(Object.entries(a).map(([k, v]) => [k, mapTree(v, f)])) : a);
  const mixTree = (a, b, k) => (typeof a === 'number' ? a + (b - a) * k : Array.isArray(a) ? a.map((v, i) => mixTree(v, b[i], k))
    : a && typeof a === 'object' ? Object.fromEntries(Object.entries(a).map(([n, v]) => [n, mixTree(v, b[n], k)])) : a);
  const freeze = (a) => { if (a && typeof a === 'object') { Object.values(a).forEach(freeze); Object.freeze(a); } return a; };
  K.sim = (step, state0, { dt = 1 / 120, dur } = {}) => {
    if (!(dur > 0) || !(dt > 0)) throw new Error('KIT.sim: needs dur > 0 and dt > 0');
    const n = Math.ceil(dur / dt - 1e-9), samples = [freeze(mapTree(state0, (v) => v))];   // frozen: a step that mutates throws
    for (let i = 0; i < n; i++) samples.push(freeze(mapTree(step(samples[i], dt, i), (v) => v)));
    const at = (t) => {
      let f = K.clamp(t, 0, dur) / dt;
      const r = Math.round(f);
      if (Math.abs(f - r) < 1e-9) f = r;   // t on a step boundary gives that sample exactly
      const i = Math.min(Math.floor(f), n - 1);
      return mixTree(samples[i], samples[i + 1], f - i);
    };
    return { at, samples, dt, dur };
  };
})();
