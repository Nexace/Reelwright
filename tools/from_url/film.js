// Film from a URL: hook (kinetic) → the site's first screen on a tilted device → one split per feature with its
// screenshot → the call to action. Copy and shots from hf/site.js; words and every time from the VO (V/snap), so
// editing or deleting lines in project.json reflows the film. Scenes crossfade: out = next in + a beat's fraction.
'use strict';
const { V, snap, cue } = KIT, L = KIT.layout, S = window.SITE;
const DUR = window.PROJECT.speechEnd + window.PROJECT.tail;
const ids = ['hook', 'what', ...S.features.map((f) => f.id), 'cta'].filter((id) => KIT.VO[id]);
const IN = ids.map((id, i) => (i ? snap(V(id).start - 0.45) : 0));
const span = (i) => ({ in: IN[i], out: i < ids.length - 1 ? IN[i + 1] + KIT.dur(0.45) : DUR - 0.2 });
IN.slice(1).forEach((t) => cue(t, 'whoosh', 0.6));
const shot = (parent, src) => { const im = KIT.el('img', 'shot', parent); KIT.img(im, src); };

const scenes = ids.map((id, i) => {
  if (id === 'hook') return L.kinetic({ ...span(i), line: 'hook' });
  if (id === 'what') { const s = L.tiltedDevice({ ...span(i), kicker: S.host, title: S.name, body: S.what }); shot(s.screen, S.hero); return s; }
  if (id === 'cta') return L.fullBleed({ ...span(i), text: S.cta, accent: [S.host] });
  const k = S.features.findIndex((f) => f.id === id), f = S.features[k];
  const s = L.split({ ...span(i), kicker: String(k + 1).padStart(2, '0'), title: f.title, body: f.body, flip: k % 2 === 1 });
  shot(s.media, f.shot); return s;
});
const subs = KIT.subtitles(ids.filter((id) => id !== 'hook'));   // the hook is on screen word by word already
cue(IN[ids.length - 1], 'chime', 0.5);

function render(t) {
  for (const s of scenes) s.set(t);
  subs.set(t);
  KIT.stage.style.opacity = 1 - KIT.seg(t, DUR - 0.6, DUR);
}
KIT.start({ dur: DUR, render });
