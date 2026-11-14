// tools/checks/motion.mjs — `*.motion.json` assertions (HyperFrames `check` motion assertions, G4).
// A film states what its motion must do, in <project>/*.motion.json (also hf/ and film/), and the audit seeks the page
// with window.render(t) and checks it. Schema (Reelwright's own; upstream's file format is not vendored):
//   { "assertions": [ <assertion>, … ] }
//   assertion = { "id"?: string, "selector": css, and one of
//     "at": t | [t, …] | { "vo": "<line id>", "edge": "start" | "mid" | "end" },
//         "expect": { "exists"?: bool, "visible"?: bool, "text"?: "exact" | { "contains": "…" },
//                     "<prop>": { "min"?, "max"?, "approx"?, "tol"? }  … }                  a state at a time
//     "range": [t0, t1], "step"?: 0.05 (s), and any of
//         "monotonic": { "prop", "dir": "up" | "down" }       never moves against dir (≤ 0.5 px / 0.01 opacity of noise)
//         "still": "<prop>" | ["<prop>", …]                   does not change over the range (same noise floor)
//         "maxStep": { "prop", "max": n }                     no jump bigger than n between samples (a teleport)
//         "reaches": { "prop", "value": n, "tol"?: n }        is at value (± tol) at the end of the range
//   props: x, y, width, height, cx, cy (box in page px), opacity (× parents), scale (width ratio vs the first sample) }
// motionAudit(page, assertions, { vo }) → problem lines; findMotionFiles(dir) → files; loadAssertions(files) → { list, errors }.
import fs from "node:fs";
import path from "node:path";

export function findMotionFiles(dir) {
  const out = [];
  for (const d of [dir, path.join(dir, "hf"), path.join(dir, "film")])
    if (fs.existsSync(d)) for (const f of fs.readdirSync(d).sort()) if (f.endsWith(".motion.json")) out.push(path.join(d, f));
  return out;
}

