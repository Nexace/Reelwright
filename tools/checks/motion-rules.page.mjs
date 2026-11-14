// tools/checks/motion-rules.page.mjs — WARN-only "motion-rules" plug-in for `reelwright qa` (tools/qa_page.mjs loads it): the
// choreography rules of docs/playbook/motion-rules.md that a film's DOM can show, sampled at ≤ 30 fps from render(t):
//   linear    a visible element travels ≥ 0.1 screen heights over ≥ 0.4 s at one constant speed (no ease at either end)
//   stagger   ≥ 3 same-size siblings start one after another over more than 0.5 s (the stagger budget)
//   together  more than a third of ≥ 3 same-size siblings start moving in the same frame (lead with the hero, stagger the rest)
// An element "starts" the first frame it moves or fades while visible; frames where most elements appear at once (a cut) are
// skipped. Lines look like `linear 3.40s: "#card" moves 0.42 H in 1.20 s at constant speed (ease it: KIT.ease)`.
// Skip: "qa": {"motion-rules": false}. Fixtures + proof: tools/selfcheck/p6-motion-rules.mjs.
export const kind = "warn";

const T = {
  STEP_FPS: 30, MAX_TRACK: 250,
  MOVE_MIN: 0.12,      // H/s: slower is drift, not a move
  LIN_S: 0.4, LIN_DIST: 0.1, LIN_FLAT: 0.12, LIN_EDGE: 0.4,   // a run: seconds, screen heights, ±share of the median speed, edge frames ≥ 40 % of it
  GAP: 0.25,           // s: starts closer than this belong to one stagger
  STAG_MAX: 0.5,       // s: the budget (KIT.motionRules.choreography.maxStagger)
  SIZE: 0.35,          // siblings within 35 % in width and height are "the same kind of thing"
  GROUP: 3, SIM: 1 / 3, CUT: 0.5, MAX_LINES: 10,
};

