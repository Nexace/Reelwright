// tools/shots2.js: tour, graze, planes, explode, bulletTime, rackFocus, steepTilt (+ ghosts, dof band), tiltReveal, tabletopDrop,
// droneDive sequenced over 8 s so the 12 samples land in most windows; check() asserts holds, tour poses, two clocks, no NaN
export default { scripts: ["tools/shots.js", "tools/shots2.js"], dur: 8, film: `
const H = KIT.shot, el = (cls, parent, css, html = '') => { const e = KIT.el('div', cls, parent, html); KIT.css(e, css); return e; };
const scene = (parent) => {
  const s = el('scene', parent, {});
  el('box a', s, { left: '120px', top: '90px' }); el('box b', s, { left: '280px', top: '140px' }); el('box c', s, { left: '440px', top: '190px' });
  el('', s, { left: '150px', top: '270px' }, 'Reelwright');
  return s;
};
// main scene (+ two ghost copies behind it for the steep-tilt glide)
const ghosts = [scene(S), scene(S)], main = scene(S), dot = el('dot', main, { left: '0px', top: '40px' });
// three depth planes
const pg = el('scene', S, {}), back = el('scene', pg, {}), mid = el('scene', pg, {}), front = el('scene', pg, {});
for (let i = 0; i < 6; i++) el('dot', back, { left: 40 + i * 110 + 'px', top: '60px' });
el('box b', mid, { left: '280px', top: '140px' }, '');
el('box c', front, { left: '60px', top: '230px', width: '140px' });
// exploded stack
const eg = el('scene', S, {}), stack = el('', eg, { left: '220px', top: '80px', width: '200px', height: '200px' });
const parts = ['a', 'b', 'c'].map((c) => el('box ' + c, stack, { left: '0px', top: '0px', width: '200px', height: '200px', opacity: 0.85 }));
// rack focus pair
const rg = el('scene', S, {}), near = el('box a', rg, { left: '90px', top: '120px', width: '160px', height: '160px' }),
  far = el('', rg, { left: '330px', top: '150px' }, 'far text');
const dofEl = el('scene', S, {});

const T = window.T = {};
T.tour = H.tour([{ t: 0, state: {} }, { t: 0.6, state: { z: 1.5, x: 160, y: 130, ry: 12 } }, { t: 1.2, state: { z: 1.2, x: 480, y: 230, rz: -4 }, ease: 'power2.inOut' }]);
T.graze = H.graze({ t0: 1.2, t1: 1.5 });
T.planesCam = H.tour([{ t: 1.5, state: {} }, { t: 2.6, state: { z: 1.6, x: 380 } }]);
T.planes = H.planes([{ el: back, z: 3 }, { el: mid, z: 1 }, { el: front, z: 0.8 }], T.planesCam);
T.explode = H.explode(parts, { el: stack, t0: 2.65, t1: 3.5 });
T.bt = H.bulletTime({ t0: 3.8, t1: 4.6 });
T.rack = H.rackFocus(near, far, { t0: 4.9, t1: 5.5 });
T.steep = H.steepTilt({ t0: 5.6, t1: 6.4, ghosts: 2 });
T.tilt = H.tiltReveal({ t0: 6.4, t1: 7.0 });
T.drop = H.tabletopDrop({ t0: 7.0, t1: 7.4 });
T.dive = H.droneDive({ t0: 7.4, t1: 7.95 });
T.par = H.parallax([{ el: back }, { el: mid }, { el: front }], (t) => ({ x: 0, y: 0 }));
const track = H.track([{ at: 0, shot: T.tour }, { at: 1.2, shot: T.graze }, { at: 3.6, shot: T.bt.cam }, { at: 5.6, shot: T.steep },
  { at: 6.4, shot: T.tilt }, { at: 7.0, shot: T.drop }, { at: 7.4, shot: T.dive }]);
const inMain = (t) => t < 1.5 || (t >= 3.6 && t < 4.8) || t >= 5.6;

KIT.start({ dur: 8, render: (t) => {
  KIT.show(main, inMain(t) ? 1 : 0); KIT.show(pg, t >= 1.5 && t < 2.6 ? 1 : 0); KIT.show(eg, t >= 2.6 && t < 3.6 ? 1 : 0); KIT.show(rg, t >= 4.8 && t < 5.6 ? 1 : 0);
  KIT.shoot(main, track(t));
  dot.style.transform = 'translateX(' + (60 + 140 * (T.bt.world(t) - 3.2)).toFixed(3) + 'px)';
  T.planes(t); T.explode(t); T.rack(t);
  const g = T.steep.ghosts(t), on = t >= 5.6 && t < 6.4;
  ghosts.forEach((e, i) => { KIT.shoot(e, g[i].state); KIT.show(e, on ? g[i].opacity : 0); });
  KIT.css(dofEl, H.dof({ center: KIT.lerp(0.2, 0.8, KIT.seg(t, 5.6, 6.4)) })); KIT.show(dofEl, on ? 1 : 0);
} });`,
  check: async (p) => {
    const errs = await p.evaluate(() => {
      const T = window.T, J = JSON.stringify, bad = [];
      const holds = (name, fn, t0, t1) => {
        if (J(fn(t0 - 1)) !== J(fn(t0))) bad.push(`${name}: not holding its start before ${t0}`);
        if (J(fn(t1)) !== J(fn(t1 + 1))) bad.push(`${name}: not holding its end after ${t1}`);
        if (J(fn(t0)) === J(fn(t1))) bad.push(`${name}: does not move`);
      };
      holds('tour', T.tour, 0, 1.2); holds('graze', T.graze, 1.2, 1.5); holds('planes', T.planes.at, 1.5, 2.6);
      holds('explode', T.explode.at, 2.65, 3.5); holds('bulletTime.cam', T.bt.cam, 3.8, 4.6); holds('rackFocus', T.rack.at, 4.9, 5.5);
      holds('steepTilt', T.steep, 5.6, 6.4); holds('ghosts', T.steep.ghosts, 5.6, 6.7); holds('tiltReveal', T.tilt, 6.4, 7.0);
      holds('tabletopDrop', T.drop, 7.0, 7.4); holds('droneDive', T.dive, 7.4, 7.95);
      [[0, {}], [0.6, { z: 1.5, x: 160, y: 130, ry: 12 }], [1.2, { z: 1.2, x: 480, y: 230, rz: -4 }]].forEach(([t, s]) => {
        if (J(T.tour(t)) !== J(KIT.cam3(s))) bad.push(`tour misses its pose at t = ${t}: ${J(T.tour(t))}`);
      });
      const w = T.bt.world;
      if (!(w(3.8) === w(4.2) && w(4.2) === w(4.6))) bad.push(`bulletTime world not frozen in 3.8..4.6: ${w(3.8)}, ${w(4.2)}, ${w(4.6)}`);
      if (J(T.bt.cam(3.9)) === J(T.bt.cam(4.4))) bad.push('bulletTime cam frozen with the world');
      if (!(w(2) === 2 && Math.abs(w(6) - w(5) - 1) < 1e-9 && w(5) < 5)) bad.push('bulletTime world clock wrong outside the window');
      if (T.steep.ghosts(6).length !== 2) bad.push('steepTilt ghosts: want 2');
      const fin = (v, path) => { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(`NaN at ${path}`); else if (v && typeof v === 'object') for (const k in v) fin(v[k], path + '.' + k); };
      for (let i = 0; i <= 400; i++) {
        const t = -1 + i * 10 / 400;
        for (const [n, fn] of Object.entries({ tour: T.tour, graze: T.graze, planes: T.planes.at, explode: T.explode.at, cam: T.bt.cam, world: T.bt.world,
          rack: T.rack.at, steep: T.steep, ghosts: T.steep.ghosts, tilt: T.tilt, drop: T.drop, dive: T.dive, par: T.par.at })) fin(fn(t), `${n}(${t})`);
        const d = J(KIT.shot.dof({ center: t / 8 })); if (/NaN|undefined|Infinity/.test(d)) bad.push(`dof at ${t}: ${d}`);
      }
      const want = ['tour', 'planes', 'parallax', 'tiltReveal', 'tabletopDrop', 'droneDive', 'graze', 'steepTilt', 'explode', 'bulletTime', 'rackFocus', 'dof', 'pushIn'];
      for (const n of want) if (!KIT.shot.names.includes(n)) bad.push(`names lacks ${n}`);
      return bad.slice(0, 20);
    });
    if (errs.length) throw new Error("shots2 check:\n  " + errs.join("\n  "));
  } };
