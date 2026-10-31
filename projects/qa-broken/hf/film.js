// QA test film: every part breaks one `reelwright qa` gate on purpose (see project.json and brand.json too).
'use strict';
const { el, show, V } = KIT;
const L = V('long');
const strobe = el('div', 'strobe');                // flash: full-frame white/black at 10 Hz for 1.5 s
const stat = el('div', 'stat', undefined, '40%');  // illustrative: a number with no "Illustrative data" label
const subs = KIT.subtitles(['long']);              // captions: too long, and brand.json makes them low-contrast
const jitter = Math.random();                      // seekable: different every run
const DUR = window.PROJECT.speechEnd + window.PROJECT.tail;

function render(t) {
  show(strobe, t > 0.5 && t < 2 && Math.floor(t * 20) % 2 === 0 ? 1 : 0);
  show(stat, t > 2 ? 1 : 0);
  stat.style.marginLeft = jitter * 0 + 'px';
  subs.set(t);
}
KIT.start({ dur: DUR, render });