export default async function check(page) {
  return page.evaluate(async (T) => {
    const K = window.KIT, F = window.FILM, W = innerWidth, H = innerHeight;
    const stage = (K && K.stage) || document.getElementById('stage');
    if (!F || !stage) return [];
    const step = 1 / Math.min(F.FPS || 30, T.STEP_FPS), n = Math.floor(F.DUR / step) + 1, t2 = (t) => t.toFixed(2);
    const direct = (e) => [...e.childNodes].some((c) => c.nodeType === 3 && /[\p{L}\p{N}]/u.test(c.textContent));
    const painted = (s) => !/^(rgba\(0, 0, 0, 0\)|transparent)$/.test(s.backgroundColor) || s.backgroundImage !== 'none';
    const els = [...stage.querySelectorAll('*')].filter((e) => {
      if (e.closest('.kit-subs, .kit-subrow, svg, defs') || /^(SCRIPT|STYLE|TEMPLATE)$/i.test(e.tagName)) return false;
      return /^(IMG|CANVAS|VIDEO)$/.test(e.tagName) || direct(e) || painted(getComputedStyle(e));
    }).slice(0, T.MAX_TRACK);
    const N = els.length;
    const name = (e) => e.id ? `"#${e.id}"` : e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '');
    const opOf = (e) => { let o = 1; for (let a = e; a && a.nodeType === 1; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none') return 0; o *= Number(s.opacity); } return o; };
    const vis = [], X = [], Y = [], OP = [], dim = els.map(() => null);
    for (let i = 0; i < n; i++) {
      await window.render(i * step);
      const v = new Uint8Array(N), x = new Float32Array(N), y = new Float32Array(N), op = new Float32Array(N);
      for (let k = 0; k < N; k++) {
        const r = els[k].getBoundingClientRect(), o = opOf(els[k]);
        x[k] = r.left + r.width / 2; y[k] = r.top + r.height / 2; op[k] = o;
        v[k] = r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < W && r.top < H && o > 0.05 && getComputedStyle(els[k]).visibility !== 'hidden' ? 1 : 0;
        if (v[k] && !dim[k]) dim[k] = [r.width, r.height];
      }
      vis.push(v); X.push(x); Y.push(y); OP.push(op);
    }
    const cut = new Uint8Array(n);
    for (let i = 1; i < n; i++) { let any = 0, flip = 0; for (let k = 0; k < N; k++) if (vis[i][k] || vis[i - 1][k]) { any++; if (vis[i][k] !== vis[i - 1][k]) flip++; } cut[i] = any >= 2 && flip > T.CUT * any ? 1 : 0; }
    const speed = (i, k) => (i > 0 && !cut[i] && vis[i][k] && vis[i - 1][k] ? Math.hypot(X[i][k] - X[i - 1][k], Y[i][k] - Y[i - 1][k]) / step / H : null);
    const out = [];

    // linear: runs of frames at ≥ MOVE_MIN H/s
    for (let k = 0; k < N; k++) {
      for (let i = 1; i < n;) {
        const s0 = speed(i, k);
        if (s0 == null || s0 < T.MOVE_MIN) { i++; continue; }
        let j = i; const sp = [];
        while (j < n && (speed(j, k) ?? 0) >= T.MOVE_MIN * 0.5 && speed(j, k) != null) sp.push(speed(j++, k));
        const dur = sp.length * step, dist = sp.reduce((a, b) => a + b, 0) * step;
        if (dur >= T.LIN_S && dist >= T.LIN_DIST && sp.length >= 4) {
          const med = [...sp].sort((a, b) => a - b)[sp.length >> 1], mid = sp.slice(1, -1);
          if (mid.every((s) => Math.abs(s - med) <= T.LIN_FLAT * med) && sp[0] >= T.LIN_EDGE * med && sp[sp.length - 1] >= T.LIN_EDGE * med)
            out.push({ t: i * step, text: `linear ${t2(i * step)}s: ${name(els[k])} moves ${dist.toFixed(2)} H in ${t2(dur)} s at constant speed (ease it: KIT.ease, motionRules.material)` });
        }
        i = Math.max(j, i + 1);
      }
    }

    // starts: the first frame an element moves or fades while visible (not at a cut)
    const start = new Array(N).fill(-1);
    for (let k = 0; k < N; k++) for (let i = 1; i < n; i++) {
      if (cut[i] || !vis[i][k]) continue;
      if (!vis[i - 1][k] || Math.abs(X[i][k] - X[i - 1][k]) > 0.5 || Math.abs(Y[i][k] - Y[i - 1][k]) > 0.5 || Math.abs(OP[i][k] - OP[i - 1][k]) > 0.01) { start[k] = i; break; }
    }
    // clusters: same parent, similar size
    const clusters = [];
    const byParent = new Map();
    els.forEach((e, k) => { if (start[k] >= 0 && dim[k]) { const a = byParent.get(e.parentElement) || []; a.push(k); byParent.set(e.parentElement, a); } });
    for (const ks of byParent.values()) {
      const cs = [];
      for (const k of ks) {
        const c = cs.find((c) => Math.abs(dim[k][0] / dim[c[0]][0] - 1) < T.SIZE && Math.abs(dim[k][1] / dim[c[0]][1] - 1) < T.SIZE);
        if (c) c.push(k); else cs.push([k]);
      }
      clusters.push(...cs.filter((c) => c.length >= T.GROUP));
    }
    for (const c of clusters) {
      const ts = c.map((k) => start[k] * step).sort((a, b) => a - b), label = `${c.length} ${name(els[c[0]])} items`;
      // stagger runs: consecutive distinct starts closer than GAP
      let a = 0;
      for (let b = 1; b <= ts.length; b++) {
        if (b < ts.length && ts[b] - ts[b - 1] <= T.GAP) continue;
        const run = ts.slice(a, b), span = run[run.length - 1] - run[0];
        if (run.length >= T.GROUP && new Set(run.map((v) => v.toFixed(3))).size >= 3 && span > T.STAG_MAX + step)
          out.push({ t: run[0], text: `stagger ${t2(run[0])}s: ${run.length} ${name(els[c[0]])} items start over ${span.toFixed(2)} s (budget ${T.STAG_MAX} s: shrink the step, KIT.motionRules.stagger)` });
        a = b;
      }
      // together: the most starts within one frame
      const f = new Map(); for (const k of c) f.set(start[k], (f.get(start[k]) || 0) + 1);
      const [frame, most] = [...f.entries()].sort((p, q) => q[1] - p[1])[0];
      if (most >= 2 && most > c.length * T.SIM) out.push({ t: frame * step, text: `together ${t2(frame * step)}s: ${most} of ${label} start at once (more than a third: lead with one, stagger the rest)` });
    }
    return out.sort((p, q) => p.t - q.t).slice(0, T.MAX_LINES).map((o) => o.text);
  }, T);
}
