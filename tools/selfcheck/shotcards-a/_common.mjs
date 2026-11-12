// Shared film prelude for the shotcards-a fixtures (files starting with _ are not fixtures). `bad` collects check failures inside the page.
export const PRE = `
const el = (cls, parent, css, html = '') => { const e = KIT.el('div', cls, parent, html); KIT.css(e, css); return e; };
const scene3 = (parent) => { const s = el('scene', parent, {}); el('box a', s, { left: '120px', top: '90px' }); el('box b', s, { left: '280px', top: '140px' });
  el('box c', s, { left: '440px', top: '190px' }); el('', s, { left: '150px', top: '270px' }, 'Reelwright'); return s; };
window.bad = [];
window.fin = (v, path) => { if (typeof v === 'number' && !Number.isFinite(v)) window.bad.push('NaN at ' + path); else if (v && typeof v === 'object') for (const k in v) window.fin(v[k], path + '.' + k); };
window.holds = (name, fn, t0, t1) => { const J = JSON.stringify;
  if (J(fn(t0 - 1)) !== J(fn(t0))) window.bad.push(name + ': not holding its start'); if (J(fn(t1)) !== J(fn(t1 + 1))) window.bad.push(name + ': not holding its end');
  if (J(fn(t0)) === J(fn(t1))) window.bad.push(name + ': does not move'); };
window.scan = (name, fn, a = -1, b = 10) => { for (let i = 0; i <= 200; i++) { const t = a + (b - a) * i / 200; window.fin(fn(t), name + '(' + t + ')'); } };
window.pure = (ts) => { const snap = () => KIT.stage.innerHTML;   // render(t) must give the same DOM whatever was rendered before
  for (const t of ts) { window.render(t); const a = snap(); window.render(ts[0] + 0.0137); window.render(t); if (snap() !== a) window.bad.push('render(' + t + ') is not a pure function of t'); } };
`;
export const verdict = (page, what) => page.evaluate(() => window.bad.slice(0, 20)).then((b) => { if (b.length) throw new Error(what + " check:\n  " + b.join("\n  ")); });
