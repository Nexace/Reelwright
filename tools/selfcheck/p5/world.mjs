// tools/p5-time.js KIT.world: every beat a box on one canvas, one camera travelling through them (with p5-camera.js keys).
export default { scripts: ["tools/shots.js", "tools/p5-camera.js", "tools/p5-time.js"], dur: 6, film: `
const W = window.W = KIT.world({ regions: {
  a: { x: 0, y: 0, w: 640, h: 360, cls: 'box a', html: 'Alpha' }, b: { x: 1000, y: 200, w: 400, h: 225, cls: 'box b', html: 'Beta' },
  c: { x: 300, y: 900, w: 800, h: 450, cls: 'box c', html: 'Gamma' } } });
const tour = window.TOUR = W.tour([{ at: 0, region: 'a' }, { at: 2.5, region: 'b', ease: 'power2.inOut' }, { at: 5, region: 'c', ease: 'power2.inOut' }]);
KIT.start({ dur: 6, render: (t) => W.shoot(t, tour) });`,
  hfNoise: { px: 600, at: [0, 6], why: 'scaled text and box edges re-raster at a different sub-pixel offset per seek in the HyperFrames software raster' },
  check: async (p) => {
    const errs = await p.evaluate(() => {
      const W = window.W, tour = window.TOUR, bad = [], near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
      for (const [t, name] of [[0, 'a'], [2.5, 'b'], [5, 'c']]) {
        const r = W.region(name), s = tour(t), [sx, sy] = KIT.project(s, [r.x + r.w / 2, r.y + r.h / 2]);
        if (!(near(sx, KIT.W_ / 2, 1e-6) && near(sy, KIT.H_ / 2, 1e-6))) bad.push('world: region ' + name + ' is not centred at t = ' + t + ': ' + sx + ', ' + sy);
        const f = W.frame(name); if (!(near(s.z, f.z) && near(s.x, f.x))) bad.push('world: the tour does not stop on frame(' + name + ')');
        // the box fills 90 % of the frame on its tight axis
        const fill = Math.max(r.w * s.z / KIT.W_, r.h * s.z / KIT.H_); if (!near(fill, 0.9, 1e-6)) bad.push('world: ' + name + ' fills ' + fill + ' of the frame, wanted 0.9');
      }
      if (JSON.stringify(tour(-1)) !== JSON.stringify(tour(0)) || JSON.stringify(tour(9)) !== JSON.stringify(tour(5))) bad.push('world: tour does not hold its ends');
      // between a and b the camera passes through the world: region c is nowhere on screen near t = 1.25 (it is below the frame)
      const m = tour(1.25), [, cy] = KIT.project(m, [700, 900]); if (!(cy > KIT.H_)) bad.push('world: region c should still be below the frame mid-flight to b');
      try { KIT.world({ regions: { x: { x: 0, y: 0, w: 0, h: 5 } } }); bad.push('world: a zero-size region must throw'); } catch {}
      try { W.frame('nope'); bad.push('world: an unknown region must throw'); } catch {}
      return bad.slice(0, 20);
    });
    if (errs.length) throw new Error('world check:\n  ' + errs.join('\n  '));
  } };
