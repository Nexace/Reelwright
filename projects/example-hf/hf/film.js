// HyperFrames example: hook → a catalog wipe (render(t) → HyperFrames) → a catalog bar chart → end card.
// Same engine as the pvk films: every time comes from VO words (W, V) and the beat grid (KIT.snap, KIT.pulse).
// Catalog components (reelwright add <name>) are mounted once with KIT.block and driven through the CSS
// custom properties their "Timeline integration" comment lists — no GSAP, so render(t) stays pure.
'use strict';
const { el, css, show, seg, win, E, V, W, cue } = KIT;
const set = (e, props) => { for (const k in props) e.style.setProperty(k, props[k]); };

// ── 1. hook: words appear as they are spoken ─────────────────────────────
const hook = el('div', 'big');
const hookW = KIT.words(hook, 'hook');
const HOOK_OUT = V('hf').start - 0.35;

// ── 2. directional wipe on "HyperFrames" ─────────────────────────────────
const wipe = KIT.block('directional-wipe');
css(wipe.parentNode, { left: (KIT.W_ - 760) / 2 + 'px', top: (KIT.H_ - 428) / 2 + 'px' });
wipe.querySelector('.from').textContent = 'render(t)';
wipe.querySelector('.to').textContent = 'HyperFrames';
wipe.querySelector('.to').style.background = '#1f2937';   // opaque, so the outgoing text doesn't show through
const [wFrom, wTo, wFx, wRgb] = ['.from', '.to', '.fx', '.rgb'].map((s) => wipe.querySelector(s));
const WIPE = KIT.snap(W('hf', 'HyperFrames'));
const WIPE_IN = HOOK_OUT, WIPE_OUT = V('chart').start - 0.35;
cue(WIPE, 'whoosh');

// ── 3. bar chart grows on the beat after "grows" ─────────────────────────
const chart = KIT.block('animated-bar-chart');
css(chart.parentNode, { left: (KIT.W_ - 760) / 2 + 'px', top: '250px' });
chart.querySelector('h3').textContent = 'Films shipped per week';
chart.querySelector('p').textContent = 'Seven weeks, one script each';
const label = el('div', 'label', undefined, 'Illustrative data');
const GROW = KIT.snap(W('chart', 'grows'));
const CHART_IN = WIPE_OUT, CHART_OUT = W('end', 'Reelwright') + 0.1;   // hands straight over to the end card
cue(GROW, 'riser', 0.7);

// ── 4. end card + a dot that pumps on every beat ─────────────────────────
const logo = el('div', 'logo', undefined, 'Reelwright');
const END_IN = W('end', 'Reelwright');
const dot = el('div', 'pulse');
const subs = KIT.subtitles(['hf', 'chart']);
cue(END_IN, 'impact');

const DUR = window.PROJECT.speechEnd + window.PROJECT.tail;

function render(t) {
  show(hook, 1 - seg(t, HOOK_OUT - 0.3, HOOK_OUT));
  hookW.set(t);

  show(wipe.parentNode, win(t, WIPE_IN, WIPE_OUT, 0.35, 0.3));
  const p = E.inOut(seg(t, WIPE, WIPE + 0.9));
  set(wTo, { '--hf-clip-right': (1 - p) * 100 + '%', '--hf-to-x': (1 - p) * 60 + 'px', '--hf-to-scale': 1.04 - 0.04 * p });
  set(wFrom, { '--hf-from-x': -70 * p + 'px', '--hf-from-scale': 1 - 0.04 * p, '--hf-from-blur': 5 * p + 'px' });
  set(wFx, { '--hf-fx-x': -110 + 220 * E.inOut(seg(t, WIPE + 0.18, WIPE + 0.76)) + '%' });
  const flick = t >= WIPE + 0.32 && t < WIPE + 0.6 ? Math.floor((t - WIPE - 0.32) / 0.07) % 2 === 0 : false;
  set(wRgb, { '--hf-rgb-opacity': flick ? 1 : 0, '--hf-rgb-x': (flick ? 16 : -16) + 'px' });

  const ch = win(t, CHART_IN, CHART_OUT, 0.35, 0.3);
  show(chart.parentNode, ch); show(label, ch);
  const g = E.out(seg(t, GROW, GROW + 1.2));
  set(chart, { '--hf-grow': g, '--hf-dash': 900 * (1 - g) });

  const li = E.outBack(seg(t, END_IN, END_IN + 0.6));
  show(logo, seg(t, END_IN, END_IN + 0.2));
  logo.style.transform = `translateY(-50%) scale(${0.7 + 0.3 * li})`;

  dot.style.transform = `scale(${1 + 0.7 * KIT.pulse(t)})`;
  subs.set(t, t > HOOK_OUT && t < END_IN ? 1 : 0);
  KIT.stage.style.opacity = 1 - seg(t, DUR - 0.6, DUR);
}
KIT.start({ dur: DUR, render });
