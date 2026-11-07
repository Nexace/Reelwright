// Recipe film: eight proven scenes, one per recipe (docs/recipes/*.md) — hook → kinetic line → stat → chart → feature list →
// before/after → camera push-in → end card. Each scene starts on the beat just before its VO line and crossfades into the next
// one (out = next in + KIT.dur(0.45)), so there is no blank frame; every time comes from V/W/snap/KIT.dur.
// The `#region` markers are what the recipe pages quote — keep them in step with docs/recipes/*.md.
'use strict';
//#region setup
const { V, W, snap, cue, seg, win, el, u } = KIT, L = KIT.layout, S = KIT.shot;
const IDS = ['hook', 'kinetic', 'stat', 'chart', 'features', 'split', 'push', 'end'];
const DUR = window.PROJECT.speechEnd + window.PROJECT.tail;
const IN = IDS.map((id, i) => (i ? snap(V(id).start - KIT.dur(0.45)) : 0));            // each scene: the beat before its line
const OUT = (i) => (i < IDS.length - 1 ? IN[i + 1] + KIT.dur(0.45) : DUR - KIT.dur(0.2));   // …until the next one is in
const span = (i) => ({ in: IN[i], out: OUT(i) });                                      // what every KIT.layout.* takes
const fade = (i, t) => win(t, IN[i], OUT(i), KIT.dur(0.45), KIT.dur(0.45));            // the same crossfade for a hand-built scene
const sc = (cls, html) => el('div', `sc fmt-${KIT.fmt} ${cls}`, KIT.stage, html);        // a hand-built scene in the safe box
const ent = (t, a, d = 0.6) => KIT.ease(seg(t, a, a + KIT.dur(d)));                     // eased 0 → 1 starting at a
IN.slice(1).forEach((t) => cue(t, 'whoosh', 0.6));
//#endregion

// ── 1. hook title on the beat ─────────────────────────────────────────────
//#region hook
const hook = sc('hook', `<div class="kick">Product video</div>
  <div class="hl disp"><span class="ln">Your first second</span><span class="ln">decides <b>everything.</b></span></div><i class="bar"></i>`);
const [hookLines, hookBar] = [[...hook.querySelectorAll('.ln')], hook.querySelector('.bar')];
const HOOK = snap(V('hook').start);                       // the title lands on the beat nearest the first word
//#endregion

// ── 2. kinetic type line ──────────────────────────────────────────────────
//#region kinetic
const kinetic = L.kinetic({ ...span(1), line: 'kinetic', accent: ['big', 'once'] });   // words land as they are spoken
//#endregion

// ── 3. stat with count-up ─────────────────────────────────────────────────
//#region stat
const stat = L.stat({ ...span(2), value: 40, suffix: '%', label: 'faster to ship, per team',
  at: snap(W('stat', 'forty')), note: 'Illustrative data' });                  // counts up from the beat nearest "forty"
cue(snap(W('stat', 'forty')), 'riser', 0.6);
//#endregion

// ── 4. chart grows on the beat ────────────────────────────────────────────
//#region chart
const BARS = [30, 42, 55, 63, 78, 96];                                                  // % of the chart height
const chart = sc('chart-sc', `<div class="chart card"><h3 class="disp">Revenue by quarter</h3>
  <div class="cols bars">${BARS.map((h) => `<i style="height:${h}%"></i>`).join('')}</div>
  <div class="cols">${BARS.map((_, i) => `<span>Q${i + 1}</span>`).join('')}</div></div><div class="note chart-note">Illustrative data</div>`);
const bars = [...chart.querySelectorAll('.bars i')];
const GROW = snap(W('chart', 'grows'));                    // the first bar starts on the beat nearest "grows"
cue(GROW, 'riser', 0.7);
//#endregion

// ── 5. feature list stagger (each row lands on its word) ──────────────────
//#region features
const FEATURES = [['Voice', '♪', 'Neural narration, timed to the word'], ['Music', '♫', 'A bed that ducks under the voice'],
  ['Themes', '◧', 'Eleven looks, one token set'], ['Checks', '✓', 'Blank frames caught before you send']];
const features = sc('features-sc', `<div class="kick">Built in</div><div class="list">${FEATURES.map(([n, ic, d]) =>
  `<div class="row card"><div class="ic">${ic}</div><div><b class="disp">${n}</b><span>${d}</span></div></div>`).join('')}</div>`);
const rows = [...features.querySelectorAll('.row')];
const ROW_AT = FEATURES.map(([n]) => W('features', n));    // row i comes in as its word is spoken
//#endregion

// ── 6. before / after split ───────────────────────────────────────────────
//#region split
const split = sc('split-sc', `<div class="vs">
  <div class="pane card before"><div class="kick">Before</div><div class="wall">${[96, 100, 88, 100, 72, 94, 100, 64, 90].map((w) => `<i style="width:${w}%"></i>`).join('')}</div></div>
  <div class="pane card after"><div class="kick">After</div><div class="idea disp">One clear idea.</div><div class="cta">Try it</div></div></div>`);
