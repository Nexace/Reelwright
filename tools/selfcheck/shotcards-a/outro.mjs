// shotcards/outro.js: six outros in sequence in a 10 s film (lockup, neon marquee, group launch, UI strip-away, icon flip bloom, input morph)
import { PRE, verdict } from "./_common.mjs";
export default { scripts: ["tools/shots.js", "tools/shotcards/outro.js"], dur: 10, extra: [0.9, 2.7, 4.5, 6.3, 7.9, 9.3], film: PRE + `
const SC = KIT.shotcards, T = window.T = {}, win = [[0, 1.8], [1.8, 3.6], [3.6, 5.4], [5.4, 7.2], [7.2, 8.6], [8.6, 10.1]], w = win.map(() => el('scene', S, {}));
const logo = el('box a', w[0], { width: '70px', height: '70px', borderRadius: '35px' }), word = el('', w[0], { fontSize: '48px', fontWeight: 800 }, 'Reelwright');
T.lock = SC.logoLockup({ logo, word, t0: 0.2, t1: 1.6 });
T.neon = SC.neonMarquee({ parent: w[1], rows: ['LAUNCH', 'FILMS', 'REELWRIGHT'], t0: 1.9, t1: 3.5, size: 60, pitch: 80, gap: 60 });
const wm = el('', w[2], { fontSize: '54px', fontWeight: 800 }, 'REEL'), reps = [0, 1, 2, 3, 4, 5].map((i) => el('dot', w[2], { width: '44px', height: '44px', background: ['#e33', '#36c', '#2a7', '#e0a030', '#a4c', '#0aa'][i] }));
T.group = SC.groupLaunch({ wordmark: wm, reps, rx: 190, ry: 110, t0: 3.7, t1: 5.3, seed: 2 });
const items = [el('box a', w[3], { left: '30px', top: '24px' }), el('box b', w[3], { left: '510px', top: '30px' }), el('box c', w[3], { left: '40px', top: '250px' }), el('', w[3], { left: '470px', top: '290px' }, 'footer')];
const slogo = el('box c', w[3], { width: '120px', height: '120px', borderRadius: '60px' });
T.strip = SC.uiStripAway({ items, logo: slogo, t0: 5.5, t1: 7.1 });
const icon = el('box a', w[4], { width: '100px', height: '100px' }), flogo = el('box c', w[4], { width: '100px', height: '100px', borderRadius: '50px' });
T.flip = SC.iconFlipBloom({ parent: w[4], icon, logo: flogo, x: 320, y: 180, r: 90, t0: 7.3, t1: 8.5 });
const inp = el('', w[5], { background: '#fff', border: '3px solid #333', boxSizing: 'border-box' }), itext = el('', inp, { left: '20px', top: '12px', fontSize: '24px', whiteSpace: 'nowrap' }, 'search anything');
const mlogo = el('box b', w[5], { width: '60px', height: '60px', borderRadius: '30px' }), parts = [0, 1, 2].map((i) => el('dot', w[5], { background: ['#e33', '#fff', '#2a7'][i] }));
T.morph = SC.inputMorphAssemble({ box: inp, text: itext, logo: mlogo, parts, x: 320, y: 180, from: { w: 360, h: 56, r: 12 }, to: { w: 120, h: 120, r: 60 }, t0: 8.7, t1: 10, seed: 3 });
KIT.start({ dur: 10, render: (t) => { w.forEach((e, i) => KIT.show(e, t >= win[i][0] && t < win[i][1] ? 1 : 0)); for (const k in T) T[k].set(t); } });`,
  check: async (p) => {
    await p.evaluate(() => {
      const T = window.T, bad = window.bad, near = (a, b, m) => { if (Math.abs(a - b) > 1e-3) bad.push(m + ': ' + a + ' vs ' + b); };
      holds('logoLockup', T.lock.at, 0.2, 1.6); near(T.lock.at(0.2).logoX, 320, 'lockup logo starts centred'); near(T.lock.at(1.6).logoS, 1, 'lockup logo ends at scale 1'); near(T.lock.at(1.6).wordClip, 0, 'wordmark fully written');
      if (!(T.lock.at(1.6).logoX < 320 && T.lock.at(1.6).wordX > T.lock.at(1.6).logoX)) bad.push('lockup: logo left of the wordmark');
      near(T.neon.at(1.9).op, 0, 'neon fades in'); near(T.neon.at(2.7).op, 1, 'neon at full'); const a0 = T.neon.at(2.0), a1 = T.neon.at(2.05);
      if (!(a1.x[0] !== a0.x[0] && (a1.x[1] - a0.x[1]) * (a1.x[0] - a0.x[0]) < 0)) bad.push('neon: rows 0 and 1 must run in opposite directions');
      if (T.neon.at(2.5).x.some((x) => x > 0 || x < -4000)) bad.push('neon: offset must wrap inside one repeat');
      const g0 = T.group.at(3.7), g1 = T.group.at(5.3);
      if (!g0.reps.every((r) => Math.hypot(r.x - 320, r.y - 180) > 400)) bad.push('group: reps start outside the frame'); near(g0.word, 0, 'group wordmark hidden at the start');
      if (!g1.reps.every((r) => Math.abs(r.s - 1) < 0.01 && Math.hypot(r.x - 320, r.y - 180) < 260)) bad.push('group: reps land round the wordmark'); near(g1.word, 1, 'group wordmark at full size');
      near(T.strip.at(5.5).logo, 0, 'strip logo not yet'); near(T.strip.at(7.1).logo, 1, 'strip logo landed'); if (!T.strip.at(5.5).items.every((i) => i.op === 1) || !T.strip.at(7.1).items.every((i) => i.op === 0)) bad.push('strip: items from 1 to 0');
      holds('strip', T.strip.at, 5.5, 7.1);
      holds('iconFlipBloom', T.flip.at, 7.3, 8.5); near(T.flip.at(7.3).icon, 0, 'flip icon face-on'); near(T.flip.at(8.5).icon, 90, 'flip icon edge-on'); near(T.flip.at(8.5).logo, 0, 'flip logo face-on'); near(T.flip.at(8.5).ringOp, 0, 'bloom gone at the end');
      holds('inputMorph', T.morph.at, 8.7, 10); near(T.morph.at(8.7).w, 360, 'input width start'); near(T.morph.at(10).w, 120, 'input becomes the disc'); near(T.morph.at(10).text, 0, 'input text gone'); near(T.morph.at(10).logo, 1, 'logo in');
      if (!T.morph.at(10).parts.every((q) => q.dx === 0 && q.op === 1)) bad.push('morph: parts assembled at the end');
      for (const k in T) scan(k, T[k].at);
      let threw = 0; for (const f of [() => KIT.shotcards.logoLockup({}), () => KIT.shotcards.neonMarquee({ rows: ['x'], t0: 1, t1: 0 }), () => KIT.shotcards.groupLaunch({ reps: [], wordmark: {} }), () => KIT.shotcards.uiStripAway({ items: [] }),
        () => KIT.shotcards.iconFlipBloom({}), () => KIT.shotcards.inputMorphAssemble({})]) try { f(); } catch { threw++; }
      if (threw !== 6) bad.push('bad arguments must throw (' + threw + ' of 6)');
      window.pure([0.9, 2.4, 3.2, 4.6, 6.1, 7.9, 9.3]);
    });
    await verdict(p, "outro");
  } };
