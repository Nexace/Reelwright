// Claude ad, 10 s, music only. No voice: the music grid is the timeline (96 BPM → one bar = 2.5 s, four bars).
// On-screen copy only; the mark is a generic dot, not Anthropic's logo.
'use strict';
const { el, css, show, seg, win, E, cue, beat: B, bar: BAR } = KIT;
const S = KIT.safe, CX = S.x + S.w / 2, CY = S.y + S.h / 2;
const DUR = BAR(4);
const centre = (e, cy = CY) => css(e, { left: CX - e.offsetWidth / 2 + 'px', top: cy - e.offsetHeight / 2 + 'px' });
const text = (html, size, extra = {}) => {
  const e = el('div', '', undefined, html);
  css(e, { position: 'absolute', whiteSpace: 'nowrap', font: `var(--kit-display-weight) ${size * KIT.u}px var(--kit-font-display)`,
    letterSpacing: 'var(--kit-display-tracking)', color: 'var(--kit-ink)', ...extra });
  centre(e);
  return e;
};
const dot = (sz) => `<span style="display:inline-block;width:${sz}em;height:${sz}em;border-radius:50%;background:var(--kit-accent);vertical-align:.08em;margin-left:.06em"></span>`;

// ── bar 0: "Meet Claude." ───────────────────────────────────────────────
const meet = text('Meet Claude' + dot(0.16), 190);
cue(B(0), 'whoosh', 0.8);

// ── bar 1: three verbs, one per beat, then the payoff ──────────────────
const VERBS = ['Write.', 'Code.', 'Think it through.'];
const row = el('div'); css(row, { position: 'absolute', left: 0, width: KIT.W_ + 'px', top: CY - 110 * KIT.u + 'px', textAlign: 'center' });
const verbs = VERBS.map((w, i) => {
  const s = el('span', '', row, w);
  css(s, { display: 'inline-block', margin: `0 ${18 * KIT.u}px`, font: `var(--kit-display-weight) ${120 * KIT.u}px var(--kit-font-display)`,
    letterSpacing: 'var(--kit-display-tracking)', color: i === 2 ? 'var(--kit-accent)' : 'var(--kit-ink)' });
  cue(B(4 + i), 'tap', 1);
  return s;
});
const together = text('<i style="font-weight:400">— together.</i>', 72, { color: 'var(--kit-muted)' });
centre(together, CY + 90 * KIT.u);

// ── bar 2: "The AI assistant from Anthropic." ──────────────────────────
const who = text('The AI assistant<br><span style="color:var(--kit-accent)">from Anthropic.</span>', 128, { whiteSpace: 'normal', textAlign: 'center', lineHeight: 1.1 });
centre(who);
const rule = el('div'); css(rule, { position: 'absolute', height: 3 * KIT.u + 'px', background: 'var(--kit-ink)', top: CY + who.offsetHeight / 2 + 26 * KIT.u + 'px' });
cue(BAR(2), 'whoosh', 0.7);

// ── bar 3: end card ────────────────────────────────────────────────────
const name = text('Claude' + dot(0.16), 240);
centre(name, CY - 50 * KIT.u);
const url = text('Try it at <span style="color:var(--kit-accent)">claude.ai</span>', 64, { font: `400 ${64 * KIT.u}px var(--kit-font-text)` });
centre(url, CY + 150 * KIT.u);
cue(BAR(3), 'impact', 0.9);

const rise = (e, p, d = 40) => { e.style.transform = `translateY(${(1 - p) * d * KIT.u}px)`; };

function render(t) {
  // bar 0
  const m = KIT.ease(seg(t, B(0), B(0) + KIT.dur(0.8)));
  show(meet, Math.min(m, 1 - seg(t, BAR(1) - 0.35, BAR(1))));
  rise(meet, m, 60);

  // bar 1: each verb lands on its beat
  verbs.forEach((s, i) => {
    const p = E.outExpo(seg(t, B(4 + i), B(4 + i) + 0.3));
    s.style.opacity = p * (1 - seg(t, BAR(2) - 0.35, BAR(2)));
    s.style.transform = `translateY(${(1 - p) * 30 * KIT.u}px)`;
  });
  const tg = KIT.ease(seg(t, B(7), B(7) + KIT.dur(0.5)));
  show(together, Math.min(tg, 1 - seg(t, BAR(2) - 0.35, BAR(2))));
  rise(together, tg, 20);

  // bar 2
  const w = KIT.ease(seg(t, BAR(2), BAR(2) + KIT.dur(0.7)));
  show(who, Math.min(w, 1 - seg(t, BAR(3) - 0.35, BAR(3))));
  rise(who, w);
  const rw = KIT.ease(seg(t, B(9), B(9) + KIT.dur(0.8))) * 480 * KIT.u;
  css(rule, { left: CX - rw / 2 + 'px', width: rw + 'px' });
  show(rule, 1 - seg(t, BAR(3) - 0.35, BAR(3)));

  // bar 3
  const n = KIT.ease(seg(t, BAR(3), BAR(3) + KIT.dur(0.7)));
  show(name, n);
  name.style.transform = `scale(${0.92 + 0.08 * n})`;
  const u = KIT.ease(seg(t, B(13), B(13) + KIT.dur(0.5)));
  show(url, u); rise(url, u, 20);

  KIT.stage.style.opacity = 1 - seg(t, DUR - 0.4, DUR);
}
KIT.start({ dur: DUR, render });
