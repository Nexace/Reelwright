// tools/timing.js (posterize, string outputs, series), tools/styles.js (interpolateStyles, makeTransform, crop), tools/text-box.js (roundedTextBox).
// The film moves a stepped box, a style-interpolated box and a series dot from t; a cropped box and a rounded text box are laid out once. check() asserts exact numbers
// and pixels in pvk; the shuffled-seek run (both renderers) proves the animated parts are pure functions of t.
import { px, at, near } from "./_helpers.js";

export default { scripts: ["tools/timing.js", "tools/styles.js", "tools/text-box.js"], dur: 6, film: `
const el = (cls, css, html) => { const e = KIT.el('div', cls, S, html || ''); KIT.css(e, css); return e; };
const box = el('box', { top: '10px' }), rot = el('box', { left: '20px', top: '200px' }), dot = el('dot', { top: '320px' });
const cr = el('', { left: '140px', top: '200px', width: '80px', height: '80px', background: '#e33' }); KIT.crop(cr, { left: 0.5, top: 0.25 });
const tx = el('', { left: '300px', top: '120px', width: '300px', color: '#fff', font: '600 28px/1.4 Arial, sans-serif' }, 'Highlighted words that wrap over several lines');
const tb = KIT.roundedTextBox(tx, { radius: 14, pad: { x: 10, y: 6 }, color: '#36c' });
const ser = KIT.series([{ dur: 2 }, { dur: 2, offset: 0.5 }, { dur: 1, offset: -0.5 }]);
window.T = { tb, ser };
KIT.start({ dur: 6, render: (t) => {
  box.style.left = KIT.interpolate(t, [0, 6], [0, 400], { posterize: 4 }) + 'px';
  KIT.css(rot, KIT.interpolateStyles(t, [0, 3, 6], [
    { transform: [{ rotate: 0 }, { scale: 1 }], backgroundColor: '#3366cc', borderRadius: '0px 0px' },
    { transform: [{ rotate: 90 }, { scale: 1.2 }], backgroundColor: '#e0a030', borderRadius: '40px 10px' },
    { transform: [{ rotate: 180 }, { scale: 1 }], backgroundColor: '#2f9e6b', borderRadius: '0px 0px' }]));
  const a = ser.active(t); dot.style.left = a.length ? 20 + a[a.length - 1].index * 150 + a[a.length - 1].local * 60 + 'px' : '-100px';
} });`,
  check: async (p) => {
    const bad = await p.evaluate(() => {
      const K = KIT, bad = [], eq = (what, got, want, e = 1e-9) => { if (!(Math.abs(got - want) <= e)) bad.push(`${what}: got ${got}, want ${want}`); };
      const is = (what, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };
      const throws = (what, fn) => { try { fn(); bad.push(what + ': accepted'); } catch (e) { /* refused */ } };
      // posterize
      eq('posterize steps down', K.posterize(0.49, 4), 0.25); eq('posterize on a frame', K.posterize(0.5, 4), 0.5); eq('posterize 0.75', K.posterize(0.75, 4), 0.75);
      eq('interpolate posterize', K.interpolate(0.59, [0, 1], [0, 100], { posterize: 5 }), 40); eq('interpolate posterize on a frame', K.interpolate(0.6, [0, 1], [0, 100], { posterize: 5 }), 60);
      is('posterize reaches string outputs', K.interpolate(0.59, [0, 1], ['0deg', '100deg'], { posterize: 5 }), '40deg');
      throws('posterize fps 0', () => K.posterize(1, 0));
      // string outputs
      is('deg', K.interpolate(0.5, [0, 1], ['0deg', '90deg']), '45deg');
      is('two numbers', K.interpolate(0.5, [0, 1], ['0px 0px', '10px 20px']), '5px 10px');
      is('percent origin', K.interpolate(0.25, [0, 1], ['0% 100%', '100% 0%']), '25% 75%');
      is('font weight as strings', K.interpolate(0.5, [0, 1], ['400', '700']), '550');
      is('transform list', K.interpolate(0.25, [0, 1], ['translateX(0px) scale(1)', 'translateX(100px) scale(2)']), 'translateX(25px) scale(1.25)');
      is('negative and decimal', K.interpolate(0.5, [0, 1], ['-10.5px', '10.5px']), '0px');
      is('3 keys', K.interpolate(1.5, [0, 1, 2], ['0deg', '10deg', '30deg']), '20deg');
      is('clamp', K.interpolate(2, [0, 1], ['0deg', '90deg'], { right: 'clamp' }), '90deg'); is('extend', K.interpolate(2, [0, 1], ['0deg', '90deg']), '180deg');
      is('easing', K.interpolate(0.5, [0, 1], ['0px', '8px'], { easing: (x) => x * x }), '2px');
      is('hex colours (rgb)', K.interpolate(0.5, [0, 1], ['#ff0000', '#0000ff']), 'rgba(128, 0, 128, 1)');
      is('rgb() colours', K.interpolate(0, [0, 1], ['rgb(255, 0, 0)', 'rgb(0, 0, 255)']), 'rgba(255, 0, 0, 1)');
      is('named colours', K.interpolate(1, [0, 1], ['red', 'blue']), 'rgba(0, 0, 255, 1)');
      throws('different shapes', () => K.interpolate(0.5, [0, 1], ['10px', '20%'])); throws('different counts', () => K.interpolate(0.5, [0, 1], ['10px', '20px 5px']));
      throws('non-ascending input, string outputs', () => K.interpolate(0.5, [1, 1], ['0deg', '90deg']));
      is('numbers still numbers', K.interpolate(0.5, [0, 1], [0, 10]), 5);
      // series
      const s = K.series([{ dur: 2 }, { dur: 2, offset: 0.5 }, { dur: 1, offset: -0.5 }]);
      is('series starts', s.scenes.map((x) => x.start), [0, 2.5, 4]); is('series ends', s.scenes.map((x) => x.end), [2, 4.5, 5]); eq('series total', s.total, 5);
      is('series active in a gap', s.active(2.25), []); is('series active in an overlap', s.active(4.25), [{ index: 1, local: 1.75 }, { index: 2, local: 0.25 }]);
      eq('series local time', s.scenes[1].seq(3), 0.5);
      eq('series passes seq options through', K.series([{ dur: 1 }, { dur: 2, trim: 5, rate: 2 }]).scenes[1].seq(1.5), 6);
      throws('infinite scene in the middle', () => K.series([{ dur: Infinity }, { dur: 1 }])); throws('starts before 0', () => K.series([{ dur: 1, offset: -1 }])); throws('dur 0', () => K.series([{ dur: 0 }]));
      eq('infinite last scene', K.series([{ dur: 1 }, { dur: Infinity }]).scenes[1].seq(100), 99);
      // makeTransform / interpolateStyles
      is('makeTransform', K.makeTransform([{ rotate: 45 }, { translateX: 10 }, { scale: 1.5 }, { translate: [10, 20] }, { rotate: '0.5turn' }]), 'rotate(45deg) translateX(10px) scale(1.5) translate(10px, 20px) rotate(0.5turn)');
      is('interpolateStyles', K.interpolateStyles(0.5, [0, 1], [{ opacity: 0, left: '0px', transform: [{ rotate: 0 }] }, { opacity: 1, left: '100px', transform: [{ rotate: 90 }] }]), { opacity: 0.5, left: '50px', transform: 'rotate(45deg)' });
      is('interpolateStyles, 3 keys and a colour', K.interpolateStyles(1.5, [0, 1, 2], [{ c: '#000000' }, { c: '#ff0000' }, { c: '#ff0000' }]), { c: 'rgba(255, 0, 0, 1)' });
      throws('interpolateStyles with different keys', () => K.interpolateStyles(0, [0, 1], [{ a: 0 }, { b: 1 }])); throws('interpolateStyles with too few styles', () => K.interpolateStyles(0, [0, 1], [{ a: 0 }]));
      // crop
      const c = document.createElement('div'); is('crop value', K.crop(c, { left: 0.25, top: 0.1 }), 'inset(10% 0% 0% 25%)'); is('crop sets clip-path', c.style.clipPath, 'inset(10% 0% 0% 25%)');
      throws('crop > 1', () => K.crop(c, { left: 1.5 })); throws('crop left + right > 1', () => K.crop(c, { left: 0.6, right: 0.6 }));
      // roundedTextBox outline (pure)
      const ln = [{ x: 0, y: 0, width: 100, height: 20 }, { x: 0, y: 20, width: 60, height: 20 }];
      is('outline points (L shape, collinear and duplicate points gone)', K.roundedTextBox.outline(ln, { radius: 0, pad: { x: 10, y: 5 } }).points, [[110, -5], [110, 20], [70, 20], [70, 45], [-10, 45], [-10, -5]]);
      is('outline path', K.roundedTextBox.outline(ln, { radius: 6, pad: { x: 10, y: 5 } }).d, 'M 104 -5 Q 110 -5 110 1 L 110 14 Q 110 20 104 20 L 76 20 Q 70 20 70 26 L 70 39 Q 70 45 64 45 L -4 45 Q -10 45 -10 39 L -10 1 Q -10 -5 -4 -5 L 104 -5 Z');
      is('a small step shrinks the radius, not the shape', K.roundedTextBox.outline([{ x: 0, y: 0, width: 100, height: 20 }, { x: 0, y: 20, width: 96, height: 20 }], { radius: 12, pad: 0 }).d.includes('Q 100 20 98 20'), true);
      is('one line is a rounded rectangle', K.roundedTextBox.outline([{ x: 0, y: 0, width: 50, height: 10 }], { radius: 2, pad: 0 }).points, [[50, 0], [50, 10], [0, 10], [0, 0]]);
      throws('outline without lines', () => K.roundedTextBox.outline([]));
      // roundedTextBox measured (browser layout)
      const tb = window.T.tb;
      if (tb.lines.length < 2) bad.push('the text did not wrap: ' + tb.lines.length + ' line(s)');
      if (!(tb.svg.nextSibling && tb.svg.nextSibling.textContent.startsWith('Highlighted'))) bad.push('the svg is not just before the text');
      eq('first line starts at the text box', tb.lines[0].x, 300, 0.5); if (!(tb.lines.every((l) => l.width > 20 && l.width <= 300.5))) bad.push('line widths: ' + JSON.stringify(tb.lines));
      return bad;
    });
    if (bad.length) throw new Error('helpers: ' + bad.join('\n  '));
    await at(p, 0);
    // crop: the left half of the red box and its top quarter are gone
    const bg = await px(p, 150, 210), cut = await px(p, 150, 260), red = await px(p, 210, 260);
    if (!(near(bg[0], 246, 3) && near(cut[0], 246, 3) && near(red[0], 238, 3) && near(red[1], 51, 3))) throw new Error('crop pixels: ' + JSON.stringify({ bg, cut, red }));
    // rounded text box: inside the first line is blue, the very corner of the outline is not (it is rounded)
    const { lines } = await p.evaluate(() => window.T.tb), l = lines[0].x - 10, t0 = lines[0].y - 6;
    const inside = await px(p, Math.round(l + 4), Math.round(t0 + 14)), corner = await px(p, Math.round(l + 2), Math.round(t0 + 2));
    if (!(near(inside[2], 204, 6) && near(inside[0], 51, 6))) throw new Error('rounded text box: inside the box is ' + JSON.stringify(inside));
    if (!(near(corner[0], 246, 6) && near(corner[2], 239, 6))) throw new Error('rounded text box: the corner is filled, ' + JSON.stringify(corner));
  },
};
