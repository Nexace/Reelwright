// tools/hit-sync.js and tools/camera.js focus: the onset snap and the marker countdown are pure functions of t (the
// MUSIC.onsets / MUSIC.marks tables sched bakes), and a rack focus over dollyZoomReal's planes is 0 at the focus plane and
// maxblur away from it. Seeks 12 times forward and shuffled: every screenshot must match in pvk and HyperFrames.
export default {
  scripts: ["tools/shots.js", "tools/shots2.js", "tools/camera.js", "tools/hit-sync.js"], dur: 6,
  music: {
    beat: 0.5, bar: 2, t0: 0,
    onsets: { kick: [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0] },
    marks: { cta: { t: 4.0, dur: 1.5 } },
  },
  film: `
const el = (cls, parent, css) => { const e = KIT.el('div', cls, parent); KIT.css(e, css); return e; };
const scene = el('scene', S, { left: '0px', top: '0px', width: '640px', height: '360px' });
const back = el('scene', scene, { background: '#36c' });
const front = el('scene', scene, { background: '#2f9e6b', left: '240px', top: '100px', width: '160px', height: '160px' });
const dot = el('dot', S, { top: '300px' });
const F = KIT.shot.focus({ from: 3, to: 1, t0: 1, t1: 5, maxblur: 8 });
const D = KIT.shot.dollyZoomReal([{ el: back, z: 3 }, { el: front, z: 1 }], { t0: 1, t1: 5, dolly: 0.3, focus: F });
window.T = { F, D, front, back };
KIT.start({ dur: 6, render: (t) => {
  D(t);
  dot.style.left = (60 + 480 * KIT.hit(t) / 6) + 'px';
  dot.style.opacity = KIT.until('cta', t) > 0 ? '1' : '0.4';
} });`,
  check: async (p) => {
    const errs = await p.evaluate(() => {
      const bad = [], near = (a, b, e = 1e-9) => Math.abs(a - b) <= e, F = KIT.shot.focus({ from: 3, to: 1, t0: 1, t1: 5, maxblur: 8 });
      // focus: exact at the ends, held outside; blur is 0 at the focus plane, maxblur at the far plane, monotone in between
      if (!(near(F(1), 3) && near(F(5), 1) && near(F(0), 3) && near(F(9), 1))) bad.push('focus depth not exact/held: ' + [F(0), F(1), F(5), F(9)]);
      for (const t of [1, 2.3, 5]) if (F.blur(t, F(t)) !== 0) bad.push('blur at the focus plane at t = ' + t + ': ' + F.blur(t, F(t)));
      if (!near(F.blur(1, 1), 8)) bad.push('the near plane at focus 3 should be maxblur 8, got ' + F.blur(1, 1));
      if (!(F.blur(1, 3) === 0 && F.blur(5, 3) === 8)) bad.push('the far plane should be sharp at focus 3 and maxblur at focus 1: ' + F.blur(1, 3) + ', ' + F.blur(5, 3));
      let up = 0, down = 8;
      for (let i = 0; i <= 40; i++) {
        const t = 1 + 4 * i / 40;
        up = Math.max(up, F.blur(t, 3)); down = Math.min(down, F.blur(t, 1));
        if (i && F.blur(t, 3) < F.blur(1 + 4 * (i - 1) / 40, 3) - 1e-12) bad.push('far-plane blur is not monotone at t = ' + t);
      }
      if (!(near(up, 8) && down === 0)) bad.push('blur should sweep 0 → maxblur: ' + up + ', ' + down);
      if (!(F.blur(2.5, 3) > 0 && F.blur(2.5, 1) > 0)) bad.push('a mid rack should blur both planes');
      // the blur rides the camera state's own channel: dollyZoomReal with focus writes filter on each plane
      window.T.D(1.2);
      if (!/blur\(/.test(window.T.front.style.filter)) bad.push('dollyZoomReal + focus did not blur the near plane: ' + window.T.front.style.filter);
      // KIT.hit: snaps within tol, leaves t alone outside it, no-op for a band with no onsets
      if (!near(KIT.hit(0.505), 0.5)) bad.push('hit: 0.505 should snap to 0.5, got ' + KIT.hit(0.505));
      if (KIT.hit(0.53) !== 0.53) bad.push('hit: 0.53 is outside 1/60 s and must stay, got ' + KIT.hit(0.53));
      if (!near(KIT.hit(0.53, { tol: 0.05 }), 0.5)) bad.push('hit: tol 0.05 should snap 0.53');
      if (KIT.hit(0.5, { band: 'snare' }) !== 0.5) bad.push('hit: a band with no onsets must be a no-op');
      if (KIT.hit(0.505) !== KIT.hit(0.505) || JSON.stringify(F(2.2)) !== JSON.stringify(F(2.2))) bad.push('not repeatable');
      // markers
      if (KIT.mark('cta') !== 4 || !near(KIT.until('cta', 2.5), 1.5) || KIT.dur('cta') !== 1.5) bad.push('mark/until/dur wrong: ' + [KIT.mark('cta'), KIT.until('cta', 2.5), KIT.dur('cta')]);
      try { KIT.until('nope', 1); bad.push('a missing mark must throw'); } catch (e) { if (!/no mark "nope"/.test(e.message)) bad.push('missing mark error is unclear: ' + e.message); }
      return bad.slice(0, 20);
    });
    if (errs.length) throw new Error('hit-sync check:\n  ' + errs.join('\n  '));
  },
};
