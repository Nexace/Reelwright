// tools/p5-time.js KIT.timeRemap (speed keys, smoothstep ramps, freezes, filmOf) and tools/p5-morph.js (handoff, coverShape).
export default { scripts: ["tools/shots.js", "tools/p5-time.js", "tools/p5-morph.js"], dur: 6, film: `
const el = (cls, parent, css, html = '') => { const e = KIT.el('div', cls, parent, html); KIT.css(e, css); return e; };
const T = window.T = {};
T.R = KIT.timeRemap([{ at: 0, speed: 1 }, { at: 2, speed: 0.25, ramp: 0.4 }, { at: 4, speed: 0, keepsMoving: true, ramp: 0.3 }, { at: 5, speed: 2, ramp: 0.3 }]);
const clip = el('box c', S, { left: '0px', top: '20px', width: '50px', height: '50px' }), dot = el('dot', S, { left: '300px', top: '90px' });
const A = el('box b', S, { left: '40px', top: '250px', width: '60px', height: '40px' });
T.B = { x: 420, y: 80, w: 160, h: 100, r: 12 };
T.A = { x: 40, y: 250, w: 60, h: 40 };
T.ho = KIT.morph.handoff({ from: A, to: T.B, t0: 0.5, t1: 1.8, ease: 'power2.inOut', color: 'rgba(224,160,48,.6)' });
T.cv = KIT.morph.coverShape({ from: { x: 260, y: 140, w: 80, h: 60 }, t0: 4.2, t1: 5.4, shape: 'circle', color: 'rgba(47,158,107,.7)', ease: 'power2.inOut' });
T.rc = KIT.morph.coverShape({ from: { x: 260, y: 140, w: 80, h: 60, r: 10 }, t0: 4.2, t1: 5.4, shape: 'rect', color: 'rgba(47,158,107,.0)' });
KIT.start({ dur: 6, render: (t) => {
  clip.style.transform = 'translateX(' + (T.R.at(t) * 70).toFixed(3) + 'px)';
  dot.style.transform = 'translate(' + (Math.sin(t * 5) * 50).toFixed(3) + 'px, ' + (Math.cos(t * 3) * 20).toFixed(3) + 'px)';   // something keeps moving while the clip freezes
  T.ho.set(t); T.cv.set(t); T.rc.set(t);
} });`,
  hfNoise: { px: 600, at: [0, 6], why: 'rotated and stretched boxes and a growing circle (border-radius edges) re-raster per seek in the HyperFrames software raster' },
  check: async (p) => {
    const errs = await p.evaluate(() => {
      const T = window.T, R = T.R, bad = [], near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
      if (!near(R.at(0), 0) || !near(R.at(1.7), 1.7) || !near(R.at(2), 2)) bad.push('timeRemap: speed 1 up to 2 s must be the identity');
      if (!near(R.at(2.4), 2.25)) bad.push('timeRemap: smoothstep ramp 1 to 0.25 over 0.4 s covers 0.25 s of source, got ' + (R.at(2.4) - 2));
      if (!near(R.at(4), 2.65)) bad.push('timeRemap: hold at 0.25 to t = 4 gives 2.65, got ' + R.at(4));
      if (!near(R.at(4.3), 2.6875) || !near(R.at(4.9), 2.6875)) bad.push('timeRemap: frozen after the ramp to 0: ' + R.at(4.3) + ', ' + R.at(4.9));
      if (!(near(R.speedAt(3), 0.25) && near(R.speedAt(4.9), 0) && near(R.speedAt(2.2), 0.625))) bad.push('timeRemap: speedAt wrong ' + [R.speedAt(3), R.speedAt(4.9), R.speedAt(2.2)]);
      if (!(R.freezes.length === 1 && near(R.freezes[0][0], 4.3) && near(R.freezes[0][1], 5))) bad.push('timeRemap: freezes ' + JSON.stringify(R.freezes));
      for (const s of [0.5, 1.7, 2.5, 2.66]) if (!near(R.at(R.filmOf(s)), s, 1e-7)) bad.push('timeRemap: filmOf is not the inverse at ' + s);
      if (!near(R.filmOf(2.5), 3.4, 1e-7)) bad.push('timeRemap: source 2.5 is on screen at 3.4, got ' + R.filmOf(2.5));
      let last = -1; for (let i = 0; i <= 700; i++) { const v = R.at(i / 100); if (v < last - 1e-12) { bad.push('timeRemap: at() goes backwards at ' + i / 100); break; } last = v; }
      for (const [what, keys] of [['a freeze with nothing moving', [{ at: 0, speed: 1 }, { at: 1, speed: 0 }]], ['a negative speed', [{ at: 0, speed: -1 }]], ['keys not at 0', [{ at: 1, speed: 1 }]],
        ['a ramp that overruns the next key', [{ at: 0, speed: 1 }, { at: 1, speed: 2, ramp: 1 }, { at: 1.5, speed: 1 }]]]) {
        try { KIT.timeRemap(keys); bad.push('timeRemap must throw for ' + what); } catch {}
      }
      // handoff: sits on the source box before t0, lands EXACTLY on the target, stretches in between with the area kept
      const a0 = T.ho.at(0.5), a1 = T.ho.at(1.8), am = T.ho.at(1.15);
      if (!(near(a0.x, 40) && near(a0.y, 250) && near(a0.w, 60) && near(a0.h, 40) && near(a0.sx, 1))) bad.push('handoff: not on the source box at t0: ' + JSON.stringify(a0));
      if (!(near(a1.x, 420) && near(a1.y, 80) && near(a1.w, 160) && near(a1.h, 100) && near(a1.r, 12) && near(a1.sx, 1) && near(a1.sy, 1))) bad.push('handoff: does not land exactly on the target: ' + JSON.stringify(a1));
      if (!(am.sx > 1.05 && near(am.sx * am.sy, 1))) bad.push('handoff: should stretch mid-flight with the area kept: ' + JSON.stringify(am));
      if (JSON.stringify(T.ho.at(-3)) !== JSON.stringify(T.ho.at(0.5)) || JSON.stringify(T.ho.at(99)) !== JSON.stringify(T.ho.at(1.8))) bad.push('handoff: does not hold its ends');
      // coverShape: a circle's box reaches every corner, a rect covers the frame exactly
      const c = T.cv.at(5.4), W = KIT.W_, H = KIT.H_, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) if (Math.hypot(x - cx, y - cy) > c.r + 1e-6) bad.push('coverShape: the circle misses the corner ' + x + ',' + y);
      const r = T.rc.at(5.4); if (!(near(r.x, 0) && near(r.y, 0) && near(r.w, W) && near(r.h, H) && near(r.r, 0))) bad.push('coverShape: the rect does not cover the frame exactly ' + JSON.stringify(r));
      if (!(near(T.cv.at(4.2).w, 80) && near(T.rc.at(4.2).w, 80))) bad.push('coverShape: not on the source box before t0');
      try { KIT.morph.handoff({ from: { x: 0, y: 0, w: 0, h: 5 }, to: { x: 0, y: 0, w: 5, h: 5 }, t0: 0, t1: 1 }); bad.push('handoff: a zero-width box must throw'); } catch {}
      return bad.slice(0, 20);
    });
    if (errs.length) throw new Error('time check:\n  ' + errs.join('\n  '));
  } };
