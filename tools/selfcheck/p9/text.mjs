// tools/p9-text.js: measureText, fitText, fitTextOnNLines, fillTextBox, measureDom (the @remotion/layout-utils shapes). check() measures the
// results back with the same canvas; the film sets its text size from them, so the shuffled-seek run covers a fitted layout in both renderers.
export default { scripts: ["tools/p9-text.js"], dur: 3, film: `
const ff = 'Arial, Helvetica, sans-serif', fit = KIT.fitText({ text: 'Fit to width', withinWidth: 500, fontFamily: ff, fontWeight: 700 });
const nl = KIT.fitTextOnNLines({ text: 'The quick brown fox jumps over the lazy dog again and again', maxBoxWidth: 300, maxLines: 3, fontFamily: ff, maxFontSize: 80 });
const a = KIT.el('div', '', S, 'Fit to width'), b = KIT.el('div', '', S, nl.lines.join('<br>')), c = KIT.el('div', '', S, 'box');
KIT.css(a, { left: '20px', top: '20px', whiteSpace: 'nowrap', font: '700 ' + fit.fontSize + 'px ' + ff }); KIT.css(b, { left: '20px', top: '110px', width: '300px', font: '400 ' + nl.fontSize + 'px/1.2 ' + ff });
KIT.css(c, { left: '400px', top: '150px', width: '120px', height: '60px', background: '#e0a030', fontSize: '20px' }); window.T = { fit, nl, ff };
KIT.start({ dur: 3, render: (t) => { c.style.transform = 'translate(' + 60 * t + 'px,' + 40 * t + 'px) scale(' + (1 + 0.2 * t) + ')'; } });`,
  check: async (p) => {
    const bad = await p.evaluate(() => {
      const K = KIT, bad = [], { fit, nl, ff } = window.T, is = (what, ok, got) => { if (!ok) bad.push(what + ': ' + JSON.stringify(got)); };
      const w = (o) => K.measureText(o).width;
      is('fitText: one line exactly as wide as asked (±0.5 %)', Math.abs(w({ text: 'Fit to width', fontFamily: ff, fontWeight: 700, fontSize: fit.fontSize }) - 500) < 2.5, fit);
      const em = K.fitText({ text: 'Spaced out', withinWidth: 400, fontFamily: ff, letterSpacing: '0.1em' }), px = K.fitText({ text: 'Spaced out', withinWidth: 400, fontFamily: ff, letterSpacing: 6 });
      is('fitText with em / px letter spacing hits the width', Math.abs(w({ text: 'Spaced out', fontFamily: ff, letterSpacing: '0.1em', fontSize: em.fontSize }) - 400) < 2 && Math.abs(w({ text: 'Spaced out', fontFamily: ff, letterSpacing: 6, fontSize: px.fontSize }) - 400) < 2, [em, px]);
      is('measureText grows with the size and with the text', w({ text: 'abc', fontSize: 20 }) < w({ text: 'abc', fontSize: 40 }) && w({ text: 'abc', fontSize: 20 }) < w({ text: 'abcd', fontSize: 20 }) && K.measureText({ text: 'x', fontSize: 50 }).height === 60, 0);
      is('fitTextOnNLines: fits 3 lines of 300 px', nl.fits && nl.lines.length <= 3 && Number.isInteger(nl.fontSize), nl);
      const next = K.fitTextOnNLines({ text: 'The quick brown fox jumps over the lazy dog again and again', maxBoxWidth: 300, maxLines: 3, fontFamily: ff, maxFontSize: nl.fontSize + 1 });
      is('fitTextOnNLines: one px bigger would not fit (or hit the cap)', nl.fontSize === 80 || next.fontSize === nl.fontSize, [nl.fontSize, next.fontSize]);
      is('fitTextOnNLines: one line only is smaller than three', K.fitTextOnNLines({ text: nl.lines.join(' '), maxBoxWidth: 300, maxLines: 1, fontFamily: ff, maxFontSize: 80 }).fontSize < nl.fontSize, 0);
      const box = K.fillTextBox({ maxBoxWidth: 200, maxLines: 2 }), o = { fontFamily: ff, fontSize: 20 };
      const r1 = box.add({ ...o, text: 'Hello brave' }), r2 = box.add({ ...o, text: ' new world of words' }), r3 = box.add({ ...o, text: ' and many many more words here that cannot fit' });
      is('fillTextBox: the first run fits on one line, a longer run wraps, the overflowing run is refused', !r1.exceedsBox && !r1.newLine && !r2.exceedsBox && r2.newLine && r3.exceedsBox, [r1, r2, r3]);
      is('fillTextBox: a word wider than the box never fits', K.fillTextBox({ maxBoxWidth: 30, maxLines: 5 }).add({ ...o, text: 'extraordinary' }).exceedsBox, 0);
      window.render(1); const m = K.measureDom('#stage > div')[2];
      is('measureDom: stage px of the third box after render(1) (moved 60/40, scaled 1.2 about its centre)', m && Math.abs(m.width - 144) < 0.5 && Math.abs(m.height - 72) < 0.5 && Math.abs(m.x - 448) < 0.5 && Math.abs(m.y - 184) < 0.5, m);
      try { K.fitText({ text: 'x', withinWidth: 0 }); bad.push('withinWidth 0 accepted'); } catch (e) { /* refused */ }
      return bad;
    });
    if (bad.length) throw new Error('text check:\n  ' + bad.join('\n  '));
  } };
