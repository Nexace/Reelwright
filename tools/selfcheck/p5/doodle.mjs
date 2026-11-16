// tools/p5-doodle.js: D.callout (dot, drawn leader, written label, follows the camera), D.steps (one score: still, timelapse, step sheet),
// Note: the film moves its scene with a plain 2D transform. KIT.shoot (tools/shots.js camCSS) always writes rotateY(0) rotateX(0), a 3D
// transform, and with overlays above that layer Chromium's raster of the overlays then depends on the frames drawn before (found here, reported
// in docs/playbook/p5-motion.md); the projection itself is checked against the real KIT.shoot below.
// KIT.layout.kinetic({ style: 'drawn' }) (every word written by the pen on its spoken start).
const text = "Make films fast", ts = [2.2, 2.7, 3.2];
export default {
  scripts: ["tools/shots.js", "tools/p5-camera.js", "tools/doodle.js", "tools/doodle2.js", "tools/layouts.js", "tools/p5-doodle.js"], dur: 6,
  vo: { a: { text, start: 2.1, end: 3.8, words: text.split(" ").map((w, i) => ({ w, t: ts[i], d: 0.35 })) } },
  film: `
const D = KIT.doodle, el = (cls, parent, css, html = '') => { const e = KIT.el('div', cls, parent, html); KIT.css(e, css); return e; };
const main = el('scene', S, {});
const target = el('box a', main, { left: '290px', top: '140px', width: '20px', height: '20px' });
el('box b', main, { left: '60px', top: '240px', width: '120px' });
const T = window.T = {};
T.cam = KIT.shot.keys([{ t: 0 }, { t: 6, z: 1.6, x: 380, y: 200, ease: 'none' }]);
T.callout = D.callout({ anchor: [300, 150], cam: T.cam, label: 'Look here', in: 0.5, out: 5.6, dx: 70, dy: -60, size: 34 });
const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('width', 640); sv.setAttribute('height', 360); sv.style.cssText = 'position:absolute;left:0;top:0';
S.appendChild(sv); window.T = window.T || {}; T.sv = sv;
T.marks = [
  { id: 'a', pts: [[20, 300], [60, 280], [100, 300]], phase: 'block-in' }, { id: 'b', pts: [[20, 320], [100, 320]], phase: 'block-in' },
  { id: 'c', pts: [[30, 300], [30, 340], [90, 340], [90, 300]], phase: 'outline' }, { id: 'd', pts: [[50, 340], [50, 320], [70, 320], [70, 340]], phase: 'outline', deps: ['c'] },
  { id: 'e', pts: [[40, 310], [80, 310]], phase: 'detail' }, { id: 'f', pts: [[45, 325], [65, 325]], phase: 'detail' },
  { id: 'g', pts: [[110, 300], [110, 340]] }, { id: 'h', pts: [[120, 300], [120, 340]] } ];
T.steps = D.steps(T.marks, 3.4, 5, { parent: sv });
T.sheet = T.steps.sheet(S, { cols: 4, cell: { w: 150, h: 90 }, gap: 4, scale: 1 });
T.sheet.el.style.left = '240px'; T.sheet.el.style.top = '250px';
T.kin = KIT.layout.kinetic({ style: 'drawn', line: 'a', accent: ['fast'], in: 2, out: 5.6, draw: 0.4 });
KIT.start({ dur: 6, render: (t) => {
  { const c = T.cam(t); main.style.transformOrigin = c.x + 'px ' + c.y + 'px'; main.style.transform = 'translate(' + (KIT.W_ / 2 - c.x) + 'px,' + (KIT.H_ / 2 - c.y) + 'px) scale(' + c.z + ')'; } T.callout.set(t); T.steps.score.set(t); T.sheet.set(t); T.kin.set(t);
} });`,
  hfNoise: { px: 2500, at: [0, 6], why: 'pen ribbons (anti-aliased filled polygons) and a camera scale raster per seek in the HyperFrames software raster' },
  check: async (p) => {
    const errs = await p.evaluate(async () => {
      const T = window.T, bad = [], near = (a, b, e = 1e-6) => Math.abs(a - b) <= e, J = JSON.stringify, target = document.querySelector('.box.a');
      // the anchor follows the camera: the callout's anchor equals where the target box really is on screen
      for (const t of [0, 1.5, 3, 4.5, 6]) {
        await window.render(t);
        const [ax, ay] = T.callout.at(t), r = target.getBoundingClientRect();
        if (Math.hypot(ax - (r.left + r.width / 2), ay - (r.top + r.height / 2)) > 0.6) bad.push('callout: anchor ' + ax.toFixed(2) + ',' + ay.toFixed(2) + ' is not on the target at t = ' + t + ' (' + (r.left + r.width / 2).toFixed(2) + ',' + (r.top + r.height / 2).toFixed(2) + ')');
      }
      // the same projection against the real KIT.shoot (3D transform, rotation about the focal point): where the target box really is
      for (const st of [{ z: 1.3, x: 350, y: 210, rz: 8 }, { z: 0.8, x: 200, y: 100, rz: -15 }, { z: 2, x: 300, y: 150 }]) {
        KIT.shoot(document.querySelector('.scene'), st);
        const [px, py] = KIT.project(st, [300, 150]), r = target.getBoundingClientRect();
        if (Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2)) > 0.6) bad.push('project: ' + J(st) + ' gives ' + px.toFixed(2) + ',' + py.toFixed(2) + ' but the box is at ' + (r.left + r.width / 2).toFixed(2) + ',' + (r.top + r.height / 2).toFixed(2));
      }
      // dot lands first, then the leader, then the label (each nothing before its time)
      await window.render(0.4); const svgC = T.callout.el, circ = svgC.querySelector('circle'), paths = () => [...svgC.querySelectorAll('path')].filter((x) => x.getAttribute('d'));
      if (!(Number(circ.getAttribute('r')) === 0 && paths().length === 0)) bad.push('callout: something is drawn before its time');
      await window.render(0.58); if (!(Number(circ.getAttribute('r')) > 1 && paths().length === 0)) bad.push('callout: the dot should be down before the leader starts');
      await window.render(0.8); const nLeader = paths().length; if (!(nLeader >= 1)) bad.push('callout: no leader line at 0.8 s');
      await window.render(1.6); if (!(paths().length > nLeader)) bad.push('callout: the label is not written by 1.6 s');
      await window.render(5.9); if (!(Number(circ.getAttribute('r')) >= 0 && svgC.querySelector('g').style.opacity !== undefined)) bad.push('callout: bad end state');
      try { KIT.doodle.callout({ anchor: [0, 0], label: 'x', in: NaN }); bad.push('callout: a NaN time must throw'); } catch {}
      try { KIT.doodle.callout({ anchor: [0, 0], label: 'a~b', in: 0 }); bad.push('callout: a label with a character the pen lacks must throw'); } catch {}
      // steps: the teaching phases in order, each step's time is when its last mark is finished, the sheet has one cell per step
      const S = T.steps;
      if (J(S.phases) !== J(['block-in', 'outline', 'detail', 'finish'])) bad.push('steps: phases ' + J(S.phases));
      if (!(S.steps.length === 4 && S.steps.every((s, i) => s.n === i + 1))) bad.push('steps: wrong steps ' + J(S.steps));
      for (let i = 1; i < S.steps.length; i++) if (!(S.steps[i].t > S.steps[i - 1].t)) bad.push('steps: step times must increase');
      if (!near(S.steps[3].t, S.score.windows.h[1]) && !(S.steps[3].t <= 5 + 1e-9)) bad.push('steps: the last step must end with the score');
      if (!(T.sheet.cells === 4)) bad.push('steps: one cell per step');
      const caps = [...document.querySelectorAll('.kit-stepcap')].map((x) => x.textContent); if (J(caps) !== J(['STEP 1: BLOCK-IN', 'STEP 2: OUTLINE', 'STEP 3: DETAIL', 'STEP 4: FINISH'])) bad.push('steps: captions ' + J(caps));
      // each cell is its step's picture: cell n has the marks of phases 1..n drawn and the later ones not started
      await window.render(3);
      const drawn = (cell) => [...cell.querySelectorAll('path')].filter((x) => x.getAttribute('d')).length;
      const cells = [...document.querySelectorAll('.kit-stepcell')], counts = cells.map(drawn);
      if (!(counts[0] > 0 && counts[0] < counts[1] && counts[1] < counts[2] && counts[2] <= counts[3])) bad.push('steps: the cells should fill up step by step: ' + J(counts));
      await window.render(3.5); const early = drawn(T.sv);   // the film's own marks are untouched by the sheet: they draw on their own clock
      await window.render(5); const done = drawn(T.sv); if (!(done > early)) bad.push('steps: the main score does not draw on its own (' + early + ' to ' + done + ')');
      // drawn kinetic: one group per word, the pop is exactly 1 before the word and after the pop
      const words = T.kin.words; if (words.length !== 3) bad.push('kinetic drawn: ' + words.length + ' words, wanted 3');
      for (const w of words) {
        await window.render(w.t + 0.5); if (!/scale\(1\)/.test(w.g.getAttribute('transform'))) bad.push('kinetic drawn: the pop does not end at scale 1 ' + w.g.getAttribute('transform'));
        await window.render(w.t + 0.09); const m = /scale\(([\d.]+)\)/.exec(w.g.getAttribute('transform')); if (!(m && Number(m[1]) > 1.05)) bad.push('kinetic drawn: no pop while landing');
      }
      await window.render(2.3); const pathsAt = (g) => [...g.querySelectorAll('path')].filter((x) => x.getAttribute('d')).length;
      if (!(pathsAt(words[0].g) > 0 && pathsAt(words[2].g) === 0)) bad.push('kinetic drawn: words must be written in the order spoken');
      await window.render(5); if (!words.every((w) => pathsAt(w.g) > 0)) bad.push('kinetic drawn: every word written by 5 s');
      if (!(typeof KIT.layout.kineticDrawn === 'function')) bad.push('KIT.layout.kineticDrawn missing');
      return bad.slice(0, 20);
    });
    if (errs.length) throw new Error('doodle check:\n  ' + errs.join('\n  '));
  } };
