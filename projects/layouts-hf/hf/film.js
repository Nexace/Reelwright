// Layouts test film: one KIT.layout scene per VO line — kinetic → split → bento → stat → quote.
// Each scene starts on the beat about half a second before its line and crossfades into the next one (out = next in + a beat's fraction, so no blank frames); all times from V/W/snap.
'use strict';
const { V, W, snap, cue, seg } = KIT, L = KIT.layout;
const IDS = ['kinetic', 'split', 'bento', 'stat', 'quote'];
const DUR = window.PROJECT.speechEnd + window.PROJECT.tail;
const IN = IDS.map((id, i) => (i ? snap(V(id).start - 0.45) : 0));
const span = (i) => ({ in: IN[i], out: i < IDS.length - 1 ? IN[i + 1] + KIT.dur(0.45) : DUR - 0.2 });
IN.slice(1).forEach((t) => cue(t, 'whoosh', 0.6));

const bars = [38, 52, 46, 64, 58, 80, 72, 92].map((h) => `<i style="height:${h}%"></i>`).join('');
const split = L.split({ ...span(1), kicker: 'Split', title: 'Words left. <span class="kit-lay-accent">Product right.</span>',
  body: 'The text panel carries the line; the media panel shows the thing.',
  media: `<div class="mock"><div class="mock-side"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="mock-main"><div class="mock-h"></div><div class="mock-kpis"><i></i><i></i><i></i></div><div class="mock-chart">${bars}</div></div></div>` });
const chartBars = [...split.media.querySelectorAll('.mock-chart i')];
const GROW = snap(W('split', 'product'));

const scenes = [
  L.kinetic({ ...span(0), line: 'kinetic', accent: ['five', 'layouts'] }),
  split,
  L.bento({ ...span(2), tiles: [
    { icon: '◆', title: 'Voiceover', body: 'Neural voice, timed to the word', wide: true, hero: true },
    { icon: '♪', title: 'Music', body: 'Cuts on the beat' },
    { icon: '▶', title: 'Takes', body: 'Scripted recordings' },
    { icon: 'Aa', title: 'Themes', body: 'Ten looks, one token set' },
    { icon: '▣', title: 'Formats', body: '16:9 · 9:16 · 1:1' },
    { icon: '✓', title: 'QA', body: 'Blank frames and jumpy cuts, caught before you send', wide: true },
  ] }),
  L.stat({ ...span(3), value: 40, suffix: '%', label: 'faster to ship, per team', at: snap(W('stat', 'forty')), note: 'Illustrative data' }),
  L.quote({ ...span(4), text: 'It finally looks like our brand.', author: 'Maya Brooks', role: 'Design lead, Northwind', note: 'Illustrative data' }),
];
cue(snap(W('stat', 'forty')), 'riser', 0.6);
cue(IN[4], 'chime', 0.5);

function render(t) {
  for (const s of scenes) s.set(t);
  const g = KIT.ease(seg(t, GROW, GROW + KIT.dur(1)));
  chartBars.forEach((b, i) => { b.style.transform = `scaleY(${0.15 + 0.85 * KIT.clamp(g * 1.6 - i * 0.08)})`; });
  KIT.stage.style.opacity = 1 - seg(t, DUR - 0.6, DUR);
}
KIT.start({ dur: DUR, render });