const [before, after] = [split.querySelector('.before'), split.querySelector('.after')];
const BEFORE = W('split', 'Before'), AFTER = W('split', 'After');
//#endregion

// ── 7. camera push-in on a UI card ────────────────────────────────────────
//#region push
const spark = [30, 44, 40, 58, 66, 84, 100].map((h) => `<i style="height:${h}%"></i>`).join('');
const kpi = (name, cls = '') => `<div class="kpi ${cls}"><b class="disp">${name}</b><div class="spark">${spark}</div></div>`;
const push = el('div', 'scene', KIT.stage);                                    // frame-sized, shown while the scene is on
const cam = el('div', 'cam', push, `<div class="bleed"></div><div class="ui card"><div class="h"></div>
  <div class="kpis">${kpi('Signups')}${kpi('Activation', 'key')}${kpi('Retention')}</div>
  <div class="feed"><i></i><i style="width:84%"></i><i style="width:62%"></i></div></div>`);
const ui = cam.querySelector('.ui'), key = cam.querySelector('.key'), others = [...cam.querySelectorAll('.kpi:not(.key), .feed, .h')];
const PUSH = snap(V('push').start);
let pushShot;                                              // built on the first frame, once the card has its real size
//#endregion

// ── 8. logo end card ──────────────────────────────────────────────────────
//#region end
const end = sc('end-sc', `<div class="logo"><i>▶</i><b class="disp">Reelwright</b></div>
  <div class="tag"><span class="pulse"></span><span class="kick">Films from code</span></div>`);
const [logo, tag] = [end.querySelector('.logo'), end.querySelector('.tag')];
const LOGO = W('end', 'Reelwright'), TAG = W('end', 'Films');
const pop = KIT.spring({ damping: 12, stiffness: 120 });   // 0 → 1 with a small overshoot, closed form
cue(LOGO, 'impact', 0.7);
//#endregion

function render(t) {
  //#region hook-render
  KIT.show(hook, fade(0, t));
  hookLines.forEach((e, i) => {
    const p = ent(t, HOOK + KIT.stagger(i, hookLines.length, KIT.dur(0.25)));
    e.style.opacity = p; e.style.transform = `translateY(${(1 - p) * 0.35}em)`;
  });
  hookBar.style.transform = `scaleX(${ent(t, HOOK + KIT.dur(0.6), 0.5)})`;   // the underline draws as the title settles
  //#endregion
  //#region kinetic-render
  kinetic.set(t);
  //#endregion
  //#region stat-render
  stat.set(t);
  //#endregion
  //#region chart-render
  KIT.show(chart, fade(3, t));
  bars.forEach((b, i) => { b.style.transform = `scaleY(${ent(t, GROW + KIT.stagger(i, bars.length, KIT.dur(0.4)), 0.7)})`; });
  //#endregion
  //#region features-render
  KIT.show(features, fade(4, t));
  rows.forEach((r, i) => {
    const p = ent(t, ROW_AT[i], 0.5), live = i === rows.length - 1 || t < ROW_AT[i + 1];
    r.style.opacity = p * (live ? 1 : 0.7);                // the row being spoken is bright, earlier ones settle back
    r.style.transform = `translateX(${(1 - p) * -60 * u}px)`;
  });
  //#endregion
  //#region split-render
  KIT.show(split, fade(5, t));
  const pb = ent(t, BEFORE), pa = ent(t, AFTER, 0.7);
  before.style.opacity = pb * (1 - 0.55 * pa); before.style.transform = `translateY(${(1 - pb) * 40 * u}px)`;   // dims as "After" arrives
  after.style.opacity = pa; after.style.transform = `translateX(${(1 - pa) * 120 * u}px)`;
  //#endregion
  //#region push-render
  pushShot ||= S.pushIn({ t0: PUSH, t1: V('push').end + KIT.dur(0.3), from: 1, to: 1.3,
    x: KIT.W_ / 2 + key.offsetLeft + key.offsetWidth / 2 - ui.offsetWidth / 2, y: KIT.H_ / 2 + key.offsetTop + key.offsetHeight / 2 - ui.offsetHeight / 2 });
  KIT.show(push, fade(6, t));
  KIT.shoot(cam, pushShot(t));
  const dim = 1 - 0.75 * ent(t, PUSH, 0.5);                  // everything but the card in focus drops to ~0.25
  others.forEach((e) => { e.style.opacity = dim; });
  //#endregion
  //#region end-render
  KIT.show(end, fade(7, t));
  const pl = pop(t - LOGO);
  logo.style.opacity = seg(t, LOGO, LOGO + 0.2); logo.style.transform = `scale(${0.7 + 0.3 * pl})`;
  tag.style.opacity = ent(t, TAG, 0.4);
  end.querySelector('.pulse').style.transform = `scale(${1 + 0.7 * KIT.pulse(t)})`;   // a dot that pumps on every beat
  //#endregion
  KIT.stage.style.opacity = 1 - seg(t, DUR - KIT.dur(0.6), DUR);
}
KIT.start({ dur: DUR, render });