const PROPS = ["x", "y", "width", "height", "cx", "cy", "opacity", "scale", "visible", "text", "exists"];
const SIMPLE = (a) => a.selector && typeof a.selector === "string" && [a.at !== undefined, !!a.range].filter(Boolean).length === 1;
export function loadAssertions(files) {
  const list = [], errors = [];
  for (const f of files) {
    let j;
    try { j = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { errors.push(`${path.basename(f)}: not JSON (${e.message})`); continue; }
    (j.assertions || []).forEach((a, i) => {
      const id = a.id || `${path.basename(f)}#${i + 1}`;
      if (!SIMPLE(a)) { errors.push(`${id}: needs "selector" and exactly one of "at" or "range"`); return; }
      if (a.range && !(Array.isArray(a.range) && a.range.length === 2 && a.range[1] > a.range[0])) { errors.push(`${id}: "range" is [t0, t1] with t1 > t0`); return; }
      if (a.range && !["monotonic", "still", "maxStep", "reaches"].some((k) => k in a)) { errors.push(`${id}: a "range" needs monotonic, still, maxStep or reaches`); return; }
      if (a.at !== undefined && !a.expect) { errors.push(`${id}: an "at" needs "expect"`); return; }
      const props = [a.monotonic?.prop, a.maxStep?.prop, a.reaches?.prop, ...[].concat(a.still || []), ...Object.keys(a.expect || {})].filter(Boolean);
      const bad = props.find((p) => !PROPS.includes(p) || (p === "scale" && a.at !== undefined));   // scale is relative to the range's first sample
      if (bad) { errors.push(`${id}: unknown property "${bad}" (${PROPS.join(", ")})`); return; }
      list.push({ ...a, id });
    });
  }
  return { list, errors };
}

const MEASURE = (sel) => {
  const e = document.querySelector(sel);
  if (!e) return { exists: false };
  const r = e.getBoundingClientRect();
  let op = 1, shown = true;
  for (let x = e; x && x.nodeType === 1; x = x.parentElement) {
    const s = getComputedStyle(x);
    if (s.display === "none" || s.visibility === "hidden") shown = false;
    op *= Number(s.opacity);
  }
  const on = r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  return { exists: true, x: r.left, y: r.top, width: r.width, height: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2,
    opacity: shown ? op : 0, visible: shown && on && op > 0.05, text: (e.textContent || "").trim() };
};

const NOISE = { opacity: 0.01, scale: 0.005 };   // everything else 0.5 px
const noise = (p) => NOISE[p] ?? 0.5;
const num = (v) => (typeof v === "number" ? +v.toFixed(2) : v);

export async function motionAudit(page, assertions, { vo = {} } = {}) {
  const lines = [];
  const at = (t) => page.evaluate((t) => window.render(t), t);
  const read = async (sel) => page.evaluate(MEASURE, sel);
  for (const a of assertions) {
    const where = `${a.id} ${a.selector}`;
    if (a.at !== undefined) {
      let ts = [].concat(a.at);
      ts = ts.map((x) => {
        if (typeof x === "number") return x;
        const v = vo[x.vo];
        return v ? v.start + { start: 0, mid: (v.end - v.start) / 2, end: v.end - v.start }[x.edge || "mid"] : NaN;
      });
      for (const t of ts) {
        if (Number.isNaN(t)) { lines.push(`motion ${where}: no VO line "${a.at.vo}" to time against`); continue; }
        await at(t); const m = await read(a.selector);
        for (const [k, want] of Object.entries(a.expect)) {
          const got = m[k];
          if (k === "exists" || k === "visible") { if (!!got !== !!want) lines.push(`motion ${t.toFixed(2)}s ${where}: ${k} is ${!!got}, expected ${!!want}`); continue; }
          if (!m.exists) { lines.push(`motion ${t.toFixed(2)}s ${where}: not in the page`); break; }
          if (k === "text") {
            const ok = typeof want === "string" ? got === want : got.includes(want.contains ?? "");
            if (!ok) lines.push(`motion ${t.toFixed(2)}s ${where}: text "${got.slice(0, 40)}" ≠ ${JSON.stringify(want)}`);
            continue;
          }
          const v = got, bad = [];
          if (want.min !== undefined && v < want.min) bad.push(`< min ${want.min}`);
          if (want.max !== undefined && v > want.max) bad.push(`> max ${want.max}`);
          if (want.approx !== undefined && Math.abs(v - want.approx) > (want.tol ?? noise(k))) bad.push(`not ${want.approx} ± ${want.tol ?? noise(k)}`);
          if (bad.length) lines.push(`motion ${t.toFixed(2)}s ${where}: ${k} = ${num(v)} ${bad.join(", ")}`);
        }
      }
      continue;
    }
    const [t0, t1] = a.range, step = a.step || 0.05, samples = [];
    for (let t = t0; t < t1 + 1e-9; t += step) { await at(Math.min(t, t1)); samples.push({ t: Math.min(t, t1), m: await read(a.selector) }); }
    if (samples.some((s) => !s.m.exists)) { lines.push(`motion ${t0.toFixed(2)}–${t1.toFixed(2)}s ${where}: not in the page`); continue; }
    const w0 = samples[0].m.width || 1;
    const val = (s, p) => (p === "scale" ? s.m.width / w0 : s.m[p]);
    if (a.monotonic) {
      const { prop, dir } = a.monotonic, sign = dir === "down" ? -1 : 1;
      for (let i = 1; i < samples.length; i++) {
        const d = (val(samples[i], prop) - val(samples[i - 1], prop)) * sign;
        if (d < -noise(prop)) { lines.push(`motion ${samples[i].t.toFixed(2)}s ${where}: ${prop} goes ${dir === "down" ? "up" : "down"} (${num(val(samples[i - 1], prop))} → ${num(val(samples[i], prop))}), expected monotonic ${dir}`); break; }
      }
    }
    for (const prop of [].concat(a.still || [])) {
      const vs = samples.map((s) => val(s, prop)), spread = Math.max(...vs) - Math.min(...vs);
      if (spread > noise(prop)) lines.push(`motion ${t0.toFixed(2)}–${t1.toFixed(2)}s ${where}: ${prop} moves by ${num(spread)}, expected still`);
    }
    if (a.maxStep) {
      const { prop, max } = a.maxStep;
      for (let i = 1; i < samples.length; i++) {
        const d = Math.abs(val(samples[i], prop) - val(samples[i - 1], prop));
        if (d > max) { lines.push(`motion ${samples[i].t.toFixed(2)}s ${where}: ${prop} jumps ${num(d)} in ${step} s, max ${max}`); break; }
      }
    }
    if (a.reaches) {
      const { prop, value, tol = noise(a.reaches.prop) } = a.reaches, v = val(samples.at(-1), prop);
      if (Math.abs(v - value) > tol) lines.push(`motion ${t1.toFixed(2)}s ${where}: ${prop} ends at ${num(v)}, expected ${value} ± ${tol}`);
    }
  }
  return lines;
}
