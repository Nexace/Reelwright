// tools/direct.js + the motion-craft additions to tools/timing.js, in a film: a budgeted entrance (KIT.direct), a wind-up
// (KIT.anticipate), stepped time (KIT.step / KIT.hold), a spring by feel and a preset (KIT.spring), a secondary layer
// (KIT.direct.hierarchy) and a perceptual scale (output: 'perceptual-scale'). The shuffled-seek run proves every one of them is a
// pure function of t in pvk and HyperFrames; check() asserts the numbers in the pvk page.
export default { scripts: ["tools/timing.js", "tools/velocity.js", "tools/direct.js"], dur: 4, film: `
const el = (cls, css) => { const e = KIT.el('div', cls, S); KIT.css(e, css); return e; };
const cues = [{ id: 'shell', role: 'shell' }, { id: 'body', role: 'body' }, { id: 'kpi', role: 'primary' }, { id: 'viz', role: 'viz' }];
const delay = window.DELAY = KIT.direct(cues, { order: ['shell', 'body', 'primary', 'viz'], stagger: 0.02, total: 0.5, maxConcurrent: 2 });
const shell = el('box a', { top: '30px' }), body = el('box b', { top: '120px' }), kpi = el('box c', { top: '210px' }), viz = el('box', { top: '210px' });
const plop = KIT.spring('plop', 0, 260), swing = KIT.spring({ visualDuration: 0.6, bounce: 0.5, from: 0, to: 200 });
const step = KIT.step(12);
const hero = el('dot', { top: '60px', left: '20px' }), follower = el('dot', { top: '80px', left: '20px' });
const heroX = (t) => 260 * KIT.seg(t, 0.6, 2.6);
const follow = KIT.direct.hierarchy(heroX, ['tail']);
const grow = el('box c', { top: '300px', left: '400px', width: '60px', height: '60px' });
KIT.start({ dur: 4, render: (t) => {
  shell.style.left = 20 + plop(t - delay.shell) + 'px';
  body.style.left = 20 + plop(t - delay.body) + 'px';
  kpi.style.left = 20 + swing(t - delay.kpi) + 'px';
  viz.style.left = 20 + step(KIT.hold(t, 1.2, 2.4)) * 120 + 'px';          // on twos, inside a hold window
  hero.style.left = 20 + heroX(t) + 'px';
  follower.style.left = 20 + follow.tail(t) + 'px';
  const p = KIT.interpolate(t, [2.4, 3.6], [0, 1], { output: 'perceptual-scale', right: 'clamp' });
  grow.style.transform = 'scale(' + p + ')';
  kpi.style.opacity = String(0.4 + 0.6 * (1 + KIT.anticipate(t, 2.4) / 0.06));   // a wind-up before the next beat
} });`,
  check: async (p) => {
    const bad = await p.evaluate(() => {
      const K = KIT, bad = [], is = (what, ok, got) => { if (!ok) bad.push(what + ': ' + JSON.stringify(got)); };
      const eq = (what, got, want, e = 1e-9) => { if (!(Math.abs(got - want) <= e)) bad.push(`${what}: got ${got}, want ${want}`); };
      is('the budget is the documented one', JSON.stringify(window.DELAY) === JSON.stringify({ shell: 0, body: 0, kpi: 0.02, viz: 0.02 }), window.DELAY);
      is('anticipate is a wind-up before its t0 and 0 at it', K.anticipate(2.36, 2.4) < 0 && K.anticipate(2.4, 2.4) === 0 && K.anticipate(2.3, 2.4) === 0, [K.anticipate(2.36, 2.4), K.anticipate(2.4, 2.4)]);
      is('step holds 12 poses a second', K.step(12)(0.3) === K.step(12)(0.3 + 1 / 60) && K.step(12)(0.3) !== K.step(12)(0.3 + 1 / 12), K.step(12)(0.3));
      is('hold clamps outside its window', K.hold(0, 1.2, 2.4) === 1.2 && K.hold(9, 1.2, 2.4) === 2.4, 0);
      const sp = K.spring({ visualDuration: 0.6, bounce: 0.5, from: 0, to: 1 });
      eq('a spring by feel is 0.1 % out at visualDuration', Math.abs(sp(0.6) - 1) <= 0.002 ? 1 : 0, 1);
      eq('the plop preset is the Motion Canvas one', K.spring('plop', 0, 1)(3) > 0.999 ? 1 : 0, 1);
      eq('perceptual scale at the middle is √0.5', K.interpolate(0.5, [0, 1], [0, 1], { output: 'perceptual-scale' }), Math.sqrt(0.5), 1e-12);
      const f = K.direct.hierarchy((t) => t, ['a']);
      eq('a follower is 35 % of the hero, a frame behind', f.a(2), 0.35 * (2 - 1 / 60), 3e-4);
      return bad;
    });
    if (bad.length) throw new Error('motion-craft fixture:\n  ' + bad.join('\n  '));
  } };
