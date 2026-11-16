// tools/sharp-camera.js: a frame-sized text layer filmed with { sharp: true } through push-in, orbit and a dutch roll over 6 s. check()
// compares where a marker lands against the standard scale() camera (16x9 and a 9x16 frame): the boxes must agree to 0.05 px, the
// layer must be laid out at z x (the point of the option), and no preset's output may break the default call.
export default { scripts: ["tools/shots.js", "tools/sharp-camera.js"], dur: 6, film: `
const layer = KIT.el('div', 'scene', S, '<div id="mark" style="position:absolute;left:12%;top:20%;width:40%;font:600 15px Arial">Reelwright small text</div><div id="blk" class="box a" style="left:60%;top:50%"></div>');
KIT.css(layer, { width: '100%', height: '100%' });
const H = KIT.shot, track = H.track([{ at: 0, shot: H.pushIn({ t0: 0, t1: 2, to: 2.2, x: 200, y: 120 }) }, { at: 2, shot: H.orbit({ t0: 2, t1: 4 }) }, { at: 4, shot: H.dutchRoll({ at: 4 }) }]);
window.T = { track };
KIT.start({ dur: 6, render: (t) => KIT.shoot(layer, track(t), { sharp: true }) });`,
  check: async (p) => {
    const errs = await p.evaluate(async () => {
      const K = KIT, bad = [], layer = document.querySelector('.scene'), m = document.getElementById('mark');
      const rect = (e = m) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }, blk = document.getElementById('blk');
      const states = [{ z: 1.5, x: 200, y: 120 }, { z: 2.2, x: 400, y: 200, rz: 5 }, { z: 1.3, x: 320, y: 180, ry: 15, persp: 900 }, { z: 1.6, x: 150, y: 90, rx: 8, ry: -10, blur: 4 }];
      for (const [w, h] of [[640, 360], [360, 640]]) {   // 16x9, then 9x16 (the row's stills check)
        K.W_ = w; K.H_ = h; K.stage.style.width = w + 'px'; K.stage.style.height = h + 'px';
        for (const s of states) {
          K.shoot(layer, s); const a = rect(blk), ta = rect(); const zs = layer.style.zoom;
          K.shoot(layer, s, { sharp: true }); const b = rect(blk), tb = rect();
          // text is re-laid out at z x its size, so its box may differ by a rounded line box; where it lands may not
          ta.forEach((v, i) => { if (Math.abs(v - tb[i]) > 3) bad.push(w + 'x' + h + ' text ' + JSON.stringify(s) + ': ' + ta.map((x) => x.toFixed(2)) + ' vs sharp ' + tb.map((x) => x.toFixed(2))); });
          if (zs !== '') bad.push('the default shoot left a zoom behind');
          a.forEach((v, i) => { if (Math.abs(v - b[i]) > 0.05) bad.push(w + 'x' + h + ' ' + JSON.stringify(s) + ': ' + a.map((x) => x.toFixed(2)) + ' vs sharp ' + b.map((x) => x.toFixed(2))); });
          if (Math.abs(parseFloat(getComputedStyle(layer).zoom) - s.z) > 1e-3) bad.push('layer is not zoomed to ' + s.z);
          // laid out at z x: the browser sets this text at 15 z px, not 15 px scaled up afterwards
          if (Math.abs(m.offsetWidth - Math.round(0.4 * w)) > 1) bad.push('mark layout width ' + m.offsetWidth + ' (percent boxes must follow the frame)');
        }
        const sc = K.camCSS({ z: 2, x: 100, y: 50 }, { sharp: true });
        if (!/scale/.test(K.camCSS({ z: 2 }).transform) || /scale/.test(sc.transform)) bad.push('camCSS: sharp must drop scale(), default must keep it');
      }
      K.W_ = 640; K.H_ = 360; K.stage.style.width = '640px'; K.stage.style.height = '360px';
      for (const t of [0, 1, 3, 5.5]) K.shoot(layer, window.T.track(t), { sharp: true });
      return bad.slice(0, 12);
    });
    if (errs.length) throw new Error("sharp-camera check:\n  " + errs.join("\n  "));
  } };
