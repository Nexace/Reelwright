// harness smoke fixture: a box moving with KIT.lerp (delete once the module fixtures exist)
export default { scripts: [], dur: 2, film: `
const b = KIT.el('div', 'box', S);
KIT.start({ dur: 2, render: (t) => KIT.css(b, { transform: 'translate(' + KIT.lerp(20, 500, t / 2) + 'px, 140px)' }) });`,
  check: async (p) => { const ok = await p.evaluate(() => typeof window.render); if (ok !== 'function') throw new Error('no render'); } };
