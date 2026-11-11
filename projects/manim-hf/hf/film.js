// Manim demo: a scene rendered by Manim CE (manim/proof.py) plays as an alpha layer over the theme. Film times come from V/W/snap;
// the scene's own marks (rw.mark) give film times for the sound cues.
'use strict';
const { el, css, show, win, V, snap, cue } = KIT, S = KIT.safe;
const DUR = window.PROJECT.speechEnd + window.PROJECT.tail;
const mn = KIT.manim('proof');
cue(mn.markAt('curve'), 'whoosh'); cue(mn.markAt('equation'), 'pop');
const tag = el('div', 'tag', undefined, 'Manim CE · KIT.manim');
css(tag, { left: S.x + 'px', top: S.y + S.h * 0.9 + 'px' });
const subs = KIT.subtitles(['write', 'end']);
css(subs.box, { bottom: KIT.H_ - S.y - S.h + 'px' });
function render(t) {
  mn.set(t);
  show(tag, win(t, 0, DUR, KIT.dur(0.4), KIT.dur(0.4)));
  subs.set(t);
}
KIT.start({ dur: DUR, render });
