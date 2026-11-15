// tools/p9-props.js: KIT.props() = declared variable defaults + overrides + window.PROPS, frozen; the bars of the film come from it.
export default { scripts: ["tools/variables.js", "tools/p9-props.js"], dur: 3, film: `
window.__hfDeclared = [{ id: 'bars', type: 'number', default: 3 }, { id: 'accent', type: 'color', default: '#2f9e6b' }, { id: 'title', type: 'string', default: 'Hi' }];
window.__hfVariables = { bars: 5 }; window.PROPS = { title: 'From PROPS' };
const P = KIT.props(); window.T = { P };
for (let i = 0; i < P.bars; i++) { const b = KIT.el('div', 'box', S); KIT.css(b, { left: 20 + i * 100 + 'px', top: '100px', background: P.accent }); }
KIT.start({ dur: 3, render: (t) => { S.style.opacity = 0.6 + 0.4 * KIT.seg(t, 0, 3); } });`,
  check: async (p) => {
    const bad = await p.evaluate(() => {
      const bad = [], is = (w, ok, g) => { if (!ok) bad.push(w + ': ' + JSON.stringify(g)); }, P = KIT.props();
      is('override beats default, default fills the rest, PROPS wins last', P.bars === 5 && P.accent === '#2f9e6b' && P.title === 'From PROPS', P);
      is('single key and fallback', KIT.props('bars') === 5 && KIT.props('nope', 'x') === 'x', 0);
      is('frozen copy: a film cannot change the props', Object.isFrozen(P) && KIT.props() !== P, 0);
      is('the film drew 5 bars', document.querySelectorAll('#stage > .box').length === 5, document.querySelectorAll('#stage > .box').length);
      return bad;
    });
    if (bad.length) throw new Error('props check:\n  ' + bad.join('\n  '));
  } };
