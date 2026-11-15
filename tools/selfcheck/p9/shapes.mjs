// tools/p9-shapes.js: every KIT.shape builder returns a path whose real bounding box (getBBox in Chromium) is exactly the width x height it reports,
// with a centred transformOrigin; the film spins them about that origin so the shuffled-seek run covers them too.
export default { scripts: ["tools/p9-shapes.js"], dur: 4, film: `
const S2 = KIT.shape, T = window.T = { svgs: [] };
const defs = {
  rect: S2.rect({ width: 90, height: 50 }), roundRect: S2.rect({ width: 90, height: 50, cornerRadius: 12 }), circle: S2.circle({ radius: 30 }), ellipse: S2.ellipse({ rx: 40, ry: 20 }),
  triR: S2.triangle({ length: 60 }), triU: S2.triangle({ length: 60, direction: 'up', cornerRadius: 6 }), star: S2.star({ points: 5, innerRadius: 15, outerRadius: 35 }),
  starR: S2.star({ points: 6, innerRadius: 18, outerRadius: 35, cornerRadius: 4 }), hex: S2.polygon({ points: 6, radius: 32 }), pie: S2.pie({ radius: 30, progress: 0.3 }),
  heart: S2.heart({ size: 60 }), arrow: S2.arrow({ length: 90, headWidth: 50, headLength: 35, shaftWidth: 20 }), arrowD: S2.arrow({ length: 90, headWidth: 50, headLength: 35, shaftWidth: 20, direction: 'down' }),
  call: S2.callout({ width: 90, height: 50, cornerRadius: 10 }), callL: S2.callout({ width: 90, height: 50, direction: 'left' }), spark: S2.spark({ size: 50 }), spark2: S2.spark({ size: 50, pinch: 0.2 }),
};
T.defs = defs;
Object.keys(defs).forEach((k, i) => {
  const holder = KIT.el('div', '', S); KIT.css(holder, { left: 10 + (i % 6) * 104 + 'px', top: 10 + Math.floor(i / 6) * 110 + 'px', width: '100px', height: '100px' });
  const svg = S2.svg(holder, defs[k], { fill: '#36c' }); svg.style.position = 'absolute'; svg.style.left = (100 - defs[k].width) / 2 + 'px'; svg.style.top = (100 - defs[k].height) / 2 + 'px';
  svg.style.transformOrigin = defs[k].transformOrigin.split(' ').map((v) => v + 'px').join(' '); T.svgs.push(svg);
});
KIT.start({ dur: 4, render: (t) => { T.svgs.forEach((s, i) => { s.style.transform = 'rotate(' + (t * 90 * (i % 2 ? 1 : -1)) + 'deg)'; }); } });`,
  check: async (p) => {
    const bad = await p.evaluate(() => {
      const bad = [], T = window.T, keys = Object.keys(T.defs);
      keys.forEach((k, i) => {
        const d = T.defs[k], b = T.svgs[i].querySelector('path').getBBox(), [ox, oy] = d.transformOrigin.split(' ').map(Number);
        if (k !== 'pie' && !(Math.abs(b.x) < 0.05 && Math.abs(b.y) < 0.05 && Math.abs(b.width - d.width) < 0.05 && Math.abs(b.height - d.height) < 0.05)) bad.push(`${k}: bbox ${[b.x, b.y, b.width, b.height].map((v) => +v.toFixed(2))} vs ${d.width} x ${d.height}`);
        if (k === 'pie' && !(b.x >= -0.05 && b.y >= -0.05 && b.x + b.width <= d.width + 0.05 && b.y + b.height <= d.height + 0.05)) bad.push('pie leaves its box');
        if (!(Math.abs(ox - d.width / 2) < 0.01 && Math.abs(oy - d.height / 2) < 0.01)) bad.push(k + ': transformOrigin is not the centre');
      });
      const D = T.defs, near = (a, b) => Math.abs(a - b) < 0.01;
      if (!(near(D.triR.width, 60 * Math.sqrt(3) / 2) && near(D.triR.height, 60))) bad.push('triangle right: ' + D.triR.width + 'x' + D.triR.height);
      if (!(near(D.triU.height, 60 * Math.sqrt(3) / 2) || D.triU.height < 52)) bad.push('triangle up rounded: ' + D.triU.height);
      if (!(near(D.star.width, 2 * 35 * Math.cos(Math.PI / 10)))) bad.push('star width ' + D.star.width);
      if (!(D.circle.width === 60 && D.circle.height === 60 && D.pie.width === 60)) bad.push('circle / pie box');
      if (!(D.call.height === 80 && D.call.width === 90 && D.callL.width === 120)) bad.push('callout sizes include the pointer: ' + [D.call.width, D.call.height, D.callL.width]);
      if (!(D.arrow.width === 90 && D.arrow.height === 50 && D.arrowD.width === 50 && D.arrowD.height === 90)) bad.push('arrow sizes: ' + [D.arrow.width, D.arrow.height, D.arrowD.width, D.arrowD.height]);
      for (const k of ['rect', 'circle', 'star', 'heart']) if (!/^M/.test(D[k].path)) bad.push(k + ' path does not start with M');
      for (const [what, fn] of [['rect', () => KIT.shape.rect({ width: 0, height: 5 })], ['star', () => KIT.shape.star({ points: 2, innerRadius: 1, outerRadius: 2 })], ['arrow', () => KIT.shape.arrow({ length: 50, headLength: 80 })], ['tri', () => KIT.shape.triangle({ length: 5, direction: 'x' })]]) {
        try { fn(); bad.push(what + ': a bad argument was accepted'); } catch (e) { /* refused */ }
      }
      return bad;
    });
    if (bad.length) throw new Error('shapes check:\n  ' + bad.join('\n  '));
  } };
