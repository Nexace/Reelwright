// KIT.motionRules: the motion-design rule tables as data plus pure helpers (docs/playbook/motion-rules.md is the prose).
// Works in the browser (attaches to window.KIT, also KIT.material / KIT.springs / KIT.distDur / KIT.loop when free; load it
// after engine.js) and in CommonJS (module.exports; the self-checks run it in a vm). Self-contained. Every function is a pure function of its arguments.
// Numbers: the row text gives the anchors (rigid 1.2x/0 %, elastic 0.8x/15-25 %, fluid 1.5x/5 %, paper 1.0x/3-5 %, gas 2.0x,
// glass 0.9x; spring ranges; distance 50 px = 0.8x ... full screen 1.8-2x; exit 65-75 %; stagger total < 500 ms); the rest
// is our own fit, marked "fit" in the docs.
//   motionRules.easing(name)                 → ease(p), cubic-bezier from `easings`
//   motionRules.material(name)               → { name, durScale, overshoot, ease }   (KIT.material)
//   motionRules.springs / spring(name)       → { mass, stiffness, damping } / + { zeta, overshoot, settle }   (KIT.springs)
//   motionRules.distDur(px, base) / distScale(px) / exitDur(enter, ratio) / elementDur(type)   (KIT.distDur)
//   motionRules.stagger(cls, n, { from, grid, total, step }) → offsets (s), total < 0.5 s
//   motionRules.loop(t, period, shape, id)   → 0..1 (KIT.loop); ambient.{breathe,float,gradient,rotate,shimmer,parallax}
//   motionRules.shake(t, t0, { amp, dur, n }) → px offset (error shake)
//   data: checklist, pillars, layers, emotion, acts, strategies, feedback, quality, troubleshooting, choreography
'use strict';
(function (root) {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const R = {};

  // ── easing (3.3): cubic-bezier, same maths as KIT.bezier (bisection: stateless) ─────────────────────────
  const bezier = (x1, y1, x2, y2) => {
    const B = (a, b, s) => 3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s;
    return (p) => {
      if (p <= 0) return 0; if (p >= 1) return 1;
      let lo = 0, hi = 1, s = p;
      for (let i = 0; i < 50; i++) { s = (lo + hi) / 2; if (B(x1, x2, s) < p) lo = s; else hi = s; }
      return B(y1, y2, s);
    };
  };
  R.bezier = bezier;
  R.easings = {
    standard: [0.2, 0, 0, 1],               // MD3 standard
    emphasized: [0.05, 0.7, 0.1, 1],        // MD3 emphasized (decelerate half; = KIT.E.emphasized)
    emphasizedAccel: [0.3, 0, 0.8, 0.15],   // MD3 emphasized accelerate (exits)
    decelerate: [0, 0, 0, 1],               // MD3 standard decelerate (enters)
    accelerate: [0.3, 0, 1, 1],             // MD3 standard accelerate (exits)
    apple: [0.25, 0.1, 0.25, 1],            // Apple HIG default (CSS ease)
    gentleFloat: [0.37, 0, 0.63, 1],        // slow in and out, ambient moves
    bounce: [0.34, 1.56, 0.64, 1],
    elasticSnap: [0.68, -0.55, 0.265, 1.55],
  };
  R.easing = (name) => {
    const b = R.easings[name];
    if (!b) throw new Error(`motionRules.easing: unknown "${name}" (${Object.keys(R.easings).join(", ")})`);
    return bezier(...b);
  };

  // ── material easing (3.4): duration scale and overshoot (fraction of the move) per material ───────────
  // The curve for overshoot > 0 is a back-out whose s is solved so the measured peak equals `overshoot`.
  const backOut = (s) => (p) => { p = clamp(p); const q = p - 1; return q * q * ((s + 1) * q + s) + 1; };
  const peak = (f) => { let m = 1; for (let i = 0; i <= 400; i++) m = Math.max(m, f(i / 400)); return m - 1; };
  const solveBack = (over) => {   // peak(backOut(s)) grows with s: bisection, deterministic
    let lo = 0, hi = 12;
    for (let i = 0; i < 40; i++) { const s = (lo + hi) / 2; if (peak(backOut(s)) < over) lo = s; else hi = s; }
    return backOut((lo + hi) / 2);
  };
  R.materials = {
    rigid:   { durScale: 1.2, overshoot: 0,    base: "standard" },
    elastic: { durScale: 0.8, overshoot: 0.2,  range: [0.15, 0.25] },
    fluid:   { durScale: 1.5, overshoot: 0.05, base: "emphasized" },
    paper:   { durScale: 1.0, overshoot: 0.04, range: [0.03, 0.05] },
    gas:     { durScale: 2.0, overshoot: 0,    base: "gentleFloat" },
    glass:   { durScale: 0.9, overshoot: 0,    base: "apple" },
  };
  R.material = (name, overshoot) => {
    const m = R.materials[name];
    if (!m) throw new Error(`motionRules.material: unknown "${name}" (${Object.keys(R.materials).join(", ")})`);
    const o = overshoot == null ? m.overshoot : overshoot;
    return { name, durScale: m.durScale, overshoot: o, ease: o > 0 ? solveBack(o) : R.easing(m.base || "standard") };
  };

  // ── springs (3.5): mass 1 palette; zeta = damping / (2 sqrt(k m)) ───────────────────────────────────
  R.springs = {
    veryStiff:   { mass: 1, stiffness: 400, damping: 28 },   // 400+ / 25-30
    stiff:       { mass: 1, stiffness: 300, damping: 24 },
    standard:    { mass: 1, stiffness: 200, damping: 18 },
    bouncy:      { mass: 1, stiffness: 150, damping: 12 },
    veryBouncy:  { mass: 1, stiffness: 120, damping: 7 },    // 100-200 / 5-10
  };
  R.spring = (name) => {
    const s = R.springs[name];
    if (!s) throw new Error(`motionRules.spring: unknown "${name}" (${Object.keys(R.springs).join(", ")})`);
    const w0 = Math.sqrt(s.stiffness / s.mass), zeta = s.damping / (2 * Math.sqrt(s.stiffness * s.mass));
    // underdamped: overshoot = exp(-pi z / sqrt(1 - z^2)); settle (2 %) ~ 4 / (z w0)
    return { ...s, zeta, overshoot: zeta >= 1 ? 0 : Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta * zeta)), settle: 4 / (zeta * w0) };
  };

  // ── duration (3.6) ──────────────────────────────────────────────────────────────────────────────
  R.durations = {   // seconds to enter, by element type (fit)
    micro: 0.15,      // button press, toggle, checkbox, hover
    chip: 0.2,        // tooltip, chip, badge, inline text
    icon: 0.25,
    card: 0.3,        // card, list item, row
    panel: 0.4,       // modal, sheet, side panel, chart
    scene: 0.5,       // page / scene change, big layout move
    hero: 0.6,        // title, hero image, logo
    ambient: 1.2,     // background reveals
  };
  R.elementDur = (type) => { const d = R.durations[type]; if (d == null) throw new Error(`motionRules.elementDur: unknown "${type}"`); return d; };
  const DIST = [[0, 0.7], [50, 0.8], [100, 1], [200, 1.2], [400, 1.4], [800, 1.7], [1080, 1.9], [1920, 2]];   // px → x (fit through the row's anchors)
  R.distScale = (px) => {
    px = Math.abs(px);
    for (let i = 1; i < DIST.length; i++) if (px <= DIST[i][0]) { const [a, b] = [DIST[i - 1], DIST[i]]; return a[1] + (b[1] - a[1]) * (px - a[0]) / (b[0] - a[0]); }
    return 2;
  };
  R.distDur = (px, base = 0.3) => base * R.distScale(px);
  R.exitDur = (enter, ratio = 0.7) => enter * clamp(ratio, 0.65, 0.75);

  // ── stagger (3.7) ───────────────────────────────────────────────────────────────────────────────
  R.MAX_STAGGER = 0.5;   // the whole stagger stays under this (s); overlap = 1 - step / dur
  R.staggers = {          // per class: step between items (s), where it starts
    list:      { step: 0.05, from: "start" },
    grid:      { step: 0.04, from: "start", grid: true },      // by distance from the start corner
    nav:       { step: 0.04, from: "start" },
    dashboard: { step: 0.06, from: "center" },                  // hero first, the rest ripple out
  };
  R.stagger = (cls, n, o = {}) => {
    const c = R.staggers[cls];
    if (!c) throw new Error(`motionRules.stagger: unknown class "${cls}" (${Object.keys(R.staggers).join(", ")})`);
    const from = o.from ?? c.from, step = o.step ?? c.step;
    if (n < 2) return Array(Math.max(n, 0)).fill(0);
    const cols = o.grid ? o.grid[0] : 0;
    // distance of item i from the origin, in "cells"
    const cell = (i) => (cols ? [i % cols, Math.floor(i / cols)] : [i, 0]);
    const org = from === "center" ? (cols ? [(cols - 1) / 2, (Math.ceil(n / cols) - 1) / 2] : [(n - 1) / 2, 0])
      : from === "end" ? cell(n - 1) : from === "edges" ? null : Number.isInteger(from) ? cell(from) : [0, 0];
    const d = Array.from({ length: n }, (_, i) => {
      const [x, y] = cell(i);
      if (!org) return cols ? Math.min(x, cols - 1 - x, y, Math.ceil(n / cols) - 1 - y) : Math.min(x, n - 1 - x);   // edges: outermost first
      return Math.hypot(x - org[0], y - org[1]);
    });
    const lo = Math.min(...d), span = Math.max(...d) - lo || 1;
    const total = Math.min(o.total ?? step * (n - 1), R.MAX_STAGGER * 0.96);
    return d.map((v) => +(total * (v - lo) / span).toFixed(4));
  };
  R.overlap = (cls, dur) => clamp(1 - R.staggers[cls].step / dur);

  // ── ambient loops (3.11) ────────────────────────────────────────────────────────────────────────
  const hash01 = (id) => { let h = 2166136261; for (const ch of String(id)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  R.hash01 = hash01;
  const SHAPES = {
    sine: (x) => 0.5 - 0.5 * Math.cos(2 * Math.PI * x),   // 0 → 1 → 0
    saw: (x) => x,
    tri: (x) => 1 - Math.abs(2 * x - 1),
    breathe: (x) => { const s = 0.5 - 0.5 * Math.cos(2 * Math.PI * x); return s * s * (3 - 2 * s); },   // lingers at both ends
  };
  R.loop = (t, period, shape = "sine", id = "") => {
    const f = SHAPES[shape];
    if (!f) throw new Error(`motionRules.loop: unknown shape "${shape}" (${Object.keys(SHAPES).join(", ")})`);
    const x = t / period + (id === "" ? 0 : hash01(id));
    return f(x - Math.floor(x));
  };
  R.ambient = {
    breathe: (t, id = "", { period = 4, amount = 0.03 } = {}) => 1 + amount * R.loop(t, period, "breathe", id),            // scale
    float: (t, id = "", { amp = 12, periods = [3.1, 4.7, 7.3] } = {}) =>                                                    // px; layered durations
      amp * periods.reduce((s, p, i) => s + (R.loop(t, p, "sine", id + i) - 0.5) / (i + 1), 0) / (1 + 1 / 2 + 1 / 3) * 2,
    gradient: (t, id = "", { period = 12 } = {}) => 360 * R.loop(t, period, "saw", id),                                    // deg
    rotate: (t, degPerS = 12, id = "") => degPerS * t + 360 * hash01(id),
    shimmer: (t, id = "", { period = 2.4 } = {}) => -0.2 + 1.4 * R.loop(t, period, "saw", id),                             // sweep position 0..1
    parallax: (t, depth = 1, { speed = 20 } = {}) => speed * depth * t,                                                     // px, farther = slower
  };
  R.particles = { count: [12, 40], speed: [0.01, 0.05], note: "screen heights per second; seed positions with KIT.doodle.rng" };

  // ── feedback (3.12) ─────────────────────────────────────────────────────────────────────────────
  R.feedback = {
    press:      { dur: 0.1, scale: 0.96, ease: "accelerate", call: "KIT.indicate.indicate" },
    hover:      { dur: 0.2, scale: 1.03, ease: "standard",   call: "KIT.indicate.indicate" },
    toggle:     { dur: 0.2, ease: "standard",                call: "KIT.keys" },
    success:    { dur: 0.4, spring: "bouncy",                call: "KIT.spring" },
    errorShake: { dur: 0.4, amp: 8, n: 3,                    call: "KIT.indicate.wiggle" },
    validation: { dur: 0.2, ease: "decelerate",              call: "KIT.indicate.flash" },
  };
  R.shake = (t, t0, { amp = 8, dur = 0.4, n = 3 } = {}) => {   // damped sine, 0 outside the window
    const p = (t - t0) / dur; if (p <= 0 || p >= 1) return 0;
    return amp * (1 - p) * Math.sin(2 * Math.PI * n * p);
  };

  // ── prose-backed data: the docs name each key, tools/selfcheck/p6-rules.mjs keeps them in step ──────
  R.checklist = [   // 3.1 pre-animation, 8 steps
    "purpose: what the viewer should understand or feel after this motion",
    "hierarchy: which one thing is primary, what is secondary, what stays still",
    "personality: pick the theme archetype, then ease, tempo, overshoot",
    "path: where each element comes from and goes to (origin, arc or straight)",
    "timing: duration by element type, scaled by distance; stagger under 0.5 s",
    "layers: primary move, secondary support, ambient life",
    "sound and beat: land hits on KIT.snap, cue sfx",
    "check: stills sheet, qa, and the motion-rules lint",
  ];
  R.pillars = ["purpose", "physics", "polish"];   // every move has a job; weight and ease are believable; details are finished
  R.layers = { primary: "the hero move that carries the point", secondary: "support: 20-30 % of the primary's travel, delayed, counter-motion",
    ambient: "slow continuous life (breathe, float, gradient) under everything" };
  R.emotion = {   // 3.9: emotion → motion (fit)
    joy:       { ease: "elasticSnap", durScale: 0.8, path: "arc up", spring: "bouncy" },
    calm:      { ease: "gentleFloat", durScale: 1.5, path: "straight, slow", spring: "standard" },
    trust:     { ease: "standard",    durScale: 1.0, path: "straight, level", spring: "stiff" },
    urgency:   { ease: "accelerate",  durScale: 0.6, path: "straight, diagonal", spring: "veryStiff" },
    surprise:  { ease: "bounce",      durScale: 0.7, path: "arc, overshoot", spring: "veryBouncy" },
    sadness:   { ease: "decelerate",  durScale: 1.8, path: "sinks, arcs down", spring: "standard" },
    power:     { ease: "emphasized",  durScale: 1.2, path: "straight, from below, slow start", spring: "stiff" },
  };
  R.acts = [   // 3.9 narrative 4-act structure: share of the film
    { act: "hook", share: 0.1 }, { act: "build", share: 0.35 }, { act: "payoff", share: 0.4 }, { act: "close", share: 0.15 },
  ];
  R.strategies = [   // 3.10: entrance family → KIT calls; exits mirror it
    { family: "direct",    enter: "slide / fade of the element itself",  calls: ["KIT.keys", "KIT.easing", "KIT.stagger"], exit: "dissolve", exitCalls: ["KIT.win"] },
    { family: "emergent",  enter: "grows out of its parent or a point",  calls: ["KIT.spring", "KIT.transition.names"], exit: "collapse", exitCalls: ["KIT.keys"] },
    { family: "reveal",    enter: "a mask uncovers it",                  calls: ["KIT.transition.names", "KIT.path"], exit: "dissolve", exitCalls: ["KIT.transition.names"] },
    { family: "assembled", enter: "parts fly in and snap together",      calls: ["KIT.stagger", "KIT.spring"], exit: "transfer", exitCalls: ["KIT.path", "KIT.shot"] },
  ];
  R.continuity = "an exit hands the eye to the next entrance: leave toward where the next thing arrives from, keep one element on screen across a cut";
  R.choreography = {   // 3.8, checked by tools/checks/motion-rules.page.mjs
    hero: "the hero moves first, supporting items follow",
    origin: "items of one group start from one origin",
    counter: [0.2, 0.3],   // secondary counter-motion = 20-30 % of the primary travel
    maxSimultaneous: 1 / 3,
    maxDistance: 1 / 3,
    maxStagger: 0.5,
  };
  R.counterMotion = (primary, k = 0.25) => -primary * clamp(k, ...R.choreography.counter);
  R.quality = [   // 3.14: tier → what to check → where it is enforced (a qa name in tools/qa.py or tools/checks/)
    { tier: "blocker", check: "frames are a pure function of t", enforced: "seekable" },
    { tier: "blocker", check: "no more than 3 flashes in 1 s", enforced: "flash" },
    { tier: "blocker", check: "captions inside the safe area, contrast 4.5", enforced: "captions" },
    { tier: "blocker", check: "numbers carry an Illustrative data label", enforced: "illustrative" },
    { tier: "blocker", check: "no wiggle / random in a Lottie expression", enforced: "lottie-expressions" },
    { tier: "major", check: "spatial moves are eased, not linear", enforced: "motion-rules" },
    { tier: "major", check: "stagger total under 0.5 s; no more than 1/3 of a group starts at once", enforced: "motion-rules" },
    { tier: "major", check: "no hard starts or stops at speed, no teleports", enforced: "taste" },
    { tier: "major", check: "text does not overlap, is not tiny", enforced: "overlap" },
    { tier: "minor", check: "nothing sits still for over 4 s", enforced: "taste" },
    { tier: "minor", check: "no stretch of dark frames", enforced: "dark" },
  ];
  R.troubleshooting = [   // symptom → cause → fix
    ["motion looks mechanical", "linear or one ease everywhere", "motionRules.material(...) or a theme archetype; vary ease by role"],
    ["it feels slow", "duration ignores distance", "motionRules.distDur(px); shorten exits to 70 %"],
    ["it feels jittery", "a spring that is too light or stagger over 0.5 s", "motionRules.spring('stiff'); lower the stagger total"],
    ["everything moves at once", "no hierarchy", "lead with the hero, stagger the rest, hold ambient still"],
    ["frames differ between runs", "a clock or Math.random in render(t)", "the seekable gate names the line; use KIT.loop / seeded KIT.doodle.rng"],
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = R;
  const K = root && root.KIT;
  if (K) {
    K.motionRules = R;
    for (const [k, v] of [["material", R.material], ["springs", R.springs], ["distDur", R.distDur], ["loop", R.loop]]) if (K[k] === undefined) K[k] = v;
  }
})(typeof window !== "undefined" ? window : null);
