// Shared by tools/checks/p5-*.page.mjs (not a check itself: qa only loads *.page.mjs and *.py). install(page) defines window.__p5 in the film
// page: visible(el) → opacity product over the ancestors (0 when hidden or off-frame), leaves() → the visible text elements outside the
// captions and AI labels, [{ el, text, op, r }], with r the bounding box.
export async function install(p) {
  await p.evaluate(() => {
    const visible = (e) => {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return 0;
      let op = 1;
      for (let x = e; x && x.nodeType === 1; x = x.parentElement) {
        const s = getComputedStyle(x);
        if (s.display === 'none' || s.visibility === 'hidden') return 0;
        op *= Number(s.opacity);
      }
      return op;
    };
    const leaves = () => {
      const out = [], stage = document.getElementById('stage') || document.body;
      for (const e of stage.querySelectorAll('*')) {
        if (e.closest('.kit-subs, .kit-subrow, .kit-ai-label, script, style, svg')) continue;
        const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
        if (own.length < 2) continue;
        const op = visible(e);
        if (op > 0.05) out.push({ el: e, text: own, op, r: e.getBoundingClientRect() });
      }
      return out;
    };
    window.__p5 = { visible, leaves };
  });
}

// the times 0, step, 2·step … ≤ dur (capped at `max` samples by widening the step)
export const times = (dur, step, max = 400) => {
  step = Math.max(step, dur / max);
  const out = []; for (let t = 0; t <= dur + 1e-9; t += step) out.push(+t.toFixed(4));
  return { step, ts: out };
};
export const span = (a, b) => (b > a ? `${a.toFixed(2)}–${b.toFixed(2)}s` : `${a.toFixed(2)}s`);
export const safe = (name, fn) => async (page, ctx) => { try { return await fn(page, ctx); } catch (e) { return [`${name} check skipped: ${String((e && e.message) || e).split("\n")[0]}`]; } };
