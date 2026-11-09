// Blocks demo (CI): three HyperFrames blocks (hf/compositions/) mounted with KIT.mount — glass-hero (three.js),
// lt-clean-bar (GSAP lower third), oscilloscope-trace (canvas). Every time comes from W(), V() or KIT.snap().
'use strict';
const { el, css, show, seg, win, V, W } = KIT;
const S = KIT.safe, u = KIT.u;
const DUR = window.PROJECT.speechEnd + window.PROJECT.tail;
const SCOPE_IN = V('scope').start - 0.15, END_IN = W('end', 'Reelwright');
const full = { left: '0px', top: '0px', transform: `scale(${KIT.W_ / 1920})`, transformOrigin: '0 0' };

// glass-hero: the film's hook (headline/subline are the block's own variables)
const hero = KIT.mount('glass-hero', { start: 0, dur: SCOPE_IN, vars: { headline: 'Blocks', subline: '', background: '#0a0908' } });
css(hero, full);

// lower third over the hero, in the lower-left of the safe box; text swapped (the sample names a person)
const lt = KIT.mount('lt-clean-bar', { start: KIT.snap(W('hook', 'registry')), dur: SCOPE_IN - KIT.snap(W('hook', 'registry')) });
css(lt, full);
document.getElementById('lt-name').textContent = 'glass-hero';
document.getElementById('lt-role').textContent = 'three.js block';

// oscilloscope: a canvas block, with an "Illustrative data" label (the trace is synthetic)
const scope = KIT.mount('oscilloscope-trace', { start: SCOPE_IN, dur: END_IN - SCOPE_IN, vars: { waveform: 'triangle', frequency: 6, amplitude: 2.4 } });
// scaled into the safe box above the captions; the block's 20 px footnote is dropped (tiny-text)
const SC = 0.74;
css(scope, { left: (KIT.W_ - 1920 * SC) / 2 + 'px', top: S.y - 40 * u + 'px', transform: `scale(${SC * u})`, transformOrigin: '0 0' });
document.getElementById('os-r-note').remove();
const label = el('div', 'label', undefined, 'Illustrative data');

css(label, { top: S.y + S.h - 130 * u + 'px' });
const logo = el('div', 'logo', undefined, 'Reelwright');
const subs = KIT.subtitles(['hook', 'scope']);
css(subs.box, { bottom: KIT.H_ - S.y - S.h + 'px' });

function render(t) {
  show(label, win(t, SCOPE_IN, END_IN - 0.1, 0.05, 0.1));
  const li = KIT.ease(seg(t, END_IN, END_IN + KIT.dur(0.6)));
  show(logo, seg(t, END_IN, END_IN + 0.2));
  logo.style.transform = `translateY(-50%) scale(${0.7 + 0.3 * li})`;
  subs.set(t, t < END_IN ? 1 : 0);
  KIT.stage.style.opacity = 1 - seg(t, DUR - 0.4, DUR);
}
KIT.start({ dur: DUR, render });
