// The film's timing as plain ESM (no JSX), so tools/renderers/remotion.mjs `info` can import it in Node:
// DUR (seconds) and the SFX cues mix.py plays. Film.jsx reads the same moments. Every time comes from the VO
// words or the beat grid (kit.js), never a hard-coded second. Built with Remotion, see remotion.pro/license.

// the moments the edit hangs on, in seconds
export const at = (k) => ({
  title: k.V('hook').start,                     // the title lands with the first VO line
  chart: k.V('chart').start,
  grow: k.snap(k.W('chart', 'grows')),          // bars grow on the beat nearest "grows"
  end: k.V('end').start,
});

export const DUR = (k) => +(k.PROJECT.speechEnd + (k.PROJECT.tail ?? 2)).toFixed(3);

export const cues = (k) => {
  const m = at(k);
  return [{ t: m.title, kind: 'whoosh', gain: 1 }, { t: m.grow, kind: 'riser', gain: 0.7 }, { t: m.end, kind: 'impact', gain: 1 }]
    .map((c) => ({ ...c, t: +c.t.toFixed(3) }));
};
