// tools/checks/audit-times.mjs — which times an in-page audit looks at (HyperFrames `check --range a-b` and `--at-transitions`).
//   auditTimes(page, { range: [a, b], atTransitions, step = 0.5 }) → sorted, de-duplicated times inside the film
// Default: every `step` s over the whole film. `range` limits it. `atTransitions`: only the moments around a cut or
// transition: the boundaries of window.FILM.cuts (or .scenes) when the film lists them, else the start and end of each
// VO line, each sampled just before and just after (±0.12 s) plus the boundary itself.
export async function auditTimes(page, { range, atTransitions = false, step = 0.5 } = {}) {
  const { dur, marks } = await page.evaluate(() => {
    const F = window.FILM || {}, VO = window.VO || {};
    const cuts = (F.cuts || F.scenes || []).map((c) => (typeof c === "number" ? c : c.start ?? c.at)).filter((x) => typeof x === "number");
    const vo = Object.values(VO).flatMap((v) => [v.start, v.end]).filter((x) => typeof x === "number");
    return { dur: F.DUR || 0, marks: cuts.length ? cuts : vo };
  });
  const [a, b] = range || [0, dur];
  let ts = [];
  if (atTransitions) for (const m of marks) ts.push(m - 0.12, m, m + 0.12);
  else for (let t = a; t < b; t += step) ts.push(t);
  const top = Math.max(0, dur - 1e-3);
  return [...new Set(ts.filter((t) => t >= a && t <= b).map((t) => +Math.min(Math.max(t, 0), top).toFixed(3)))].sort((x, y) => x - y);
}
