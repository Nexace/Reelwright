// QA test film: every part breaks one `reelwright qa` gate on purpose (see project.json and brand.json too).
'use strict';
const { el, show, V } = KIT;
const L = V('long');
const strobe = el('div', 'strobe');                // flash: full-frame white/black at 10 Hz for 1.5 s
const stat = el('div', 'stat', undefined, '40%');  // illustrative: a number with no "Illustrative data" label
const t1 = el('div', 'lbl a', undefined, 'Overlapping label one');                        // overlap: two texts on the same spot
const t2 = el('div', 'lbl a b', undefined, 'Overlapping label two');
const tiny = el('div', 'lbl tiny', undefined, 'Fine print nobody can read');              // tiny-text: 14 px
const wordy = el('div', 'lbl wordy', undefined, 'This caption is far too long for the screen so it keeps on going'); // wordy: the VO line, pasted on screen
const veil = el('div', 'veil');                                                              // dark: black, no voiceover, 2+ s at the end
const subs = KIT.subtitles(['long']);              // captions: too long, and brand.json makes them low-contrast
const jitter = Math.random();                      // seekable: different every run
const DUR = window.PROJECT.speechEnd + window.PROJECT.tail;

function render(t) {
  show(strobe, t > 0.5 && t < 2 && Math.floor(t * 20) % 2 === 0 ? 1 : 0);
  show(stat, t > 2 ? 1 : 0);
  stat.style.marginLeft = jitter * 0 + 'px';
  const on = t > 3 && t < 6 ? 1 : 0;
  for (const e of [t1, t2, tiny, wordy]) show(e, on);
  show(veil, t > window.PROJECT.speechEnd + 0.3 ? 1 : 0);
  subs.set(t);
}
KIT.start({ dur: DUR, render });
