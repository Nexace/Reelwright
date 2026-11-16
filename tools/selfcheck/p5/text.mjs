// tools/p5-text.js: readS / chatHold / paced, phrases (2 to 6 words landing on the first spoken word), subtitlePhrases; tools/p5-media.js scaleArea / scaleKeys.
const text = "Every film starts with a script, and a script starts with the words. Then it moves.";
const words = text.split(" ");
export default {
  scripts: ["tools/p5-text.js", "tools/p5-media.js"], dur: 6,
  vo: { a: { text, start: 0.3, end: 5.6, words: words.map((w, i) => ({ w: w.replace(/[^\w]/g, ""), t: 0.4 + i * 0.33, d: 0.28 })) },
        b: { text: "Go.", start: 5.7, end: 5.95, words: [{ w: "Go", t: 5.72, d: 0.2 }] } },
  film: `
const T = window.T = {};
T.subs = KIT.subtitlePhrases(['a', 'b'], { parent: S });
const bar = KIT.el('div', '', S); KIT.css(bar, { left: '40px', top: '20px', height: '30px', background: '#36c', width: '10px' });
KIT.start({ dur: 6, render: (t) => {
  T.subs.set(t);
  bar.style.width = Math.round(KIT.scaleArea(10, 400, KIT.seg(t, 0, 6))) + 'px';
} });`,
  check: async (p) => {
    const errs = await p.evaluate(() => {
      const K = KIT, bad = [], near = (a, b, e = 1e-9) => Math.abs(a - b) <= e, J = JSON.stringify, T = window.T;
      if (!(near(K.readS('hi'), 0.7) && near(K.readS('one two'), 0.7) && near(K.readS('a b c d e'), 1.5) && near(K.readS(''), 0.7) && near(K.readS('-- 12 !!'), 0.7))) bad.push('readS: ' + [K.readS('hi'), K.readS('one two'), K.readS('a b c d e'), K.readS(''), K.readS('-- 12 !!')]);
      if (!near(K.chatHold('a b c d e'), 1.9)) bad.push('chatHold = readS + 0.4');
      // paced: one after another, each up for its readS; spare time shared by word count; too little time throws and says how many words to cut
      const pa = K.paced(['one two three', 'four five six seven eight nine'], { t0: 1, gap: 0.2 });
      if (!(near(pa[0].in, 1) && near(pa[0].out, 1.9) && near(pa[1].in, 2.1) && near(pa[1].out, 3.9))) bad.push('paced: ' + J(pa));
      const pb = K.paced(['one two three', 'four five six seven eight nine'], { t0: 1, gap: 0.2, to: 9 });
      if (!near(pb[1].out, 9)) bad.push('paced with to: the last text must end at 9, got ' + pb[1].out);
      if (!(pb[1].out - pb[1].in > (pb[0].out - pb[0].in) * 1.9)) bad.push('paced: spare time must follow the word count');
      try { K.paced(['one two three four five six seven eight'], { t0: 0, to: 1 }); bad.push('paced: too small a window must throw'); } catch (e) { if (!/cut \d+ word/.test(e.message)) bad.push('paced error does not say how many words to cut: ' + e.message); }
      // phrases: 2..6 words, breaks at punctuation first, every word exactly once, landing on the first spoken word
      const ph = K.phrases('a'), toks = K.V('a').text.split(/\s+/), ts = K.align('a');
      if (J(ph.flatMap((x) => toks.slice(x.i0, x.i1))) !== J(toks)) bad.push('phrases: words lost or reordered');
      for (const x of ph) {
        if (!(x.words >= 2 && x.words <= 6)) bad.push('phrases: ' + x.words + ' words in "' + x.text + '"');
        if (!near(x.t, ts[x.i0])) bad.push('phrases: "' + x.text + '" does not land on its first spoken word');
      }
      for (let i = 1; i < ph.length; i++) if (!(ph[i].t > ph[i - 1].t && near(ph[i - 1].end, ph[i].t))) bad.push('phrases: windows must tile the line');
      if (!near(ph[ph.length - 1].end, K.V('a').end)) bad.push('phrases: the last window must end with the line');
      if (!ph.some((x) => /script,$/.test(x.text))) bad.push('phrases: the comma break was not used: ' + ph.map((x) => x.text).join(' | '));
      if (!ph.some((x) => /words\.$/.test(x.text))) bad.push('phrases: the sentence end was not a break: ' + ph.map((x) => x.text).join(' | '));
      const one = K.phrases('b'); if (!(one.length === 1 && one[0].words === 1)) bad.push('phrases: a one-word line stays one phrase: ' + J(one));
      const wide = K.phrases('a', { min: 3, max: 4 }); if (!wide.every((x) => x.words >= 3 && x.words <= 4 || x.words === wide[wide.length - 1].words)) bad.push('phrases min 3 max 4: ' + wide.map((x) => x.words));
      const cues = K.captionPhrases(); if (!(cues.length === ph.length + 1 && cues[0].text === ph[0].text && cues.every((c, i) => i === 0 || c.t >= cues[i - 1].t))) bad.push('captionPhrases: ' + cues.length);
      // the subtitle row shows one phrase at a time
      return bad.concat((() => { const o = []; for (const t of [0.5, 2, 4.5]) { window.render(t); const on = [...document.querySelectorAll('.kit-subrow')].filter((r) => r.style.visibility === 'visible'); if (on.length !== 1) o.push('subtitlePhrases: ' + on.length + ' rows visible at ' + t); } return o; })()).slice(0, 20);
    });
    if (errs.length) throw new Error('text check:\n  ' + errs.join('\n  '));
    const e2 = await p.evaluate(() => {
      const K = KIT, bad = [], near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
      if (!(K.scaleArea(1, 3, 0) === 1 && K.scaleArea(1, 3, 1) === 3 && near(K.scaleArea(1, 3, 0.5), Math.sqrt(5)))) bad.push('scaleArea 1..3: ' + [K.scaleArea(1, 3, 0), K.scaleArea(1, 3, 1), K.scaleArea(1, 3, 0.5)]);
      if (!(K.scaleArea(1, 3, 0.5) > 2.2 && K.scaleArea(1, 3, 0.5) < 2.25)) bad.push('scaleArea must be above the linear 2 at the middle going up');
      if (!near(K.scaleArea(-1, 1, 0.5), 0) || !near(K.scaleArea(0.5, 0.5, 0.3), 0.5)) bad.push('scaleArea through zero / constant');
      // perceptual: equal steps of progress make equal steps of AREA
      const A = (p) => K.scaleArea(1, 3, p) ** 2; if (!near(A(0.5) - A(0.25), A(0.75) - A(0.5), 1e-9)) bad.push('scaleArea is not linear in area');
      const kk = K.scaleKeys(1, [[0, 1], [2, 3]], ['none']); if (!near(kk, Math.sqrt(5))) bad.push('scaleKeys: ' + kk);
      if (K.scaleKeys(-1, [[0, 1], [2, 3]]) !== 1 || K.scaleKeys(9, [[0, 1], [2, 3]]) !== 3) bad.push('scaleKeys does not hold its ends');
      return bad;
    });
    if (e2.length) throw new Error('scaleArea check:\n  ' + e2.join('\n  '));
  } };
