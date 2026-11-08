// Engine demo (CI): exercises the 10a features in ~6 s — KIT.shader (sdf-iris between two scenes), KIT.video with a
// speed ramp, KIT.grade animated from render(t), KIT.mount (hf/compositions/tag.html), KIT.audio, plus motion blur
// and webm output from project.json. Every time comes from W(), V() or KIT.snap().
'use strict';
const { el, css, show, seg, win, V, W } = KIT;
const S = KIT.safe, CX = S.x + S.w / 2, CY = S.y + S.h / 2, u = KIT.u;

// ── scene A: the hook, then an iris opens onto scene B ───────────────────
const A = el('div', 'scene'), B = el('div', 'scene'); B.id = 'sceneB';
// plain text, not KIT.words: its will-change layers antialias differently from run to run in the shader pass's captures
const hook = el('div', 'big', A, V('hook').text);
const SH_T = KIT.snap(W('hook', 'shader')), SH_DUR = 0.7;
KIT.shader(A, B, { shader: 'sdf-iris', t: SH_T, dur: SH_DUR });
KIT.audio('media/whoosh.wav', { start: SH_T, gain: 0.5, fadeOut: 0.2 });

// ── scene B: a speed-ramped, graded clip + a mounted composition ─────────
const END_IN = W('end', 'Reelwright');
const CLIP_IN = Math.max(V('ramp').start, SH_T + SH_DUR);   // the clip appears once the iris is open (producer frames don't show inside it)
const CLIP_DUR = END_IN - 0.2 - CLIP_IN;
const clip = KIT.video('media/zoom.mp4', { id: 'zoom', start: CLIP_IN, dur: CLIP_DUR, parent: B, cls: 'card',
  ramp: [{ t: 0, v: 1.2 }, { t: CLIP_DUR * 0.45, v: 0.3 }, { t: CLIP_DUR, v: 1.6 }] });
const cw = Math.min(S.w * 0.62, S.h * 0.66 * 16 / 9), ch = cw * 9 / 16;
css(clip, { left: CX - cw / 2 + 'px', top: S.y + 'px', width: cw + 'px', height: ch + 'px' });
const grade = KIT.grade(clip, { preset: 'mono-clean', intensity: 0 });
const GRADE_AT = W('ramp', 'grade');

const tag = KIT.mount('tag', { start: CLIP_IN, dur: END_IN - 0.2 - CLIP_IN, parent: B });
css(tag, { left: CX - cw / 2 + 'px', top: S.y + ch + 28 * u + 'px', transform: `scale(${u})`, transformOrigin: '0 0' });

const subs = KIT.subtitles(['ramp'], B);
css(subs.box, { bottom: KIT.H_ - S.y - S.h + 'px' });

const logo = el('div', 'logo', B, 'Reelwright');
const DUR = window.PROJECT.speechEnd + window.PROJECT.tail;

function render(t) {
  show(A, t < SH_T ? 1 : 0); show(B, t >= SH_T ? 1 : 0);   // inside [SH_T, SH_T + SH_DUR) KIT.shader takes over
  show(hook, seg(t, V('hook').start - 0.05, V('hook').start + 0.25));

  const on = win(t, CLIP_IN, END_IN - 0.2, 0.25, 0.25);
  show(clip, on); show(tag, on);
  grade('intensity', seg(t, GRADE_AT, GRADE_AT + 0.8));

  subs.set(t, t > CLIP_IN && t < END_IN - 0.2 ? 1 : 0);

  const li = KIT.ease(seg(t, END_IN, END_IN + KIT.dur(0.6)));
  show(logo, seg(t, END_IN, END_IN + 0.2));
  logo.style.transform = `translateY(-50%) scale(${0.7 + 0.3 * li})`;

  KIT.stage.style.opacity = 1 - seg(t, DUR - 0.5, DUR);
}
KIT.start({ dur: DUR, render });
