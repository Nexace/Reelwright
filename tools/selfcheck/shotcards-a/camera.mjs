// shotcards/camera.js: cursorFlyover (0 - 2.5 s), pullBackIsolation (2.6 - 4.2 s), terminal3d (4.6 - 8 s)
import { PRE, verdict } from "./_common.mjs";
export default { scripts: ["tools/shots.js", "tools/shots2.js", "tools/motion.js", "tools/shotcards/camera.js"], dur: 8, extra: [1.5, 3.4, 5.2, 6.6], film: PRE + `
const SC = KIT.shotcards, A = scene3(S), B = scene3(S), Cc = el('scene', S, {});
const term = el('', Cc, { left: '110px', top: '70px', width: '420px', height: '220px', background: '#111', borderRadius: '10px' });
const code = el('', term, { left: '18px', top: '16px', width: '390px', color: '#7fe', font: '600 22px monospace', whiteSpace: 'pre' }), T = window.T = {};
T.fly = SC.cursorFlyover({ layer: A, size: 28, poses: [
  { t: 0, state: {}, cursor: { x: 320, y: 180 } },
  { t: 1.0, state: { z: 1.8, x: 160, y: 130 }, cursor: { x: 160, y: 130 }, click: true },
  { t: 2.2, state: { z: 1.4, x: 480, y: 230, ry: 8 }, cursor: { x: 480, y: 230 }, click: true, ease: 'power2.inOut' }] });
T.iso = SC.pullBackIsolation({ layer: B, focus: { x: 320, y: 180 }, siblings: [B.children[0], B.children[2], B.children[3]], t0: 2.6, t1: 4.2 });
T.term = SC.terminal3d({ layer: Cc, el: code, text: 'npm run build\\n> ok 42 files', t0: 4.6, t1: 5.8, cps: 14 });
KIT.start({ dur: 8, render: (t) => {
  KIT.show(A, t < 2.5 ? 1 : 0); KIT.show(B, t >= 2.5 && t < 4.5 ? 1 : 0); KIT.show(Cc, t >= 4.5 ? 1 : 0);
  T.fly.set(t); T.iso.set(t); T.term.set(t);
} });`,
  check: async (p) => {
    await p.evaluate(() => {
      const T = window.T, J = JSON.stringify, bad = window.bad, near = (a, b, m) => { if (Math.abs(a - b) > 1e-3) bad.push(m + ': ' + a + ' vs ' + b); };
      holds('flyover cam', T.fly.cam, 0, 2.2); holds('pullBackIsolation cam', T.iso.cam, 2.6, 4.2); holds('terminal3d cam', T.term.cam, 4.6, 5.8);
      near(T.fly.at(1.0).z, 1.8, 'flyover pose z'); near(T.fly.at(1.0).cx, 160, 'cursor on its pose'); near(T.fly.at(2.2).cy, 230, 'cursor on its last pose');
      for (const t of [0.3, 0.6, 1.6, 2.0]) near(T.fly.at(t).scale * T.fly.at(t).z, 1, 'cursor keeps its on-screen size at t=' + t);
      near(T.fly.at(1.09).scale * T.fly.at(1.09).z, 0.85, 'click dips the cursor');
      near(T.iso.cam(2.6).z, 1.35, 'isolation starts zoomed in'); near(T.iso.cam(4.2).z, 1, 'isolation ends at z 1'); near(T.iso.cam(4.2).x, KIT.W_ / 2, 'isolation recentres');
      near(T.iso.at(2.6).siblings, 1, 'siblings start bright'); near(T.iso.at(4.2).siblings, 0.2, 'siblings end dimmed');
      near(T.term.end, 5.8 + 0.2 + 26 / 14, 'typewriter end'); T.term.set(8); const txt = document.querySelector('.scene div div').textContent;
      if (!/ok 42 files$/.test(txt)) bad.push('terminal text not complete at the end: ' + J(txt));
      T.term.set(5.0); if (txt === document.querySelector('.scene div div').textContent) bad.push('terminal text should be empty before the camera lands');
      scan('fly', T.fly.at); scan('iso', T.iso.at); scan('term', T.term.at);
      let threw = 0; for (const f of [() => KIT.shotcards.cursorFlyover({ layer: A, poses: [{ t: 0, state: {} }] }), () => KIT.shotcards.pullBackIsolation({ layer: A }), () => KIT.shotcards.terminal3d({})]) try { f(); } catch { threw++; }
      if (threw !== 3) bad.push('bad arguments must throw');
      window.pure([0.4, 1.7, 3.3, 5.2, 7.7]);
    });
    await verdict(p, "camera");
  } };
