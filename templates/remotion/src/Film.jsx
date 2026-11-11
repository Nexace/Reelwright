// The edit: a pure function of the frame. t = frame / fps; every moment comes from film.mjs (VO words, beats).
// No Date.now, Math.random, timers, CSS transitions/animations or useFrame: Remotion renders frames in any order
// on many tabs, and Reelwright's QA seeks them. Theme tokens (--kit-*) come from public/theme.css.
// Built with Remotion, see remotion.pro/license.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { makeKit } from './kit.js';
import { at, DUR } from './film.mjs';

const BARS = [['Q1', 42], ['Q2', 58], ['Q3', 71], ['Q4', 96]];   // illustrative numbers, labelled on screen

// karaoke captions in tools/kit.css markup: .kit-subs > .kit-subrow > span, spoken words .said, the current one .now
function Captions({ k, t }) {
  const cur = Object.entries(k.VO).find(([, v]) => t >= v.start - 0.15 && t <= v.end + 0.35);
  if (!cur) return null;
  const [id, v] = cur, ws = k.words(id), op = k.win(t, v.start - 0.15, v.end + 0.35, 0.15, 0.2);
  return (
    <div className="kit-subs">
      <div className="kit-subrow" style={{ opacity: op, visibility: op > 0.001 ? 'visible' : 'hidden' }}>
        {ws.map((w, i) => (
          <span key={i} className={t < w.t ? '' : t < (ws[i + 1]?.t ?? v.end) ? 'said now' : 'said'}>{w.text + ' '}</span>
        ))}
      </div>
    </div>
  );
}

export const Film = (props) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const k = React.useMemo(() => makeKit(props), [props]);
  const t = frame / fps, m = at(k), dur = DUR(k), u = k.u, S = k.safe;
  const display = { fontFamily: 'var(--kit-font-display)', fontWeight: 'var(--kit-display-weight)', letterSpacing: 'var(--kit-display-tracking)',
    textTransform: 'var(--kit-display-case)', color: 'var(--kit-ink)' };

  const title = k.win(t, m.title, m.chart, 0.3, 0.4), pop = k.spring(t - m.title, { damping: 14 });
  const chart = k.win(t, m.chart - 0.2, m.end, 0.4, 0.4);
  const end = k.seg(t, m.end, m.end + 0.4), endPop = k.spring(t - m.end, { damping: 12 });
  const barW = S.w / 9, plotH = S.h * 0.55;

  return (
    <AbsoluteFill id="stage" style={{ opacity: 1 - k.seg(t, dur - 0.6, dur), '--kit-u': u + 'px',
      '--kit-safe-x': S.x + 'px', '--kit-safe-y': S.y + 'px', '--kit-safe-w': S.w + 'px', '--kit-safe-h': S.h + 'px' }}>
      <div style={{ left: S.x, top: S.y, width: S.w, height: S.h, display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: title, visibility: title > 0.001 ? 'visible' : 'hidden' }}>
        <div style={{ ...display, fontSize: 128 * u, lineHeight: 1.05, textAlign: 'center', maxWidth: S.w * 0.8,
          transform: `translateY(${(1 - pop) * 60 * u}px) scale(${0.92 + 0.08 * pop})` }}>{k.V('hook').text}</div>
      </div>

      <div style={{ left: S.x, top: S.y, width: S.w, height: S.h, opacity: chart, visibility: chart > 0.001 ? 'visible' : 'hidden' }}>
        <div style={{ ...display, fontSize: 64 * u }}>Weekly renders</div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: S.h * 0.18, height: plotH, display: 'flex', alignItems: 'flex-end',
          justifyContent: 'space-around', borderBottom: `${2 * u}px solid var(--kit-muted)` }}>
          {BARS.map(([name, v], i) => {
            const g = k.easing('expo.out')(k.seg(t, m.grow + i * 0.08, m.grow + i * 0.08 + 0.7)) * (1 + 0.04 * k.pulse(t));
            return (
              <div key={name} style={{ position: 'relative', width: barW, height: plotH * (v / 100) * g, background: 'var(--kit-accent)',
                borderRadius: `${8 * u}px ${8 * u}px 0 0` }}>
                <div style={{ position: 'absolute', bottom: '100%', width: '100%', textAlign: 'center', paddingBottom: 10 * u,
                  font: `600 ${36 * u}px var(--kit-font-text)`, color: 'var(--kit-ink)', opacity: k.seg(g, 0.6, 1) }}>{v}k</div>
                <div style={{ position: 'absolute', top: '100%', width: '100%', textAlign: 'center', paddingTop: 12 * u,
                  font: `${30 * u}px var(--kit-font-text)`, color: 'var(--kit-muted)' }}>{name}</div>
              </div>
            );
          })}
        </div>
        <div style={{ position: 'absolute', right: 0, top: 0, font: `${22 * u}px var(--kit-font-text)`, color: 'var(--kit-muted)' }}>Illustrative data</div>
      </div>

      <div style={{ left: 0, top: 0, width: k.W_, height: k.H_, display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: end, visibility: end > 0.001 ? 'visible' : 'hidden' }}>
        <div style={{ ...display, fontSize: 150 * u, color: 'var(--kit-accent)', transform: `scale(${0.85 + 0.15 * endPop})` }}>{k.V('end').text}</div>
      </div>

      <Captions k={k} t={t} />
    </AbsoluteFill>
  );
};
