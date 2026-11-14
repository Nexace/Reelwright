// tools/p5-camera.js: authored keys (per-segment ease, log2 zoom, mono), monoZoom, lens, the real dolly-zoom over 3 planes, gradient-noise shake.
export default { scripts: ["tools/shots.js", "tools/shots2.js", "tools/p5-camera.js"], dur: 6, film: `
const H = KIT.shot, el = (cls, parent, css, html = '') => { const e = KIT.el('div', cls, parent, html); KIT.css(e, css); return e; };
const scene = (parent) => {
  const s = el('scene', parent, {});
  el('box a', s, { left: '120px', top: '90px' }); el('box b', s, { left: '280px', top: '140px' }); el('box c', s, { left: '440px', top: '190px' });
  return s;
};
const main = scene(S), pg = el('scene', S, {}), back = el('scene', pg, {}), mid = el('scene', pg, {}), front = el('scene', pg, {});
for (let i = 0; i < 6; i++) el('dot', back, { left: 40 + i * 110 + 'px', top: '60px' });
el('box b', mid, { left: '260px', top: '130px' }); el('box c', front, { left: '60px', top: '230px', width: '140px' });
const T = window.T = {};
T.keys = H.keys([{ t: 0 }, { t: 1.5, z: 2, x: 200, y: 120, ease: 'power2.inOut' }, { t: 3, z: 1.2, rz: -4 }]);
T.dolly = H.dollyZoomReal([{ el: back, z: 3 }, { el: mid, z: 1 }, { el: front, z: 0.7 }], { t0: 3.2, t1: 4.8, dolly: 0.4 });
T.shake = H.withShake((t) => KIT.cam3(), 5.1, { amp: 24, dur: 0.8, seed: 3 });
KIT.start({ dur: 6, render: (t) => {
  KIT.show(main, t < 3.2 || t >= 5 ? 1 : 0); KIT.show(pg, t >= 3.2 && t < 5 ? 1 : 0);
  KIT.shoot(main, t < 3.2 ? T.keys(t) : T.shake(t)); T.dolly(t);
} });`,
  check: async (p) => {
    const errs = await p.evaluate(() => {
      const T = window.T, J = JSON.stringify, H = KIT.shot, bad = [], near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
      if (J(T.keys(0)) !== J(KIT.cam3({}))) bad.push('keys: the first key is not the identity');
      const k15 = T.keys(1.5); if (!(near(k15.z, 2) && near(k15.x, 200) && near(k15.y, 120))) bad.push('keys: not exactly the key at 1.5: ' + J(k15));
      const k3 = T.keys(3); if (!(near(k3.z, 1.2) && near(k3.rz, -4) && near(k3.x, 200))) bad.push('keys: a field a key leaves out must carry over (x stays 200): ' + J(k3));
      if (J(T.keys(-5)) !== J(T.keys(0)) || J(T.keys(9)) !== J(T.keys(3))) bad.push('keys: does not hold its ends');
      const lg = H.keys([{ t: 0, z: 1 }, { t: 1, z: 4, ease: 'none' }]), ln = H.keys([{ t: 0, z: 1 }, { t: 1, z: 4, ease: 'none' }], { log: false });
      if (!near(lg(0.5).z, 2, 1e-9)) bad.push('keys log2: z 1 to 4 at the middle should be 2, got ' + lg(0.5).z);
      if (!near(ln(0.5).z, 2.5, 1e-9)) bad.push('keys log:false: the middle should be 2.5, got ' + ln(0.5).z);
      const over = [{ t: 0, z: 1 }, { t: 1, z: 4, ease: 'back.out(3)' }];
      let hi = 0, hiMono = 0;
      for (let i = 0; i <= 100; i++) { hi = Math.max(hi, H.keys(over)(i / 100).z); hiMono = Math.max(hiMono, H.keys(over, { mono: true })(i / 100).z); }
      if (!(hi > 4.05)) bad.push('keys: the back ease should overshoot z 4 without mono (max ' + hi + ')');
      if (!(hiMono <= 4 + 1e-9)) bad.push('keys mono: z must never pass the key (max ' + hiMono + ')');
      if (!(near(H.monoZoom(1, 8, 0), 1) && near(H.monoZoom(1, 8, 1), 8) && near(H.monoZoom(1, 8, 0.5), Math.sqrt(8)))) bad.push('monoZoom endpoints / geometric middle wrong');
      const lens = H.lens({ t0: 0, t1: 1, to: 4, ease: 'none' }); if (!near(lens(0.5).z, 2)) bad.push('lens: log middle of 1..4 should be 2');
      // real dolly-zoom: the subject plane (z = 1) holds scale 1 for every t, far planes shrink as the camera dollies in, near planes grow
      for (let t = 3; t <= 5; t += 0.05) {
        const s = T.dolly.at(t);
        if (!near(s[1].scale, 1, 1e-12)) bad.push('dollyZoomReal: the subject plane moved at t = ' + t + ': ' + s[1].scale);
        if (t >= 4.8 && !(near(s[0].scale, 0.6 / (1 - 0.4 / 3), 1e-12) && near(s[2].scale, 0.6 / (1 - 0.4 / 0.7), 1e-12))) bad.push('dollyZoomReal: final planes wrong ' + J(s));
      }
      const mid = T.dolly.at(4); if (!(mid[0].scale < 1 && mid[2].scale > 1)) bad.push('dollyZoomReal: far plane should shrink and near plane grow: ' + J(mid));
      if (!near(T.dolly.at(3.2)[0].scale, 1) || !near(T.dolly.at(3.2)[2].scale, 1)) bad.push('dollyZoomReal: not the identity before t0');
      try { H.dollyZoomReal([{ el: document.body, z: 1 }], { t0: 0, t1: 1 }); bad.push('dollyZoomReal: one plane must throw'); } catch {}
      try { H.dollyZoomReal([{ el: document.body, z: 1 }, { el: document.body, z: 2 }], { t0: 0, t1: 1, dolly: 1 }); bad.push('dollyZoomReal: dolly 1 must throw'); } catch {}
      // shake: exactly zero outside the window, gradient noise (smooth) inside, a smoothstep attack then a squared decay, seeded
      const sh = (t, o = {}) => KIT.shakeNoise(t, 1, { amp: 20, dur: 1, ...o });
      for (const t of [-1, 1, 2, 2.0001, 9]) if (sh(t).x !== 0 || sh(t).y !== 0 || sh(t).rz !== 0) bad.push('shakeNoise: not zero at t = ' + t);
      let peak = 0, late = 0;
      for (let i = 1; i < 1000; i++) { const t = 1 + i / 1000, m = Math.hypot(sh(t).x, sh(t).y); peak = Math.max(peak, m); if (i > 900) late = Math.max(late, m); }
      if (!(peak > 4 * KIT.u)) bad.push('shakeNoise: barely shakes (peak ' + peak + ')');
      const first = Math.hypot(sh(1.001).x, sh(1.001).y); if (!(first < peak * 0.05)) bad.push('shakeNoise: no attack ramp (1 ms in: ' + first + ' vs peak ' + peak + ')');
      if (!(late < peak * 0.1)) bad.push('shakeNoise: decay is not squared (last 10 % ' + late + ' vs peak ' + peak + ')');
      if (J(sh(1.3)) !== J(sh(1.3))) bad.push('shakeNoise: not repeatable');
      if (J(sh(1.3)) === J(sh(1.3, { seed: 1 }))) bad.push('shakeNoise: the seed does nothing');
      let jump = 0; for (let i = 1; i < 2000; i++) jump = Math.max(jump, Math.abs(sh(1 + i / 2000).x - sh(1 + (i - 1) / 2000).x));
      if (!(jump < 0.5 * peak)) bad.push('shakeNoise: not smooth (step ' + jump + ')');
      const fin = (v, path) => { if (typeof v === 'number' && !Number.isFinite(v)) bad.push('NaN at ' + path); else if (v && typeof v === 'object') for (const k in v) fin(v[k], path + '.' + k); };
      for (let i = 0; i <= 300; i++) { const t = -1 + i * 8 / 300; fin(T.keys(t), 'keys(' + t + ')'); fin(T.shake(t), 'shake(' + t + ')'); fin(T.dolly.at(t), 'dolly(' + t + ')'); }
      for (const n of ['keys', 'lens', 'dollyZoomReal', 'withShake']) if (!KIT.shot.names.includes(n)) bad.push('names lacks ' + n);
      return bad.slice(0, 20);
    });
    if (errs.length) throw new Error('camera check:\n  ' + errs.join('\n  '));
  } };
