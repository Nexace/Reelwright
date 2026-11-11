// KIT.path fixture: draw-on, morph, morphMany, follow along a fromPoints path, slice; check() asserts the pure parts
export default { scripts: ["vendor/paths/paths.js", "tools/path.js"], dur: 4, film: `
const NS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(NS, 'svg');
svg.setAttribute('width', 640); svg.setAttribute('height', 360);
Object.assign(svg.style, { position: 'absolute', left: '0', top: '0', overflow: 'visible' });
S.appendChild(svg);
const mk = (style, d) => { const e = document.createElementNS(NS, 'path'); Object.assign(e.style, { fill: 'none', strokeLinecap: 'round' }, style); if (d) e.setAttribute('d', d); svg.appendChild(e); return e; };
const wave = KIT.path.fromPoints([[30, 120], [130, 40], [230, 120], [330, 40], [430, 120]]);
const drawn = mk({ stroke: '#36c', strokeWidth: 6 }, 'M30 20 C130 -10 230 50 330 20');
const guide = mk({ stroke: '#bbb', strokeWidth: 2 }, wave);
const slice = mk({ stroke: '#e0a030', strokeWidth: 8 });
const morph = mk({ stroke: '#2f9e6b', strokeWidth: 6 });
const many = mk({ stroke: '#e33', strokeWidth: 6 });
const dot = KIT.el('div', 'dot', S), box = KIT.el('div', 'box', S);
box.style.width = box.style.height = '24px';
const P = KIT.path(wave), tri = 'M480 40 L600 40 L540 120 Z', sq = 'M480 40 L600 40 L600 120 L480 120 Z';
const shapes = ['M30 300 L130 220 L230 300', 'M30 220 L130 300 L230 220', 'M30 260 C80 200 180 320 230 260'];
KIT.start({ dur: 4, render: (t) => {
  const p = t / 4;
  KIT.path.draw(drawn, p);
  slice.setAttribute('d', P.slice(p * 0.5, 0.25 + p * 0.75));
  morph.setAttribute('d', KIT.path.morph(tri, sq, p));
  many.setAttribute('d', KIT.path.morphMany(shapes, p));
  KIT.path.follow(dot, P, p);
  KIT.path.follow(box, wave, 1 - p, { rotate: false, offset: [0, 40] });
} });`,
  check: async (page) => {
    const r = await page.evaluate(() => {
      const out = [], T = (name, ok) => { if (!ok) out.push(name); };
      const near = (a, b, e = 1e-3) => Math.abs(a - b) <= e, K = window.KIT, R = K.path.lib;
      const line = K.path('M0 0 L300 0'), vert = K.path('M0 0 L0 100'), curve = K.path('M10 20 C100 -50 200 90 300 20');
      T('len of M0 0 L300 0 is 300', near(line.len, 300));
      T('at(0) is the start', near(curve.at(0).x, 10) && near(curve.at(0).y, 20));
      T('at(1) is the end', near(curve.at(1).x, 300, 0.01) && near(curve.at(1).y, 20, 0.01));
      T('at clamps', near(line.at(2).x, 300) && near(line.at(-1).x, 0));
      T('horizontal angle is 0', near(line.at(0.5).angle, 0));
      T('vertical angle is +-90', near(Math.abs(vert.at(0.5).angle), 90));
      T('box', near(line.box.x1, 0) && near(line.box.x2, 300));
      const sl = K.path(line.slice(0.25, 0.75));
      T('slice is the middle half', near(sl.len, 150) && near(sl.at(0).x, 75) && near(sl.at(1).x, 225));
      const norm = (d) => R.normalizePath(d);
      T('morph(0) is a', norm(K.path.morph('M0 0 L10 0 L10 10 Z', 'M5 5 L20 5 L20 30 Z', 0)) === norm('M0 0 L10 0 L10 10 Z'));
      T('morph(1) is b', norm(K.path.morph('M0 0 L10 0 L10 10 Z', 'M5 5 L20 5 L20 30 Z', 1)) === norm('M5 5 L20 5 L20 30 Z'));
      T('morph clamps', K.path.morph('M0 0 L1 1', 'M2 2 L3 3', 5) === K.path.morph('M2 2 L3 3', 'M2 2 L3 3', 1) || norm(K.path.morph('M0 0 L1 1', 'M2 2 L3 3', 5)) === norm('M2 2 L3 3'));
      const ds = ['M0 0 L10 0', 'M0 10 L10 10', 'M0 20 L10 20'];
      T('morphMany ends', norm(K.path.morphMany(ds, 0)) === norm(ds[0]) && norm(K.path.morphMany(ds, 1)) === norm(ds[2]) && norm(K.path.morphMany(ds, 0.5)) === norm(ds[1]));
      const pts = [[10, 10], [60, 80], [120, 20], [200, 90]];
      const hits = (d) => { const ins = R.parsePath(d).filter((i) => i.type !== 'Z'); return pts.every((q) => ins.some((i) => near(i.x, q[0], 0.01) && near(i.y, q[1], 0.01))); };
      T('fromPoints passes through every point', hits(K.path.fromPoints(pts)) && hits(K.path.fromPoints(pts, { closed: true })));
      T('closed ends with Z', /Z$/.test(K.path.fromPoints(pts, { closed: true })));
      const st = R.parsePath(K.path.fromPoints(pts, { curviness: 0 }));
      T('curviness 0 is straight', st.slice(1).every((i) => i.type === 'L') && near(K.path(K.path.fromPoints(pts, { curviness: 0 })).len, pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0), 0.01));
      const ms = K.path('M0 0 L100 0 M200 0 L300 0').slice(0.6, 0.9), mp = K.path(ms);   // review: per-subpath slice
      T('multi-subpath slice', near(mp.at(0).x, 220, 0.01) && near(mp.at(1).x, 280, 0.01) && near(mp.len, 60, 0.01));
      return out;
    });
    if (r.length) throw new Error('KIT.path checks failed: ' + r.join('; '));
  } };
