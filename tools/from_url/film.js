// Film from a URL: the site's name from frame 0, giving way to the hook (kinetic) as it is spoken → the site's first
// screen on a tilted device → one split per feature with its screenshot → the call to action. Copy and shots from
// hf/site.js; words and every time from the VO (V/snap), so editing or deleting lines in project.json reflows the film.
// Scenes crossfade: out = next in + a beat's fraction. A shot whose captured text shows numbers carries it in
// data-qa-text (the QA illustrative gate reads it) and its scene shows a "Source: <site>" credit.
'use strict';
const { V, snap, cue } = KIT, L = KIT.layout, S = window.SITE;
const DUR = window.PROJECT.speechEnd + window.PROJECT.tail;
const ids = ['hook', 'what', ...S.features.map((f) => f.id), 'cta'].filter((id) => KIT.VO[id]);
const IN = ids.map((id, i) => (i ? snap(V(id).start - 0.45) : 0));
const span = (i) => ({ in: IN[i], out: i < ids.length - 1 ? IN[i + 1] + KIT.dur(0.45) : DUR - 0.2 });
IN.slice(1).forEach((t) => cue(t, 'whoosh', 0.6));
const shot = (parent, src, text) => { const im = KIT.el('img', 'shot', parent); im.dataset.qaText = text || ''; KIT.img(im, src); };
const credit = (on) => (on ? 'Source: ' + S.credit : undefined);

// the name card holds the screen until the first word of the hook (no blank opening)
const brand = KIT.el('div', 'brand kit-lay-disp'); brand.textContent = S.name;
const HOOK = KIT.VO.hook ? KIT.align('hook')[0] : 0.6;   // the first word lands as the card goes

const scenes = ids.map((id, i) => {
  if (id === 'hook') return L.kinetic({ ...span(i), line: 'hook' });
  if (id === 'what') {
    const s = L.tiltedDevice({ ...span(i), kicker: S.host, title: S.name, body: S.what, note: credit(S.heroCredit) });
    shot(s.screen, S.hero, S.heroText); return s;
  }
  if (id === 'cta') return L.fullBleed({ ...span(i), text: S.cta, accent: [S.host || S.name] });
  const k = S.features.findIndex((f) => f.id === id), f = S.features[k];
  const s = L.split({ ...span(i), kicker: String(k + 1).padStart(2, '0'), title: f.title, body: f.body, flip: k % 2 === 1, note: credit(f.credit) });
  shot(s.media, f.shot, f.text); return s;
});
const subs = KIT.subtitles(ids.filter((id) => id !== 'hook'));   // the hook is on screen word by word already
cue(IN[ids.length - 1], 'chime', 0.5);

function render(t) {
  const out = KIT.ease(KIT.seg(t, HOOK - 0.1, HOOK + KIT.dur(0.3)));
  KIT.show(brand, 1 - out);
  brand.style.transform = `translate(-50%, -50%) scale(${1 + 0.04 * KIT.seg(t, 0, HOOK) - 0.06 * out})`;
  for (const s of scenes) s.set(t);
  subs.set(t);
  KIT.stage.style.opacity = 1 - KIT.seg(t, DUR - 0.6, DUR);
}
KIT.start({ dur: DUR, render });
